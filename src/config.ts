import path from "node:path";

export const config = Object.freeze({
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  verificationLifetimeMs: 120_000,
  responseLifetimeMs: 300_000,
  retryCooldownMs: 20_000,
  maxAttempts: 2,
  maxRenderQueue: 6,
  maxMediaDeliveries: 12,
  maxMediaDeliveryQueue: 2_000,
  maxDataBytes: 10 * 1024 * 1024 * 1024,
  poolSizePerType: 10,
  poolRefreshIntervalMs: 6_000,
  cleanupIntervalMs: 15_000,
  dataDirectory: path.resolve("data"),
  publicDirectory: path.resolve("public"),
  animation: {
    width: 320,
    height: 116,
    minFrames: 250,
    maxFrames: 300,
    delayMs: 20
  }
});

if (!Number.isSafeInteger(config.port) || config.port < 1 || config.port > 65_535) {
  throw new Error("PORT must be a valid TCP port number.");
}
