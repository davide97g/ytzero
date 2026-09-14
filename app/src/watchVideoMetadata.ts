import { database } from "./database";
import { log } from "./logger";
import { fetchVideoInfo } from "./youtube";
import { isYouTubeRefusalError } from "./youtubeRateLimit";
import { persistDirectVideoInfo } from "./videoInfoPersistence";
import { videoSelect, type VideoRow } from "./videoRoutesSupport";

/**
 * A video the channel scrape found before RSS carried it is stored with an
 * empty description and no counters, and the sync upsert deliberately never
 * overwrites richer local values, so the gap survives every later refresh.
 * Opening the watch page is where it becomes visible, so treat these rows as
 * candidates for a one-off player-response backfill.
 */
export function watchVideoMetadataIncomplete(row: VideoRow): boolean {
  if (row.is_private === 1 || row.is_unavailable === 1) return false;
  // An archived copy carries its own metadata and its owner is TubeArchivist,
  // not YouTube: never reach out for a row that another library already owns.
  if (row.tubearchivist_available === 1) return false;
  return row.description.trim() === ""
    || row.views == null
    || !row.published_at
    || row.published_at_approximate === 1;
}

/** One attempt per row: a video that genuinely has no description must not be refetched on every open. */
async function metadataBackfillPending(row: VideoRow): Promise<boolean> {
  if (!watchVideoMetadataIncomplete(row)) return false;
  const marker = await database
    .prepare("SELECT info_fetched_at FROM videos WHERE video_id = ?")
    .get(row.video_id) as { info_fetched_at: string | null } | null;
  return !marker?.info_fetched_at;
}

/**
 * RSS has no live marker, so an external row is refreshed from its direct
 * player response before the watch page chooses a player or download policy.
 * A followed-channel row with missing metadata takes the same route once.
 */
export async function refreshWatchVideoMetadata(row: VideoRow, userId: number): Promise<VideoRow> {
  const isExternal = row.external === 1;
  const backfill = !isExternal && await metadataBackfillPending(row);
  if (!isExternal && !backfill) return row;
  try {
    const info = await fetchVideoInfo(row.video_id);
    await persistDirectVideoInfo(info);
    if (backfill) {
      await database.prepare("UPDATE videos SET info_fetched_at = datetime('now') WHERE video_id = ?").run(row.video_id);
      log.info("video.metadata_backfilled", {
        videoId: row.video_id,
        source: "watch_open",
        filledDescription: row.description.trim() === "" && info.description.trim() !== "",
        filledViews: row.views == null && info.viewCount != null,
      });
    }
    const refreshed = await database.prepare(`${videoSelect(userId)} WHERE v.video_id = ?`).get(row.video_id) as VideoRow;
    if (refreshed.live_status !== row.live_status) {
      log.info("video.live_status_corrected", {
        videoId: row.video_id,
        from: row.live_status,
        to: refreshed.live_status,
        source: "watch_open",
      });
    }
    return refreshed;
  } catch (error) {
    if (isYouTubeRefusalError(error)) return row;
    log.warn("video.metadata_refresh_failed", {
      videoId: row.video_id,
      source: "watch_open",
      error: error instanceof Error ? error.message : String(error),
    });
    return row;
  }
}
