import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PublicError } from "../src/errors.js";
import { VerificationStore, generateAnswer, normalizeAnswer } from "../src/store.js";

function publicErrorCode(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof PublicError) return error.code;
    throw error;
  }
  throw new Error("Expected a PublicError.");
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
      expect(answer).toMatch(/[B836]/);
      expect(answer).toMatch(/[KXADR26GVWYJT7]/);
      expect(new Set(answer).size).toBe(4);

      const confusableCharacters = answer.match(/[B836]/g) ?? [];
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
    expect(answer).toMatch(/[KXADR2GVWYJT7]/);
    expect(new Set(answer).size).toBe(4);
  });

  it("expires after two incorrect attempts with a ten-second cooldown", async () => {
    const verification = await store.create();
    store.getMediaPath(verification.verificationId);
    expect(store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "incorrect",
      attemptsRemaining: 1,
      retryAfterSeconds: 10
    });
    expect(
      publicErrorCode(() => store.submitAnswer(verification.verificationId, "WRNG"))
    ).toBe("answer-cooldown");
    now += 10_000;
    expect(store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "verification_failed",
      attemptsRemaining: 0
    });
    expect(
      publicErrorCode(() => store.submitAnswer(verification.verificationId, "NEXA"))
    ).toBe("verification-expired");
  });

  it("returns a 64-character token and consumes it once", async () => {
    const verification = await store.create();
    expect(verification.verificationId).toMatch(/^ver_[A-Za-z0-9_-]{12}$/);
    expect(verification.verificationId).toHaveLength(16);
    store.getMediaPath(verification.verificationId);
    const completion = store.submitAnswer(verification.verificationId, "nexa");
    expect(completion.success).toBe(true);
    if (!completion.success) throw new Error("Expected successful completion.");
    expect(completion.responseToken).toMatch(/^[A-Za-z0-9_-]{64}$/);

    expect(store.verify(verification.verificationId, completion.responseToken).success).toBe(true);
    expect(store.verify(verification.verificationId, completion.responseToken)).toEqual({
      success: false,
      errorCode: "invalid-or-expired-verification"
    });
  });

  it("rejects a token belonging to a different verification", async () => {
    const first = await store.create();
    const second = await store.create();
    store.getMediaPath(first.verificationId);
    store.getMediaPath(second.verificationId);
    const completion = store.submitAnswer(first.verificationId, "NEXA");
    if (!completion.success) throw new Error("Expected successful completion.");
    expect(store.verify(second.verificationId, completion.responseToken).success).toBe(false);
  });

  it("starts the two-minute lifetime when animation playback is requested", async () => {
    const verification = await store.create();
    expect(
      publicErrorCode(() => store.submitAnswer(verification.verificationId, "NEXA"))
    ).toBe("verification-not-started");

    store.getMediaPath(verification.verificationId);
    now += 119_999;
    expect(store.submitAnswer(verification.verificationId, "NEXA").success).toBe(true);

    const expired = await store.create();
    store.getMediaPath(expired.verificationId);
    now += 120_001;
    expect(
      publicErrorCode(() => store.submitAnswer(expired.verificationId, "NEXA"))
    ).toBe("verification-expired");
  });

  it("rejects an expired response token", async () => {
    const verification = await store.create();
    store.getMediaPath(verification.verificationId);
    const completion = store.submitAnswer(verification.verificationId, "NEXA");
    if (!completion.success) throw new Error("Expected successful completion.");

    now += 300_001;
    expect(store.verify(verification.verificationId, completion.responseToken)).toEqual({
      success: false,
      errorCode: "invalid-or-expired-verification"
    });
  });
});
