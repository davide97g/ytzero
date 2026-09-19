import { describe, expect, test } from "bun:test";
import {
  continueWatchingSql,
  isContinueWatching,
  isNearlyComplete,
  isWatchProgressValue,
  nearlyCompleteSql,
  normalizeWatchProgressConfig,
  watchProgressRatio,
  WATCH_PROGRESS_DEFAULTS,
} from "./watchProgress";

describe("watch progress", () => {
  test("ignores glances and clips too short to resume", () => {
    expect(watchProgressRatio({ watch_position: 2.9, watch_duration: 100 })).toBeNull();
    expect(watchProgressRatio({ watch_position: 10, watch_duration: 30 })).toBeNull();
    expect(watchProgressRatio({ watch_position: null, watch_duration: 100 })).toBeNull();
    expect(watchProgressRatio({ watch_position: 3, watch_duration: 31 })).toBeCloseTo(3 / 31, 8);
  });

  test("splits partials from videos already seen", () => {
    expect(isContinueWatching({ watch_position: 910, watch_duration: 1000 })).toBe(true);
    expect(isNearlyComplete({ watch_position: 910, watch_duration: 1000 })).toBe(false);
    expect(isContinueWatching({ watch_position: 920, watch_duration: 1000 })).toBe(false);
    expect(isNearlyComplete({ watch_position: 920, watch_duration: 1000 })).toBe(true);
    // Untouched videos belong to neither shelf.
    expect(isContinueWatching({})).toBe(false);
    expect(isNearlyComplete({})).toBe(false);
  });

  test("follows a profile's own thresholds", () => {
    const config = normalizeWatchProgressConfig({ completeRatio: "0.75", minPosition: "10", minDuration: "60" });
    expect(config).toEqual({ completeRatio: 0.75, minPosition: 10, minDuration: 60, continueLimit: 20 });
    expect(isNearlyComplete({ watch_position: 800, watch_duration: 1000 }, config)).toBe(true);
    expect(isNearlyComplete({ watch_position: 800, watch_duration: 1000 })).toBe(false);
    // Too early, and too short, under this profile's own minimums.
    expect(isContinueWatching({ watch_position: 9, watch_duration: 1000 }, config)).toBe(false);
    expect(isContinueWatching({ watch_position: 30, watch_duration: 50 }, config)).toBe(false);
  });

  test("clamps stored values and falls back on nonsense", () => {
    expect(normalizeWatchProgressConfig({ completeRatio: "2", continueLimit: "1000" }))
      .toEqual({ ...WATCH_PROGRESS_DEFAULTS, completeRatio: 1, continueLimit: 100 });
    expect(normalizeWatchProgressConfig({ completeRatio: "", minPosition: "abc" }))
      .toEqual({ ...WATCH_PROGRESS_DEFAULTS });
    expect(normalizeWatchProgressConfig()).toEqual({ ...WATCH_PROGRESS_DEFAULTS });
  });

  test("accepts only in-range values on the way in", () => {
    expect(isWatchProgressValue("0.8", "completeRatio")).toBe(true);
    expect(isWatchProgressValue("0.2", "completeRatio")).toBe(false);
    expect(isWatchProgressValue("1.5", "completeRatio")).toBe(false);
    expect(isWatchProgressValue("", "minPosition")).toBe(false);
    expect(isWatchProgressValue("120", "continueLimit")).toBe(false);
  });

  test("keeps the SQL predicates on the same ratio as the helpers", () => {
    const config = normalizeWatchProgressConfig({ completeRatio: "0.5", minDuration: "120" });
    expect(continueWatchingSql(config)).toContain("< 0.5");
    expect(continueWatchingSql(config)).toContain("watch_duration > 120");
    expect(nearlyCompleteSql()).toContain(`>= ${WATCH_PROGRESS_DEFAULTS.completeRatio}`);
    expect(continueWatchingSql(WATCH_PROGRESS_DEFAULTS, "progress")).toContain("progress.watch_position");
  });
});
