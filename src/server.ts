import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { VerificationStore } from "./store.js";

const store = new VerificationStore();
await store.start();

const server = createServer(createApp(store));
server.listen(config.port, () => {
  console.log(`NexaCAPTCHA listening on http://localhost:${config.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}; shutting down.`);
  server.close(async () => {
    await store.stop();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
