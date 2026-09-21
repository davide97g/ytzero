// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { notificationMessagesEn } from "./notifications.en";
import { notificationMessagesIt } from "./notifications.it";

export const notificationMessages = {
  en: notificationMessagesEn,
  it: notificationMessagesIt,
} as const;
