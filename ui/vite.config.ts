import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Identity of one build. An open installed app only picks up a deployment when
 * the service worker script changes, so this value has to differ per build.
 * The pipeline and the Docker build both pass the release labels; anything else
 * (a local `bun run build`, a tarball install) falls back to the build time,
 * which is always new.
 */
function resolveBuildId(): string {
  const labels = [process.env.YTZERO_VERSION, process.env.YTZERO_COMMIT]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value) && value !== "dev" && value !== "unknown");
  return labels.length > 0 ? labels.join("-") : `build-${Date.now()}`;
}

/** Emits `sw.js` from `sw.template.js` with the build id substituted. */
function serviceWorker(buildId: string): Plugin {
  return {
    name: "ytzero:service-worker",
    apply: "build",
    generateBundle() {
      const template = readFileSync(new URL("./sw.template.js", import.meta.url), "utf8");
      this.emitFile({ type: "asset", fileName: "sw.js", source: template.replaceAll("__BUILD_ID__", buildId) });
    },
  };
}

const BUILD_ID = resolveBuildId();

export default defineConfig({
  // The page and the worker are compared at runtime to catch a handover whose
  // `controllerchange` never arrived (see ui/src/pwaUpdates.ts), so both have to
  // carry the same string.
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), serviceWorker(BUILD_ID)],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react";
          if (id.includes("node_modules/lucide-react")) return "lucide";
          if (id.endsWith("/src/pages/useSettingsPageController.tsx")) return "settings-controller";
          if (id.endsWith("/src/components/settings/SettingsDisplayView.tsx")) return "settings-display";
          if (id.endsWith("/src/components/settings/SettingsEditors.tsx")) return "settings-editors";
          if (id.endsWith("/src/components/settings/ProfileSettings.tsx")) return "settings-profiles";
          if (id.endsWith("/src/pages/useWatchPageController.tsx")) return "watch-controller";
          if (id.includes("/src/components/watch/") || id.endsWith("/src/components/LocalPlayer.tsx") || id.endsWith("/src/components/useVideoHlsSource.ts")) return "watch-player";
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      // Keep the public page on the Vite/UI origin during development while
      // forwarding only its token-scoped data and media resources to the API.
      "^/share/[^/]+/(data|thumbnail|avatar|subtitles|media)(?:[/?]|$)": "http://localhost:3001",
      "/favicon.svg": "http://localhost:3001",
      "/icon-maskable.svg": "http://localhost:3001",
      "/apple-touch-icon.png": "http://localhost:3001",
      "/icon-192.png": "http://localhost:3001",
      "/icon-512.png": "http://localhost:3001",
    },
  },
});
