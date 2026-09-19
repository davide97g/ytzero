import { AsyncTtlCache } from "./asyncTtlCache";
import { log } from "./logger";
import { parseVideoDurationSeconds } from "./shortClassification";
import {
  deepCollect,
  extractInitialData,
  innertubePlaylistConfig,
  parsePublishedTimeText,
  searchVideoFromLockup,
  type PublishedAgo,
} from "./youtube";
import { readYouTubeResponseWithCookies } from "./youtubeCookieJar";
import { isYouTubeRefusalError, youtubeRefusalGate } from "./youtubeRateLimit";
import { resolveYouTubeLanguage, youtubeRequestHeaders, type ResolvedYouTubeLanguage } from "./youtubeRequestLanguage";

/** One card of YouTube's own co-watch output, parsed from an InnerTube `next`
 * response. Everything here arrives with the card, so a candidate never costs a
 * second request to describe. */
export interface RelatedVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  durationText: string;
  durationSeconds: number | null;
  channelId: string;
  channelTitle: string;
  channelAvatar: string | null;
  viewCount: number | null;
  published: PublishedAgo | null;
  /** Live, premiering or upcoming: excluded from discovery, kept as a fact. */
  live: boolean;
  /** Rank inside the seed's list; earlier cards are stronger evidence. */
  position: number;
  source: "related" | "mix";
}

export interface RelatedFetchOptions {
  userId?: number;
  /** Tests inject a fake here so the suite can never reach YouTube. */
  fetchImpl?: typeof fetch;
  force?: boolean;
}

const RELATED_TTL_MS = 12 * 60 * 60_000;
const CONFIG_TTL_MS = 6 * 60 * 60_000;
/** An empty answer usually means YouTube changed shape. Remember it so a
 * refresh cycle cannot spend its whole budget rediscovering the same nothing. */
const EMPTY_SUPPRESSION_MS = 6 * 60 * 60_000;

const relatedCache = new AsyncTtlCache<RelatedVideo[]>({ ttlMs: RELATED_TTL_MS, maxEntries: 512 });
const configCache = new AsyncTtlCache<InnertubeWebConfig | null>({ ttlMs: CONFIG_TTL_MS, maxEntries: 8 });
const emptyUntil = new Map<string, number>();

export interface InnertubeWebConfig {
  apiKey: string;
  clientVersion: string;
  /** Video whose watch page was scraped, or null when the home page was used. */
  seedVideoId: string | null;
  /** That page's own data, so the seed that paid for the config gets its
   * related list for free. */
  initialData: any | null;
}

function liveFromNode(node: any): boolean {
  for (const badge of deepCollect(node, "metadataBadgeRenderer")) {
    const style = String(badge?.style ?? "");
    if (/LIVE|UPCOMING/i.test(style)) return true;
  }
  for (const overlay of deepCollect(node, "thumbnailOverlayTimeStatusRenderer")) {
    if (/LIVE|UPCOMING/i.test(String(overlay?.style ?? ""))) return true;
  }
  return Boolean(node?.upcomingEventData);
}

function textOf(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node.simpleText === "string") return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((run: any) => String(run?.text ?? "")).join("");
  if (typeof node.content === "string") return node.content;
  return "";
}

function bestThumbnail(node: any, videoId: string): string {
  const group = deepCollect(node, "thumbnails").find((list: any) => Array.isArray(list) && list.some((item) => item?.url));
  const url = String(group?.at(-1)?.url ?? "");
  if (!url) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return url.startsWith("//") ? `https:${url}` : url;
}

function parseViewCountText(text: string): number | null {
  const compact = text.match(/([\d.,]+)\s*([KMB])/i);
  if (compact) {
    const base = Number(compact[1].replace(/,/g, ""));
    const scale = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[compact[2].toLowerCase()] ?? 1;
    return Number.isFinite(base) ? Math.round(base * scale) : null;
  }
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Sidebar card shape used by the classic watch page. */
export function parseCompactVideoRenderer(node: any, position: number): RelatedVideo | null {
  const videoId = String(node?.videoId ?? "");
  const title = textOf(node?.title);
  if (!videoId || !title) return null;
  const durationText = textOf(node?.lengthText);
  const channelId = String(
    node?.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
    ?? node?.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId
    ?? "",
  );
  return {
    videoId,
    title,
    thumbnail: bestThumbnail(node?.thumbnail, videoId),
    durationText,
    durationSeconds: parseVideoDurationSeconds(durationText),
    channelId,
    channelTitle: textOf(node?.longBylineText) || textOf(node?.shortBylineText),
    channelAvatar: bestThumbnail(node?.channelThumbnail, videoId).includes("ytimg.com/vi/") ? null : bestThumbnail(node?.channelThumbnail, videoId),
    viewCount: parseViewCountText(textOf(node?.viewCountText)),
    published: parsePublishedTimeText(textOf(node?.publishedTimeText)),
    live: liveFromNode(node),
    position,
    source: "related",
  };
}

/** Row shape used by the `RD<videoId>` mix panel. */
export function parsePlaylistPanelVideoRenderer(node: any, position: number): RelatedVideo | null {
  const videoId = String(node?.videoId ?? "");
  const title = textOf(node?.title);
  if (!videoId || !title) return null;
  const durationText = textOf(node?.lengthText);
  // The mix panel folds channel, views and age into one run list.
  const info = Array.isArray(node?.videoInfo?.runs) ? node.videoInfo.runs.map((run: any) => String(run?.text ?? "")) : [];
  return {
    videoId,
    title,
    thumbnail: bestThumbnail(node?.thumbnail, videoId),
    durationText,
    durationSeconds: parseVideoDurationSeconds(durationText),
    channelId: String(node?.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ?? ""),
    channelTitle: textOf(node?.shortBylineText),
    channelAvatar: null,
    viewCount: parseViewCountText(info.find((text: string) => /view|wyświet|aufruf|vue|visual|再生/i.test(text)) ?? ""),
    published: info.map((text: string) => parsePublishedTimeText(text)).find((value: PublishedAgo | null) => value) ?? null,
    live: liveFromNode(node),
    position,
    source: "mix",
  };
}

function relatedFromLockup(node: any, position: number): RelatedVideo | null {
  const result = searchVideoFromLockup(node);
  if (!result) return null;
  return {
    videoId: result.videoId,
    title: result.title,
    thumbnail: result.thumbnail,
    durationText: result.duration,
    durationSeconds: parseVideoDurationSeconds(result.duration),
    channelId: result.channelId,
    channelTitle: result.channelTitle,
    channelAvatar: result.channelAvatar,
    viewCount: result.viewCount,
    published: result.published,
    live: liveFromNode(node),
    position,
    source: "related",
  };
}

function dedupeByVideoId(videos: RelatedVideo[]): RelatedVideo[] {
  const seen = new Set<string>();
  const out: RelatedVideo[] = [];
  for (const video of videos) {
    if (seen.has(video.videoId)) continue;
    seen.add(video.videoId);
    out.push({ ...video, position: out.length });
  }
  return out;
}

/** Parse the "up next" column. Three card shapes are live in the wild at once,
 * so all three are read rather than betting on the current A/B arm. */
export function collectRelatedVideos(data: any): RelatedVideo[] {
  const root = data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults ?? data?.secondaryResults ?? data;
  const out: RelatedVideo[] = [];
  let index = 0;
  for (const node of deepCollect(root, "compactVideoRenderer")) {
    const parsed = parseCompactVideoRenderer(node, index);
    if (parsed) { out.push(parsed); index++; }
  }
  for (const node of deepCollect(root, "lockupViewModel")) {
    const parsed = relatedFromLockup(node, index);
    if (parsed) { out.push(parsed); index++; }
  }
  for (const node of deepCollect(root, "videoRenderer")) {
    const parsed = parseCompactVideoRenderer(node, index);
    if (parsed) { out.push(parsed); index++; }
  }
  return dedupeByVideoId(out);
}

export function collectMixVideos(data: any): RelatedVideo[] {
  const root = data?.contents?.twoColumnWatchNextResults?.playlist?.playlist ?? data;
  const out: RelatedVideo[] = [];
  let index = 0;
  for (const node of deepCollect(root, "playlistPanelVideoRenderer")) {
    const parsed = parsePlaylistPanelVideoRenderer(node, index);
    if (parsed) { out.push(parsed); index++; }
  }
  return dedupeByVideoId(out);
}

function callFetch(options: RelatedFetchOptions | undefined): typeof fetch {
  return options?.fetchImpl ?? fetch;
}

/** Scrape one watch page for the InnerTube key and client version. The page's
 * own `ytInitialData` comes back with it, so the first seed needs no `next`. */
export async function innertubeWebConfig(seedVideoId?: string, options: RelatedFetchOptions = {}): Promise<InnertubeWebConfig | null> {
  const language = resolveYouTubeLanguage(options.userId);
  // One scrape per language every six hours; every later seed goes through the
  // much cheaper JSON endpoint with the key this page handed over.
  return await configCache.run(language.cacheKey, async () => {
    const url = seedVideoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(seedVideoId)}` : "https://www.youtube.com/";
    const response = await callFetch(options)(url, { headers: youtubeRequestHeaders(language.userId, language) });
    const html = await readYouTubeResponseWithCookies(response, "watch page fetch failed", language.userId, url);
    const config = innertubePlaylistConfig(html);
    if (!config) return null;
    return { ...config, seedVideoId: seedVideoId ?? null, initialData: extractInitialData(html) };
  }, options.force);
}

async function postNext(
  body: Record<string, unknown>,
  config: InnertubeWebConfig,
  language: ResolvedYouTubeLanguage,
  options: RelatedFetchOptions,
): Promise<any> {
  const url = `https://www.youtube.com/youtubei/v1/next?prettyPrint=false&key=${encodeURIComponent(config.apiKey)}`;
  const response = await callFetch(options)(url, {
    method: "POST",
    headers: { ...youtubeRequestHeaders(language.userId, language), "Content-Type": "application/json", Origin: "https://www.youtube.com" },
    body: JSON.stringify({
      context: { client: { clientName: "WEB", clientVersion: config.clientVersion, hl: language.hl, gl: "US" } },
      ...body,
    }),
  });
  return JSON.parse(await readYouTubeResponseWithCookies(response, "related fetch failed", language.userId, url));
}

async function loadRelated(
  videoId: string,
  kind: "related" | "mix",
  options: RelatedFetchOptions,
): Promise<RelatedVideo[]> {
  const language = resolveYouTubeLanguage(options.userId);
  // A refusal must stop the whole cycle rather than degrade each seed slowly.
  youtubeRefusalGate.enter();
  try {
    const config = await innertubeWebConfig(kind === "related" ? videoId : undefined, options);
    if (!config) {
      youtubeRefusalGate.releaseProbe();
      return [];
    }
    // Only the video that seeded the config owns that page's sidebar; anyone
    // else reading it would inherit a stranger's related list.
    if (kind === "related" && config.seedVideoId === videoId && config.initialData) {
      const fromPage = collectRelatedVideos(config.initialData);
      if (fromPage.length > 0) {
        youtubeRefusalGate.answered();
        return fromPage;
      }
    }
    const body = kind === "related" ? { videoId } : { videoId, playlistId: `RD${videoId}` };
    const data = await postNext(body, config, language, options);
    youtubeRefusalGate.answered();
    return kind === "related" ? collectRelatedVideos(data) : collectMixVideos(data);
  } catch (error) {
    if (isYouTubeRefusalError(error)) throw youtubeRefusalGate.refused(error);
    youtubeRefusalGate.releaseProbe();
    log.warn("discovery.related_failed", { videoId, kind, error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

async function cachedRelated(videoId: string, kind: "related" | "mix", options: RelatedFetchOptions): Promise<RelatedVideo[]> {
  const language = resolveYouTubeLanguage(options.userId);
  const key = `${language.cacheKey}:${kind}:${videoId}`;
  const suppressed = emptyUntil.get(key);
  if (suppressed != null && suppressed > Date.now()) return [];
  const videos = await relatedCache.run(key, () => loadRelated(videoId, kind, options), options.force);
  if (videos.length === 0) {
    emptyUntil.set(key, Date.now() + EMPTY_SUPPRESSION_MS);
    log.warn("discovery.related_empty", { videoId, kind });
  } else {
    emptyUntil.delete(key);
  }
  return videos;
}

/** YouTube's "up next" list for one video: its own co-watch graph, read back. */
export async function fetchRelatedVideos(videoId: string, options: RelatedFetchOptions = {}): Promise<RelatedVideo[]> {
  return await cachedRelated(videoId, "related", options);
}

/** The `RD<videoId>` mix: deeper and more varied than the sidebar. */
export async function fetchMixVideos(videoId: string, options: RelatedFetchOptions = {}): Promise<RelatedVideo[]> {
  return await cachedRelated(videoId, "mix", options);
}

export function clearRelatedCache(): void {
  relatedCache.clear();
  configCache.clear();
  emptyUntil.clear();
}
