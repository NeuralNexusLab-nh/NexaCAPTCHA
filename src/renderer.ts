import { randomBytes } from "node:crypto";
import gifenc from "gifenc";
import { stringToPaths, type Point } from "hershey";
import { config } from "./config.js";

const PALETTE = [
  [5, 7, 6],
  [48, 62, 51],
  [121, 204, 255],
  [173, 140, 255],
  [221, 255, 220],
  [137, 243, 110],
  [255, 190, 100],
  [24, 28, 25],
  [48, 82, 108],
  [76, 55, 104],
  [5, 7, 6],
  [5, 7, 6],
  [5, 7, 6],
  [5, 7, 6],
  [5, 7, 6],
  [5, 7, 6]
];

const GIFEncoder =
  typeof gifenc === "function" ? gifenc : gifenc.GIFEncoder;

export const DWELL_BACKTRACK_PROBABILITY = 0.015;
export const TRANSITION_BACKTRACK_PROBABILITY = 0.006;
export const CAPTCHA_DIFFICULTY_POINTS = 0;
const DIFFICULTY_MULTIPLIER = 1 + CAPTCHA_DIFFICULTY_POINTS * 0.05;

interface Glyph {
  character: string;
  paths: Point[][];
  landmarks: GlyphLandmark[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface MotionProfile {
  phaseX: number;
  phaseY: number;
  phaseDistortion: number;
  horizontalCycles: number;
  verticalCycles: number;
  distortionCycles: number;
  driftX: number;
  driftY: number;
  stretchX: number;
  stretchY: number;
  waveAmplitude: number;
  shearAmplitude: number;
  rotationDegrees: number;
  jitterKeyframes: Point[];
  colorIndex: number;
}

export interface RevealSegment {
  kind: "transition" | "dwell";
  frames: number;
  fromX: number;
  toX: number;
  phase: number;
  backtrackAmplitude: number;
  tempoVariation?: number;
  characterIndex?: number;
}

interface RevealShapeProfile {
  phase: number;
  cycles: number;
  height: number;
  bend: number;
  pinch: number;
  edgeWaves: number;
}

interface RevealMask extends RevealShapeProfile {
  centerX: number;
  centerY: number;
  width: number;
  animatedPhase: number;
}

export interface InterferenceLineProfile {
  baseY: number;
  amplitude: number;
  secondaryAmplitude: number;
  cycles: number;
  phase: number;
  drift: number;
  motionCycles: number;
  thickness: number;
  colorIndex: number;
}

export interface ConcurrentRevealTrack {
  scanLeft: number;
  scanRight: number;
  phase: number;
  cycles: number;
  wobbleAmplitude: number;
  wobbleCycles: number;
  wobblePhase: number;
  characterIndex: number;
}

export interface GlyphLandmark {
  point: Point;
  weight: number;
  kind: "gap" | "junction" | "corner";
}

export interface GlyphVisibilityEstimate {
  strokeCount: number;
  cornerCount: number;
  visibleRatio: number;
}

function createPrng(seedBytes: Uint8Array): () => number {
  let state = new DataView(
    seedBytes.buffer,
    seedBytes.byteOffset,
    seedBytes.byteLength
  ).getUint32(0, true) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function createRandomJitterKeyframes(
  count: number,
  amplitude: number,
  random: () => number
): Point[] {
  return Array.from({ length: count }, () => [
    (random() * 2 - 1) * amplitude,
    (random() * 2 - 1) * amplitude
  ]);
}

export function randomJitterAt(
  keyframes: Point[],
  frameProgress: number
): Point {
  if (keyframes.length === 0) return [0, 0];
  if (keyframes.length === 1) return keyframes[0] ?? [0, 0];
  const wrappedProgress = ((frameProgress % 1) + 1) % 1;
  const position = wrappedProgress * keyframes.length;
  const keyframeIndex = Math.floor(position) % keyframes.length;
  const nextIndex = (keyframeIndex + 1) % keyframes.length;
  const localProgress = position - Math.floor(position);
  const easedProgress = localProgress * localProgress * (3 - 2 * localProgress);
  const from = keyframes[keyframeIndex] ?? [0, 0];
  const to = keyframes[nextIndex] ?? from;
  return [
    from[0] + (to[0] - from[0]) * easedProgress,
    from[1] + (to[1] - from[1]) * easedProgress
  ];
}

export function createInterferenceLineProfiles(
  count: number,
  height: number,
  random: () => number,
  characterColorIndices: number[] = [2, 3, 4, 5]
): InterferenceLineProfile[] {
  return Array.from({ length: count }, (_, index) => ({
    // Keep every curve inside the glyph band so it intersects useful strokes
    // instead of becoming removable background decoration.
    baseY: height * (0.3 + 0.4 * ((index + 0.5) / count)) +
      (random() * 2 - 1) * 12,
    amplitude: 10 + random() * 14,
    secondaryAmplitude: 3 + random() * 6,
    cycles: 1.05 + random() * 2.1,
    phase: random() * Math.PI * 2,
    drift: 7 + random() * 13,
    motionCycles: 0.7 + random() * 1.25,
    // Gravity keeps foreground curves visibly thinner than its glyph strokes.
    // Preserve that hierarchy here while retaining enough weight to cross and
    // visually merge with the animated character fragments.
    thickness: 0.9 + random() * 0.45,
    colorIndex:
      characterColorIndices[index % Math.max(1, characterColorIndices.length)] ?? 4
  }));
}

export function interferenceLinePoint(
  profile: InterferenceLineProfile,
  horizontalProgress: number,
  frameProgress: number,
  width: number
): Point {
  const horizontalMotion =
    frameProgress * Math.PI * 2 * profile.motionCycles + profile.phase;
  const x =
    -12 + horizontalProgress * (width + 24) +
    profile.drift * Math.sin(horizontalMotion);
  const primaryWave =
    horizontalProgress * Math.PI * 2 * profile.cycles +
    profile.phase +
    frameProgress * Math.PI * 2 * profile.motionCycles;
  const secondaryWave =
    horizontalProgress * Math.PI * 2 * (profile.cycles * 2.35) -
    frameProgress * Math.PI * 2 * (profile.motionCycles * 0.73) +
    profile.phase * 0.6;
  return [
    x,
    profile.baseY +
      profile.amplitude * Math.sin(primaryWave) +
      profile.secondaryAmplitude * Math.sin(secondaryWave) +
      3 * Math.cos(horizontalMotion * 0.8)
  ];
}

function glyphFor(character: string): Glyph {
  const result = stringToPaths(character);
  return {
    character,
    paths: result.paths,
    landmarks: createGlyphLandmarks(result.paths),
    minX: result.bounds.minX,
    maxX: result.bounds.maxX,
    minY: result.bounds.minY,
    maxY: result.bounds.maxY
  };
}

export function structuralDistortionScale(
  character: string,
  point: Point
): number {
  // Preserve the Y junction and lower stem as one axis. Whole-glyph rotation,
  // drift and jitter still apply, but local warping cannot turn it into X.
  if (character === "Y" && point[1] <= 2.1 && Math.abs(point[0]) <= 0.75) {
    return 0.12;
  }
  return 1;
}

export function createGlyphLandmarks(paths: Point[][]): GlyphLandmark[] {
  const endpoints: Point[] = [];
  const corners: Point[] = [];

  for (const path of paths) {
    const first = path[0];
    const last = path.at(-1);
    if (first) endpoints.push(first);
    if (last) endpoints.push(last);

    for (let index = 1; index < path.length - 1; index += 1) {
      const before = path[index - 1];
      const corner = path[index];
      const after = path[index + 1];
      if (!before || !corner || !after) continue;
      const firstAngle = Math.atan2(corner[1] - before[1], corner[0] - before[0]);
      const secondAngle = Math.atan2(after[1] - corner[1], after[0] - corner[0]);
      const turn = Math.abs(
        Math.atan2(Math.sin(secondAngle - firstAngle), Math.cos(secondAngle - firstAngle))
      );
      if (turn >= Math.PI / 5) corners.push(corner);
    }
  }

  const groups: Array<{ point: Point; count: number }> = [];
  for (const endpoint of endpoints) {
    const group = groups.find(
      (candidate) => Math.hypot(
        candidate.point[0] - endpoint[0],
        candidate.point[1] - endpoint[1]
      ) <= 0.75
    );
    if (group) {
      group.point = [
        (group.point[0] * group.count + endpoint[0]) / (group.count + 1),
        (group.point[1] * group.count + endpoint[1]) / (group.count + 1)
      ];
      group.count += 1;
    } else {
      groups.push({ point: [...endpoint], count: 1 });
    }
  }

  const landmarks: GlyphLandmark[] = groups.map((group) => ({
    point: group.point,
    // Joined endpoints expose topology (for example the vertex in W or 7),
    // while a lone endpoint marks an opening that distinguishes glyphs such
    // as 6 from 8. Openings must survive the reveal as reliably as corners.
    weight: group.count >= 2 ? 1.35 : 0.78,
    kind: group.count >= 2 ? "junction" : "gap"
  }));
  for (const corner of corners) {
    const existing = landmarks.find(
      (landmark) => Math.hypot(
        landmark.point[0] - corner[0],
        landmark.point[1] - corner[1]
      ) <= 0.75
    );
    if (existing) existing.weight = Math.max(existing.weight, 1.15);
    else landmarks.push({ point: [...corner], weight: 0.78, kind: "corner" });
  }
  return landmarks;
}

export function ambiguityMultiplierForLandmarkRisk(risk: number): number {
  if (risk >= 1.25) return 0.82;
  if (risk >= 0.72) return 0.9;
  if (risk >= 0.28) return 0.96;
  return 1;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

/**
 * Estimates how much of a glyph corresponds to roughly one drawn stroke plus
 * one turn. Hershey paths are already separated into pen strokes, so the
 * estimate can adapt to each glyph without maintaining character-specific
 * rules or changing the answer distribution.
 */
export function estimateGlyphVisibility(paths: Point[][]): GlyphVisibilityEstimate {
  const strokeLengths: number[] = [];
  const cornerSpans: number[] = [];
  let cornerCount = 0;

  for (const path of paths) {
    let strokeLength = 0;
    const segmentLengths: number[] = [];
    for (let index = 1; index < path.length; index += 1) {
      const previous = path[index - 1];
      const current = path[index];
      if (!previous || !current) continue;
      const length = Math.hypot(current[0] - previous[0], current[1] - previous[1]);
      segmentLengths.push(length);
      strokeLength += length;
    }
    if (strokeLength > 0) strokeLengths.push(strokeLength);

    for (let index = 1; index < path.length - 1; index += 1) {
      const before = path[index - 1];
      const corner = path[index];
      const after = path[index + 1];
      if (!before || !corner || !after) continue;
      const firstAngle = Math.atan2(corner[1] - before[1], corner[0] - before[0]);
      const secondAngle = Math.atan2(after[1] - corner[1], after[0] - corner[0]);
      const turn = Math.abs(
        Math.atan2(Math.sin(secondAngle - firstAngle), Math.cos(secondAngle - firstAngle))
      );
      if (turn < Math.PI / 7) continue;
      cornerCount += 1;
      cornerSpans.push(
        Math.min(segmentLengths[index - 1] ?? 0, segmentLengths[index] ?? 0)
      );
    }
  }

  const totalLength = strokeLengths.reduce((total, length) => total + length, 0);
  const typicalStrokeLength = median(strokeLengths);
  // Disconnected straight strokes can meet visually even without sharing a
  // Hershey path, so reserve a small corner allowance when no turn is encoded.
  const cornerAllowance = cornerSpans.length > 0
    ? median(cornerSpans) * 0.7
    : totalLength * 0.1;
  const rawRatio = totalLength > 0
    ? (typicalStrokeLength + cornerAllowance) / totalLength
    : 0.4;

  return {
    strokeCount: strokeLengths.length,
    cornerCount,
    visibleRatio: Math.min(0.56, Math.max(0.34, rawRatio))
  };
}

export function reduceGlyphVisibility(
  estimatedVisibleRatio: number,
  randomValue: number
): number {
  const reduction =
    (0.55 + Math.min(1, Math.max(0, randomValue)) * 0.09) /
    DIFFICULTY_MULTIPLIER;
  return Math.min(
    0.36 / DIFFICULTY_MULTIPLIER,
    Math.max(0.18 / DIFFICULTY_MULTIPLIER, estimatedVisibleRatio * reduction)
  );
}

function horizontalDrift(
  motionProfile: MotionProfile,
  frameProgress: number
): number {
  const motion = frameProgress * Math.PI * 2;
  const horizontalMotion =
    motion * motionProfile.horizontalCycles + motionProfile.phaseX;
  return (
    motionProfile.driftX * Math.sin(horizontalMotion) +
    1.4 * Math.sin(horizontalMotion * 2 + motionProfile.phaseY)
  );
}

function isInsideRevealMask(x: number, y: number, mask: RevealMask): boolean {
  const vertical = (y - mask.centerY) / Math.max(1, mask.height / 2);
  if (Math.abs(vertical) > 1) return false;
  const roundedEnvelope = Math.sqrt(Math.max(0, 1 - vertical * vertical));
  const pinchFactor = 1 - mask.pinch * (1 - roundedEnvelope);
  const rippledEdge =
    1 + 0.08 * Math.sin(vertical * mask.edgeWaves + mask.animatedPhase);
  const halfWidth =
    (mask.width / 2) *
    (0.65 + 0.35 * roundedEnvelope) *
    pinchFactor *
    rippledEdge;
  const curvedCenter =
    mask.centerX +
    mask.bend * Math.sin(vertical * 4.5 + mask.animatedPhase) +
    mask.bend * 0.2 * Math.cos(vertical * 8 + mask.animatedPhase * 0.7);
  return Math.abs(x - curvedCenter) <= Math.max(2, halfWidth);
}

function drawDisc(
  pixels: Uint8Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  color: number,
  revealMask: RevealMask,
  characterClipLeft: number,
  characterClipRight: number
): void {
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (x < characterClipLeft || x > characterClipRight) continue;
      if (!isInsideRevealMask(x + 0.5, y + 0.5, revealMask)) continue;
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      if (dx * dx + dy * dy <= radiusSquared) {
        const index = y * width + x;
        pixels[index] = color;
      }
    }
  }
}

function drawLine(
  pixels: Uint8Array,
  width: number,
  height: number,
  from: Point,
  to: Point,
  thickness: number,
  color: number,
  revealMask: RevealMask,
  characterClipLeft: number,
  characterClipRight: number
): void {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 1.25));
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    drawDisc(
      pixels,
      width,
      height,
      from[0] + dx * progress,
      from[1] + dy * progress,
      thickness,
      color,
      revealMask,
      characterClipLeft,
      characterClipRight
    );
  }
}

function drawInterferenceLines(
  pixels: Uint8Array,
  width: number,
  height: number,
  profiles: InterferenceLineProfile[],
  frameProgress: number
): void {
  const fullCanvasMask: RevealMask = {
    phase: 0,
    cycles: 0,
    height: height * 2,
    bend: 0,
    pinch: 0,
    edgeWaves: 0,
    centerX: width / 2,
    centerY: height / 2,
    width: width * 2,
    animatedPhase: 0
  };

  for (const profile of profiles) {
    let previous = interferenceLinePoint(profile, 0, frameProgress, width);
    const segments = 44;
    for (let segment = 1; segment <= segments; segment += 1) {
      const current = interferenceLinePoint(
        profile,
        segment / segments,
        frameProgress,
        width
      );
      drawLine(
        pixels,
        width,
        height,
        previous,
        current,
        profile.thickness,
        profile.colorIndex,
        fullCanvasMask,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY
      );
      previous = current;
    }
  }
}

function transformPoint(
  point: Point,
  glyph: Glyph,
  characterIndex: number,
  frameProgress: number,
  baseX: number,
  motionProfile: MotionProfile
): Point {
  const glyphWidth = Math.max(1, glyph.maxX - glyph.minX);
  const glyphHeight = Math.max(1, glyph.maxY - glyph.minY);
  const normalizedX = (point[0] - (glyph.minX + glyph.maxX) / 2) / glyphWidth;
  const normalizedY = (point[1] - (glyph.minY + glyph.maxY) / 2) / glyphHeight;
  const motion = frameProgress * Math.PI * 2;
  const verticalMotion = motion * motionProfile.verticalCycles + motionProfile.phaseY;
  const distortionMotion =
    motion * motionProfile.distortionCycles + motionProfile.phaseDistortion;
  const wave = Math.sin(normalizedY * 7 + distortionMotion);
  const scaleX = 1 + motionProfile.stretchX * Math.sin(distortionMotion);
  const scaleY = 1.08 + motionProfile.stretchY * Math.cos(distortionMotion);
  const shear =
    normalizedY *
    motionProfile.shearAmplitude *
    Math.sin(distortionMotion * 2 + characterIndex);
  const distortionScale = structuralDistortionScale(glyph.character, point);
  const localX =
    normalizedX * 40 * scaleX +
    wave * motionProfile.waveAmplitude * distortionScale +
    shear * distortionScale;
  // Hershey paths use an upward Y axis; browser pixels use a downward Y axis.
  const localY =
    -normalizedY * 38 * scaleY +
    Math.sin(normalizedX * 6 + distortionMotion) * motionProfile.waveAmplitude * 0.55;
  const rotation =
    (Math.PI / 180) *
    motionProfile.rotationDegrees *
    Math.sin(distortionMotion + characterIndex * 0.7);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const floatX = horizontalDrift(motionProfile, frameProgress);
  const floatY =
    motionProfile.driftY * Math.sin(verticalMotion) +
    1.4 * Math.sin(verticalMotion * 2 + motionProfile.phaseX);
  const [jitterX, jitterY] = randomJitterAt(
    motionProfile.jitterKeyframes,
    frameProgress
  );

  return [
    baseX + localX * cosine - localY * sine + floatX + jitterX,
    config.animation.height / 2 + localX * sine + localY * cosine + floatY + jitterY
  ];
}

function drawTransformedGlyph(
  pixels: Uint8Array,
  width: number,
  height: number,
  glyph: Glyph,
  characterIndex: number,
  frameProgress: number,
  baseX: number,
  motionProfile: MotionProfile,
  color: number,
  revealMask: RevealMask
): void {
  glyph.paths.forEach((path) => {
    for (let pointIndex = 1; pointIndex < path.length; pointIndex += 1) {
      const previous = path[pointIndex - 1];
      const current = path[pointIndex];
      if (!previous || !current) continue;
      const from = transformPoint(
        previous,
        glyph,
        characterIndex,
        frameProgress,
        baseX,
        motionProfile
      );
      const to = transformPoint(
        current,
        glyph,
        characterIndex,
        frameProgress,
        baseX,
        motionProfile
      );
      drawLine(
        pixels,
        width,
        height,
        from,
        to,
        2.05,
        color,
        revealMask,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY
      );
    }
  });
}

function visibleLandmarkRisk(
  glyph: Glyph,
  characterIndex: number,
  frameProgress: number,
  baseX: number,
  motionProfile: MotionProfile,
  revealMask: RevealMask
): number {
  let risk = 0;
  for (const landmark of glyph.landmarks) {
    const transformed = transformPoint(
      landmark.point,
      glyph,
      characterIndex,
      frameProgress,
      baseX,
      motionProfile
    );
    if (isInsideRevealMask(transformed[0], transformed[1], revealMask)) {
      risk += landmark.weight;
    }
  }
  return risk;
}

function ambiguityAdjustedRevealMask(
  glyph: Glyph,
  characterIndex: number,
  frameProgress: number,
  baseX: number,
  motionProfile: MotionProfile,
  revealMask: RevealMask
): RevealMask {
  const visibleLandmarks = glyph.landmarks
    // Gap endpoints are required reading cues. Unlike junctions and corners,
    // do not steer the reveal away from them when their turn comes.
    .filter((landmark) => landmark.kind !== "gap" && landmark.weight >= 0.72)
    .map((landmark) => ({
      landmark,
      point: transformPoint(
        landmark.point,
        glyph,
        characterIndex,
        frameProgress,
        baseX,
        motionProfile
      )
    }))
    .filter(({ point }) => isInsideRevealMask(point[0], point[1], revealMask))
    .sort((left, right) => right.landmark.weight - left.landmark.weight);
  const highestRisk = visibleLandmarks[0];
  if (!highestRisk) return revealMask;

  const joinedStroke = highestRisk.landmark.weight >= 1.25;

  // Protect high-information junctions by narrowing the continuous window.
  // Moving its center here caused abrupt forward/backward jumps whenever a
  // landmark entered or left the mask.
  return {
    ...revealMask,
    width:
      revealMask.width *
      (glyph.character === "Y" && joinedStroke
        ? 0.96
        : joinedStroke
          ? 0.78
          : 0.88)
  };
}

export function createRevealSegments(
  glyphCount: number,
  frames: number,
  textStart: number,
  characterSpacing: number,
  random: () => number
): RevealSegment[] {
  const visitOrder = Array.from({ length: glyphCount }, (_value, index) => index);
  const visitCount = visitOrder.length;
  if (visitCount === 0) return [];

  // Give every character the same scan budget. Any remainder is distributed
  // cyclically from a random start, so no position is systematically favored.
  const baseDwellFrames = Math.floor(frames / visitCount);
  const dwellFrames = Array.from({ length: visitCount }, () => baseDwellFrames);
  const remainderStart = Math.floor(random() * visitCount);
  for (let extra = 0; extra < frames % visitCount; extra += 1) {
    const index = (remainderStart + extra) % visitCount;
    dwellFrames[index] = (dwellFrames[index] ?? baseDwellFrames) + 1;
  }

  const segments: RevealSegment[] = [];
  // Adjacent scans touch at their endpoints. There are no off-canvas lead-in
  // or lead-out frames, which prevents empty frames and protects the last glyph.
  const scanRadius = characterSpacing / 2;
  for (let visitIndex = 0; visitIndex < visitCount; visitIndex += 1) {
    const characterIndex = visitOrder[visitIndex] ?? 0;
    const characterX = textStart + characterIndex * characterSpacing;
    const scanStart = characterX - scanRadius;
    const scanEnd = characterX + scanRadius;
    segments.push({
      kind: "dwell",
      frames: dwellFrames[visitIndex] ?? baseDwellFrames,
      fromX: scanStart,
      toX: scanEnd,
      phase: random() * Math.PI * 2,
      backtrackAmplitude:
        random() < DWELL_BACKTRACK_PROBABILITY ? 2 + random() * 2 : 0,
      characterIndex
    });
  }
  return segments;
}

export function createConcurrentRevealTracks(
  glyphCount: number,
  textStart: number,
  characterSpacing: number,
  random: () => number
): ConcurrentRevealTrack[] {
  const scanRadius = characterSpacing * 0.4;
  return Array.from({ length: glyphCount }, (_value, characterIndex) => {
    const characterX = textStart + characterIndex * characterSpacing;
    return {
      scanLeft: characterX - scanRadius,
      scanRight: characterX + scanRadius,
      phase: random(),
      cycles: 2,
      wobbleAmplitude: 0.7 + random() * 0.9,
      wobbleCycles: 3 + Math.floor(random() * 4),
      wobblePhase: random() * Math.PI * 2,
      characterIndex
    };
  });
}

export function concurrentRevealCenter(
  frame: number,
  frames: number,
  track: ConcurrentRevealTrack
): number {
  const progress = frames <= 1 ? 0 : frame / (frames - 1);
  const cyclePosition = ((track.phase + progress * track.cycles) % 1 + 1) % 1;
  const triangularProgress =
    cyclePosition <= 0.5 ? cyclePosition * 2 : (1 - cyclePosition) * 2;
  const mainPosition =
    track.scanLeft + (track.scanRight - track.scanLeft) * triangularProgress;
  const wobble =
    track.wobbleAmplitude *
    Math.sin(triangularProgress * Math.PI) *
    Math.sin(progress * Math.PI * 2 * track.wobbleCycles + track.wobblePhase);
  return mainPosition + wobble;
}

export function minimumTrackableVisibleRatio(glyph: Glyph): number {
  if (glyph.character === "Y") return 0.3;
  const joinedStrokes = glyph.landmarks.filter(
    (landmark) => landmark.weight >= 1.25
  ).length;
  if (joinedStrokes >= 2) return 0.34;
  if (joinedStrokes === 1) return 0.24;
  return 0.18;
}

export function compositeCharacterWithinAreaLimit(
  target: Uint8Array,
  visibleCharacter: Uint8Array,
  fullCharacter: Uint8Array,
  width: number,
  revealCenter: number,
  maximumVisibleRatio = 0.4
): number {
  let fullPixelCount = 0;
  const visibleIndices: number[] = [];
  for (let index = 0; index < fullCharacter.length; index += 1) {
    if ((fullCharacter[index] ?? 0) !== 0) fullPixelCount += 1;
    if ((visibleCharacter[index] ?? 0) !== 0) visibleIndices.push(index);
  }

  const visiblePixelLimit = Math.floor(
    fullPixelCount * Math.min(
      0.37 / DIFFICULTY_MULTIPLIER,
      Math.max(0.065, maximumVisibleRatio)
    )
  );
  if (visibleIndices.length > visiblePixelLimit) {
    visibleIndices.sort((left, right) => {
      const leftDistance = Math.abs((left % width) + 0.5 - revealCenter);
      const rightDistance = Math.abs((right % width) + 0.5 - revealCenter);
      return leftDistance - rightDistance || left - right;
    });
    visibleIndices.length = visiblePixelLimit;
  }

  for (const index of visibleIndices) {
    target[index] = visibleCharacter[index] ?? 0;
  }
  return visibleIndices.length;
}

export function revealStateForFrame(
  frame: number,
  segments: RevealSegment[]
): { centerX: number; dwellCharacterIndex?: number } {
  let segmentStart = 0;
  for (const segment of segments) {
    const segmentEnd = segmentStart + segment.frames;
    if (frame < segmentEnd) {
      const localFrame = frame - segmentStart;
      const progress = segment.frames <= 1 ? 1 : localFrame / (segment.frames - 1);
      if (segment.kind === "dwell") {
        const tempoProgress = Math.min(
          1,
          Math.max(
            0,
            progress +
              (segment.tempoVariation ?? 0) *
                Math.sin(progress * Math.PI) *
                Math.sin(progress * Math.PI * 2 + segment.phase)
          )
        );
        const unevenMotion =
          segment.backtrackAmplitude *
          Math.sin(progress * Math.PI * 2 + segment.phase) *
          Math.sin(progress * Math.PI);
        const centerX =
          segment.fromX +
          (segment.toX - segment.fromX) * tempoProgress +
          unevenMotion;
        return {
          centerX,
          dwellCharacterIndex: segment.characterIndex
        };
      }
      const eased = progress * progress * (3 - 2 * progress);
      const unevenMotion =
        segment.backtrackAmplitude *
        Math.sin(progress * Math.PI * 2 + segment.phase) *
        Math.sin(progress * Math.PI);
      return {
        centerX: segment.fromX + (segment.toX - segment.fromX) * eased + unevenMotion
      };
    }
    segmentStart = segmentEnd;
  }
  return { centerX: segments.at(-1)?.toX ?? 0 };
}

export function createDistinctColorIndices(
  glyphCount: number,
  random: () => number
): number[] {
  const colorIndices = [2, 3, 4, 5, 6];
  for (let index = colorIndices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [colorIndices[index], colorIndices[swapIndex]] = [
      colorIndices[swapIndex]!,
      colorIndices[index]!
    ];
  }
  return colorIndices.slice(0, glyphCount);
}

function renderVerificationAnimationAttempt(
  answer: string,
  renderAttempt = 0
): Buffer {
  const { width, height, minFrames, maxFrames, delayMs } = config.animation;
  const seed = randomBytes(8);
  const random = createPrng(seed);
  const frames = minFrames + Math.floor(random() * (maxFrames - minFrames + 1));
  const glyphs = answer.split("").map(glyphFor);
  const cycleOffset = Math.trunc(CAPTCHA_DIFFICULTY_POINTS / 2);
  const motionCycles = [2, 3, 4, 5, 6, 7, 8].map(
    (cycles) => cycles + cycleOffset
  );
  if (CAPTCHA_DIFFICULTY_POINTS % 2 > 0) motionCycles.shift();
  if (CAPTCHA_DIFFICULTY_POINTS % 2 < 0) motionCycles.pop();
  const questionDistortion =
    (0.95 + random() * 0.35) * 0.83 * DIFFICULTY_MULTIPLIER;
  const colorIndices = createDistinctColorIndices(glyphs.length, random);
  const motionProfiles: MotionProfile[] = glyphs.map((_glyph, characterIndex) => {
    const jitterAmplitude = (1 + random() * 1.5) * questionDistortion;
    return {
      phaseX: random() * Math.PI * 2,
      phaseY: random() * Math.PI * 2,
      phaseDistortion: random() * Math.PI * 2,
      horizontalCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 5,
      verticalCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 6,
      distortionCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 4,
      driftX: (4.5 + random() * 4.5) * DIFFICULTY_MULTIPLIER,
      driftY: (3.5 + random() * 3.5) * DIFFICULTY_MULTIPLIER,
      stretchX: (0.15 + random() * 0.13) * questionDistortion,
      stretchY: (0.12 + random() * 0.13) * questionDistortion,
      waveAmplitude: (3.4 + random() * 2.6) * questionDistortion,
      shearAmplitude: (6.5 + random() * 6.5) * questionDistortion,
      rotationDegrees: (7 + random() * 10) * questionDistortion,
      jitterKeyframes: createRandomJitterKeyframes(
        18 + Math.floor(random() * 15),
        jitterAmplitude,
        random
      ),
      colorIndex: colorIndices[characterIndex] ?? 4
    };
  });
  const partialRevealWidth = (26 + random() * 3) / DIFFICULTY_MULTIPLIER;
  const maximumVisibleRatios = glyphs.map((glyph) => {
    const estimate = estimateGlyphVisibility(glyph.paths);
    return reduceGlyphVisibility(estimate.visibleRatio, random());
  });
  const revealShapeProfile: RevealShapeProfile = {
    phase: random() * Math.PI * 2,
    cycles: 2 + Math.floor(random() * 5),
    height: 94 + random() * 14,
    bend: 1.83 + random() * 4.27,
    pinch: 0.061 + random() * 0.171,
    edgeWaves: 4.88 + random() * 4.88
  };
  const interferenceLines = createInterferenceLineProfiles(
    6 + Math.floor(random() * 3),
    height,
    random,
    colorIndices
  );
  const textStart = 66;
  const characterSpacing = 62;
  const concurrentRevealTracks = createConcurrentRevealTracks(
    glyphs.length,
    textStart,
    characterSpacing,
    random
  );
  const gif = GIFEncoder({ initialCapacity: 192 * 1024 });
  const pixels = new Uint8Array(width * height);
  const visibleCharacter = new Uint8Array(width * height);
  const fullCharacter = new Uint8Array(width * height);
  let containsBlankFrame = false;
  let containsInactiveCharacter = false;

  for (let frame = 0; frame < frames; frame += 1) {
    pixels.fill(0);
    let frameVisiblePixels = 0;
    const progress = frame / Math.max(1, frames);
    for (let y = 0; y < height; y += 1) {
      const vignette = Math.abs(y - height / 2) / (height / 2);
      if (vignette > 0.86) pixels.fill(7, y * width, (y + 1) * width);
    }
    glyphs.forEach((glyph, characterIndex) => {
      visibleCharacter.fill(0);
      fullCharacter.fill(0);
      const baseX = textStart + characterIndex * characterSpacing;
      const motionProfile = motionProfiles[characterIndex];
      if (!motionProfile) return;
      const revealTrack = concurrentRevealTracks[characterIndex];
      if (!revealTrack) return;
      const revealCenter = concurrentRevealCenter(frame, frames, revealTrack);
      const characterPhase = revealShapeProfile.phase + characterIndex * 1.37;
      const revealMask: RevealMask = {
        ...revealShapeProfile,
        centerX: revealCenter,
        centerY:
          height / 2 +
          4 * Math.sin(
            progress * Math.PI * 2 * revealShapeProfile.cycles + characterPhase
          ),
        width: partialRevealWidth + 2.3,
        animatedPhase:
          characterPhase + progress * Math.PI * 2 * revealShapeProfile.cycles
      };
      const color = motionProfile.colorIndex;
      const characterRevealMask = ambiguityAdjustedRevealMask(
        glyph,
        characterIndex,
        progress,
        baseX,
        motionProfile,
        revealMask
      );
      const fullRevealMask: RevealMask = {
        phase: 0,
        cycles: 0,
        height: height * 2,
        bend: 0,
        pinch: 0,
        edgeWaves: 0,
        centerX: width / 2,
        centerY: height / 2,
        width: width * 2,
        animatedPhase: 0
      };
      drawTransformedGlyph(
        visibleCharacter,
        width,
        height,
        glyph,
        characterIndex,
        progress,
        baseX,
        motionProfile,
        color,
        characterRevealMask
      );
      drawTransformedGlyph(
        fullCharacter,
        width,
        height,
        glyph,
        characterIndex,
        progress,
        baseX,
        motionProfile,
        color,
        fullRevealMask
      );
      const landmarkRisk = visibleLandmarkRisk(
        glyph,
        characterIndex,
        progress,
        baseX,
        motionProfile,
        characterRevealMask
      );
      const targetVisibleRatio = Math.max(
        minimumTrackableVisibleRatio(glyph),
        (maximumVisibleRatios[characterIndex] ?? 0.2) *
          ambiguityMultiplierForLandmarkRisk(landmarkRisk)
      );
      let compositedPixels = compositeCharacterWithinAreaLimit(
        pixels,
        visibleCharacter,
        fullCharacter,
        width,
        characterRevealMask.centerX,
        targetVisibleRatio
      );
      if (compositedPixels === 0) {
        // A curved mask can miss a narrow terminal at the very edge of a scan.
        // Widen only this character's mask so all four remain active without
        // changing its scan position or exposing the complete glyph.
        visibleCharacter.fill(0);
        drawTransformedGlyph(
          visibleCharacter,
          width,
          height,
          glyph,
          characterIndex,
          progress,
          baseX,
          motionProfile,
          color,
          {
            ...revealMask,
            centerY: height / 2,
            width: revealMask.width * 1.8,
            height: height * 2,
            bend: 0,
            pinch: 0,
            edgeWaves: 0
          }
        );
        compositedPixels = compositeCharacterWithinAreaLimit(
          pixels,
          visibleCharacter,
          fullCharacter,
          width,
          revealMask.centerX,
          targetVisibleRatio
        );
      }
      if (compositedPixels === 0) containsInactiveCharacter = true;
      frameVisiblePixels += compositedPixels;
    });
    // Draw foreground curves after the glyphs, as Gravity does. Matching the
    // four character colors and stroke weight makes color thresholding unable
    // to discard them without also deleting real glyph structure.
    drawInterferenceLines(pixels, width, height, interferenceLines, progress);
    if (
      frameVisiblePixels === 0 &&
      !pixels.some((pixel) => pixel >= 2 && pixel <= 6)
    ) {
      containsBlankFrame = true;
    }

    gif.writeFrame(pixels, width, height, {
      palette: frame === 0 ? PALETTE : undefined,
      delay: delayMs,
      repeat: 0
    });
  }

  gif.finish();
  if (containsBlankFrame || containsInactiveCharacter) {
    if (renderAttempt < 2) {
      return renderVerificationAnimationAttempt(answer, renderAttempt + 1);
    }
    throw new Error("CAPTCHA rendering produced a blank frame after three attempts.");
  }
  return Buffer.from(gif.bytes());
}

export function renderVerificationAnimation(answer: string): Buffer {
  return renderVerificationAnimationAttempt(answer);
}
