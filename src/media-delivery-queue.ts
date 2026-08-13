import { PublicError } from "./errors.js";

export class MediaDeliveryQueue {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(
    private readonly maxActive: number,
    private readonly maxWaiting: number
  ) {}

  get depth(): number {
    return this.active + this.waiting.length;
  }

  async acquire(): Promise<() => void> {
    if (this.active >= this.maxActive) {
      if (this.waiting.length >= this.maxWaiting) {
        throw new PublicError(
          503,
          "media-queue-full",
          "The media delivery queue is full. Please retry shortly."
        );
      }
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }

    this.active += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      this.waiting.shift()?.();
    };
  }
}
