# Chrome Web Store assets

Not part of the extension. Exclude this folder when packaging:

```bash
cd extension && zip -r ../yt-zero-enhance.zip . -x "store/*" "test/*" "*.DS_Store"
```

## Screenshots (1280×800, the size the listing expects)

| File | What it shows |
| --- | --- |
| `01-options.png` | The real options page, light scheme, configured with an example instance |
| `04-options-dark.png` | The same page in dark scheme, after instance access was granted |
| `02-redirect.png` | What the redirect does, drawn from `sources/02-redirect.html` |
| `03-enhance.png` | What the player enhancement adds, drawn from `sources/03-enhance.html` |

`01` and `04` are captures of the extension itself. `02` and `03` are explainer
graphics; regenerate them by opening the files in `sources/` at 1280×800.

## Listing copy

**Name:** YT Zero Enhance

**Short description** (132 characters max):

> Open YouTube videos on your own YT Zero instance, and drive its embedded player with the shortcuts you configured there.

**Description:**

> YT Zero Enhance connects your browser to a YT Zero instance you host yourself.
>
> Click a video anywhere on YouTube and it opens on your instance instead, carrying the timestamp with it. Watch pages you open directly can follow the same rule, and links that deliberately point back to YouTube are always left alone.
>
> On your instance, the extension implements the player integration YT Zero already expects: the keyboard shortcuts from your profile applied inside the embedded player, raw-frame screenshots named with your filename template, native picture-in-picture, caption toggling and sizing, frame stepping, chapter jumps, and correct behaviour for livestreams, Shorts and watch-party sessions.
>
> The extension ships with no instance configured and does nothing until you enter yours. It has no server of its own, no account, and no tracking: the only thing it stores is the instance URL you type and three redirect preferences.
>
> YT Zero is open source. This extension lives in the same repository.

**Category:** Productivity

**Privacy policy URL:**
https://github.com/davide97g/ytzero/blob/main/extension/PRIVACY.md

**Single purpose:**

> Route YouTube videos to the user's own YT Zero instance and enhance the player on that instance.

**Permission justifications:**

- `storage` — stores the instance URL and the three redirect preferences. Nothing else is kept.
- `scripting` — registers the instance content script at runtime, because the instance address is only known once the user types it.
- `https://www.youtube.com/*`, `https://m.youtube.com/*` — recognizing a clicked video link and redirecting that tab.
- `https://www.youtube-nocookie.com/*` — the embedded player frame the enhancement controls.
- Optional host permissions — requested from the options page for the one instance origin the user enters; declining leaves the redirect working and the enhancement off.

**Data usage disclosures:** no data collected, no data sold, no data transferred for purposes unrelated to the single purpose.
