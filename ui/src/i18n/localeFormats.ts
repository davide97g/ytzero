import { plural } from "./format";
import type { Language, LocaleFormat } from "./types";

export const localeFormats: Record<Language, LocaleFormat> = {
  en: {
    videoCount: (n) => `${n} ${plural("en", n, { one: "video", other: "videos" })}`,
    addedVideos: (n) => `Added ${n} new ${plural("en", n, { one: "video", other: "videos" })}`,
    channelCount: (n) => `${n} ${plural("en", n, { one: "channel", other: "channels" })}`,
    playlistCount: (n) => `${n} ${plural("en", n, { one: "playlist", other: "playlists" })}`,
    historyEntryCount: (n) => `${n} ${plural("en", n, { one: "entry", other: "entries" })}`,
    ageUnit: (n, unit) => plural("en", n, {
      days: { one: "day", other: "days" },
      weeks: { one: "week", other: "weeks" },
      months: { one: "month", other: "months" },
      years: { one: "year", other: "years" },
    }[unit]),
  },
  it: {
    videoCount: (n) => `${n} ${plural("it", n, { one: "video", other: "video" })}`,
    addedVideos: (n) => `${n} ${plural("it", n, { one: "nuovo video aggiunto", other: "nuovi video aggiunti" })}`,
    channelCount: (n) => `${n} ${plural("it", n, { one: "canale", other: "canali" })}`,
    playlistCount: (n) => `${n} ${plural("it", n, { one: "playlist", other: "playlist" })}`,
    historyEntryCount: (n) => `${n} ${plural("it", n, { one: "voce", other: "voci" })}`,
    ageUnit: (n, unit) => plural("it", n, {
      days: { one: "giorno", other: "giorni" },
      weeks: { one: "settimana", other: "settimane" },
      months: { one: "mese", other: "mesi" },
      years: { one: "anno", other: "anni" },
    }[unit]),
  },
};
