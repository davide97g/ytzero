import { useEffect, useState } from "react";
import { api } from "../../api";
import { emit } from "../../events";
import { useI18n } from "../../i18n";
import { queueSettingWrite, scheduleSettingWrite } from "../../settingsWriteQueue";
import {
  normalizeWatchProgressConfig,
  WATCH_PROGRESS_LIMITS,
  type WatchProgressConfig,
} from "../../../../shared/watchProgress";
import { Inline, SelectMenu, SettingRow, SettingsSection, Slider, Text } from "../ui";

type FeedSort = "published" | "arrival";
type RefreshScope = "videos" | "everything";

/** Slider read-out: seconds up to a minute, then minutes. */
function formatSeconds(value: number): string {
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

export function FeedTuningSettings({ showToast }: { showToast: (message: string) => void }) {
  const { t } = useI18n();
  const [tuning, setTuning] = useState<WatchProgressConfig | null>(null);
  const [sort, setSort] = useState<FeedSort>("published");
  const [refreshScope, setRefreshScope] = useState<RefreshScope>("videos");

  useEffect(() => {
    api.settings().then((result) => {
      setTuning(normalizeWatchProgressConfig({
        completeRatio: result.settings.feed_complete_ratio,
        minPosition: result.settings.feed_progress_min_seconds,
        minDuration: result.settings.feed_progress_min_duration,
        continueLimit: result.settings.feed_continue_limit,
      }));
      setSort(result.settings.feed_sort === "arrival" ? "arrival" : "published");
      setRefreshScope(result.settings.feed_refresh_scope === "everything" ? "everything" : "videos");
    }).catch(() => setTuning(normalizeWatchProgressConfig()));
  }, []);

  if (!tuning) return null;

  const saveOptions = {
    onSaved: () => {
      // The thresholds decide what Main and its shelves contain, so the open
      // feed has to be rebuilt rather than wait for the next visit.
      emit("feed-view-reload-requested");
      showToast(t("displaySettingsSaved"));
    },
    onError: (error: unknown) => showToast(error instanceof Error ? error.message : String(error)),
  };

  /** Writes the whole config so a slider drag can never leave two thresholds
   *  describing different rules. Drags coalesce; everything else is discrete. */
  const saveTuning = (next: WatchProgressConfig, dragging = false) => {
    setTuning(next);
    const patch = {
      feed_complete_ratio: String(next.completeRatio),
      feed_progress_min_seconds: String(next.minPosition),
      feed_progress_min_duration: String(next.minDuration),
      feed_continue_limit: String(next.continueLimit),
    };
    if (dragging) scheduleSettingWrite("feed_tuning", patch, saveOptions);
    else queueSettingWrite("feed_tuning", patch, saveOptions);
  };

  const saveSort = (next: FeedSort) => {
    setSort(next);
    queueSettingWrite("feed_sort", { feed_sort: next }, {
      ...saveOptions,
      // The order also lives in the profile menu, which reads it from the shell.
      onSaved: () => { emit("feed-settings-changed"); saveOptions.onSaved(); },
    });
  };

  const saveRefreshScope = (next: RefreshScope) => {
    setRefreshScope(next);
    queueSettingWrite("feed_refresh_scope", { feed_refresh_scope: next }, {
      ...saveOptions,
      onSaved: () => { emit("feed-settings-changed"); showToast(t("displaySettingsSaved")); },
    });
  };

  return (
    <SettingsSection title={t("displayFeedTuning")} description={t("feedTuningHint")} className="settings-display-group">
      <SettingRow label={t("feedSortLabel")} description={t("feedTuningSortHint")}>
        <SelectMenu
          label={t("feedSortLabel")}
          value={sort}
          onChange={saveSort}
          options={[
            { value: "published" as const, label: t("feedSortUploaded") },
            { value: "arrival" as const, label: t("feedSortFound") },
          ]}
        />
      </SettingRow>

      <SettingRow label={t("feedRefreshScope")} description={t("feedRefreshScopeHint")}>
        <SelectMenu
          label={t("feedRefreshScope")}
          value={refreshScope}
          onChange={saveRefreshScope}
          options={[
            { value: "videos" as const, label: t("feedRefreshScopeVideos") },
            { value: "everything" as const, label: t("feedRefreshScopeEverything") },
          ]}
        />
      </SettingRow>

      <SettingRow label={t("feedCompleteRatio")} description={t("feedCompleteRatioHint")}>
        <Inline gap={2} align="center">
          <Slider
            aria-label={t("feedCompleteRatio")}
            min={Math.round(WATCH_PROGRESS_LIMITS.completeRatio.min * 100)}
            max={Math.round(WATCH_PROGRESS_LIMITS.completeRatio.max * 100)}
            step={1}
            value={Math.round(tuning.completeRatio * 100)}
            onChange={(percent) => saveTuning({ ...tuning, completeRatio: percent / 100 }, true)}
          />
          <Text as="span" size="sm" tone="muted">{Math.round(tuning.completeRatio * 100)}%</Text>
        </Inline>
      </SettingRow>

      <SettingRow label={t("feedProgressMinSeconds")} description={t("feedProgressMinSecondsHint")}>
        <Inline gap={2} align="center">
          <Slider
            aria-label={t("feedProgressMinSeconds")}
            min={WATCH_PROGRESS_LIMITS.minPosition.min}
            max={120}
            step={1}
            value={Math.min(120, tuning.minPosition)}
            onChange={(minPosition) => saveTuning({ ...tuning, minPosition }, true)}
          />
          <Text as="span" size="sm" tone="muted">{formatSeconds(tuning.minPosition)}</Text>
        </Inline>
      </SettingRow>

      <SettingRow label={t("feedProgressMinDuration")} description={t("feedProgressMinDurationHint")}>
        <Inline gap={2} align="center">
          <Slider
            aria-label={t("feedProgressMinDuration")}
            min={WATCH_PROGRESS_LIMITS.minDuration.min}
            max={600}
            step={5}
            value={Math.min(600, tuning.minDuration)}
            onChange={(minDuration) => saveTuning({ ...tuning, minDuration }, true)}
          />
          <Text as="span" size="sm" tone="muted">{formatSeconds(tuning.minDuration)}</Text>
        </Inline>
      </SettingRow>

      <SettingRow label={t("feedContinueLimit")} description={t("feedContinueLimitHint")}>
        <Inline gap={2} align="center">
          <Slider
            aria-label={t("feedContinueLimit")}
            min={WATCH_PROGRESS_LIMITS.continueLimit.min}
            max={WATCH_PROGRESS_LIMITS.continueLimit.max}
            step={1}
            value={tuning.continueLimit}
            onChange={(continueLimit) => saveTuning({ ...tuning, continueLimit }, true)}
          />
          <Text as="span" size="sm" tone="muted">{tuning.continueLimit}</Text>
        </Inline>
      </SettingRow>
    </SettingsSection>
  );
}
