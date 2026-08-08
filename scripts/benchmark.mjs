import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderVerification } from "../dist/renderer.js";

const width = 320;
const height = 116;
const answers = ["B8G6", "KX2A", "MNVY", "PFRD", "C4HZ", "Q7ES"];
const outputDirectory = path.resolve("tmp", "benchmark");

function seedFor(index) {
  const seed = new Uint8Array(8);
  const view = new DataView(seed.buffer);
  view.setUint32(0, 0x4e455841 ^ index, true);
  view.setUint32(4, 0x43415054 ^ Math.imul(index + 1, 0x9e3779b9), true);
  return seed;
}

function luminance(color) {
  return Math.round(
    (color?.[0] ?? 0) * 0.2126 +
    (color?.[1] ?? 0) * 0.7152 +
    (color?.[2] ?? 0) * 0.0722
  );
}

async function writePgm(filePath, pixels) {
  const header = Buffer.from(`P5\n${width} ${height}\n255\n`, "ascii");
  await writeFile(filePath, Buffer.concat([header, Buffer.from(pixels)]));
}

function grayscaleFrame(frame, palette) {
  const grayscale = new Uint8Array(frame.length);
  for (let index = 0; index < frame.length; index += 1) {
    grayscale[index] = luminance(palette[frame[index] ?? 0]);
  }
  return grayscale;
}

function maximumComposite(frames) {
  const output = new Uint8Array(width * height);
  for (const frame of frames) {
    for (let index = 0; index < output.length; index += 1) {
      output[index] = Math.max(output[index] ?? 0, frame[index] ?? 0);
    }
  }
  return output;
}

function averageComposite(frames) {
  const sums = new Uint32Array(width * height);
  for (const frame of frames) {
    for (let index = 0; index < sums.length; index += 1) {
      sums[index] = (sums[index] ?? 0) + (frame[index] ?? 0);
    }
  }
  return Uint8Array.from(sums, (sum) => Math.round(sum / Math.max(1, frames.length)));
}

function colorTrackComposite(indexFrames, palette, colorGroup) {
  const output = new Uint8Array(width * height);
  for (const frame of indexFrames) {
    for (let index = 0; index < frame.length; index += 1) {
      const paletteIndex = frame[index] ?? 0;
      if (paletteIndex < 2 || Math.floor((paletteIndex - 2) / 4) !== colorGroup) continue;
      output[index] = Math.max(output[index] ?? 0, luminance(palette[paletteIndex]));
    }
  }
  return output;
}

await mkdir(outputDirectory, { recursive: true });
const manifest = [];

for (let sampleIndex = 0; sampleIndex < answers.length; sampleIndex += 1) {
  const answer = answers[sampleIndex];
  const rendered = renderVerification(answer, {
    seedBytes: seedFor(sampleIndex),
    collectFrames: true
  });
  const indexFrames = rendered.frames ?? [];
  const frames = indexFrames.map((frame) => grayscaleFrame(frame, rendered.palette));
  const prefix = `sample-${sampleIndex + 1}`;
  const files = [];

  const representativeIndices = [0.2, 0.4, 0.6, 0.8].map((progress) =>
    Math.min(frames.length - 1, Math.floor(frames.length * progress))
  );
  for (let index = 0; index < representativeIndices.length; index += 1) {
    const frameIndex = representativeIndices[index] ?? 0;
    const name = `${prefix}-single-${index + 1}.pgm`;
    await writePgm(path.join(outputDirectory, name), frames[frameIndex] ?? new Uint8Array(width * height));
    files.push({ attack: "single-frame", file: name, frameIndex });
  }

  const maximumName = `${prefix}-maximum.pgm`;
  await writePgm(path.join(outputDirectory, maximumName), maximumComposite(frames));
  files.push({ attack: "all-frame-maximum", file: maximumName });

  const averageName = `${prefix}-average.pgm`;
  await writePgm(path.join(outputDirectory, averageName), averageComposite(frames));
  files.push({ attack: "all-frame-average", file: averageName });

  for (let segment = 0; segment < 4; segment += 1) {
    const start = Math.floor(indexFrames.length * segment / 4);
    const end = Math.floor(indexFrames.length * (segment + 1) / 4);
    const name = `${prefix}-segment-${segment + 1}.pgm`;
    await writePgm(path.join(outputDirectory, name), maximumComposite(frames.slice(start, end)));
    files.push({ attack: "quarter-maximum", file: name, segment: segment + 1 });
  }

  for (let colorGroup = 0; colorGroup < 4; colorGroup += 1) {
    const name = `${prefix}-color-track-${colorGroup + 1}.pgm`;
    await writePgm(
      path.join(outputDirectory, name),
      colorTrackComposite(indexFrames, rendered.palette, colorGroup)
    );
    files.push({ attack: "color-track", file: name, colorGroup: colorGroup + 1 });
  }

  manifest.push({
    sample: sampleIndex + 1,
    groundTruth: answer,
    parameterClass: rendered.parameterClass,
    frameCount: frames.length,
    files
  });
}

await writeFile(
  path.join(outputDirectory, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), width, height, samples: manifest }, null, 2)
);
console.log(`Wrote ${manifest.length} reproducible samples to ${outputDirectory}`);
