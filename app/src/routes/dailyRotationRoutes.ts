import type { Context, Hono } from "hono";
import { rotationSuggestions, rotationTagOptions } from "../dailyRotationTags";

type ApiEnvironment = { Variables: { userId: number; sessionAdmin?: boolean; profileAdmin?: boolean } };
type Api = Hono<ApiEnvironment>;
type ApiContext = Context<ApiEnvironment>;

export function registerDailyRotationRoutes(api: Api, currentUserId: (context: ApiContext) => number): void {
// ---------- daily rotation ----------

// Read-only: the selectable tags plus what Pulse would pick for each daypart.
// The rotation itself is an ordinary profile setting and travels through
// PUT /settings, so this endpoint never writes.
api.get("/daily-rotation/suggestions", async (c) => {
  const uid = currentUserId(c);
  const [tags, suggestions] = await Promise.all([rotationTagOptions(uid), rotationSuggestions(uid)]);
  return c.json({ tags, suggestions });
});
}
