/** Solar position from the NOAA low-precision equations. Accurate to roughly a
 * tenth of a degree, which is far beyond what an ambient backdrop needs, and it
 * needs no timezone: UTC plus the longitude fully determines where the sun is. */

const DEGREES = Math.PI / 180;

export interface SolarPosition {
  /** Degrees above the horizon; negative once the sun has set. */
  altitudeDeg: number;
  /** Degrees clockwise from north: 90 is due east, 270 due west. */
  azimuthDeg: number;
}

export type SkyPhase = "night" | "astronomical" | "dawn" | "day" | "dusk";

function julianCentury(atMs: number): number {
  // 2440587.5 is the Julian day of the Unix epoch.
  return (atMs / 86_400_000 + 2_440_587.5 - 2_451_545) / 36_525;
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

interface SolarEcliptic {
  apparentLongitudeDeg: number;
  obliquityDeg: number;
  declinationDeg: number;
  equationOfTimeMin: number;
}

/** The parts of the sun's orbit that depend on the instant alone. Kept apart so
 * the moon can be phased against the same sun the backdrop draws. */
function solarEcliptic(atMs: number): SolarEcliptic {
  const century = julianCentury(atMs);

  const meanLongitude = normalizeDegrees(280.46646 + century * (36_000.76983 + century * 0.0003032));
  const meanAnomaly = 357.52911 + century * (35_999.05029 - century * 0.0001537);
  const eccentricity = 0.016708634 - century * (0.000042037 + century * 0.0000001267);

  const centre = Math.sin(meanAnomaly * DEGREES) * (1.914602 - century * (0.004817 + century * 0.000014))
    + Math.sin(2 * meanAnomaly * DEGREES) * (0.019993 - century * 0.000101)
    + Math.sin(3 * meanAnomaly * DEGREES) * 0.000289;
  const trueLongitude = meanLongitude + centre;

  const omega = 125.04 - 1934.136 * century;
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(omega * DEGREES);

  const meanObliquity = 23 + (26 + (21.448 - century * (46.815 + century * (0.00059 - century * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * DEGREES);

  const declination = Math.asin(Math.sin(obliquity * DEGREES) * Math.sin(apparentLongitude * DEGREES)) / DEGREES;

  const varY = Math.tan(obliquity / 2 * DEGREES) ** 2;
  const equationOfTime = 4 * (
    varY * Math.sin(2 * meanLongitude * DEGREES)
    - 2 * eccentricity * Math.sin(meanAnomaly * DEGREES)
    + 4 * eccentricity * varY * Math.sin(meanAnomaly * DEGREES) * Math.cos(2 * meanLongitude * DEGREES)
    - 0.5 * varY * varY * Math.sin(4 * meanLongitude * DEGREES)
    - 1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomaly * DEGREES)
  ) / DEGREES;

  return {
    apparentLongitudeDeg: apparentLongitude,
    obliquityDeg: obliquity,
    declinationDeg: declination,
    equationOfTimeMin: equationOfTime,
  };
}

export interface EquatorialPosition {
  /** Degrees east along the celestial equator from the vernal equinox. */
  rightAscensionDeg: number;
  /** Degrees north of the celestial equator. */
  declinationDeg: number;
}

/** Where the sun sits on the celestial sphere, independent of any observer. */
export function solarEquatorial(atMs: number): EquatorialPosition {
  const { apparentLongitudeDeg, obliquityDeg, declinationDeg } = solarEcliptic(atMs);
  const rightAscensionDeg = normalizeDegrees(Math.atan2(
    Math.cos(obliquityDeg * DEGREES) * Math.sin(apparentLongitudeDeg * DEGREES),
    Math.cos(apparentLongitudeDeg * DEGREES),
  ) / DEGREES);
  return { rightAscensionDeg, declinationDeg };
}

export function solarPosition(atMs: number, latitude: number, longitude: number): SolarPosition {
  const { declinationDeg: declination, equationOfTimeMin: equationOfTime } = solarEcliptic(atMs);

  const minutesUtc = (atMs / 60_000) % 1440;
  const trueSolarTime = ((minutesUtc + equationOfTime + 4 * longitude) % 1440 + 1440) % 1440;
  const hourAngle = trueSolarTime / 4 < 0 ? trueSolarTime / 4 + 180 : trueSolarTime / 4 - 180;

  const latitudeRad = latitude * DEGREES;
  const declinationRad = declination * DEGREES;
  const hourAngleRad = hourAngle * DEGREES;

  const zenith = Math.acos(
    Math.min(1, Math.max(-1,
      Math.sin(latitudeRad) * Math.sin(declinationRad)
      + Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad),
    )),
  );
  const altitudeDeg = 90 - zenith / DEGREES;

  // At the poles the azimuth denominator collapses; due south/north is the
  // conventional answer there and keeps the backdrop from jumping.
  const denominator = Math.cos(latitudeRad) * Math.sin(zenith);
  let azimuthDeg: number;
  if (Math.abs(denominator) < 1e-9) {
    azimuthDeg = latitude >= 0 ? 180 : 0;
  } else {
    const cosAzimuth = (Math.sin(latitudeRad) * Math.cos(zenith) - Math.sin(declinationRad)) / denominator;
    const azimuthFromSouth = Math.acos(Math.min(1, Math.max(-1, cosAzimuth))) / DEGREES;
    azimuthDeg = hourAngle > 0 ? normalizeDegrees(azimuthFromSouth + 180) : normalizeDegrees(540 - azimuthFromSouth);
  }

  return { altitudeDeg, azimuthDeg };
}

/** Thresholds follow the usual twilight definitions, with "dawn" and "dusk"
 * covering civil plus nautical twilight so the warm part of the ramp lasts long
 * enough to be worth animating. */
export function skyPhase(altitudeDeg: number, rising = true): SkyPhase {
  if (altitudeDeg > 0) return "day";
  if (altitudeDeg <= -18) return "night";
  if (altitudeDeg <= -12) return "astronomical";
  return rising ? "dawn" : "dusk";
}

/** True while the sun is still climbing, derived by sampling a few minutes
 * ahead so callers do not have to track the previous altitude themselves. */
export function solarIsRising(atMs: number, latitude: number, longitude: number): boolean {
  const now = solarPosition(atMs, latitude, longitude).altitudeDeg;
  const soon = solarPosition(atMs + 600_000, latitude, longitude).altitudeDeg;
  return soon >= now;
}
