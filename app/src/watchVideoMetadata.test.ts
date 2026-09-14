import { describe, expect, test } from "bun:test";
import { watchVideoMetadataIncomplete } from "./watchVideoMetadata";
import type { VideoRow } from "./videoRoutesSupport";

function row(overrides: Partial<VideoRow> = {}): VideoRow {
  return {
    video_id: "vid", channel_id: "UC", title: "Title", description: "A description",
    thumbnail: "thumb.jpg", published_at: "2026-09-14T08:00:00Z", found_at: "2026-09-14T08:05:00Z",
    published_at_approximate: 0, members_only: 0, is_private: 0, is_unavailable: 0, external: 0,
    live_status: "none", status: "inbox", bucket: null, is_short: 0, views: 1000, likes: 10,
    liked: 0, watched: 0, in_history: 0, channel_title: "Channel",
    ...overrides,
  };
}

describe("watchVideoMetadataIncomplete", () => {
  test("accepts a row the scrape stored without description or counters", () => {
    expect(watchVideoMetadataIncomplete(row({ description: "", views: null, likes: null }))).toBe(true);
  });

  test("accepts a row whose publication date is only approximate", () => {
    expect(watchVideoMetadataIncomplete(row({ published_at_approximate: 1 }))).toBe(true);
  });

  test("leaves a complete row alone", () => {
    expect(watchVideoMetadataIncomplete(row())).toBe(false);
  });

  test("keeps a missing like count out of the decision", () => {
    expect(watchVideoMetadataIncomplete(row({ likes: null }))).toBe(false);
  });

  test("leaves a TubeArchivist-owned row to its own library", () => {
    expect(watchVideoMetadataIncomplete(row({ description: "", views: null, tubearchivist_available: 1 }))).toBe(false);
  });

  test("never refetches a private or unavailable video", () => {
    expect(watchVideoMetadataIncomplete(row({ description: "", is_private: 1 }))).toBe(false);
    expect(watchVideoMetadataIncomplete(row({ description: "", is_unavailable: 1 }))).toBe(false);
  });
});
