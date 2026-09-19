import { database } from "./database";
import { effectiveVideoTagsCte } from "./insightTags";
import { recommendationHoursNear } from "./recommendationRanking";
import { storedUtcTimestampMs, zonedDayHour } from "./timeZone";

/** A video from the profile's own history, used to ask YouTube what people who
 * watched it went on to watch. */
export interface DiscoverySeed {
  videoId: string;
  channelId: string;
  title: string;
  weight: number;
  completion: number | null;
  ageDays: number;
  pulseSeconds: number;
  liked: boolean;
  tagIds: number[];
}

export interface SeedRow {
  video_id: string;
  channel_id: string;
  title: string;
  watched_at?: string | null;
  watch_position?: number | null;
  watch_duration?: number | null;
  liked?: number | null;
  pulse_seconds?: number | null;
  tag_ids?: string | null;
}

/** Recent, finished and liked material is the best evidence of taste. Half of
 * the weight disappears every fortnight so an old obsession fades on its own. */
export const SEED_HALF_LIFE_DAYS = 14;

function completionFactor(completion: number | null, liked: boolean): number {
  if (completion == null) return liked ? 0.4 : 0;
  if (completion >= 0.9) return 1;
  if (completion >= 0.5) return 0.6;
  if (completion >= 0.25) return 0.25;
  return liked ? 0.4 : 0;
}

export function seedWeight(row: SeedRow, nowMs: number): number {
  const position = Number(row.watch_position ?? 0);
  const duration = Number(row.watch_duration ?? 0);
  const completion = duration > 0 ? Math.min(1, Math.max(0, position / duration)) : null;
  const liked = row.liked === 1;
  const watchedAt = row.watched_at ? storedUtcTimestampMs(row.watched_at) : Number.NaN;
  const ageDays = Number.isFinite(watchedAt) ? Math.max(0, (nowMs - watchedAt) / 86_400_000) : 365;
  const pulseSeconds = Math.max(0, Number(row.pulse_seconds ?? 0));
  const base = completionFactor(completion, liked);
  if (base <= 0) return 0;
  return base
    * 0.5 ** (ageDays / SEED_HALF_LIFE_DAYS)
    * (liked ? 1.5 : 1)
    * (pulseSeconds > 0 ? 1.35 : 1);
}

export function seedFromRow(row: SeedRow, nowMs: number): DiscoverySeed {
  const position = Number(row.watch_position ?? 0);
  const duration = Number(row.watch_duration ?? 0);
  const watchedAt = row.watched_at ? storedUtcTimestampMs(row.watched_at) : Number.NaN;
  return {
    videoId: row.video_id,
    channelId: row.channel_id ?? "",
    title: row.title ?? "",
    weight: seedWeight(row, nowMs),
    completion: duration > 0 ? Math.min(1, Math.max(0, position / duration)) : null,
    ageDays: Number.isFinite(watchedAt) ? Math.max(0, (nowMs - watchedAt) / 86_400_000) : 365,
    pulseSeconds: Math.max(0, Number(row.pulse_seconds ?? 0)),
    liked: row.liked === 1,
    tagIds: String(row.tag_ids ?? "")
      .split(",")
      .map((value) => parseInt(value, 10))
      .filter((value) => Number.isSafeInteger(value)),
  };
}

/** Keep the seed set spread out. Without this one weekend binge decides every
 * recommendation for the next fortnight. */
export function diversifySeeds(seeds: DiscoverySeed[], limit: number, perChannel = 2, perTag = 3): DiscoverySeed[] {
  const ordered = [...seeds]
    .filter((seed) => seed.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.videoId.localeCompare(b.videoId));
  const out: DiscoverySeed[] = [];
  const channelCounts = new Map<string, number>();
  const tagCounts = new Map<number, number>();
  for (const seed of ordered) {
    if (out.length >= Math.max(0, Math.floor(limit))) break;
    if ((channelCounts.get(seed.channelId) ?? 0) >= perChannel) continue;
    if (seed.tagIds.some((tagId) => (tagCounts.get(tagId) ?? 0) >= perTag)) continue;
    out.push(seed);
    channelCounts.set(seed.channelId, (channelCounts.get(seed.channelId) ?? 0) + 1);
    for (const tagId of seed.tagIds) tagCounts.set(tagId, (tagCounts.get(tagId) ?? 0) + 1);
  }
  return out;
}

const SEED_POOL_SIZE = 120;

export async function selectDiscoverySeeds(uid: number, limit: number): Promise<DiscoverySeed[]> {
  const nearbyHours = recommendationHoursNear(zonedDayHour().hour).join(",");
  const rows = await database.prepare(`${effectiveVideoTagsCte}
    SELECT v.video_id, v.channel_id, v.title,
           h.watched_at, uv.watch_position, uv.watch_duration, uv.liked,
           COALESCE(pulse.pulse_seconds, 0) AS pulse_seconds,
           (SELECT group_concat(DISTINCT evt.tag_id) FROM effective_video_tags evt
             WHERE evt.video_id = v.video_id AND evt.user_id = ${uid}) AS tag_ids
    FROM videos v
    JOIN (
      SELECT video_id, MAX(watched_at) AS watched_at FROM history WHERE user_id = ${uid} GROUP BY video_id
    ) h ON h.video_id = v.video_id
    LEFT JOIN user_videos uv ON uv.video_id = v.video_id AND uv.user_id = ${uid}
    LEFT JOIN (
      SELECT video_id, SUM(CASE WHEN hour IN (${nearbyHours}) THEN seconds ELSE 0 END) AS pulse_seconds
      FROM watch_time_log WHERE user_id = ${uid} GROUP BY video_id
    ) pulse ON pulse.video_id = v.video_id
    WHERE v.is_short = 0
      AND v.live_status = 'none'
      AND COALESCE(v.is_private, 0) = 0
      AND NOT EXISTS (
        SELECT 1 FROM recommendation_feedback rf
        WHERE rf.user_id = ${uid} AND rf.video_id = v.video_id AND rf.action IN ('dismiss', 'less_like_this')
      )
    ORDER BY h.watched_at DESC
    LIMIT ${SEED_POOL_SIZE}
  `).all() as SeedRow[];

  const nowMs = Date.now();
  return diversifySeeds(rows.map((row) => seedFromRow(row, nowMs)), limit);
}
