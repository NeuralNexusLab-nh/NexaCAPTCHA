import { renderGravityImage } from "../dist/gravity-renderer.js";
import { renderGravityAudio } from "../dist/gravity-audio-renderer.js";

const maximumRss = 300 * 1024 * 1024;
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

for (let index = 0; index < 12; index += 1) {
  const output = renderGravityAudio(index % 2 === 0 ? "N3XA" : "S4FE");
  encodedBytes += output.byteLength;
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  await new Promise((resolve) => setImmediate(resolve));
}

const cpu = process.cpuUsage(cpuStart);
const result = {
  imageRenders: 60,
  audioRenders: 12,
  encodedBytes,
  wallMs: Math.round(performance.now() - wallStart),
  cpuMs: Math.round((cpu.user + cpu.system) / 1000),
  peakRssBytes: peakRss,
  peakRssMegabytes: Number((peakRss / 1024 / 1024).toFixed(1)),
  limitMegabytes: 300
};

console.log(JSON.stringify(result));
if (peakRss > maximumRss) {
  throw new Error(`Resource check exceeded 300 MB RSS: ${result.peakRssMegabytes} MB`);
}
