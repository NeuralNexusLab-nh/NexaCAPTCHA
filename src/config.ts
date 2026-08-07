import path from "node:path";

export const config = Object.freeze({
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  challengeLifetimeMs: 60_000,
  responseLifetimeMs: 120_000,
  maxAttempts: 5,
  maxActiveChallenges: 160,
  maxRenderQueue: 6,
  maxTemporaryBytes: 64 * 1024 * 1024,
  cleanupIntervalMs: 15_000,
  mediaDirectory: path.resolve("tmp", "media"),
  publicDirectory: path.resolve("public"),
  animation: {
    width: 300,
    height: 108,
    frames: 40,
    delayMs: 100
  }
});

if (!Number.isSafeInteger(config.port) || config.port < 1 || config.port > 65_535) {
  throw new Error("PORT must be a valid TCP port number.");
}
