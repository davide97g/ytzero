import type { feedTuningMessagesEn } from "./feedTuning.en";

export const feedTuningMessagesDe = {
  displayFeedTuning: "Feed-Feinabstimmung",
  feedTuningHint: "Ab wann ein Video als gesehen gilt und was die Startseite beim Aktualisieren neu lädt. Dieselben Schwellen bestimmen, was „Weiterschauen“ anbietet und was Empfehlungen als gesehen behandeln; die Bewertungsregler stehen unter Einstellungen → Plugins → Empfehlungen.",
  feedCompleteRatio: "Gilt als gesehen ab",
  feedCompleteRatioHint: "Danach verlässt ein Video „Weiterschauen“ und kehrt nicht mehr in die Startseite zurück, auch ohne Markierung.",
  feedProgressMinSeconds: "Fortsetzungspunkt ab",
  feedProgressMinSecondsHint: "Kürzer ist ein Blick, kein Ansehen, und hinterlässt keinen Fortsetzungspunkt.",
  feedProgressMinDuration: "Kürzestes fortsetzbares Video",
  feedProgressMinDurationHint: "Kürzere Clips gelten immer als in einem Zug gesehen.",
  feedContinueLimit: "Videos in „Weiterschauen“",
  feedContinueLimitHint: "Wie viele unbeendete Videos die Leiste gleichzeitig anbietet.",
  feedRefreshScope: "Aktualisieren lädt neu",
  feedRefreshScopeHint: "Was die Aktualisieren-Schaltfläche der Startseite nach dem Abruf neuer Uploads neu aufbaut.",
  feedRefreshScopeVideos: "Das Videoraster",
  feedRefreshScopeEverything: "Die ganze Seite",
  feedTuningSortHint: "Die Reihenfolge der Startseite, auch direkt nach dem Aktualisieren.",
} satisfies Record<keyof typeof feedTuningMessagesEn, string>;
