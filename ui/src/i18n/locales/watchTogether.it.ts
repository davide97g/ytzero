import type { watchTogetherMessagesEn } from "./watchTogether.en";

export const watchTogetherMessagesIt = {
  watchTogetherTitle: "Guarda insieme",
  watchTogetherAction: "Guarda insieme",
  watchTogetherHost: "Organizzatore",
  watchTogetherParticipants: "Partecipanti",
  watchTogetherEmptyChatTitle: "Qui c'è silenzio",
  watchTogetherEmptyChatHint: "Manda il primo messaggio e commentate il video insieme.",
  watchTogetherMessagePlaceholder: "Scrivi alla stanza…",
  watchTogetherSend: "Invia",
  watchTogetherCopyInvite: "Copia il collegamento di invito",
  watchTogetherCopied: "Collegamento di invito copiato",
  watchTogetherLeave: "Esci dalla stanza",
  watchTogetherEnd: "Chiudi la stanza",
  watchTogetherConnecting: "Connessione alla stanza di visione…",
  watchTogetherConnectionError: "La connessione alla stanza di visione è caduta.",
  watchTogetherJoinError: "Impossibile entrare nella stanza di visione.",
  watchTogetherStartError: "Impossibile avviare una stanza di visione.",
  watchTogetherHostControls: "L'organizzatore controlla la riproduzione per tutti.",
  watchTogetherClosed: "Questa stanza di visione è terminata.",
} satisfies Record<keyof typeof watchTogetherMessagesEn, string>;
