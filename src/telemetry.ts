export type AnonymousOutcome = "completed" | "failed";

export interface AnonymousTestRecord {
  captchaVersion: string;
  outcome: AnonymousOutcome;
  successfulAttempt: number | null;
  elapsedMs: number;
  parameterClass: string;
  recordedAt: string;
}

interface AnonymousTestRecorderOptions {
  maximumRecords?: number;
  logger?: (record: AnonymousTestRecord) => void;
}

export class AnonymousTestRecorder {
  private readonly records: AnonymousTestRecord[] = [];
  private readonly maximumRecords: number;
  private readonly logger?: (record: AnonymousTestRecord) => void;

  constructor(options: AnonymousTestRecorderOptions = {}) {
    this.maximumRecords = options.maximumRecords ?? 500;
    this.logger = options.logger;
  }

  record(input: Omit<AnonymousTestRecord, "recordedAt">): void {
    const record: AnonymousTestRecord = {
      ...input,
      elapsedMs: Math.max(0, Math.round(input.elapsedMs)),
      recordedAt: new Date().toISOString()
    };
    this.records.push(record);
    if (this.records.length > this.maximumRecords) this.records.shift();
    this.logger?.(record);
  }

  snapshot(): AnonymousTestRecord[] {
    return this.records.map((record) => ({ ...record }));
  }
}
