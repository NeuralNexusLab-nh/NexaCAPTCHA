import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual
} from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import { PublicError } from "./errors.js";
import { MediaDeliveryQueue } from "./media-delivery-queue.js";
import { RenderQueue } from "./render-queue.js";
import { renderGravityImage } from "./gravity-renderer.js";
import { renderVerificationAnimation } from "./renderer.js";

export type CaptchaType = "horizon" | "gravity";
export type VerificationStatus = "pending" | "completed" | "consumed" | "expired";

interface VerificationRecord {
  id: string;
  type: CaptchaType;
  answer: string;
  createdAt: number;
  expiresAt: number | null;
  successful: boolean;
  status: VerificationStatus;
  attemptsUsed: number;
  retryAvailableAt: number | null;
  mediaPath: string;
  mediaTicketHash: string;
  mediaConsumed: boolean;
}

interface TokenRecord {
  id: string;
  token: string;
  expiresAt: number;
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
      captchaType: "gravity";
      imageUrl: string;
      expiresInMs: number;
    };

interface VerificationStoreOptions {
  answerFactory?: () => string;
  renderer?: (answer: string) => Buffer;
  gravityAnswerFactory?: () => string;
  gravityRenderer?: (answer: string) => Buffer;
  dataDirectory?: string;
  mediaDirectory?: string;
  poolSizePerType?: number;
  startPoolMaintenance?: boolean;
  clock?: () => number;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REQUIRED_CONFUSABLE = "B836G";
const REQUIRED_COMPLEX = "KX6VWY";
const ID_PATTERN = /^[A-Za-z0-9_-]{12}$/;
type RandomInteger = (maxExclusive: number) => number;

function randomBase64Url(byteLength: number): string {
  return randomBytes(byteLength).toString("base64url");
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function safeTextEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function normalizeAnswer(value: string): string {
  return value.trim().toUpperCase().replaceAll(/\s+/g, "");
}

function randomCharacter(characters: string, randomInteger: RandomInteger): string {
  return characters[randomInteger(characters.length)]!;
}

function takeRandomCharacter(characters: string[], randomInteger: RandomInteger): string {
  return characters.splice(randomInteger(characters.length), 1)[0]!;
}

export function generateAnswer(randomInteger: RandomInteger = randomInt): string {
  const confusable = randomCharacter(REQUIRED_CONFUSABLE, randomInteger);
  const complexPool = Array.from(REQUIRED_COMPLEX).filter(
    (character) => character !== confusable
  );
  const complex = takeRandomCharacter(complexPool, randomInteger);
  const remainingPool = Array.from(ALPHABET).filter(
    (character) => !REQUIRED_CONFUSABLE.includes(character) && character !== complex
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

export function generateGravityAnswer(randomInteger: RandomInteger = randomInt): string {
  const pool = Array.from(ALPHABET);
  return Array.from({ length: 4 }, () => takeRandomCharacter(pool, randomInteger)).join("");
}

async function directorySize(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  let total = 0;
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    total += entry.isDirectory() ? await directorySize(entryPath) : (await stat(entryPath)).size;
  }
  return total;
}

export class VerificationStore {
  private readonly renderQueue = new RenderQueue(config.maxRenderQueue);
  private readonly mediaQueue = new MediaDeliveryQueue(
    config.maxMediaDeliveries,
    config.maxMediaDeliveryQueue
  );
  private readonly answerFactory: () => string;
  private readonly renderer: (answer: string) => Buffer;
  private readonly gravityAnswerFactory: () => string;
  private readonly gravityRenderer: (answer: string) => Buffer;
  private readonly dataDirectory: string;
  private readonly animationDirectory: string;
  private readonly imageDirectory: string;
  private readonly verificationDirectory: string;
  private readonly tokenDirectory: string;
  private readonly poolSizePerType: number;
  private readonly maintainPool: boolean;
  private readonly clock: () => number;
  private readonly mediaTickets = new Map<string, string>();
  private readonly pendingMediaReferences = new Map<string, number>();
  private readonly recordLocks = new Map<string, Promise<void>>();
  private storageTail: Promise<void> = Promise.resolve();
  private verificationCount = 0;
  private dataBytes = 0;
  private cleanupTimer?: NodeJS.Timeout;
  private poolTimer?: NodeJS.Timeout;
  private refreshingPool = false;
  private nextPoolType: CaptchaType = "horizon";

  constructor(options: VerificationStoreOptions = {}) {
    this.answerFactory = options.answerFactory ?? generateAnswer;
    this.renderer = options.renderer ?? renderVerificationAnimation;
    this.gravityAnswerFactory = options.gravityAnswerFactory ?? generateGravityAnswer;
    this.gravityRenderer = options.gravityRenderer ?? renderGravityImage;
    this.dataDirectory = options.dataDirectory ?? options.mediaDirectory ?? config.dataDirectory;
    this.animationDirectory = path.join(this.dataDirectory, "animations");
    this.imageDirectory = path.join(this.dataDirectory, "images");
    this.verificationDirectory = path.join(this.dataDirectory, "verification");
    this.tokenDirectory = path.join(this.dataDirectory, "tokens");
    this.poolSizePerType = options.poolSizePerType ?? config.poolSizePerType;
    this.maintainPool = options.startPoolMaintenance ?? true;
    this.clock = options.clock ?? Date.now;
  }

  async start(): Promise<void> {
    await Promise.all([
      mkdir(this.animationDirectory, { recursive: true }),
      mkdir(this.imageDirectory, { recursive: true }),
      mkdir(this.verificationDirectory, { recursive: true }),
      mkdir(this.tokenDirectory, { recursive: true })
    ]);
    this.dataBytes = await directorySize(this.dataDirectory);
    await this.rebuildIndexes();
    if (this.maintainPool) {
      await this.ensureAtLeastOne("horizon");
      await this.ensureAtLeastOne("gravity");
      this.poolTimer = setInterval(() => void this.refreshPool(), config.poolRefreshIntervalMs);
      this.poolTimer.unref();
    }
    this.cleanupTimer = setInterval(() => void this.cleanup(), config.cleanupIntervalMs);
    this.cleanupTimer.unref();
  }

  async stop(): Promise<void> {
    if (this.poolTimer) clearInterval(this.poolTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  private async rebuildIndexes(): Promise<void> {
    const names = await readdir(this.verificationDirectory).catch(() => [] as string[]);
    this.verificationCount = 0;
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const record = await this.readJson<VerificationRecord>(path.join(this.verificationDirectory, name));
      if (!record) continue;
      this.verificationCount += 1;
      if (!record.mediaConsumed) {
        this.mediaTickets.set(record.mediaTicketHash, record.id);
        this.changeMediaReference(record.mediaPath, 1);
      }
    }
  }

  private poolDirectory(type: CaptchaType): string {
    return type === "gravity" ? this.imageDirectory : this.animationDirectory;
  }

  private poolExtension(type: CaptchaType): string {
    return type === "gravity" ? ".png" : ".gif";
  }

  private async poolFiles(type: CaptchaType): Promise<string[]> {
    const extension = this.poolExtension(type);
    return (await readdir(this.poolDirectory(type)).catch(() => [] as string[]))
      .filter((name) => name.endsWith(extension));
  }

  private async ensureAtLeastOne(type: CaptchaType): Promise<void> {
    if ((await this.poolFiles(type)).length === 0) await this.generatePoolEntry(type, false);
  }

  private async refreshPool(): Promise<void> {
    if (this.refreshingPool) return;
    this.refreshingPool = true;
    const type = this.nextPoolType;
    this.nextPoolType = type === "horizon" ? "gravity" : "horizon";
    try {
      await this.generatePoolEntry(type, true);
    } catch (error) {
      console.error(`Unable to refresh ${type} CAPTCHA pool`, error);
    } finally {
      this.refreshingPool = false;
    }
  }

  private async generatePoolEntry(type: CaptchaType, replaceWhenFull: boolean): Promise<void> {
    const directory = this.poolDirectory(type);
    const extension = this.poolExtension(type);
    let answer = "";
    let target = "";
    for (let attempt = 0; attempt < 12; attempt += 1) {
      answer = type === "gravity" ? this.gravityAnswerFactory() : this.answerFactory();
      target = path.join(directory, `${answer}${extension}`);
      if (!(await stat(target).then(() => true).catch(() => false))) break;
      target = "";
    }
    if (!target) return;
    const media = await this.renderQueue.run(() =>
      type === "gravity" ? this.gravityRenderer(answer) : this.renderer(answer)
    );
    this.assertStorageAvailable(media.byteLength);
    await this.writeMedia(target, media);

    const files = await this.poolFiles(type);
    if (replaceWhenFull && files.length > this.poolSizePerType) {
      const candidates = files.filter((name) => {
        if (name === path.basename(target)) return false;
        return (this.pendingMediaReferences.get(path.join(directory, name)) ?? 0) === 0;
      });
      const victim = candidates.length > 0
        ? candidates[randomInt(candidates.length)]
        : undefined;
      // If every old item is waiting to be loaded, discard the new item rather
      // than breaking a verification that has already been handed out.
      await this.removeTrackedFile(path.join(directory, victim ?? path.basename(target)));
    }
  }

  async create(captchaType: CaptchaType = "horizon"): Promise<PublicVerification> {
    this.assertStorageAvailable(2_048);
    const files = await this.poolFiles(captchaType);
    if (files.length === 0) {
      throw new PublicError(503, "service-unavailable", "No verification media is ready.");
    }
    const selected = files[randomInt(files.length)]!;
    const answer = path.parse(selected).name;
    const id = randomBase64Url(9);
    const verificationId = `ver_${id}`;
    const mediaTicket = randomBase64Url(32);
    const mediaTicketHash = sha256Text(mediaTicket);
    const record: VerificationRecord = {
      id: verificationId,
      type: captchaType,
      answer,
      createdAt: this.clock(),
      expiresAt: null,
      successful: false,
      status: "pending",
      attemptsUsed: 0,
      retryAvailableAt: null,
      mediaPath: path.join(this.poolDirectory(captchaType), selected),
      mediaTicketHash,
      mediaConsumed: false
    };
    await this.writeJson(this.verificationPath(verificationId), record, true);
    this.verificationCount += 1;
    this.mediaTickets.set(mediaTicketHash, verificationId);
    this.changeMediaReference(record.mediaPath, 1);
    const mediaUrl = `/api/media/${encodeURIComponent(mediaTicket)}`;
    return captchaType === "gravity"
      ? { verificationId, captchaType, imageUrl: mediaUrl, expiresInMs: config.verificationLifetimeMs }
      : { verificationId, captchaType, animationUrl: mediaUrl, expiresInMs: config.verificationLifetimeMs };
  }

  async claimMedia(mediaTicket: string): Promise<{
    mediaPath: string;
    captchaType: CaptchaType;
    release: () => void;
  }> {
    const ticketHash = sha256Text(mediaTicket);
    const verificationId = this.mediaTickets.get(ticketHash);
    if (!verificationId) throw new PublicError(410, "media-consumed", "Media link expired.");
    const release = await this.mediaQueue.acquire();
    try {
      const result = await this.withRecordLock(verificationId, async () => {
        const record = await this.requireRecord(verificationId);
        if (record.mediaConsumed || !safeTextEqual(record.mediaTicketHash, ticketHash)) {
          throw new PublicError(410, "media-consumed", "Media link expired.");
        }
        if (!(await stat(record.mediaPath).then(() => true).catch(() => false))) {
          throw new PublicError(410, "media-unavailable", "Verification media is unavailable.");
        }
        record.mediaConsumed = true;
        record.expiresAt = this.clock() + config.verificationLifetimeMs;
        await this.writeJson(this.verificationPath(verificationId), record);
        this.mediaTickets.delete(ticketHash);
        this.changeMediaReference(record.mediaPath, -1);
        return { mediaPath: record.mediaPath, captchaType: record.type };
      });
      return { ...result, release };
    } catch (error) {
      release();
      throw error;
    }
  }

  async getPlaybackExpiry(verificationId: string): Promise<string> {
    const record = await this.getActiveRecord(verificationId);
    return new Date(record.expiresAt ?? this.clock()).toISOString();
  }

  async submitAnswer(verificationId: string, submittedAnswer: string): Promise<
    | { success: false; status: "incorrect"; attemptsRemaining: number; retryAfterSeconds: number }
    | { success: false; status: "verification_failed"; attemptsRemaining: 0 }
    | { success: true; status: "completed"; verificationId: string; responseToken: string; expiresAt: string }
  > {
    return this.withRecordLock(verificationId, async () => {
      const record = await this.getActiveRecord(verificationId);
      if (record.status !== "pending") throw this.statusError(record.status);
      const now = this.clock();
      if (record.retryAvailableAt !== null && record.retryAvailableAt > now) {
        throw new PublicError(429, "answer-cooldown", "Wait before submitting another answer.");
      }
      if (normalizeAnswer(submittedAnswer) !== record.answer) {
        record.attemptsUsed += 1;
        const attemptsRemaining = config.maxAttempts - record.attemptsUsed;
        if (attemptsRemaining <= 0) {
          record.status = "expired";
          await this.writeJson(this.verificationPath(verificationId), record);
          return { success: false, status: "verification_failed", attemptsRemaining: 0 };
        }
        record.retryAvailableAt = now + config.retryCooldownMs;
        await this.writeJson(this.verificationPath(verificationId), record);
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
      record.successful = true;
      await this.writeJson(this.verificationPath(verificationId), record);
      await this.writeJson(this.tokenPath(verificationId), {
        id: verificationId,
        token: responseToken,
        expiresAt: responseExpiresAt
      } satisfies TokenRecord, true);
      return {
        success: true,
        status: "completed",
        verificationId,
        responseToken,
        expiresAt: new Date(responseExpiresAt).toISOString()
      };
    });
  }

  async verify(verificationId: string, responseToken: string): Promise<
    | { success: true; verifiedAt: string }
    | { success: false; errorCode: "invalid-or-expired-verification" }
  > {
    return this.withRecordLock(verificationId, async () => {
      const tokenPath = this.tokenPath(verificationId);
      const token = await this.readJson<TokenRecord>(tokenPath);
      const now = this.clock();
      if (
        !token ||
        token.expiresAt <= now ||
        !safeTextEqual(token.token, responseToken)
      ) {
        if (token?.expiresAt !== undefined && token.expiresAt <= now) await this.removeTrackedFile(tokenPath);
        return { success: false, errorCode: "invalid-or-expired-verification" };
      }
      await this.removeTrackedFile(tokenPath);
      const record = await this.readRecord(verificationId);
      if (record) {
        record.status = "consumed";
        await this.writeJson(this.verificationPath(verificationId), record);
      }
      return { success: true, verifiedAt: new Date(now).toISOString() };
    });
  }

  getStats(): {
    activeVerifications: number;
    renderQueueDepth: number;
    mediaQueueDepth: number;
    dataBytes: number;
  } {
    return {
      activeVerifications: this.verificationCount,
      renderQueueDepth: this.renderQueue.depth,
      mediaQueueDepth: this.mediaQueue.depth,
      dataBytes: this.dataBytes
    };
  }

  async cleanup(): Promise<void> {
    const now = this.clock();
    const verificationNames = await readdir(this.verificationDirectory).catch(() => [] as string[]);
    for (const name of verificationNames) {
      if (!name.endsWith(".json")) continue;
      const filePath = path.join(this.verificationDirectory, name);
      const record = await this.readJson<VerificationRecord>(filePath);
      if (!record) continue;
      const terminal = record.status !== "pending";
      const expired = record.expiresAt !== null
        ? record.expiresAt <= now
        : now - record.createdAt >= config.verificationLifetimeMs;
      if (expired || (terminal && now - record.createdAt >= config.responseLifetimeMs)) {
        this.mediaTickets.delete(record.mediaTicketHash);
        if (!record.mediaConsumed) this.changeMediaReference(record.mediaPath, -1);
        await this.removeTrackedFile(filePath);
        this.verificationCount = Math.max(0, this.verificationCount - 1);
      }
    }
    const tokenNames = await readdir(this.tokenDirectory).catch(() => [] as string[]);
    for (const name of tokenNames) {
      if (!name.endsWith(".json")) continue;
      const filePath = path.join(this.tokenDirectory, name);
      const token = await this.readJson<TokenRecord>(filePath);
      if (!token || token.expiresAt <= now) await this.removeTrackedFile(filePath);
    }
  }

  private verificationPath(verificationId: string): string {
    const id = verificationId.startsWith("ver_") ? verificationId.slice(4) : verificationId;
    if (!ID_PATTERN.test(id)) throw new PublicError(404, "verification-not-found", "Verification not found.");
    return path.join(this.verificationDirectory, `${id}.json`);
  }

  private tokenPath(verificationId: string): string {
    const id = verificationId.startsWith("ver_") ? verificationId.slice(4) : verificationId;
    if (!ID_PATTERN.test(id)) throw new PublicError(404, "verification-not-found", "Verification not found.");
    return path.join(this.tokenDirectory, `${id}.json`);
  }

  private async readRecord(verificationId: string): Promise<VerificationRecord | null> {
    return this.readJson<VerificationRecord>(this.verificationPath(verificationId));
  }

  private async requireRecord(verificationId: string): Promise<VerificationRecord> {
    const record = await this.readRecord(verificationId);
    if (!record) throw new PublicError(404, "verification-not-found", "Verification not found.");
    return record;
  }

  private async getActiveRecord(verificationId: string): Promise<VerificationRecord> {
    const record = await this.requireRecord(verificationId);
    if (record.expiresAt === null) {
      throw new PublicError(409, "verification-not-started", "The verification media has not started.");
    }
    if (record.expiresAt <= this.clock() && record.status === "pending") {
      record.status = "expired";
      await this.writeJson(this.verificationPath(verificationId), record);
    }
    if (record.status === "expired") throw this.statusError(record.status);
    return record;
  }

  private statusError(status: VerificationStatus): PublicError {
    if (status === "expired") return new PublicError(410, "verification-expired", "The verification expired.");
    return new PublicError(409, "verification-completed", "The verification is no longer pending.");
  }

  private async withRecordLock<T>(verificationId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.recordLocks.get(verificationId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const chain = previous.then(() => current);
    this.recordLocks.set(verificationId, chain);
    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.recordLocks.get(verificationId) === chain) this.recordLocks.delete(verificationId);
    }
  }

  private assertStorageAvailable(additionalBytes: number): void {
    if (this.dataBytes + additionalBytes > config.maxDataBytes) {
      throw new PublicError(507, "storage-limit-reached", "Verification storage is full.");
    }
  }

  private changeMediaReference(mediaPath: string, delta: number): void {
    const next = Math.max(0, (this.pendingMediaReferences.get(mediaPath) ?? 0) + delta);
    if (next === 0) this.pendingMediaReferences.delete(mediaPath);
    else this.pendingMediaReferences.set(mediaPath, next);
  }

  private async withStorageLock<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.storageTail;
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.storageTail = previous.then(() => current);
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }

  private async readJson<T>(filePath: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as T;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return null;
      throw error;
    }
  }

  private async writeJson(filePath: string, value: unknown, exclusive = false): Promise<void> {
    await this.withStorageLock(async () => {
      const serialized = `${JSON.stringify(value)}\n`;
      const oldSize = await stat(filePath).then((details) => details.size).catch(() => 0);
      const newSize = Buffer.byteLength(serialized);
      if (exclusive && oldSize > 0) throw new PublicError(409, "record-exists", "Record already exists.");
      // Account for the temporary file as well as the existing destination so
      // atomic writes never exceed the ten-gigabyte ceiling, even briefly.
      this.assertStorageAvailable(newSize);
      this.dataBytes += newSize;
      const temporary = `${filePath}.${randomBase64Url(6)}.tmp`;
      try {
        await writeFile(temporary, serialized, { flag: "wx" });
        await rename(temporary, filePath);
        this.dataBytes -= oldSize;
      } catch (error) {
        this.dataBytes -= newSize;
        throw error;
      } finally {
        await rm(temporary, { force: true });
      }
    });
  }

  private async writeMedia(filePath: string, media: Buffer): Promise<void> {
    await this.withStorageLock(async () => {
      this.assertStorageAvailable(media.byteLength);
      this.dataBytes += media.byteLength;
      try {
        await writeFile(filePath, media, { flag: "wx" });
      } catch (error) {
        this.dataBytes -= media.byteLength;
        throw error;
      }
    });
  }

  private async removeTrackedFile(filePath: string): Promise<void> {
    await this.withStorageLock(async () => {
      const size = await stat(filePath).then((details) => details.size).catch(() => 0);
      await rm(filePath, { force: true });
      this.dataBytes = Math.max(0, this.dataBytes - size);
    });
  }
}
