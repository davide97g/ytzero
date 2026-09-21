import { log } from "./logger";

/** Wraps a scheduled task so one failed tick is logged under its own tag and never escapes the timer. */
export function guarded(tag: string, task: () => Promise<unknown>): () => void {
  return () => {
    task().catch((error) => log.error(tag, { error: error instanceof Error ? error.message : String(error) }));
  };
}

/** First tick after `delayMs`, then every `intervalMin` minutes. */
export function schedule(tag: string, task: () => Promise<unknown>, delayMs: number, intervalMin: number): void {
  const run = guarded(tag, task);
  setTimeout(run, delayMs);
  setInterval(run, intervalMin * 60_000);
}

/** One task at a time: the next tick is only queued once the current one settles. */
export function scheduleSerially(tag: string, task: () => Promise<unknown>, delayMs: number, intervalMin: number): void {
  const run = () => {
    task()
      .catch((error) => log.error(tag, { error: error instanceof Error ? error.message : String(error) }))
      .finally(() => setTimeout(run, intervalMin * 60_000));
  };
  setTimeout(run, delayMs);
}

/** Reads a positive numeric environment override, falling back when unset or malformed. */
export function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
