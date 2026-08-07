import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PublicError } from "../src/errors.js";
import { ChallengeStore, normalizeAnswer } from "../src/store.js";

describe("ChallengeStore", () => {
  let directory: string;
  let store: ChallengeStore;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "nexacaptcha-test-"));
    store = new ChallengeStore({
      answerFactory: () => "NEXA",
      renderer: () => Buffer.from("GIF89a", "ascii"),
      mediaDirectory: directory
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

  it("allows five incorrect attempts and then fails permanently", async () => {
    const challenge = await store.create();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect(store.submitAnswer(challenge.challengeId, "WRNG")).toEqual({
        success: false,
        status: "incorrect",
        attemptsRemaining: 5 - attempt
      });
    }
    expect(store.submitAnswer(challenge.challengeId, "WRNG")).toEqual({
      success: false,
      status: "challenge_failed",
      attemptsRemaining: 0
    });
    expect(() => store.submitAnswer(challenge.challengeId, "NEXA")).toThrowError(
      PublicError
    );
  });

  it("returns a 32-character token and consumes it once", async () => {
    const challenge = await store.create();
    const completion = store.submitAnswer(challenge.challengeId, "nexa");
    expect(completion.success).toBe(true);
    if (!completion.success) throw new Error("Expected successful completion.");
    expect(completion.responseToken).toMatch(/^[A-Za-z0-9_-]{32}$/);

    expect(store.verify(challenge.challengeId, completion.responseToken).success).toBe(true);
    expect(store.verify(challenge.challengeId, completion.responseToken)).toEqual({
      success: false,
      errorCode: "invalid-or-expired-verification"
    });
  });

  it("rejects a token belonging to a different challenge", async () => {
    const first = await store.create();
    const second = await store.create();
    const completion = store.submitAnswer(first.challengeId, "NEXA");
    if (!completion.success) throw new Error("Expected successful completion.");
    expect(store.verify(second.challengeId, completion.responseToken).success).toBe(false);
  });
});
