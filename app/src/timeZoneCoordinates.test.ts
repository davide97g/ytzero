import { describe, expect, test } from "bun:test";
import { timeZoneCoordinates, timeZoneCount } from "./timeZoneCoordinates";

describe("time zone coordinates", () => {
  test("covers the tzdata zone list", () => {
    expect(timeZoneCount()).toBeGreaterThan(300);
  });

  test("places well-known zones on the right part of the globe", () => {
    const warsaw = timeZoneCoordinates("Europe/Warsaw")!;
    expect(warsaw.latitude).toBeCloseTo(52.25, 0);
    expect(warsaw.longitude).toBeCloseTo(21, 0);

    const sydney = timeZoneCoordinates("Australia/Sydney")!;
    expect(sydney.latitude).toBeLessThan(0);
    expect(sydney.longitude).toBeGreaterThan(140);

    const losAngeles = timeZoneCoordinates("America/Los_Angeles")!;
    expect(losAngeles.longitude).toBeLessThan(-100);
  });

  test("resolves legacy aliases through their canonical zone", () => {
    expect(timeZoneCoordinates("Europe/Kiev")).toEqual(timeZoneCoordinates("Europe/Kyiv"));
    expect(timeZoneCoordinates("US/Pacific")).toEqual(timeZoneCoordinates("America/Los_Angeles"));
  });

  test("falls back to the meridian for UTC and fixed offsets", () => {
    expect(timeZoneCoordinates("UTC")).toEqual({ latitude: 0, longitude: 0 });
    // Etc zones carry the POSIX sign, so Etc/GMT+5 sits west of Greenwich.
    expect(timeZoneCoordinates("Etc/GMT+5")).toEqual({ latitude: 0, longitude: -75 });
    expect(timeZoneCoordinates("Etc/GMT-3")).toEqual({ latitude: 0, longitude: 45 });
  });

  test("returns nothing for a zone it cannot place", () => {
    expect(timeZoneCoordinates("Not/AZone")).toBeNull();
  });

  test("every stored coordinate is a valid point on earth", () => {
    for (const zone of Intl.supportedValuesOf("timeZone")) {
      const point = timeZoneCoordinates(zone);
      if (!point) continue;
      expect(point.latitude).toBeGreaterThanOrEqual(-90);
      expect(point.latitude).toBeLessThanOrEqual(90);
      expect(point.longitude).toBeGreaterThanOrEqual(-180);
      expect(point.longitude).toBeLessThanOrEqual(180);
    }
  });
});
