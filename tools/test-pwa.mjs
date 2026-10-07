/**
 * The PWA of build/pages/ in headless Chrome: its service worker takes the
 * page over, the manifest makes it installable, and it opens with the server
 * gone. Then updates: the settings check for one — none yet, no connection,
 * a new deploy — and a new version waits beside the running one until Update
 * lets it in; the old cache goes, "Updated to …" is said once. A version that
 * turns up while the start screen shows is offered there.
 *
 * The server here plays GitHub Pages: it serves build/pages/ and, beside the
 * page, a note with its index.json, so the page opens a folder by itself
 * (read-only) and the settings are there to use. It can go "offline" — every
 * connection dropped — and deploy a "new version": sw.js with another version
 * and cache name, the bytes of a new deploy.
 *
 * Needs `npm run build` first and a local Chrome (or `CHROME=/path/to/chrome`).
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { CHROME, sleep, startChrome } from './chrome.mjs';
import { checker, root } from './load.mjs';

const PAGES = join(root, 'build', 'pages');
if (!CHROME) {
  console.log('No Chrome found — set CHROME=/path/to/chrome. Skipping the PWA tests.');
  process.exit(0);
}
if (!existsSync(join(PAGES, 'sw.js'))) {
  console.error('No build/pages/ — run `npm run build` first.');
  process.exit(1);
}

const { check, done } = checker();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const state = { offline: false, notes: true, nextVersion: null };

const server = createServer(async (req, res) => {
  if (state.offline) {
    req.socket.destroy();
    return;
  }
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/index.json' || path === '/Note.md') {
    if (!state.notes) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader('content-type', path === '/Note.md' ? 'text/markdown' : 'application/json');
    res.end(path === '/Note.md' ? '# Note\n\nServed beside the page.\n' : JSON.stringify({ name: 'Served', files: ['Note.md'] }));
    return;
  }
  const file = join(PAGES, path === '/' ? 'index.html' : path.slice(1));
  if (!file.startsWith(PAGES) || !existsSync(file)) {
    res.statusCode = 404;
    res.end();
    return;
  }
  let body = await readFile(file);
  if (path === '/sw.js' && state.nextVersion) {
    body = body
      .toString()
      .replace(/const VERSION = '[^']*'/, `const VERSION = '${state.nextVersion}'`)
      .replace(/const CACHE = '([^']*)'/, `const CACHE = '$1-${state.nextVersion}'`);
  }
  res.setHeader('content-type', TYPES[extname(file)] ?? 'application/octet-stream');
  // As Pages does: a short HTTP cache, which the worker's install goes past.
  res.setHeader('cache-control', 'max-age=600');
  res.end(body);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

const chrome = await startChrome();
try {
  const [tab] = (await chrome.targets()).filter((t) => t.type === 'page');
  const s = await chrome.attach(tab.targetId, 'pwa');
  await chrome.send('Page.enable', {}, s);
  const evaluate = (expression) => chrome.evaluate(s, expression);
  const until = (expression, timeout) => chrome.until(s, expression, timeout);
  const load = async () => {
    await evaluate(`window.__before = true`).catch(() => undefined);
    await chrome.send('Page.navigate', { url }, s);
    await until(`!window.__before && document.readyState === 'complete' && !document.getElementById('gate').classList.contains('gate--starting')`);
  };
  const workerVersion = () =>
    evaluate(`new Promise((resolve) => { const c = new MessageChannel(); c.port1.onmessage = (e) => resolve(e.data); navigator.serviceWorker.controller.postMessage('version', [c.port2]); })`);
  const versionLine = `(document.querySelector('[data-setting="update"]')?.textContent ?? '')`;
  const openSettings = async () => {
    if (!(await evaluate(`!!document.querySelector('.popover .settings')`))) await chrome.click(s, '#settings');
    await until(`!!document.querySelector('[data-setting="update"]')`);
  };
  const clickCheck = () => evaluate(`[...document.querySelectorAll('[data-setting="update"] button')].find((b) => b.textContent === 'Check for updates').click(), true`);

  await evaluate(`localStorage.setItem('markdown-catalog-editor', JSON.stringify({ language: 'en' })), true`).catch(() => undefined);
  await load();
  check('pwa: the served folder opens', await until(`!document.getElementById('app').hidden && document.querySelectorAll('#doc .block').length > 0`), true);
  check('pwa: service worker in control', await until(`navigator.serviceWorker.controller !== null`), true);
  check('pwa: manifest parsed', (await chrome.send('Page.getAppManifest', {}, s)).errors, []);
  check('pwa: installable', (await chrome.send('Page.getInstallabilityErrors', {}, s)).installabilityErrors, []);
  const running = await workerVersion();
  check('pwa: the page and its worker are one version', await evaluate(`document.getElementById('version').textContent`), running);

  state.offline = true;
  await load();
  check('pwa: offline, the page still opens', await evaluate(`!document.getElementById('gate').hidden && !!document.querySelector('#open-folder').getClientRects().length`), true);
  check('pwa: offline, its version on the start screen', await evaluate(`document.querySelector('.gate-version').textContent`), `Version ${running}`);
  state.offline = false;
  await load();

  // Updates: none yet, no connection, then a new deploy that waits for Update
  await openSettings();
  check('pwa: settings show the version and offer a check', await evaluate(versionLine), `Version ${running} · Check for updates`);
  await clickCheck();
  check('pwa: nothing new', await until(`${versionLine}.endsWith('This is the latest version.')`), true);
  state.offline = true;
  await chrome.click(s, '#settings');
  await openSettings();
  await clickCheck();
  check('pwa: no server, no check', await until(`${versionLine}.includes('No connection: could not check for updates.')`), true);
  state.offline = false;
  state.nextVersion = '9.9.9';
  await clickCheck();
  check('pwa: a new version ready', await until(`${versionLine}.includes('Version 9.9.9 is ready.')`, 15000), true);
  check('pwa: a dot on the settings', await evaluate(`document.getElementById('settings').classList.contains('icon-button--badge')`), true);
  check('pwa: the old worker still serves', await workerVersion(), running);
  // The version the app ran before, as an earlier visit would have left it.
  await evaluate(`localStorage.setItem('markdown-catalog-editor-version', 'old'), window.__before = true`);
  await evaluate(`[...document.querySelectorAll('[data-setting="update"] button')].find((b) => b.textContent === 'Update').click(), true`);
  check('pwa: update reloads the page', await until(`!window.__before && document.readyState === 'complete' && !document.getElementById('app').hidden`, 15000), true);
  check('pwa: the new worker serves', await workerVersion(), '9.9.9');
  check('pwa: the old cache gone', (await evaluate(`caches.keys()`)).length, 1);
  check('pwa: "updated" said once', await until(`document.querySelector('.toast--shown')?.textContent === ${JSON.stringify(`Updated to version ${running}.`)}`), true);
  check('pwa: and remembered', await evaluate(`localStorage.getItem('markdown-catalog-editor-version')`), running);
  state.offline = true;
  await load();
  check('pwa: offline after the update', await evaluate(`!document.getElementById('gate').hidden`), true);
  check('pwa: no "updated" the second time', await evaluate(`document.querySelector('.toast--shown')?.textContent ?? ''`), '');

  // A note opened from the Finder or Explorer with the installed app
  state.offline = false;
  state.nextVersion = null;
  const manifest = JSON.parse(await readFile(join(PAGES, 'manifest.webmanifest'), 'utf8'));
  check('pwa: the manifest takes .md files, into the open window', [manifest.file_handlers?.[0]?.accept?.['text/markdown']?.includes('.md'), manifest.launch_handler], [
    true,
    { client_mode: 'focus-existing' },
  ]);
  // Headless Chrome hands no file to an app: a stand-in launchQueue gives the page a real handle, from its private file system.
  await chrome.send(
    'Page.addScriptToEvaluateOnNewDocument',
    { source: `Object.defineProperty(window, 'launchQueue', { configurable: true, value: { setConsumer(consumer) { window.__launch = consumer; } } });` },
    s,
  );
  await load();
  check('pwa: the page takes launched files once it has started', await until(`typeof window.__launch === 'function'`), true);
  const launch = (name, text) =>
    evaluate(`(async () => {
      const handle = await (await navigator.storage.getDirectory()).getFileHandle(${JSON.stringify(name)}, { create: true });
      const stream = await handle.createWritable();
      await stream.write(${JSON.stringify(text)});
      await stream.close();
      window.__launch({ files: [handle] });
      return true;
    })()`);
  // Asked again while a save still holds the file: the private file system refuses to read it then.
  const fileText = async (name) => {
    for (let i = 0; i < 50; i += 1) {
      const text = await evaluate(`navigator.storage.getDirectory().then((d) => d.getFileHandle(${JSON.stringify(name)})).then((h) => h.getFile()).then((f) => f.text()).catch(() => null)`);
      if (text !== null) return text;
      await sleep(100);
    }
    return null;
  };
  await launch('Launched.md', '# Launched\n\nFrom the Finder.\n');
  check('pwa: a launched note opens on its own', await until(`document.getElementById('status-path').textContent === 'Launched.md' && document.getElementById('vault-label').textContent === 'Launched.md'`), true);
  check('pwa: alone in the tree', await evaluate(`[...document.querySelectorAll('#tree [data-path]')].map((n) => n.dataset.path)`), ['Launched.md']);
  check('pwa: and writable in place', await evaluate(`document.getElementById('status-state').textContent`), 'saved');
  await evaluate(`document.querySelector('[data-mode="edit"]').click(), true`);
  await chrome.click(s, '#doc .block:last-child');
  await until(`document.activeElement?.tagName === 'TEXTAREA'`);
  await evaluate(`(() => { const area = document.activeElement; area.setSelectionRange(area.value.length, area.value.length); return true; })()`);
  await chrome.send('Input.insertText', { text: ' Edited.' }, s);
  let saved = null;
  // Autosaved a second after the edit.
  for (let i = 0; i < 50 && saved !== '# Launched\n\nFrom the Finder. Edited.\n'; i += 1) {
    await sleep(100);
    saved = await fileText('Launched.md');
  }
  check('pwa: an edit is saved into the file itself', saved, '# Launched\n\nFrom the Finder. Edited.\n');
  check('pwa: no folder around it: no new note', await evaluate(`document.getElementById('new-note').click(), new Promise((r) => setTimeout(() => r(document.querySelector('.toast--shown')?.textContent), 100))`), 'A note opened on its own has no folder around it');
  await launch('Other.md', 'Another note.\n');
  check('pwa: another note takes its place', await until(`document.getElementById('status-path').textContent === 'Other.md'`), true);

  // A deploy found while the start screen shows is offered on it
  state.offline = false;
  state.notes = false;
  state.nextVersion = '9.9.8';
  await load();
  await evaluate(`navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => true, () => true)`);
  check('pwa: on the start screen', await until(`document.getElementById('gate-update').textContent === 'Version 9.9.8 is ready. Update'`, 15000), true);
  await sleep(100);
  check('no errors in the page', chrome.errors.filter((error) => !/Failed to fetch|ERR_|update\(\)/.test(error)), []);
} finally {
  await chrome.close();
  server.close();
}

done('pwa');
