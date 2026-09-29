import { describe, expect, test } from "bun:test";
import { formatPlaylistVideoCount } from "../src/i18n";

describe("playlist video-count localization", () => {
  test("replaces YouTube's English label with the active locale", () => {
    expect(formatPlaylistVideoCount("1 video", "it")).toBe("1 video");
    expect(formatPlaylistVideoCount("2 videos", "it")).toBe("2 video");
    expect(formatPlaylistVideoCount("7 videos", "it")).toBe("7 video");
  });

  test("normalizes compact counts before applying plural rules", () => {
    expect(formatPlaylistVideoCount("1.2K videos", "en")).toBe("1200 videos");
    expect(formatPlaylistVideoCount("1.2K videos", "it")).toBe("1200 video");
  });
});
