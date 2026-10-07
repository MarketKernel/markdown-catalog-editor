/**
 * Updates of the installed app (the PWA of build/pages/). Its service worker
 * (src/pwa/sw.js) installs a new deploy beside the running one and waits; this
 * finds such a worker, asks it its version, and tells it to take over when the
 * user presses Update.
 *
 * The same code runs in the single file and the extension's side panel, where it
 * does nothing: only the PWA's page carries <meta name="service-worker">, put in
 * by build.mjs. The extension's pages have a worker of their own, so having one
 * is not the sign.
 */

export type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest' }
  | { kind: 'offline' }
  /** version is null when the waiting worker does not say. */
  | { kind: 'ready'; version: string | null };

const script = document.querySelector<HTMLMetaElement>('meta[name="service-worker"]')?.content;

const updatesHere = !!script && 'serviceWorker' in navigator;

let registration: ServiceWorkerRegistration | null = null;
let state: UpdateState = { kind: 'idle' };
let listener: (state: UpdateState) => void = () => undefined;
let applying = false;
// The browser looked when the app was launched; a window left open for days hears of nothing new after that.
let lastCheck = Date.now();
const QUIET_CHECK_EVERY = 6 * 60 * 60 * 1000;
/** The version the app ran last time; not a secret. */
const LAST_VERSION = 'markdown-catalog-editor-version';

export const updateState = (): UpdateState => state;

/** This page is the PWA and its worker registered: it can be updated. */
export const canUpdate = (): boolean => registration !== null;

function setState(next: UpdateState): void {
  state = next;
  listener(state);
}

/** Registers the worker after the page has loaded; onChange hears of every change of the state. */
export function startUpdates(onChange: (state: UpdateState) => void): void {
  if (!updatesHere || !script) return;
  listener = onChange;
  const start = async (): Promise<void> => {
    try {
      registration = await navigator.serviceWorker.register(script);
    } catch {
      return;
    }
    // A worker that finished installing in an earlier session is waiting already; the
    // browser's own check at launch may have started one before the page loaded.
    const early = registration.waiting ?? registration.installing;
    if (early && registration.active) void installed(early).then((ok) => (ok ? found(early) : undefined));
    registration.addEventListener('updatefound', () => {
      const worker = registration?.installing;
      // The very first install is no update: there is no active worker yet.
      if (worker && registration?.active) void installed(worker).then((ok) => (ok ? found(worker) : undefined));
    });
  };
  if (document.readyState === 'complete') void start();
  else addEventListener('load', () => void start(), { once: true });
  // Another window of the app may let the new worker in: this one stays the old page, so the
  // update still shows as ready, and pressing it just reloads.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applying) location.reload();
  });
  document.addEventListener('visibilitychange', quietCheck);
  addEventListener('online', quietCheck);
  window.setInterval(quietCheck, 60 * 60 * 1000);
}

/** Asks the server again now and then, saying nothing unless a new version turns up. */
function quietCheck(): void {
  if (!registration || !navigator.onLine || state.kind === 'checking' || state.kind === 'ready') return;
  if (Date.now() - lastCheck < QUIET_CHECK_EVERY) return;
  lastCheck = Date.now();
  // updatefound tells of a new worker; a failure is tried again on the next tick or when the connection is back.
  registration.update().catch(() => (lastCheck = 0));
}

/** True once, on the first start of a version other than the one that ran before. */
export function justUpdated(): boolean {
  if (!updatesHere) return false;
  try {
    const before = localStorage.getItem(LAST_VERSION);
    localStorage.setItem(LAST_VERSION, __APP_VERSION__);
    return before !== null && before !== __APP_VERSION__;
  } catch {
    return false;
  }
}

/** Asks the server for a new version; the state ends as latest, offline or ready. */
export async function checkForUpdate(): Promise<void> {
  if (!registration || state.kind === 'checking' || state.kind === 'ready') return;
  setState({ kind: 'checking' });
  lastCheck = Date.now();
  try {
    await registration.update();
  } catch {
    setState({ kind: 'offline' });
    return;
  }
  const worker = registration.installing ?? registration.waiting;
  if (worker && registration.active && (await installed(worker))) await found(worker);
  else setState({ kind: 'latest' });
}

/**
 * Lets the waiting worker in and reloads the page, which comes up in the new
 * version. The caller saves the open note first.
 */
export function applyUpdate(): void {
  const waiting = registration?.waiting;
  if (!waiting) {
    location.reload();
    return;
  }
  applying = true;
  waiting.postMessage('activate');
  // controllerchange reloads; should it not come, the reload still does, and the worker is let in once the window is closed.
  window.setTimeout(() => location.reload(), 5000);
}

/** Resolves when the worker has installed: true, or failed to: false. */
function installed(worker: ServiceWorker): Promise<boolean> {
  return new Promise((resolve) => {
    const settle = (): boolean => {
      if (worker.state === 'installing') return false;
      resolve(worker.state !== 'redundant');
      return true;
    };
    if (settle()) return;
    worker.addEventListener('statechange', function wait() {
      if (settle()) worker.removeEventListener('statechange', wait);
    });
  });
}

async function found(worker: ServiceWorker): Promise<void> {
  setState({ kind: 'ready', version: await versionOf(worker) });
}

/** The waiting worker's version; null if it does not answer, as one from before this file would not. */
function versionOf(worker: ServiceWorker): Promise<string | null> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(null), 2000);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      resolve(typeof event.data === 'string' ? event.data : null);
    };
    worker.postMessage('version', [channel.port2]);
  });
}
