import { describe, expect, test } from "bun:test";
import { skyPhase, solarIsRising, solarPosition } from "./solarPosition";

const EQUINOX_NOON_UTC = Date.UTC(2026, 2, 20, 12, 0, 0);

describe("solar position", () => {
  test("at the equinox, peak altitude is 90 minus the latitude", () => {
    // Solar noon drifts from 12:00 UTC by the equation of time, so the day's
    // maximum is the honest thing to compare against.
    for (const latitude of [0, 25, 45, -33]) {
      let peak = -90;
      for (let minute = 0; minute < 1440; minute++) {
        peak = Math.max(peak, solarPosition(EQUINOX_NOON_UTC + minute * 60_000, latitude, 0).altitudeDeg);
      }
      expect(Math.abs(peak - (90 - Math.abs(latitude)))).toBeLessThan(0.6);
    }
  });

  test("the sun is in the east in the morning and the west in the afternoon", () => {
    const morning = solarPosition(Date.UTC(2026, 5, 21, 8, 0, 0), 45, 0);
    const afternoon = solarPosition(Date.UTC(2026, 5, 21, 16, 0, 0), 45, 0);
    expect(morning.azimuthDeg).toBeGreaterThan(45);
    expect(morning.azimuthDeg).toBeLessThan(180);
    expect(afternoon.azimuthDeg).toBeGreaterThan(180);
    expect(afternoon.azimuthDeg).toBeLessThan(315);
  });

  test("longitude shifts solar noon by four minutes per degree", () => {
    // 15 degrees east sees the same sky one hour earlier in UTC.
    const atGreenwich = solarPosition(EQUINOX_NOON_UTC, 45, 0).altitudeDeg;
    const shifted = solarPosition(EQUINOX_NOON_UTC - 15 * 4 * 60_000, 45, 15).altitudeDeg;
    expect(Math.abs(atGreenwich - shifted)).toBeLessThan(0.5);
  });

  test("the hemispheres are opposite at the solstice", () => {
    const north = solarPosition(Date.UTC(2026, 11, 21, 12, 0, 0), 60, 0).altitudeDeg;
    const south = solarPosition(Date.UTC(2026, 11, 21, 12, 0, 0), -60, 0).altitudeDeg;
    expect(north).toBeLessThan(10);
    expect(south).toBeGreaterThan(40);
  });

  test("polar day and polar night stay on their side of the horizon", () => {
    for (let hour = 0; hour < 24; hour += 3) {
      expect(solarPosition(Date.UTC(2026, 5, 21, hour, 0, 0), 80, 0).altitudeDeg).toBeGreaterThan(0);
      expect(solarPosition(Date.UTC(2026, 11, 21, hour, 0, 0), 80, 0).altitudeDeg).toBeLessThan(0);
    }
  });

  test("altitude stays inside the possible range everywhere", () => {
    for (const latitude of [-90, -45, 0, 45, 90]) {
      for (let hour = 0; hour < 24; hour++) {
        const { altitudeDeg, azimuthDeg } = solarPosition(Date.UTC(2026, 7, 4, hour, 0, 0), latitude, 12);
        expect(altitudeDeg).toBeGreaterThanOrEqual(-90);
        expect(altitudeDeg).toBeLessThanOrEqual(90);
        expect(azimuthDeg).toBeGreaterThanOrEqual(0);
        expect(azimuthDeg).toBeLessThan(360);
      }
    }
  });
});

describe("sky phase", () => {
  test("splits the twilight bands", () => {
    expect(skyPhase(12)).toBe("day");
    expect(skyPhase(-3, true)).toBe("dawn");
    expect(skyPhase(-3, false)).toBe("dusk");
    expect(skyPhase(-14)).toBe("astronomical");
    expect(skyPhase(-30)).toBe("night");
  });
});

describe("solar direction", () => {
  test("knows morning from afternoon", () => {
    expect(solarIsRising(Date.UTC(2026, 5, 21, 7, 0, 0), 45, 0)).toBe(true);
    expect(solarIsRising(Date.UTC(2026, 5, 21, 17, 0, 0), 45, 0)).toBe(false);
  });
});
