import { watchTogetherMessagesIt } from "./watchTogether.it";
import { channelSyncMessagesIt } from "./channelSync.it";
import { keyboardShortcutMessagesIt } from "./keyboardShortcuts.it";

export const featureMessagesIt = {
  ...watchTogetherMessagesIt,
  ...channelSyncMessagesIt,
  ...keyboardShortcutMessagesIt,
} as const;
