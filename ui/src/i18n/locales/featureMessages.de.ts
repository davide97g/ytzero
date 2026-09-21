import { watchTogetherMessagesDe } from "./watchTogether.de";
import { channelSyncMessagesDe } from "./channelSync.de";
import { keyboardShortcutMessagesDe } from "./keyboardShortcuts.de";

export const featureMessagesDe = {
  ...watchTogetherMessagesDe,
  ...channelSyncMessagesDe,
  ...keyboardShortcutMessagesDe,
} as const;
