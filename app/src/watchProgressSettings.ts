import { getUserSetting } from "./db";
import { normalizeWatchProgressConfig, type WatchProgressConfig } from "../../shared/watchProgress";

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
