import { randomBytes } from "node:crypto";
import gifenc from "gifenc";
import { stringToPaths, type Point } from "hershey";
import { config } from "./config.js";

const COLOR_STEPS = 4;
const COLOR_ANCHORS = [
  [121, 204, 255],
  [173, 140, 255],
  [137, 243, 110],
  [255, 190, 100]
];

function interpolateColor(from: number[], to: number[], progress: number): number[] {
  return from.map((channel, index) =>
    Math.round(channel + ((to[index] ?? channel) - channel) * progress)
  );
}

const TRACK_COLORS = COLOR_ANCHORS.flatMap((anchor, anchorIndex) => {
  const next = COLOR_ANCHORS[(anchorIndex + 1) % COLOR_ANCHORS.length] ?? anchor;
  return Array.from({ length: COLOR_STEPS }, (_value, step) =>
    interpolateColor(anchor, next, step / COLOR_STEPS)
  );
});

const FIRST_TRACK_COLOR = 2;
const VIGNETTE_COLOR = FIRST_TRACK_COLOR + TRACK_COLORS.length;
const PALETTE = [
  [5, 7, 6],
  [48, 62, 51],
  ...TRACK_COLORS,
  [24, 28, 25]
];

const GIFEncoder =
  typeof gifenc === "function" ? gifenc : gifenc.GIFEncoder;

interface Glyph {
  paths: Point[][];
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
  jitterAmplitude: number;
  jitterCyclesX: number;
  jitterCyclesY: number;
  jitterPhase: number;
  colorPhase: number;
  colorCycles: number;
  contourPhase: number;
  decoyPhase: number;
  proximityOffset: number;
  proximityPhase: number;
}

export interface RevealSegment {
  kind: "transition" | "dwell";
  frames: number;
  fromX: number;
  toX: number;
  phase: number;
  backtrackAmplitude: number;
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

export interface RenderOptions {
  seedBytes?: Uint8Array;
  collectFrames?: boolean;
}

export interface RenderedVerification {
  animation: Buffer;
  parameterClass: string;
  frames?: Uint8Array[];
  palette: number[][];
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

function glyphFor(character: string): Glyph {
  const result = stringToPaths(character);
  return {
    paths: result.paths,
    minX: result.bounds.minX,
    maxX: result.bounds.maxX,
    minY: result.bounds.minY,
    maxY: result.bounds.maxY
  };
}

function horizontalDrift(
  motionProfile: MotionProfile,
  frameProgress: number
): number {
  const motion = frameProgress * Math.PI * 2;
  const horizontalMotion =
    motion * motionProfile.horizontalCycles + motionProfile.phaseX;
  const proximityPulse = Math.max(
    0,
    Math.sin(motion + motionProfile.proximityPhase)
  );
  return (
    motionProfile.driftX * Math.sin(horizontalMotion) +
    2.6 * Math.sin(horizontalMotion * 2 + motionProfile.phaseY) +
    motionProfile.proximityOffset * proximityPulse * proximityPulse
  );
}

function colorIndexForFrame(
  motionProfile: MotionProfile,
  frameProgress: number,
  localOffset = 0
): number {
  const cycle =
    (motionProfile.colorPhase + frameProgress * motionProfile.colorCycles + localOffset) % 1;
  return FIRST_TRACK_COLOR + Math.floor(cycle * TRACK_COLORS.length);
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
  const localX =
    normalizedX * 40 * scaleX + wave * motionProfile.waveAmplitude + shear;
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
    2.4 * Math.sin(verticalMotion * 2 + motionProfile.phaseX);
  const jitterX =
    motionProfile.jitterAmplitude *
    Math.sin(motion * motionProfile.jitterCyclesX + motionProfile.jitterPhase);
  const jitterY =
    motionProfile.jitterAmplitude *
    Math.cos(motion * motionProfile.jitterCyclesY + motionProfile.jitterPhase * 1.3);

  return [
    baseX + localX * cosine - localY * sine + floatX + jitterX,
    config.animation.height / 2 + localX * sine + localY * cosine + floatY + jitterY
  ];
}

function glyphPointFromNormalized(glyph: Glyph, x: number, y: number): Point {
  const glyphWidth = Math.max(1, glyph.maxX - glyph.minX);
  const glyphHeight = Math.max(1, glyph.maxY - glyph.minY);
  return [
    (glyph.minX + glyph.maxX) / 2 + x * glyphWidth,
    (glyph.minY + glyph.maxY) / 2 + y * glyphHeight
  ];
}

function decoyStrokeFor(
  character: string,
  glyph: Glyph,
  frameProgress: number,
  motionProfile: MotionProfile
): [Point, Point] {
  let from: Point = [-0.34, -0.28];
  let to: Point = [-0.08, -0.28];
  if ("B836".includes(character)) {
    from = [-0.08, -0.02];
    to = [0.3, 0.02];
  } else if ("6G".includes(character)) {
    from = [0.02, 0.08];
    to = [0.34, 0.08];
  } else if ("KX".includes(character)) {
    from = [-0.18, -0.3];
    to = [0.24, 0.28];
  } else if ("MN".includes(character)) {
    from = [-0.24, 0.28];
    to = [0.08, -0.28];
  } else if ("WVY".includes(character)) {
    from = [-0.2, -0.02];
    to = [0.02, 0.3];
  } else if ("PFRD".includes(character)) {
    from = [0.02, 0.02];
    to = [0.28, 0.3];
  }
  const motion = frameProgress * Math.PI * 2;
  const shiftX = 0.08 * Math.sin(motion * 1.3 + motionProfile.decoyPhase);
  const shiftY = 0.06 * Math.cos(motion * 1.1 + motionProfile.decoyPhase);
  return [
    glyphPointFromNormalized(glyph, from[0] + shiftX, from[1] + shiftY),
    glyphPointFromNormalized(glyph, to[0] + shiftX, to[1] + shiftY)
  ];
}

export function createRevealSegments(
  glyphCount: number,
  frames: number,
  textStart: number,
  characterSpacing: number,
  random: () => number
): RevealSegment[] {
  const initialOrder = Array.from({ length: glyphCount }, (_value, index) => index);
  const revisitOrder = [...initialOrder];
  for (let index = revisitOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [revisitOrder[index], revisitOrder[swapIndex]] = [
      revisitOrder[swapIndex]!,
      revisitOrder[index]!
    ];
  }
  const visitOrder = [...initialOrder, ...revisitOrder];
  const visitCount = visitOrder.length;
  const minimumDwellFrames = 12;
  const dwellFrames = Array.from(
    { length: visitCount },
    () => minimumDwellFrames
  );
  const transitionCount = visitCount + 1;
  const minimumTransitionFrames = 3;
  const transitionFrames = Array.from(
    { length: transitionCount },
    () => minimumTransitionFrames
  );
  const dwellWeights = dwellFrames.map(() => 0.85 + random() * 0.3);
  const transitionWeights = transitionFrames.map(() => 0.08 + random() * 0.06);
  const weights = [...dwellWeights, ...transitionWeights];
  const maximumDwellFrames = 18;
  const minimumFrames =
    visitCount * minimumDwellFrames + transitionCount * minimumTransitionFrames;
  const extraFrames = Math.max(0, frames - minimumFrames);
  for (let extra = 0; extra < extraFrames; extra += 1) {
    const eligibleWeights = weights.map((weight, index) =>
      index < visitCount && (dwellFrames[index] ?? 0) >= maximumDwellFrames
        ? 0
        : weight
    );
    const totalWeight = eligibleWeights.reduce((total, weight) => total + weight, 0);
    let selection = random() * totalWeight;
    let selectedIndex = eligibleWeights.length - 1;
    for (let index = 0; index < eligibleWeights.length; index += 1) {
      selection -= eligibleWeights[index] ?? 0;
      if (selection <= 0) {
        selectedIndex = index;
        break;
      }
    }
    if (selectedIndex < visitCount) {
      dwellFrames[selectedIndex] =
        (dwellFrames[selectedIndex] ?? minimumDwellFrames) + 1;
    } else {
      const transitionIndex = selectedIndex - visitCount;
      transitionFrames[transitionIndex] =
        (transitionFrames[transitionIndex] ?? minimumTransitionFrames) + 1;
    }
  }

  const segments: RevealSegment[] = [];
  const scanRadius = 50;
  let currentX = textStart - scanRadius - 18;
  for (let visitIndex = 0; visitIndex < visitCount; visitIndex += 1) {
    const characterIndex = visitOrder[visitIndex] ?? 0;
    const characterX = textStart + characterIndex * characterSpacing;
    const scanStart = characterX - scanRadius;
    const scanEnd = characterX + scanRadius;
    segments.push({
      kind: "transition",
      frames: transitionFrames[visitIndex] ?? minimumTransitionFrames,
      fromX: currentX,
      toX: scanStart,
      phase: random() * Math.PI * 2,
      backtrackAmplitude: random() < 0.02 ? 3 + random() * 3 : 0
    });
    segments.push({
      kind: "dwell",
      frames: dwellFrames[visitIndex] ?? minimumDwellFrames,
      fromX: scanStart,
      toX: scanEnd,
      phase: random() * Math.PI * 2,
      backtrackAmplitude: random() < 0.05 ? 4 + random() * 3 : 0,
      characterIndex
    });
    currentX = scanEnd;
  }
  segments.push({
    kind: "transition",
    frames: transitionFrames[visitCount] ?? minimumTransitionFrames,
    fromX: currentX,
    toX: textStart + (glyphCount - 1) * characterSpacing + scanRadius + 18,
    phase: random() * Math.PI * 2,
    backtrackAmplitude: random() < 0.02 ? 3 + random() * 3 : 0
  });
  return segments;
}

export function compositeCharacterWithinAreaLimit(
  target: Uint8Array,
  visibleCharacter: Uint8Array,
  fullCharacter: Uint8Array,
  width: number,
  revealCenter: number,
  maximumVisibleRatio = 0.4
): void {
  let fullPixelCount = 0;
  const visibleIndices: number[] = [];
  for (let index = 0; index < fullCharacter.length; index += 1) {
    if ((fullCharacter[index] ?? 0) !== 0) fullPixelCount += 1;
    if ((visibleCharacter[index] ?? 0) !== 0) visibleIndices.push(index);
  }

  const visiblePixelLimit = Math.floor(
    fullPixelCount * Math.min(0.72, Math.max(0.3, maximumVisibleRatio))
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
}

export function revealStateForFrame(
  frame: number,
  segments: RevealSegment[]
): { centerX: number; dwellCharacterIndex?: number; clarity?: number } {
  let segmentStart = 0;
  for (const segment of segments) {
    const segmentEnd = segmentStart + segment.frames;
    if (frame < segmentEnd) {
      const localFrame = frame - segmentStart;
      const progress = (localFrame + 0.5) / segment.frames;
      if (segment.kind === "dwell") {
        const eased = progress * progress * (3 - 2 * progress);
        const unevenMotion =
          segment.backtrackAmplitude *
          Math.sin(progress * Math.PI * 2 + segment.phase) *
          Math.sin(progress * Math.PI);
        const centerX =
          segment.fromX + (segment.toX - segment.fromX) * eased + unevenMotion;
        return {
          centerX,
          dwellCharacterIndex: segment.characterIndex,
          clarity: Math.max(0, 1 - Math.abs(progress - 0.5) / 0.2)
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

export function renderVerification(
  answer: string,
  options: RenderOptions = {}
): RenderedVerification {
  const { width, height, minFrames, maxFrames, delayMs } = config.animation;
  const seed = options.seedBytes ?? randomBytes(8);
  const random = createPrng(seed);
  const frames = minFrames + Math.floor(random() * (maxFrames - minFrames + 1));
  const glyphs = answer.split("").map(glyphFor);
  const motionCycles = [2, 3, 4, 5, 6, 7, 8];
  const questionDistortion = (0.95 + random() * 0.35) * 0.68;
  const proximityPair = random() < 0.35
    ? Math.floor(random() * Math.max(1, glyphs.length - 1))
    : -1;
  const proximityPhase = random() * Math.PI * 2;
  const motionProfiles: MotionProfile[] = glyphs.map((_glyph, characterIndex) => ({
    phaseX: random() * Math.PI * 2,
    phaseY: random() * Math.PI * 2,
    phaseDistortion: random() * Math.PI * 2,
    horizontalCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 4,
    verticalCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 5,
    distortionCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 3,
    driftX: 8 + random() * 8,
    driftY: 6.5 + random() * 7,
    stretchX: (0.15 + random() * 0.13) * questionDistortion,
    stretchY: (0.12 + random() * 0.13) * questionDistortion,
    waveAmplitude: (3.4 + random() * 2.6) * questionDistortion,
    shearAmplitude: (6.5 + random() * 6.5) * questionDistortion,
    rotationDegrees: (7 + random() * 10) * questionDistortion,
    jitterAmplitude: (1 + random() * 1.5) * questionDistortion,
    jitterCyclesX: 18 + Math.floor(random() * 15),
    jitterCyclesY: 18 + Math.floor(random() * 15),
    jitterPhase: random() * Math.PI * 2,
    colorPhase: (random() * 0.12 + characterIndex / Math.max(1, glyphs.length)) % 1,
    colorCycles: 0.65 + random() * 0.25,
    contourPhase: random() * Math.PI * 2,
    decoyPhase: random() * Math.PI * 2,
    proximityOffset:
      characterIndex === proximityPair
        ? 18
        : characterIndex === proximityPair + 1
          ? -18
          : 0,
    proximityPhase
  }));
  const partialRevealWidth = 29 + random() * 6;
  const maximumVisibleRatio = 0.36 + random() * 0.06;
  const revealShapeProfile: RevealShapeProfile = {
    phase: random() * Math.PI * 2,
    cycles: 2 + Math.floor(random() * 5),
    height: 94 + random() * 14,
    bend: 1.5 + random() * 3.5,
    pinch: 0.05 + random() * 0.14,
    edgeWaves: 4 + random() * 4
  };
  const textStart = 66;
  const characterSpacing = 62;
  const revealSegments = createRevealSegments(
    glyphs.length,
    frames,
    textStart,
    characterSpacing,
    random
  );
  const gif = GIFEncoder({ initialCapacity: 192 * 1024 });
  const pixels = new Uint8Array(width * height);
  const visibleCharacter = new Uint8Array(width * height);
  const fullCharacter = new Uint8Array(width * height);
  const capturedFrames = options.collectFrames ? [] as Uint8Array[] : undefined;

  for (let frame = 0; frame < frames; frame += 1) {
    pixels.fill(0);
    const progress = frame / Math.max(1, frames - 1);
    const revealState = revealStateForFrame(frame, revealSegments);
    const clarity = revealState.clarity ?? 0;
    let revealCenter = revealState.centerX;
    if (revealState.dwellCharacterIndex !== undefined) {
      const dwellMotionProfile = motionProfiles[revealState.dwellCharacterIndex];
      if (dwellMotionProfile) {
        revealCenter += horizontalDrift(dwellMotionProfile, progress);
      }
    }
    const widthPulse =
      partialRevealWidth +
      (revealState.dwellCharacterIndex !== undefined ? 3 : 0) +
      clarity * 25;
    const revealMask: RevealMask = {
      ...revealShapeProfile,
      centerX: revealCenter,
      centerY:
        height / 2 +
        4 * Math.sin(progress * Math.PI * 2 * revealShapeProfile.cycles + revealShapeProfile.phase),
      width: widthPulse,
      animatedPhase:
        revealShapeProfile.phase + progress * Math.PI * 2 * revealShapeProfile.cycles
    };

    for (let y = 0; y < height; y += 1) {
      const vignette = Math.abs(y - height / 2) / (height / 2);
      if (vignette > 0.86) {
        pixels.fill(VIGNETTE_COLOR, y * width, (y + 1) * width);
      }
    }
    for (let characterIndex = 0; characterIndex < glyphs.length; characterIndex += 1) {
      const anchorX = Math.round(textStart + characterIndex * characterSpacing);
      for (let y = height - 9; y <= height - 7; y += 1) {
        for (let x = anchorX - 1; x <= anchorX + 1; x += 1) {
          pixels[y * width + x] = 1;
        }
      }
    }

    glyphs.forEach((glyph, characterIndex) => {
      visibleCharacter.fill(0);
      fullCharacter.fill(0);
      const baseX = textStart + characterIndex * characterSpacing;
      const motionProfile = motionProfiles[characterIndex];
      if (!motionProfile) return;
      const characterRevealLeft = Number.NEGATIVE_INFINITY;
      const characterRevealRight = Number.POSITIVE_INFINITY;
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
      const trackingMask: RevealMask = {
        phase: motionProfile.phaseX,
        cycles: 1,
        height: 84,
        bend: 1.2,
        pinch: 0.08,
        edgeWaves: 4,
        centerX: baseX + horizontalDrift(motionProfile, progress),
        centerY: height / 2,
        width: 10 + 2 * Math.sin(progress * Math.PI * 2 + motionProfile.phaseY),
        animatedPhase: progress * Math.PI * 2 + motionProfile.phaseX
      };
      glyph.paths.forEach((path) => {
        for (let pointIndex = 1; pointIndex < path.length; pointIndex += 1) {
          const previous = path[pointIndex - 1];
          const current = path[pointIndex];
          if (!previous || !current) continue;
          const from = transformPoint(
            previous,
            glyph,
            characterIndex,
            progress,
            baseX,
            motionProfile
          );
          const to = transformPoint(
            current,
            glyph,
            characterIndex,
            progress,
            baseX,
            motionProfile
          );
          const contourOffsetX =
            1.25 * Math.sin(progress * Math.PI * 4 + motionProfile.contourPhase + pointIndex);
          const contourOffsetY =
            1.05 * Math.cos(progress * Math.PI * 3 + motionProfile.contourPhase + pointIndex);
          const color = colorIndexForFrame(
            motionProfile,
            progress,
            (pointIndex % 3) * 0.012
          );
          const contourColor = colorIndexForFrame(motionProfile, progress, 0.08);
          drawLine(
            visibleCharacter,
            width,
            height,
            [from[0] + contourOffsetX, from[1] + contourOffsetY],
            [to[0] + contourOffsetX, to[1] + contourOffsetY],
            2.55,
            contourColor,
            revealMask,
            characterRevealLeft,
            characterRevealRight
          );
          drawLine(
            visibleCharacter,
            width,
            height,
            from,
            to,
            1.55,
            color,
            trackingMask,
            characterRevealLeft,
            characterRevealRight
          );
          drawLine(
            visibleCharacter,
            width,
            height,
            from,
            to,
            2.05,
            color,
            revealMask,
            characterRevealLeft,
            characterRevealRight
          );
          drawLine(
            fullCharacter,
            width,
            height,
            from,
            to,
            2.05,
            color,
            fullRevealMask,
            Number.NEGATIVE_INFINITY,
            Number.POSITIVE_INFINITY
          );
        }
      });
      const [decoyFromPoint, decoyToPoint] = decoyStrokeFor(
        answer[characterIndex] ?? "",
        glyph,
        progress,
        motionProfile
      );
      const decoyFrom = transformPoint(
        decoyFromPoint,
        glyph,
        characterIndex,
        progress,
        baseX,
        motionProfile
      );
      const decoyTo = transformPoint(
        decoyToPoint,
        glyph,
        characterIndex,
        progress,
        baseX,
        motionProfile
      );
      drawLine(
        visibleCharacter,
        width,
        height,
        decoyFrom,
        decoyTo,
        1.15,
        colorIndexForFrame(motionProfile, progress, 0.16),
        revealMask,
        characterRevealLeft,
        characterRevealRight
      );
      compositeCharacterWithinAreaLimit(
        pixels,
        visibleCharacter,
        fullCharacter,
        width,
        revealCenter,
        Math.min(0.72, maximumVisibleRatio + clarity * 0.3)
      );
    });

    gif.writeFrame(pixels, width, height, {
      palette: frame === 0 ? PALETTE : undefined,
      delay: delayMs,
      repeat: 0
    });
    capturedFrames?.push(pixels.slice());
  }

  gif.finish();
  const distortionClass = questionDistortion < 0.72
    ? "soft"
    : questionDistortion < 0.82
      ? "balanced"
      : "firm";
  const revealClass = maximumVisibleRatio < 0.39 ? "compact" : "wide";
  const pathClass = proximityPair >= 0 ? "approach" : "separate";
  return {
    animation: Buffer.from(gif.bytes()),
    parameterClass: `motion-v2:${distortionClass}:${revealClass}:${pathClass}`,
    frames: capturedFrames,
    palette: PALETTE
  };
}

export function renderVerificationAnimation(answer: string): Buffer {
  return renderVerification(answer).animation;
}
