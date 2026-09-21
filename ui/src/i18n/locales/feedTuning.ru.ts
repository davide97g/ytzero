import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesRu = {
  displayFeedTuning: "Настройка ленты",
  feedTuningHint: "С какого момента видео считается просмотренным и что перезагружает главная при обновлении. Те же пороги определяют, что предлагает «Продолжить просмотр» и что рекомендации считают уже увиденным; ползунки оценки — в Настройки → Плагины → Рекомендации.",
  feedCompleteRatio: "Считать просмотренным с",
  feedCompleteRatioHint: "После этого видео уходит из «Продолжить просмотр» и не возвращается в ленту, даже без пометки.",
  feedProgressMinSeconds: "Точка возобновления после",
  feedProgressMinSecondsHint: "Меньше — это взгляд, а не просмотр, и точки возобновления не остаётся.",
  feedProgressMinDuration: "Самое короткое возобновляемое видео",
  feedProgressMinDurationHint: "Более короткие ролики всегда считаются просмотренными за один раз.",
  feedContinueLimit: "Видео в «Продолжить просмотр»",
  feedContinueLimitHint: "Сколько незаконченных видео полка показывает сразу.",
  feedRefreshScope: "Обновление перезагружает",
  feedRefreshScopeHint: "Что кнопка обновления на главной перестраивает после загрузки новых видео.",
  feedRefreshScopeVideos: "Сетку видео",
  feedRefreshScopeEverything: "Всю страницу",
  feedTuningSortHint: "Порядок на главной, в том числе сразу после обновления.",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
