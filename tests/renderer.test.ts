import { describe, expect, it } from "vitest";
import {
  compositeCharacterWithinAreaLimit,
  createRevealSegments,
  revealStateForFrame,
  renderVerification,
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
  it("changes contour colors without exposing the answer in metadata", () => {
    const rendered = renderVerification("N3XA", {
      seedBytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      collectFrames: true
    });
    const usedTrackColors = new Set<number>();
    for (const frame of rendered.frames ?? []) {
      for (const pixel of frame) {
        if (pixel >= 2 && pixel < 18) usedTrackColors.add(pixel);
      }
    }
    expect(usedTrackColors.size).toBeGreaterThanOrEqual(8);
    expect(rendered.parameterClass).toMatch(/^motion-v2:/);
    expect(rendered.parameterClass).not.toContain("N3XA");
  });

  it("provides a 300 to 600 ms clarity window during a dwell", () => {
    const segment = {
      kind: "dwell" as const,
      frames: 12,
      fromX: 0,
      toX: 100,
      phase: 0,
      backtrackAmplitude: 0,
      characterIndex: 0
    };
    const clearFrames = Array.from({ length: segment.frames }, (_value, frame) =>
      (revealStateForFrame(frame, [segment]).clarity ?? 0) > 0.25
    ).filter(Boolean).length;
    expect(clearFrames).toBeGreaterThanOrEqual(3);
    expect(clearFrames).toBeLessThanOrEqual(6);
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

  it("scans every character fully with uneven per-character timing", () => {
    let state = 0x13579bdf;
    const random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    };
    const segments = createRevealSegments(4, 165, 66, 62, random);
    const dwellSegments = segments.filter((segment) => segment.kind === "dwell");
    expect(segments.reduce((total, segment) => total + segment.frames, 0)).toBe(165);
    expect(dwellSegments).toHaveLength(8);
    expect(dwellSegments.every((segment) => segment.frames >= 12)).toBe(true);
    for (let characterIndex = 0; characterIndex < 4; characterIndex += 1) {
      expect(
        dwellSegments.filter((segment) => segment.characterIndex === characterIndex)
      ).toHaveLength(2);
    }
    expect(dwellSegments.every((segment) => segment.toX - segment.fromX === 100)).toBe(
      true
    );
    const dwellDurations = dwellSegments.map((segment) => segment.frames);
    expect(Math.max(...dwellDurations)).toBeLessThanOrEqual(18);
    expect(new Set(dwellDurations).size).toBeGreaterThan(1);
  });

  it("covers the full character scan without gaps at minimum dwell time", () => {
    for (let phaseStep = 0; phaseStep < 16; phaseStep += 1) {
      const segment = {
        kind: "dwell" as const,
        frames: 12,
        fromX: 0,
        toX: 100,
        phase: (phaseStep / 16) * Math.PI * 2,
        backtrackAmplitude: 7,
        characterIndex: 0
      };
      const centers = Array.from({ length: segment.frames }, (_value, frame) =>
        revealStateForFrame(frame, [segment]).centerX
      );
      const maximumGap = Math.max(
        ...centers.slice(1).map((center, index) => Math.abs(center - (centers[index] ?? 0)))
      );
      expect(centers[0]).toBeLessThanOrEqual(9);
      expect(centers.at(-1)).toBeGreaterThanOrEqual(91);
      expect(maximumGap).toBeLessThan(18);
    }
  });
});
