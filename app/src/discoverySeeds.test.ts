import { describe, expect, test } from "bun:test";
import { diversifySeeds, seedFromRow, seedWeight, SEED_HALF_LIFE_DAYS, type DiscoverySeed, type SeedRow } from "./discoverySeeds";

const now = Date.parse("2026-09-19T12:00:00Z");

function isoDaysAgo(days: number) {
  return new Date(now - days * 86_400_000).toISOString().replace("T", " ").slice(0, 19);
}

function row(patch: Partial<SeedRow> = {}): SeedRow {
  return {
    video_id: "v1",
    channel_id: "UC-a",
    title: "Something",
    watched_at: isoDaysAgo(0),
    watch_position: 600,
    watch_duration: 600,
    liked: 0,
    pulse_seconds: 0,
    tag_ids: null,
    ...patch,
  };
}

describe("seed weight", () => {
  test("a finished video outweighs an abandoned one", () => {
    const finished = seedWeight(row({ watch_position: 590, watch_duration: 600 }), now);
    const abandoned = seedWeight(row({ watch_position: 180, watch_duration: 600 }), now);
    expect(finished).toBeGreaterThan(abandoned);
  });

  test("a barely-started video is no evidence of taste unless it was liked", () => {
    expect(seedWeight(row({ watch_position: 10, watch_duration: 600 }), now)).toBe(0);
    expect(seedWeight(row({ watch_position: 10, watch_duration: 600, liked: 1 }), now)).toBeGreaterThan(0);
  });

  test("half the weight is gone after one half-life", () => {
    const fresh = seedWeight(row(), now);
    const old = seedWeight(row({ watched_at: isoDaysAgo(SEED_HALF_LIFE_DAYS) }), now);
    expect(old).toBeCloseTo(fresh / 2, 5);
  });

  test("liking and watching around this hour both lift a seed", () => {
    const plain = seedWeight(row(), now);
    expect(seedWeight(row({ liked: 1 }), now)).toBeGreaterThan(plain);
    expect(seedWeight(row({ pulse_seconds: 900 }), now)).toBeGreaterThan(plain);
  });

  test("a video with no watch record at all falls back to a year old", () => {
    const seed = seedFromRow(row({ watched_at: null }), now);
    expect(seed.ageDays).toBe(365);
  });

  test("tag ids arrive as a grouped string", () => {
    expect(seedFromRow(row({ tag_ids: "4,9,notanumber" }), now).tagIds).toEqual([4, 9]);
  });
});

function seed(patch: Partial<DiscoverySeed>): DiscoverySeed {
  return {
    videoId: "v", channelId: "UC-a", title: "t", weight: 1, completion: 1,
    ageDays: 0, pulseSeconds: 0, liked: false, tagIds: [], ...patch,
  };
}

describe("seed diversity", () => {
  test("one channel cannot own the seed set", () => {
    const seeds = [
      seed({ videoId: "a1", weight: 9 }),
      seed({ videoId: "a2", weight: 8 }),
      seed({ videoId: "a3", weight: 7 }),
      seed({ videoId: "b1", channelId: "UC-b", weight: 1 }),
    ];
    expect(diversifySeeds(seeds, 4).map((item) => item.videoId)).toEqual(["a1", "a2", "b1"]);
  });

  test("one tag cannot own the seed set either", () => {
    const seeds = [1, 2, 3, 4].map((index) => seed({ videoId: `t${index}`, channelId: `UC-${index}`, weight: 10 - index, tagIds: [7] }));
    expect(diversifySeeds(seeds, 4)).toHaveLength(3);
  });

  test("weightless seeds are dropped and ordering is deterministic", () => {
    const seeds = [seed({ videoId: "z", weight: 0 }), seed({ videoId: "y", channelId: "UC-y", weight: 2 })];
    expect(diversifySeeds(seeds, 5).map((item) => item.videoId)).toEqual(["y"]);
    expect(diversifySeeds(seeds, 5)).toEqual(diversifySeeds(seeds, 5));
  });
});
