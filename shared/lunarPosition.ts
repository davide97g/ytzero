/** Moon position and phase from the abridged lunar theory: the handful of
 * largest terms of Meeus' series. Good to a fraction of a degree, which is well
 * past what an ambient backdrop can show, and it needs nothing but UTC and a
 * place on the globe. */

import { solarEquatorial, type EquatorialPosition } from "./solarPosition";

const DEGREES = Math.PI / 180;
/** Mean obliquity of the ecliptic, near enough constant over a human lifetime. */
const OBLIQUITY_DEG = 23.4397;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
/** One astronomical unit. Only the ratio to the moon's distance matters here. */
const SUN_DISTANCE_KM = 149_598_000;

export interface LunarPosition {
  /** Degrees above the horizon; negative once the moon has set. */
  altitudeDeg: number;
  /** Degrees clockwise from north: 90 is due east, 270 due west. */
  azimuthDeg: number;
}

export interface LunarPhase {
  /** Lit fraction of the disc: 0 at new moon, 1 at full. */
  illuminated: number;
  /** True between new and full, while the lit limb is still growing. */
  waxing: boolean;
  /** Position in the synodic month: 0 new, 0.25 first quarter, 0.5 full. */
  cycle: number;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function daysSinceJ2000(atMs: number): number {
  return (atMs - J2000_MS) / 86_400_000;
}

interface LunarEquatorial extends EquatorialPosition {
  /** Centre-to-centre distance in kilometres; it varies by about 5%. */
  distanceKm: number;
}

/** Where the moon sits on the celestial sphere, independent of any observer. */
export function lunarEquatorial(atMs: number): LunarEquatorial {
  const days = daysSinceJ2000(atMs);

  const meanLongitude = 218.316 + 13.176396 * days;
  const meanAnomaly = 134.963 + 13.064993 * days;
  const argumentOfLatitude = 93.272 + 13.229350 * days;

  // The evection and the largest latitude term carry nearly all of the wobble a
  // backdrop could ever render; the rest stay inside a tenth of a degree.
  const eclipticLongitude = meanLongitude + 6.289 * Math.sin(meanAnomaly * DEGREES);
  const eclipticLatitude = 5.128 * Math.sin(argumentOfLatitude * DEGREES);
  const distanceKm = 385_001 - 20_905 * Math.cos(meanAnomaly * DEGREES);

  const longitudeRad = eclipticLongitude * DEGREES;
  const latitudeRad = eclipticLatitude * DEGREES;
  const obliquityRad = OBLIQUITY_DEG * DEGREES;

  const rightAscensionDeg = normalizeDegrees(Math.atan2(
    Math.sin(longitudeRad) * Math.cos(obliquityRad) - Math.tan(latitudeRad) * Math.sin(obliquityRad),
    Math.cos(longitudeRad),
  ) / DEGREES);
  const declinationDeg = Math.asin(
    Math.sin(latitudeRad) * Math.cos(obliquityRad)
    + Math.cos(latitudeRad) * Math.sin(obliquityRad) * Math.sin(longitudeRad),
  ) / DEGREES;

  return { rightAscensionDeg, declinationDeg, distanceKm };
}

/** Greenwich sidereal time turned into the local one, in degrees. */
function localSiderealTimeDeg(atMs: number, longitude: number): number {
  return normalizeDegrees(280.16 + 360.9856235 * daysSinceJ2000(atMs) + longitude);
}

export function lunarPosition(atMs: number, latitude: number, longitude: number): LunarPosition {
  const moon = lunarEquatorial(atMs);
  const hourAngle = localSiderealTimeDeg(atMs, longitude) - moon.rightAscensionDeg;

  const latitudeRad = latitude * DEGREES;
  const declinationRad = moon.declinationDeg * DEGREES;
  const hourAngleRad = hourAngle * DEGREES;

  const altitudeDeg = Math.asin(
    Math.sin(latitudeRad) * Math.sin(declinationRad)
    + Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad),
  ) / DEGREES;

  // Measured from due south and then turned to run clockwise from north, so it
  // matches the solar azimuth the backdrop already projects.
  const azimuthFromSouth = Math.atan2(
    Math.sin(hourAngleRad),
    Math.cos(hourAngleRad) * Math.sin(latitudeRad) - Math.tan(declinationRad) * Math.cos(latitudeRad),
  ) / DEGREES;

  return { altitudeDeg, azimuthDeg: normalizeDegrees(azimuthFromSouth + 180) };
}

/**
 * How much of the disc the sun lights, and which way the month is running.
 * Geocentric: an observer's own parallax shifts this by far less than a pixel.
 */
export function lunarPhase(atMs: number): LunarPhase {
  const moon = lunarEquatorial(atMs);
  const sun = solarEquatorial(atMs);

  const sunDeclinationRad = sun.declinationDeg * DEGREES;
  const moonDeclinationRad = moon.declinationDeg * DEGREES;
  const rightAscensionGapRad = (sun.rightAscensionDeg - moon.rightAscensionDeg) * DEGREES;

  const elongation = Math.acos(Math.min(1, Math.max(-1,
    Math.sin(sunDeclinationRad) * Math.sin(moonDeclinationRad)
    + Math.cos(sunDeclinationRad) * Math.cos(moonDeclinationRad) * Math.cos(rightAscensionGapRad),
  )));
  // The angle sun-moon-earth. It is what actually sets the width of the lit part.
  const phaseAngle = Math.atan2(
    SUN_DISTANCE_KM * Math.sin(elongation),
    moon.distanceKm - SUN_DISTANCE_KM * Math.cos(elongation),
  );
  // The sign says which limb is lit, and so whether the month is waxing.
  const limbAngle = Math.atan2(
    Math.cos(sunDeclinationRad) * Math.sin(rightAscensionGapRad),
    Math.sin(sunDeclinationRad) * Math.cos(moonDeclinationRad)
    - Math.cos(sunDeclinationRad) * Math.sin(moonDeclinationRad) * Math.cos(rightAscensionGapRad),
  );

  const cycle = 0.5 + (0.5 * phaseAngle * (limbAngle < 0 ? -1 : 1)) / Math.PI;
  return {
    illuminated: (1 + Math.cos(phaseAngle)) / 2,
    waxing: cycle < 0.5,
    cycle,
  };
}
