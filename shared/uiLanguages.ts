/**
 * Canonical UI-language contract shared by the browser and the server.
 *
 * This fork maintains and supports exactly two interface languages: English and
 * Italian. Keep this module dependency-free: both independently built
 * applications import it, and deployment packaging copies it alongside their
 * source trees.
 */
export const UI_LANGUAGES = {
  en: { locale: "en-US", nativeName: "English", base: "en" },
  it: { locale: "it-IT", nativeName: "Italiano", base: "it" },
} as const;

export type Language = keyof typeof UI_LANGUAGES;

export const LANGUAGE_CODES = Object.keys(UI_LANGUAGES) as Language[];

export const LOCALE_TAGS: Record<Language, string> = Object.fromEntries(
  LANGUAGE_CODES.map((code) => [code, UI_LANGUAGES[code].locale]),
) as Record<Language, string>;

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && value in UI_LANGUAGES;
}

export function normalizeLanguage(value: unknown): Language {
  return isLanguage(value) ? value : "en";
}
