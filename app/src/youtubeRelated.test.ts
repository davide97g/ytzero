import { describe, expect, test, beforeEach } from "bun:test";
import { isYouTubeRefusalError, youtubeRefusalGate } from "./youtubeRateLimit";
import {
  clearRelatedCache,
  collectMixVideos,
  collectRelatedVideos,
  fetchMixVideos,
  fetchRelatedVideos,
  parseCompactVideoRenderer,
  parsePlaylistPanelVideoRenderer,
} from "./youtubeRelated";

// Shapes captured from a logged-out youtubei/v1/next response.
const compact = {
  videoId: "dQw4w9WgXcQ",
  title: { simpleText: "How a lathe actually works" },
  thumbnail: { thumbnails: [{ url: "https://i.ytimg.com/small.jpg" }, { url: "https://i.ytimg.com/large.jpg" }] },
  lengthText: { simpleText: "18:42" },
  viewCountText: { simpleText: "1.2M views" },
  publishedTimeText: { simpleText: "3 weeks ago" },
  longBylineText: { runs: [{ text: "Machine Shop", navigationEndpoint: { browseEndpoint: { browseId: "UC-shop" } } }] },
};

const liveCompact = {
  ...compact,
  videoId: "live-1",
  lengthText: undefined,
  badges: [{ metadataBadgeRenderer: { style: "BADGE_STYLE_TYPE_LIVE_NOW", label: "LIVE" } }],
};

const panelRow = {
  videoId: "mix-1",
  title: { simpleText: "Deep focus mix" },
  thumbnail: { thumbnails: [{ url: "https://i.ytimg.com/mix.jpg" }] },
  lengthText: { simpleText: "1:02:03" },
  shortBylineText: { runs: [{ text: "Focus Radio", navigationEndpoint: { browseEndpoint: { browseId: "UC-focus" } } }] },
  videoInfo: { runs: [{ text: "Focus Radio" }, { text: " • " }, { text: "845K views" }, { text: "2 years ago" }] },
};

function nextResponse(nodes: unknown[]) {
  return {
    contents: {
      twoColumnWatchNextResults: {
        secondaryResults: { secondaryResults: { results: nodes.map((node) => ({ compactVideoRenderer: node })) } },
      },
    },
  };
}

describe("related card parsing", () => {
  test("reads every field the card already carries", () => {
    const parsed = parseCompactVideoRenderer(compact, 3);
    expect(parsed).not.toBeNull();
    expect(parsed!.videoId).toBe("dQw4w9WgXcQ");
    expect(parsed!.title).toBe("How a lathe actually works");
    expect(parsed!.thumbnail).toBe("https://i.ytimg.com/large.jpg");
    expect(parsed!.durationSeconds).toBe(18 * 60 + 42);
    expect(parsed!.channelId).toBe("UC-shop");
    expect(parsed!.channelTitle).toBe("Machine Shop");
    expect(parsed!.viewCount).toBe(1_200_000);
    expect(parsed!.published).toEqual({ value: 3, unit: "week" });
    expect(parsed!.live).toBe(false);
    expect(parsed!.position).toBe(3);
  });

  test("marks a live card and leaves it without a duration", () => {
    const parsed = parseCompactVideoRenderer(liveCompact, 0);
    expect(parsed!.live).toBe(true);
    expect(parsed!.durationSeconds).toBeNull();
  });

  test("reads the mix panel's folded metadata row", () => {
    const parsed = parsePlaylistPanelVideoRenderer(panelRow, 1);
    expect(parsed!.videoId).toBe("mix-1");
    expect(parsed!.channelId).toBe("UC-focus");
    expect(parsed!.durationSeconds).toBe(3723);
    expect(parsed!.viewCount).toBe(845_000);
    expect(parsed!.published).toEqual({ value: 2, unit: "year" });
    expect(parsed!.source).toBe("mix");
  });

  test("collects and renumbers, dropping duplicates", () => {
    const videos = collectRelatedVideos(nextResponse([compact, compact, { ...compact, videoId: "second" }]));
    expect(videos.map((video) => video.videoId)).toEqual(["dQw4w9WgXcQ", "second"]);
    expect(videos.map((video) => video.position)).toEqual([0, 1]);
  });

  test("collects mix rows from the playlist panel", () => {
    const videos = collectMixVideos({
      contents: { twoColumnWatchNextResults: { playlist: { playlist: { contents: [{ playlistPanelVideoRenderer: panelRow }] } } } },
    });
    expect(videos).toHaveLength(1);
    expect(videos[0].videoId).toBe("mix-1");
  });
});

const WATCH_PAGE = `<html><script>var ytInitialData = {"contents":{}};</script>
  "INNERTUBE_API_KEY":"test-key","INNERTUBE_CONTEXT_CLIENT_VERSION":"2.20260101.00.00"</html>`;

function fakeFetch(calls: { url: string; body: any }[], payload: unknown) {
  return (async (input: any, init?: any) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (url.includes("/youtubei/v1/next")) {
      return new Response(JSON.stringify(payload), { status: 200 });
    }
    if (url.startsWith("https://www.youtube.com/watch") || url === "https://www.youtube.com/") {
      return new Response(WATCH_PAGE, { status: 200 });
    }
    throw new Error(`unexpected host: ${url}`);
  }) as unknown as typeof fetch;
}

describe("related fetching", () => {
  beforeEach(() => {
    clearRelatedCache();
    // The refusal gate is address-wide and process-local, so one test's
    // simulated block would otherwise pause every later one.
    youtubeRefusalGate.answered();
  });

  test("posts to next with the scraped key and caches the answer", async () => {
    const calls: { url: string; body: any }[] = [];
    const impl = fakeFetch(calls, nextResponse([compact]));
    const first = await fetchRelatedVideos("seed-1", { fetchImpl: impl });
    expect(first.map((video) => video.videoId)).toEqual(["dQw4w9WgXcQ"]);
    const nextCall = calls.find((call) => call.url.includes("/youtubei/v1/next"));
    expect(nextCall?.url).toContain("key=test-key");
    expect(nextCall?.body.videoId).toBe("seed-1");
    expect(nextCall?.body.context.client.clientName).toBe("WEB");

    const before = calls.length;
    await fetchRelatedVideos("seed-1", { fetchImpl: impl });
    expect(calls.length).toBe(before);
  });

  test("asks for the RD mix by playlist id", async () => {
    const calls: { url: string; body: any }[] = [];
    await fetchMixVideos("seed-2", { fetchImpl: fakeFetch(calls, { contents: {} }) });
    const nextCall = calls.find((call) => call.url.includes("/youtubei/v1/next"));
    expect(nextCall?.body.playlistId).toBe("RDseed-2");
  });

  test("a bot challenge raises a refusal so the whole cycle stops", async () => {
    const impl = (async () => new Response("please confirm you're not a bot", { status: 200 })) as unknown as typeof fetch;
    let raised: unknown = null;
    await fetchRelatedVideos("seed-3", { fetchImpl: impl }).catch((error) => { raised = error; });
    expect(raised).not.toBeNull();
    expect(isYouTubeRefusalError(raised)).toBe(true);
  });

  test("an empty answer is remembered so the next cycle skips it", async () => {
    const calls: { url: string; body: any }[] = [];
    const impl = fakeFetch(calls, { contents: {} });
    expect(await fetchRelatedVideos("seed-4", { fetchImpl: impl })).toEqual([]);
    const before = calls.length;
    expect(await fetchRelatedVideos("seed-4", { fetchImpl: impl })).toEqual([]);
    expect(calls.length).toBe(before);
  });
});
