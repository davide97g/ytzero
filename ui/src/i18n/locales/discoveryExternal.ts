// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { discoveryExternalMessagesEn } from "./discoveryExternal.en";
import { discoveryExternalMessagesIt } from "./discoveryExternal.it";

export const discoveryExternalMessages = {
  en: discoveryExternalMessagesEn,
  it: discoveryExternalMessagesIt,
} as const;
