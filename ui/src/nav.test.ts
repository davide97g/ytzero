import { describe, expect, test } from "bun:test";
import { NAV_ITEMS, isMobileMoreActive, isNavItemActive, parseNavConfig, splitMobileNavItems, splitNavItems } from "./nav";

describe("recommendations navigation", () => {
  test("uses the first-class recommendations route", () => {
    expect(NAV_ITEMS.some((item) => item.to === "/recommendations")).toBe(true);
    expect(NAV_ITEMS.some((item) => item.to === "/discovery")).toBe(false);
  });

  test("hides recommendations by default while keeping it available in display settings", () => {
    const parsed = parseNavConfig(null);

    expect(JSON.stringify(parsed.find((entry) => entry.key === "/recommendations"))).toBe(JSON.stringify({
      key: "/recommendations",
      hidden: true,
    }));
    expect(splitNavItems(parsed).hidden.some((item) => item.to === "/recommendations")).toBe(true);
  });

  test("preserves an explicitly enabled recommendations entry", () => {
    const parsed = parseNavConfig(JSON.stringify([
      { key: "/recommendations", hidden: false },
    ]));

    expect(splitNavItems(parsed).visible.some((item) => item.to === "/recommendations")).toBe(true);
  });

  test("migrates the legacy discovery entry without losing its position or visibility", () => {
    const parsed = parseNavConfig(JSON.stringify([
      { key: "/", hidden: false },
      { key: "/discovery", hidden: true },
      { key: "/history", hidden: false },
    ]));

    expect(JSON.stringify(parsed.slice(0, 3))).toBe(JSON.stringify([
      { key: "/", hidden: false },
      { key: "/recommendations", hidden: true },
      { key: "/history", hidden: false },
    ]));
    expect(parsed.filter((entry) => entry.key === "/recommendations").length).toBe(1);
    expect(splitNavItems(parsed).hidden.some((item) => item.to === "/recommendations")).toBe(true);
  });

  test("deduplicates a config containing both legacy and current routes", () => {
    const parsed = parseNavConfig(JSON.stringify([
      { key: "/discovery", hidden: false },
      { key: "/recommendations", hidden: true },
    ]));

    expect(JSON.stringify(parsed.filter((entry) => entry.key === "/recommendations"))).toBe(JSON.stringify([
      { key: "/recommendations", hidden: false },
    ]));
  });

  test("keeps completely hidden entries configurable without rendering them in the sidebar", () => {
    const parsed = parseNavConfig(JSON.stringify([
      { key: "/history", hidden: false, disabled: true },
      { key: "/bookmarks", hidden: false },
    ]));
    const split = splitNavItems(parsed);
    expect(split.visible.some((item) => item.to === "/bookmarks")).toBe(true);
    expect(split.visible.some((item) => item.to === "/history")).toBe(false);
    expect(split.hidden.some((item) => item.to === "/history")).toBe(false);
    expect(parsed.find((entry) => entry.key === "/history")?.disabled).toBe(true);
  });
});

describe("mobile footer navigation", () => {
  test("keeps four or fewer visible items on the tab bar", () => {
    const items = NAV_ITEMS.slice(0, 3);
    expect(splitMobileNavItems(items)).toEqual({ tabs: items, overflow: [] });
  });

  test("pins the first four visible items and sends the rest to More", () => {
    const items = NAV_ITEMS.slice(0, 6);
    expect(splitMobileNavItems(items)).toEqual({
      tabs: items.slice(0, 4),
      overflow: items.slice(4),
    });
  });

  test("treats exact home matches as active only for the Main tab", () => {
    const home = NAV_ITEMS[0];
    expect(isNavItemActive(home, "/")).toBe(true);
    expect(isNavItemActive(home, "/history")).toBe(false);
  });

  test("highlights More on overflow, hidden, and library destinations", () => {
    const byPath = (path: string) => NAV_ITEMS.find((item) => item.to === path)!;
    const tabs = [byPath("/"), byPath("/social"), byPath("/downloads"), byPath("/settings")];
    const overflow = [byPath("/history")];
    const hidden = [byPath("/recommendations")];
    expect(isMobileMoreActive(tabs, overflow, hidden, "/")).toBe(false);
    expect(isMobileMoreActive(tabs, overflow, hidden, "/history")).toBe(true);
    expect(isMobileMoreActive(tabs, overflow, hidden, "/recommendations")).toBe(true);
    expect(isMobileMoreActive(tabs, overflow, hidden, "/channel/abc")).toBe(true);
    expect(isMobileMoreActive(tabs, overflow, hidden, "/watch/abc")).toBe(false);
    expect(isMobileMoreActive(tabs, overflow, hidden, "/search")).toBe(false);
  });
});
