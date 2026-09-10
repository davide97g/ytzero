# Installed app updates

YT Zero registers a service worker so the UI can be installed as an app. The
worker keeps no offline cache: it exists to make the app installable and to
move pages that are already open onto a newly deployed build.

## How a deployment reaches an open app

`ui/vite.config.ts` emits `sw.js` from `ui/sw.template.js` with a build id
substituted. The id is the release version and commit when the pipeline or the
Docker build provides them (`YTZERO_VERSION`, `YTZERO_COMMIT`), and the build
time otherwise, so every build produces a different worker script. A browser
only reports an update when those bytes change, which is what makes this
substitution load-bearing.

`ui/src/pwaUpdates.ts` owns the policy:

- The page asks the server for a new worker every 60 seconds, when the app
  becomes visible or hidden, and when the connection comes back. Browsers only
  check on navigation on their own, and an installed app can stay open for
  days.
- A new worker installs and then waits. The page hands the app over to it by
  sending `SKIP_WAITING`, the worker claims the page, and `controllerchange`
  reloads onto the new build. There is no prompt.
- The hand-over waits for a moment that destroys nothing: no `<audio>` or
  `<video>` element playing (audio mode keeps playing in the background, and a
  reload would end it) and no input, textarea, select, or editable element
  focused. The next tick retries, so the update lands as soon as playback stops
  or the field is left.
- The worker that claims a page on a first visit is the initial installation,
  not a new build, and never triggers a reload.

The server sends `index.html` and `sw.js` with `no-store`, because both
filenames survive a deployment and a cached copy would hide the build it is
supposed to announce. Hashed files under `/assets/` are immutable and cached
for a year.

## Development

The worker is only emitted by a production build. In `bun run dev` the update
runtime unregisters any leftover worker instead of registering one, so a dev
server is never served by a stale installed build.
