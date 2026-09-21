// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { feedTuningMessagesEn } from "./feedTuning.en";
import { feedTuningMessagesPl } from "./feedTuning.pl";
import { feedTuningMessagesDe } from "./feedTuning.de";
import { feedTuningMessagesFr } from "./feedTuning.fr";
import { feedTuningMessagesEs } from "./feedTuning.es";
import { feedTuningMessagesPtBR } from "./feedTuning.pt-BR";
import { feedTuningMessagesRu } from "./feedTuning.ru";
import { feedTuningMessagesJa } from "./feedTuning.ja";
import { feedTuningMessagesHu } from "./feedTuning.hu";

export const feedTuningMessages = {
  en: feedTuningMessagesEn,
  pl: feedTuningMessagesPl,
  de: feedTuningMessagesDe,
  fr: feedTuningMessagesFr,
  es: feedTuningMessagesEs,
  "pt-BR": feedTuningMessagesPtBR,
  ru: feedTuningMessagesRu,
  ja: feedTuningMessagesJa,
  hu: feedTuningMessagesHu,
} as const;
