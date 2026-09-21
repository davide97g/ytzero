// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { dailyRotationMessagesEn } from "./dailyRotation.en";
import { dailyRotationMessagesPl } from "./dailyRotation.pl";
import { dailyRotationMessagesDe } from "./dailyRotation.de";
import { dailyRotationMessagesFr } from "./dailyRotation.fr";
import { dailyRotationMessagesEs } from "./dailyRotation.es";
import { dailyRotationMessagesPtBR } from "./dailyRotation.pt-BR";
import { dailyRotationMessagesRu } from "./dailyRotation.ru";
import { dailyRotationMessagesJa } from "./dailyRotation.ja";
import { dailyRotationMessagesHu } from "./dailyRotation.hu";

export const dailyRotationMessages = {
  en: dailyRotationMessagesEn,
  pl: dailyRotationMessagesPl,
  de: dailyRotationMessagesDe,
  fr: dailyRotationMessagesFr,
  es: dailyRotationMessagesEs,
  "pt-BR": dailyRotationMessagesPtBR,
  ru: dailyRotationMessagesRu,
  ja: dailyRotationMessagesJa,
  hu: dailyRotationMessagesHu,
} as const;
