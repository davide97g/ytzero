import type { keyboardShortcutMessagesEn } from "./keyboardShortcuts.en";

export const keyboardShortcutMessagesPl = {
    keyboardShortcuts: "Skróty klawiszowe", keyboardShortcutsHint: "Kliknij skrót, a następnie naciśnij nową kombinację. Zmiany dotyczą obu odtwarzaczy.",
    shortcutPlayback: "Odtwarzanie", shortcutSubtitles: "Napisy", shortcutGeneral: "Ogólne",
    shortcutPressKeys: "Naciśnij klawisze…", shortcutClear: "Wyłącz skrót", shortcutReset: "Przywróć domyślny", shortcutResetAll: "Przywróć wszystkie domyślne",
    shortcutConflict: "Ta kombinacja jest już przypisana w tym samym kontekście.", shortcutSaveFailed: "Nie udało się zapisać skrótów klawiszowych.",
    shortcutTogglePlay: "Odtwórz / pauza", shortcutTemporaryBoost: "Przytrzymaj dla prędkości 2×", shortcutSeekBack10: "Cofnij o 10 sekund", shortcutSeekForward10: "Przewiń o 10 sekund",
    shortcutPreviousVideo: "Poprzedni film", shortcutNextVideo: "Następny film", shortcutPreviousFrame: "Poprzednia klatka na pauzie", shortcutNextFrame: "Następna klatka na pauzie",
    shortcutSpeedDown: "Zmniejsz prędkość", shortcutSpeedUp: "Zwiększ prędkość", shortcutSeekPercent: "Przejdź do 0–90% filmu", shortcutPreviousChapter: "Poprzedni rozdział",
    shortcutNextChapter: "Następny rozdział", shortcutSeekBack: "Cofnij", shortcutSeekForward: "Przewiń", shortcutVolumeUp: "Głośniej", shortcutVolumeDown: "Ciszej",
    shortcutToggleCaptions: "Włącz / wyłącz napisy", shortcutSubtitleLarger: "Powiększ napisy", shortcutSubtitleSmaller: "Pomniejsz napisy",
    shortcutToggleFullscreen: "Pełny ekran", shortcutToggleTheater: "Tryb kinowy", shortcutToggleImmersive: "Tryb immersyjny", shortcutTogglePictureInPicture: "Włącz / wyłącz obraz w obrazie", shortcutClose: "Zamknij bieżący tryb",
    shortcutToggleMute: "Wycisz / włącz dźwięk", shortcutScreenshot: "Zapisz zrzut klatki",
} satisfies Record<keyof typeof keyboardShortcutMessagesEn, string>;
