import { describe, expect, test } from "bun:test";
import { candidateIsEligible, mergeCandidates, scoreExternalCandidate, type ExternalCandidate } from "./discoveryExternal";
import type { DiscoverySeed } from "./discoverySeeds";
import type { RelatedVideo } from "./youtubeRelated";

const now = Date.parse("2026-09-19T12:00:00Z");

const settings: Record<string, number> = {
  outside_base_points: 600,
  cooccurrence_points: 1200,
  outside_seed_points: 300,
  novelty_penalty: 400,
  recency_points: 18,
  min_view_count: 500,
  min_duration_minutes: 4,
  external_limit: 24,
};

function seed(videoId: string, weight = 1): DiscoverySeed {
  return { videoId, channelId: `UC-${videoId}`, title: videoId, weight, completion: 1, ageDays: 0, pulseSeconds: 0, liked: false, tagIds: [] };
}

function related(patch: Partial<RelatedVideo> = {}): RelatedVideo {
  return {
    videoId: "out-1",
    title: "A long careful explanation",
    thumbnail: "https://i.ytimg.com/out.jpg",
    durationText: "22:00",
    durationSeconds: 1320,
    channelId: "UC-outside",
    channelTitle: "Outside Channel",
    channelAvatar: null,
    viewCount: 50_000,
    published: { value: 5, unit: "day" },
    live: false,
    position: 0,
    source: "related",
    ...patch,
  };
}

function candidate(patch: Partial<ExternalCandidate> = {}): ExternalCandidate {
  return { ...related(), seedIds: new Set(["s1"]), seedWeightSum: 1, bestPosition: 0, ...patch };
}

describe("co-occurrence merge", () => {
  test("counts distinct seeds and keeps the best position", () => {
    const merged = mergeCandidates([
      { seed: seed("s1", 1), videos: [related({ position: 4 })] },
      { seed: seed("s2", 0.5), videos: [related({ position: 1 })] },
      { seed: seed("s2", 0.5), videos: [related({ position: 0 })] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].seedIds.size).toBe(2);
    expect(merged[0].seedWeightSum).toBeCloseTo(1.5, 6);
    expect(merged[0].bestPosition).toBe(0);
  });

  test("a thinner mix row fills in what the sidebar card lacked", () => {
    const merged = mergeCandidates([
      { seed: seed("s1"), videos: [related({ durationSeconds: null, durationText: "", viewCount: null })] },
      { seed: seed("s2"), videos: [related({ source: "mix" })] },
    ]);
    expect(merged[0].durationSeconds).toBe(1320);
    expect(merged[0].viewCount).toBe(50_000);
  });
});

describe("eligibility", () => {
  const blocked = new Set<string>();

  test("accepts an ordinary long video", () => {
    expect(candidateIsEligible(candidate(), settings, blocked)).toBe(true);
  });

  test("rejects live, short, unpopular and unidentified cards", () => {
    expect(candidateIsEligible(candidate({ live: true }), settings, blocked)).toBe(false);
    expect(candidateIsEligible(candidate({ durationSeconds: 120, durationText: "2:00" }), settings, blocked)).toBe(false);
    // A missing duration is how live rows and placeholders look.
    expect(candidateIsEligible(candidate({ durationSeconds: null }), settings, blocked)).toBe(false);
    expect(candidateIsEligible(candidate({ viewCount: 12 }), settings, blocked)).toBe(false);
    expect(candidateIsEligible(candidate({ channelId: "" }), settings, blocked)).toBe(false);
    expect(candidateIsEligible(candidate({ title: "cat clip #shorts" }), settings, blocked)).toBe(false);
  });

  test("honours the profile's blocked terms", () => {
    expect(candidateIsEligible(candidate({ title: "Crypto millionaire secrets" }), settings, new Set(["crypto"]))).toBe(false);
  });
});

describe("scoring", () => {
  const followed = new Set(["UC-followed"]);

  test("more distinct seeds beat one", () => {
    const many = scoreExternalCandidate(candidate({ seedIds: new Set(["a", "b", "c", "d"]) }), settings, followed, now);
    const one = scoreExternalCandidate(candidate(), settings, followed, now);
    expect(many.score).toBeGreaterThan(one.score);
    expect(many.reasons).toContain("linked to several videos you watched");
  });

  test("a channel you already follow is worth less than a new one", () => {
    const known = scoreExternalCandidate(candidate({ channelId: "UC-followed" }), settings, followed, now);
    const fresh = scoreExternalCandidate(candidate(), settings, followed, now);
    expect(fresh.score).toBeGreaterThan(known.score);
    expect(fresh.reasons).toContain("new channel");
  });

  test("a card buried at the bottom of a list is weaker", () => {
    const top = scoreExternalCandidate(candidate({ bestPosition: 0 }), settings, followed, now);
    const bottom = scoreExternalCandidate(candidate({ bestPosition: 30 }), settings, followed, now);
    expect(bottom.score).toBeLessThan(top.score);
  });

  test("outside evidence never reaches the current-hour Pulse tier", () => {
    const strongest = scoreExternalCandidate(
      candidate({ seedIds: new Set(["a", "b", "c", "d", "e", "f", "g", "h"]), seedWeightSum: 99 }),
      settings,
      followed,
      now,
    );
    // 5_000 is the channel-of-this-hour tier in recommendationRanking.
    expect(strongest.score).toBeLessThan(5_000);
  });
});
