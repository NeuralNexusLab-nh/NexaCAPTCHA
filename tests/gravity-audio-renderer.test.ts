import { describe, expect, it } from "vitest";
import { renderGravityAudio } from "../src/gravity-audio-renderer.js";

describe("Gravity audio renderer", () => {
  it("encodes browser-compatible PCM WAV without embedding the answer as metadata", () => {
    const audio = renderGravityAudio("B3KT");
    expect(audio.byteLength).toBeGreaterThan(180_000);
    expect(audio.byteLength).toBeLessThan(280_000);
    expect(audio.toString("ascii", 0, 4)).toBe("RIFF");
    expect(audio.toString("ascii", 8, 12)).toBe("WAVE");
    expect(audio.readUInt16LE(20)).toBe(1);
    expect(audio.readUInt16LE(22)).toBe(1);
    expect(audio.readUInt32LE(24)).toBe(16_000);
    expect(audio.readUInt16LE(34)).toBe(16);
    expect(audio.toString("latin1")).not.toContain("B3KT");
  });
});
