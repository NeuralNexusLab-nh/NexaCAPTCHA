import { describe, expect, it } from "vitest";
import {
  DWELL_BACKTRACK_PROBABILITY,
  TRANSITION_BACKTRACK_PROBABILITY,
  ambiguityMultiplierForLandmarkRisk,
  compositeCharacterWithinAreaLimit,
  createGlyphLandmarks,
  createDistinctColorIndices,
  createRevealSegments,
  estimateGlyphVisibility,
  reduceGlyphVisibility,
  revealStateForFrame,
  renderVerificationAnimation
} from "../src/renderer.js";
import { stringToPaths } from "hershey";

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

  it("randomizes playback between 28 and 37 seconds", () => {
    const delays = frameDelays(renderVerificationAnimation("N3XA"));
    expect(delays.length).toBeGreaterThanOrEqual(280);
    expect(delays.length).toBeLessThanOrEqual(370);
    expect(delays.every((delay) => delay === 10)).toBe(true);
    const totalCentiseconds = delays.reduce((total, delay) => total + delay, 0);
    expect(totalCentiseconds).toBeGreaterThanOrEqual(2800);
    expect(totalCentiseconds).toBeLessThanOrEqual(3700);
  });

  it("limits a frame to the reduced visible area", () => {
    const fullCharacter = new Uint8Array(100).fill(4);
    const visibleCharacter = new Uint8Array(100).fill(5);
    const target = new Uint8Array(100);
    compositeCharacterWithinAreaLimit(
      target,
      visibleCharacter,
      fullCharacter,
      10,
      5,
      0.2
    );
    const visibleCount = [...target].filter((pixel) => pixel !== 0).length;
    expect(visibleCount).toBe(20);
  });

  it("adapts the visible area to about one stroke and one corner", () => {
    const simple = estimateGlyphVisibility(stringToPaths("E").paths);
    const curved = estimateGlyphVisibility(stringToPaths("8").paths);
    const mixed = estimateGlyphVisibility(stringToPaths("B").paths);

    expect(simple.strokeCount).toBe(4);
    expect(curved.strokeCount).toBe(1);
    expect(mixed.strokeCount).toBe(3);
    for (const estimate of [simple, curved, mixed]) {
      expect(estimate.visibleRatio).toBeGreaterThanOrEqual(0.34);
      expect(estimate.visibleRatio).toBeLessThanOrEqual(0.56);
    }
    expect(curved.visibleRatio).toBeGreaterThan(simple.visibleRatio);
  });

  it("keeps the enlarged visible area within the readability range", () => {
    expect(reduceGlyphVisibility(0.34, 0)).toBeCloseTo(0.1768);
    expect(reduceGlyphVisibility(0.56, 1)).toBeCloseTo(0.3472);
    expect(reduceGlyphVisibility(0.5, 0.5)).toBeCloseTo(0.285);
  });

  it("shrinks frames around distinctive joined strokes", () => {
    const wLandmarks = createGlyphLandmarks(stringToPaths("W").paths);
    const sevenLandmarks = createGlyphLandmarks(stringToPaths("7").paths);
    const cLandmarks = createGlyphLandmarks(stringToPaths("C").paths);

    expect(wLandmarks.filter((landmark) => landmark.weight >= 1.25)).toHaveLength(3);
    expect(sevenLandmarks.filter((landmark) => landmark.weight >= 1.25)).toHaveLength(1);
    expect(cLandmarks.filter((landmark) => landmark.weight >= 1.25)).toHaveLength(0);
    expect(ambiguityMultiplierForLandmarkRisk(1.35)).toBe(0.82);
    expect(ambiguityMultiplierForLandmarkRisk(0.78)).toBe(0.9);
    expect(ambiguityMultiplierForLandmarkRisk(0)).toBe(1);
  });

  it("scans every character fully with uneven per-character timing", () => {
    let state = 0x13579bdf;
    const random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    };
    const segments = createRevealSegments(4, 325, 66, 62, random);
    const dwellSegments = segments.filter((segment) => segment.kind === "dwell");
    expect(segments.reduce((total, segment) => total + segment.frames, 0)).toBe(325);
    expect(dwellSegments).toHaveLength(8);
    expect(dwellSegments.every((segment) => segment.frames >= 31)).toBe(true);
    for (let characterIndex = 0; characterIndex < 4; characterIndex += 1) {
      expect(
        dwellSegments.filter((segment) => segment.characterIndex === characterIndex)
      ).toHaveLength(2);
    }
    expect(dwellSegments.every((segment) => segment.toX - segment.fromX === 100)).toBe(
      true
    );
    const dwellDurations = dwellSegments.map((segment) => segment.frames);
    expect(Math.max(...dwellDurations)).toBeLessThanOrEqual(48);
    expect(new Set(dwellDurations).size).toBeGreaterThan(1);
  });

  it("covers the full character scan without gaps at minimum dwell time", () => {
    for (let phaseStep = 0; phaseStep < 16; phaseStep += 1) {
      const segment = {
        kind: "dwell" as const,
        frames: 31,
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
      expect(maximumGap).toBeLessThan(9);
    }
  });

  it("reduces reveal backtracking probability by seventy percent", () => {
    expect(DWELL_BACKTRACK_PROBABILITY).toBeCloseTo(0.05 * 0.3);
    expect(TRANSITION_BACKTRACK_PROBABILITY).toBeCloseTo(0.02 * 0.3);
  });
});
