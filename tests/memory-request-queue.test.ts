import { describe, expect, it } from "vitest";
import { MemoryRequestQueue } from "../src/memory-request-queue.js";

describe("MemoryRequestQueue", () => {
  it("queues normal traffic and releases the next request", async () => {
    let rss = 80;
    const queue = new MemoryRequestQueue(1, 2, 192, 168, () => ({ rss }));
    const releaseFirst = await queue.acquire();
    let started = false;
    const second = queue.acquire().then((release) => {
      started = true;
      return release;
    });
    expect(started).toBe(false);
    releaseFirst();
    const releaseSecond = await second;
    expect(started).toBe(true);
    releaseSecond();
  });

  it("rejects new work at the hard memory limit", async () => {
    const queue = new MemoryRequestQueue(2, 2, 192, 168, () => ({ rss: 192 }));
    await expect(queue.acquire()).rejects.toMatchObject({
      statusCode: 503,
      code: "memory-limit-reached"
    });
  });

  it("allows only one active request while memory is under pressure", async () => {
    const queue = new MemoryRequestQueue(4, 4, 192, 168, () => ({ rss: 180 }));
    const releaseFirst = await queue.acquire();
    let started = false;
    const second = queue.acquire().then((release) => {
      started = true;
      return release;
    });
    expect(started).toBe(false);
    releaseFirst();
    const releaseSecond = await second;
    expect(started).toBe(true);
    releaseSecond();
  });
});
