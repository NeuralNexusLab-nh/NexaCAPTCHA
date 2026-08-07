import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PublicError } from "../src/errors.js";
import { VerificationStore, normalizeAnswer } from "../src/store.js";

describe("VerificationStore", () => {
  let directory: string;
  let store: VerificationStore;

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "nexacaptcha-test-"));
    store = new VerificationStore({
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
    const verification = await store.create();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      expect(store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
        success: false,
        status: "incorrect",
        attemptsRemaining: 5 - attempt
      });
    }
    expect(store.submitAnswer(verification.verificationId, "WRNG")).toEqual({
      success: false,
      status: "verification_failed",
      attemptsRemaining: 0
    });
    expect(() => store.submitAnswer(verification.verificationId, "NEXA")).toThrowError(
      PublicError
    );
  });

  it("returns a 32-character token and consumes it once", async () => {
    const verification = await store.create();
    const completion = store.submitAnswer(verification.verificationId, "nexa");
    expect(completion.success).toBe(true);
    if (!completion.success) throw new Error("Expected successful completion.");
    expect(completion.responseToken).toMatch(/^[A-Za-z0-9_-]{32}$/);

    expect(store.verify(verification.verificationId, completion.responseToken).success).toBe(true);
    expect(store.verify(verification.verificationId, completion.responseToken)).toEqual({
      success: false,
      errorCode: "invalid-or-expired-verification"
    });
  });

  it("rejects a token belonging to a different verification", async () => {
    const first = await store.create();
    const second = await store.create();
    const completion = store.submitAnswer(first.verificationId, "NEXA");
    if (!completion.success) throw new Error("Expected successful completion.");
    expect(store.verify(second.verificationId, completion.responseToken).success).toBe(false);
  });
});
