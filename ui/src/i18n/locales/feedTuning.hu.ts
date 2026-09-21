import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesHu = {
  displayFeedTuning: "Hírfolyam hangolása",
  feedTuningHint: "Meddig kell eljutni ahhoz, hogy egy videó megtekintettnek számítson, és mit tölt újra a főoldal frissítéskor. Ugyanezek a küszöbök döntik el, mit kínál a „Folytatás” és mit tekint az ajánló már látottnak; az ajánló pontozói a Beállítások → Bővítmények → Ajánlások alatt vannak.",
  feedCompleteRatio: "Megtekintettnek számít ettől",
  feedCompleteRatioHint: "Ezen túl a videó kikerül a „Folytatás” sorból, és jelölés nélkül sem tér vissza a főoldalra.",
  feedProgressMinSeconds: "Folytatási pont ennyi után",
  feedProgressMinSecondsHint: "Ennél kevesebb csak belenézés, nem megtekintés, és nem hagy folytatási pontot.",
  feedProgressMinDuration: "A legrövidebb folytatható videó",
  feedProgressMinDurationHint: "A rövidebb videókat mindig egyben megnézettnek tekintjük.",
  feedContinueLimit: "Videók a „Folytatás” sorban",
  feedContinueLimitHint: "Hány befejezetlen videót kínál egyszerre a sor.",
  feedRefreshScope: "A frissítés újratölti",
  feedRefreshScopeHint: "Mit épít újra a főoldal frissítés gombja az új videók letöltése után.",
  feedRefreshScopeVideos: "A videórácsot",
  feedRefreshScopeEverything: "Az egész oldalt",
  feedTuningSortHint: "A főoldal sorrendje, közvetlenül frissítés után is.",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
