/**
 * Service worker of the GitHub Pages build (build/pages/): keeps the editor
 * working offline once it has been opened.
 *
 * build.mjs writes the version and a hash of the page into CACHE, so every
 * deploy changes this file's bytes and the browser installs the new worker. It
 * does not take over on its own: it waits, with the new page in its own cache,
 * while the old one keeps serving the old page. The page's Update button
 * (update.ts) tells it to go ahead; otherwise the browser lets it in once every
 * window of the app is closed, and the next launch is the new version.
 */
const CACHE = 'macaed-__CACHE__';
const VERSION = '__VERSION__';
const SHELL = ['./', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  // Past the HTTP cache: a page Pages served a few minutes ago may be the previous deploy's.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('macaed-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// The page asks a waiting worker which version it brings, and tells it to take over —
// the app's own windows only, not any page that happens to share the origin.
self.addEventListener('message', (event) => {
  if (!(event.source instanceof WindowClient) || !event.source.url.startsWith(self.registration.scope)) return;
  if (event.data === 'version') event.ports[0]?.postMessage(VERSION);
  else if (event.data === 'activate') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  // From this worker's own cache only: a waiting worker's, with the next version, is there too.
  const cached = (key, options) => caches.open(CACHE).then((cache) => cache.match(key, options));
  // Any navigation inside the scope is the editor itself.
  if (request.mode === 'navigate') {
    event.respondWith(cached('./').then((page) => page ?? fetch(request)));
    return;
  }
  // The shell from the cache; everything else (index.json, notes beside a served page) goes
  // to the network as is.
  event.respondWith(cached(request, { ignoreSearch: true }).then((file) => file ?? fetch(request)));
});
