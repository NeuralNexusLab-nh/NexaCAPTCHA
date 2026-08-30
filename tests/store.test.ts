import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PublicError } from "../src/errors.js";
import {
  VerificationStore,
  generateGravityAnswer,
  normalizeAnswer
} from "../src/store.js";

async function publicErrorCode(run: () => unknown | Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof PublicError) return error.code;
    throw error;
  }
  throw new Error("Expected a PublicError.");
}

async function startMedia(store: VerificationStore, mediaUrl: string): Promise<void> {
  const media = await store.claimMedia(mediaUrl.split("/").at(-1)!);
  media.release();
}

describe("VerificationStore", () => {
  let directory: string;
  let store: VerificationStore;
  let now: number;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "nexacaptcha-test-"));
    now = 1_700_000_000_000;
    store = new VerificationStore({
      gravityAnswerFactory: () => "GRAV",
      gravityRenderer: () => Buffer.from([137, 80, 78, 71]),
      gravityAudioRenderer: () => Buffer.from([255, 251, 144, 100]),
      dataDirectory: directory,
      clock: () => now
    });
    await store.start();
  });

  afterEach(async () => {
    await store.stop();
    await rm(directory, { recursive: true, force: true });
  });

  it("normalizes human input", () => {
    expect(normalizeAnswer("  gr av ")).toBe("GRAV");
  });

  it("selects four unique Gravity characters from the complete safe alphabet", () => {
    const seen = new Set<string>();
    for (let sample = 0; sample < 4_000; sample += 1) {
      const answer = generateGravityAnswer();
      expect(answer).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
      expect(answer).not.toMatch(/[IO01]/);
      expect(new Set(answer).size).toBe(4);
      answer.split("").forEach((character) => seen.add(character));
    }
    expect([...seen].sort().join("")).toBe("23456789ABCDEFGHJKLMNPQRSTUVWXYZ");
  });

  it("persists verification state and shares pooled images", async () => {
    const first = await store.create();
    const second = await store.create();
    expect(first.captchaType).toBe("gravity");
    expect(first.imageUrl).toMatch(/^\/api\/media\/[A-Za-z0-9_-]+$/);
    expect(first.audioUrl).toMatch(/^\/api\/audio\/[A-Za-z0-9_-]+$/);
    expect(first.imageUrl).not.toContain(first.verificationId);

    const files = await readdir(path.join(directory, "verification"));
    expect(files).toContain(`${first.verificationId.slice(4)}.json`);
    const record = JSON.parse(await readFile(
      path.join(directory, "verification", `${first.verificationId.slice(4)}.json`),
      "utf8"
    ));
    expect(record).toMatchObject({
      id: first.verificationId,
      type: "gravity",
      answer: "GRAV",
      successful: false,
      retryAvailableAt: null
    });

    const firstMedia = await store.claimMedia(first.imageUrl.split("/").at(-1)!);
    const secondMedia = await store.claimMedia(second.imageUrl.split("/").at(-1)!);
    expect(firstMedia.mediaPath).toBe(secondMedia.mediaPath);
    firstMedia.release();
    secondMedia.release();

    const firstAudio = await store.claimAudio(first.audioUrl.split("/").at(-1)!);
    expect(firstAudio.audioPath).toBe(path.join(directory, "audio", "GRAV.wav"));
    firstAudio.release();
    expect(await publicErrorCode(
      () => store.claimAudio(first.audioUrl.split("/").at(-1)!)
    )).toBe("audio-consumed");
  });

  it("expires after two incorrect attempts with a twenty-second cooldown", async () => {
    const verification = await store.create();
    await startMedia(store, verification.imageUrl);
    expect(await store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "incorrect",
      attemptsRemaining: 1,
      retryAfterSeconds: 20
    });
    expect(await publicErrorCode(
      () => store.submitAnswer(verification.verificationId, "WRNG")
    )).toBe("answer-cooldown");
    now += 20_000;
    expect(await store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "verification_failed",
      attemptsRemaining: 0
    });
    expect(await publicErrorCode(
      () => store.submitAnswer(verification.verificationId, "GRAV")
    )).toBe("verification-expired");
  });

  it("returns a 64-character token and consumes its JSON once", async () => {
    const verification = await store.create();
    expect(verification.verificationId).toMatch(/^ver_[A-Za-z0-9_-]{12}$/);
    await startMedia(store, verification.imageUrl);
    const completion = await store.submitAnswer(verification.verificationId, "grav");
    if (!completion.success) throw new Error("Expected successful completion.");
    expect(completion.responseToken).toMatch(/^[A-Za-z0-9_-]{64}$/);

    const tokenPath = path.join(directory, "tokens", `${verification.verificationId.slice(4)}.json`);
    expect(JSON.parse(await readFile(tokenPath, "utf8"))).toMatchObject({
      id: verification.verificationId,
      token: completion.responseToken
    });
    expect((await store.verify(verification.verificationId, completion.responseToken)).success).toBe(true);
    await expect(readFile(tokenPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(await store.verify(verification.verificationId, completion.responseToken)).toEqual({
      success: false,
      errorCode: "invalid-or-expired-verification"
    });
  });

  it("rejects a token belonging to another verification", async () => {
    const first = await store.create();
    const second = await store.create();
    await startMedia(store, first.imageUrl);
    await startMedia(store, second.imageUrl);
    const completion = await store.submitAnswer(first.verificationId, "GRAV");
    if (!completion.success) throw new Error("Expected successful completion.");
    expect((await store.verify(second.verificationId, completion.responseToken)).success).toBe(false);
  });

  it("starts the two-minute lifetime when the image is requested", async () => {
    const verification = await store.create();
    expect(await publicErrorCode(
      () => store.submitAnswer(verification.verificationId, "GRAV")
    )).toBe("verification-not-started");
    await startMedia(store, verification.imageUrl);
    now += 119_999;
    expect((await store.submitAnswer(verification.verificationId, "GRAV")).success).toBe(true);

    const expired = await store.create();
    await startMedia(store, expired.imageUrl);
    now += 120_001;
    expect(await publicErrorCode(
      () => store.submitAnswer(expired.verificationId, "GRAV")
    )).toBe("verification-expired");
  });

  it("rejects an expired response token", async () => {
    const verification = await store.create();
    await startMedia(store, verification.imageUrl);
    const completion = await store.submitAnswer(verification.verificationId, "GRAV");
    if (!completion.success) throw new Error("Expected successful completion.");
    now += 300_001;
    expect(await store.verify(verification.verificationId, completion.responseToken)).toEqual({
      success: false,
      errorCode: "invalid-or-expired-verification"
    });
  });
});
