import { describe, expect, it } from "vitest";
import {
  CAPTCHA_DIFFICULTY_POINTS,
  DWELL_BACKTRACK_PROBABILITY,
  TRANSITION_BACKTRACK_PROBABILITY,
  ambiguityMultiplierForLandmarkRisk,
  compositeCharacterWithinAreaLimit,
  concurrentRevealCenter,
  createGlyphLandmarks,
  createDistinctColorIndices,
  createConcurrentRevealTracks,
  createRevealSegments,
  estimateGlyphVisibility,
  minimumTrackableVisibleRatio,
  randomJitterAt,
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
  it("interpolates randomized jitter without abrupt frame jumps", () => {
    const keyframes: [number, number][] = [
      [-2, 1],
      [1, -2],
      [2, 2],
      [-1, 0]
    ];
    expect(randomJitterAt(keyframes, 0)).toEqual([-2, 1]);
    expect(randomJitterAt(keyframes, 0.25)).toEqual([1, -2]);
    expect(randomJitterAt(keyframes, 1)).toEqual([-2, 1]);
    const beforeTurn = randomJitterAt(keyframes, 0.2499);
    const afterTurn = randomJitterAt(keyframes, 0.2501);
    expect(Math.hypot(afterTurn[0] - beforeTurn[0], afterTurn[1] - beforeTurn[1]))
      .toBeLessThan(0.01);
  });

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

  it("randomizes playback between 5 and 6 seconds", () => {
    const delays = frameDelays(renderVerificationAnimation("N3XA"));
    expect(delays.length).toBeGreaterThanOrEqual(250);
    expect(delays.length).toBeLessThanOrEqual(300);
    expect(delays.every((delay) => delay === 2)).toBe(true);
    const totalCentiseconds = delays.reduce((total, delay) => total + delay, 0);
    expect(totalCentiseconds).toBeGreaterThanOrEqual(500);
    expect(totalCentiseconds).toBeLessThanOrEqual(600);
  });

  it("limits a frame to the reduced visible area", () => {
    const fullCharacter = new Uint8Array(100).fill(4);
    const visibleCharacter = new Uint8Array(100).fill(5);
    const target = new Uint8Array(100);
    const compositedCount = compositeCharacterWithinAreaLimit(
      target,
      visibleCharacter,
      fullCharacter,
      10,
      5,
      0.2
    );
    const visibleCount = [...target].filter((pixel) => pixel !== 0).length;
    expect(compositedCount).toBe(20);
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
    expect(CAPTCHA_DIFFICULTY_POINTS).toBe(0);
    expect(reduceGlyphVisibility(0.34, 0)).toBeCloseTo(0.187);
    expect(reduceGlyphVisibility(0.56, 1)).toBeCloseTo(0.3584);
    expect(reduceGlyphVisibility(0.5, 0.5)).toBeCloseTo(0.2975);
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
    const wGlyph = stringToPaths("W");
    expect(minimumTrackableVisibleRatio({
      paths: wGlyph.paths,
      landmarks: createGlyphLandmarks(wGlyph.paths),
      minX: wGlyph.bounds.minX,
      maxX: wGlyph.bounds.maxX,
      minY: wGlyph.bounds.minY,
      maxY: wGlyph.bounds.maxY
    })).toBe(0.34);
  });

  it("treats open terminals as required gap landmarks", () => {
    const sixGaps = createGlyphLandmarks(stringToPaths("6").paths)
      .filter((landmark) => landmark.kind === "gap");
    const eightGaps = createGlyphLandmarks(stringToPaths("8").paths)
      .filter((landmark) => landmark.kind === "gap");

    expect(sixGaps.length).toBeGreaterThan(0);
    expect(sixGaps.every((landmark) => landmark.weight >= 0.78)).toBe(true);
    expect(eightGaps).toHaveLength(0);
  });

  it("splits the full scan time evenly across every character", () => {
    let state = 0x13579bdf;
    const random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    };
    const segments = createRevealSegments(4, 197, 66, 62, random);
    const dwellSegments = segments.filter((segment) => segment.kind === "dwell");
    const transitionSegments = segments.filter((segment) => segment.kind === "transition");
    expect(segments.reduce((total, segment) => total + segment.frames, 0)).toBe(197);
    expect(dwellSegments).toHaveLength(4);
    expect(dwellSegments.every((segment) => segment.frames >= 49)).toBe(true);
    for (let characterIndex = 0; characterIndex < 4; characterIndex += 1) {
      expect(
        dwellSegments.filter((segment) => segment.characterIndex === characterIndex)
      ).toHaveLength(1);
    }
    expect(dwellSegments.every((segment) => segment.toX - segment.fromX === 62)).toBe(
      true
    );
    const dwellDurations = dwellSegments.map((segment) => segment.frames);
    expect(Math.max(...dwellDurations) - Math.min(...dwellDurations)).toBeLessThanOrEqual(1);
    expect(new Set(dwellDurations).size).toBeGreaterThan(1);
    expect(transitionSegments).toHaveLength(0);
    expect(revealStateForFrame(0, segments).centerX).toBe(35);
    expect(revealStateForFrame(196, segments).centerX).toBe(283);
    const centers = Array.from({ length: 197 }, (_value, frame) =>
      revealStateForFrame(frame, segments).centerX
    );
    const largestStep = Math.max(
      ...centers.slice(1).map((center, index) =>
        Math.abs(center - (centers[index] ?? center))
      )
    );
    expect(largestStep).toBeLessThan(5);

    const minimumDurationSegments = createRevealSegments(4, 200, 66, 62, random);
    expect(
      minimumDurationSegments.every((segment) => segment.frames === 50)
    ).toBe(true);
  });

  it("keeps all character scans active for the full animation", () => {
    let state = 0x2468ace0;
    const random = () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state / 0x1_0000_0000;
    };
    const tracks = createConcurrentRevealTracks(4, 66, 62, random);
    expect(tracks).toHaveLength(4);
    tracks.forEach((track, characterIndex) => {
      expect(track.characterIndex).toBe(characterIndex);
      const characterX = 66 + characterIndex * 62;
      expect(track.scanLeft).toBeCloseTo(characterX - 24.8);
      expect(track.scanRight).toBeCloseTo(characterX + 24.8);
      expect(concurrentRevealCenter(0, 240, track)).toBeCloseTo(
        concurrentRevealCenter(239, 240, track)
      );
      const centers = Array.from({ length: 240 }, (_value, frame) =>
        concurrentRevealCenter(frame, 240, track)
      );
      const largestStep = Math.max(
        ...centers.slice(1).map((center, index) =>
          Math.abs(center - (centers[index] ?? center))
        )
      );
      expect(largestStep).toBeLessThan(1.3);
      expect(Math.min(...centers)).toBeLessThan(characterX - 23);
      expect(Math.max(...centers)).toBeGreaterThan(characterX + 23);
    });
  });

  it("covers the full character scan without gaps at minimum dwell time", () => {
    for (let phaseStep = 0; phaseStep < 16; phaseStep += 1) {
      const segment = {
        kind: "dwell" as const,
        frames: 50,
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
      expect(maximumGap).toBeLessThan(5);
    }
  });

  it("reduces reveal backtracking probability by seventy percent", () => {
    expect(DWELL_BACKTRACK_PROBABILITY).toBeCloseTo(0.05 * 0.3);
    expect(TRANSITION_BACKTRACK_PROBABILITY).toBeCloseTo(0.02 * 0.3);
  });
});
