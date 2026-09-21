export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  // Headless integrations may enrich existing surfaces without owning a page.
  route?: string;
  icon: string;
  permissions: string[];
  // "user" (default): settings live per profile in plugin_settings.
  // "global": settings are app-wide and stored in the settings table.
  settingsScope?: "user" | "global";
}

import type { BaseLocalizedText } from "./serverMessages";

export type LocalizedText = BaseLocalizedText;

export type PluginSettingType = "slider" | "select" | "toggle" | "text" | "multiselect";

export interface PluginSettingOption {
  value: string;
  label: string;
}

export interface PluginSettingDef {
  key: string;
  label: string;
  description: string;
  type: PluginSettingType;
  min?: number;
  max?: number;
  step?: number;
  options?: PluginSettingOption[];
  defaultValue: number | string;
  scope?: "user" | "global";
  adminOnly?: boolean;
}

export type PluginSettingValue = number | string;

export interface PluginTermState {
  lastTerms: string[];
  blockedTerms: string[];
}

export type PluginSettingSource = Omit<PluginSettingDef, "label" | "description" | "type" | "options"> & {
  label: LocalizedText;
  description: LocalizedText;
  type?: PluginSettingType;
  options?: { value: string; label: LocalizedText }[];
};

export const SOCIAL_SETTINGS: PluginSettingSource[] = [
  {
    key: "comments_enabled",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Comments" },
    description: { en: "Profiles can discuss videos shared in Social." },
    defaultValue: 1,
  },
  {
    key: "reactions_enabled",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Emoji reactions" },
    description: { en: "Each profile can select several different reactions on one post." },
    defaultValue: 1,
  },
  {
    key: "watch_together_enabled",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Watch together" },
    description: { en: "Profiles can create synchronized watch rooms with a shared chat." },
    defaultValue: 0,
  },
  {
    key: "allow_child_profiles",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Child profiles" },
    description: { en: "Allow child profiles to open Social, publish, react and comment." },
    defaultValue: 0,
  },
  {
    key: "notify_new_posts",
    type: "toggle",
    scope: "user",
    label: { en: "New posts" },
    description: { en: "Notify me when another profile shares a video." },
    defaultValue: 1,
  },
  {
    key: "notify_comments",
    type: "toggle",
    scope: "user",
    label: { en: "Comments on my posts" },
    description: { en: "Notify me about new comments on videos I shared." },
    defaultValue: 1,
  },
  {
    key: "notify_reactions",
    type: "toggle",
    scope: "user",
    label: { en: "Reactions and comment likes" },
    description: { en: "Notify me about the first reaction from a profile and likes on my comments." },
    defaultValue: 0,
  },
  {
    key: "notify_mentions",
    type: "toggle",
    scope: "user",
    label: { en: "@mentions" },
    description: { en: "Notify me when another profile mentions me in a post or comment." },
    defaultValue: 1,
  },
];

export const TUBE_ARCHIVIST_SETTINGS: PluginSettingSource[] = [
  {
    key: "sync_interval_minutes",
    type: "select",
    scope: "global",
    adminOnly: true,
    label: { en: "Library refresh" },
    description: { en: "How often YTZero imports changes from TubeArchivist." },
    options: [
      { value: "15", label: { en: "Every 15 minutes" } },
      { value: "60", label: { en: "Every hour" } },
      { value: "360", label: { en: "Every 6 hours" } },
      { value: "1440", label: { en: "Daily" } },
    ],
    defaultValue: "60",
  },
  {
    key: "sync_watched",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Sync watched status" },
    description: { en: "Synchronize watched and unwatched changes between TubeArchivist and all YT Zero profiles." },
    defaultValue: 1,
  },
];

export const NOTIFICATION_PROVIDER_SETTINGS: PluginSettingSource[] = [
  {
    key: "provider",
    type: "select",
    scope: "global",
    adminOnly: true,
    label: { en: "Notification provider" },
    description: {
      en: "Where notifications leave this installation. Each profile chooses its own targets in Settings → Notifications.",
    },
    options: [
      { value: "off", label: { en: "No external delivery" } },
      { value: "apprise", label: { en: "Apprise" } },
      { value: "ntfy", label: { en: "ntfy" } },
      { value: "webhook", label: { en: "Webhook" } },
    ],
    defaultValue: "off",
  },
];

export const DISCOVERY_SETTINGS: PluginSettingSource[] = [
  { key: "total_limit", label: { en: "Number of suggestions" }, description: { en: "How many videos Recommendations should prepare at once." }, min: 8, max: 80, step: 1, defaultValue: 32 },
  { key: "per_channel_limit", label: { en: "Videos from one channel" }, description: { en: "Prevents one channel from taking over the whole list." }, min: 1, max: 20, step: 1, defaultValue: 5 },
  { key: "shared_tag_points", label: { en: "Shared tags" }, description: { en: "Fallback tag affinity used after Pulse has matched tags and channels for the current hour." }, min: 0, max: 80, step: 1, defaultValue: 25 },
  { key: "tag_history_points", label: { en: "Watched tags" }, description: { en: "Adds weight for tags that appear often in your watch history." }, min: 0, max: 20, step: 1, defaultValue: 3 },
  { key: "tag_history_cap", label: { en: "Watched tag limit" }, description: { en: "Caps how much watched tags can influence one video." }, min: 0, max: 120, step: 1, defaultValue: 36 },
  { key: "watched_channel_points", label: { en: "Known channels" }, description: { en: "General channel affinity used after current-hour Pulse matches." }, min: 0, max: 30, step: 1, defaultValue: 8 },
  { key: "watched_channel_cap", label: { en: "Known channel limit" }, description: { en: "Caps how much channel history can influence one video." }, min: 0, max: 120, step: 1, defaultValue: 40 },
  { key: "playlist_points", label: { en: "Your playlists" }, description: { en: "Raises videos that are already saved in your playlists." }, min: 0, max: 80, step: 1, defaultValue: 20 },
  { key: "liked_points", label: { en: "Liked videos" }, description: { en: "Raises videos you marked as liked." }, min: 0, max: 100, step: 1, defaultValue: 35 },
  { key: "already_watched_points", label: { en: "Opened before" }, description: { en: "Gives a small boost to videos you opened but did not complete." }, min: 0, max: 50, step: 1, defaultValue: 10 },
  { key: "started_points", label: { en: "Started videos" }, description: { en: "Raises videos where you watched part of the material." }, min: 0, max: 80, step: 1, defaultValue: 15 },
  { key: "recency_points", label: { en: "Freshness" }, description: { en: "Raises newer videos so the list does not feel stale." }, min: 0, max: 60, step: 1, defaultValue: 18 },
  { key: "external_enabled", type: "toggle", label: { en: "Look outside your subscriptions" }, description: { en: "Asks YouTube which videos people watched next after the ones you finished, and mixes the best of them into Recommendations." }, defaultValue: 0 },
  { key: "seed_count", label: { en: "Videos used as starting points" }, description: { en: "How many videos from your history are used to ask what to watch next. More starting points cost more requests." }, min: 4, max: 24, step: 1, defaultValue: 12 },
  { key: "external_limit", label: { en: "Outside videos kept" }, description: { en: "Upper limit on temporary videos imported from outside your subscriptions in one pass." }, min: 0, max: 60, step: 1, defaultValue: 24 },
  { key: "outside_base_points", label: { en: "Outside videos" }, description: { en: "Starting weight every video found outside your subscriptions receives." }, min: 0, max: 2000, step: 50, defaultValue: 600 },
  { key: "cooccurrence_points", label: { en: "Appears next to several of your videos" }, description: { en: "The strongest outside signal: a video YouTube links to several things you watched." }, min: 0, max: 3000, step: 50, defaultValue: 1200 },
  { key: "outside_seed_points", label: { en: "Strength of the starting points" }, description: { en: "How much it matters that the videos leading here were ones you actually finished." }, min: 0, max: 1000, step: 25, defaultValue: 300 },
  { key: "novelty_penalty", label: { en: "Prefer unfamiliar channels" }, description: { en: "Lowers outside videos from channels you already follow, because your feed covers those already." }, min: 0, max: 2000, step: 50, defaultValue: 400 },
  { key: "external_adjustment", label: { en: "Outside video adjustment" }, description: { en: "Final nudge applied to every temporary video, up or down." }, min: -500, max: 500, step: 25, defaultValue: 0 },
  { key: "min_view_count", label: { en: "Minimum views" }, description: { en: "Skips outside videos almost nobody has watched." }, min: 0, max: 10000, step: 100, defaultValue: 500 },
  { key: "min_duration_minutes", label: { en: "Minimum length" }, description: { en: "Skips outside videos shorter than this, in minutes." }, min: 0, max: 30, step: 1, defaultValue: 4 },
  { key: "random_pick_count", label: { en: "Variety near the top" }, description: { en: "Mixes in a few strong suggestions so the list changes between reloads." }, min: 0, max: 10, step: 1, defaultValue: 3 },
  { key: "high_pick_count", label: { en: "Top matches after variety" }, description: { en: "How many strongest matches should follow the first mixed items." }, min: 0, max: 20, step: 1, defaultValue: 6 },
];


export const PLUGINS: PluginManifest[] = [
  {
    id: "discovery",
    name: "Recommendations",
    version: "0.3.0",
    description: "Ranks your library and, when asked, looks outside your subscriptions for what to watch next.",
    route: "/recommendations",
    icon: "Sparkles",
    permissions: ["read:library", "read:history", "fetch:youtube"],
  },
  {
    id: "social",
    name: "Social",
    version: "0.1.0",
    description: "A local social space where profiles share videos, react and comment together.",
    route: "/social",
    icon: "UsersRound",
    permissions: ["read:profiles", "read:library", "write:social"],
    settingsScope: "user",
  },
  {
    id: "notifications",
    name: "External notifications",
    version: "0.1.0",
    description: "Forwards everything that reaches the notification bell to an external service.",
    icon: "BellRing",
    permissions: ["read:notifications", "write:external"],
    settingsScope: "global",
  },
  {
    id: "tubearchivist",
    name: "TubeArchivist",
    version: "0.1.0",
    description: "Uses a TubeArchivist library as a local source in the existing feed.",
    icon: "Archive",
    permissions: ["read:tubearchivist", "write:watched", "read:library"],
    settingsScope: "global",
  },
];

export const PLUGIN_TEXT: Record<string, { name: LocalizedText; description: LocalizedText; permissions: Record<string, LocalizedText> }> = {
  discovery: {
    name: { en: "Recommendations" },
    description: {
      en: "Ranks your library and, when asked, looks outside your subscriptions for what to watch next.",
    },
    permissions: {
      "read:library": { en: "reads your local library" },
      "read:history": { en: "uses your watch history" },
      "fetch:youtube": { en: "asks YouTube for related videos when enabled" },
    },
  },
  social: {
    name: { en: "Social" },
    description: {
      en: "A local space where profiles share videos, use emoji reactions, mention each other and comment together.",
    },
    permissions: {
      "read:profiles": { en: "shows participating profile names and avatars" },
      "read:library": { en: "reads videos from the local library" },
      "write:social": { en: "stores posts, reactions, mentions and comments locally" },
    },
  },
  notifications: {
    name: { en: "External notifications" },
    description: {
      en: "Sends every notification from the bell to another service through Apprise, ntfy or a webhook. Which events fire, and where each profile receives them, stays in Settings → Notifications.",
    },
    permissions: {
      "read:notifications": { en: "reads the notifications shown in the bell" },
      "write:external": { en: "sends them to the configured external service" },
    },
  },
  tubearchivist: {
    name: { en: "TubeArchivist" },
    description: {
      en: "Adds archived videos directly to the main feed and plays their local media.",
    },
    permissions: {
      "read:tubearchivist": { en: "reads your TubeArchivist catalog and comments" },
      "write:watched": { en: "updates watched status in TubeArchivist" },
      "read:library": { en: "adds archived videos to the local feed" },
    },
  },
};
