// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { featureMessagesEn } from "./featureMessages.en";
import { featureMessagesPl } from "./featureMessages.pl";
import { featureMessagesDe } from "./featureMessages.de";
import { featureMessagesHu } from "./featureMessages.hu";

export const featureMessages = {
  en: featureMessagesEn,
  pl: featureMessagesPl,
  de: featureMessagesDe,
  hu: featureMessagesHu,
} as const;
