// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { channelSyncMessagesEn } from "./channelSync.en";
import { channelSyncMessagesIt } from "./channelSync.it";

export const channelSyncMessages = {
  en: channelSyncMessagesEn,
  it: channelSyncMessagesIt,
} as const;
