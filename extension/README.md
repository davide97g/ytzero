# YT Zero Redirect (local dev extension)

Unpacked Chrome extension that sends YouTube video clicks to a YT Zero instance
instead of YouTube. Local development only: it is not packed or published.

## Load it

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** and pick this `extension/` folder.
4. Open the extension's options (or its toolbar popup) and set the instance URL.
   The default is `https://ytzero.davideghiotto.it`.

Reload already-open YouTube tabs after changing settings.

## What it does

- A plain left click on any YouTube video link (`/watch?v=`, `/shorts/`,
  `/live/`, `/embed/`, `youtu.be`) opens `<instance>/watch/<videoId>` instead.
- A `t`/`start` offset (`90`, `90s`, `1h2m3s`) is forwarded as `?t=<seconds>`,
  which is what YT Zero's watch page reads.
- Directly opening a YouTube watch page (typed, bookmarked, external app) is
  redirected too, when that option is on. The same handler runs on YouTube's SPA
  navigations, so a click YouTube's own router grabs first still lands on YT Zero.
- Links carrying the `#ytNoRedirect` fragment are left alone. YT Zero adds that
  marker to links that intentionally point back to YouTube — see
  `docs/browser-extension-integration.md`.

## Layout

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest; content script on YouTube, classic service worker |
| `src/shared.js` | Settings defaults plus the URL parsing mirrored from `ui/src/youtubeUrl.ts` |
| `src/content.js` | Click interception and direct/SPA-load redirect |
| `src/background.js` | Opens the tab, accepting only URLs on the configured instance |
| `src/options.html`, `src/options.js` | Options page, also used as the toolbar popup |

## Notes

- No `tabs` permission is needed: the worker acts on `sender.tab` or creates a
  new tab.
- Nothing is fetched from the instance, so no host permission for it is required.
- Redirecting is done by navigating, so YouTube never loads the player.
