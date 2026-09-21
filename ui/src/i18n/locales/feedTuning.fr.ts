import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesFr = {
  displayFeedTuning: "Réglage du flux",
  feedTuningHint: "À partir de quand une vidéo compte comme vue, et ce que l'accueil recharge lors d'une actualisation. Les mêmes seuils décident de ce que propose « Continuer à regarder » et de ce que les recommandations considèrent comme déjà vu ; les curseurs de score sont dans Paramètres → Extensions → Recommandations.",
  feedCompleteRatio: "Considérée comme vue à",
  feedCompleteRatioHint: "Au-delà, la vidéo quitte « Continuer à regarder » et ne revient plus dans l'accueil, même sans marquage.",
  feedProgressMinSeconds: "Point de reprise après",
  feedProgressMinSecondsHint: "En dessous, c'est un coup d'œil, pas un visionnage : aucun point de reprise.",
  feedProgressMinDuration: "Vidéo la plus courte reprenable",
  feedProgressMinDurationHint: "Les vidéos plus courtes sont toujours considérées comme vues d'une traite.",
  feedContinueLimit: "Vidéos dans « Continuer à regarder »",
  feedContinueLimitHint: "Combien de vidéos inachevées l'étagère propose à la fois.",
  feedRefreshScope: "L'actualisation recharge",
  feedRefreshScopeHint: "Ce que le bouton d'actualisation de l'accueil reconstruit après avoir récupéré les nouvelles vidéos.",
  feedRefreshScopeVideos: "La grille de vidéos",
  feedRefreshScopeEverything: "Toute la page",
  feedTuningSortHint: "L'ordre de l'accueil, y compris juste après une actualisation.",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
