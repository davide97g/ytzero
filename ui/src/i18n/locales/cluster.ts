// Aggregate view of the per-language modules. Application code imports the
// single language it needs; this stays for catalogue tests and tooling.
import { clusterMessagesEn } from "./cluster.en";
import { clusterMessagesIt } from "./cluster.it";

export const clusterMessages = {
  en: clusterMessagesEn,
  it: clusterMessagesIt,
} as const;
