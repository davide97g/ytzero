// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { discoveryExternalMessagesEn } from "./discoveryExternal.en";
import { discoveryExternalMessagesPl } from "./discoveryExternal.pl";
import { discoveryExternalMessagesDe } from "./discoveryExternal.de";
import { discoveryExternalMessagesFr } from "./discoveryExternal.fr";
import { discoveryExternalMessagesEs } from "./discoveryExternal.es";
import { discoveryExternalMessagesPtBR } from "./discoveryExternal.pt-BR";
import { discoveryExternalMessagesRu } from "./discoveryExternal.ru";
import { discoveryExternalMessagesJa } from "./discoveryExternal.ja";
import { discoveryExternalMessagesHu } from "./discoveryExternal.hu";

export const discoveryExternalMessages = {
  en: discoveryExternalMessagesEn,
  pl: discoveryExternalMessagesPl,
  de: discoveryExternalMessagesDe,
  fr: discoveryExternalMessagesFr,
  es: discoveryExternalMessagesEs,
  "pt-BR": discoveryExternalMessagesPtBR,
  ru: discoveryExternalMessagesRu,
  ja: discoveryExternalMessagesJa,
  hu: discoveryExternalMessagesHu,
} as const;
