import { describe, expect, it } from "vitest";
import {
  compositeCharacterWithinAreaLimit,
  createDistinctColorIndices,
  fragmentStateForFrame,
  lineSectionFor,
  type RenderFrameStats,
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
  it("assigns four visibly distinct character colors", () => {
    let value = 0;
    const colors = createDistinctColorIndices(4, () => {
      value = (value + 0.37) % 1;
      return value;
    });
    expect(colors).toHaveLength(4);
    expect(new Set(colors).size).toBe(4);
    expect(colors.every((color) => color >= 2 && color <= 6)).toBe(true);
  });

  it("randomizes playback between 13 and 18 seconds", () => {
    const delays = frameDelays(renderVerificationAnimation("N3XA"));
    expect(delays.length).toBeGreaterThanOrEqual(130);
    expect(delays.length).toBeLessThanOrEqual(180);
    expect(delays.every((delay) => delay === 10)).toBe(true);
    const totalCentiseconds = delays.reduce((total, delay) => total + delay, 0);
    expect(totalCentiseconds).toBeGreaterThanOrEqual(1300);
    expect(totalCentiseconds).toBeLessThanOrEqual(1800);
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
      0.4
    );
    const visibleCount = [...target].filter((pixel) => pixel !== 0).length;
    expect(visibleCount).toBe(40);
  });

  it("keeps all four color tracks active without exposing a near-complete glyph", () => {
    const stats: RenderFrameStats[] = [];
    renderVerificationAnimation("B8LZ", {
      seedBytes: new Uint8Array([9, 7, 5, 3, 2, 1, 8, 6]),
      onFrame: (frame) => stats.push(frame)
    });

    expect(stats.length).toBeGreaterThanOrEqual(130);
    expect(stats.every((frame) => frame.activeCharacterCount >= 2)).toBe(true);
    expect(
      stats.every((frame) => frame.visibleRatios.every((ratio) => ratio <= 0.285))
    ).toBe(true);
    for (let characterIndex = 0; characterIndex < 4; characterIndex += 1) {
      expect(
        new Set(stats.map((frame) => frame.fragmentStates[characterIndex]?.block)).size
      ).toBeGreaterThan(8);
    }
  });

  it("splits straight trunks and closed loops across short time windows", () => {
    for (const character of "LTZF") {
      for (let start = 0; start < 130; start += 1) {
        const states = Array.from({ length: 5 }, (_value, offset) =>
          fragmentStateForFrame(character, start + offset, 7)
        );
        expect(new Set(states.map((state) => state.sliceStage)).size).toBeLessThanOrEqual(2);
        expect(
          states.every((state) => {
            const section = lineSectionFor(character, state.sliceStage);
            return section.end - section.start < 0.38;
          })
        ).toBe(true);
      }
    }

    for (const character of "68B") {
      for (let start = 0; start < 130; start += 1) {
        const stages = Array.from({ length: 5 }, (_value, offset) =>
          fragmentStateForFrame(character, start + offset, 11).strokeStage
        );
        expect(new Set(stages).size).toBeLessThanOrEqual(2);
      }
    }
  });
});
