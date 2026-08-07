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
  randomPhase: number
): Point {
  const glyphWidth = Math.max(1, glyph.maxX - glyph.minX);
  const glyphHeight = Math.max(1, glyph.maxY - glyph.minY);
  const normalizedX = (point[0] - (glyph.minX + glyph.maxX) / 2) / glyphWidth;
  const normalizedY = (point[1] - (glyph.minY + glyph.maxY) / 2) / glyphHeight;
  const motion = frameProgress * Math.PI * 2;
  const wave = Math.sin(
    normalizedY * 5.5 + motion * 2 + randomPhase
  );
  const scaleX = 1 + 0.1 * Math.sin(motion * 2 + randomPhase);
  const scaleY = 1.14 + 0.08 * Math.cos(motion * 2 + randomPhase * 0.8);
  const localX = normalizedX * 40 * scaleX + wave * 2.4;
  // Hershey paths use an upward Y axis; browser pixels use a downward Y axis.
  const localY = -normalizedY * 38 * scaleY;
  const rotation =
    (Math.PI / 180) * 6 * Math.sin(motion + randomPhase + characterIndex * 0.7);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const floatX =
    4.5 * Math.sin(motion + randomPhase * 1.3) +
    1.5 * Math.sin(motion * 2 + randomPhase);
  const floatY =
    4 * Math.sin(motion + randomPhase + characterIndex) +
    1.2 * Math.sin(motion * 3 + randomPhase * 0.6);

  return [
    baseX + localX * cosine - localY * sine + floatX,
    config.animation.height / 2 + localX * sine + localY * cosine + floatY
  ];
}

function easedRevealProgress(progress: number, pullbackAt: number, pullbackSize: number): number {
  const speedVariation = 0.01 * Math.sin(progress * Math.PI * 6.4);
  const distance = Math.abs(progress - pullbackAt);
  const pullbackWindow = 0.12;
  const pullback =
    distance < pullbackWindow
      ? pullbackSize * Math.sin((1 - distance / pullbackWindow) * Math.PI)
      : 0;
  return Math.max(0, Math.min(1, progress + speedVariation - pullback));
}

export function renderVerificationAnimation(answer: string): Buffer {
  const { width, height, frames, delayMs } = config.animation;
  const seed = randomBytes(8);
  const random = createPrng(seed);
  const glyphs = answer.split("").map(glyphFor);
  const phases = glyphs.map(() => random() * Math.PI * 2);
  const pullbackAt = 0.43 + random() * 0.24;
  const pullbackSize = 0.035 + random() * 0.02;
  const revealWidth = 96 + random() * 8;
  const textStart = 66;
  const characterSpacing = 62;
  const textEnd = textStart + characterSpacing * (glyphs.length - 1);
  const gif = GIFEncoder({ initialCapacity: 192 * 1024 });

  for (let frame = 0; frame < frames; frame += 1) {
    const pixels = new Uint8Array(width * height);
    const progress = frame / Math.max(1, frames - 1);
    const revealProgress = easedRevealProgress(progress, pullbackAt, pullbackSize);
    const revealCenter = textStart - 40 + revealProgress * (textEnd - textStart + 80);
    const widthPulse = revealWidth * (0.96 + 0.04 * Math.sin(progress * Math.PI * 4.7));
    const revealLeft = revealCenter - widthPulse / 2;
    const revealRight = revealCenter + widthPulse / 2;

    for (let y = 0; y < height; y += 1) {
      const vignette = Math.abs(y - height / 2) / (height / 2);
      if (vignette > 0.86) pixels.fill(7, y * width, (y + 1) * width);
    }

    glyphs.forEach((glyph, characterIndex) => {
      const baseX = textStart + characterIndex * characterSpacing;
      const phase = phases[characterIndex] ?? 0;
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
            phase
          );
          const to = transformPoint(
            current,
            glyph,
            characterIndex,
            progress,
            baseX,
            phase
          );
          drawLine(
            pixels,
            width,
            height,
            from,
            to,
            2.05,
            characterIndex % 2 === 0 ? 4 : 5,
            revealLeft,
            revealRight
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
