import path from "node:path";

export const config = Object.freeze({
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  verificationLifetimeMs: 120_000,
  responseLifetimeMs: 300_000,
  retryCooldownMs: 10_000,
  maxAttempts: 3,
  maxActiveVerifications: 160,
  maxRenderQueue: 6,
  maxTemporaryBytes: 64 * 1024 * 1024,
  cleanupIntervalMs: 15_000,
  mediaDirectory: path.resolve("tmp", "media"),
  publicDirectory: path.resolve("public"),
  animation: {
    width: 320,
    height: 116,
    minFrames: 130,
    maxFrames: 180,
    delayMs: 100
  }
});

if (!Number.isSafeInteger(config.port) || config.port < 1 || config.port > 65_535) {
  throw new Error("PORT must be a valid TCP port number.");
}
