# YT Zero Enhance (local dev extension)

Unpacked Chrome extension with two jobs:

1. **Redirect** — a click on a YouTube video opens it in a YT Zero instance.
2. **Enhance** — on a YT Zero watch page it implements the extension side of
   [`docs/browser-extension-integration.md`](../docs/browser-extension-integration.md)
   and [`docs/browser-extension-keyboard-shortcuts.md`](../docs/browser-extension-keyboard-shortcuts.md):
   configuration discovery, the page bridge, configurable shortcuts, player
   commands and raw-frame screenshots.

Local development only: no build step, no packaging, bridge version 1.

## Load it

1. Open `chrome://extensions`, enable **Developer mode**, **Load unpacked**, pick
   this `extension/` folder.
2. Open the toolbar popup (or the options page) and set the instance URL. The
   default is `https://ytzero.davideghiotto.it`.
3. Press **Grant access to the instance**. The instance origin is user-configured,
   so it cannot be a static manifest match: granting it registers the page content
   script at runtime. Without it the redirect still works and enhancement stays off.
4. Reload open YouTube and YT Zero tabs.

YT Zero itself decides whether enhancement runs: the page publishes
`enabled: false` and the extension does nothing. When it initializes, the topbar
extension badge turns green.

## Redirect

- A plain left click on `/watch?v=`, `/shorts/`, `/live/`, `/embed/` or
  `youtu.be` opens `<instance>/watch/<videoId>`.
- A `t`/`start` offset (`90`, `90s`, `1h2m3s`) is forwarded as `?t=<seconds>`,
  which is what the watch page reads.
- Direct watch-page loads redirect too (optional). The same handler runs on
  YouTube's SPA navigations, so a click YouTube's router grabs first still lands
  on YT Zero.
- `#ytNoRedirect` links are left alone, matching the contract's escape hatch.
- Ctrl/Cmd/Shift click opens a new tab; middle and right clicks are untouched.

## Enhance

The page script runs on the instance origin, the player script runs inside the
`youtube-nocookie.com/embed/*` frame, and the service worker relays between them
inside one tab.

- **Configuration** — waits for `#ytzero-enhance-configuration`, rejects an
  unknown `format`, disables itself on a newer `version`, clamps and defaults
  every field, and re-reads the element when it changes.
- **Handshake** — installs the `context`, `player-command` and
  `screenshot-request` listeners before dispatching `ready`, and replays the last
  context to a player frame that loads late.
- **Shortcuts** — the complete effective map from `playback.keyboardShortcuts`,
  matched on physical `KeyboardEvent.code`. `null` disables an action, a
  malformed chord disables only itself, `Digit0-9` is expanded, and editable
  targets and modifier-only keydowns are ignored. Rebinding takes effect with the
  next context, with no second legacy listener anywhere.
- **Playback rate** — the extension owns the current rate and updates it
  synchronously, so `1 → 1.25 → 1.5 → 1.75 → 2` holds however fast the keys
  repeat and however stale the player's own value is. `temporaryBoost` is a short
  press to toggle playback, a 220 ms hold for 2×, and keyup restores the owned
  rate.
- **Ownership** — `previousVideo`, `nextVideo`, `toggleTheater` and `close` are
  reported to the parent and never acted on locally. Everything else is performed
  on the media element. `togglePictureInPicture` is native PiP only.
- **Content type** — `default`, `short` and `livestream` come from the page and
  are applied in place. A livestream keeps 1× and consumes rate, frame-step,
  boost and percentage seeks without claiming success; commands that cannot run
  answer with an explicit failed `command-result`. Shorts keep Up/Down navigation
  only while no enabled binding claims those chords.
- **Watch Together** — `transportLocked` blocks local play, pause, seek, rate and
  navigation from both shortcuts and commands.
- **Screenshots** — the request is claimed synchronously with `preventDefault()`,
  the frame is captured from the `<video>` element, the filename template is
  expanded and sanitized, and `saved`/`error` is reported back.

## Layout

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest, static YouTube matches, optional instance origin |
| `src/shared.js` | Settings plus URL parsing mirrored from `ui/src/youtubeUrl.ts` |
| `src/content.js` | Click interception and direct/SPA-load redirect on YouTube |
| `src/background.js` | Tab opening, frame relay, runtime registration of the page script |
| `src/options.html`, `src/options.js` | Options page and toolbar popup |
| `src/enhance/contract.js` | Configuration, context and screenshot validation; filename expansion |
| `src/enhance/matcher.js` | Exact `KeyboardEvent.code` chord matching |
| `src/enhance/controller.js` | Keydown/keyup state, owned rate, action dispatch |
| `src/enhance/bridge.js` | JSON-string `CustomEvent` transport and the relay envelope |
| `src/enhance/ytzero.js` | Page script: configuration, handshake, badge, routing |
| `src/enhance/player.js` | Embed-frame script: media element, commands, capture |

## Tests

```bash
cd extension && bun test
```

Covers configuration and context validation, chord matching and editable guards,
cumulative speed stepping under a stale player value, boost hold/release, frame
step, chapters, livestream and transport restrictions, parent-owned routing,
handshake ordering, cancelable claim behavior and command results.

## Not implemented yet

- The visual control-bar replacement for `player.replaceControls`, including the
  per-content-type layouts (`default`, `short`, `livestream`), the live edge and
  DVR timeline, and SponsorBlock markers. Context data for all of it is already
  parsed and available.
- `preferredQuality`, player `language` and `autoFullscreenLandscape`.
- Firefox packaging. The code avoids Chrome-only APIs beyond `chrome.*`, but it
  has only been exercised in Chrome.
