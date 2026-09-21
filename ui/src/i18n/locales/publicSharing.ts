// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { publicSharingMessagesEn } from "./publicSharing.en";
import { publicSharingMessagesIt } from "./publicSharing.it";

export const publicSharingMessages = {
  en: publicSharingMessagesEn,
  it: publicSharingMessagesIt,
} as const;
