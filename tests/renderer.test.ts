import { describe, expect, it } from "vitest";
import {
  compositeCharacterWithinAreaLimit,
  createRevealSegments,
  renderVerificationAnimation
} from "../src/renderer.js";

function frameDelays(gif: Buffer): number[] {
  const delays: number[] = [];
  for (let index = 0; index <= gif.length - 8; index += 1) {
    if (
      gif[index] === 0x21 &&
      gif[index + 1] === 0xf9 &&
      gif[index + 2] === 0x04
    ) {
      delays.push((gif[index + 5] ?? 0) * 256 + (gif[index + 4] ?? 0));
    }
  }
  return delays;
}

describe("verification animation", () => {
  it("randomizes playback between 8 and 13 seconds", () => {
    const delays = frameDelays(renderVerificationAnimation("N3XA"));
    expect(delays.length).toBeGreaterThanOrEqual(80);
    expect(delays.length).toBeLessThanOrEqual(130);
    expect(delays.every((delay) => delay === 10)).toBe(true);
    const totalCentiseconds = delays.reduce((total, delay) => total + delay, 0);
    expect(totalCentiseconds).toBeGreaterThanOrEqual(800);
    expect(totalCentiseconds).toBeLessThanOrEqual(1300);
  });

  it("limits a frame to one small stroke or corner", () => {
    const fullCharacter = new Uint8Array(100).fill(4);
    const visibleCharacter = new Uint8Array(100).fill(5);
    const target = new Uint8Array(100);
    compositeCharacterWithinAreaLimit(
      target,
      visibleCharacter,
      fullCharacter,
      10,
      5,
      0.28
    );
    const visibleCount = [...target].filter((pixel) => pixel !== 0).length;
    expect(visibleCount).toBe(28);
  });

  it("scans every character fully with uneven per-character timing", () => {
    let state = 0x13579bdf;
    const random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    };
    const segments = createRevealSegments(4, 110, 66, 62, random);
    const dwellSegments = segments.filter((segment) => segment.kind === "dwell");
    expect(segments.reduce((total, segment) => total + segment.frames, 0)).toBe(110);
    expect(dwellSegments).toHaveLength(4);
    expect(dwellSegments.every((segment) => segment.toX - segment.fromX === 100)).toBe(
      true
    );
    const dwellDurations = dwellSegments.map((segment) => segment.frames);
    expect(Math.max(...dwellDurations) - Math.min(...dwellDurations)).toBeGreaterThanOrEqual(
      5
    );
  });
});
