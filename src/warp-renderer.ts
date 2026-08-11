import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import { stringToPaths, type Point } from "hershey";

export const WARP_WIDTH = 600;
export const WARP_HEIGHT = 200;

type Rgba = readonly [number, number, number, number];

const CHARACTER_COLORS: readonly Rgba[] = [
  [18, 39, 68, 255],
  [42, 34, 82, 255],
  [21, 58, 70, 255],
  [55, 32, 67, 255]
];

const CRC_TABLE = Array.from({ length: 256 }, (_value, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

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

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  Buffer.from(data).copy(chunk, 8);
  const checksum = crc32(Buffer.concat([typeBytes, Buffer.from(data)]));
  chunk.writeUInt32BE(checksum, 8 + data.length);
  return chunk;
}

function encodePng(pixels: Uint8Array, width: number, height: number): Buffer {
  const rowLength = width * 4;
  const scanlines = Buffer.alloc((rowLength + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const target = y * (rowLength + 1);
    scanlines[target] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * rowLength, rowLength).copy(
      scanlines,
      target + 1
    );
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 7 })),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function blendPixel(
  pixels: Uint8Array,
  x: number,
  y: number,
  color: Rgba
): void {
  if (x < 0 || y < 0 || x >= WARP_WIDTH || y >= WARP_HEIGHT) return;
  const index = (Math.floor(y) * WARP_WIDTH + Math.floor(x)) * 4;
  const alpha = color[3] / 255;
  pixels[index] = Math.round((pixels[index] ?? 0) * (1 - alpha) + color[0] * alpha);
  pixels[index + 1] = Math.round(
    (pixels[index + 1] ?? 0) * (1 - alpha) + color[1] * alpha
  );
  pixels[index + 2] = Math.round(
    (pixels[index + 2] ?? 0) * (1 - alpha) + color[2] * alpha
  );
  pixels[index + 3] = 255;
}

function drawDisc(
  pixels: Uint8Array,
  centerX: number,
  centerY: number,
  radius: number,
  color: Rgba
): void {
  const left = Math.floor(centerX - radius);
  const right = Math.ceil(centerX + radius);
  const top = Math.floor(centerY - radius);
  const bottom = Math.ceil(centerY + radius);
  const radiusSquared = radius * radius;
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const dx = x + 0.5 - centerX;
      const dy = y + 0.5 - centerY;
      if (dx * dx + dy * dy <= radiusSquared) {
        blendPixel(pixels, x, y, color);
      }
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
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 1.5));
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    drawDisc(
      pixels,
      from[0] + dx * progress,
      from[1] + dy * progress,
      thickness,
      color
    );
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
      inverse ** 3 * points[0][0] +
        3 * inverse ** 2 * t * points[1][0] +
        3 * inverse * t ** 2 * points[2][0] +
        t ** 3 * points[3][0],
      inverse ** 3 * points[0][1] +
        3 * inverse ** 2 * t * points[1][1] +
        3 * inverse * t ** 2 * points[2][1] +
        t ** 3 * points[3][1]
    ];
    drawLine(pixels, previous, current, thickness, color);
    previous = current;
  }
}

function transformGlyphPoint(
  point: Point,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  centerX: number,
  centerY: number,
  rotation: number,
  shear: number,
  scaleX: number,
  scaleY: number,
  wavePhase: number
): Point {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const normalizedX = (point[0] - (bounds.minX + bounds.maxX) / 2) / width;
  const normalizedY = (point[1] - (bounds.minY + bounds.maxY) / 2) / height;
  const localX =
    normalizedX * 88 * scaleX +
    normalizedY * shear * 34 +
    Math.sin(normalizedY * 6.2 + wavePhase) * 4.8;
  const localY =
    -normalizedY * 112 * scaleY +
    Math.sin(normalizedX * 5.4 + wavePhase * 0.7) * 5.2;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const rotatedX = localX * cosine - localY * sine;
  const rotatedY = localX * sine + localY * cosine;
  const globalWarpX = Math.sin((centerY + rotatedY) * 0.045 + wavePhase) * 4.2;
  const globalWarpY = Math.sin((centerX + rotatedX) * 0.025 + wavePhase) * 4.6;
  return [centerX + rotatedX + globalWarpX, centerY + rotatedY + globalWarpY];
}

function fillBackground(pixels: Uint8Array, random: () => number): void {
  for (let y = 0; y < WARP_HEIGHT; y += 1) {
    for (let x = 0; x < WARP_WIDTH; x += 1) {
      const index = (y * WARP_WIDTH + x) * 4;
      const wave = Math.sin(x * 0.022 + y * 0.035) * 2;
      const noise = (random() - 0.5) * 5;
      pixels[index] = Math.round(242 + wave + noise);
      pixels[index + 1] = Math.round(246 + wave + noise);
      pixels[index + 2] = Math.round(250 + wave + noise);
      pixels[index + 3] = 255;
    }
  }
}

export function renderWarpImage(answer: string): Buffer {
  const random = createPrng(randomBytes(4));
  const pixels = new Uint8Array(WARP_WIDTH * WARP_HEIGHT * 4);
  fillBackground(pixels, random);

  const paleLine: Rgba = [72, 104, 139, 42];
  for (let index = 0; index < 3; index += 1) {
    const startY = 35 + random() * 130;
    const endY = 35 + random() * 130;
    drawBezier(
      pixels,
      [
        [-24, startY],
        [150 + random() * 100, -15 + random() * 225],
        [360 + random() * 120, -10 + random() * 220],
        [WARP_WIDTH + 24, endY]
      ],
      1.2 + random() * 1.1,
      paleLine
    );
  }

  const glyphCenters = [105, 235, 365, 495];
  answer.split("").forEach((character, index) => {
    const glyph = stringToPaths(character);
    const centerX = glyphCenters[index]! + (random() - 0.5) * 18;
    const centerY = WARP_HEIGHT / 2 + (random() - 0.5) * 24;
    const rotation = ((random() * 34 - 17) * Math.PI) / 180;
    const shear = random() * 0.44 - 0.22;
    const scaleX = 0.9 + random() * 0.24;
    const scaleY = 0.92 + random() * 0.2;
    const wavePhase = random() * Math.PI * 2;
    const thickness = 4.8 + random() * 2.1;
    const color = CHARACTER_COLORS[index % CHARACTER_COLORS.length]!;

    glyph.paths.forEach((path) => {
      for (let pointIndex = 1; pointIndex < path.length; pointIndex += 1) {
        const previous = path[pointIndex - 1];
        const current = path[pointIndex];
        if (!previous || !current) continue;
        drawLine(
          pixels,
          transformGlyphPoint(
            previous,
            glyph.bounds,
            centerX,
            centerY,
            rotation,
            shear,
            scaleX,
            scaleY,
            wavePhase
          ),
          transformGlyphPoint(
            current,
            glyph.bounds,
            centerX,
            centerY,
            rotation,
            shear,
            scaleX,
            scaleY,
            wavePhase
          ),
          thickness,
          color
        );
      }
    });
  });

  const foregroundColors: readonly Rgba[] = [
    [42, 77, 116, 120],
    [91, 57, 131, 112],
    [23, 91, 103, 105]
  ];
  for (let index = 0; index < 3; index += 1) {
    const color = foregroundColors[index]!;
    const baseY = 48 + random() * 104;
    drawBezier(
      pixels,
      [
        [-16, baseY],
        [120 + random() * 110, baseY + (random() - 0.5) * 120],
        [380 + random() * 90, baseY + (random() - 0.5) * 120],
        [WARP_WIDTH + 16, 45 + random() * 110]
      ],
      1.4 + random() * 1.4,
      color
    );
  }

  for (let index = 0; index < 28; index += 1) {
    const x = 20 + random() * (WARP_WIDTH - 40);
    const y = 18 + random() * (WARP_HEIGHT - 36);
    if (random() < 0.55) {
      drawDisc(pixels, x, y, 0.8 + random() * 1.4, [36, 67, 98, 75]);
    } else {
      const length = 4 + random() * 10;
      const angle = random() * Math.PI * 2;
      drawLine(
        pixels,
        [x, y],
        [x + Math.cos(angle) * length, y + Math.sin(angle) * length],
        0.8 + random() * 0.7,
        [58, 51, 96, 72]
      );
    }
  }

  return encodePng(pixels, WARP_WIDTH, WARP_HEIGHT);
}
