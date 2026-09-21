import { describe, expect, test } from "bun:test";
import { formatPublishedAgo, formatTimeAgo } from "./i18n";
import { localeFormats } from "./i18n/localeFormats";

describe("relative time formatting", () => {
  test("omits malformed timestamps instead of throwing during card rendering", () => {
    expect(formatTimeAgo("not-a-timestamp", "en")).toBe("");
    expect(formatTimeAgo(" ", "it")).toBe("");
  });

  test("omits non-finite pre-parsed relative values", () => {
    expect(formatPublishedAgo({ value: Number.NaN, unit: "day" }, "en")).toBe("");
    expect(formatPublishedAgo({ value: Number.POSITIVE_INFINITY, unit: "year" }, "it")).toBe("");
  });
});

test("supports plural rules for both maintained languages", () => {
  expect(localeFormats.en.videoCount(1)).toBe("1 video");
  expect(localeFormats.en.videoCount(2)).toBe("2 videos");
  expect(localeFormats.it.videoCount(2)).toBe("2 video");
  expect(localeFormats.it.channelCount(1)).toBe("1 canale");
  expect(localeFormats.it.channelCount(3)).toBe("3 canali");
  expect(localeFormats.it.ageUnit(1, "months")).toBe("mese");
  expect(localeFormats.it.ageUnit(4, "months")).toBe("mesi");
});
