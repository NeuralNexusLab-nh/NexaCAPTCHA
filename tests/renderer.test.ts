import { describe, expect, it } from "vitest";
import {
  compositeCharacterWithinAreaLimit,
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

  it("caps a character frame at forty percent of its rendered pixels", () => {
    const fullCharacter = new Uint8Array(20).fill(4);
    const visibleCharacter = new Uint8Array(20).fill(5);
    const target = new Uint8Array(20);
    compositeCharacterWithinAreaLimit(
      target,
      visibleCharacter,
      fullCharacter,
      5,
      2.5
    );
    expect([...target].filter((pixel) => pixel !== 0)).toHaveLength(8);
  });
});
