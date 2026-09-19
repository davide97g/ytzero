# Privacy policy — YT Zero Enhance

**Effective date:** 19 September 2026
**Extension:** YT Zero Enhance (Chrome extension)
**Source code:** https://github.com/davide97g/ytzero/tree/main/extension

## Summary

The extension collects nothing, sends nothing to its developer, and has no
server of its own. It stores the address of the YT Zero instance you choose,
plus three on/off preferences, and it talks only to YouTube pages you open and
to the instance you configured.

## What is stored

| Data | Where | Why |
| --- | --- | --- |
| The YT Zero instance URL you type | `chrome.storage.sync` | Nothing works without it: it is the destination of every redirect and the page the enhancement runs on |
| "Redirect YouTube videos", "Also redirect watch pages opened directly", "Always open in a new tab" | `chrome.storage.sync` | Your redirect preferences |

`chrome.storage.sync` is Chrome's own storage. If you are signed into Chrome
with sync enabled, Google copies those values between your own Chrome profiles,
exactly as it does for your bookmarks. They are never sent anywhere else. If you
prefer they stay on one device, turn off extension sync in Chrome's settings.

Nothing else is stored. There is no account, no identifier, no history, no
watched-video list, and no analytics.

## What is not collected

- No browsing history, no list of videos you open, no search terms.
- No personal information, credentials, cookies or page content.
- No telemetry, crash reporting, advertising or fingerprinting.
- No data is sold, shared or transferred to anyone, for any purpose.

## What the extension does on the pages it runs on

- **On YouTube pages** it reads the link you clicked so it can recognize a video
  address, and it then navigates that tab to your instance. The link is used at
  that moment and never stored or transmitted anywhere else.
- **On your YT Zero instance** it reads a configuration element the instance
  itself publishes, and exchanges playback events with the embedded player, so
  keyboard shortcuts, captions and screenshots work. All of it stays inside your
  browser, between two frames of the same tab.
- **Screenshots** you take are encoded in the page and handed to Chrome's normal
  download flow. The image never leaves your machine.

The extension makes no network requests of its own. It never contacts a server
belonging to the developer, because none exists.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `storage` | Keeps the instance URL and the three preferences described above |
| `scripting` | Registers the instance content script at runtime, because your instance address is only known after you type it |
| `https://www.youtube.com/*`, `https://m.youtube.com/*` | Recognizing a clicked video link and redirecting it |
| `https://www.youtube-nocookie.com/*` | The embedded player frame that the enhancement controls |
| Optional origin for your instance | Requested from the options page, only for the one address you enter. Denying it leaves the redirect working and the enhancement off |

## Your data, your control

Everything the extension holds is visible and editable in its options page.
Clearing the instance URL makes the extension inert. Removing the extension
deletes its stored values with it; Chrome also drops the synced copy.

## Children

The extension is a utility for self-hosted software. It is not directed at
children and collects no information from anyone, of any age.

## Changes

If this policy ever changes, the new version replaces this file in the public
repository and the effective date above is updated.

## Contact

Questions or concerns: open an issue at
https://github.com/davide97g/ytzero/issues
