import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PublicError } from "../src/errors.js";
import {
  VerificationStore,
  generateAnswer,
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
  const ticket = mediaUrl.split("/").at(-1)!;
  const media = await store.claimMedia(ticket);
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
      answerFactory: () => "NEXA",
      renderer: () => Buffer.from("GIF89a", "ascii"),
      gravityAnswerFactory: () => "GRAV",
      gravityRenderer: () => Buffer.from([137, 80, 78, 71]),
      mediaDirectory: directory,
      clock: () => now
    });
    await store.start();
  });

  afterEach(async () => {
    await store.stop();
    await rm(directory, { recursive: true, force: true });
  });

  it("normalizes human input", () => {
    expect(normalizeAnswer("  ne xa ")).toBe("NEXA");
  });

  it("uses only the allowed character set", () => {
    for (let sample = 0; sample < 1_000; sample += 1) {
      const answer = generateAnswer();
      expect(answer).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
      expect(answer).not.toMatch(/[IO01]/);
      expect(new Set(answer).size).toBe(4);
    }
  });

  it("always includes both required groups without repeating characters", () => {
    for (let sample = 0; sample < 1_000; sample += 1) {
      const answer = generateAnswer();
      expect(answer).toMatch(/[B836G]/);
      expect(answer).toMatch(/[KX6VWY]/);
      expect(new Set(answer).size).toBe(4);

      const confusableCharacters = answer.match(/[B836G]/g) ?? [];
      expect(confusableCharacters.length).toBeLessThanOrEqual(2);
      if (confusableCharacters.length === 2) {
        expect(confusableCharacters).toContain("6");
      }
    }
  });

  it("does not select 6 for both required positions", () => {
    const selections = [3, 0, 0, 0, 0, 0, 0];
    const answer = generateAnswer(
      (maximum) => Math.min(selections.shift() ?? 0, maximum - 1)
    );

    expect(answer.match(/6/g)).toHaveLength(1);
    expect(answer).toMatch(/[KXVWY]/);
    expect(new Set(answer).size).toBe(4);
  });

  it("selects four unique Gravity characters without required groups", () => {
    const seen = new Set<string>();
    for (let sample = 0; sample < 4_000; sample += 1) {
      const answer = generateGravityAnswer();
      expect(answer).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
      expect(answer).not.toMatch(/[IO01]/);
      expect(new Set(answer).size).toBe(4);
      answer.split("").forEach((character) => seen.add(character));
    }
    expect([...seen].sort().join("")).toBe(
      "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    );
  });

  it("creates Gravity media while sharing the verification protocol", async () => {
    const verification = await store.create("gravity");
    expect(verification.captchaType).toBe("gravity");
    if (verification.captchaType !== "gravity") throw new Error("Expected Gravity.");
    expect(verification.imageUrl).toContain("/api/media/");
    await startMedia(store, verification.imageUrl);
    const completion = await store.submitAnswer(verification.verificationId, "GRAV");
    expect(completion.success).toBe(true);
  });

  it("persists verification state under data and shares pooled media", async () => {
    const first = await store.create();
    const second = await store.create();
    if (first.captchaType !== "horizon" || second.captchaType !== "horizon") {
      throw new Error("Expected Horizon.");
    }
    expect(first.animationUrl).toMatch(/^\/api\/media\/[A-Za-z0-9_-]+$/);
    expect(first.animationUrl).not.toContain(first.verificationId);
    const files = await readdir(path.join(directory, "verification"));
    expect(files).toContain(`${first.verificationId.slice(4)}.json`);
    const record = JSON.parse(await readFile(
      path.join(directory, "verification", `${first.verificationId.slice(4)}.json`),
      "utf8"
    ));
    expect(record).toMatchObject({
      id: first.verificationId,
      type: "horizon",
      answer: "NEXA",
      successful: false,
      retryAvailableAt: null
    });
    const firstMedia = await store.claimMedia(first.animationUrl.split("/").at(-1)!);
    const secondMedia = await store.claimMedia(second.animationUrl.split("/").at(-1)!);
    expect(firstMedia.mediaPath).toBe(secondMedia.mediaPath);
    firstMedia.release();
    secondMedia.release();
  });

  it("expires after two incorrect attempts with a twenty-second cooldown", async () => {
    const verification = await store.create();
    if (verification.captchaType !== "horizon") throw new Error("Expected Horizon.");
    await startMedia(store, verification.animationUrl);
    expect(await store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "incorrect",
      attemptsRemaining: 1,
      retryAfterSeconds: 20
    });
    expect(
      await publicErrorCode(() => store.submitAnswer(verification.verificationId, "WRNG"))
    ).toBe("answer-cooldown");
    now += 20_000;
    expect(await store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "verification_failed",
      attemptsRemaining: 0
    });
    expect(
      await publicErrorCode(() => store.submitAnswer(verification.verificationId, "NEXA"))
    ).toBe("verification-expired");
  });

  it("returns a 64-character token and consumes it once", async () => {
    const verification = await store.create();
    expect(verification.verificationId).toMatch(/^ver_[A-Za-z0-9_-]{12}$/);
    expect(verification.verificationId).toHaveLength(16);
    if (verification.captchaType !== "horizon") throw new Error("Expected Horizon.");
    await startMedia(store, verification.animationUrl);
    const completion = await store.submitAnswer(verification.verificationId, "nexa");
    expect(completion.success).toBe(true);
    if (!completion.success) throw new Error("Expected successful completion.");
    expect(completion.responseToken).toMatch(/^[A-Za-z0-9_-]{64}$/);

    const tokenPath = path.join(
      directory,
      "tokens",
      `${verification.verificationId.slice(4)}.json`
    );
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

  it("rejects a token belonging to a different verification", async () => {
    const first = await store.create();
    const second = await store.create();
    if (first.captchaType !== "horizon" || second.captchaType !== "horizon") throw new Error("Expected Horizon.");
    await startMedia(store, first.animationUrl);
    await startMedia(store, second.animationUrl);
    const completion = await store.submitAnswer(first.verificationId, "NEXA");
    if (!completion.success) throw new Error("Expected successful completion.");
    expect((await store.verify(second.verificationId, completion.responseToken)).success).toBe(false);
  });

  it("starts the two-minute lifetime when animation playback is requested", async () => {
    const verification = await store.create();
    expect(
      await publicErrorCode(() => store.submitAnswer(verification.verificationId, "NEXA"))
    ).toBe("verification-not-started");

    if (verification.captchaType !== "horizon") throw new Error("Expected Horizon.");
    await startMedia(store, verification.animationUrl);
    now += 119_999;
    expect((await store.submitAnswer(verification.verificationId, "NEXA")).success).toBe(true);

    const expired = await store.create();
    if (expired.captchaType !== "horizon") throw new Error("Expected Horizon.");
    await startMedia(store, expired.animationUrl);
    now += 120_001;
    expect(
      await publicErrorCode(() => store.submitAnswer(expired.verificationId, "NEXA"))
    ).toBe("verification-expired");
  });

  it("rejects an expired response token", async () => {
    const verification = await store.create();
    if (verification.captchaType !== "horizon") throw new Error("Expected Horizon.");
    await startMedia(store, verification.animationUrl);
    const completion = await store.submitAnswer(verification.verificationId, "NEXA");
    if (!completion.success) throw new Error("Expected successful completion.");

    now += 300_001;
    expect(await store.verify(verification.verificationId, completion.responseToken)).toEqual({
      success: false,
      errorCode: "invalid-or-expired-verification"
    });
  });
});
