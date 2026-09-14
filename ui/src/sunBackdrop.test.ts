import { describe, expect, test } from "bun:test";
import {
  driftedStars,
  moonPhasePath,
  parseCoordinate,
  resolveCoordinates,
  skyBackdropStyle,
  skyBackdropVariables,
  starField,
  starOpacity,
  sunBackdropStyle,
  sunBackdropVariables,
} from "./sunBackdrop";

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

describe("moon backdrop", () => {
  test("hangs opposite the sun on a full moon night", () => {
    // Full moon in the small hours: the moon is up and the sun is well down.
    const { sun, moon } = skyBackdropStyle(Date.UTC(2026, 0, 3, 1, 0, 0), WARSAW);
    expect(sun.phase).toBe("night");
    expect(moon.altitudeDeg).toBeGreaterThan(0);
    expect(moon.illuminated).toBeGreaterThan(0.97);
    expect(moon.opacity).toBeGreaterThan(0);
    expect(moon.y).toBeLessThan(92);
  });

  test("fades out in daylight and once it has set", () => {
    const noon = skyBackdropStyle(Date.UTC(2026, 5, 21, 10, 40, 0), WARSAW);
    expect(noon.sun.phase).toBe("day");
    // A midday moon is washed out whether or not it is above the horizon.
    expect(noon.moon.opacity).toBe(0);

    for (let hour = 0; hour < 24; hour++) {
      const { moon } = skyBackdropStyle(Date.UTC(2026, 2, 14, hour, 0, 0), WARSAW);
      if (moon.altitudeDeg < -8) expect(moon.opacity).toBe(0);
      expect(moon.opacity).toBeLessThanOrEqual(0.5);
    }
  });

  test("turns its lit limb towards the sun", () => {
    // An evening crescent: the sun has just gone down in the west, so the lit
    // limb has to lean that way rather than point straight up or down.
    const evening = skyBackdropStyle(Date.UTC(2026, 0, 22, 17, 30, 0), WARSAW);
    const towardsSun = Math.atan2(evening.sun.y - evening.moon.y, evening.sun.x - evening.moon.x) * (180 / Math.PI);
    expect(evening.moon.tiltDeg).toBeCloseTo(towardsSun, 1);
    expect(evening.moon.waxing).toBe(true);
    expect(Math.cos(evening.moon.tiltDeg * (Math.PI / 180))).toBeGreaterThan(0);

    // A waning crescent before dawn has the sun still to the east, so the lit
    // limb leans the other way.
    const morning = skyBackdropStyle(Date.UTC(2026, 0, 13, 5, 30, 0), WARSAW);
    expect(morning.moon.waxing).toBe(false);
    expect(Math.cos(morning.moon.tiltDeg * (Math.PI / 180))).toBeLessThan(0);
  });

  test("draws the lit part from a sliver to the whole disc", () => {
    // A new moon encloses nothing, a full moon closes the circle, and the
    // terminator flips its curve once past half.
    expect(moonPhasePath(46, 0)).toContain("A 46.000 46.000 0 0 0");
    expect(moonPhasePath(46, 1)).toContain("A 46.000 46.000 0 0 1");
    expect(moonPhasePath(46, 0.5)).toContain("A 0.000 46.000");
    expect(moonPhasePath(46, 0.25)).toContain("A 23.000 46.000 0 0 0");
    expect(moonPhasePath(46, 0.75)).toContain("A 23.000 46.000 0 0 1");
    // Out-of-range values are clamped rather than drawn as a broken path.
    expect(moonPhasePath(10, 2)).toBe(moonPhasePath(10, 1));
  });
});

describe("stars", () => {
  test("come out with the depth of twilight, not before", () => {
    expect(starOpacity(20)).toBe(0);
    expect(starOpacity(-1)).toBe(0);
    expect(starOpacity(-7.5)).toBeCloseTo(0.5, 1);
    expect(starOpacity(-13)).toBe(1);
    expect(starOpacity(-40)).toBe(1);
  });

  test("are the same sky on every reload", () => {
    expect(starField(12)).toEqual(starField(12));
    // A different seed is a different sky, so the field is genuinely generated.
    expect(JSON.stringify(starField(12, 1)) === JSON.stringify(starField(12, 2))).toBe(false);
  });

  test("stay in the sky rather than on the horizon", () => {
    for (const star of starField()) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(100);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThan(92);
      expect(star.radius).toBeGreaterThan(0);
    }
  });

  test("drift westward and wrap without a visible seam", () => {
    const field = starField(40);
    const atMs = Date.UTC(2026, 5, 21, 22, 0, 0);
    const later = driftedStars(field, atMs + 3_600_000);
    const now = driftedStars(field, atMs);
    for (const [index, star] of now.entries()) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThan(100);
      // Anything at the edge is already faded, so the wrap never pops.
      if (star.x < 1 || star.x > 99) expect(star.opacity).toBeLessThan(0.2);
      const moved = ((star.x - later[index]!.x) % 100 + 100) % 100;
      expect(moved).toBeCloseTo(8.356, 1);
    }
  });
});

describe("sky variables", () => {
  test("exposes the sun, the moon and the stars to CSS", () => {
    const variables = skyBackdropVariables(skyBackdropStyle(Date.UTC(2026, 0, 3, 1, 0, 0), WARSAW));
    expect(Object.keys(variables).sort()).toEqual([
      "--moon-opacity", "--moon-tilt", "--moon-x", "--moon-y",
      "--star-opacity", "--sun-glow", "--sun-opacity", "--sun-sky", "--sun-x", "--sun-y",
    ]);
    expect(variables["--moon-tilt"]!.endsWith("deg")).toBe(true);
    expect(variables["--moon-x"]!.endsWith("%")).toBe(true);
  });
});
