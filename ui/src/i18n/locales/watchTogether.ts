// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { watchTogetherMessagesEn } from "./watchTogether.en";
import { watchTogetherMessagesPl } from "./watchTogether.pl";
import { watchTogetherMessagesDe } from "./watchTogether.de";

export const watchTogetherMessages = {
  en: watchTogetherMessagesEn,
  pl: watchTogetherMessagesPl,
  de: watchTogetherMessagesDe,
} as const;
