import { renderGravityImage } from "../dist/gravity-renderer.js";
import { renderGravityAudio } from "../dist/gravity-audio-renderer.js";

const maximumRss = 110 * 1024 * 1024;
const cpuStart = process.cpuUsage();
const wallStart = performance.now();
let peakRss = process.memoryUsage().rss;
let encodedBytes = 0;

for (let index = 0; index < 60; index += 1) {
  const output = renderGravityImage(index % 2 === 0 ? "N3XA" : "S4FE");
  encodedBytes += output.byteLength;
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  await new Promise((resolve) => setImmediate(resolve));
}

const audioAnswers = ["ABCD", "EFGH", "JKLM", "NPQR", "STUV", "WXYZ", "2345", "6789"];
for (let index = 0; index < 16; index += 1) {
  const output = renderGravityAudio(audioAnswers[index % audioAnswers.length]);
  encodedBytes += output.byteLength;
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  await new Promise((resolve) => setImmediate(resolve));
}

const cpu = process.cpuUsage(cpuStart);
const result = {
  imageRenders: 60,
  audioRenders: 16,
  encodedBytes,
  wallMs: Math.round(performance.now() - wallStart),
  cpuMs: Math.round((cpu.user + cpu.system) / 1000),
  peakRssBytes: peakRss,
  peakRssMegabytes: Number((peakRss / 1024 / 1024).toFixed(1)),
  limitMegabytes: 110
};

console.log(JSON.stringify(result));
if (peakRss > maximumRss) {
  throw new Error(`Resource check exceeded 110 MB RSS: ${result.peakRssMegabytes} MB`);
}
