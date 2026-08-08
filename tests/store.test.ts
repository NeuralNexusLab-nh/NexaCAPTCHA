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
    }
  });

  it("applies exact inclusion decisions for both character groups", () => {
    const answerForRolls = (confusableRoll: number, complexRoll: number) => {
      const rolls = [confusableRoll, complexRoll, 0];
      return generateAnswer(
        () => 0,
        () => rolls.shift() ?? 0
      );
    };

    const both = answerForRolls(69, 39);
    expect(both).toMatch(/[B836]/);
    expect(both).toMatch(/[KXADR26GVWYJT7]/);

    const confusableOnly = answerForRolls(69, 40);
    expect(confusableOnly).toMatch(/[B836]/);
    expect(confusableOnly).not.toMatch(/[KXADR26GVWYJT7]/);

    const complexOnly = answerForRolls(70, 39);
    expect(complexOnly).not.toMatch(/[B836]/);
    expect(complexOnly).toMatch(/[KXADR26GVWYJT7]/);

    const neither = answerForRolls(70, 40);
    expect(neither).not.toMatch(/[B836]/);
    expect(neither).not.toMatch(/[KXADR26GVWYJT7]/);
  });

  it("accepts 40-percent duplicate candidates without reselection", () => {
    let duplicateDecisionCalls = 0;
    const policyRolls = [0, 0];
    const answer = generateAnswer(
      () => 0,
      () => {
        if (policyRolls.length > 0) return policyRolls.shift()!;
        duplicateDecisionCalls += 1;
        return 0;
      }
    );

    expect(new Set(answer).size).toBeLessThan(answer.length);
    expect(duplicateDecisionCalls).toBe(1);
  });

  it("stops after five duplicate reselections", () => {
    let duplicateDecisionCalls = 0;
    let candidateCharacterCalls = 0;
    const policyRolls = [99, 99];
    const answer = generateAnswer(
      (maximum) => {
        if (maximum === 15) candidateCharacterCalls += 1;
        return 0;
      },
      () => {
        if (policyRolls.length > 0) return policyRolls.shift()!;
        duplicateDecisionCalls += 1;
        return 99;
      }
    );

    expect(new Set(answer).size).toBeLessThan(answer.length);
    expect(duplicateDecisionCalls).toBe(5);
    expect(candidateCharacterCalls).toBe(24);
  });

  it("enforces three attempts with a ten-second cooldown", async () => {
    const verification = await store.create();
    store.getMediaPath(verification.verificationId);
    expect(store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "incorrect",
      attemptsRemaining: 2,
      retryAfterSeconds: 10
    });
    expect(
      publicErrorCode(() => store.submitAnswer(verification.verificationId, "WRNG"))
    ).toBe("answer-cooldown");
    now += 10_000;
    expect(store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "incorrect",
      attemptsRemaining: 1,
      retryAfterSeconds: 10
    });
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
