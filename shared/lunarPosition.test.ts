import { describe, expect, test } from "bun:test";
import { lunarPhase, lunarPosition } from "./lunarPosition";
import { solarPosition } from "./solarPosition";

const VENICE = { latitude: 45.49, longitude: 11.42 };

describe("moon phase", () => {
  test("matches the published new and full moons", () => {
    // Almanac instants, to the minute.
    expect(lunarPhase(Date.UTC(2000, 0, 6, 18, 14)).illuminated).toBeCloseTo(0, 2);
    expect(lunarPhase(Date.UTC(2000, 0, 21, 4, 40)).illuminated).toBeCloseTo(1, 2);
    expect(lunarPhase(Date.UTC(2026, 0, 18, 19, 52)).illuminated).toBeCloseTo(0, 2);
  });

  test("runs from new to full and back over a synodic month", () => {
    const newMoon = Date.UTC(2026, 0, 18, 19, 52);
    const day = 86_400_000;
    // The quarters fall at even fractions of the synodic month, not at weeks.
    const synodicMonth = 29.530_589 * day;
    expect(lunarPhase(newMoon + 2 * day).waxing).toBe(true);
    expect(lunarPhase(newMoon + synodicMonth * 0.25).illuminated).toBeCloseTo(0.5, 1);
    expect(lunarPhase(newMoon + synodicMonth * 0.5).illuminated).toBeGreaterThan(0.97);
    expect(lunarPhase(newMoon + synodicMonth * 0.75).waxing).toBe(false);
    expect(lunarPhase(newMoon + synodicMonth * 0.75).illuminated).toBeCloseTo(0.5, 1);
    expect(lunarPhase(newMoon + synodicMonth).illuminated).toBeCloseTo(0, 1);
  });

  test("keeps the cycle inside one turn of the month", () => {
    for (let day = 0; day < 40; day++) {
      const phase = lunarPhase(Date.UTC(2026, 2, 1) + day * 86_400_000);
      expect(phase.cycle).toBeGreaterThanOrEqual(0);
      expect(phase.cycle).toBeLessThanOrEqual(1);
      expect(phase.illuminated).toBeGreaterThanOrEqual(0);
      expect(phase.illuminated).toBeLessThanOrEqual(1);
    }
  });
});

describe("moon position", () => {
  test("crosses the sky from east through south to west", () => {
    // The moon culminates due south from the northern hemisphere, so the
    // azimuth has to sweep past 180 while the altitude peaks.
    const day = Date.UTC(2026, 8, 7);
    const samples = [0, 3, 6, 9, 12, 15].map((hour) => lunarPosition(day + hour * 3_600_000, VENICE.latitude, VENICE.longitude));
    const highest = samples.reduce((best, sample) => sample.altitudeDeg > best.altitudeDeg ? sample : best);
    expect(highest.azimuthDeg).toBeGreaterThan(120);
    expect(highest.azimuthDeg).toBeLessThan(240);
    expect(samples[0]!.azimuthDeg).toBeLessThan(highest.azimuthDeg);
    expect(samples[samples.length - 1]!.azimuthDeg).toBeGreaterThan(highest.azimuthDeg);
  });

  test("a full moon stands opposite the sun", () => {
    const full = Date.UTC(2026, 0, 3, 10, 3);
    for (let hour = 0; hour < 24; hour += 2) {
      const at = full + hour * 3_600_000;
      const moon = lunarPosition(at, VENICE.latitude, VENICE.longitude);
      const sun = solarPosition(at, VENICE.latitude, VENICE.longitude);
      // One of the two is always up around a full moon, never neither.
      expect(moon.altitudeDeg > -6 || sun.altitudeDeg > -6).toBe(true);
    }
  });

  test("stays inside the sky at every hour and latitude", () => {
    for (const latitude of [-70, -33, 0, 45, 70]) {
      for (let hour = 0; hour < 24; hour++) {
        const position = lunarPosition(Date.UTC(2026, 3, 9, hour), latitude, 12);
        expect(position.altitudeDeg).toBeGreaterThanOrEqual(-90);
        expect(position.altitudeDeg).toBeLessThanOrEqual(90);
        expect(position.azimuthDeg).toBeGreaterThanOrEqual(0);
        expect(position.azimuthDeg).toBeLessThan(360);
      }
    }
  });
});
