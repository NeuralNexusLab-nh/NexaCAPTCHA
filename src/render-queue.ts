import { PublicError } from "./errors.js";

export class RenderQueue {
  private tail: Promise<void> = Promise.resolve();
  private queued = 0;

  constructor(
    private readonly maxQueued: number,
    private readonly targetDutyCycle = 0.25
  ) {}

  get depth(): number {
    return this.queued;
  }

  async run<T>(task: () => T | Promise<T>): Promise<T> {
    if (this.queued >= this.maxQueued) {
      throw new PublicError(
        503,
        "service-unavailable",
        "The render queue is currently full. Please retry shortly."
      );
    }

    this.queued += 1;
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previous;
    const startedAt = performance.now();
    try {
      return await task();
    } finally {
      const workDuration = performance.now() - startedAt;
      const cooldown = Math.max(
        0,
        workDuration * (1 / this.targetDutyCycle - 1)
      );
      if (cooldown > 1) {
        await new Promise((resolve) => setTimeout(resolve, cooldown));
      }
      this.queued -= 1;
      release();
    }
  }
}
