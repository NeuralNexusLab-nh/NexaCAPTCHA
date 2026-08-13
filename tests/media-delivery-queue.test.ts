import { describe, expect, it } from "vitest";
import { MediaDeliveryQueue } from "../src/media-delivery-queue.js";

describe("MediaDeliveryQueue", () => {
  it("waits instead of loading every media file concurrently", async () => {
    const queue = new MediaDeliveryQueue(2, 4);
    const releaseFirst = await queue.acquire();
    const releaseSecond = await queue.acquire();
    let thirdStarted = false;
    const third = queue.acquire().then((release) => {
      thirdStarted = true;
      return release;
    });

    await Promise.resolve();
    expect(queue.depth).toBe(3);
    expect(thirdStarted).toBe(false);
    releaseFirst();
    const releaseThird = await third;
    expect(thirdStarted).toBe(true);
    releaseSecond();
    releaseThird();
    expect(queue.depth).toBe(0);
  });
});
