// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { surfaceMessagesEn } from "./surfaceMessages.en";
import { surfaceMessagesPl } from "./surfaceMessages.pl";
import { surfaceMessagesDe } from "./surfaceMessages.de";
import { surfaceMessagesFr } from "./surfaceMessages.fr";
import { surfaceMessagesEs } from "./surfaceMessages.es";
import { surfaceMessagesPtBR } from "./surfaceMessages.pt-BR";
import { surfaceMessagesRu } from "./surfaceMessages.ru";
import { surfaceMessagesJa } from "./surfaceMessages.ja";
import { surfaceMessagesHu } from "./surfaceMessages.hu";
import { publicSharingMessagesEn } from "./publicSharing.en";
import { publicSharingMessagesPl } from "./publicSharing.pl";
import { publicSharingMessagesDe } from "./publicSharing.de";
import { publicSharingMessagesFr } from "./publicSharing.fr";
import { publicSharingMessagesEs } from "./publicSharing.es";
import { publicSharingMessagesPtBR } from "./publicSharing.pt-BR";
import { publicSharingMessagesRu } from "./publicSharing.ru";
import { publicSharingMessagesJa } from "./publicSharing.ja";
import { publicSharingMessagesHu } from "./publicSharing.hu";

export const surfaceMessages = {
  en: { ...surfaceMessagesEn, ...publicSharingMessagesEn },
  pl: { ...surfaceMessagesPl, ...publicSharingMessagesPl },
  de: { ...surfaceMessagesDe, ...publicSharingMessagesDe },
  fr: { ...surfaceMessagesFr, ...publicSharingMessagesFr },
  es: { ...surfaceMessagesEs, ...publicSharingMessagesEs },
  "pt-BR": { ...surfaceMessagesPtBR, ...publicSharingMessagesPtBR },
  ru: { ...surfaceMessagesRu, ...publicSharingMessagesRu },
  ja: { ...surfaceMessagesJa, ...publicSharingMessagesJa },
  hu: { ...surfaceMessagesHu, ...publicSharingMessagesHu },
} as const;
