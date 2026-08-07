import path from "node:path";

export const config = Object.freeze({
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  verificationLifetimeMs: 300_000,
  responseLifetimeMs: 300_000,
  maxAttempts: 5,
  maxActiveVerifications: 160,
  maxRenderQueue: 6,
  maxTemporaryBytes: 64 * 1024 * 1024,
  cleanupIntervalMs: 15_000,
  mediaDirectory: path.resolve("tmp", "media"),
  publicDirectory: path.resolve("public"),
  animation: {
    width: 320,
    height: 116,
    frames: 100,
    delayMs: 100
  }
});

if (!Number.isSafeInteger(config.port) || config.port < 1 || config.port > 65_535) {
  throw new Error("PORT must be a valid TCP port number.");
}
