// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { feedBuilderMessagesEn } from "./feedBuilder.en";
import { feedBuilderMessagesPl } from "./feedBuilder.pl";
import { feedBuilderMessagesDe } from "./feedBuilder.de";
import { feedBuilderMessagesFr } from "./feedBuilder.fr";
import { feedBuilderMessagesEs } from "./feedBuilder.es";
import { feedBuilderMessagesPtBR } from "./feedBuilder.pt-BR";
import { feedBuilderMessagesRu } from "./feedBuilder.ru";
import { feedBuilderMessagesJa } from "./feedBuilder.ja";
import { feedBuilderMessagesHu } from "./feedBuilder.hu";

export const feedBuilderMessages = {
  en: feedBuilderMessagesEn,
  pl: feedBuilderMessagesPl,
  de: feedBuilderMessagesDe,
  fr: feedBuilderMessagesFr,
  es: feedBuilderMessagesEs,
  "pt-BR": feedBuilderMessagesPtBR,
  ru: feedBuilderMessagesRu,
  ja: feedBuilderMessagesJa,
  hu: feedBuilderMessagesHu,
} as const;
