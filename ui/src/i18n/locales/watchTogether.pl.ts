import type { watchTogetherMessagesEn } from "./watchTogether.en";

export const watchTogetherMessagesPl = {
    watchTogetherTitle: "Wspólne oglądanie",
    watchTogetherAction: "Oglądaj wspólnie",
    watchTogetherHost: "Gospodarz",
    watchTogetherParticipants: "Uczestnicy",
    watchTogetherEmptyChatTitle: "Jeszcze tu cicho",
    watchTogetherEmptyChatHint: "Napisz pierwszą wiadomość i komentujcie film razem.",
    watchTogetherMessagePlaceholder: "Napisz wiadomość…",
    watchTogetherSend: "Wyślij",
    watchTogetherCopyInvite: "Kopiuj link z zaproszeniem",
    watchTogetherCopied: "Skopiowano link z zaproszeniem",
    watchTogetherLeave: "Opuść pokój",
    watchTogetherEnd: "Zakończ pokój",
    watchTogetherConnecting: "Łączenie z pokojem…",
    watchTogetherConnectionError: "Utracono połączenie z pokojem wspólnego oglądania.",
    watchTogetherJoinError: "Nie udało się dołączyć do pokoju.",
    watchTogetherStartError: "Nie udało się rozpocząć wspólnego oglądania.",
    watchTogetherHostControls: "Gospodarz steruje odtwarzaniem dla wszystkich.",
    watchTogetherClosed: "Ten pokój wspólnego oglądania został zakończony.",
} satisfies Record<keyof typeof watchTogetherMessagesEn, string>;
