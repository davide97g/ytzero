// Every network call is answered locally. An unexpected host throws, so this
// harness can never reach YouTube.
const fetchCalls: string[] = [];
let mode: "ok" | "challenge" = "ok";

const WATCH_PAGE = `<html><script>var ytInitialData = {"contents":{}};</script>
  "INNERTUBE_API_KEY":"harness-key","INNERTUBE_CONTEXT_CLIENT_VERSION":"2.20260101.00.00"</html>`;

function card(videoId: string, channelId: string, title: string, duration = "21:30", views = "120K views") {
  return {
    compactVideoRenderer: {
      videoId,
      title: { simpleText: title },
      thumbnail: { thumbnails: [{ url: `https://i.ytimg.com/${videoId}.jpg` }] },
      lengthText: { simpleText: duration },
      viewCountText: { simpleText: views },
      publishedTimeText: { simpleText: "4 days ago" },
      longBylineText: { runs: [{ text: `Channel ${channelId}`, navigationEndpoint: { browseEndpoint: { browseId: channelId } } }] },
    },
  };
}

// out-common is reached from both seeds; out-single only from one. The gap
// between them is the co-watch evidence the ranking is supposed to reward.
const RELATED: Record<string, unknown[]> = {
  "seed-one": [card("out-common", "UC-out-1", "Shared recommendation"), card("out-single", "UC-out-2", "Only one seed")],
  "seed-two": [card("out-common", "UC-out-1", "Shared recommendation"), card("out-short", "UC-out-3", "Too short", "1:12")],
};

function nextPayload(body: any) {
  if (body?.playlistId) return { contents: { twoColumnWatchNextResults: { playlist: { playlist: { contents: [] } } } } };
  const results = RELATED[String(body?.videoId ?? "")] ?? [];
  return { contents: { twoColumnWatchNextResults: { secondaryResults: { secondaryResults: { results } } } } };
}

globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(input);
  fetchCalls.push(url);
  if (mode === "challenge") return new Response("please confirm you're not a bot", { status: 200 });
  if (url.includes("/youtubei/v1/next")) {
    return new Response(JSON.stringify(nextPayload(init?.body ? JSON.parse(String(init.body)) : {})), { status: 200 });
  }
  if (url.startsWith("https://www.youtube.com/watch") || url === "https://www.youtube.com/") {
    return new Response(WATCH_PAGE, { status: 200 });
  }
  throw new Error(`unexpected host: ${url}`);
}) as unknown as typeof fetch;

const { api } = await import("../src/routes");
const { db, setUserSetting } = await import("../src/db");
const { setPluginEnabled, setPluginSettings } = await import("../src/plugins");
const { clearRelatedCache } = await import("../src/youtubeRelated");

await setPluginEnabled("discovery", true);

const primaryId = 1;
const child = db.prepare(
  "INSERT INTO users(name, avatar_color, sort_order, portable_uuid, is_child) VALUES(?, ?, ?, ?, 1) RETURNING id",
).get("Child", "#654321", 1, crypto.randomUUID()) as { id: number };
await setUserSetting(child.id, "child_local_only", "1");

db.prepare("INSERT INTO channels(channel_id, title, url, thumbnail, external) VALUES(?, ?, ?, ?, 0)")
  .run("UC-seed", "Seed channel", "https://youtube.com/channel/UC-seed", "seed.jpg");
db.prepare("INSERT INTO user_channels(user_id, channel_id, followed) VALUES(?, ?, 1)").run(primaryId, "UC-seed");
db.prepare("INSERT INTO user_channels(user_id, channel_id, followed) VALUES(?, ?, 1)").run(child.id, "UC-seed");

const publishedAt = new Date(Date.now() - 86_400_000).toISOString();
const addVideo = db.prepare(`
  INSERT INTO videos(video_id, channel_id, title, thumbnail, published_at, is_short, live_status, is_private, external)
  VALUES (?, 'UC-seed', ?, ?, ?, 0, 'none', 0, 0)
`);
for (const [id, title] of [["seed-one", "Watched all the way"], ["seed-two", "Also finished"], ["local-fresh", "Still in the inbox"]]) {
  addVideo.run(id, title, `${id}.jpg`, publishedAt);
}

// Both seeds are finished history, which is what makes them seeds at all.
for (const id of ["seed-one", "seed-two"]) {
  db.prepare("INSERT INTO history(video_id, user_id, watched_at) VALUES(?, ?, datetime('now'))").run(id, primaryId);
  db.prepare("INSERT INTO user_videos(user_id, video_id, watched, watch_position, watch_duration) VALUES(?, ?, 1, 980, 1000)")
    .run(primaryId, id);
}

const request = (profileId: number, path: string) => api.request(`http://localhost${path}`, {
  headers: { Cookie: `ytzero_profile=${profileId}` },
});
const post = (profileId: number, path: string) => api.request(`http://localhost${path}`, {
  method: "POST",
  headers: { Cookie: `ytzero_profile=${profileId}` },
});

// ---------- default: opt-in means nothing leaves the building ----------
const defaultResponse = await request(primaryId, "/recommendations?limit=60&refresh=1");
const defaultFeed = await defaultResponse.json() as any;
const callsWhileDisabled = fetchCalls.length;
const rowsWhileDisabled = (db.prepare("SELECT count(*) AS count FROM discovery_recommendations").get() as { count: number }).count;

// ---------- enabled ----------
await setPluginSettings(primaryId, "discovery", { external_enabled: 1, min_view_count: 500, seed_count: 12 });
const enabledResponse = await request(primaryId, "/recommendations?limit=60&refresh=1");
const enabled = await enabledResponse.json() as any;
const enabledIds = enabled.videos.map((item: any) => item.video_id);
const callsAfterFirstCycle = fetchCalls.length;

const importedRows = db.prepare(
  "SELECT video_id, external, is_short, published_at_approximate, duration, views FROM videos WHERE external = 1 ORDER BY video_id",
).all() as any[];

// ---------- a second cycle is answered from cache ----------
await request(primaryId, "/recommendations?limit=60&refresh=1");
const callsAfterSecondCycle = fetchCalls.length;

// ---------- a restricted child profile never reaches outside ----------
const childResponse = await request(child.id, "/recommendations?limit=60&refresh=1");
const childFeed = await childResponse.json() as any;
const callsAfterChild = fetchCalls.length;

// ---------- explicit negative feedback ----------
const dismissResponse = await post(primaryId, "/discovery/recommendations/out-common/dismiss");
const feedbackRows = db.prepare("SELECT video_id, action FROM recommendation_feedback").all() as any[];
const afterDismiss = await (await request(primaryId, "/recommendations?limit=60")).json() as any;

// ---------- a refused address degrades to the local library ----------
mode = "challenge";
clearRelatedCache();
const challengeResponse = await request(primaryId, "/recommendations?limit=60&refresh=1");
const challenge = await challengeResponse.json() as any;
mode = "ok";

console.log("RESULT " + JSON.stringify({
  defaultStatus: defaultResponse.status,
  defaultExternalEnabled: defaultFeed.external_enabled,
  defaultIds: defaultFeed.videos.map((item: any) => item.video_id),
  callsWhileDisabled,
  rowsWhileDisabled,
  enabledStatus: enabledResponse.status,
  enabledExternalEnabled: enabled.external_enabled,
  enabledIds,
  commonRank: enabledIds.indexOf("out-common"),
  singleRank: enabledIds.indexOf("out-single"),
  shortImported: enabledIds.includes("out-short"),
  importedRows,
  requestsFirstCycle: callsAfterFirstCycle,
  requestsSecondCycle: callsAfterSecondCycle - callsAfterFirstCycle,
  childStatus: childResponse.status,
  childIds: childFeed.videos.map((item: any) => item.video_id),
  childCausedRequests: callsAfterChild - callsAfterSecondCycle,
  dismissStatus: dismissResponse.status,
  feedbackRows,
  afterDismissIds: afterDismiss.videos.map((item: any) => item.video_id),
  challengeStatus: challengeResponse.status,
  challengeIds: challenge.videos.map((item: any) => item.video_id),
}));

db.close();
