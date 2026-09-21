import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesPtBR = {
  displayFeedTuning: "Ajuste do feed",
  feedTuningHint: "A partir de quanto um vídeo conta como assistido e o que a página inicial recarrega ao atualizar. Os mesmos limites decidem o que «Continuar assistindo» oferece e o que as recomendações tratam como já visto; os controles de pontuação ficam em Configurações → Plugins → Recomendações.",
  feedCompleteRatio: "Conta como assistido em",
  feedCompleteRatioHint: "Depois disso o vídeo sai de «Continuar assistindo» e não volta à página inicial, mesmo sem marcação.",
  feedProgressMinSeconds: "Ponto de retomada começa após",
  feedProgressMinSecondsHint: "Menos que isso é uma olhada, não uma sessão, e não deixa ponto de retomada.",
  feedProgressMinDuration: "Vídeo mais curto que pode retomar",
  feedProgressMinDurationHint: "Vídeos mais curtos são sempre tratados como assistidos de uma vez.",
  feedContinueLimit: "Vídeos em «Continuar assistindo»",
  feedContinueLimitHint: "Quantos vídeos inacabados a prateleira oferece por vez.",
  feedRefreshScope: "Atualizar recarrega",
  feedRefreshScopeHint: "O que o botão de atualizar da página inicial reconstrói depois de buscar novos vídeos.",
  feedRefreshScopeVideos: "A grade de vídeos",
  feedRefreshScopeEverything: "A página inteira",
  feedTuningSortHint: "A ordem da página inicial, inclusive logo após uma atualização.",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
