import { describe, expect, it } from "vitest";
import { renderGravityAudio } from "../src/gravity-audio-renderer.js";

describe("Gravity audio renderer", () => {
  it("encodes a compact MP3 without embedding the answer as metadata", () => {
    const audio = renderGravityAudio("B3KT");
    expect(audio.byteLength).toBeGreaterThan(30_000);
    expect(audio.byteLength).toBeLessThan(100_000);
    expect(audio.subarray(0, 2).toString("hex")).toMatch(/^ff(f2|f3|fa|fb)$/);
    expect(audio.toString("latin1")).not.toContain("B3KT");
  });
});
