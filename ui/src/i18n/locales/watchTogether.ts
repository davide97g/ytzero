// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { watchTogetherMessagesEn } from "./watchTogether.en";
import { watchTogetherMessagesIt } from "./watchTogether.it";

export const watchTogetherMessages = {
  en: watchTogetherMessagesEn,
  it: watchTogetherMessagesIt,
} as const;
