import { database } from "./database";
import { tokenizeDiscoveryText } from "./discoveryKeywords";
import { selectDiscoverySeeds, type DiscoverySeed } from "./discoverySeeds";
import { log } from "./logger";
import { relativePublishedAt } from "./youtube";
import { fetchMixVideos, fetchRelatedVideos, type RelatedVideo } from "./youtubeRelated";
import { isYouTubeRefusalError } from "./youtubeRateLimit";

/** A video YouTube itself associated with one or more of the profile's seeds. */
export interface ExternalCandidate extends RelatedVideo {
  /** Distinct seeds that pointed here — the co-watch evidence. */
  seedIds: Set<string>;
  seedWeightSum: number;
  bestPosition: number;
}

export interface ExternalCandidateScore {
  videoId: string;
  score: number;
  reasons: string[];
  query: string | null;
}

export interface BuildExternalOptions {
  fetchImpl?: typeof fetch;
  /** Hard ceiling on InnerTube calls for one cycle. */
  budget?: number;
  now?: () => number;
}

/** One cycle may never spend more than this, however many seeds it has. */
export const MAX_NEXT_REQUESTS_PER_CYCLE = 20;
/** Mixes are deeper but pricier, so only the strongest seeds get one. */
export const MIX_SEED_COUNT = 4;

function numeric(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mergeCandidates(batches: { seed: DiscoverySeed; videos: RelatedVideo[] }[]): ExternalCandidate[] {
  const merged = new Map<string, ExternalCandidate>();
  for (const batch of batches) {
    for (const video of batch.videos) {
      const existing = merged.get(video.videoId);
      if (existing) {
        if (!existing.seedIds.has(batch.seed.videoId)) {
          existing.seedIds.add(batch.seed.videoId);
          existing.seedWeightSum += batch.seed.weight;
        }
        existing.bestPosition = Math.min(existing.bestPosition, video.position);
        // Keep the richest description: a mix row carries less than a sidebar card.
        if (!existing.durationSeconds && video.durationSeconds) {
          existing.durationText = video.durationText;
          existing.durationSeconds = video.durationSeconds;
        }
        if (existing.viewCount == null && video.viewCount != null) existing.viewCount = video.viewCount;
        if (!existing.published && video.published) existing.published = video.published;
        if (!existing.channelId && video.channelId) {
          existing.channelId = video.channelId;
          existing.channelTitle = video.channelTitle;
        }
        continue;
      }
      merged.set(video.videoId, {
        ...video,
        seedIds: new Set([batch.seed.videoId]),
        seedWeightSum: batch.seed.weight,
        bestPosition: video.position,
      });
    }
  }
  return [...merged.values()];
}

export function candidateIsEligible(
  candidate: ExternalCandidate,
  settings: Record<string, number>,
  blockedTerms: Set<string>,
): boolean {
  if (candidate.live) return false;
  // A missing duration is how live rows, premieres and radio placeholders look,
  // and it is also what would let a Short through unnoticed.
  const minSeconds = Math.max(180, numeric(settings.min_duration_minutes, 4) * 60);
  if (candidate.durationSeconds == null || candidate.durationSeconds <= minSeconds) return false;
  if (/#shorts?\b/i.test(candidate.title)) return false;
  if (!candidate.channelId) return false;
  const minViews = Math.max(0, numeric(settings.min_view_count, 500));
  if (minViews > 0 && candidate.viewCount != null && candidate.viewCount < minViews) return false;
  if (blockedTerms.size > 0) {
    for (const token of tokenizeDiscoveryText(`${candidate.title} ${candidate.channelTitle}`)) {
      if (blockedTerms.has(token)) return false;
    }
  }
  return true;
}

/** Deliberately bounded below the local Pulse tiers: YouTube's co-watch graph
 * is evidence about the world, the profile's own hour-by-hour habits are
 * evidence about this viewer, and the viewer wins. */
export function scoreExternalCandidate(
  candidate: ExternalCandidate,
  settings: Record<string, number>,
  followedChannels: Set<string>,
  nowMs: number,
): { score: number; reasons: string[] } {
  const reasons = ["from your watch history"];
  let score = numeric(settings.outside_base_points, 600);

  const seeds = candidate.seedIds.size;
  score += numeric(settings.cooccurrence_points, 1200) * Math.log1p(seeds);
  if (seeds > 1) reasons.push("linked to several videos you watched");

  score += Math.min(900, numeric(settings.outside_seed_points, 300) * candidate.seedWeightSum);

  const publishedAt = candidate.published ? Date.parse(relativePublishedAt(candidate.published, new Date(nowMs))) : Number.NaN;
  const ageDays = Number.isFinite(publishedAt) ? Math.max(0, (nowMs - publishedAt) / 86_400_000) : 90;
  const freshness = Math.max(0, numeric(settings.recency_points, 18) - Math.floor(ageDays / 7));
  if (freshness > 0) {
    score += freshness;
    reasons.push("recent");
  }

  if (followedChannels.has(candidate.channelId)) {
    // The subscription feed already covers these; discovery is for the rest.
    score -= numeric(settings.novelty_penalty, 400);
  } else {
    reasons.push("new channel");
  }

  // A card YouTube put near the top of a sidebar is stronger evidence than one
  // buried at the bottom of a mix.
  score *= 1 / (1 + candidate.bestPosition / 10);
  return { score, reasons };
}

async function readBlockedTerms(uid: number): Promise<Set<string>> {
  const row = await database.prepare(
    "SELECT value FROM plugin_state WHERE plugin_id = 'discovery' AND user_id = ? AND key = 'blocked_terms'",
  ).get(uid) as { value: string | null } | null;
  try {
    const parsed = JSON.parse(row?.value ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((term: unknown): term is string => typeof term === "string") : []);
  } catch {
    return new Set();
  }
}

async function followedChannelIds(uid: number): Promise<Set<string>> {
  const rows = await database.prepare(
    "SELECT channel_id FROM user_channels WHERE user_id = ? AND followed = 1",
  ).all(uid) as { channel_id: string }[];
  return new Set(rows.map((row) => row.channel_id));
}

async function knownVideoIds(uid: number, videoIds: string[]): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set();
  const placeholders = videoIds.map(() => "?").join(",");
  const rows = await database.prepare(`
    SELECT v.video_id FROM videos v
    LEFT JOIN user_videos uv ON uv.video_id = v.video_id AND uv.user_id = ?
    WHERE v.video_id IN (${placeholders})
      AND (
        COALESCE(uv.watched, 0) = 1
        OR COALESCE(uv.status, 'inbox') != 'inbox'
        OR EXISTS (SELECT 1 FROM history h WHERE h.user_id = ? AND h.video_id = v.video_id)
        OR EXISTS (
          SELECT 1 FROM recommendation_feedback rf
          WHERE rf.user_id = ? AND rf.video_id = v.video_id AND rf.action IN ('dismiss', 'less_like_this')
        )
      )
  `).all(uid, ...videoIds, uid, uid) as { video_id: string }[];
  return new Set(rows.map((row) => row.video_id));
}

/** Everything written here came with the card, so importing a candidate costs
 * no extra request. Exact dates and durations are repaired later by the
 * ordinary metadata refresher. */
export async function persistExternalCandidate(candidate: ExternalCandidate, nowMs: number): Promise<void> {
  const publishedAt = candidate.published
    ? relativePublishedAt(candidate.published, new Date(nowMs))
    : new Date(nowMs).toISOString();
  await database.prepare(`
    INSERT INTO channels (channel_id, title, url, thumbnail, followed, external)
    VALUES (?, ?, ?, ?, 0, 1)
    ON CONFLICT(channel_id) DO UPDATE SET
      title = CASE WHEN channels.title = '' OR channels.title IS NULL THEN excluded.title ELSE channels.title END,
      thumbnail = CASE WHEN channels.thumbnail = '' OR channels.thumbnail IS NULL THEN excluded.thumbnail ELSE channels.thumbnail END
  `).run(
    candidate.channelId,
    candidate.channelTitle,
    `https://www.youtube.com/channel/${candidate.channelId}`,
    candidate.channelAvatar ?? "",
  );

  // `external` is absent from the update list on purpose: a video the library
  // already owns must never be downgraded to a temporary recommendation row.
  await database.prepare(`
    INSERT INTO videos
      (video_id, channel_id, title, description, thumbnail, published_at, published_at_approximate,
       live_status, status, views, duration, is_short, external)
    VALUES (?, ?, ?, '', ?, ?, 1, 'none', 'inbox', ?, ?, 0, 1)
    ON CONFLICT(video_id) DO UPDATE SET
      title = CASE WHEN videos.title = '' OR videos.title IS NULL THEN excluded.title ELSE videos.title END,
      thumbnail = CASE WHEN TRIM(COALESCE(videos.thumbnail, '')) = '' THEN excluded.thumbnail ELSE videos.thumbnail END,
      views = COALESCE(videos.views, excluded.views),
      duration = COALESCE(videos.duration, excluded.duration),
      is_short = CASE WHEN videos.is_short = 1 THEN 1 ELSE COALESCE(videos.is_short, excluded.is_short) END
  `).run(
    candidate.videoId,
    candidate.channelId,
    candidate.title,
    candidate.thumbnail,
    publishedAt,
    candidate.viewCount,
    candidate.durationText || null,
  );
}

export async function buildExternalCandidates(
  uid: number,
  settings: Record<string, number>,
  options: BuildExternalOptions = {},
): Promise<ExternalCandidateScore[]> {
  const nowMs = (options.now ?? Date.now)();
  const seedLimit = Math.max(1, Math.floor(numeric(settings.seed_count, 12)));
  const seeds = await selectDiscoverySeeds(uid, seedLimit);
  if (seeds.length === 0) return [];

  let budget = Math.max(1, Math.floor(options.budget ?? MAX_NEXT_REQUESTS_PER_CYCLE));
  const batches: { seed: DiscoverySeed; videos: RelatedVideo[] }[] = [];
  const fetchOptions = { userId: uid, fetchImpl: options.fetchImpl };

  for (const [index, seed] of seeds.entries()) {
    if (budget <= 0) break;
    budget--;
    batches.push({ seed, videos: await fetchRelatedVideos(seed.videoId, fetchOptions) });
    if (index < MIX_SEED_COUNT && budget > 0) {
      budget--;
      batches.push({ seed, videos: await fetchMixVideos(seed.videoId, fetchOptions) });
    }
  }

  const blockedTerms = await readBlockedTerms(uid);
  const followed = await followedChannelIds(uid);
  const merged = mergeCandidates(batches).filter((candidate) => candidateIsEligible(candidate, settings, blockedTerms));
  const known = await knownVideoIds(uid, merged.map((candidate) => candidate.videoId));

  const scored = merged
    .filter((candidate) => !known.has(candidate.videoId))
    .map((candidate) => ({ candidate, ...scoreExternalCandidate(candidate, settings, followed, nowMs) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.videoId.localeCompare(b.candidate.videoId));

  const limit = Math.max(0, Math.floor(numeric(settings.external_limit, 24)));
  const out: ExternalCandidateScore[] = [];
  for (const entry of scored.slice(0, limit)) {
    await persistExternalCandidate(entry.candidate, nowMs);
    out.push({
      videoId: entry.candidate.videoId,
      score: entry.score,
      reasons: entry.reasons,
      query: null,
    });
  }
  log.info("discovery.external_built", {
    uid,
    seeds: seeds.length,
    candidates: merged.length,
    imported: out.length,
    requestsLeft: budget,
  });
  return out;
}

/** Temporary videos that nobody kept are deleted a week later. Without this the
 * library slowly fills with material the viewer never asked for. */
export async function pruneDiscoveryCandidates(): Promise<void> {
  await database.prepare(`
    DELETE FROM videos
    WHERE external = 1
      AND COALESCE(created_at, '') < datetime('now', '-7 days')
      AND NOT EXISTS (SELECT 1 FROM discovery_recommendations dr WHERE dr.video_id = videos.video_id)
      AND NOT EXISTS (
        SELECT 1 FROM user_videos uv
        WHERE uv.video_id = videos.video_id
          AND (uv.status = 'queued' OR uv.liked = 1 OR uv.watch_position IS NOT NULL)
      )
      AND NOT EXISTS (SELECT 1 FROM user_playlist_videos upv WHERE upv.video_id = videos.video_id)
      AND NOT EXISTS (SELECT 1 FROM history h WHERE h.video_id = videos.video_id)
      AND NOT EXISTS (SELECT 1 FROM social_posts sp WHERE sp.video_id = videos.video_id)
  `).run();
  await database.prepare(
    "DELETE FROM channels WHERE external = 1 AND channel_id NOT IN (SELECT DISTINCT channel_id FROM videos)",
  ).run();
}

export function isDiscoveryRefusal(error: unknown): boolean {
  return isYouTubeRefusalError(error);
}
