import { lunarPhase, lunarPosition } from "../../shared/lunarPosition";
import { skyPhase, solarIsRising, solarPosition, type SkyPhase } from "../../shared/solarPosition";

export interface SunBackdropStyle {
  /** Viewport percentages for the centre of the disc. */
  x: number;
  y: number;
  /** Colour of the disc itself. */
  glow: string;
  /** Wide ambient wash behind it. */
  sky: string;
  /** Overall strength, already scaled for a dark interface. */
  opacity: number;
  phase: SkyPhase;
  altitudeDeg: number;
  azimuthDeg: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Above this the sun is at the top of the viewport, below the horizon it sinks
 * out of sight instead of being clipped to the bottom edge. */
const ZENITH_Y = 4;
const HORIZON_Y = 92;
const BELOW_HORIZON_Y = 124;

/** Below this depth of twilight the stars are at full strength; they start to
 * appear as soon as the sun is properly under the horizon. */
const STARS_START_DEG = -2;
const STARS_FULL_DEG = -13;

type Ramp = { glow: readonly [number, number, number]; sky: readonly [number, number, number]; opacity: number };

/** Warm at the horizon, near-white overhead, deep blue once it has set. The
 * interface is dark-only, so even the strongest step stays faint. */
const RAMP: Record<SkyPhase, Ramp> = {
  night: { glow: [40, 58, 104], sky: [16, 22, 44], opacity: 0.16 },
  astronomical: { glow: [58, 72, 124], sky: [22, 28, 54], opacity: 0.2 },
  dawn: { glow: [242, 146, 72], sky: [58, 42, 74], opacity: 0.3 },
  dusk: { glow: [238, 104, 78], sky: [56, 34, 64], opacity: 0.3 },
  day: { glow: [255, 214, 150], sky: [46, 58, 92], opacity: 0.26 },
};

function mix(from: readonly [number, number, number], to: readonly [number, number, number], amount: number): string {
  const ratio = Math.max(0, Math.min(1, amount));
  const channel = (index: number) => Math.round(from[index]! + (to[index]! - from[index]!) * ratio);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

export function parseCoordinate(value: string | null | undefined, limit: number): number | null {
  if (value == null || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

/** The coordinates the backdrop should use: the operator's own if both are set,
 * otherwise the ones implied by the configured timezone. */
export function resolveCoordinates(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
  fallback: { latitude: number | null; longitude: number | null } | null | undefined,
): Coordinates | null {
  const own = { latitude: parseCoordinate(latitude, 90), longitude: parseCoordinate(longitude, 180) };
  if (own.latitude != null && own.longitude != null) return { latitude: own.latitude, longitude: own.longitude };
  if (fallback?.latitude != null && fallback.longitude != null) {
    return { latitude: fallback.latitude, longitude: fallback.longitude };
  }
  return null;
}

/**
 * The sky as viewport percentages. Azimuth 90 (due east) sits at the left edge
 * and 270 (due west) at the right, so a body crosses the page the way it
 * crosses the sky; altitude runs from the horizon to the top of the viewport.
 * The unclamped x is kept so two bodies can still be compared once one of them
 * has slid off the side.
 */
function project(altitudeDeg: number, azimuthDeg: number): { x: number; y: number; rawX: number } {
  const rawX = ((azimuthDeg - 90) / 180) * 100;
  const y = altitudeDeg >= 0
    ? HORIZON_Y - (HORIZON_Y - ZENITH_Y) * Math.min(1, altitudeDeg / 90)
    : HORIZON_Y + (BELOW_HORIZON_Y - HORIZON_Y) * Math.min(1, Math.abs(altitudeDeg) / 18);
  return { x: Math.max(-10, Math.min(110, rawX)), y, rawX };
}

export function sunBackdropStyle(atMs: number, coordinates: Coordinates): SunBackdropStyle {
  const position = solarPosition(atMs, coordinates.latitude, coordinates.longitude);
  const rising = solarIsRising(atMs, coordinates.latitude, coordinates.longitude);
  const phase = skyPhase(position.altitudeDeg, rising);

  const { x, y } = project(position.altitudeDeg, position.azimuthDeg);

  const ramp = RAMP[phase];
  // Fade the disc out as it sinks so nothing hangs at the edge all night.
  const belowHorizonFade = position.altitudeDeg >= 0 ? 1 : Math.max(0, 1 - Math.abs(position.altitudeDeg) / 18);
  const daylight = Math.max(0, Math.min(1, position.altitudeDeg / 25));

  return {
    x,
    y,
    glow: mix(RAMP.dawn.glow, ramp.glow, phase === "day" ? daylight : 1),
    sky: mix(RAMP.night.sky, ramp.sky, phase === "night" ? 0 : 1),
    opacity: Math.round((ramp.opacity * (0.45 + 0.55 * belowHorizonFade)) * 1000) / 1000,
    phase,
    altitudeDeg: position.altitudeDeg,
    azimuthDeg: position.azimuthDeg,
  };
}

/** The CSS custom properties the backdrop element reads. */
export function sunBackdropVariables(style: SunBackdropStyle): Record<string, string> {
  return {
    "--sun-x": `${style.x.toFixed(2)}%`,
    "--sun-y": `${style.y.toFixed(2)}%`,
    "--sun-glow": style.glow,
    "--sun-sky": style.sky,
    "--sun-opacity": String(style.opacity),
  };
}

export interface MoonBackdropStyle {
  /** Viewport percentages for the centre of the disc. */
  x: number;
  y: number;
  /** Lit fraction of the disc: 0 at new moon, 1 at full. */
  illuminated: number;
  /** Degrees to turn the disc so its lit limb faces the sun. */
  tiltDeg: number;
  /** Already faded for daylight and for the moon being below the horizon. */
  opacity: number;
  altitudeDeg: number;
  waxing: boolean;
}

/** How faint daylight leaves the moon, and how deep below the horizon it keeps
 * being drawn at all. */
const MOON_DAYLIGHT_FADE_DEG = 10;
const MOON_BELOW_HORIZON_DEG = 8;
const MOON_OPACITY = 0.5;

export function moonBackdropStyle(atMs: number, coordinates: Coordinates, sun: SunBackdropStyle): MoonBackdropStyle {
  const position = lunarPosition(atMs, coordinates.latitude, coordinates.longitude);
  const phase = lunarPhase(atMs);
  const placement = project(position.altitudeDeg, position.azimuthDeg);

  // The lit limb always points at the sun, so waxing and waning fall out of the
  // geometry instead of being drawn as a special case.
  const sunPlacement = project(sun.altitudeDeg, sun.azimuthDeg);
  const tiltDeg = Math.atan2(sunPlacement.y - placement.y, sunPlacement.rawX - placement.rawX) / (Math.PI / 180);

  // Daylight washes the moon out, and a moon well under the horizon is gone.
  const daylightFade = Math.max(0, 1 - Math.max(0, sun.altitudeDeg) / MOON_DAYLIGHT_FADE_DEG);
  const belowHorizonFade = position.altitudeDeg >= 0
    ? 1
    : Math.max(0, 1 - Math.abs(position.altitudeDeg) / MOON_BELOW_HORIZON_DEG);

  return {
    x: placement.x,
    y: placement.y,
    illuminated: phase.illuminated,
    tiltDeg,
    opacity: Math.round(MOON_OPACITY * daylightFade * belowHorizonFade * 1000) / 1000,
    altitudeDeg: position.altitudeDeg,
    waxing: phase.waxing,
  };
}

/** How strongly the star field shows, from the first hint of dusk to full dark. */
export function starOpacity(sunAltitudeDeg: number): number {
  const depth = (STARS_START_DEG - sunAltitudeDeg) / (STARS_START_DEG - STARS_FULL_DEG);
  return Math.round(Math.max(0, Math.min(1, depth)) * 1000) / 1000;
}

export interface Star {
  /** Viewport percentages. */
  x: number;
  y: number;
  /** Pixel radius, before the layer's own opacity. */
  radius: number;
  opacity: number;
  /** Seconds, so no two stars twinkle together. */
  twinkleDelay: number;
  twinkleDuration: number;
}

/** A small deterministic generator: the same installation always gets the same
 * sky, and nothing has to be persisted for that to hold. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function starField(count = 90, seed = 0x7ec2e70): Star[] {
  const random = seededRandom(seed);
  const stars: Star[] = [];
  for (let index = 0; index < count; index++) {
    stars.push({
      x: random() * 100,
      // Stars belong in the sky, not on the horizon line at the foot of the page.
      y: random() * (HORIZON_Y - 6),
      radius: 0.6 + random() * 1.1,
      opacity: 0.35 + random() * 0.65,
      twinkleDelay: random() * 6,
      twinkleDuration: 3.5 + random() * 4.5,
    });
  }
  return stars;
}

/**
 * How far west the field has turned, as a percentage of the page. The sky moves
 * a sidereal 15 degrees an hour and the page spans 180 degrees of azimuth, so a
 * whole night carries the field across it once.
 */
export function starDrift(atMs: number): number {
  const turns = (atMs / 3_600_000) * (15.041_067 / 180) * 100;
  return ((turns % 100) + 100) % 100;
}

/** The field as it stands at one instant: wrapped around the page, and dimmed
 * at both edges so the wrap itself is never visible. */
export function driftedStars(stars: Star[], atMs: number): Star[] {
  const drift = starDrift(atMs);
  return stars.map((star) => {
    const x = ((star.x - drift) % 100 + 100) % 100;
    const edgeFade = Math.min(1, Math.min(x, 100 - x) / 6);
    return { ...star, x, opacity: Math.round(star.opacity * edgeFade * 1000) / 1000 };
  });
}

/**
 * The lit part of the disc as one SVG path, centred on the origin with the lit
 * limb to the right; the caller turns it to face the sun. The outer limb is a
 * half circle and the terminator a half ellipse that bulges into the dark side
 * once more than half the disc is lit.
 */
export function moonPhasePath(radius: number, illuminated: number): string {
  const lit = Math.max(0, Math.min(1, illuminated));
  const terminatorRadius = radius * Math.abs(1 - 2 * lit);
  // Past half, the terminator curves the other way and the moon is gibbous.
  const sweep = lit > 0.5 ? 1 : 0;
  const r = radius.toFixed(3);
  return `M 0 ${(-radius).toFixed(3)} A ${r} ${r} 0 0 1 0 ${r} A ${terminatorRadius.toFixed(3)} ${r} 0 0 ${sweep} 0 ${(-radius).toFixed(3)} Z`;
}

/** Everything the backdrop needs for one instant, from one pass of the maths. */
export interface SkyBackdropStyle {
  sun: SunBackdropStyle;
  moon: MoonBackdropStyle;
  starOpacity: number;
}

export function skyBackdropStyle(atMs: number, coordinates: Coordinates): SkyBackdropStyle {
  const sun = sunBackdropStyle(atMs, coordinates);
  return { sun, moon: moonBackdropStyle(atMs, coordinates, sun), starOpacity: starOpacity(sun.altitudeDeg) };
}

/** The CSS custom properties the whole backdrop element reads. */
export function skyBackdropVariables(style: SkyBackdropStyle): Record<string, string> {
  return {
    ...sunBackdropVariables(style.sun),
    "--moon-x": `${style.moon.x.toFixed(2)}%`,
    "--moon-y": `${style.moon.y.toFixed(2)}%`,
    "--moon-tilt": `${style.moon.tiltDeg.toFixed(2)}deg`,
    "--moon-opacity": String(style.moon.opacity),
    "--star-opacity": String(style.starOpacity),
  };
}
