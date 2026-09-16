/**
 * Which build of the app this document is running.
 *
 * Substituted by vite at build time (see `define` in vite.config.ts) with the
 * same string baked into `sw.js`, so a page can ask the worker serving it
 * whether the two came from the same build — see `isStaleBuild`.
 *
 * `typeof` rather than a bare read: nothing replaces the identifier in dev or
 * under `bun test`, and referencing an undeclared global throws at import time.
 */
declare const __BUILD_ID__: string;

export const BUILD_ID: string = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";
