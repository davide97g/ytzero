import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesPl = {
  displayFeedTuning: "Strojenie feedu",
  feedTuningHint: "Ile filmu liczy się jako obejrzane i co odświeżanie przeładowuje na Głównej. Te same progi decydują, co pokazuje Kontynuuj oglądanie i co Rekomendacje uznają za już widziane; suwaki punktacji rekomendacji są w Ustawienia → Wtyczki → Rekomendacje.",
  feedCompleteRatio: "Uznaj za obejrzane od",
  feedCompleteRatioHint: "Po tym punkcie film znika z Kontynuuj oglądanie i nie wraca na Główną, nawet bez oznaczenia jako obejrzany.",
  feedProgressMinSeconds: "Punkt wznowienia od",
  feedProgressMinSecondsHint: "Krócej to rzut oka, nie oglądanie — nie zostawia punktu wznowienia.",
  feedProgressMinDuration: "Najkrótszy film z wznowieniem",
  feedProgressMinDurationHint: "Krótsze filmy zawsze traktujemy jako obejrzane za jednym razem.",
  feedContinueLimit: "Filmy w Kontynuuj oglądanie",
  feedContinueLimitHint: "Ile nieskończonych filmów pokazuje półka naraz.",
  feedRefreshScope: "Odświeżanie przeładowuje",
  feedRefreshScopeHint: "Co przycisk odświeżania na Głównej odbudowuje po pobraniu nowych filmów.",
  feedRefreshScopeVideos: "Siatkę filmów",
  feedRefreshScopeEverything: "Całą stronę",
  feedTuningSortHint: "Kolejność na Głównej, także zaraz po odświeżeniu.",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
