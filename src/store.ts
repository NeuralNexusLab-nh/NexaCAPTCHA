import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual
} from "node:crypto";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { PublicError } from "./errors.js";
import { RenderQueue } from "./render-queue.js";
import { renderVerificationAnimation } from "./renderer.js";
import { renderWarpImage } from "./warp-renderer.js";

export type CaptchaType = "horizon" | "warp";

export type VerificationStatus =
  | "pending"
  | "failed"
  | "completed"
  | "consumed"
  | "expired";

interface VerificationRecord {
  id: string;
  captchaType: CaptchaType;
  answerDigest: Buffer;
  answerSalt: Buffer;
  status: VerificationStatus;
  attemptsUsed: number;
  createdAt: number;
  expiresAt?: number;
  retryAvailableAt?: number;
  mediaPath: string;
  responseTokenHash?: Buffer;
  responseExpiresAt?: number;
  verifiedAt?: number;
}

export type PublicVerification =
  | {
      verificationId: string;
      captchaType: "horizon";
      animationUrl: string;
      expiresInMs: number;
    }
  | {
      verificationId: string;
      captchaType: "warp";
      imageUrl: string;
      expiresInMs: number;
    };

interface VerificationStoreOptions {
  answerFactory?: () => string;
  renderer?: (answer: string) => Buffer;
  warpAnswerFactory?: () => string;
  warpRenderer?: (answer: string) => Buffer;
  mediaDirectory?: string;
  clock?: () => number;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REQUIRED_CONFUSABLE = "B836G";
const REQUIRED_COMPLEX = "KX6VWY";

type RandomInteger = (maxExclusive: number) => number;

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

function randomCharacter(characters: string, randomInteger: RandomInteger): string {
  return characters[randomInteger(characters.length)]!;
}

function takeRandomCharacter(
  characters: string[],
  randomInteger: RandomInteger
): string {
  const index = randomInteger(characters.length);
  return characters.splice(index, 1)[0]!;
}

export function generateAnswer(randomInteger: RandomInteger = randomInt): string {
  const confusable = randomCharacter(REQUIRED_CONFUSABLE, randomInteger);
  const complexPool = Array.from(REQUIRED_COMPLEX).filter(
    (character) => character !== confusable
  );
  const complex = takeRandomCharacter(complexPool, randomInteger);
  const remainingPool = Array.from(ALPHABET).filter(
    (character) =>
      !REQUIRED_CONFUSABLE.includes(character) && character !== complex
  );
  const characters = [
    confusable,
    complex,
    takeRandomCharacter(remainingPool, randomInteger),
    takeRandomCharacter(remainingPool, randomInteger)
  ];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex]!, characters[index]!];
  }
  return characters.join("");
}

export function generateWarpAnswer(randomInteger: RandomInteger = randomInt): string {
  const pool = Array.from(ALPHABET);
  return Array.from({ length: 4 }, () =>
    takeRandomCharacter(pool, randomInteger)
  ).join("");
}

export class VerificationStore {
  private readonly records = new Map<string, VerificationRecord>();
  private readonly runtimeSecret = randomBytes(32);
  private readonly renderQueue = new RenderQueue(config.maxRenderQueue);
  private readonly answerFactory: () => string;
  private readonly renderer: (answer: string) => Buffer;
  private readonly warpAnswerFactory: () => string;
  private readonly warpRenderer: (answer: string) => Buffer;
  private readonly mediaDirectory: string;
  private readonly clock: () => number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: VerificationStoreOptions = {}) {
    this.answerFactory = options.answerFactory ?? generateAnswer;
    this.renderer = options.renderer ?? renderVerificationAnimation;
    this.warpAnswerFactory = options.warpAnswerFactory ?? generateWarpAnswer;
    this.warpRenderer = options.warpRenderer ?? renderWarpImage;
    this.mediaDirectory = options.mediaDirectory ?? config.mediaDirectory;
    this.clock = options.clock ?? Date.now;
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

  async create(captchaType: CaptchaType = "horizon"): Promise<PublicVerification> {
    await this.cleanup();
    if (this.records.size >= config.maxActiveVerifications) {
      throw new PublicError(
        503,
        "service-unavailable",
        "The service is at its active verification limit. Please retry shortly."
      );
    }

    const verificationId = `ver_${randomBase64Url(9)}`;
    const answer = captchaType === "warp"
      ? this.warpAnswerFactory()
      : this.answerFactory();
    const salt = randomBytes(16);
    const answerDigest = this.digestAnswer(answer, salt);
    const extension = captchaType === "warp" ? "png" : "gif";
    const mediaPath = path.join(this.mediaDirectory, `${verificationId}.${extension}`);
    const media = await this.renderQueue.run(() =>
      captchaType === "warp" ? this.warpRenderer(answer) : this.renderer(answer)
    );

    await writeFile(mediaPath, media, { flag: "wx" });
    const now = this.clock();
    this.records.set(verificationId, {
      id: verificationId,
      captchaType,
      answerDigest,
      answerSalt: salt,
      status: "pending",
      attemptsUsed: 0,
      createdAt: now,
      mediaPath
    });

    if (captchaType === "warp") {
      return {
        verificationId,
        captchaType,
        imageUrl: `/api/verifications/${encodeURIComponent(verificationId)}/image`,
        expiresInMs: config.verificationLifetimeMs
      };
    }
    return {
      verificationId,
      captchaType,
      animationUrl: `/api/verifications/${encodeURIComponent(verificationId)}/animation`,
      expiresInMs: config.verificationLifetimeMs
    };
  }

  getMediaPath(verificationId: string, expectedType?: CaptchaType): string {
    const record = this.records.get(verificationId);
    if (!record) {
      throw new PublicError(404, "verification-not-found", "Verification not found.");
    }
    if (expectedType !== undefined && record.captchaType !== expectedType) {
      throw new PublicError(404, "verification-not-found", "Verification not found.");
    }
    if (record.status !== "pending") throw this.statusError(record.status);
    const now = this.clock();
    if (record.expiresAt === undefined) {
      record.expiresAt = now + config.verificationLifetimeMs;
    } else if (record.expiresAt <= now) {
      record.status = "expired";
      throw this.statusError(record.status);
    }
    return record.mediaPath;
  }

  getPlaybackExpiry(verificationId: string): string {
    const record = this.getActiveRecord(verificationId);
    return new Date(record.expiresAt ?? this.clock()).toISOString();
  }

  submitAnswer(
    verificationId: string,
    submittedAnswer: string
  ):
    | {
        success: false;
        status: "incorrect";
        attemptsRemaining: number;
        retryAfterSeconds: number;
      }
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
    const now = this.clock();
    if (record.retryAvailableAt !== undefined && record.retryAvailableAt > now) {
      throw new PublicError(
        429,
        "answer-cooldown",
        "Wait before submitting another answer."
      );
    }

    const normalized = normalizeAnswer(submittedAnswer);
    const candidate = this.digestAnswer(normalized, record.answerSalt);
    if (!safeEqual(record.answerDigest, candidate)) {
      record.attemptsUsed += 1;
      const attemptsRemaining = config.maxAttempts - record.attemptsUsed;
      if (attemptsRemaining <= 0) {
        record.status = "expired";
        return { success: false, status: "verification_failed", attemptsRemaining: 0 };
      }
      record.retryAvailableAt = now + config.retryCooldownMs;
      return {
        success: false,
        status: "incorrect",
        attemptsRemaining,
        retryAfterSeconds: config.retryCooldownMs / 1000
      };
    }

    const responseToken = randomBase64Url(48);
    const responseExpiresAt = now + config.responseLifetimeMs;
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
    const now = this.clock();
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
    if (record.expiresAt === undefined) {
      throw new PublicError(
        409,
        "verification-not-started",
        "The verification media has not started."
      );
    }
    if (record.expiresAt <= this.clock() && record.status === "pending") {
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
    const now = this.clock();
    const removals: Promise<void>[] = [];
    for (const [id, record] of this.records) {
      const responseExpired =
        record.responseExpiresAt !== undefined && record.responseExpiresAt <= now;
      const oldTerminalRecord =
        record.status !== "pending" && now - record.createdAt > config.responseLifetimeMs;
      const pendingExpired =
        record.status === "pending" &&
        ((record.expiresAt !== undefined && record.expiresAt <= now) ||
          (record.expiresAt === undefined &&
            now - record.createdAt >= config.verificationLifetimeMs));
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
      const verificationId = path.parse(file.filePath).name;
      this.records.delete(verificationId);
    }
  }
}
