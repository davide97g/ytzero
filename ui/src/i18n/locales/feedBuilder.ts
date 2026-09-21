// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { feedBuilderMessagesEn } from "./feedBuilder.en";
import { feedBuilderMessagesIt } from "./feedBuilder.it";

export const feedBuilderMessages = {
  en: feedBuilderMessagesEn,
  it: feedBuilderMessagesIt,
} as const;
