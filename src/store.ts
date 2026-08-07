import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { PublicError } from "./errors.js";
import { RenderQueue } from "./render-queue.js";
import { renderVerificationAnimation } from "./renderer.js";

export type VerificationStatus =
  | "pending"
  | "failed"
  | "completed"
  | "consumed"
  | "expired";

interface VerificationRecord {
  id: string;
  answerDigest: Buffer;
  answerSalt: Buffer;
  status: VerificationStatus;
  attemptsUsed: number;
  createdAt: number;
  expiresAt: number;
  mediaPath: string;
  responseTokenHash?: Buffer;
  responseExpiresAt?: number;
  verifiedAt?: number;
}

export interface PublicVerification {
  verificationId: string;
  animationUrl: string;
  expiresAt: string;
}

interface VerificationStoreOptions {
  answerFactory?: () => string;
  renderer?: (answer: string) => Buffer;
  mediaDirectory?: string;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBase64Url(byteLength: number): string {
  return randomBytes(byteLength).toString("base64url");
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: Buffer | undefined, right: Buffer): boolean {
  return Boolean(left && left.length === right.length && timingSafeEqual(left, right));
}

export function normalizeAnswer(value: string): string {
  return value.trim().toUpperCase().replaceAll(/\s+/g, "");
}

export class VerificationStore {
  private readonly records = new Map<string, VerificationRecord>();
  private readonly runtimeSecret = randomBytes(32);
  private readonly renderQueue = new RenderQueue(config.maxRenderQueue);
  private readonly answerFactory: () => string;
  private readonly renderer: (answer: string) => Buffer;
  private readonly mediaDirectory: string;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: VerificationStoreOptions = {}) {
    this.answerFactory = options.answerFactory ?? (() => this.generateAnswer());
    this.renderer = options.renderer ?? renderVerificationAnimation;
    this.mediaDirectory = options.mediaDirectory ?? config.mediaDirectory;
  }

  async start(): Promise<void> {
    await mkdir(this.mediaDirectory, { recursive: true });
    this.cleanupTimer = setInterval(() => {
      void this.cleanup();
    }, config.cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  async stop(): Promise<void> {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    await this.cleanup(true);
  }

  private digestAnswer(answer: string, salt: Buffer): Buffer {
    return createHmac("sha256", this.runtimeSecret)
      .update(salt)
      .update(answer)
      .digest();
  }

  private generateAnswer(): string {
    const bytes = randomBytes(4);
    return [...bytes]
      .map((value) => ALPHABET[value % ALPHABET.length])
      .join("");
  }

  async create(): Promise<PublicVerification> {
    await this.cleanup();
    if (this.records.size >= config.maxActiveVerifications) {
      throw new PublicError(
        503,
        "service-unavailable",
        "The service is at its active verification limit. Please retry shortly."
      );
    }

    const verificationId = `ver_${randomBase64Url(16)}`;
    const answer = this.answerFactory();
    const salt = randomBytes(16);
    const answerDigest = this.digestAnswer(answer, salt);
    const mediaPath = path.join(this.mediaDirectory, `${verificationId}.gif`);
    const media = await this.renderQueue.run(() => this.renderer(answer));

    await writeFile(mediaPath, media, { flag: "wx" });
    const now = Date.now();
    this.records.set(verificationId, {
      id: verificationId,
      answerDigest,
      answerSalt: salt,
      status: "pending",
      attemptsUsed: 0,
      createdAt: now,
      expiresAt: now + config.verificationLifetimeMs,
      mediaPath
    });

    return {
      verificationId,
      animationUrl: `/api/v1/verifications/${encodeURIComponent(verificationId)}/animation`,
      expiresAt: new Date(now + config.verificationLifetimeMs).toISOString()
    };
  }

  getMediaPath(verificationId: string): string {
    const record = this.getActiveRecord(verificationId);
    return record.mediaPath;
  }

  submitAnswer(
    verificationId: string,
    submittedAnswer: string
  ):
    | { success: false; status: "incorrect"; attemptsRemaining: number }
    | { success: false; status: "verification_failed"; attemptsRemaining: 0 }
    | {
        success: true;
        status: "completed";
        verificationId: string;
        responseToken: string;
        expiresAt: string;
      } {
    const record = this.getActiveRecord(verificationId);
    if (record.status !== "pending") {
      throw this.statusError(record.status);
    }

    const normalized = normalizeAnswer(submittedAnswer);
    const candidate = this.digestAnswer(normalized, record.answerSalt);
    if (!safeEqual(record.answerDigest, candidate)) {
      record.attemptsUsed += 1;
      const attemptsRemaining = config.maxAttempts - record.attemptsUsed;
      if (attemptsRemaining <= 0) {
        record.status = "failed";
        return { success: false, status: "verification_failed", attemptsRemaining: 0 };
      }
      return { success: false, status: "incorrect", attemptsRemaining };
    }

    const responseToken = randomBase64Url(24);
    const responseExpiresAt = Date.now() + config.responseLifetimeMs;
    record.status = "completed";
    record.responseTokenHash = sha256(responseToken);
    record.responseExpiresAt = responseExpiresAt;

    return {
      success: true,
      status: "completed",
      verificationId,
      responseToken,
      expiresAt: new Date(responseExpiresAt).toISOString()
    };
  }

  verify(
    verificationId: string,
    responseToken: string
  ):
    | { success: true; verifiedAt: string }
    | { success: false; errorCode: "invalid-or-expired-verification" } {
    const record = this.records.get(verificationId);
    const now = Date.now();
    const tokenHash = sha256(responseToken);
    if (
      !record ||
      record.status !== "completed" ||
      !record.responseExpiresAt ||
      record.responseExpiresAt <= now ||
      !safeEqual(record.responseTokenHash, tokenHash)
    ) {
      return { success: false, errorCode: "invalid-or-expired-verification" };
    }

    record.status = "consumed";
    record.verifiedAt = now;
    record.responseTokenHash = undefined;
    return { success: true, verifiedAt: new Date(now).toISOString() };
  }

  getStats(): { activeVerifications: number; renderQueueDepth: number } {
    return {
      activeVerifications: this.records.size,
      renderQueueDepth: this.renderQueue.depth
    };
  }

  private getActiveRecord(verificationId: string): VerificationRecord {
    const record = this.records.get(verificationId);
    if (!record) {
      throw new PublicError(404, "verification-not-found", "Verification not found.");
    }
    if (record.expiresAt <= Date.now() && record.status === "pending") {
      record.status = "expired";
    }
    if (record.status === "expired") throw this.statusError(record.status);
    return record;
  }

  private statusError(status: VerificationStatus): PublicError {
    if (status === "expired") {
      return new PublicError(410, "verification-expired", "The verification expired.");
    }
    if (status === "failed") {
      return new PublicError(410, "verification-failed", "The verification has failed.");
    }
    return new PublicError(409, "verification-completed", "The verification is no longer pending.");
  }

  async cleanup(removeAll = false): Promise<void> {
    const now = Date.now();
    const removals: Promise<void>[] = [];
    for (const [id, record] of this.records) {
      const responseExpired =
        record.responseExpiresAt !== undefined && record.responseExpiresAt <= now;
      const oldTerminalRecord =
        record.status !== "pending" && now - record.createdAt > config.responseLifetimeMs;
      const pendingExpired = record.status === "pending" && record.expiresAt <= now;
      if (removeAll || pendingExpired || responseExpired || oldTerminalRecord) {
        this.records.delete(id);
        removals.push(rm(record.mediaPath, { force: true }));
      }
    }
    await Promise.allSettled(removals);
    await this.enforceTemporaryStorageLimit();
  }

  private async enforceTemporaryStorageLimit(): Promise<void> {
    const names = await readdir(this.mediaDirectory).catch(() => [] as string[]);
    const files = await Promise.all(
      names.map(async (name) => {
        const filePath = path.join(this.mediaDirectory, name);
        const details = await stat(filePath);
        return { filePath, size: details.size, modified: details.mtimeMs };
      })
    );
    let total = files.reduce((sum, file) => sum + file.size, 0);
    if (total <= config.maxTemporaryBytes) return;

    files.sort((left, right) => left.modified - right.modified);
    for (const file of files) {
      if (total <= config.maxTemporaryBytes) break;
      await rm(file.filePath, { force: true });
      total -= file.size;
      const verificationId = path.basename(file.filePath, ".gif");
      this.records.delete(verificationId);
    }
  }
}
