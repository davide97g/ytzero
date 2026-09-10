# Idea: smart home recommendations without cookies or a Google account

Status: idea / research notes (2026-09-10). Fork-local, not upstream.
Goal: build a pseudo-YouTube-algorithm home shelf from YT Zero's own history,
with no Google login, no cookie jar, no throwaway account.

## 1. Official YouTube Data API v3 is a dead end for recommendations

- No recommendation endpoint exists.
- `search.list?relatedToVideoId` was removed in August 2023.
- `activities.list` no longer returns a home feed.
- Anything personalized requires OAuth against a real Google account — the
  exact thing this idea rules out.

Still useful as a cheap side layer:

| Call | Cost | Use |
| --- | --- | --- |
| `videos.list` (up to 50 ids) | 1 unit | metadata / validation |
| `search.list` | 100 units | ~100 queries/day at the default 10k quota |
| `videos.list?chart=mostPopular` | 1 unit | regional trending, cold start |

## 2. InnerTube (no login) carries the real algorithm output

Two logged-out endpoints expose YouTube's own co-watch graph:

- `POST https://www.youtube.com/youtubei/v1/next`
  body `{ context: { client: { clientName: "WEB", clientVersion, hl, gl } }, videoId }`
  → `secondaryResults.secondaryResults.results[]` (`compactVideoRenderer` /
  `lockupViewModel`) = the "up next" related list, seeded by one video.
- Mix radio: same endpoint with `playlistId: "RD<videoId>"` → algorithmic
  infinite sequence, deeper and more diverse than the sidebar.
  `RDCM<channelId>` gives a channel mix.

Not useful: `browse` with `browseId: "FEwhat_to_watch"` logged out returns
generic popular content, zero personalization. `FEtrending` only for cold start.

Plumbing already in the repo and reusable:

- `innertubePlaylistConfig` (`app/src/youtube.ts:443`) scrapes
  `INNERTUBE_API_KEY` and `INNERTUBE_CONTEXT_CLIENT_VERSION`.
- `readYouTubeResponseWithCookies` (`app/src/youtubeCookieJar.ts`) handles
  refusals and bot challenges.
- `youtubeRateLimit.ts` gates request rate; refusal gate backs off.
- `deepCollect` plus `searchVideoFromLockup` (`app/src/youtubeSearch.ts`)
  already parse both the old renderer and new lockup card shapes.

A new `app/src/youtubeRelated.ts` of roughly 120 lines can reuse all of it.

## 3. The repo already has ~80% of this; upstream removed the entry points

Working machinery still present:

- `app/src/discoveryKeywords.ts` — TF-IDF-ish term and query extraction from
  watched/liked titles and tags, with a blocklist.
- `app/src/plugins.ts:601` `externalRecommendations` — builds queries, calls
  `searchYouTube`, scores titles, `fetchVideoInfo`, filters Shorts/live,
  `upsertExternalVideo`, returns candidates.
- `app/src/recommendationRanking.ts` — scoring: Pulse tag×hour, channel×hour,
  tag affinity, liked, progress, recency.
- `rebuildDiscoveryRecommendations` (`app/src/plugins.ts:763`) mixes local and
  external, diversifies per channel, persists to `discovery_recommendations`.
- Tables `discovery_recommendations` and `recommendation_feedback`, route
  `GET /discovery/recommendations` (`app/src/routes/videoRoutes.ts:86`), page
  `ui/src/pages/RecommendationsPage.tsx`.

Deliberately disabled wiring:

- `discoveryRecommendations` and `refreshDiscoveryNow` return `[]`
  (`app/src/plugins.ts:742`, `:746`).
- `refreshDiscoveryInBackground` has an empty body (`:752`), so nothing calls
  `runDiscoveryRefresh` (`:754`) and `externalRecommendations` is unreachable.
- `recommendationFeed` hardcodes `external_enabled: false` (`:1045`).
- `DISCOVERY_SETTINGS` (`app/src/pluginCatalog.ts:174`) lost
  `outside_base_points`, `outside_exact_match_points`,
  `outside_partial_match_points` and `early_external_count`. The surviving code
  still reads them, so they resolve to `undefined` and every external candidate
  scores `NaN`. These must be restored before re-enabling anything.
- `dismissDiscoveryRecommendation` is a no-op (`:1062`) while the dismiss
  filter is still applied in SQL — restore the write to keep negative feedback.
- The plugin manifest text was rewritten to "Ranks eligible videos already
  stored in your local library"; update it if external discovery returns.

## 4. Step 1 — revive search-based discovery (about half a day)

1. Re-add the four `outside_*` / `early_external_count` sliders to
   `DISCOVERY_SETTINGS`.
2. Implement `discoveryRecommendations` as a read of
   `discovery_recommendations` through the existing
   `readStoredDiscoveryRecommendations`; make `refreshDiscoveryNow` await
   `runDiscoveryRefresh(uid)` and then read.
3. Implement `refreshDiscoveryInBackground` as a debounce timer (the map and
   `DISCOVERY_REFRESH_INTERVAL_MS` of 15 minutes already exist) calling
   `runDiscoveryRefresh`, guarded by `maintenanceActive()` and the cluster
   worker flag — in a Postgres cluster only the nominated worker may run it.
4. Set `external_enabled: pluginEnabled("discovery") && allowExternal`.
5. Restore the dismiss write into `recommendation_feedback`.

This alone gives history-derived queries plus local Pulse ranking, but search
results are not the algorithm: search ranks by query match, not by co-watch.

## 5. Step 2 — add the real signal via InnerTube `next`

New module wrapping `next` for both `videoId` and `RD<videoId>` mixes, parsing
results with the existing lockup/renderer parsers, cached per video for 6–24h
in a `related_cache` table.

## 6. Step 3 — the pseudo-algorithm pipeline

Seeds (10–20) drawn from history, weighted by:

- completion ratio ≥ 0.92, recency-decayed with roughly a 14-day half-life
- liked = strong positive, dismissed = negative
- Pulse: prefer seeds whose tags match the current hour
  (`watch_tag_time_log`, already joined in `localRecommendations`)
- diversified across channels and tags so the pool does not collapse onto one
  obsession

Expansion per seed: top ~20 from `next(videoId)`, first ~20 from the
`RD<videoId>` mix, plus three keyword queries from `buildKeywordPlan`. Dedupe.

Candidate scoring — the actual emulation:

- **co-occurrence**: a video returned by N distinct seeds is the strongest
  signal, weight `log1p(N) * large`. This is cheap collaborative filtering:
  YouTube already did the math, the intersection just reads it back.
- sum of the weights of the seeds that pointed at it
- channel affinity from `history` and `watch_time_log` (already computed in the
  `localRecommendations` SQL)
- tag affinity via inherited channel tags and `autotags.ts`
- freshness decay and a view-count sanity floor
- penalties: already in library / watched / dismissed, Shorts
  (`classifyIsShort`), live and upcoming, duration outside the usual band
  (derive the band from `watch_time_log`)
- **novelty**: penalize already-subscribed channels — the feed covers those,
  discovery should surface new ones
- exploration: keep roughly 15% random picks from lower ranks, otherwise the
  filter bubble locks in within a week

Final pass: MMR-style diversity plus a per-channel cap —
`diversifyRecommendations` already does this.

Cost per refresh: ~20 seeds × 2 calls plus 3 searches ≈ 45 requests per 15
minutes. Gate through `youtubeRateLimit`, cache aggressively, and refresh only
when the app is opened rather than on every library mutation (upstream's stated
reason for removing the feature).

## 7. Cautions

- InnerTube is unofficial. Datacenter IPs draw bot challenges; a home server is
  usually fine. Wrap every call in the existing refusal gate so a block
  degrades to local-only ranking instead of breaking the home screen.
- Importing external videos writes rows into the global `videos` and `channels`
  tables with `external = 1`. Profile scoping is handled by
  `profileOwnsCandidate` — do not bypass it, and keep child profiles excluded
  via `childLocalOnly`.
- Fork context: keep new logic in new files (`youtubeRelated.ts`,
  `discoveryExternal.ts`) and keep `plugins.ts` edits minimal. Upstream is
  actively deleting this feature, so merges will conflict.
