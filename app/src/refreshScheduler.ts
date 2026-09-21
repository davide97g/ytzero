import { database } from "./database";
import { startChannelPostsScheduler } from "./channelPostsScheduler";
import { log } from "./logger";
import {
  backfillImportedVideos,
  refreshAll,
  refreshAllLiveStatuses,
  refreshAvatarsBatch,
  refreshVideoMetadataBatch,
} from "./refresher";
import { syncNextFollowedPlaylist, syncNextSubscribedChannel } from "./scheduledSync";
import { runAutomaticUpdateChecks } from "./updates";
import { backgroundTasksEnabled } from "./deploymentMode";
import { runDiscoveryCycle } from "./plugins";
import { guarded, positiveNumber, schedule, scheduleSerially } from "./schedulerTimers";
const FEED_REFRESH_BATCH_SIZE = 10;
const FEED_REFRESH_FAIRNESS_SLOTS = 2;

const VIDEO_MAINTENANCE_MAX_AGE_DAYS = positiveNumber(process.env.VIDEO_MAINTENANCE_MAX_AGE_DAYS, 90);

export function startScheduler() {
  if (!backgroundTasksEnabled()) return;
  startChannelPostsScheduler();
  schedule("updates.cron_failed", runAutomaticUpdateChecks, 60_000, 1);
  log.info("scheduler.update_checks", { pollIntervalMin: 1 });

  const refreshIntervalMin = positiveNumber(process.env.REFRESH_INTERVAL_MINUTES, 5);
  schedule("refresh.cron_failed", () => refreshAll(), 3_000, refreshIntervalMin);
  log.info("scheduler.feed_refresh", {
    intervalMin: refreshIntervalMin,
    batchSize: FEED_REFRESH_BATCH_SIZE,
    fairnessSlots: FEED_REFRESH_FAIRNESS_SLOTS,
    adaptiveMinIntervalMin: positiveNumber(process.env.ADAPTIVE_REFRESH_MIN_MINUTES, 10),
    adaptiveMaxIntervalMin: positiveNumber(process.env.ADAPTIVE_REFRESH_MAX_MINUTES, 12 * 60),
    adaptiveInactiveMaxIntervalMin: Math.min(3 * 24 * 60, positiveNumber(process.env.ADAPTIVE_REFRESH_INACTIVE_MAX_MINUTES, 3 * 24 * 60)),
  });

  // A cheap due-only pass gives fixed HH:mm schedules minute precision without
  // running adaptive maintenance work more often than configured above.
  const manualSchedulesExist = database.prepare(`
    SELECT 1 FROM channels c
    WHERE c.manual_status = 'active'
      AND c.refresh_schedule_days IS NOT NULL AND c.refresh_schedule_time IS NOT NULL
      AND EXISTS (SELECT 1 FROM user_channels uc WHERE uc.channel_id = c.channel_id AND uc.followed = 1)
    LIMIT 1
  `);
  setInterval(guarded("refresh.manual_cron_failed", async () => {
    if (!await manualSchedulesExist.get()) return;
    await refreshAll({ manualOnly: true });
  }), 60_000);
  log.info("scheduler.manual_feed_refresh", { intervalMin: 1 });

  // Discovery reaches outside the library, so it runs here and nowhere else:
  // one profile per tick, on the worker, well after startup traffic settles.
  const discoveryIntervalMin = 15;
  schedule("discovery.cron_failed", runDiscoveryCycle, 150_000, discoveryIntervalMin);
  log.info("scheduler.discovery_refresh", { intervalMin: discoveryIntervalMin });

  const fullSyncIntervalMin = positiveNumber(process.env.FULL_SYNC_INTERVAL_MINUTES, 15);
  scheduleSerially("channel.full_sync.cron_failed", syncNextSubscribedChannel, 60_000, fullSyncIntervalMin);
  log.info("scheduler.channel_full_sync", { intervalMin: fullSyncIntervalMin, batchSize: 1 });

  const playlistSyncIntervalMin = positiveNumber(process.env.PLAYLIST_SYNC_INTERVAL_MINUTES, 15);
  scheduleSerially("playlist.sync.cron_failed", syncNextFollowedPlaylist, 90_000, playlistSyncIntervalMin);
  log.info("scheduler.playlist_sync", { intervalMin: playlistSyncIntervalMin, batchSize: 1 });

  const avatarBatch = positiveNumber(process.env.AVATAR_REFRESH_BATCH_SIZE, 4);
  const avatarIntervalMin = positiveNumber(process.env.AVATAR_REFRESH_INTERVAL_MINUTES, 60);
  schedule("avatars.cron_failed", () => refreshAvatarsBatch(avatarBatch), 120_000, avatarIntervalMin);
  log.info("scheduler.avatar_refresh", { intervalMin: avatarIntervalMin, batchSize: avatarBatch, maxAgeDays: 7 });

  const liveIntervalMin = positiveNumber(process.env.LIVE_INTERVAL_MINUTES, 3);
  schedule("live.cron_failed", refreshAllLiveStatuses, 15_000, liveIntervalMin);
  log.info("scheduler.live_refresh", { intervalMin: liveIntervalMin });

  // Metadata backfill: fill missing duration and publication dates,
  // most-recently imported first, in a polite batch every few minutes.
  const durationBatch = positiveNumber(process.env.DURATION_BATCH_SIZE, 20);
  const durationIntervalMin = positiveNumber(process.env.DURATION_INTERVAL_MINUTES, 3);
  schedule("video_metadata.cron_failed", () => refreshVideoMetadataBatch(durationBatch), 30_000, durationIntervalMin);
  log.info("scheduler.video_metadata_backfill", {
    intervalMin: durationIntervalMin,
    batchSize: durationBatch,
    maxAgeDays: VIDEO_MAINTENANCE_MAX_AGE_DAYS,
  });

  // Fill real metadata for videos brought in by a Takeout import.
  const importBatch = positiveNumber(process.env.IMPORT_ENRICH_BATCH_SIZE, 15);
  const importIntervalMin = positiveNumber(process.env.IMPORT_ENRICH_INTERVAL_MINUTES, 2);
  schedule("import.enrich_cron_failed", () => backfillImportedVideos(importBatch), 45_000, importIntervalMin);
  log.info("scheduler.import_enrich", { intervalMin: importIntervalMin, batchSize: importBatch });
}
