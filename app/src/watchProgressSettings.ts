import { getUserSetting } from "./db";
import { isWatchProgressValue, normalizeWatchProgressConfig, type WatchProgressConfig } from "../../shared/watchProgress";

/** The profile's watch-progress thresholds, clamped into a usable config.
 * Resolve this once per request and pass it to the shared SQL builders so the
 * feed, the shelves, the playback queues and Recommendations stay in step. */
export function userWatchProgressConfig(userId: number): WatchProgressConfig {
  return normalizeWatchProgressConfig({
    completeRatio: getUserSetting(userId, "feed_complete_ratio"),
    minPosition: getUserSetting(userId, "feed_progress_min_seconds"),
    minDuration: getUserSetting(userId, "feed_progress_min_duration"),
    continueLimit: getUserSetting(userId, "feed_continue_limit"),
  });
}

/** Feed-tuning settings that carry a bounded number, and the config field
 * whose limits they must respect. */
const FEED_TUNING_SETTING_KEYS: Readonly<Record<string, keyof WatchProgressConfig>> = {
  feed_complete_ratio: "completeRatio",
  feed_progress_min_seconds: "minPosition",
  feed_progress_min_duration: "minDuration",
  feed_continue_limit: "continueLimit",
};

/** Rejects a settings write that would need clamping, so a profile never ends
 * up with a threshold it did not choose. Returns null when the body is fine. */
export function feedTuningSettingsError(body: Record<string, unknown>): string | null {
  for (const [key, field] of Object.entries(FEED_TUNING_SETTING_KEYS)) {
    if (key in body && !isWatchProgressValue(body[key], field)) return `invalid ${key}`;
  }
  if ("feed_refresh_scope" in body && body.feed_refresh_scope !== "videos" && body.feed_refresh_scope !== "everything") {
    return "invalid feed refresh scope";
  }
  if ("feed_sort" in body && body.feed_sort !== "published" && body.feed_sort !== "arrival") return "invalid feed sort";
  return null;
}

/** Rebuilds a config from a recommendation-scorer settings record. */
export function settingsWatchProgress(settings: Record<string, number>): WatchProgressConfig {
  return normalizeWatchProgressConfig({
    completeRatio: settings.complete_ratio,
    minPosition: settings.progress_min_position,
    minDuration: settings.progress_min_duration,
  });
}
