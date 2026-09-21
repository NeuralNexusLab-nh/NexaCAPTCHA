import { PublicError } from "./errors.js";

export interface MemorySnapshot {
  rss: number;
}

/**
 * Admits HTTP work gradually. The Node heap limit is the first guardrail;
 * this queue is the second one for native buffers and streamed media, which
 * are not fully accounted for by V8's heap limit.
 */
export class MemoryRequestQueue {
  private active = 0;
  private readonly waiting: Array<{
    resolve: (release: () => void) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(
    private readonly maxActive: number,
    private readonly maxWaiting: number,
    private readonly maximumRssBytes: number,
    private readonly pressureRssBytes: number,
    private readonly memory: () => MemorySnapshot = process.memoryUsage
  ) {}

  get depth(): number {
    return this.active + this.waiting.length;
  }

  async acquire(): Promise<() => void> {
    if (this.waiting.length >= this.maxWaiting) {
      throw new PublicError(503, "request-queue-full", "The server is busy. Please retry shortly.");
    }

    if (this.memory().rss >= this.maximumRssBytes) {
      throw new PublicError(503, "memory-limit-reached", "The server is at its memory limit. Please retry shortly.");
    }

    return new Promise<() => void>((resolve, reject) => {
      this.waiting.push({ resolve, reject });
      this.drain();
    });
  }

  private drain(): void {
    const rss = this.memory().rss;
    if (rss >= this.maximumRssBytes) {
      while (this.waiting.length > 0) {
        this.waiting.shift()!.reject(
          new PublicError(503, "memory-limit-reached", "The server is at its memory limit. Please retry shortly.")
        );
      }
      return;
    }

    // Near the cap, permit one request at a time. This still lets an already
    // rendered CAPTCHA finish loading while preventing a burst from creating
    // more concurrent buffers or file streams.
    const activeLimit = rss >= this.pressureRssBytes ? 1 : this.maxActive;
    while (this.active < activeLimit && this.waiting.length > 0) {
      const entry = this.waiting.shift()!;
      this.active += 1;
      let released = false;
      entry.resolve(() => {
        if (released) return;
        released = true;
        this.active = Math.max(0, this.active - 1);
        this.drain();
      });
    }
  }
}
