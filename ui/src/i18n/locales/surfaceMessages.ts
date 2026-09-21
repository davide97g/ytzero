// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { surfaceMessagesEn } from "./surfaceMessages.en";
import { surfaceMessagesIt } from "./surfaceMessages.it";
import { publicSharingMessagesEn } from "./publicSharing.en";
import { publicSharingMessagesIt } from "./publicSharing.it";

export const surfaceMessages = {
  en: { ...surfaceMessagesEn, ...publicSharingMessagesEn },
  it: { ...surfaceMessagesIt, ...publicSharingMessagesIt },
} as const;
