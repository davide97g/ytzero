// Settings-page vocabulary: which areas exist, which permission gates each one,
// and the small option lists its controls choose from.
import type { ProfilePermissionArea } from "../api";

export type Tab = "channels" | "tags" | "playlists" | "display" | "notifications" | "plugins" | "sharing" | "advanced" | "profiles" | "auth" | "cluster";
export const TIME_ZONES = (() => {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  const supported = intl.supportedValuesOf?.("timeZone") ?? [
    "Europe/London", "Europe/Warsaw", "America/New_York", "America/Chicago",
    "America/Denver", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney",
  ];
  return [...new Set(["UTC", ...supported])];
})();
// Areas unavailable to a profile are omitted entirely, not shown as dead ends.
export const SETTINGS_AREAS: { id: Tab; primaryOnly?: boolean }[] = [
  { id: "channels" },
  { id: "tags" },
  { id: "playlists" },
  { id: "display" },
  { id: "notifications" },
  { id: "plugins" },
  { id: "sharing" },
  { id: "advanced", primaryOnly: true },
  { id: "profiles" },
  { id: "auth", primaryOnly: true },
  { id: "cluster", primaryOnly: true },
];
export const DISPLAY_PERMISSION_AREAS: ProfilePermissionArea[] = ["appearance", "feed", "navigation", "playback"];
export const GITHUB_RELEASES_URL = "https://github.com/Pelski/ytzero/releases";
export const PIN_PROTECTED_PERMISSION_AREAS = new Set<ProfilePermissionArea>(["channels", "followed_playlists", "imports", ...DISPLAY_PERMISSION_AREAS, "plugins", "profiles", "public_sharing"]);
export function permissionAreaForTab(tab: Tab): ProfilePermissionArea | null {
  if (tab === "sharing") return "public_sharing";
  if (tab === "channels" || tab === "tags" || tab === "playlists" || tab === "plugins" || tab === "profiles") return tab;
  if (tab === "advanced") return null;
  return null;
}
// Feed age limit: "off" lives in the unit select so the whole control stays two
// dropdowns (the value select is disabled while the limit is off).
export type FeedMaxAgeUnit = "days" | "weeks" | "months" | "years" | "off";
export const FEED_MAX_AGE_UNITS: Exclude<FeedMaxAgeUnit, "off">[] = ["days", "weeks", "months", "years"];
export const FEED_MAX_AGE_VALUES = Array.from({ length: 30 }, (_, i) => String(i + 1));
export const LOG_LINE_LIMIT = 300;
export const PLUGIN_SETTING_SAVE_DEBOUNCE_MS = 300;
export function isFeedMaxAgeUnit(value: unknown): value is FeedMaxAgeUnit {
  return typeof value === "string" && (FEED_MAX_AGE_UNITS as string[]).includes(value);
}
