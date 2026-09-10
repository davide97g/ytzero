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
  playing,
  waitingWorker,
}: {
  editing: boolean;
  playing: boolean;
  waitingWorker: boolean;
}): boolean {
  return waitingWorker && !playing && !editing;
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
