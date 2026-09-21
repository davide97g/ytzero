import { describe, expect, test } from "bun:test";
import { browserLanguage } from "./i18n";
import { isPublicSharePath } from "./publicSharePath";

describe("public share bootstrap boundary", () => {
  test("recognizes only the dedicated public route tree", () => {
    expect(isPublicSharePath("/share/token")).toBe(true);
    expect(isPublicSharePath("/share/token/video/id")).toBe(true);
    expect(isPublicSharePath("/settings")).toBe(false);
    expect(isPublicSharePath("/api/share/token")).toBe(false);
  });

  test("selects a supported browser language and falls back to English", () => {
    expect(browserLanguage(["it-IT", "en-US"])).toBe("it");
    expect(browserLanguage(["it-CH"])).toBe("it");
    expect(browserLanguage(["pl-PL"])).toBe("en");
    expect(browserLanguage(["xx-ZZ"])).toBe("en");
  });
});
