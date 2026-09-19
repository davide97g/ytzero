export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  // Headless integrations may enrich existing surfaces without owning a page.
  route?: string;
  icon: string;
  permissions: string[];
  // "user" (default): settings live per profile in plugin_settings.
  // "global": settings are app-wide and stored in the settings table.
  settingsScope?: "user" | "global";
}

import type { BaseLocalizedText } from "./serverMessages";

export type LocalizedText = BaseLocalizedText;

export type PluginSettingType = "slider" | "select" | "toggle" | "text" | "multiselect";

export interface PluginSettingOption {
  value: string;
  label: string;
}

export interface PluginSettingDef {
  key: string;
  label: string;
  description: string;
  type: PluginSettingType;
  min?: number;
  max?: number;
  step?: number;
  options?: PluginSettingOption[];
  defaultValue: number | string;
  scope?: "user" | "global";
  adminOnly?: boolean;
}

export type PluginSettingValue = number | string;

export interface PluginTermState {
  lastTerms: string[];
  blockedTerms: string[];
}

export type PluginSettingSource = Omit<PluginSettingDef, "label" | "description" | "type" | "options"> & {
  label: LocalizedText;
  description: LocalizedText;
  type?: PluginSettingType;
  options?: { value: string; label: LocalizedText }[];
};

export const SOCIAL_SETTINGS: PluginSettingSource[] = [
  {
    key: "comments_enabled",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Comments", pl: "Komentarze", de: "Kommentare" },
    description: { en: "Profiles can discuss videos shared in Social.", pl: "Profile mogą rozmawiać o filmach udostępnionych w Social.", de: "Profile können in Social geteilte Videos kommentieren." },
    defaultValue: 1,
  },
  {
    key: "reactions_enabled",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Emoji reactions", pl: "Reakcje emoji", de: "Emoji-Reaktionen" },
    description: { en: "Each profile can select several different reactions on one post.", pl: "Każdy profil może wybrać kilka różnych reakcji na jeden post.", de: "Jedes Profil kann mehrere verschiedene Reaktionen auf einen Beitrag auswählen." },
    defaultValue: 1,
  },
  {
    key: "watch_together_enabled",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Watch together", pl: "Wspólne oglądanie", de: "Gemeinsam ansehen" },
    description: { en: "Profiles can create synchronized watch rooms with a shared chat.", pl: "Profile mogą tworzyć zsynchronizowane pokoje oglądania ze wspólnym czatem.", de: "Profile können synchronisierte Wiedergaberäume mit gemeinsamem Chat erstellen." },
    defaultValue: 0,
  },
  {
    key: "allow_child_profiles",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Child profiles", pl: "Profile dziecięce", de: "Kinderprofile" },
    description: { en: "Allow child profiles to open Social, publish, react and comment.", pl: "Pozwól profilom dziecięcym otwierać Social, publikować, reagować i komentować.", de: "Erlaube Kinderprofilen Social zu öffnen, zu posten, zu reagieren und zu kommentieren." },
    defaultValue: 0,
  },
  {
    key: "notify_new_posts",
    type: "toggle",
    scope: "user",
    label: { en: "New posts", pl: "Nowe posty", de: "Neue Beiträge" },
    description: { en: "Notify me when another profile shares a video.", pl: "Powiadamiaj, gdy inny profil udostępni film.", de: "Benachrichtige mich, wenn ein anderes Profil ein Video teilt." },
    defaultValue: 1,
  },
  {
    key: "notify_comments",
    type: "toggle",
    scope: "user",
    label: { en: "Comments on my posts", pl: "Komentarze do moich postów", de: "Kommentare zu meinen Beiträgen" },
    description: { en: "Notify me about new comments on videos I shared.", pl: "Powiadamiaj o nowych komentarzach pod udostępnionymi przeze mnie filmami.", de: "Benachrichtige mich über neue Kommentare zu meinen geteilten Videos." },
    defaultValue: 1,
  },
  {
    key: "notify_reactions",
    type: "toggle",
    scope: "user",
    label: { en: "Reactions and comment likes", pl: "Reakcje i polubienia komentarzy", de: "Reaktionen und Kommentar-Likes" },
    description: { en: "Notify me about the first reaction from a profile and likes on my comments.", pl: "Powiadamiaj o pierwszej reakcji profilu i polubieniach moich komentarzy.", de: "Benachrichtige mich über die erste Reaktion eines Profils und Likes auf meine Kommentare." },
    defaultValue: 0,
  },
  {
    key: "notify_mentions",
    type: "toggle",
    scope: "user",
    label: { en: "@mentions", pl: "Oznaczenia @profil", de: "@Erwähnungen" },
    description: { en: "Notify me when another profile mentions me in a post or comment.", pl: "Powiadamiaj, gdy inny profil oznaczy mnie w poście lub komentarzu.", de: "Benachrichtige mich, wenn ein anderes Profil mich in einem Beitrag oder Kommentar erwähnt." },
    defaultValue: 1,
  },
];

export const TUBE_ARCHIVIST_SETTINGS: PluginSettingSource[] = [
  {
    key: "sync_interval_minutes",
    type: "select",
    scope: "global",
    adminOnly: true,
    label: { en: "Library refresh", pl: "Odświeżanie biblioteki", de: "Bibliothek aktualisieren" },
    description: { en: "How often YTZero imports changes from TubeArchivist.", pl: "Jak często YTZero importuje zmiany z TubeArchivist.", de: "Wie oft YTZero Änderungen aus TubeArchivist importiert." },
    options: [
      { value: "15", label: { en: "Every 15 minutes", pl: "Co 15 minut", de: "Alle 15 Minuten" } },
      { value: "60", label: { en: "Every hour", pl: "Co godzinę", de: "Stündlich" } },
      { value: "360", label: { en: "Every 6 hours", pl: "Co 6 godzin", de: "Alle 6 Stunden" } },
      { value: "1440", label: { en: "Daily", pl: "Codziennie", de: "Täglich" } },
    ],
    defaultValue: "60",
  },
  {
    key: "sync_watched",
    type: "toggle",
    scope: "global",
    adminOnly: true,
    label: { en: "Sync watched status", pl: "Synchronizuj obejrzane", de: "Gesehen-Status synchronisieren" },
    description: { en: "Synchronize watched and unwatched changes between TubeArchivist and all YT Zero profiles.", pl: "Synchronizuje zmiany stanu obejrzenia w obie strony między TubeArchivist a wszystkimi profilami YT Zero.", de: "Synchronisiert Gesehen- und Ungesehen-Änderungen zwischen TubeArchivist und allen YT-Zero-Profilen." },
    defaultValue: 1,
  },
];

export const NOTIFICATION_PROVIDER_SETTINGS: PluginSettingSource[] = [
  {
    key: "provider",
    type: "select",
    scope: "global",
    adminOnly: true,
    label: { en: "Notification provider", pl: "Dostawca powiadomień", de: "Benachrichtigungsanbieter" },
    description: {
      en: "Where notifications leave this installation. Each profile chooses its own targets in Settings → Notifications.",
      pl: "Gdzie powiadomienia opuszczają tę instalację. Każdy profil wybiera własne cele w Ustawieniach → Powiadomienia.",
      de: "Wohin Benachrichtigungen diese Installation verlassen. Jedes Profil wählt eigene Ziele unter Einstellungen → Benachrichtigungen.",
    },
    options: [
      { value: "off", label: { en: "No external delivery", pl: "Bez wysyłki zewnętrznej", de: "Kein externer Versand" } },
      { value: "apprise", label: { en: "Apprise", pl: "Apprise", de: "Apprise" } },
      { value: "ntfy", label: { en: "ntfy", pl: "ntfy", de: "ntfy" } },
      { value: "webhook", label: { en: "Webhook", pl: "Webhook", de: "Webhook" } },
    ],
    defaultValue: "off",
  },
];

export const DISCOVERY_SETTINGS: PluginSettingSource[] = [
  { key: "total_limit", label: { en: "Number of suggestions", pl: "Liczba propozycji", de: "Anzahl der Vorschläge" }, description: { en: "How many videos Recommendations should prepare at once.", pl: "Ile filmów Rekomendacje mają przygotować naraz.", de: "Wie viele Videos Empfehlungen auf einmal vorbereiten soll." }, min: 8, max: 80, step: 1, defaultValue: 32 },
  { key: "per_channel_limit", label: { en: "Videos from one channel", pl: "Filmy z jednego kanału", de: "Videos von einem Kanal" }, description: { en: "Prevents one channel from taking over the whole list.", pl: "Pilnuje, żeby jeden kanał nie zajął całej listy.", de: "Verhindert, dass ein Kanal die ganze Liste dominiert." }, min: 1, max: 20, step: 1, defaultValue: 5 },
  { key: "shared_tag_points", label: { en: "Shared tags", pl: "Wspólne tagi", de: "Gemeinsame Tags" }, description: { en: "Fallback tag affinity used after Pulse has matched tags and channels for the current hour.", pl: "Ogólne dopasowanie tagów używane po godzinowym dopasowaniu Pulse dla tagów i kanałów.", de: "Allgemeine Tag-Affinität nach dem stündlichen Pulse-Abgleich für Tags und Kanäle." }, min: 0, max: 80, step: 1, defaultValue: 25 },
  { key: "tag_history_points", label: { en: "Watched tags", pl: "Oglądane tagi", de: "Angesehene Tags" }, description: { en: "Adds weight for tags that appear often in your watch history.", pl: "Dodaje wagę tagom, które często pojawiają się w Twojej historii.", de: "Gewichtet Tags höher, die oft in deinem Verlauf vorkommen." }, min: 0, max: 20, step: 1, defaultValue: 3 },
  { key: "tag_history_cap", label: { en: "Watched tag limit", pl: "Limit oglądanych tagów", de: "Limit für angesehene Tags" }, description: { en: "Caps how much watched tags can influence one video.", pl: "Ogranicza, jak mocno oglądane tagi mogą podbić jeden film.", de: "Begrenzt, wie stark angesehene Tags ein Video anheben können." }, min: 0, max: 120, step: 1, defaultValue: 36 },
  { key: "watched_channel_points", label: { en: "Known channels", pl: "Znane kanały", de: "Bekannte Kanäle" }, description: { en: "General channel affinity used after current-hour Pulse matches.", pl: "Ogólne dopasowanie kanałów używane po godzinowych dopasowaniach Pulse.", de: "Allgemeine Kanal-Affinität nach den Pulse-Treffern der aktuellen Stunde." }, min: 0, max: 30, step: 1, defaultValue: 8 },
  { key: "watched_channel_cap", label: { en: "Known channel limit", pl: "Limit znanych kanałów", de: "Limit für bekannte Kanäle" }, description: { en: "Caps how much channel history can influence one video.", pl: "Ogranicza wpływ historii kanału na jeden film.", de: "Begrenzt den Einfluss der Kanalhistorie auf ein Video." }, min: 0, max: 120, step: 1, defaultValue: 40 },
  { key: "playlist_points", label: { en: "Your playlists", pl: "Twoje playlisty", de: "Deine Playlists" }, description: { en: "Raises videos that are already saved in your playlists.", pl: "Podbija filmy zapisane już na Twoich playlistach.", de: "Hebt Videos an, die bereits in deinen Playlists liegen." }, min: 0, max: 80, step: 1, defaultValue: 20 },
  { key: "liked_points", label: { en: "Liked videos", pl: "Polubione filmy", de: "Favorisierte Videos" }, description: { en: "Raises videos you marked as liked.", pl: "Podbija filmy oznaczone jako polubione.", de: "Hebt Videos an, die du favorisiert hast." }, min: 0, max: 100, step: 1, defaultValue: 35 },
  { key: "already_watched_points", label: { en: "Opened before", pl: "Wcześniej otwarte", de: "Zuvor geöffnet" }, description: { en: "Gives a small boost to videos you opened but did not complete.", pl: "Lekko podbija filmy otwarte wcześniej, ale niedokończone.", de: "Gewichtet zuvor geöffnete, aber nicht beendete Videos leicht höher." }, min: 0, max: 50, step: 1, defaultValue: 10 },
  { key: "started_points", label: { en: "Started videos", pl: "Rozpoczęte filmy", de: "Begonnene Videos" }, description: { en: "Raises videos where you watched part of the material.", pl: "Podbija filmy, które były już częściowo oglądane.", de: "Hebt Videos an, von denen du bereits einen Teil gesehen hast." }, min: 0, max: 80, step: 1, defaultValue: 15 },
  { key: "recency_points", label: { en: "Freshness", pl: "Świeżość", de: "Aktualität" }, description: { en: "Raises newer videos so the list does not feel stale.", pl: "Podbija nowsze filmy, żeby lista nie była zbyt stara.", de: "Hebt neuere Videos an, damit die Liste aktuell bleibt." }, min: 0, max: 60, step: 1, defaultValue: 18 },
  { key: "external_enabled", type: "toggle", label: { en: "Look outside your subscriptions", pl: "Szukaj poza subskrypcjami", de: "Außerhalb deiner Abos suchen" }, description: { en: "Asks YouTube which videos people watched next after the ones you finished, and mixes the best of them into Recommendations.", pl: "Pyta YouTube, co ludzie oglądali po filmach, które skończyłeś, i miesza najlepsze z nich w Rekomendacjach.", de: "Fragt YouTube, was Zuschauer nach deinen beendeten Videos gesehen haben, und mischt die besten Treffer in die Empfehlungen." }, defaultValue: 0 },
  { key: "seed_count", label: { en: "Videos used as starting points", pl: "Filmy użyte jako punkty wyjścia", de: "Videos als Ausgangspunkte" }, description: { en: "How many videos from your history are used to ask what to watch next. More starting points cost more requests.", pl: "Ile filmów z historii służy do pytania, co obejrzeć dalej. Więcej punktów wyjścia to więcej zapytań.", de: "Wie viele Videos aus deinem Verlauf als Ausgangspunkt dienen. Mehr Punkte bedeuten mehr Anfragen." }, min: 4, max: 24, step: 1, defaultValue: 12 },
  { key: "external_limit", label: { en: "Outside videos kept", pl: "Zachowane filmy z zewnątrz", de: "Behaltene externe Videos" }, description: { en: "Upper limit on temporary videos imported from outside your subscriptions in one pass.", pl: "Górny limit tymczasowych filmów importowanych spoza subskrypcji w jednym przebiegu.", de: "Obergrenze für temporär importierte Videos außerhalb deiner Abos pro Durchlauf." }, min: 0, max: 60, step: 1, defaultValue: 24 },
  { key: "outside_base_points", label: { en: "Outside videos", pl: "Filmy z zewnątrz", de: "Externe Videos" }, description: { en: "Starting weight every video found outside your subscriptions receives.", pl: "Startowa waga każdego filmu znalezionego poza subskrypcjami.", de: "Startgewicht für jedes außerhalb deiner Abos gefundene Video." }, min: 0, max: 2000, step: 50, defaultValue: 600 },
  { key: "cooccurrence_points", label: { en: "Appears next to several of your videos", pl: "Pojawia się obok kilku Twoich filmów", de: "Taucht neben mehreren deiner Videos auf" }, description: { en: "The strongest outside signal: a video YouTube links to several things you watched.", pl: "Najmocniejszy sygnał z zewnątrz: film, który YouTube łączy z kilkoma obejrzanymi przez Ciebie.", de: "Das stärkste externe Signal: ein Video, das YouTube mit mehreren deiner Videos verknüpft." }, min: 0, max: 3000, step: 50, defaultValue: 1200 },
  { key: "outside_seed_points", label: { en: "Strength of the starting points", pl: "Siła punktów wyjścia", de: "Stärke der Ausgangspunkte" }, description: { en: "How much it matters that the videos leading here were ones you actually finished.", pl: "Jak bardzo liczy się to, że filmy prowadzące tutaj zostały przez Ciebie dokończone.", de: "Wie stark zählt, dass die hinführenden Videos tatsächlich zu Ende gesehen wurden." }, min: 0, max: 1000, step: 25, defaultValue: 300 },
  { key: "novelty_penalty", label: { en: "Prefer unfamiliar channels", pl: "Preferuj nieznane kanały", de: "Unbekannte Kanäle bevorzugen" }, description: { en: "Lowers outside videos from channels you already follow, because your feed covers those already.", pl: "Obniża filmy z zewnątrz z kanałów, które już subskrybujesz, bo pokrywa je Twój feed.", de: "Senkt externe Videos von Kanälen, denen du bereits folgst, weil dein Feed diese schon abdeckt." }, min: 0, max: 2000, step: 50, defaultValue: 400 },
  { key: "external_adjustment", label: { en: "Outside video adjustment", pl: "Korekta filmów z zewnątrz", de: "Korrektur für externe Videos" }, description: { en: "Final nudge applied to every temporary video, up or down.", pl: "Końcowa korekta stosowana do każdego tymczasowego filmu, w górę lub w dół.", de: "Letzte Korrektur für jedes temporäre Video, nach oben oder unten." }, min: -500, max: 500, step: 25, defaultValue: 0 },
  { key: "min_view_count", label: { en: "Minimum views", pl: "Minimalna liczba wyświetleń", de: "Mindestaufrufe" }, description: { en: "Skips outside videos almost nobody has watched.", pl: "Pomija filmy z zewnątrz, których prawie nikt nie obejrzał.", de: "Überspringt externe Videos, die fast niemand gesehen hat." }, min: 0, max: 10000, step: 100, defaultValue: 500 },
  { key: "min_duration_minutes", label: { en: "Minimum length", pl: "Minimalna długość", de: "Mindestlänge" }, description: { en: "Skips outside videos shorter than this, in minutes.", pl: "Pomija filmy z zewnątrz krótsze niż tyle minut.", de: "Überspringt externe Videos, die kürzer als diese Minutenzahl sind." }, min: 0, max: 30, step: 1, defaultValue: 4 },
  { key: "random_pick_count", label: { en: "Variety near the top", pl: "Różnorodność na początku", de: "Abwechslung am Anfang" }, description: { en: "Mixes in a few strong suggestions so the list changes between reloads.", pl: "Miesza kilka mocnych propozycji, żeby lista zmieniała się po przeładowaniu.", de: "Mischt starke Vorschläge ein, damit die Liste beim Neuladen variiert." }, min: 0, max: 10, step: 1, defaultValue: 3 },
  { key: "high_pick_count", label: { en: "Top matches after variety", pl: "Najlepsze po miksie", de: "Beste Treffer nach dem Mix" }, description: { en: "How many strongest matches should follow the first mixed items.", pl: "Ile najmocniejszych dopasowań ma iść po pierwszych wymieszanych pozycjach.", de: "Wie viele stärkste Treffer nach den gemischten Einträgen folgen." }, min: 0, max: 20, step: 1, defaultValue: 6 },
];


export const PLUGINS: PluginManifest[] = [
  {
    id: "discovery",
    name: "Recommendations",
    version: "0.3.0",
    description: "Ranks your library and, when asked, looks outside your subscriptions for what to watch next.",
    route: "/recommendations",
    icon: "Sparkles",
    permissions: ["read:library", "read:history", "fetch:youtube"],
  },
  {
    id: "social",
    name: "Social",
    version: "0.1.0",
    description: "A local social space where profiles share videos, react and comment together.",
    route: "/social",
    icon: "UsersRound",
    permissions: ["read:profiles", "read:library", "write:social"],
    settingsScope: "user",
  },
  {
    id: "notifications",
    name: "External notifications",
    version: "0.1.0",
    description: "Forwards everything that reaches the notification bell to an external service.",
    icon: "BellRing",
    permissions: ["read:notifications", "write:external"],
    settingsScope: "global",
  },
  {
    id: "tubearchivist",
    name: "TubeArchivist",
    version: "0.1.0",
    description: "Uses a TubeArchivist library as a local source in the existing feed.",
    icon: "Archive",
    permissions: ["read:tubearchivist", "write:watched", "read:library"],
    settingsScope: "global",
  },
];

export const PLUGIN_TEXT: Record<string, { name: LocalizedText; description: LocalizedText; permissions: Record<string, LocalizedText> }> = {
  discovery: {
    name: { en: "Recommendations", pl: "Rekomendacje", de: "Empfehlungen" },
    description: {
      en: "Ranks your library and, when asked, looks outside your subscriptions for what to watch next.",
      pl: "Porządkuje bibliotekę, a na życzenie szuka poza subskrypcjami, co obejrzeć dalej.",
      de: "Sortiert deine Bibliothek und sucht auf Wunsch außerhalb deiner Abos nach dem nächsten Video.",
    },
    permissions: {
      "read:library": { en: "reads your local library", pl: "czyta lokalną bibliotekę", de: "liest deine lokale Bibliothek" },
      "read:history": { en: "uses your watch history", pl: "używa historii oglądania", de: "nutzt deinen Verlauf" },
      "fetch:youtube": { en: "asks YouTube for related videos when enabled", pl: "pyta YouTube o powiązane filmy, gdy jest włączone", de: "fragt YouTube nach verwandten Videos, wenn aktiviert" },
    },
  },
  social: {
    name: { en: "Social", pl: "Social", de: "Social" },
    description: {
      en: "A local space where profiles share videos, use emoji reactions, mention each other and comment together.",
      pl: "Lokalne miejsce, w którym profile udostępniają filmy, reagują emoji, oznaczają się i wspólnie komentują.",
      de: "Ein lokaler Bereich, in dem Profile Videos teilen, mit Emojis reagieren, sich erwähnen und gemeinsam kommentieren.",
    },
    permissions: {
      "read:profiles": { en: "shows participating profile names and avatars", pl: "pokazuje nazwy i avatary uczestniczących profili", de: "zeigt Namen und Avatare teilnehmender Profile" },
      "read:library": { en: "reads videos from the local library", pl: "czyta filmy z lokalnej biblioteki", de: "liest Videos aus der lokalen Bibliothek" },
      "write:social": { en: "stores posts, reactions, mentions and comments locally", pl: "zapisuje lokalnie posty, reakcje, oznaczenia i komentarze", de: "speichert Beiträge, Reaktionen, Erwähnungen und Kommentare lokal" },
    },
  },
  notifications: {
    name: { en: "External notifications", pl: "Powiadomienia zewnętrzne", de: "Externe Benachrichtigungen" },
    description: {
      en: "Sends every notification from the bell to another service through Apprise, ntfy or a webhook. Which events fire, and where each profile receives them, stays in Settings → Notifications.",
      pl: "Wysyła każde powiadomienie z dzwoneczka do innej usługi przez Apprise, ntfy lub webhook. Wybór zdarzeń i celów każdego profilu pozostaje w Ustawieniach → Powiadomienia.",
      de: "Sendet jede Benachrichtigung aus der Glocke über Apprise, ntfy oder einen Webhook an einen anderen Dienst. Welche Ereignisse ausgelöst werden und wohin jedes Profil sie erhält, bleibt unter Einstellungen → Benachrichtigungen.",
    },
    permissions: {
      "read:notifications": { en: "reads the notifications shown in the bell", pl: "czyta powiadomienia widoczne w dzwoneczku", de: "liest die in der Glocke angezeigten Benachrichtigungen" },
      "write:external": { en: "sends them to the configured external service", pl: "wysyła je do skonfigurowanej usługi zewnętrznej", de: "sendet sie an den konfigurierten externen Dienst" },
    },
  },
  tubearchivist: {
    name: { en: "TubeArchivist", pl: "TubeArchivist", de: "TubeArchivist" },
    description: {
      en: "Adds archived videos directly to the main feed and plays their local media.",
      pl: "Dodaje zarchiwizowane filmy bezpośrednio do głównego feedu i odtwarza lokalne pliki.",
      de: "Fügt archivierte Videos direkt zum Hauptfeed hinzu und spielt lokale Medien ab.",
    },
    permissions: {
      "read:tubearchivist": { en: "reads your TubeArchivist catalog and comments", pl: "czyta katalog i komentarze TubeArchivist", de: "liest den TubeArchivist-Katalog und Kommentare" },
      "write:watched": { en: "updates watched status in TubeArchivist", pl: "aktualizuje stan obejrzenia w TubeArchivist", de: "aktualisiert den Gesehen-Status in TubeArchivist" },
      "read:library": { en: "adds archived videos to the local feed", pl: "dodaje zarchiwizowane filmy do lokalnego feedu", de: "fügt archivierte Videos zum lokalen Feed hinzu" },
    },
  },
};
