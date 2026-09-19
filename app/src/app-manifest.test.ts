import { describe, expect, test } from "bun:test";
import { createAppManifest } from "./app-manifest";

describe("createAppManifest", () => {
  test("uses the configured app name for PWA name fields", () => {
    const manifest = createAppManifest("My Videos");

    expect(manifest.name).toBe("My Videos");
    expect(manifest.short_name).toBe("My Videos");
  });

  test("keeps a fixed id whatever the configured name is", () => {
    // The identity an installed app is tied to. Renaming the app must not move
    // it: iOS would see a new web app and orphan the icon on a home screen.
    expect(createAppManifest("My Videos").id).toBe("/yt-zero");
    expect(createAppManifest(null).id).toBe("/yt-zero");
  });

  test("trims the configured name and falls back for an empty value", () => {
    expect(createAppManifest("  My Videos  ").name).toBe("My Videos");
    expect(createAppManifest("   ").name).toBe("YT Zero");
    expect(createAppManifest(null).name).toBe("YT Zero");
  });
});
