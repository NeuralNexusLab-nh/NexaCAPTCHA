import { renderGravityImage } from "../dist/gravity-renderer.js";
import {
  generateAlgebraProblem,
  renderAlgebraImage
} from "../dist/algebra-renderer.js";

const maximumRss = 100 * 1024 * 1024;
const cpuStart = process.cpuUsage();
const wallStart = performance.now();
let peakRss = process.memoryUsage().rss;
let encodedBytes = 0;

for (let index = 0; index < 60; index += 1) {
  const gravity = renderGravityImage(index % 2 === 0 ? "N3XA" : "S4FE");
  const algebra = renderAlgebraImage(generateAlgebraProblem());
  encodedBytes += gravity.byteLength + algebra.byteLength;
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  await new Promise((resolve) => setImmediate(resolve));
}

const cpu = process.cpuUsage(cpuStart);
const result = {
  rendersPerType: 60,
  encodedBytes,
  wallMs: Math.round(performance.now() - wallStart),
  cpuMs: Math.round((cpu.user + cpu.system) / 1000),
  peakRssBytes: peakRss,
  peakRssMegabytes: Number((peakRss / 1024 / 1024).toFixed(1)),
  limitMegabytes: 100
};

console.log(JSON.stringify(result));
if (peakRss > maximumRss) {
  throw new Error(`Resource check exceeded 100 MB RSS: ${result.peakRssMegabytes} MB`);
}
