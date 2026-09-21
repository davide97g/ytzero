// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { publicSharingMessagesEn } from "./publicSharing.en";
import { publicSharingMessagesPl } from "./publicSharing.pl";
import { publicSharingMessagesDe } from "./publicSharing.de";
import { publicSharingMessagesFr } from "./publicSharing.fr";
import { publicSharingMessagesEs } from "./publicSharing.es";
import { publicSharingMessagesPtBR } from "./publicSharing.pt-BR";
import { publicSharingMessagesRu } from "./publicSharing.ru";
import { publicSharingMessagesJa } from "./publicSharing.ja";
import { publicSharingMessagesHu } from "./publicSharing.hu";

export const publicSharingMessages = {
  en: publicSharingMessagesEn,
  pl: publicSharingMessagesPl,
  de: publicSharingMessagesDe,
  fr: publicSharingMessagesFr,
  es: publicSharingMessagesEs,
  "pt-BR": publicSharingMessagesPtBR,
  ru: publicSharingMessagesRu,
  ja: publicSharingMessagesJa,
  hu: publicSharingMessagesHu,
} as const;
