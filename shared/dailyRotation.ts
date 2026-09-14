export const DAILY_ROTATION_LIMITS = {
  strength: { min: 0, max: 100 },
  startHour: { min: 0, max: 23 },
  maxTagsPerDaypart: 8,
  learnedTagCount: 3,
} as const;

export type DaypartId = "morning" | "midday" | "afternoon" | "evening" | "night";
export type DaypartSource = "learned" | "manual";

export const DAYPART_IDS: readonly DaypartId[] = ["morning", "midday", "afternoon", "evening", "night"];

/** Start hours chosen so the default windows read as the ordinary shape of a
 * day: a slow start, a break around lunch, an afternoon, an evening after
 * dinner, and a late tail that wraps past midnight. */
const DEFAULT_START_HOURS: Readonly<Record<DaypartId, number>> = {
  morning: 6,
  midday: 11,
  afternoon: 14,
  evening: 18,
  night: 23,
};

export interface DaypartRule {
  id: DaypartId;
  /** Local hour the daypart begins; it runs until the next enabled daypart. */
  startHour: number;
  enabled: boolean;
  /** "learned" resolves tags from Pulse on every request, "manual" uses tagUuids. */
  source: DaypartSource;
  tagUuids: string[];
}

export interface DailyRotationConfig {
  version: 1;
  enabled: boolean;
  /** How hard a daypart match outranks the other ranking signals, 0-100. */
  strength: number;
  dayparts: DaypartRule[];
}

export function defaultDaypartRule(id: DaypartId): DaypartRule {
  return { id, startHour: DEFAULT_START_HOURS[id], enabled: true, source: "learned", tagUuids: [] };
}

export function defaultDailyRotationConfig(): DailyRotationConfig {
  return {
    version: 1,
    enabled: false,
    strength: 60,
    dayparts: DAYPART_IDS.map(defaultDaypartRule),
  };
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;
}

/** Tags travel as portable uuids so a restored profile keeps its rotation. */
function tagRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))]
    .slice(0, DAILY_ROTATION_LIMITS.maxTagsPerDaypart);
}

function normalizeDaypart(id: DaypartId, value: unknown): DaypartRule {
  const fallback = defaultDaypartRule(id);
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    id,
    startHour: boundedInteger(input.startHour, fallback.startHour, DAILY_ROTATION_LIMITS.startHour.min, DAILY_ROTATION_LIMITS.startHour.max),
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    source: enumValue(input.source, ["learned", "manual"], fallback.source),
    tagUuids: tagRefs(input.tagUuids),
  };
}

/** Accepts the stored JSON string or an already-parsed object. Returns null
 * only for input that cannot be a configuration at all, so a partially written
 * or older document is repaired rather than rejected. */
export function normalizeDailyRotationConfig(input: unknown): DailyRotationConfig | null {
  let value = input;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const byId = new Map<DaypartId, unknown>();
  if (Array.isArray(record.dayparts)) {
    for (const entry of record.dayparts) {
      const id = entry && typeof entry === "object" ? (entry as Record<string, unknown>).id : null;
      if (typeof id === "string" && (DAYPART_IDS as readonly string[]).includes(id)) byId.set(id as DaypartId, entry);
    }
  }
  const dayparts = DAYPART_IDS.map((id) => normalizeDaypart(id, byId.get(id)));
  dayparts.sort((a, b) => a.startHour - b.startHour || DAYPART_IDS.indexOf(a.id) - DAYPART_IDS.indexOf(b.id));
  return {
    version: 1,
    enabled: typeof record.enabled === "boolean" ? record.enabled : false,
    strength: boundedInteger(record.strength, 60, DAILY_ROTATION_LIMITS.strength.min, DAILY_ROTATION_LIMITS.strength.max),
    dayparts,
  };
}

/** The enabled daypart whose window contains `hour`. Windows run from one
 * enabled start hour to the next and wrap past midnight, so the last daypart of
 * the day owns the small hours. */
export function activeDaypart(config: DailyRotationConfig, hour: number): DaypartRule | null {
  if (!config.enabled) return null;
  const normalizedHour = ((Math.floor(hour) % 24) + 24) % 24;
  const enabled = config.dayparts.filter((daypart) => daypart.enabled).sort((a, b) => a.startHour - b.startHour);
  if (enabled.length === 0) return null;
  let active = enabled[enabled.length - 1]!;
  for (const daypart of enabled) {
    if (daypart.startHour <= normalizedHour) active = daypart;
  }
  return active;
}

/** Every hour the daypart covers, used to scope the Pulse lookup for a
 * "learned" daypart and to describe the window in Settings. The top-level
 * switch is ignored here: Settings has to show the windows before the feature
 * is turned on. */
export function daypartHours(config: DailyRotationConfig, id: DaypartId): number[] {
  const windows = { ...config, enabled: true };
  const hours: number[] = [];
  for (let hour = 0; hour < 24; hour++) {
    if (activeDaypart(windows, hour)?.id === id) hours.push(hour);
  }
  return hours;
}

export function serializeDailyRotationConfig(config: DailyRotationConfig): string {
  return JSON.stringify(config);
}
