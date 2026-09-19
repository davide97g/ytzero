import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = mkdtempSync(resolve(tmpdir(), "ytzero-discovery-external-test-"));
let result: Record<string, any> = {};

beforeAll(async () => {
  const process = Bun.spawn(["bun", "app/tests/discoveryExternalHarness.ts"], {
    cwd: resolve(import.meta.dir, "../.."),
    env: {
      ...Bun.env,
      DB_PATH: resolve(root, "db", "source.db"),
      AVATAR_DIR: resolve(root, "avatars"),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) throw new Error(`Discovery external harness failed:\n${stderr}\n${stdout}`);
  const line = stdout.split("\n").find((entry) => entry.startsWith("RESULT "));
  if (!line) throw new Error(`Discovery external harness returned no result:\n${stdout}`);
  result = JSON.parse(line.slice("RESULT ".length));
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("looking outside the subscriptions", () => {
  test("stays switched off until the profile asks for it", () => {
    expect(result.defaultStatus).toBe(200);
    expect(result.defaultExternalEnabled).toBe(false);
    expect(result.callsWhileDisabled).toBe(0);
    expect(result.rowsWhileDisabled).toBe(0);
    expect(result.defaultIds).toContain("local-fresh");
  });

  test("brings back videos from channels the profile does not follow", () => {
    expect(result.enabledStatus).toBe(200);
    expect(result.enabledExternalEnabled).toBe(true);
    expect(result.enabledIds).toContain("out-common");
    expect(result.enabledIds).toContain("out-single");
  });

  test("a video several watched videos point at outranks one only a single video points at", () => {
    expect(result.commonRank).toBeGreaterThanOrEqual(0);
    expect(result.singleRank).toBeGreaterThanOrEqual(0);
    expect(result.commonRank).toBeLessThan(result.singleRank);
  });

  test("imports stay marked as temporary, regular and approximately dated", () => {
    expect(result.importedRows.length).toBeGreaterThan(0);
    for (const row of result.importedRows) {
      expect(row.external).toBe(1);
      expect(row.is_short).toBe(0);
      expect(row.published_at_approximate).toBe(1);
      expect(row.duration).toBeTruthy();
    }
  });

  test("a card too short to be a regular video never reaches the library", () => {
    expect(result.shortImported).toBe(false);
    expect(result.importedRows.some((row: any) => row.video_id === "out-short")).toBe(false);
  });

  test("a second pass is answered from cache", () => {
    expect(result.requestsFirstCycle).toBeGreaterThan(0);
    expect(result.requestsSecondCycle).toBe(0);
  });

  test("a profile restricted to local content never leaves the building", () => {
    expect(result.childStatus).toBe(200);
    expect(result.childCausedRequests).toBe(0);
    expect(result.childIds).not.toContain("out-common");
    expect(result.childIds).not.toContain("out-single");
  });

  test("dismissing one is remembered and takes it off the list", () => {
    expect(result.dismissStatus).toBe(200);
    expect(result.feedbackRows).toEqual([{ video_id: "out-common", action: "dismiss" }]);
    expect(result.afterDismissIds).not.toContain("out-common");
  });

  test("a refused address falls back to the local library instead of failing", () => {
    expect(result.challengeStatus).toBe(200);
    expect(result.challengeIds).toContain("local-fresh");
  });
});
