import type { keyboardShortcutMessagesEn } from "./keyboardShortcuts.en";

export const keyboardShortcutMessagesDe = {
    keyboardShortcuts: "Tastenkürzel", keyboardShortcutsHint: "Kürzel anklicken und die neue Tastenkombination drücken. Änderungen gelten für beide Player.",
    shortcutPlayback: "Wiedergabe", shortcutSubtitles: "Untertitel", shortcutGeneral: "Allgemein",
    shortcutPressKeys: "Tasten drücken…", shortcutClear: "Kürzel deaktivieren", shortcutReset: "Standard wiederherstellen", shortcutResetAll: "Alle Standards wiederherstellen",
    shortcutConflict: "Diese Tastenkombination ist im selben Kontext bereits belegt.", shortcutSaveFailed: "Die Tastenkürzel konnten nicht gespeichert werden.",
    shortcutTogglePlay: "Wiedergabe / Pause", shortcutTemporaryBoost: "Für 2× gedrückt halten", shortcutSeekBack10: "10 Sekunden zurück", shortcutSeekForward10: "10 Sekunden vor",
    shortcutPreviousVideo: "Vorheriges Video", shortcutNextVideo: "Nächstes Video", shortcutPreviousFrame: "Vorheriges Einzelbild bei Pause", shortcutNextFrame: "Nächstes Einzelbild bei Pause",
    shortcutSpeedDown: "Geschwindigkeit verringern", shortcutSpeedUp: "Geschwindigkeit erhöhen", shortcutSeekPercent: "Zu 0–90 % springen", shortcutPreviousChapter: "Vorheriges Kapitel",
    shortcutNextChapter: "Nächstes Kapitel", shortcutSeekBack: "Zurückspulen", shortcutSeekForward: "Vorspulen", shortcutVolumeUp: "Lauter", shortcutVolumeDown: "Leiser",
    shortcutToggleCaptions: "Untertitel umschalten", shortcutSubtitleLarger: "Untertitel vergrößern", shortcutSubtitleSmaller: "Untertitel verkleinern",
    shortcutToggleFullscreen: "Vollbild umschalten", shortcutToggleTheater: "Kinomodus umschalten", shortcutToggleImmersive: "Immersiven Modus umschalten", shortcutTogglePictureInPicture: "Bild-in-Bild umschalten", shortcutClose: "Aktuellen Modus schließen",
    shortcutToggleMute: "Stummschalten", shortcutScreenshot: "Bildschirmfoto speichern",
} satisfies Record<keyof typeof keyboardShortcutMessagesEn, string>;
