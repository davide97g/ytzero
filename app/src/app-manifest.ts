const DEFAULT_APP_NAME = "YT Zero";

export function createAppManifest(configuredName: string | null | undefined) {
  const name = configuredName?.trim() || DEFAULT_APP_NAME;

  return {
    // A fixed identity, never the configured name and never `/`, which is what
    // `start_url` already resolves to and so says nothing that can be told
    // apart. iOS scopes a home-screen web app's identity to the registrable
    // domain rather than the origin, so `ytzero.example.com` and another web
    // app under the same domain are one app to it, and a home-screen icon can
    // launch the wrong one. Apple documents `id` for "multiple parts of your
    // website that should be treated as distinct web apps under the same
    // domain"; it does not fix which app the lock screen's Now Playing widget
    // opens, which is not ours to decide.
    //
    // It is an identity, not a route: nothing navigates to it and it does not
    // have to resolve to anything. Moving it orphans every install — iOS sees a
    // new app and the icon already on a home screen stops being this one — so
    // it stays as it is.
    id: "/yt-zero",
    name,
    short_name: name,
    description: "Self-hosted YouTube subscriptions reader",
    theme_color: "#0f0f0f",
    background_color: "#0f0f0f",
    display: "standalone",
    orientation: "any",
    start_url: "/",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
