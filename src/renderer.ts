import { randomBytes } from "node:crypto";
import gifenc from "gifenc";
import { stringToPaths, type Point } from "hershey";
import { config } from "./config.js";

const PALETTE = [
  [5, 7, 6],
  [31, 45, 31],
  [83, 115, 78],
  [140, 171, 135],
  [221, 255, 220],
  [127, 238, 100],
  [72, 83, 70],
  [24, 28, 25]
];

const { GIFEncoder } = gifenc;

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
}

interface RevealSegment {
  kind: "transition" | "dwell";
  frames: number;
  fromX: number;
  toX: number;
  phase: number;
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
  return (
    motionProfile.driftX * Math.sin(horizontalMotion) +
    2 * Math.sin(horizontalMotion * 2 + motionProfile.phaseY)
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
        const edge = Math.min(x - characterClipLeft, characterClipRight - x);
        const featheredColor = edge < 2 ? Math.min(color, 2) : color;
        const index = y * width + x;
        if ((pixels[index] ?? 0) < featheredColor) pixels[index] = featheredColor;
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
    1.8 * Math.sin(verticalMotion * 2 + motionProfile.phaseX);
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

function createRevealSegments(
  glyphCount: number,
  frames: number,
  textStart: number,
  characterSpacing: number,
  random: () => number
): RevealSegment[] {
  const dwellFrames = Array.from(
    { length: glyphCount },
    () => 12 + Math.floor(random() * 5)
  );
  const transitionCount = glyphCount + 1;
  const minimumTransitionFrames = 4;
  const transitionFrames = Array.from(
    { length: transitionCount },
    () => minimumTransitionFrames
  );
  const dwellTotal = dwellFrames.reduce((total, count) => total + count, 0);
  const extraTransitionFrames =
    frames - dwellTotal - transitionCount * minimumTransitionFrames;
  for (let extra = 0; extra < extraTransitionFrames; extra += 1) {
    const index = Math.floor(random() * transitionFrames.length);
    transitionFrames[index] = (transitionFrames[index] ?? 0) + 1;
  }

  const segments: RevealSegment[] = [];
  let currentX = textStart - 40;
  for (let characterIndex = 0; characterIndex < glyphCount; characterIndex += 1) {
    const characterX = textStart + characterIndex * characterSpacing;
    segments.push({
      kind: "transition",
      frames: transitionFrames[characterIndex] ?? minimumTransitionFrames,
      fromX: currentX,
      toX: characterX,
      phase: random() * Math.PI * 2
    });
    segments.push({
      kind: "dwell",
      frames: dwellFrames[characterIndex] ?? 12,
      fromX: characterX,
      toX: characterX,
      phase: random() * Math.PI * 2,
      characterIndex
    });
    currentX = characterX;
  }
  segments.push({
    kind: "transition",
    frames: transitionFrames[glyphCount] ?? minimumTransitionFrames,
    fromX: currentX,
    toX: textStart + (glyphCount - 1) * characterSpacing + 40,
    phase: random() * Math.PI * 2
  });
  return segments;
}

function revealStateForFrame(
  frame: number,
  segments: RevealSegment[]
): { centerX: number; dwellCharacterIndex?: number; fullRevealCharacterIndex?: number } {
  let segmentStart = 0;
  for (const segment of segments) {
    const segmentEnd = segmentStart + segment.frames;
    if (frame < segmentEnd) {
      const localFrame = frame - segmentStart;
      const progress = (localFrame + 0.5) / segment.frames;
      if (segment.kind === "dwell") {
        const centerX = segment.fromX + 5 * Math.sin(progress * Math.PI * 2 + segment.phase);
        const fullRevealFrame = Math.floor(segment.frames * 0.58);
        return {
          centerX,
          dwellCharacterIndex: segment.characterIndex,
          fullRevealCharacterIndex:
            localFrame === fullRevealFrame ? segment.characterIndex : undefined
        };
      }
      const eased = progress * progress * (3 - 2 * progress);
      const unevenMotion =
        7 * Math.sin(progress * Math.PI * 2 + segment.phase) * Math.sin(progress * Math.PI);
      return {
        centerX: segment.fromX + (segment.toX - segment.fromX) * eased + unevenMotion
      };
    }
    segmentStart = segmentEnd;
  }
  return { centerX: segments.at(-1)?.toX ?? 0 };
}

export function renderVerificationAnimation(answer: string): Buffer {
  const { width, height, frames, delayMs } = config.animation;
  const seed = randomBytes(8);
  const random = createPrng(seed);
  const glyphs = answer.split("").map(glyphFor);
  const motionCycles = [2, 3, 4, 5, 6, 7, 8];
  const questionDistortion = 0.82 + random() * 0.34;
  const motionProfiles: MotionProfile[] = glyphs.map(() => ({
    phaseX: random() * Math.PI * 2,
    phaseY: random() * Math.PI * 2,
    phaseDistortion: random() * Math.PI * 2,
    horizontalCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 4,
    verticalCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 5,
    distortionCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 3,
    driftX: 5 + random() * 6,
    driftY: 4 + random() * 5,
    stretchX: (0.13 + random() * 0.12) * questionDistortion,
    stretchY: (0.1 + random() * 0.12) * questionDistortion,
    waveAmplitude: (2.8 + random() * 2.4) * questionDistortion,
    shearAmplitude: (5 + random() * 6) * questionDistortion,
    rotationDegrees: (6 + random() * 8) * questionDistortion,
    jitterAmplitude: (0.5 + random() * 1.1) * questionDistortion,
    jitterCyclesX: 18 + Math.floor(random() * 15),
    jitterCyclesY: 18 + Math.floor(random() * 15),
    jitterPhase: random() * Math.PI * 2
  }));
  const partialRevealWidth = 30 + random() * 4;
  const protectedCharacterCount = Math.min(
    glyphs.length,
    2 + Math.floor(random() * 3)
  );
  const shuffledCharacterIndices = glyphs.map((_glyph, index) => index);
  for (let index = shuffledCharacterIndices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffledCharacterIndices[index], shuffledCharacterIndices[swapIndex]] = [
      shuffledCharacterIndices[swapIndex] ?? index,
      shuffledCharacterIndices[index] ?? swapIndex
    ];
  }
  const neverFullCharacterIndices = new Set(
    shuffledCharacterIndices.slice(0, protectedCharacterCount)
  );
  const protectedSlicePhases = glyphs.map(() => random() * Math.PI * 2);
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

  for (let frame = 0; frame < frames; frame += 1) {
    const pixels = new Uint8Array(width * height);
    const progress = frame / Math.max(1, frames);
    const revealState = revealStateForFrame(frame, revealSegments);
    let revealCenter = revealState.centerX;
    if (revealState.dwellCharacterIndex !== undefined) {
      const dwellMotionProfile = motionProfiles[revealState.dwellCharacterIndex];
      if (dwellMotionProfile) {
        revealCenter += horizontalDrift(dwellMotionProfile, progress);
      }
    }
    const briefFullReveal =
      revealState.fullRevealCharacterIndex !== undefined &&
      !neverFullCharacterIndices.has(revealState.fullRevealCharacterIndex)
        ? 48
        : 0;
    const widthPulse = partialRevealWidth + briefFullReveal;
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
      if (vignette > 0.86) pixels.fill(7, y * width, (y + 1) * width);
    }

    glyphs.forEach((glyph, characterIndex) => {
      const baseX = textStart + characterIndex * characterSpacing;
      const motionProfile = motionProfiles[characterIndex];
      if (!motionProfile) return;
      let characterRevealLeft = Number.NEGATIVE_INFINITY;
      let characterRevealRight = Number.POSITIVE_INFINITY;
      if (neverFullCharacterIndices.has(characterIndex)) {
        // This character is restricted to a narrow moving slice for every frame.
        const protectedDrift = horizontalDrift(motionProfile, progress);
        const protectedSlicePhase = protectedSlicePhases[characterIndex] ?? 0;
        const sliceCenter =
          baseX + protectedDrift + 14 * Math.sin(progress * Math.PI * 6 + protectedSlicePhase);
        characterRevealLeft = Math.max(characterRevealLeft, sliceCenter - 12);
        characterRevealRight = Math.min(characterRevealRight, sliceCenter + 12);
      }
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
          drawLine(
            pixels,
            width,
            height,
            from,
            to,
            2.05,
            characterIndex % 2 === 0 ? 4 : 5,
            revealMask,
            characterRevealLeft,
            characterRevealRight
          );
        }
      });
    });

    gif.writeFrame(pixels, width, height, {
      palette: frame === 0 ? PALETTE : undefined,
      delay: delayMs,
      repeat: 0
    });
  }

  gif.finish();
  return Buffer.from(gif.bytes());
}
