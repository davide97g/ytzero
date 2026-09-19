// One definition of "how far through a video am I", shared by the feed, the
// Continue watching shelf, the playback queues and recommendations. Every
// surface must agree: a video the feed hides as already seen has to be the
// same video the shelf refuses to offer again.
//
// The numbers are per profile (Settings -> Display -> Feed tuning). Callers
// resolve a config once and hand it to the helpers and SQL builders below, so
// no surface can drift onto its own hardcoded threshold.

export interface WatchProgressConfig {
  /** At or past this fraction the video counts as seen: skipped by the feed,
   *  gone from Continue watching. Anything under it is worth finishing. */
  completeRatio: number;
  /** The first seconds are a look, not a watch. */
  minPosition: number;
  /** Below this a video is too short for a resume point to mean anything. */
  minDuration: number;
  /** How many videos the Continue watching shelf offers at once. */
  continueLimit: number;
}

export const WATCH_PROGRESS_DEFAULTS: Readonly<WatchProgressConfig> = Object.freeze({
  completeRatio: 0.92,
  minPosition: 3,
  minDuration: 30,
  continueLimit: 20,
});

export const WATCH_PROGRESS_LIMITS = {
  completeRatio: { min: 0.5, max: 1 },
  minPosition: { min: 0, max: 600 },
  minDuration: { min: 0, max: 3600 },
  continueLimit: { min: 5, max: 100 },
} as const;

export type WatchProgressInputConfig = Partial<Record<keyof WatchProgressConfig, unknown>>;

function bounded(value: unknown, fallback: number, key: keyof WatchProgressConfig, integer: boolean): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || value === "" || value == null) return fallback;
  const { min, max } = WATCH_PROGRESS_LIMITS[key];
  return Math.max(min, Math.min(max, integer ? Math.round(number) : number));
}

/** Clamps stored strings into a usable config; anything missing or unparsable
 *  falls back to the default rather than disabling the rule. */
export function normalizeWatchProgressConfig(input: WatchProgressInputConfig = {}): WatchProgressConfig {
  return {
    completeRatio: bounded(input.completeRatio, WATCH_PROGRESS_DEFAULTS.completeRatio, "completeRatio", false),
    minPosition: bounded(input.minPosition, WATCH_PROGRESS_DEFAULTS.minPosition, "minPosition", true),
    minDuration: bounded(input.minDuration, WATCH_PROGRESS_DEFAULTS.minDuration, "minDuration", true),
    continueLimit: bounded(input.continueLimit, WATCH_PROGRESS_DEFAULTS.continueLimit, "continueLimit", true),
  };
}

/** True when a raw value is storable as-is, i.e. clamping would change it. */
export function isWatchProgressValue(value: unknown, key: keyof WatchProgressConfig): boolean {
  const number = typeof value === "number" ? value : Number(value);
  if (value === "" || value == null || !Number.isFinite(number)) return false;
  const { min, max } = WATCH_PROGRESS_LIMITS[key];
  return number >= min && number <= max;
}

export interface WatchProgressInput {
  watch_position?: number | null;
  watch_duration?: number | null;
}

/** The watched fraction, or null when there is no meaningful progress yet. */
export function watchProgressRatio(
  input: WatchProgressInput,
  config: WatchProgressConfig = WATCH_PROGRESS_DEFAULTS,
): number | null {
  const position = Number(input.watch_position);
  const duration = Number(input.watch_duration);
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return null;
  if (duration <= config.minDuration || position < config.minPosition) return null;
  return Math.max(0, position / duration);
}

/** Started, not finished — belongs in Continue watching. */
export function isContinueWatching(input: WatchProgressInput, config: WatchProgressConfig = WATCH_PROGRESS_DEFAULTS): boolean {
  const ratio = watchProgressRatio(input, config);
  return ratio !== null && ratio < config.completeRatio;
}

/** Watched far enough to count as seen — the feed skips it. */
export function isNearlyComplete(input: WatchProgressInput, config: WatchProgressConfig = WATCH_PROGRESS_DEFAULTS): boolean {
  const ratio = watchProgressRatio(input, config);
  return ratio !== null && ratio >= config.completeRatio;
}

/** SQL predicate: the row carries a resume point worth acting on. */
export function meaningfulProgressSql(config: WatchProgressConfig = WATCH_PROGRESS_DEFAULTS, alias = "uv"): string {
  return `(${alias}.watch_position IS NOT NULL AND ${alias}.watch_duration IS NOT NULL
    AND ${alias}.watch_duration > ${config.minDuration}
    AND ${alias}.watch_position >= ${config.minPosition})`;
}

/** SQL predicate matching {@link isContinueWatching}. */
export function continueWatchingSql(config: WatchProgressConfig = WATCH_PROGRESS_DEFAULTS, alias = "uv"): string {
  return `(${meaningfulProgressSql(config, alias)}
    AND CAST(${alias}.watch_position AS REAL) / ${alias}.watch_duration < ${config.completeRatio})`;
}

/** SQL predicate matching {@link isNearlyComplete}. */
export function nearlyCompleteSql(config: WatchProgressConfig = WATCH_PROGRESS_DEFAULTS, alias = "uv"): string {
  return `(${meaningfulProgressSql(config, alias)}
    AND CAST(${alias}.watch_position AS REAL) / ${alias}.watch_duration >= ${config.completeRatio})`;
}
