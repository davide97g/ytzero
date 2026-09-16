/**
 * When a deployed build may take over an open page. The service worker can
 * swap builds at any moment, but the swap reloads the page, so it waits for a
 * moment that destroys nothing.
 */
export interface MediaElementState {
  ended: boolean;
  paused: boolean;
}

/**
 * A reload tears down every media element. Audio mode in particular may be the
 * only thing the viewer is using while the app sits in the background, so any
 * running playback postpones the update.
 */
export function hasActivePlayback(elements: Iterable<MediaElementState>): boolean {
  for (const element of elements) {
    if (!element.paused && !element.ended) return true;
  }
  return false;
}

export function shouldApplyUpdate({
  editing,
  hidden,
  playing,
  waitingWorker,
}: {
  editing: boolean;
  hidden: boolean;
  playing: boolean;
  waitingWorker: boolean;
}): boolean {
  if (!waitingWorker || playing) return false;
  // Leaving the app is the one moment the swap is free: nothing is on screen to
  // reload out from under the viewer. A field that still holds focus behind a
  // backgrounded app is not being typed into, so it no longer holds the build
  // back — without this an installed app that was closed mid-search would keep
  // the new build waiting forever.
  return hidden || !editing;
}

/**
 * The worker claiming a page is not always a new build: on a first visit it is
 * the initial installation, and reloading for that would only flash the app.
 */
export function shouldReloadOnControllerChange({
  hadController,
  sawNewWorker,
}: {
  hadController: boolean;
  sawNewWorker: boolean;
}): boolean {
  return hadController || sawNewWorker;
}

/**
 * Whether the page is older than the worker serving it.
 *
 * iOS freezes an installed app the instant it leaves the screen, which is also
 * where the handover to a new build happens — so `controllerchange` is often
 * never delivered and the page comes back running bytes the worker has already
 * replaced. Asking the worker which build it was cut from catches that case
 * without depending on an event surviving the freeze.
 *
 * A worker that answers nothing usable is read as "same build": a missing
 * answer must never reload an app that is perfectly current.
 */
export function isStaleBuild(pageBuildId: string, workerBuildId: unknown): boolean {
  if (typeof workerBuildId !== "string" || workerBuildId.length === 0) return false;
  if (pageBuildId.length === 0) return false;
  return workerBuildId !== pageBuildId;
}

/**
 * How long a stale-build reload suppresses the next one.
 *
 * The reload is only correct if the fresh document really is the new build. A
 * proxy caching index.html would leave the page stale after reloading, and
 * reloading again on sight would spin forever with nothing on screen. One
 * attempt per minute turns that failure into a merely late update.
 */
export const STALE_RELOAD_COOLDOWN_MS = 60_000;

export function shouldReloadStaleBuild({
  lastAttemptAt,
  now,
}: {
  lastAttemptAt: number | null;
  now: number;
}): boolean {
  if (lastAttemptAt === null) return true;
  // A clock that moved backwards, or a value that was never a time, is not
  // evidence of a recent attempt.
  if (!Number.isFinite(lastAttemptAt) || lastAttemptAt > now) return true;
  return now - lastAttemptAt >= STALE_RELOAD_COOLDOWN_MS;
}
