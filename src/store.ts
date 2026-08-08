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
  expiresAt?: number;
  retryAvailableAt?: number;
  mediaPath: string;
  responseTokenHash?: Buffer;
  responseExpiresAt?: number;
  verifiedAt?: number;
}

export interface PublicVerification {
  verificationId: string;
  animationUrl: string;
  expiresInMs: number;
}

interface VerificationStoreOptions {
  answerFactory?: () => string;
  renderer?: (answer: string) => Buffer;
  mediaDirectory?: string;
  clock?: () => number;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REQUIRED_CONFUSABLE = "B836";
const REQUIRED_COMPLEX = "KXADR26GVWYJT7";
const CONFUSABLE_INCLUDE_PERCENT = 70;
const COMPLEX_INCLUDE_PERCENT = 40;
const DUPLICATE_ACCEPT_PERCENT = 40;
const MAX_DUPLICATE_RESELECTIONS = 5;

type RandomInteger = (maxExclusive: number) => number;
type PercentageRoll = () => number;

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

function withoutCharacters(source: string, excluded: string): string {
  return [...source].filter((character) => !excluded.includes(character)).join("");
}

function generateCandidate(
  randomInteger: RandomInteger,
  includeConfusable: boolean,
  includeComplex: boolean
): string {
  const characters: string[] = [];
  let remainingPool = ALPHABET;

  if (includeConfusable && includeComplex) {
    characters.push(
      randomCharacter(REQUIRED_CONFUSABLE, randomInteger),
      randomCharacter(REQUIRED_COMPLEX, randomInteger)
    );
  } else if (includeConfusable) {
    const confusableOnly = withoutCharacters(REQUIRED_CONFUSABLE, REQUIRED_COMPLEX);
    characters.push(randomCharacter(confusableOnly, randomInteger));
    remainingPool = withoutCharacters(ALPHABET, REQUIRED_COMPLEX);
  } else if (includeComplex) {
    const complexOnly = withoutCharacters(REQUIRED_COMPLEX, REQUIRED_CONFUSABLE);
    characters.push(randomCharacter(complexOnly, randomInteger));
    remainingPool = withoutCharacters(ALPHABET, REQUIRED_CONFUSABLE);
  } else {
    remainingPool = withoutCharacters(
      ALPHABET,
      REQUIRED_CONFUSABLE + REQUIRED_COMPLEX
    );
  }

  while (characters.length < 4) {
    characters.push(randomCharacter(remainingPool, randomInteger));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex]!, characters[index]!];
  }
  return characters.join("");
}

export function generateAnswer(
  randomInteger: RandomInteger = randomInt,
  percentageRoll: PercentageRoll = () => randomInt(100)
): string {
  const includeConfusable = percentageRoll() < CONFUSABLE_INCLUDE_PERCENT;
  const includeComplex = percentageRoll() < COMPLEX_INCLUDE_PERCENT;
  let reselections = 0;
  while (true) {
    const candidate = generateCandidate(
      randomInteger,
      includeConfusable,
      includeComplex
    );
    const hasDuplicate = new Set(candidate).size < candidate.length;
    if (!hasDuplicate || reselections >= MAX_DUPLICATE_RESELECTIONS) return candidate;
    if (percentageRoll() < DUPLICATE_ACCEPT_PERCENT) return candidate;
    reselections += 1;
  }
}

export class VerificationStore {
  private readonly records = new Map<string, VerificationRecord>();
  private readonly runtimeSecret = randomBytes(32);
  private readonly renderQueue = new RenderQueue(config.maxRenderQueue);
  private readonly answerFactory: () => string;
  private readonly renderer: (answer: string) => Buffer;
  private readonly mediaDirectory: string;
  private readonly clock: () => number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: VerificationStoreOptions = {}) {
    this.answerFactory = options.answerFactory ?? generateAnswer;
    this.renderer = options.renderer ?? renderVerificationAnimation;
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

  async create(): Promise<PublicVerification> {
    await this.cleanup();
    if (this.records.size >= config.maxActiveVerifications) {
      throw new PublicError(
        503,
        "service-unavailable",
        "The service is at its active verification limit. Please retry shortly."
      );
    }

    const verificationId = `ver_${randomBase64Url(9)}`;
    const answer = this.answerFactory();
    const salt = randomBytes(16);
    const answerDigest = this.digestAnswer(answer, salt);
    const mediaPath = path.join(this.mediaDirectory, `${verificationId}.gif`);
    const media = await this.renderQueue.run(() => this.renderer(answer));

    await writeFile(mediaPath, media, { flag: "wx" });
    const now = this.clock();
    this.records.set(verificationId, {
      id: verificationId,
      answerDigest,
      answerSalt: salt,
      status: "pending",
      attemptsUsed: 0,
      createdAt: now,
      mediaPath
    });

    return {
      verificationId,
      animationUrl: `/api/verifications/${encodeURIComponent(verificationId)}/animation`,
      expiresInMs: config.verificationLifetimeMs
    };
  }

  getMediaPath(verificationId: string): string {
    const record = this.records.get(verificationId);
    if (!record) {
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
        "The verification animation has not started."
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
      const verificationId = path.basename(file.filePath, ".gif");
      this.records.delete(verificationId);
    }
  }
}
