import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesEs = {
  displayFeedTuning: "Ajuste del feed",
  feedTuningHint: "A partir de qué punto un vídeo cuenta como visto y qué recarga la portada al actualizar. Los mismos umbrales deciden qué ofrece «Seguir viendo» y qué dan por visto las recomendaciones; los controles de puntuación están en Ajustes → Complementos → Recomendaciones.",
  feedCompleteRatio: "Cuenta como visto en el",
  feedCompleteRatioHint: "Pasado ese punto el vídeo sale de «Seguir viendo» y no vuelve a la portada, aunque no lo marques como visto.",
  feedProgressMinSeconds: "El punto de reanudación empieza tras",
  feedProgressMinSecondsHint: "Menos que esto es un vistazo, no una visualización, y no deja punto de reanudación.",
  feedProgressMinDuration: "Vídeo más corto que se puede reanudar",
  feedProgressMinDurationHint: "Los vídeos más cortos siempre se tratan como vistos de una sentada.",
  feedContinueLimit: "Vídeos en «Seguir viendo»",
  feedContinueLimitHint: "Cuántos vídeos sin terminar ofrece la fila a la vez.",
  feedRefreshScope: "Al actualizar se recarga",
  feedRefreshScopeHint: "Qué reconstruye el botón de actualizar de la portada tras buscar vídeos nuevos.",
  feedRefreshScopeVideos: "La cuadrícula de vídeos",
  feedRefreshScopeEverything: "La página entera",
  feedTuningSortHint: "El orden de la portada, también justo después de actualizar.",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
