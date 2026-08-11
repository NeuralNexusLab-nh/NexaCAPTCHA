import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import { stringToPaths, type Point } from "hershey";

export const GRAVITY_WIDTH = 600;
export const GRAVITY_HEIGHT = 200;

type Rgba = readonly [number, number, number, number];

interface GravityWell {
  x: number;
  y: number;
  radius: number;
  pull: number;
  swirl: number;
}

const CHARACTER_COLORS: readonly Rgba[] = [
  [18, 39, 68, 255],
  [42, 34, 82, 255],
  [21, 58, 70, 255],
  [55, 32, 67, 255]
];

const CHARACTER_INNER_COLORS: readonly Rgba[] = [
  [211, 228, 241, 255],
  [224, 216, 241, 255],
  [207, 232, 232, 255],
  [232, 216, 231, 255]
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
  if (x < 0 || y < 0 || x >= GRAVITY_WIDTH || y >= GRAVITY_HEIGHT) return;
  const index = (Math.floor(y) * GRAVITY_WIDTH + Math.floor(x)) * 4;
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

function applyGravityField(point: Point, wells: readonly GravityWell[]): Point {
  let x = point[0];
  let y = point[1];
  for (const well of wells) {
    const relativeX = x - well.x;
    const relativeY = y - well.y;
    const distance = Math.max(18, Math.hypot(relativeX, relativeY));
    const influence = Math.exp(-0.9 * (distance / well.radius) ** 2);
    const coreEase = Math.min(1, distance / 44);
    const angle = well.swirl * influence * coreEase;
    const radialScale = 1 - well.pull * influence * coreEase;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const rotatedX = relativeX * cosine - relativeY * sine;
    const rotatedY = relativeX * sine + relativeY * cosine;

    x = well.x + rotatedX * radialScale;
    y = well.y + rotatedY * radialScale;
  }
  // Keep the strong vortex while fitting its displaced coordinates back into
  // the PNG. This avoids solving readability problems by weakening gravity.
  return [
    GRAVITY_WIDTH / 2 + (x - GRAVITY_WIDTH / 2) * 0.9,
    GRAVITY_HEIGHT / 2 + (y - GRAVITY_HEIGHT / 2) * 0.76
  ];
}

function drawGravityBezier(
  pixels: Uint8Array,
  points: readonly [Point, Point, Point, Point],
  thickness: number,
  color: Rgba,
  wells: readonly GravityWell[]
): void {
  let previous = applyGravityField(points[0], wells);
  for (let step = 1; step <= 180; step += 1) {
    const t = step / 180;
    const inverse = 1 - t;
    const source: Point = [
      inverse ** 3 * points[0][0] +
        3 * inverse ** 2 * t * points[1][0] +
        3 * inverse * t ** 2 * points[2][0] +
        t ** 3 * points[3][0],
      inverse ** 3 * points[0][1] +
        3 * inverse ** 2 * t * points[1][1] +
        3 * inverse * t ** 2 * points[2][1] +
        t ** 3 * points[3][1]
    ];
    const current = applyGravityField(source, wells);
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
  wavePhase: number,
  horizontalWave: number,
  verticalWave: number,
  bend: number,
  twist: number,
  wells: readonly GravityWell[]
): Point {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const normalizedX = (point[0] - (bounds.minX + bounds.maxX) / 2) / width;
  const normalizedY = (point[1] - (bounds.minY + bounds.maxY) / 2) / height;
  const localX =
    normalizedX * 88 * scaleX +
    normalizedY * shear * 30 +
    Math.sin(normalizedY * 6.5 + wavePhase) * horizontalWave +
    normalizedY * normalizedY * bend * Math.sign(normalizedY || 1);
  const localY =
    -normalizedY * 118 * scaleY +
    Math.sin(normalizedX * 6.2 + wavePhase * 0.73) * verticalWave +
    normalizedX * normalizedY * twist;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const rotatedX = localX * cosine - localY * sine;
  const rotatedY = localX * sine + localY * cosine;
  return applyGravityField(
    [centerX + rotatedX, centerY + rotatedY],
    wells
  );
}

function transformGlyphPath(
  path: readonly Point[],
  transform: (point: Point) => Point
): Point[] {
  const transformed: Point[] = [];
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    if (!from || !to) continue;
    const steps = Math.max(5, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1])));
    for (let step = index === 1 ? 0 : 1; step <= steps; step += 1) {
      const progress = step / steps;
      transformed.push(transform([
        from[0] + (to[0] - from[0]) * progress,
        from[1] + (to[1] - from[1]) * progress
      ]));
    }
  }
  return transformed;
}

function fillBackground(pixels: Uint8Array, random: () => number): void {
  for (let y = 0; y < GRAVITY_HEIGHT; y += 1) {
    for (let x = 0; x < GRAVITY_WIDTH; x += 1) {
      const index = (y * GRAVITY_WIDTH + x) * 4;
      const wave = Math.sin(x * 0.022 + y * 0.035) * 2;
      const noise = (random() - 0.5) * 5;
      pixels[index] = Math.round(242 + wave + noise);
      pixels[index + 1] = Math.round(246 + wave + noise);
      pixels[index + 2] = Math.round(250 + wave + noise);
      pixels[index + 3] = 255;
    }
  }
}

export function renderGravityImage(answer: string): Buffer {
  const random = createPrng(randomBytes(4));
  const pixels = new Uint8Array(GRAVITY_WIDTH * GRAVITY_HEIGHT * 4);
  fillBackground(pixels, random);

  const wellOnLeft = random() < 0.5;
  const gravityWells: GravityWell[] = [{
    x: wellOnLeft ? -35 + random() * 105 : GRAVITY_WIDTH - 70 + random() * 105,
    y: 24 + random() * (GRAVITY_HEIGHT - 48),
    radius: 215 + random() * 75,
    pull: 0.075 + random() * 0.065,
    swirl: (random() < 0.5 ? -1 : 1) * (0.48 + random() * 0.34)
  }];
  if (random() < 0.65) {
    gravityWells.push({
      x: wellOnLeft ? GRAVITY_WIDTH + 18 : -18,
      y: 18 + random() * (GRAVITY_HEIGHT - 36),
      radius: 185 + random() * 65,
      pull: 0.025 + random() * 0.035,
      swirl: (random() < 0.5 ? -1 : 1) * (0.14 + random() * 0.18)
    });
  }

  const paleLine: Rgba = [72, 104, 139, 42];
  for (let index = 0; index < 4; index += 1) {
    const startY = 35 + random() * 130;
    const endY = 35 + random() * 130;
    drawGravityBezier(
      pixels,
      [
        [-24, startY],
        [150 + random() * 100, -15 + random() * 225],
        [360 + random() * 120, -10 + random() * 220],
        [GRAVITY_WIDTH + 24, endY]
      ],
      1.2 + random() * 1.1,
      paleLine,
      gravityWells
    );
  }

  const glyphCenters = [105, 235, 365, 495];
  answer.split("").forEach((character, index) => {
    const glyph = stringToPaths(character);
    const centerX = glyphCenters[index]! + (random() - 0.5) * 18;
    const centerY = GRAVITY_HEIGHT / 2 + (random() - 0.5) * 16;
    const rotation = ((random() * 34 - 17) * Math.PI) / 180;
    const shear = random() * 0.64 - 0.32;
    const scaleX = 0.76 + random() * 0.45;
    const scaleY = 0.84 + random() * 0.3;
    const wavePhase = random() * Math.PI * 2;
    const horizontalWave = 5 + random() * 7;
    const verticalWave = 6 + random() * 8;
    const bend = random() * 20 - 10;
    const twist = random() * 24 - 12;
    const thickness = 5.2 + random() * 2;
    const color = CHARACTER_COLORS[index % CHARACTER_COLORS.length]!;
    const innerColor = CHARACTER_INNER_COLORS[index % CHARACTER_INNER_COLORS.length]!;

    const transformedPaths = glyph.paths.map((glyphPath) =>
      transformGlyphPath(glyphPath, (point) =>
        transformGlyphPoint(
          point,
          glyph.bounds,
          centerX,
          centerY,
          rotation,
          shear,
          scaleX,
          scaleY,
          wavePhase,
          horizontalWave,
          verticalWave,
          bend,
          twist,
          gravityWells
        )
      )
    );

    transformedPaths.forEach((path) => {
      for (let pointIndex = 1; pointIndex < path.length; pointIndex += 1) {
        const previous = path[pointIndex - 1];
        const current = path[pointIndex];
        if (!previous || !current) continue;
        const segmentWeight = 0.9 + Math.sin(pointIndex * 1.7 + wavePhase) * 0.1;
        drawLine(
          pixels,
          previous,
          current,
          thickness * segmentWeight,
          color
        );
      }
    });

    // Redraw a narrow tinted centerline to turn each stroke into a hollow ribbon.
    transformedPaths.forEach((path) => {
      for (let pointIndex = 1; pointIndex < path.length; pointIndex += 1) {
        const previous = path[pointIndex - 1];
        const current = path[pointIndex];
        if (!previous || !current) continue;
        const segmentWeight = 0.9 + Math.sin(pointIndex * 1.7 + wavePhase) * 0.1;
        drawLine(
          pixels,
          previous,
          current,
          thickness * segmentWeight * 0.42,
          innerColor
        );
      }
    });
  });

  const foregroundColors: readonly Rgba[] = [
    [42, 77, 116, 120],
    [91, 57, 131, 112],
    [23, 91, 103, 105],
    [65, 88, 121, 104]
  ];
  for (let index = 0; index < 4; index += 1) {
    const color = foregroundColors[index]!;
    const baseY = 48 + random() * 104;
    drawGravityBezier(
      pixels,
      [
        [-16, baseY],
        [120 + random() * 110, baseY + (random() - 0.5) * 120],
        [380 + random() * 90, baseY + (random() - 0.5) * 120],
        [GRAVITY_WIDTH + 16, 45 + random() * 110]
      ],
      1.4 + random() * 1.4,
      color,
      gravityWells
    );
  }

  for (let index = 0; index < 42; index += 1) {
    const x = 20 + random() * (GRAVITY_WIDTH - 40);
    const y = 18 + random() * (GRAVITY_HEIGHT - 36);
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

  return encodePng(pixels, GRAVITY_WIDTH, GRAVITY_HEIGHT);
}
