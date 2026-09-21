import type { watchTogetherMessagesEn } from "./watchTogether.en";

export const watchTogetherMessagesDe = {
    watchTogetherTitle: "Gemeinsam ansehen",
    watchTogetherAction: "Gemeinsam ansehen",
    watchTogetherHost: "Gastgeber",
    watchTogetherParticipants: "Teilnehmende",
    watchTogetherEmptyChatTitle: "Noch ist es ruhig",
    watchTogetherEmptyChatHint: "Schreibe die erste Nachricht und reagiert gemeinsam auf das Video.",
    watchTogetherMessagePlaceholder: "Nachricht an den Raum…",
    watchTogetherSend: "Senden",
    watchTogetherCopyInvite: "Einladungslink kopieren",
    watchTogetherCopied: "Einladungslink kopiert",
    watchTogetherLeave: "Raum verlassen",
    watchTogetherEnd: "Raum beenden",
    watchTogetherConnecting: "Verbindung zum Wiedergaberaum wird hergestellt…",
    watchTogetherConnectionError: "Die Verbindung zum Wiedergaberaum wurde unterbrochen.",
    watchTogetherJoinError: "Dem Wiedergaberaum konnte nicht beigetreten werden.",
    watchTogetherStartError: "Ein Wiedergaberaum konnte nicht gestartet werden.",
    watchTogetherHostControls: "Der Gastgeber steuert die Wiedergabe für alle.",
    watchTogetherClosed: "Dieser Wiedergaberaum wurde beendet.",
} satisfies Record<keyof typeof watchTogetherMessagesEn, string>;
