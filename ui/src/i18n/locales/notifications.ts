// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { notificationMessagesEn } from "./notifications.en";
import { notificationMessagesPl } from "./notifications.pl";
import { notificationMessagesDe } from "./notifications.de";
import { notificationMessagesFr } from "./notifications.fr";
import { notificationMessagesEs } from "./notifications.es";
import { notificationMessagesPtBR } from "./notifications.pt-BR";
import { notificationMessagesRu } from "./notifications.ru";
import { notificationMessagesJa } from "./notifications.ja";
import { notificationMessagesHu } from "./notifications.hu";

export const notificationMessages = {
  en: notificationMessagesEn,
  pl: notificationMessagesPl,
  de: notificationMessagesDe,
  fr: notificationMessagesFr,
  es: notificationMessagesEs,
  "pt-BR": notificationMessagesPtBR,
  ru: notificationMessagesRu,
  ja: notificationMessagesJa,
  hu: notificationMessagesHu,
} as const;
