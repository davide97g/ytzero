import { database } from "./database";
import { getUserSetting } from "./db";
import {
  activeDaypart,
  DAILY_ROTATION_LIMITS,
  DAYPART_IDS,
  daypartHours,
  defaultDailyRotationConfig,
  normalizeDailyRotationConfig,
  type DailyRotationConfig,
  type DaypartId,
  type DaypartRule,
} from "../../shared/dailyRotation";

export interface RotationTag {
  id: number;
  /** Portable identifier; what a daypart stores and what the editor selects. */
  uuid: string;
  name: string;
  color: string;
}

export interface ActiveRotation {
  daypart: DaypartId;
  tagIds: number[];
  tags: RotationTag[];
  /** True when the tags came from Pulse rather than an explicit choice. */
  learned: boolean;
  strength: number;
}

export function dailyRotationConfig(uid: number): DailyRotationConfig {
  return normalizeDailyRotationConfig(getUserSetting(uid, "daily_rotation")) ?? defaultDailyRotationConfig();
}

/** The tags this profile actually watched during the given hours, strongest
 * first. This is the same Pulse table the recommendation summary reads. */
async function learnedTags(uid: number, hours: number[], limit: number): Promise<RotationTag[]> {
  if (hours.length === 0) return [];
  const placeholders = hours.map(() => "?").join(",");
  const rows = await database.prepare(`
    SELECT wt.tag_id AS id, t.portable_uuid AS uuid, t.name, t.color, SUM(wt.seconds) AS seconds
    FROM watch_tag_time_log wt
    JOIN tags t ON t.id = wt.tag_id AND t.user_id = wt.user_id
    WHERE wt.user_id = ? AND wt.hour IN (${placeholders})
    GROUP BY wt.tag_id, t.portable_uuid, t.name, t.color
    HAVING SUM(wt.seconds) > 0
    ORDER BY SUM(wt.seconds) DESC, wt.tag_id ASC
    LIMIT ?
  `).all(uid, ...hours, Math.max(1, Math.floor(limit))) as { id: number; uuid: string; name: string; color: string }[];
  return rows.map((row) => ({ id: Number(row.id), uuid: row.uuid, name: row.name, color: row.color }));
}

/** Manual dayparts store portable uuids, so a tag deleted since the daypart was
 * configured simply drops out instead of breaking the rotation. */
async function manualTags(uid: number, tagUuids: string[]): Promise<RotationTag[]> {
  if (tagUuids.length === 0) return [];
  const placeholders = tagUuids.map(() => "?").join(",");
  const rows = await database.prepare(`
    SELECT id, name, color, portable_uuid AS uuid
    FROM tags
    WHERE user_id = ? AND portable_uuid IN (${placeholders})
  `).all(uid, ...tagUuids) as { id: number; uuid: string; name: string; color: string }[];
  const byUuid = new Map(rows.map((row) => [row.uuid, row]));
  return tagUuids
    .map((uuid) => byUuid.get(uuid))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map((row) => ({ id: Number(row.id), uuid: row.uuid, name: row.name, color: row.color }));
}

async function daypartTags(uid: number, config: DailyRotationConfig, daypart: DaypartRule): Promise<RotationTag[]> {
  return daypart.source === "manual"
    ? manualTags(uid, daypart.tagUuids)
    : learnedTags(uid, daypartHours(config, daypart.id), DAILY_ROTATION_LIMITS.learnedTagCount);
}

/** The rotation in force at `hour`, or null when it is switched off or resolves
 * to no tags at all. Every caller treats null as "rank exactly as before". */
export async function activeRotation(uid: number, hour: number): Promise<ActiveRotation | null> {
  const config = dailyRotationConfig(uid);
  const daypart = activeDaypart(config, hour);
  if (!daypart || config.strength <= 0) return null;
  const tags = await daypartTags(uid, config, daypart);
  if (tags.length === 0) return null;
  return {
    daypart: daypart.id,
    tagIds: tags.map((tag) => tag.id),
    tags,
    learned: daypart.source === "learned",
    strength: config.strength,
  };
}

/** Every tag this profile owns, as the editor's selectable options. */
export async function rotationTagOptions(uid: number): Promise<RotationTag[]> {
  const rows = await database.prepare(`
    SELECT id, portable_uuid AS uuid, name, color
    FROM tags WHERE user_id = ? ORDER BY name COLLATE NOCASE
  `).all(uid) as { id: number; uuid: string; name: string; color: string }[];
  return rows.map((row) => ({ id: Number(row.id), uuid: row.uuid, name: row.name, color: row.color }));
}

/** What Pulse would suggest for every daypart, used to pre-fill the editor. */
export async function rotationSuggestions(uid: number): Promise<Record<DaypartId, RotationTag[]>> {
  const config = dailyRotationConfig(uid);
  const entries = await Promise.all(DAYPART_IDS.map(async (id) => [
    id,
    await learnedTags(uid, daypartHours(config, id), DAILY_ROTATION_LIMITS.learnedTagCount),
  ] as const));
  return Object.fromEntries(entries) as Record<DaypartId, RotationTag[]>;
}
