import { describe, expect, test } from "bun:test";
import { parseCoordinate, resolveCoordinates, sunBackdropStyle, sunBackdropVariables } from "./sunBackdrop";

const WARSAW = { latitude: 52.25, longitude: 21 };

describe("backdrop coordinates", () => {
  test("reads a coordinate only when it is a number inside its range", () => {
    expect(parseCoordinate("52.25", 90)).toBe(52.25);
    expect(parseCoordinate("-0", 90)).toBe(-0);
    expect(parseCoordinate("", 90)).toBeNull();
    expect(parseCoordinate("   ", 90)).toBeNull();
    expect(parseCoordinate("abc", 90)).toBeNull();
    expect(parseCoordinate("120", 90)).toBeNull();
    expect(parseCoordinate("120", 180)).toBe(120);
  });

  test("prefers the operator's own coordinates over the timezone default", () => {
    const fallback = { latitude: 1, longitude: 2 };
    expect(resolveCoordinates("52.25", "21", fallback)).toEqual(WARSAW);
    // A half-filled pair is not a location, so the default still applies.
    expect(resolveCoordinates("52.25", "", fallback)).toEqual(fallback);
    expect(resolveCoordinates("", "", fallback)).toEqual(fallback);
    expect(resolveCoordinates("", "", null)).toBeNull();
    expect(resolveCoordinates("", "", { latitude: null, longitude: null })).toBeNull();
  });
});

describe("sun backdrop placement", () => {
  test("rides high at local noon and drops below the page at night", () => {
    const noon = sunBackdropStyle(Date.UTC(2026, 5, 21, 10, 40, 0), WARSAW);
    const midnight = sunBackdropStyle(Date.UTC(2026, 11, 21, 23, 0, 0), WARSAW);
    expect(noon.phase).toBe("day");
    expect(noon.y).toBeLessThan(45);
    expect(midnight.phase).toBe("night");
    expect(midnight.y).toBeGreaterThan(92);
  });

  test("crosses the page from east to west through the day", () => {
    const morning = sunBackdropStyle(Date.UTC(2026, 5, 21, 5, 0, 0), WARSAW);
    const afternoon = sunBackdropStyle(Date.UTC(2026, 5, 21, 16, 0, 0), WARSAW);
    expect(morning.x).toBeLessThan(afternoon.x);
  });

  test("keeps the disc inside a sane band at every hour and latitude", () => {
    for (const latitude of [-70, -33, 0, 45, 70]) {
      for (let hour = 0; hour < 24; hour++) {
        const style = sunBackdropStyle(Date.UTC(2026, 3, 9, hour, 0, 0), { latitude, longitude: 12 });
        expect(style.x).toBeGreaterThanOrEqual(-10);
        expect(style.x).toBeLessThanOrEqual(110);
        expect(style.y).toBeGreaterThanOrEqual(4);
        expect(style.y).toBeLessThanOrEqual(124);
        expect(style.opacity).toBeGreaterThan(0);
        // Decoration must never compete with the content in front of it.
        expect(style.opacity).toBeLessThanOrEqual(0.3);
      }
    }
  });

  test("warms up at dusk and cools down at night", () => {
    const dusk = sunBackdropStyle(Date.UTC(2026, 5, 21, 19, 30, 0), WARSAW);
    expect(dusk.phase).toBe("dusk");
    expect(dusk.glow).toBe("rgb(238, 104, 78)");
    expect(sunBackdropStyle(Date.UTC(2026, 11, 21, 23, 0, 0), WARSAW).glow).toBe("rgb(40, 58, 104)");
  });

  test("southern latitudes get their own summer", () => {
    // Sydney is UTC+11 in December, so local midday falls near 01:00 UTC.
    const sydney = { latitude: -33.87, longitude: 151.21 };
    const december = sunBackdropStyle(Date.UTC(2026, 11, 21, 2, 0, 0), sydney);
    expect(december.phase).toBe("day");
    expect(december.y).toBeLessThan(30);
    // The same instant is the middle of the night in Warsaw.
    expect(sunBackdropStyle(Date.UTC(2026, 11, 21, 2, 0, 0), WARSAW).phase).toBe("night");
  });

  test("exposes the placement as CSS custom properties", () => {
    const variables = sunBackdropVariables(sunBackdropStyle(Date.UTC(2026, 5, 21, 10, 40, 0), WARSAW));
    expect(Object.keys(variables).sort()).toEqual(["--sun-glow", "--sun-opacity", "--sun-sky", "--sun-x", "--sun-y"]);
    expect(variables["--sun-x"]!.endsWith("%")).toBe(true);
    expect(variables["--sun-glow"]!.startsWith("rgb(")).toBe(true);
  });
});
