// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { feedTuningMessagesEn } from "./feedTuning.en";
import { feedTuningMessagesIt } from "./feedTuning.it";

export const feedTuningMessages = {
  en: feedTuningMessagesEn,
  it: feedTuningMessagesIt,
} as const;
