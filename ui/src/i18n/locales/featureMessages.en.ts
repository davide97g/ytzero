import { watchTogetherMessagesEn } from "./watchTogether.en";
import { channelSyncMessagesEn } from "./channelSync.en";
import { keyboardShortcutMessagesEn } from "./keyboardShortcuts.en";

export const featureMessagesEn = {
  ...watchTogetherMessagesEn,
  ...channelSyncMessagesEn,
  ...keyboardShortcutMessagesEn,
} as const;
