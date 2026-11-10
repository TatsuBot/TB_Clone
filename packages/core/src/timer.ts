import { RULES } from './rules';

/**
 * Pure move timer: the caller supplies timestamps, so tests use a fake clock.
 * Starts only on the first successful grid step; planning time before that is unlimited.
 */
export class MoveTimer {
  private startedAt: number | null = null;

  constructor(readonly durationMs: number = RULES.moveTimerMs) {}

  /** Idempotent: only the first call starts the clock. */
  start(now: number): void {
    if (this.startedAt === null) this.startedAt = now;
  }

  get started(): boolean {
    return this.startedAt !== null;
  }

  remainingMs(now: number): number {
    if (this.startedAt === null) return this.durationMs;
    return Math.max(0, this.durationMs - (now - this.startedAt));
  }

  /** 1 = full, 0 = expired. Drives the shrinking bar. */
  fraction(now: number): number {
    return this.remainingMs(now) / this.durationMs;
  }

  expired(now: number): boolean {
    return this.startedAt !== null && now - this.startedAt >= this.durationMs;
  }
}
