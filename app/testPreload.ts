import { beforeEach } from "bun:test";
import { youtubeRefusalGate } from "./src/youtubeRateLimit";

// The refusal gate is a module singleton shared by every test in the process.
// Tests that exercise a refusal used to leave it armed, so whichever YouTube
// test ran next threw YouTubeRefusalError instead of fetching — invisible in
// the default file order, a failure under `bun test --randomize`.
beforeEach(() => {
  youtubeRefusalGate.reset();
});
