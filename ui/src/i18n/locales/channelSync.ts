// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { channelSyncMessagesEn } from "./channelSync.en";
import { channelSyncMessagesPl } from "./channelSync.pl";
import { channelSyncMessagesDe } from "./channelSync.de";

export const channelSyncMessages = {
  en: channelSyncMessagesEn,
  pl: channelSyncMessagesPl,
  de: channelSyncMessagesDe,
} as const;
