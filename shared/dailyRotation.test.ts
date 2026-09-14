import { describe, expect, test } from "bun:test";
import {
  activeDaypart,
  daypartHours,
  DAYPART_IDS,
  defaultDailyRotationConfig,
  normalizeDailyRotationConfig,
} from "./dailyRotation";

describe("daily rotation configuration", () => {
  test("is off by default and covers every daypart", () => {
    const config = defaultDailyRotationConfig();
    expect(config.enabled).toBe(false);
    expect(config.strength).toBe(60);
    expect(config.dayparts.map((daypart) => daypart.id)).toEqual([...DAYPART_IDS]);
    expect(config.dayparts.every((daypart) => daypart.source === "learned")).toBe(true);
  });

  test("repairs partial documents instead of rejecting them", () => {
    const config = normalizeDailyRotationConfig({
      enabled: true,
      strength: 400,
      dayparts: [
        { id: "morning", startHour: 99, source: "manual", tagUuids: ["a", "a", " b ", ""] },
        { id: "unknown", startHour: 3 },
      ],
    })!;
    expect(config.strength).toBe(100);
    const morning = config.dayparts.find((daypart) => daypart.id === "morning")!;
    expect(morning.startHour).toBe(23);
    expect(morning.tagUuids).toEqual(["a", "b"]);
    // Dayparts missing from the document fall back to their defaults.
    expect(config.dayparts).toHaveLength(DAYPART_IDS.length);
    expect(config.dayparts.find((daypart) => daypart.id === "evening")!.startHour).toBe(18);
  });

  test("accepts the stored JSON string and rejects non-objects", () => {
    expect(normalizeDailyRotationConfig(JSON.stringify(defaultDailyRotationConfig()))).toEqual(defaultDailyRotationConfig());
    expect(normalizeDailyRotationConfig("not json")).toBeNull();
    expect(normalizeDailyRotationConfig([])).toBeNull();
    expect(normalizeDailyRotationConfig(null)).toBeNull();
  });

  test("caps the tag list per daypart", () => {
    const config = normalizeDailyRotationConfig({
      dayparts: [{ id: "night", tagUuids: Array.from({ length: 20 }, (_, index) => `tag-${index}`) }],
    })!;
    expect(config.dayparts.find((daypart) => daypart.id === "night")!.tagUuids).toHaveLength(8);
  });
});

describe("active daypart", () => {
  const enabled = { ...defaultDailyRotationConfig(), enabled: true };

  test("returns nothing while the rotation is off", () => {
    expect(activeDaypart(defaultDailyRotationConfig(), 9)).toBeNull();
  });

  test("selects the window containing the hour", () => {
    expect(activeDaypart(enabled, 6)!.id).toBe("morning");
    expect(activeDaypart(enabled, 10)!.id).toBe("morning");
    expect(activeDaypart(enabled, 11)!.id).toBe("midday");
    expect(activeDaypart(enabled, 17)!.id).toBe("afternoon");
    expect(activeDaypart(enabled, 22)!.id).toBe("evening");
    expect(activeDaypart(enabled, 23)!.id).toBe("night");
  });

  test("wraps the last window past midnight", () => {
    expect(activeDaypart(enabled, 0)!.id).toBe("night");
    expect(activeDaypart(enabled, 5)!.id).toBe("night");
    expect(activeDaypart(enabled, -1)!.id).toBe("night");
    expect(activeDaypart(enabled, 24)!.id).toBe("night");
  });

  test("a disabled daypart hands its hours to the previous one", () => {
    const withoutMidday = {
      ...enabled,
      dayparts: enabled.dayparts.map((daypart) => daypart.id === "midday" ? { ...daypart, enabled: false } : daypart),
    };
    expect(activeDaypart(withoutMidday, 12)!.id).toBe("morning");
    expect(activeDaypart(withoutMidday, 14)!.id).toBe("afternoon");
  });

  test("every hour belongs to exactly one daypart", () => {
    const covered = DAYPART_IDS.flatMap((id) => daypartHours(enabled, id));
    expect(covered.sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, hour) => hour));
  });

  test("daypart windows are visible before the rotation is switched on", () => {
    expect(daypartHours(defaultDailyRotationConfig(), "morning")).toEqual([6, 7, 8, 9, 10]);
  });
});
