import { useEffect, useState } from "react";
import { api, type SettingsMeta } from "../../api";
import { emit } from "../../events";
import { useI18n } from "../../i18n";
import { queueSettingWrite, scheduleSettingWrite } from "../../settingsWriteQueue";
import { parseCoordinate } from "../../sunBackdrop";
import { Field, Input, SettingRow, Switch } from "../ui";
import "./SunBackdropSettings.css";

/** The opt-in ambient sun layer. The switch is per profile; the coordinates
 * describe the installation and are owned by the primary profile. */
export function SunBackdropSettings({ isPrimary, showToast }: { isPrimary: boolean; showToast: (message: string) => void }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [meta, setMeta] = useState<SettingsMeta | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.settings().then((result) => {
      setEnabled(result.settings.sun_backdrop === "1");
      setLatitude(result.settings.location_latitude ?? "");
      setLongitude(result.settings.location_longitude ?? "");
      setMeta(result.settings_meta);
    }).catch(() => {}).finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  const failed = (error: unknown) => showToast(error instanceof Error ? error.message : String(error));
  const saved = () => { showToast(t("displaySettingsSaved")); emit("sun-backdrop-changed"); };

  const toggle = (next: boolean) => {
    setEnabled(next);
    queueSettingWrite("sun_backdrop", { sun_backdrop: next ? "1" : "0" }, { onSaved: saved, onError: failed });
  };

  // Typing a coordinate is a burst of keystrokes, and a half-typed value such
  // as "-" or "5." must not be sent; the server would reject it.
  const saveCoordinate = (key: "location_latitude" | "location_longitude", value: string, limit: number) => {
    if (value.trim() !== "" && parseCoordinate(value, limit) === null) return;
    scheduleSettingWrite(key, { [key]: value.trim() }, { delay: 600, onSaved: saved, onError: failed });
  };

  const placeholder = (value: number | null) => value == null ? "" : String(value);

  return (
    <>
      <SettingRow label={t("sunBackdrop")} description={t("sunBackdropHint")}>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </SettingRow>

      {isPrimary && (
        <SettingRow label={t("sunBackdropLocation")} description={t("sunBackdropLocationHint")} align="start">
          <div className="sun-backdrop-coordinates">
            <Field label={t("sunBackdropLatitude")} htmlFor="sun-backdrop-latitude">
              <Input
                id="sun-backdrop-latitude"
                type="number"
                inputMode="decimal"
                min={-90}
                max={90}
                step="any"
                value={latitude}
                placeholder={placeholder(meta?.location_default.latitude ?? null)}
                onChange={(event) => {
                  setLatitude(event.target.value);
                  saveCoordinate("location_latitude", event.target.value, 90);
                }}
              />
            </Field>
            <Field label={t("sunBackdropLongitude")} htmlFor="sun-backdrop-longitude">
              <Input
                id="sun-backdrop-longitude"
                type="number"
                inputMode="decimal"
                min={-180}
                max={180}
                step="any"
                value={longitude}
                placeholder={placeholder(meta?.location_default.longitude ?? null)}
                onChange={(event) => {
                  setLongitude(event.target.value);
                  saveCoordinate("location_longitude", event.target.value, 180);
                }}
              />
            </Field>
          </div>
        </SettingRow>
      )}
    </>
  );
}

export default SunBackdropSettings;
