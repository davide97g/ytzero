// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { keyboardShortcutMessagesEn } from "./keyboardShortcuts.en";
import { keyboardShortcutMessagesIt } from "./keyboardShortcuts.it";

export const keyboardShortcutMessages = {
  en: keyboardShortcutMessagesEn,
  it: keyboardShortcutMessagesIt,
} as const;
