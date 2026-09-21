// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { keyboardShortcutMessagesEn } from "./keyboardShortcuts.en";
import { keyboardShortcutMessagesPl } from "./keyboardShortcuts.pl";
import { keyboardShortcutMessagesDe } from "./keyboardShortcuts.de";

export const keyboardShortcutMessages = {
  en: keyboardShortcutMessagesEn,
  pl: keyboardShortcutMessagesPl,
  de: keyboardShortcutMessagesDe,
} as const;
