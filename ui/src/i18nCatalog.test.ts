import { describe, expect, test } from "bun:test";
import { LANGUAGE_CODES, LOCALE_TAGS, normalizeLanguage, UI_LANGUAGES } from "../../shared/uiLanguages";
import { en } from "./i18n/locales/en";
import { localeLoaders } from "./i18n";

declare const Bun: {
  Glob: new (pattern: string) => { scan(options: { cwd: string }): AsyncIterable<string> };
  file(path: string): { text(): Promise<string> };
};

declare global {
  interface ImportMeta {
    readonly dir: string;
  }
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe("UI language catalogue", () => {
  test("has an Intl locale and a native picker name for every supported language", () => {
    expect(LANGUAGE_CODES).toEqual(["en", "it"]);
    for (const code of LANGUAGE_CODES) {
      expect(UI_LANGUAGES[code].nativeName.length > 0).toBe(true);
      expect(new Intl.NumberFormat(LOCALE_TAGS[code]).format(1).length > 0).toBe(true);
    }
  });

  test("keeps the pre-React document-language bootstrap in sync with supported languages", async () => {
    const documentSource = await Bun.file(`${import.meta.dir}/../index.html`).text();
    const codes = documentSource.match(/const bootstrapLanguageCodes = (\[[^\n]+\]);/)?.[1];
    expect(codes == null ? null : JSON.parse(codes)).toEqual(LANGUAGE_CODES);
  });

  test("normalizes unknown persisted values to English", () => {
    expect(normalizeLanguage("it")).toBe("it");
    expect(normalizeLanguage("fr")).toBe("en");
    expect(normalizeLanguage("unknown")).toBe("en");
    expect(normalizeLanguage(null)).toBe("en");
  });

  test("loads a complete locale module for every non-English language", async () => {
    const englishKeys = Object.keys(en.messages).sort();
    for (const [code, load] of Object.entries(localeLoaders)) {
      const locale = await load();
      expect(Object.keys(locale.messages).sort()).toEqual(englishKeys);
      expect(locale.format.videoCount(1).length > 0).toBe(true);

      let valuesIdenticalToEnglish = 0;
      for (const key of englishKeys) {
        const typedKey = key as keyof typeof en.messages;
        const translated = locale.messages[typedKey];
        expect(translated.trim().length > 0).toBe(true);
        expect(placeholders(translated)).toEqual(placeholders(en.messages[typedKey]));
        if (translated === en.messages[typedKey]) valuesIdenticalToEnglish += 1;
      }

      // Product names and technical vocabulary can intentionally stay unchanged,
      // but a locale must never silently fall back to most of the English catalogue.
      expect(valuesIdenticalToEnglish / englishKeys.length < 0.1).toBe(true);
    }
  });

  // A catalogue module holding every language cannot be tree-shaken, so
  // importing one for a single language ships all of them. The aggregates exist
  // for these tests; shipped code has to import the per-language module.
  test("ships one language at a time instead of importing a catalogue aggregate", async () => {
    const aggregates = [
      "surfaceMessages", "publicSharing", "cluster", "notifications", "feedBuilder",
      "feedTuning", "discoveryExternal", "dailyRotation", "channelSync",
      "keyboardShortcuts", "watchTogether", "featureMessages",
    ];
    const files = new Bun.Glob("**/*.{ts,tsx}");
    for await (const file of files.scan({ cwd: import.meta.dir })) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const name = file.split("/").pop()!.replace(/\.tsx?$/, "");
      if (aggregates.includes(name)) continue;
      const source = await Bun.file(`${import.meta.dir}/${file}`).text();
      const insideCatalogue = file.startsWith("i18n/locales/");
      for (const aggregate of aggregates) {
        // Outside the catalogue only a locales/ path counts: some of these names
        // (channelSync) also belong to unrelated domain modules in src/.
        const imported = insideCatalogue
          ? new RegExp(`from "\\./${aggregate}"`).test(source)
          : new RegExp(`from "[^"]*locales/${aggregate}"`).test(source);
        expect([file, aggregate, imported]).toEqual([file, aggregate, false]);
      }
    }
  });

  test("does not select interface copy with positional language branches", async () => {
    const files = new Bun.Glob("**/*.{ts,tsx}");
    for await (const file of files.scan({ cwd: import.meta.dir })) {
      const source = await Bun.file(`${import.meta.dir}/${file}`).text();
      expect([file, /\bconst\s+tx\s*=/.test(source)]).toEqual([file, false]);
      expect([file, /\blanguage\s*===\s*["']/.test(source)]).toEqual([file, false]);
    }
  });
});
