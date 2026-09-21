// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { featureMessagesEn } from "./featureMessages.en";
import { featureMessagesIt } from "./featureMessages.it";

export const featureMessages = {
  en: featureMessagesEn,
  it: featureMessagesIt,
} as const;
