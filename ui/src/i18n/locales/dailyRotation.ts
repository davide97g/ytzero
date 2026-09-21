// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { dailyRotationMessagesEn } from "./dailyRotation.en";
import { dailyRotationMessagesIt } from "./dailyRotation.it";

export const dailyRotationMessages = {
  en: dailyRotationMessagesEn,
  it: dailyRotationMessagesIt,
} as const;
