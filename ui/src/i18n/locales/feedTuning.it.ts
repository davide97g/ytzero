import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesIt = {
  displayFeedTuning: "Taratura del feed",
  feedTuningHint: "Quanto bisogna avanzare in un video perché conti come guardato, e cosa ricarica la pagina Principale quando la aggiorni. Le stesse soglie decidono cosa propone Continua a guardare e cosa i Consigliati considerano già visto; i cursori di punteggio dei consigli sono in Impostazioni → Plugin → Consigliati.",
  feedCompleteRatio: "Conta come visto a",
  feedCompleteRatioHint: "Oltre questo punto un video esce da Continua a guardare e non torna più nella pagina Principale, anche se non l'hai mai segnato come guardato.",
  feedProgressMinSeconds: "Il punto di ripresa parte dopo",
  feedProgressMinSecondsHint: "Meno di così è un'occhiata, non una visione, e non lascia alcun punto di ripresa.",
  feedProgressMinDuration: "Video più corto che può riprendere",
  feedProgressMinDurationHint: "I clip più brevi di questa durata sono sempre considerati guardati in una volta sola.",
  feedContinueLimit: "Video in Continua a guardare",
  feedContinueLimitHint: "Quanti video non finiti propone lo scaffale alla volta.",
  feedRefreshScope: "L'aggiornamento ricarica",
  feedRefreshScopeHint: "Cosa ricostruisce il pulsante di aggiornamento della pagina Principale dopo aver recuperato i nuovi caricamenti.",
  feedRefreshScopeVideos: "La griglia dei video",
  feedRefreshScopeEverything: "L'intera pagina",
  feedTuningSortHint: "L'ordine usato dalla pagina Principale, anche subito dopo un aggiornamento.",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
