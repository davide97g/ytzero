// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { clusterMessagesEn } from "./cluster.en";
import { clusterMessagesPl } from "./cluster.pl";
import { clusterMessagesDe } from "./cluster.de";
import { clusterMessagesFr } from "./cluster.fr";
import { clusterMessagesEs } from "./cluster.es";
import { clusterMessagesPtBR } from "./cluster.pt-BR";
import { clusterMessagesRu } from "./cluster.ru";
import { clusterMessagesJa } from "./cluster.ja";
import { clusterMessagesHu } from "./cluster.hu";

export const clusterMessages = {
  en: clusterMessagesEn,
  pl: clusterMessagesPl,
  de: clusterMessagesDe,
  fr: clusterMessagesFr,
  es: clusterMessagesEs,
  "pt-BR": clusterMessagesPtBR,
  ru: clusterMessagesRu,
  ja: clusterMessagesJa,
  hu: clusterMessagesHu,
} as const;
