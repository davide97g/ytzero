import { describe, expect, test } from "bun:test";
import { LOCALE_TAGS } from "../../shared/uiLanguages";
import { localeForLanguage, normalizeLanguage } from "./uiLanguage";

describe("server UI-language normalization", () => {
  test("uses the shared catalogue for persisted settings and sorting locales", () => {
    expect(normalizeLanguage("it")).toBe("it");
    expect(normalizeLanguage("pt-BR")).toBe("en");
    expect(normalizeLanguage("invalid")).toBe("en");
    expect(localeForLanguage("it")).toBe(LOCALE_TAGS.it);
    expect(localeForLanguage("invalid")).toBe("en-US");
  });
});
