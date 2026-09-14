import { useEffect, useState, type CSSProperties } from "react";
import { api } from "../api";
import { subscribe } from "../events";
import { resolveCoordinates, sunBackdropStyle, sunBackdropVariables, type Coordinates } from "../sunBackdrop";
import "./SunBackdrop.css";

// A minute is finer than the eye can follow at this scale and keeps the work
// negligible; the position is also refreshed whenever the tab comes back.
const REFRESH_MS = 60_000;

/** Ambient daylight behind the whole shell, positioned from the real solar
 * altitude and azimuth for the installation's coordinates. Purely decorative,
 * opt-in, and never in front of anything. */
export default function SunBackdrop() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [now, setNow] = useState(() => Date.now());

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
  const style = sunBackdropStyle(now, coordinates);

  return (
    <div
      className="sun-backdrop"
      aria-hidden="true"
      data-phase={style.phase}
      style={sunBackdropVariables(style) as CSSProperties}
    >
      <div className="sun-backdrop__sky" />
      <div className="sun-backdrop__disc" />
    </div>
  );
}
