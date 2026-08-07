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

function drawDisc(
  pixels: Uint8Array,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radius: number,
  color: number,
  revealLeft: number,
  revealRight: number
): void {
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (x < revealLeft || x > revealRight) continue;
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      if (dx * dx + dy * dy <= radiusSquared) {
        const edge = Math.min(x - revealLeft, revealRight - x);
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
  revealLeft: number,
  revealRight: number
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
      revealLeft,
      revealRight
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
  const horizontalMotion = motion * motionProfile.horizontalCycles + motionProfile.phaseX;
  const verticalMotion = motion * motionProfile.verticalCycles + motionProfile.phaseY;
  const distortionMotion =
    motion * motionProfile.distortionCycles + motionProfile.phaseDistortion;
  const wave = Math.sin(normalizedY * 7 + distortionMotion);
  const scaleX = 1 + 0.24 * Math.sin(distortionMotion);
  const scaleY = 1.08 + 0.2 * Math.cos(distortionMotion);
  const shear = normalizedY * 11 * Math.sin(distortionMotion * 2 + characterIndex);
  const localX = normalizedX * 40 * scaleX + wave * 5.5 + shear;
  // Hershey paths use an upward Y axis; browser pixels use a downward Y axis.
  const localY =
    -normalizedY * 38 * scaleY +
    Math.sin(normalizedX * 6 + distortionMotion) * 3;
  const rotation =
    (Math.PI / 180) * 14 * Math.sin(distortionMotion + characterIndex * 0.7);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const floatX =
    motionProfile.driftX * Math.sin(horizontalMotion) +
    2 * Math.sin(horizontalMotion * 2 + motionProfile.phaseY);
  const floatY =
    motionProfile.driftY * Math.sin(verticalMotion) +
    1.8 * Math.sin(verticalMotion * 2 + motionProfile.phaseX);

  return [
    baseX + localX * cosine - localY * sine + floatX,
    config.animation.height / 2 + localX * sine + localY * cosine + floatY
  ];
}

function easedRevealProgress(
  progress: number,
  phaseA: number,
  phaseB: number,
  pullbackAt: number,
  pullbackSize: number
): number {
  const unevenSpeed =
    0.055 * Math.sin(progress * Math.PI * 4 + phaseA) +
    0.028 * Math.sin(progress * Math.PI * 10 + phaseB);
  const distance = Math.abs(progress - pullbackAt);
  const pullbackWindow = 0.085;
  const pullback = distance < pullbackWindow
    ? pullbackSize * Math.sin((1 - distance / pullbackWindow) * Math.PI)
    : 0;
  return Math.max(0, Math.min(1, progress + unevenSpeed - pullback));
}

export function renderVerificationAnimation(answer: string): Buffer {
  const { width, height, frames, delayMs } = config.animation;
  const seed = randomBytes(8);
  const random = createPrng(seed);
  const glyphs = answer.split("").map(glyphFor);
  const motionCycles = [2, 3, 4, 5, 6, 7, 8];
  const motionProfiles: MotionProfile[] = glyphs.map(() => ({
    phaseX: random() * Math.PI * 2,
    phaseY: random() * Math.PI * 2,
    phaseDistortion: random() * Math.PI * 2,
    horizontalCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 4,
    verticalCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 5,
    distortionCycles: motionCycles[Math.floor(random() * motionCycles.length)] ?? 3,
    driftX: 5 + random() * 6,
    driftY: 4 + random() * 5
  }));
  const revealPhaseA = random() * Math.PI * 2;
  const revealPhaseB = random() * Math.PI * 2;
  const pullbackAt = 0.43 + random() * 0.24;
  const pullbackSize = 0.055 + random() * 0.045;
  const partialRevealWidth = 32 + random() * 8;
  const neverFullCharacterIndex = Math.floor(random() * glyphs.length);
  const protectedSlicePhase = random() * Math.PI * 2;
  const textStart = 66;
  const characterSpacing = 62;
  const textEnd = textStart + characterSpacing * (glyphs.length - 1);
  const gif = GIFEncoder({ initialCapacity: 192 * 1024 });

  for (let frame = 0; frame < frames; frame += 1) {
    const pixels = new Uint8Array(width * height);
    const progress = frame / Math.max(1, frames);
    const revealProgress = easedRevealProgress(
      progress,
      revealPhaseA,
      revealPhaseB,
      pullbackAt,
      pullbackSize
    );
    const revealCenter = textStart - 40 + revealProgress * (textEnd - textStart + 80);
    const nearestCharacterDistance = glyphs.reduce((nearest, _glyph, index) => {
      if (index === neverFullCharacterIndex) return nearest;
      const characterCenter = textStart + index * characterSpacing;
      return Math.min(nearest, Math.abs(revealCenter - characterCenter));
    }, Number.POSITIVE_INFINITY);
    const briefFullReveal =
      40 * Math.exp(-(nearestCharacterDistance ** 2) / (2 * 2 ** 2));
    const widthPulse = partialRevealWidth + briefFullReveal;
    const revealLeft = revealCenter - widthPulse / 2;
    const revealRight = revealCenter + widthPulse / 2;

    for (let y = 0; y < height; y += 1) {
      const vignette = Math.abs(y - height / 2) / (height / 2);
      if (vignette > 0.86) pixels.fill(7, y * width, (y + 1) * width);
    }

    glyphs.forEach((glyph, characterIndex) => {
      const baseX = textStart + characterIndex * characterSpacing;
      const motionProfile = motionProfiles[characterIndex];
      if (!motionProfile) return;
      let characterRevealLeft = revealLeft;
      let characterRevealRight = revealRight;
      if (characterIndex === neverFullCharacterIndex) {
        // This character is restricted to a narrow moving slice for every frame.
        const sliceCenter =
          baseX + 7 * Math.sin(progress * Math.PI * 6 + protectedSlicePhase);
        characterRevealLeft = Math.max(characterRevealLeft, sliceCenter - 9);
        characterRevealRight = Math.min(characterRevealRight, sliceCenter + 9);
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
