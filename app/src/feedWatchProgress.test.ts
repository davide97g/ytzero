import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { runIsolatedTestFile } from "../tests/isolatedTestFile";

const ISOLATION_FLAG = "YTZERO_FEED_WATCH_PROGRESS_TEST_ISOLATED";
if (process.env[ISOLATION_FLAG] !== "1") {
  test("Feed watch-progress suite runs in an isolated application runtime", async () => {
    await runIsolatedTestFile("src/feedWatchProgress.test.ts", ISOLATION_FLAG);
  });
} else {
  const root = mkdtempSync(resolve(tmpdir(), "ytzero-feed-watch-progress-"));
  process.env.DB_PATH = resolve(root, "db.sqlite");

  const { db, setUserSetting } = await import("./db");
  const { feedVisibilityWhere } = await import("./feedQuery");

  db.prepare("INSERT INTO channels(channel_id,title,url) VALUES('UCsub','Subscribed','')").run();
  db.prepare("INSERT INTO user_channels(user_id,channel_id,followed) VALUES(1,'UCsub',1)").run();
  db.prepare(`INSERT INTO videos(video_id,channel_id,title,is_short,published_at,is_unavailable) VALUES
    ('fresh','UCsub','Never opened',0,'2026-08-04',0),
    ('glanced','UCsub','Two seconds in',0,'2026-08-03',0),
    ('half','UCsub','Half watched',0,'2026-08-02',0),
    ('most','UCsub','Four fifths in',0,'2026-08-01',0),
    ('nearly','UCsub','Almost finished',0,'2026-07-31',0)`).run();
  db.prepare(`INSERT INTO user_videos(user_id,video_id,status,watch_position,watch_duration) VALUES
    (1,'glanced','inbox',2,1000),
    (1,'half','inbox',500,1000),
    (1,'most','inbox',800,1000),
    (1,'nearly','inbox',960,1000)`).run();

  function feedIds(opts: { includeHidden?: boolean } = {}): string[] {
    const { where, params } = feedVisibilityWhere({}, 1, opts);
    return db.prepare(`SELECT v.video_id FROM videos v
      LEFT JOIN user_videos uv ON uv.video_id=v.video_id AND uv.user_id=1
      WHERE ${where.join(" AND ")} ORDER BY v.published_at DESC`)
      .all(...params).map((row: any) => row.video_id);
  }

  afterAll(() => {
    db.close();
    rmSync(root, { recursive: true, force: true });
  });

  describe("main feed watch progress", () => {
    test("skips videos watched past the default completion ratio", () => {
      expect(feedIds()).toEqual(["fresh", "glanced", "half", "most"]);
    });

    test("cleanup's hidden sweep still reaches them", () => {
      expect(feedIds({ includeHidden: true })).toContain("nearly");
    });

    test("follows the profile's own completion ratio", async () => {
      await setUserSetting(1, "feed_complete_ratio", "0.75");
      expect(feedIds()).toEqual(["fresh", "glanced", "half"]);
      await setUserSetting(1, "feed_complete_ratio", "1");
      expect(feedIds()).toEqual(["fresh", "glanced", "half", "most", "nearly"]);
      await setUserSetting(1, "feed_complete_ratio", "0.92");
    });

    test("a profile can raise what counts as a real resume point", async () => {
      await setUserSetting(1, "feed_progress_min_duration", "2000");
      // Nothing is long enough to hold a resume point anymore, so no video
      // reads as seen.
      expect(feedIds()).toEqual(["fresh", "glanced", "half", "most", "nearly"]);
      await setUserSetting(1, "feed_progress_min_duration", "30");
    });
  });
}
