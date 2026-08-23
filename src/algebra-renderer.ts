import { randomBytes, randomInt } from "node:crypto";
import { deflateSync } from "node:zlib";
import { stringToPaths, type Point } from "hershey";

export const ALGEBRA_WIDTH = 840;
export const ALGEBRA_HEIGHT = 260;

type Rgba = readonly [number, number, number, number];
type RandomInteger = (maxExclusive: number) => number;

export interface AlgebraProblem {
  answerX: number;
  answerY: number;
  equations: readonly [string, string];
}

interface EquationShape {
  leftFirst: readonly [number, number, number, number];
  leftSecond: readonly [number, number, number, number];
  right: readonly [number, number, number, number];
  rightOffset: number;
  canonicalX: number;
  canonicalY: number;
}

const CRC_TABLE = Array.from({ length: 256 }, (_value, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function createPrng(seed: Uint8Array): () => number {
  let state = new DataView(seed.buffer, seed.byteOffset, seed.byteLength).getUint32(0, true)
    || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  Buffer.from(data).copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, Buffer.from(data)])), 8 + data.length);
  return chunk;
}

function encodePng(pixels: Uint8Array): Buffer {
  const rowLength = ALGEBRA_WIDTH * 4;
  const scanlines = Buffer.alloc((rowLength + 1) * ALGEBRA_HEIGHT);
  for (let y = 0; y < ALGEBRA_HEIGHT; y += 1) {
    const target = y * (rowLength + 1);
    scanlines[target] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * rowLength, rowLength).copy(
      scanlines,
      target + 1
    );
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(ALGEBRA_WIDTH, 0);
  header.writeUInt32BE(ALGEBRA_HEIGHT, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 7 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function blendPixel(pixels: Uint8Array, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= ALGEBRA_WIDTH || y >= ALGEBRA_HEIGHT) return;
  const index = (Math.floor(y) * ALGEBRA_WIDTH + Math.floor(x)) * 4;
  const alpha = color[3] / 255;
  pixels[index] = Math.round((pixels[index] ?? 0) * (1 - alpha) + color[0] * alpha);
  pixels[index + 1] = Math.round((pixels[index + 1] ?? 0) * (1 - alpha) + color[1] * alpha);
  pixels[index + 2] = Math.round((pixels[index + 2] ?? 0) * (1 - alpha) + color[2] * alpha);
  pixels[index + 3] = 255;
}

function drawDisc(
  pixels: Uint8Array,
  centerX: number,
  centerY: number,
  radius: number,
  color: Rgba
): void {
  const radiusSquared = radius * radius;
  for (let y = Math.floor(centerY - radius); y <= Math.ceil(centerY + radius); y += 1) {
    for (let x = Math.floor(centerX - radius); x <= Math.ceil(centerX + radius); x += 1) {
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      if (dx * dx + dy * dy <= radiusSquared) blendPixel(pixels, x, y, color);
    }
  }
}

function drawLine(
  pixels: Uint8Array,
  from: Point,
  to: Point,
  thickness: number,
  color: Rgba
): void {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 1.25));
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    drawDisc(pixels, from[0] + dx * progress, from[1] + dy * progress, thickness, color);
  }
}

function drawBezier(
  pixels: Uint8Array,
  points: readonly [Point, Point, Point, Point],
  thickness: number,
  color: Rgba
): void {
  let previous = points[0];
  for (let step = 1; step <= 180; step += 1) {
    const t = step / 180;
    const inverse = 1 - t;
    const current: Point = [
      inverse ** 3 * points[0][0] + 3 * inverse ** 2 * t * points[1][0]
        + 3 * inverse * t ** 2 * points[2][0] + t ** 3 * points[3][0],
      inverse ** 3 * points[0][1] + 3 * inverse ** 2 * t * points[1][1]
        + 3 * inverse * t ** 2 * points[2][1] + t ** 3 * points[3][1]
    ];
    drawLine(pixels, previous, current, thickness, color);
    previous = current;
  }
}

function nonZero(randomInteger: RandomInteger, magnitude = 8): number {
  const value = randomInteger(magnitude) + 1;
  return randomInteger(2) === 0 ? -value : value;
}

function signed(value: number): string {
  return value < 0 ? `-${Math.abs(value)}` : `+${value}`;
}

function group(x: number, y: number, constant: number): string {
  return `${x}x${signed(y)}y${signed(constant)}`;
}

function outerTerm(multiplier: number, expression: string, first = false): string {
  const absolute = Math.abs(multiplier);
  if (first) return `${multiplier < 0 ? "-" : ""}${absolute}(${expression})`;
  return `${multiplier < 0 ? "-" : "+"}${absolute}(${expression})`;
}

function createEquation(
  answerX: number,
  answerY: number,
  randomInteger: RandomInteger
): { text: string; shape: EquationShape } {
  const leftFirst = [
    nonZero(randomInteger, 5),
    nonZero(randomInteger),
    nonZero(randomInteger),
    randomInteger(25) - 12
  ] as const;
  const leftSecond = [
    nonZero(randomInteger, 5),
    nonZero(randomInteger),
    nonZero(randomInteger),
    randomInteger(25) - 12
  ] as const;
  const right = [
    nonZero(randomInteger, 5),
    nonZero(randomInteger),
    nonZero(randomInteger),
    randomInteger(25) - 12
  ] as const;
  const canonicalX = leftFirst[0] * leftFirst[1]
    + leftSecond[0] * leftSecond[1]
    - right[0] * right[1];
  const canonicalY = leftFirst[0] * leftFirst[2]
    + leftSecond[0] * leftSecond[2]
    - right[0] * right[2];
  const leftValue = leftFirst[0]
      * (leftFirst[1] * answerX + leftFirst[2] * answerY + leftFirst[3])
    + leftSecond[0]
      * (leftSecond[1] * answerX + leftSecond[2] * answerY + leftSecond[3]);
  const rightGroupValue = right[0]
    * (right[1] * answerX + right[2] * answerY + right[3]);
  const rightOffset = leftValue - rightGroupValue;
  const text = `${outerTerm(leftFirst[0], group(leftFirst[1], leftFirst[2], leftFirst[3]), true)}`
    + `${outerTerm(leftSecond[0], group(leftSecond[1], leftSecond[2], leftSecond[3]))}`
    + `=${outerTerm(right[0], group(right[1], right[2], right[3]), true)}${signed(rightOffset)}`;
  return {
    text,
    shape: { leftFirst, leftSecond, right, rightOffset, canonicalX, canonicalY }
  };
}

export function generateAlgebraProblem(
  randomInteger: RandomInteger = randomInt
): AlgebraProblem {
  const answerX = randomInteger(101) - 50;
  const answerY = randomInteger(101) - 50;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const first = createEquation(answerX, answerY, randomInteger);
    const second = createEquation(answerX, answerY, randomInteger);
    const determinant = first.shape.canonicalX * second.shape.canonicalY
      - second.shape.canonicalX * first.shape.canonicalY;
    if (determinant === 0) continue;
    if (Math.max(first.text.length, second.text.length) > 74) continue;
    return { answerX, answerY, equations: [first.text, second.text] };
  }
  throw new Error("Unable to generate a non-degenerate Algebra problem.");
}

function fillBackground(pixels: Uint8Array, random: () => number): void {
  for (let y = 0; y < ALGEBRA_HEIGHT; y += 1) {
    for (let x = 0; x < ALGEBRA_WIDTH; x += 1) {
      const index = (y * ALGEBRA_WIDTH + x) * 4;
      const glow = Math.exp(-((x - 440) ** 2 + (y - 130) ** 2) / 160_000);
      const wave = Math.sin(x * 0.018 + y * 0.025) * 1.1;
      const noise = (random() - 0.5) * 3;
      pixels[index] = Math.round(3 + glow * 5 + wave + noise);
      pixels[index + 1] = Math.round(2 + glow * 2 + noise * 0.35);
      pixels[index + 2] = Math.round(8 + glow * 12 + wave + noise);
      pixels[index + 3] = 255;
    }
  }
}

function renderEquation(
  pixels: Uint8Array,
  text: string,
  centerY: number,
  random: () => number,
  color: Rgba
): void {
  const glyph = stringToPaths(text);
  const sourceWidth = Math.max(1, glyph.bounds.maxX - glyph.bounds.minX);
  const sourceHeight = Math.max(1, glyph.bounds.maxY - glyph.bounds.minY);
  const scale = Math.min(745 / sourceWidth, 70 / sourceHeight);
  const left = (ALGEBRA_WIDTH - sourceWidth * scale) / 2;
  const phase = random() * Math.PI * 2;
  const shear = (random() - 0.5) * 0.1;
  const wells = [
    {
      x: 180 + random() * 480,
      y: centerY + (random() - 0.5) * 32,
      radius: 130 + random() * 85,
      swirl: (random() < 0.5 ? -1 : 1) * (0.28 + random() * 0.18),
      pull: 0.075 + random() * 0.07
    },
    {
      x: 125 + random() * 590,
      y: centerY + (random() - 0.5) * 38,
      radius: 90 + random() * 70,
      swirl: (random() < 0.5 ? -1 : 1) * (0.12 + random() * 0.14),
      pull: 0.035 + random() * 0.05
    }
  ];
  const transform = (point: Point): Point => {
    const rawX = left + (point[0] - glyph.bounds.minX) * scale;
    const normalizedY = (point[1] - (glyph.bounds.minY + glyph.bounds.maxY) / 2) * scale;
    const wave = Math.sin(rawX * 0.018 + phase) * 5
      + Math.sin(rawX * 0.007 - phase * 0.6) * 3.1;
    let warpedX = rawX + normalizedY * shear;
    let warpedY = centerY - normalizedY + wave;
    for (const well of wells) {
      const dx = warpedX - well.x;
      const dy = warpedY - well.y;
      const distance = Math.max(18, Math.hypot(dx, dy));
      const influence = Math.exp(-0.9 * (distance / well.radius) ** 2);
      const angle = well.swirl * influence;
      const radialScale = 1 - well.pull * influence;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      warpedX = well.x + (dx * cosine - dy * sine) * radialScale;
      warpedY = well.y + (dx * sine + dy * cosine) * radialScale;
    }
    return [warpedX, warpedY];
  };
  const transformedPaths: Point[][] = [];
  for (const path of glyph.paths) {
    const transformed: Point[] = [];
    for (let index = 1; index < path.length; index += 1) {
      const from = path[index - 1];
      const to = path[index];
      if (!from || !to) continue;
      const steps = Math.max(4, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1])));
      for (let step = index === 1 ? 0 : 1; step <= steps; step += 1) {
        const progress = step / steps;
        transformed.push(transform([
          from[0] + (to[0] - from[0]) * progress,
          from[1] + (to[1] - from[1]) * progress
        ]));
      }
    }
    if (transformed.length > 1) transformedPaths.push(transformed);
  }

  // Draw the complete outline first. Interleaving outline and foreground
  // segments would let each new outline cover the preceding bright stroke.
  for (const path of transformedPaths) {
    for (let index = 1; index < path.length; index += 1) {
      drawLine(pixels, path[index - 1]!, path[index]!, 4.5, [22, 8, 36, 230]);
    }
  }
  for (const path of transformedPaths) {
    for (let index = 1; index < path.length; index += 1) {
      drawLine(pixels, path[index - 1]!, path[index]!, 2.25, color);
    }
  }
}

export function renderAlgebraImage(problem: AlgebraProblem): Buffer {
  const random = createPrng(randomBytes(4));
  const pixels = new Uint8Array(ALGEBRA_WIDTH * ALGEBRA_HEIGHT * 4);
  fillBackground(pixels, random);

  const pale: Rgba = [151, 80, 213, 112];
  for (let index = 0; index < 3; index += 1) {
    const base = 48 + random() * 164;
    drawBezier(pixels, [
      [-20, base],
      [220 + random() * 120, base + (random() - 0.5) * 115],
      [620 + random() * 120, base + (random() - 0.5) * 115],
      [ALGEBRA_WIDTH + 20, 45 + random() * 170]
    ], 1.35 + random() * 0.75, pale);
  }

  renderEquation(pixels, problem.equations[0], 80, random, [244, 229, 255, 255]);
  renderEquation(pixels, problem.equations[1], 180, random, [220, 196, 255, 255]);

  const foregroundColors: readonly Rgba[] = [
    [178, 91, 237, 170],
    [116, 81, 207, 155],
    [205, 125, 255, 142]
  ];
  for (let index = 0; index < 3; index += 1) {
    const base = 46 + random() * 168;
    drawBezier(pixels, [
      [-16, base],
      [260 + random() * 100, base + (random() - 0.5) * 92],
      [610 + random() * 100, base + (random() - 0.5) * 92],
      [ALGEBRA_WIDTH + 16, 45 + random() * 170]
    ], 1.45 + random() * 0.9, foregroundColors[index]!);
  }

  for (let index = 0; index < 34; index += 1) {
    drawDisc(
      pixels,
      18 + random() * (ALGEBRA_WIDTH - 36),
      15 + random() * (ALGEBRA_HEIGHT - 30),
      0.7 + random(),
      [163, 101, 219, 70]
    );
  }
  return encodePng(pixels);
}
