import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "../api";
import { subscribe } from "../events";
import {
  driftedStars,
  moonPhasePath,
  resolveCoordinates,
  skyBackdropStyle,
  skyBackdropVariables,
  starField,
  type Coordinates,
} from "../sunBackdrop";
import "./SunBackdrop.css";

// A minute is finer than the eye can follow at this scale and keeps the work
// negligible; the position is also refreshed whenever the tab comes back.
const REFRESH_MS = 60_000;

/** The moon is drawn in its own square viewport, so the radius is a share of it
 * rather than of the page. */
const MOON_VIEWBOX_RADIUS = 46;

/** Ambient sky behind the whole shell: the sun and the moon placed from their
 * real altitude and azimuth for the installation's coordinates, the moon lit to
 * tonight's phase, and stars once it is dark enough to see them. Purely
 * decorative, opt-in, and never in front of anything. */
export default function SunBackdrop() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const stars = useMemo(() => starField(), []);

  useEffect(() => {
    let active = true;
    const load = () => {
      api.settings().then((result) => {
        if (!active) return;
        setEnabled(result.settings.sun_backdrop === "1");
        setCoordinates(resolveCoordinates(
          result.settings.location_latitude,
          result.settings.location_longitude,
          result.settings_meta?.location_default,
        ));
      }).catch(() => {});
    };
    load();
    const unsubscribe = subscribe("sun-backdrop-changed", load);
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!enabled || !coordinates) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), REFRESH_MS);
    // A tab left open overnight would otherwise show yesterday's sky.
    const onVisible = () => { if (document.visibilityState === "visible") setNow(Date.now()); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, coordinates]);

  if (!enabled || !coordinates) return null;
  const style = skyBackdropStyle(now, coordinates);
  const tonight = style.starOpacity > 0 ? driftedStars(stars, now) : [];

  return (
    <div
      className="sun-backdrop"
      aria-hidden="true"
      data-phase={style.sun.phase}
      style={skyBackdropVariables(style) as CSSProperties}
    >
      <div className="sun-backdrop__sky" />
      {tonight.length > 0 && (
        <div className="sun-backdrop__stars">
          {tonight.map((star, index) => (
            <span
              key={index}
              className="sun-backdrop__star"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${(star.radius * 2).toFixed(2)}px`,
                height: `${(star.radius * 2).toFixed(2)}px`,
                opacity: star.opacity,
                animationDelay: `${star.twinkleDelay}s`,
                animationDuration: `${star.twinkleDuration}s`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}
      {style.moon.opacity > 0 && (
        <svg className="sun-backdrop__moon" viewBox="-50 -50 100 100" focusable="false">
          <circle className="sun-backdrop__moon-dark" cx="0" cy="0" r={MOON_VIEWBOX_RADIUS} />
          <path className="sun-backdrop__moon-lit" d={moonPhasePath(MOON_VIEWBOX_RADIUS, style.moon.illuminated)} />
        </svg>
      )}
      <div className="sun-backdrop__disc" />
    </div>
  );
}
