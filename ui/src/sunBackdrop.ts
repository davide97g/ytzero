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

export function sunBackdropStyle(atMs: number, coordinates: Coordinates): SunBackdropStyle {
  const position = solarPosition(atMs, coordinates.latitude, coordinates.longitude);
  const rising = solarIsRising(atMs, coordinates.latitude, coordinates.longitude);
  const phase = skyPhase(position.altitudeDeg, rising);

  // Azimuth 90 (due east) sits at the left edge and 270 (due west) at the
  // right, so the disc crosses the page the way the sun crosses the sky.
  const x = Math.max(-10, Math.min(110, ((position.azimuthDeg - 90) / 180) * 100));

  const y = position.altitudeDeg >= 0
    ? HORIZON_Y - (HORIZON_Y - ZENITH_Y) * Math.min(1, position.altitudeDeg / 90)
    : HORIZON_Y + (BELOW_HORIZON_Y - HORIZON_Y) * Math.min(1, Math.abs(position.altitudeDeg) / 18);

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
