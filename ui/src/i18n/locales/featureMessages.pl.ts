import { watchTogetherMessagesPl } from "./watchTogether.pl";
import { channelSyncMessagesPl } from "./channelSync.pl";
import { keyboardShortcutMessagesPl } from "./keyboardShortcuts.pl";

export const featureMessagesPl = {
  ...watchTogetherMessagesPl,
  ...channelSyncMessagesPl,
  ...keyboardShortcutMessagesPl,
} as const;
