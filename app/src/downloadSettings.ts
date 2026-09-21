import { SUBTITLE_LANGUAGES } from "./subtitleLanguages";
import type { BaseLocalizedText } from "./serverMessages";
import { localizeServerMessage } from "./serverMessages";

export type DownloadSettingValue = number | string;
export type DownloadSettingType = "slider" | "select" | "toggle" | "text" | "time" | "multiselect";
type LocalizedText = BaseLocalizedText;

export const DOWNLOAD_QUALITIES = ["best", "1440", "1080", "720", "480"] as const;
export type DownloadQuality = (typeof DOWNLOAD_QUALITIES)[number];

export function isDownloadQuality(value: unknown): value is DownloadQuality {
  return typeof value === "string" && (DOWNLOAD_QUALITIES as readonly string[]).includes(value);
}

export function resolveDownloadQuality(profileDefault: string, playlistOverride: unknown): string {
  return isDownloadQuality(playlistOverride) ? playlistOverride : profileDefault;
}

export interface DownloadSettingSource {
  key: string;
  label: LocalizedText;
  description: LocalizedText;
  type?: DownloadSettingType;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: LocalizedText }[];
  defaultValue: DownloadSettingValue;
}

export interface DownloadSettingDefinition {
  key: string;
  label: string;
  description: string;
  type: DownloadSettingType;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  defaultValue: DownloadSettingValue;
}

export const DL_DEFAULTS = {
  quality: "1080",
  compatible_format: 0,
  watch_source_mode: "youtube",
  default_player: "youtube",
  prefetch_next_playlist_video: 0,
  // HEAVILY EXPERIMENTAL: play a not-yet-downloaded video through a direct,
  // indexed HLS presentation while the normal download continues in the
  // background. Sources without compatible fMP4 indexes use an ffmpeg fallback.
  // Off by default.
  experimental_streaming: 0,
  // Filename template, rendered server-side from the DB (so {channel} honours
  // the custom channel name). "/" creates subdirectories; the extension is
  // appended automatically; a missing {id} is added as " [id]" to keep files
  // unique and trackable.
  // Playlist bulk downloads land in an optional playlist folder. For every
  // other source {playlist} is empty and the renderer removes that segment.
  output_template: "{playlist}/{id}",
  write_thumbnail: 0,
  embed_metadata: 0,
  write_info_json: 0,
  write_nfo: 0,
  write_subs: 0,
  write_auto_subs: 0,
  sub_langs: "en",
  thumb_progress: 1,
  download_scheduled: 1,
  download_feed: 0,
  download_live_archives: 0,
  feed_max_age_hours: 48,
  feed_min_duration_minutes: 0,
  download_shorts: 0,
  download_schedule_enabled: 0,
  download_schedule_days: "0,1,2,3,4,5,6",
  download_schedule_start: "23:00",
  download_schedule_end: "07:00",
  keep_downloads: 0,
  retention_days: 14,
  delete_watched: 1,
  delete_watched_hours: 24,
  keep_liked: 1,
  max_storage_gb: 25,
} as const;

export type DlSettings = { [K in keyof typeof DL_DEFAULTS]: (typeof DL_DEFAULTS)[K] extends number ? number : string };

export const DOWNLOADS_SETTINGS: DownloadSettingSource[] = [
  {
    key: "quality",
    type: "select",
    label: { en: "Video quality" },
    description: { en: "Maximum resolution to download." },
    options: [
      { value: "best", label: { en: "Best available" } },
      { value: "1440", label: { en: "1440p" } },
      { value: "1080", label: { en: "1080p" } },
      { value: "720", label: { en: "720p" } },
      { value: "480", label: { en: "480p" } },
    ],
    defaultValue: DL_DEFAULTS.quality,
  },
  { key: "compatible_format", type: "toggle", label: { en: "Compatibility with older devices" }, description: { en: "Future downloads use MP4 with H.264 video and AAC audio. This works on more older devices, but usually limits quality to 1080p and may use more space. Existing files are not converted." }, defaultValue: DL_DEFAULTS.compatible_format },
  {
    key: "watch_source_mode",
    type: "select",
    label: { en: "Opening a video" },
    description: { en: "What happens when you open a video that isn't downloaded yet." },
    options: [
      { value: "youtube", label: { en: "Play from YouTube" } },
      { value: "ask", label: { en: "Ask every time" } },
      { value: "download", label: { en: "Always wait for the download" } },
    ],
    defaultValue: DL_DEFAULTS.watch_source_mode,
  },
  {
    key: "default_player",
    type: "select",
    label: { en: "Default player" },
    description: { en: "YouTube uses the embedded player. Direct stream plays a progressive MP4 without saving it; it is usually limited to 360p or 720p." },
    options: [
      { value: "youtube", label: { en: "YouTube embed" } },
      { value: "direct", label: { en: "Direct stream" } },
    ],
    defaultValue: DL_DEFAULTS.default_player,
  },
  {
    key: "prefetch_next_playlist_video",
    type: "toggle",
    label: { en: "Pre-download the next playlist video" },
    description: {
      en: "While a playlist video is playing, queue only the next video for download.",
    },
    defaultValue: DL_DEFAULTS.prefetch_next_playlist_video,
  },
  {
    key: "output_template",
    type: "text",
    label: { en: "Filename template" },
    description: {
      en: "Tokens: {channel} {title} {id} {date} {year} {month} {day} {channel_id} {playlist}. {playlist} is set only for downloads queued from a playlist. \"/\" creates folders, e.g. {playlist}/{date} - {title} [{id}].",
    },
    defaultValue: DL_DEFAULTS.output_template,
  },
  {
    key: "write_thumbnail",
    type: "toggle",
    label: { en: "Save thumbnail" },
    description: { en: "Stores the video thumbnail next to the file." },
    defaultValue: DL_DEFAULTS.write_thumbnail,
  },
  {
    key: "embed_metadata",
    type: "toggle",
    label: { en: "Embed metadata" },
    description: { en: "Writes title, chapters and description into the video file." },
    defaultValue: DL_DEFAULTS.embed_metadata,
  },
  {
    key: "write_info_json",
    type: "toggle",
    label: { en: "Save info.json" },
    description: { en: "Stores yt-dlp's full metadata file next to the video." },
    defaultValue: DL_DEFAULTS.write_info_json,
  },
  {
    key: "write_nfo",
    type: "toggle",
    label: { en: "Save NFO file" },
    description: { en: "Kodi/Jellyfin-style metadata (title, plot, channel, date)." },
    defaultValue: DL_DEFAULTS.write_nfo,
  },
  {
    key: "write_subs",
    type: "toggle",
    label: { en: "Download subtitles" },
    description: { en: "Saves the video's subtitles next to the file." },
    defaultValue: DL_DEFAULTS.write_subs,
  },
  {
    key: "write_auto_subs",
    type: "toggle",
    label: { en: "Include auto-generated subtitles" },
    description: { en: "Also downloads YouTube's auto-generated captions." },
    defaultValue: DL_DEFAULTS.write_auto_subs,
  },
  {
    key: "sub_langs",
    type: "multiselect",
    label: { en: "Subtitle languages" },
    description: { en: "Languages downloaded with every video (when subtitles are enabled)." },
    options: SUBTITLE_LANGUAGES.map((lang) => ({ value: lang.code, label: { en: lang.label } })),
    defaultValue: DL_DEFAULTS.sub_langs,
  },
  {
    key: "thumb_progress",
    type: "toggle",
    label: { en: "Progress bar on thumbnails" },
    description: { en: "Shows a thin download progress bar on top of video thumbnails." },
    defaultValue: DL_DEFAULTS.thumb_progress,
  },
  {
    key: "download_scheduled",
    type: "toggle",
    label: { en: "Download scheduled videos" },
    description: { en: "Videos placed on a watch-later bucket are fetched automatically." },
    defaultValue: DL_DEFAULTS.download_scheduled,
  },
  {
    key: "download_feed",
    type: "toggle",
    label: { en: "Download new uploads" },
    description: { en: "Fresh videos from followed channels are fetched as they appear." },
    defaultValue: DL_DEFAULTS.download_feed,
  },
  {
    key: "download_live_archives",
    type: "toggle",
    label: { en: "Download past live streams" },
    description: {
      en: "Allows completed live stream archives to be picked up by Watch later and automatic download rules. Active and upcoming streams are still skipped.",
    },
    defaultValue: DL_DEFAULTS.download_live_archives,
  },
  {
    key: "feed_max_age_hours",
    type: "slider",
    label: { en: "New upload window (hours)" },
    description: { en: "Only uploads younger than this are auto-downloaded from the feed." },
    min: 6, max: 168, step: 6,
    defaultValue: DL_DEFAULTS.feed_max_age_hours,
  },
  {
    key: "feed_min_duration_minutes",
    type: "slider",
    label: { en: "Minimum length for new uploads (minutes)" },
    description: { en: "Skips shorter videos when automatically downloading new uploads. Set to 0 to disable the global threshold; a channel can override it." },
    min: 0, max: 60, step: 1,
    defaultValue: DL_DEFAULTS.feed_min_duration_minutes,
  },
  {
    key: "download_shorts",
    type: "toggle",
    label: { en: "Include Shorts" },
    description: { en: "Allow automatic downloads of Shorts, including videos in Watch later. Manual downloads are unaffected." },
    defaultValue: DL_DEFAULTS.download_shorts,
  },
  {
    key: "download_schedule_enabled",
    type: "toggle",
    label: { en: "Download schedule" },
    description: { en: "Only starts queued downloads during the selected window." },
    defaultValue: DL_DEFAULTS.download_schedule_enabled,
  },
  {
    key: "download_schedule_days",
    type: "multiselect",
    label: { en: "Days" },
    description: { en: "Days on which the download window starts." },
    options: Array.from({ length: 7 }, (_, day) => ({ value: String(day), label: { en: String(day) } })),
    defaultValue: DL_DEFAULTS.download_schedule_days,
  },
  {
    key: "download_schedule_start",
    type: "time",
    label: { en: "Start" },
    description: { en: "Local start time." },
    defaultValue: DL_DEFAULTS.download_schedule_start,
  },
  {
    key: "download_schedule_end",
    type: "time",
    label: { en: "End" },
    description: { en: "Local end time." },
    defaultValue: DL_DEFAULTS.download_schedule_end,
  },
  {
    key: "keep_downloads",
    type: "toggle",
    label: { en: "Keep downloads" },
    description: { en: "Disables removal based on file age and watched status for this profile. The shared storage cap can still remove unprotected downloads." },
    defaultValue: DL_DEFAULTS.keep_downloads,
  },
  {
    key: "retention_days",
    type: "slider",
    label: { en: "Keep files for (days)" },
    description: { en: "Downloads are removed this many days after they finished." },
    min: 1, max: 90, step: 1,
    defaultValue: DL_DEFAULTS.retention_days,
  },
  {
    key: "delete_watched",
    type: "toggle",
    label: { en: "Remove after watching" },
    description: { en: "Once watched, the file is removed after a grace period." },
    defaultValue: DL_DEFAULTS.delete_watched,
  },
  {
    key: "delete_watched_hours",
    type: "slider",
    label: { en: "Watched grace period (hours)" },
    description: { en: "How long a watched file sticks around before removal." },
    min: 1, max: 168, step: 1,
    defaultValue: DL_DEFAULTS.delete_watched_hours,
  },
  {
    key: "keep_liked",
    type: "toggle",
    label: { en: "Protect liked videos" },
    description: { en: "Liked videos are never auto-removed by retention or the storage cap." },
    defaultValue: DL_DEFAULTS.keep_liked,
  },
  {
    key: "max_storage_gb",
    type: "slider",
    label: { en: "Storage cap" },
    description: { en: "Above this the oldest unprotected downloads are removed first. Maximum: 128 TB." },
    min: 1, max: 131_072, step: 1,
    defaultValue: DL_DEFAULTS.max_storage_gb,
  },
  {
    key: "experimental_streaming",
    type: "toggle",
    label: { en: "Stream while downloading (experimental)" },
    description: {
      en: "HIGHLY EXPERIMENTAL. Plays a not-yet-downloaded video through direct HLS while the normal download continues in the background. Seeking is immediately available across the whole video. Sources without compatible MP4 indexes fall back to on-demand ffmpeg processing. The completed download becomes available as a local file. H.264 only, so quality is capped at ~1080p.",
    },
    defaultValue: DL_DEFAULTS.experimental_streaming,
  },
];
// These values affect the one physical download store shared by all profiles.
// They remain instance-wide and may only be changed by an administrator; the
// remaining download preferences are stored per profile.
export const DOWNLOADS_ADMIN_SETTING_KEYS = new Set([
  "output_template",
  "write_thumbnail",
  "embed_metadata",
  "write_info_json",
  "write_nfo",
  "write_subs",
  "max_storage_gb",
]);

export function localizeDownloadSettings(language: string | null | undefined): DownloadSettingDefinition[] {
  return DOWNLOADS_SETTINGS.map((definition) => ({
    ...definition,
    type: definition.type ?? "slider",
    label: localizeServerMessage(definition.label, language),
    description: localizeServerMessage(definition.description, language),
    options: definition.options?.map((option) => ({ value: option.value, label: localizeServerMessage(option.label, language) })),
  }));
}
