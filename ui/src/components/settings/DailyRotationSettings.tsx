import { useEffect, useMemo, useState } from "react";
import { Sparkles, Tag as TagIcon } from "lucide-react";
import { api, type RotationTag } from "../../api";
import { useI18n, type I18nKey } from "../../i18n";
import { queueSettingWrite, scheduleSettingWrite } from "../../settingsWriteQueue";
import {
  DAILY_ROTATION_LIMITS,
  DAYPART_IDS,
  daypartHours,
  defaultDailyRotationConfig,
  normalizeDailyRotationConfig,
  type DailyRotationConfig,
  type DaypartId,
  type DaypartRule,
} from "../../../../shared/dailyRotation";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Inline,
  MultiSelectMenu,
  OptionPicker,
  SelectMenu,
  SettingRow,
  SettingsSection,
  Slider,
  Switch,
  Text,
} from "../ui";
import "./DailyRotationSettings.css";

const DAYPART_LABEL: Record<DaypartId, I18nKey> = {
  morning: "dailyRotationMorning",
  midday: "dailyRotationMidday",
  afternoon: "dailyRotationAfternoon",
  evening: "dailyRotationEvening",
  night: "dailyRotationNight",
};

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** "06:00 – 11:00", wrapping past midnight for the last daypart of the day. */
function windowLabel(config: DailyRotationConfig, id: DaypartId) {
  const hours = daypartHours(config, id);
  if (hours.length === 0) return "";
  const first = hours[0]!;
  const last = hours[hours.length - 1]!;
  // A wrapped window is not contiguous, so read the start from the rule itself.
  const start = config.dayparts.find((daypart) => daypart.id === id)?.startHour ?? first;
  return `${formatHour(start)} – ${formatHour((start + hours.length) % 24)}`;
}

export function DailyRotationSettings({ showToast }: { showToast: (message: string) => void }) {
  const { t } = useI18n();
  const [config, setConfig] = useState<DailyRotationConfig | null>(null);
  const [tags, setTags] = useState<RotationTag[]>([]);
  const [suggestions, setSuggestions] = useState<Partial<Record<DaypartId, RotationTag[]>>>({});

  useEffect(() => {
    api.settings()
      .then((result) => setConfig(normalizeDailyRotationConfig(result.settings.daily_rotation) ?? defaultDailyRotationConfig()))
      .catch(() => setConfig(defaultDailyRotationConfig()));
    api.dailyRotationOptions().then((result) => {
      setTags(result.tags);
      setSuggestions(result.suggestions);
    }).catch(() => {});
  }, []);

  const tagOptions = useMemo(
    () => tags.map((tag) => ({ value: tag.uuid, label: tag.name, searchText: tag.name })),
    [tags],
  );

  if (!config) return null;

  const save = (next: DailyRotationConfig, immediate = true) => {
    setConfig(next);
    const patch = { daily_rotation: JSON.stringify(next) };
    const options = {
      onSaved: () => showToast(t("displaySettingsSaved")),
      onError: (error: unknown) => showToast(error instanceof Error ? error.message : String(error)),
    };
    // The strength slider coalesces; every other control is a discrete choice.
    if (immediate) queueSettingWrite("daily_rotation", patch, options);
    else scheduleSettingWrite("daily_rotation", patch, options);
  };

  const patchDaypart = (id: DaypartId, patch: Partial<DaypartRule>) => save({
    ...config,
    dayparts: config.dayparts.map((daypart) => daypart.id === id ? { ...daypart, ...patch } : daypart),
  });

  const ordered = [...config.dayparts].sort((a, b) => a.startHour - b.startHour);

  return (
    <SettingsSection title={t("dailyRotationTitle")} description={t("dailyRotationHint")}>
      <SettingRow label={t("dailyRotationEnabled")} description={t("dailyRotationEnabledHint")}>
        <Switch checked={config.enabled} onCheckedChange={(enabled) => save({ ...config, enabled })} />
      </SettingRow>

      <SettingRow label={t("dailyRotationStrength")} description={t("dailyRotationStrengthHint")}>
        <Inline gap={2} align="center">
          <Slider
            aria-label={t("dailyRotationStrength")}
            min={DAILY_ROTATION_LIMITS.strength.min}
            max={DAILY_ROTATION_LIMITS.strength.max}
            step={5}
            value={config.strength}
            disabled={!config.enabled}
            onChange={(strength) => save({ ...config, strength }, false)}
          />
          <Text as="span" size="sm" tone="muted">{config.strength}</Text>
        </Inline>
      </SettingRow>

      {tags.length === 0 ? (
        <EmptyState
          icon={<TagIcon />}
          compact
          title={t("dailyRotationNoTagsTitle")}
          description={t("dailyRotationNoTagsHint")}
        />
      ) : (
        <div className="daily-rotation-dayparts">
          {ordered.map((daypart) => {
            const suggested = suggestions[daypart.id] ?? [];
            const selected = daypart.tagUuids;
            return (
              <div key={daypart.id} className="daily-rotation-daypart">
                <div className="daily-rotation-daypart__header">
                  <div className="daily-rotation-daypart__identity">
                    <Text as="span" className="daily-rotation-daypart__name">{t(DAYPART_LABEL[daypart.id])}</Text>
                    <Text as="span" size="sm" tone="muted">{windowLabel(config, daypart.id)}</Text>
                  </div>
                  <Switch
                    ariaLabel={t("dailyRotationDaypartEnabled")}
                    checked={daypart.enabled}
                    disabled={!config.enabled}
                    onCheckedChange={(enabled) => patchDaypart(daypart.id, { enabled })}
                  />
                </div>

                <div className="daily-rotation-daypart__controls">
                  <Field label={t("dailyRotationStartsAt")}>
                    <SelectMenu
                      label={t("dailyRotationStartsAt")}
                      value={daypart.startHour}
                      disabled={!config.enabled || !daypart.enabled}
                      onChange={(startHour) => patchDaypart(daypart.id, { startHour })}
                      options={HOURS.map((hour) => ({ value: hour, label: formatHour(hour) }))}
                    />
                  </Field>

                  <Field label={t("dailyRotationSource")}>
                    <OptionPicker
                      columns={2}
                      label={t("dailyRotationSource")}
                      value={daypart.source}
                      onChange={(source) => patchDaypart(daypart.id, { source })}
                      options={[
                        { value: "learned", label: t("dailyRotationLearned"), description: t("dailyRotationLearnedHint"), disabled: !config.enabled || !daypart.enabled },
                        { value: "manual", label: t("dailyRotationManual"), description: t("dailyRotationManualHint"), disabled: !config.enabled || !daypart.enabled },
                      ]}
                    />
                  </Field>

                  {daypart.source === "manual" ? (
                    <Field label={t("dailyRotationTags")} hint={t("dailyRotationTagsHint", { count: DAILY_ROTATION_LIMITS.maxTagsPerDaypart })}>
                      <MultiSelectMenu
                        searchable
                        label={t("dailyRotationTags")}
                        values={selected}
                        disabled={!config.enabled || !daypart.enabled}
                        options={tagOptions}
                        emptyLabel={t("dailyRotationNoTagsChosen")}
                        onChange={(tagUuids) => patchDaypart(daypart.id, { tagUuids: tagUuids.slice(0, DAILY_ROTATION_LIMITS.maxTagsPerDaypart) })}
                      />
                    </Field>
                  ) : (
                    <Field label={t("dailyRotationSuggested")}>
                      {suggested.length === 0 ? (
                        <Text as="span" size="sm" tone="muted">{t("dailyRotationNoHabitsYet")}</Text>
                      ) : (
                        <Inline gap={2} align="center" className="daily-rotation-daypart__suggestions">
                          {suggested.map((tag) => <Badge key={tag.id}>{tag.name}</Badge>)}
                          <Button
                            size="sm"
                            disabled={!config.enabled || !daypart.enabled}
                            onClick={() => patchDaypart(daypart.id, {
                              source: "manual",
                              tagUuids: suggested
                                .map((tag) => tag.uuid)
                                .filter(Boolean)
                                .slice(0, DAILY_ROTATION_LIMITS.maxTagsPerDaypart),
                            })}
                          >
                            <Sparkles size={14} aria-hidden="true" />
                            {t("dailyRotationUseSuggested")}
                          </Button>
                        </Inline>
                      )}
                    </Field>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SettingsSection>
  );
}

export default DailyRotationSettings;
