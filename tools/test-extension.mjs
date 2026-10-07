/**
 * Drives "Send to Markdown", the Chrome extension of build/extension/, in
 * headless Chrome. The side panel opens a folder of notes; the toolbar button
 * sends a page before any folder is open, and it waits for one; then the page
 * becomes a note of its own, a selection, a link and an image go to the end of
 * the open note, a page with the same name gets a number, a site the
 * extension may not read goes as a link, and the panel's language reaches the
 * worker for its menus.
 *
 * Chrome loads the extension through the DevTools protocol over a pipe
 * (tools/chrome.mjs). Neither the toolbar button nor the context menu can be
 * clicked from DevTools, so the test fires the worker's onClicked itself, as
 * Chrome would report the click. With no click, Chrome grants no activeTab:
 * the copy of the extension under test may reach the test's own sites, *.test,
 * as host permissions instead; and opening the side panel without a click
 * fails, so the worker's calls are recorded instead, and the panel is opened by
 * a "click" in the extension's own page. The folder is in the extension's
 * origin-private file system, where the folder picker is made to find it.
 *
 * Needs `npm run build` first and a local Chrome (or `CHROME=/path/to/chrome`).
 * `--shots DIR` also saves screenshots of the side panel into DIR.
 */
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CHROME, sleep, startChrome } from './chrome.mjs';
import { checker, root } from './load.mjs';

const BUILT = join(root, 'build', 'extension');
const shotsAt = process.argv.indexOf('--shots');
const SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;
if (!CHROME) {
  console.log('No Chrome found — set CHROME=/path/to/chrome. Skipping the extension tests.');
  process.exit(0);
}
if (!existsSync(join(BUILT, 'manifest.json'))) {
  console.error('No build/extension/ — run `npm run build` first.');
  process.exit(1);
}

const { check, done } = checker();

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body>${body}</body></html>`;
const SITES = {
  'article.test': page(
    'The article',
    `<nav><a href="/">Home</a> <a href="/about">About</a></nav>
     <article>
       <h1>The article</h1>
       <p id="first">First paragraph, with <a href="/about">a link</a>, long enough to be the text of the page and not a menu around it.</p>
       <p><img src="/pic.png" alt="A picture"></p>
       <p>Second paragraph, also long enough to count for something when the extension looks for the article.</p>
     </article>
     <footer>Copyright</footer>`,
  ),
  'outside.example': page('Elsewhere', '<p>A site the extension is not allowed to read.</p>'),
};
const server = createServer((req, res) => {
  const host = (req.headers.host ?? '').replace(/:\d+$/, '');
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(SITES[host] ?? page('?', ''));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const site = (host, path = '/') => `http://${host}:${port}${path}`;

// The extension under test: the build, allowed onto *.test, with a page of its own.
const work = await mkdtemp(join(tmpdir(), 'macaed-extension-'));
const extensionDir = join(work, 'extension');
await cp(BUILT, extensionDir, { recursive: true });
const manifest = JSON.parse(await readFile(join(extensionDir, 'manifest.json'), 'utf8'));
check('manifest: the version of package.json', manifest.version, JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version);
check('manifest: no standing access to sites', [manifest.host_permissions, manifest.optional_host_permissions, manifest.content_scripts], [undefined, undefined, undefined]);
manifest.host_permissions = ['http://*.test/*'];
await writeFile(join(extensionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(join(extensionDir, 'test.html'), '<!doctype html><meta charset="utf-8"><title>test</title>');

const chrome = await startChrome([
  '--host-resolver-rules=MAP *.test 127.0.0.1, MAP *.example 127.0.0.1',
  '--disable-features=HttpsUpgrades,HttpsFirstBalancedModeAutoEnable',
]);
try {
  const loaded = await chrome.send('Extensions.loadUnpacked', { path: extensionDir }).catch((error) => {
    if (!/-32601|not found/i.test(error.message)) throw error;
    console.log(`This Chrome cannot load an extension from DevTools (${error.message}). Skipping the extension tests.`);
    return null;
  });
  if (!loaded) {
    await chrome.close();
    server.close();
    await rm(work, { recursive: true, force: true });
    process.exit(0);
  }
  const origin = `chrome-extension://${loaded.id}`;
  const workerTarget = await chrome.waitForTarget((t) => t.type === 'service_worker' && t.url === `${origin}/background.js`);
  const worker = await chrome.attach(workerTarget.targetId, 'worker');
  await chrome.until(worker, `typeof chrome === 'object' && !!chrome.action && !!chrome.contextMenus`);
  const inWorker = (expression) => chrome.evaluate(worker, expression);
  check('manifest: name from _locales', await inWorker(`chrome.i18n.getMessage('appName')`), 'Markdown Knowledge Base');
  check('manifest: the button\'s title from _locales', await inWorker(`chrome.action.getTitle({})`), 'Send to Markdown');
  check('the button opens the popup', await inWorker(`chrome.action.getPopup({})`), `${origin}/popup.html`);
  check('the button does not just open the panel', await inWorker(`chrome.sidePanel.getPanelBehavior().then((b) => b.openPanelOnActionClick)`), false);

  // Window A holds the sites and the side panel; window B the extension's own test page.
  const firstTab = (await chrome.targets()).find((t) => t.type === 'page');
  // Right after loading the extension, a slow machine can still show an error page for its own
  // pages (a document with no origin, where localStorage throws), and an error page is "complete"
  // too: so it is asked for again until it is the extension's page.
  async function openOwnPage(session, path) {
    const url = `${origin}/${path}`;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { errorText } = await chrome.send('Page.navigate', { url }, session);
      if (!errorText && (await chrome.until(session, `document.readyState === 'complete' && location.href === ${JSON.stringify(url)}`, 3000))) return;
      await sleep(300);
    }
    throw new Error(`Chrome would not open ${url}`);
  }
  const { targetId: helperTarget } = await chrome.send('Target.createTarget', { url: 'about:blank', newWindow: true });
  const helper = await chrome.attach(helperTarget, 'helper');
  await chrome.send('Page.enable', {}, helper);
  await openOwnPage(helper, 'test.html');
  const inHelper = (expression) => chrome.evaluate(helper, expression);
  await inHelper(`(async () => {
    localStorage.setItem('markdown-catalog-editor', JSON.stringify({ language: 'en', mode: 'read' }));
    const notes = await (await navigator.storage.getDirectory()).getDirectoryHandle('Notes', { create: true });
    const stream = await (await notes.getFileHandle('Inbox.md', { create: true })).createWritable();
    await stream.write('# Inbox\\n\\nSomething to read.\\n');
    await stream.close();
    return true;
  })()`);
  /** A file of the folder, as the disk has it; null when it is not there. */
  const fileText = (path) =>
    inHelper(`(async () => {
      let dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('Notes');
      const parts = ${JSON.stringify(path)}.split('/');
      const name = parts.pop();
      try {
        for (const part of parts) dir = await dir.getDirectoryHandle(part);
        return await (await (await dir.getFileHandle(name)).getFile()).text();
      } catch { return null; }
    })()`);

  /** True once the file ends with `tail`: the dialog closes before the note is written. */
  const fileEnds = async (path, tail) => {
    for (let i = 0; i < 50; i += 1) {
      if ((await fileText(path))?.endsWith(tail)) return true;
      await sleep(100);
    }
    return false;
  };

  const siteTab = await chrome.attach(firstTab.targetId, 'site');
  await chrome.send('Page.enable', {}, siteTab);
  async function visit(url) {
    await chrome.send('Page.navigate', { url }, siteTab);
    await chrome.until(siteTab, `document.readyState === 'complete' && location.href === ${JSON.stringify(url)}`);
  }
  await visit(site('article.test', '/post'));
  const tabId = await inWorker(`chrome.tabs.query({}).then((tabs) => tabs.find((t) => t.url?.includes('article.test')).id)`);
  const windowA = await inWorker(`chrome.tabs.get(${tabId}).then((t) => t.windowId)`);

  // The worker's calls to open the panel, which with no click behind them Chrome refuses.
  await inWorker(`(() => { self.__panelOpened = []; chrome.sidePanel.open = (options) => { self.__panelOpened.push(options); return Promise.resolve(); }; return true; })()`);
  // A click in the context menu, as Chrome reports it. `seen`: the address and title a click would
  // let the extension see where it has no host permission.
  const menu = (info, seen = {}) =>
    inWorker(`chrome.tabs.get(${tabId}).then((tab) => { chrome.contextMenus.onClicked.dispatch({ frameId: 0, pageUrl: tab.url, ...${JSON.stringify(info)} }, { ...tab, ...${JSON.stringify(seen)} }); return true; })`);

  /** The side panel of window A, opened by a "click" in the extension's own page. */
  let panel = null;
  let panelTarget = null;
  async function openPanel() {
    await chrome.evaluate(helper, `chrome.sidePanel.open({ windowId: ${windowA} }).then(() => true)`, true);
    panelTarget = await chrome.waitForTarget((t) => t.type === 'page' && t.url === `${origin}/panel.html`);
    panel = await chrome.attach(panelTarget.targetId, 'panel');
    await chrome.send('Page.enable', {}, panel);
    await chrome.until(panel, `document.readyState === 'complete' && !document.getElementById('gate').classList.contains('gate--starting')`);
    await chrome.evaluate(panel, `window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('Notes'); true`);
  }
  async function closePanel() {
    await chrome.send('Target.closeTarget', { targetId: panelTarget.targetId });
    await chrome.until(worker, `chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] }).then((c) => c.length === 0)`);
    panel = null;
  }
  await openPanel();
  const inPanel = (expression) => chrome.evaluate(panel, expression);
  const untilPanel = (expression, timeout) => chrome.until(panel, expression, timeout);
  const toast = `(document.querySelector('.toast--shown')?.textContent ?? '')`;
  const dialog = `document.querySelector('.clip-dialog')`;
  /** Waits for the dialog of what was sent; a step that brings none ends the test there, saying which. */
  const dialogShown = async (step) => {
    if (await untilPanel(`!!${dialog}`)) return true;
    throw new Error(`${step}: no dialog in the panel; toast: ${await inPanel(toast)}`);
  };
  const dialogState = () =>
    inPanel(`(() => {
      const box = ${dialog};
      const [toNew, toEnd] = box.querySelectorAll('input[type=radio]');
      return {
        source: box.querySelector('.clip-source').textContent,
        target: toEnd.checked ? 'end' : 'new',
        endAllowed: !toEnd.disabled,
        folder: box.querySelector('.clip-folder').value,
        name: box.querySelector('.clip-name').value,
        markdown: box.querySelector('.clip-markdown').value,
      };
    })()`);
  const shot = async (name, session = panel) => {
    if (!SHOTS) return;
    await mkdir(SHOTS, { recursive: true });
    const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' }, session);
    await writeFile(join(SHOTS, `extension-${name}.png`), Buffer.from(data, 'base64'));
  };
  // Clicks through the DOM, not the mouse: a click sent to the side panel as input can be lost
  // on a busy machine. Nothing clicked here needs the user's activation.
  const press = (selector) => inPanel(`document.querySelector(${JSON.stringify(selector)}).click(), true`);
  const save = async () => {
    await press('.clip-dialog button[type=submit]');
    await untilPanel(`!${dialog}`);
  };

  check('the panel shows the start screen', await inPanel(`!document.getElementById('gate').hidden`), true);

  // Sent before a folder is open: it waits for one
  await menu({ menuItemId: 'page' });
  check('the menu opens the panel of its window', await inWorker(`self.__panelOpened`), [{ windowId: windowA }]);
  check('with no folder, the panel asks for one', await untilPanel(`${toast} === 'Open a folder of notes, and what was sent goes into it'`), true);
  check('the panel took it out of the session storage', await inWorker(`chrome.storage.session.get(null).then((all) => Object.keys(all).length)`), 0);
  await press('#open-folder');
  check('the folder opens', await untilPanel(`!document.getElementById('app').hidden`), true);
  check('then the dialog for what was sent', await dialogShown('page'), true);
  await shot('page-dialog');
  let state = await dialogState();
  check('page: what and where from', state.source, 'The page "The article" from article.test');
  check('page: a new note by default', [state.target, state.endAllowed], ['new', true]);
  check('page: in the clippings folder, named after the title', [state.folder, state.name], ['Clippings', 'The article.md']);
  check('page: the article as Markdown, without the site around it', state.markdown, [
    '# The article',
    `First paragraph, with [a link](${site('article.test', '/about')}), long enough to be the text of the page and not a menu around it.`,
    `![A picture](${site('article.test', '/pic.png')})`,
    'Second paragraph, also long enough to count for something when the extension looks for the article.',
  ].join('\n\n'));
  await save();
  check('page: saved as a note', await untilPanel(`${toast} === 'Saved as Clippings/The article.md'`), true);
  const today = await inPanel(`(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()`);
  const note = await fileText('Clippings/The article.md');
  check('page: front matter, then the text', note?.split('\n\n')[0], `---\ntitle: "The article"\nsource: "${site('article.test', '/post')}"\nclipped: ${today}\n---`);
  await shot('page-note');
  check('page: and the note is open', await inPanel(`document.getElementById('status-path').textContent`), 'Clippings/The article.md');

  // A selection, a link, an image: the end of the open note
  await chrome.evaluate(siteTab, `(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById('first')); getSelection().removeAllRanges(); getSelection().addRange(r); return true; })()`);
  await menu({ menuItemId: 'selection', selectionText: 'First paragraph' });
  await dialogShown('selection');
  state = await dialogState();
  await shot('selection-dialog');
  check('selection: what and where from', state.source, 'The selection on "The article" from article.test');
  check('selection: to the end of the open note by default', state.target, 'end');
  check('selection: as Markdown', state.markdown, `First paragraph, with [a link](${site('article.test', '/about')}), long enough to be the text of the page and not a menu around it.`);
  await save();
  check('selection: added', await untilPanel(`${toast} === 'Added to the end of The article.md'`), true);
  check('selection: at the end, with its source', await fileEnds('Clippings/The article.md', `not a menu around it.\n\n— [The article](${site('article.test', '/post')})\n`), true);
  check('selection: the editor shows it too', await inPanel(`document.getElementById('doc').textContent.includes('— The article')`), true);

  await menu({ menuItemId: 'link', linkUrl: site('article.test', '/about') });
  await dialogShown('link');
  state = await dialogState();
  check('link: as Markdown, its text from the page', [state.source, state.markdown], ['A link from article.test', `[About](${site('article.test', '/about')})`]);
  await save();
  check('link: added, its own source', await fileEnds('Clippings/The article.md', `\n\n[About](${site('article.test', '/about')})\n`), true);

  await menu({ menuItemId: 'image', srcUrl: site('article.test', '/pic.png') });
  await dialogShown('image');
  state = await dialogState();
  check('image: as Markdown, its description from the page', [state.source, state.markdown], ['An image from article.test', `![A picture](${site('article.test', '/pic.png')})`]);
  const before = await fileText('Clippings/The article.md');
  await press('.clip-dialog [type=button]');
  await untilPanel(`!${dialog}`);
  check('image: cancelled, nothing written', await fileText('Clippings/The article.md'), before);

  // The page again: a name of its own; then a site the extension may not read
  await menu({ menuItemId: 'page' });
  await dialogShown('page again');
  await press('.clip-dialog input[type=radio]');
  await save();
  check('page again: numbered beside the first', await untilPanel(`${toast} === 'Saved as Clippings/The article 2.md'`), true);
  await visit(site('outside.example', '/page'));
  await menu({ menuItemId: 'page' }, { url: site('outside.example', '/page'), title: 'Elsewhere' });
  await dialogShown('unreadable site');
  state = await dialogState();
  check('a site it may not read: a link to the page', [state.source, state.markdown], ['A link from outside.example', `[Elsewhere](${site('outside.example', '/page')})`]);
  await press('.clip-dialog [type=button]');
  await untilPanel(`!${dialog}`);

  /* The popup: what is selected, to the default note or to one picked */

  let popup = null;
  let popupTarget = null;
  // Opened as a page of its own, in a window of its own: it is told the site's tab is the one beside it.
  async function openPopup(init = '') {
    ({ targetId: popupTarget } = await chrome.send('Target.createTarget', { url: 'about:blank', newWindow: true }));
    popup = await chrome.attach(popupTarget, 'popup');
    await chrome.send('Page.enable', {}, popup);
    await chrome.send(
      'Page.addScriptToEvaluateOnNewDocument',
      {
        source: `
          chrome.tabs.query = () => chrome.tabs.get(${tabId}).then((tab) => [tab]);
          chrome.windows.getCurrent = () => Promise.resolve({ id: ${windowA} });
          chrome.sidePanel.open = (options) => { (window.__panel ??= []).push(options); return Promise.resolve(); };
          window.close = () => { window.__closed = true; };
          ${init}`,
      },
      popup,
    );
    await openOwnPage(popup, 'popup.html');
    await chrome.until(popup,`document.readyState === 'complete' && !!document.querySelector('.popup-preview')`);
  }
  async function closePopup() {
    await chrome.send('Target.closeTarget', { targetId: popupTarget });
    popup = null;
  }
  const inPopup = (expression) => chrome.evaluate(popup, expression);
  const popupText = (selector) => inPopup(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`);
  const pressPopup = (selector) => inPopup(`document.querySelector(${JSON.stringify(selector)}).click(), true`);
  const rowOf = (name) => `[...document.querySelectorAll('.popup-row')].find((row) => row.querySelector('.popup-note-name').textContent === ${JSON.stringify(name)})`;
  const select = () =>
    chrome.evaluate(siteTab, `(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById('first')); getSelection().removeAllRanges(); getSelection().addRange(r); return true; })()`);
  const selection = `First paragraph, with [a link](${site('article.test', '/about')}), long enough to be the text of the page and not a menu around it.\n\n— [The article](${site('article.test', '/post')})\n`;
  const count = async (path, text) => ((await fileText(path)) ?? '').split(text).length - 1;

  await visit(site('article.test', '/post'));
  await select();
  await openPopup();
  await shot('popup', popup);
  check('popup: the knowledge base is the folder opened last', await popupText('.popup-base'), 'Notes');
  check('popup: what is selected, and where', await popupText('.popup-what'), 'The selection on article.test');
  check('popup: as Markdown', await popupText('.popup-markdown'), selection.split('\n\n—')[0]);
  check('popup: to the default note', await popupText('.popup-target'), 'To the end of Inbox.md');
  check('popup: the notes to pick from', await inPopup(`[...document.querySelectorAll('.popup-note-name')].map((n) => n.textContent).sort()`), ['Inbox', 'The article', 'The article 2']);
  check('popup: no page of its own for a selection', await inPopup(`!document.querySelector('.popup-as-note')`), true);
  await pressPopup('.popup-send');
  check('popup: done, and it closes', await chrome.until(popup, `window.__closed === true`), true);
  check('popup: added to the default note, with its source', await fileEnds('Inbox.md', `Something to read.\n\n${selection}`), true);
  check('popup: through the panel, which has the knowledge base open', await untilPanel(`${toast} === 'Added to the end of Inbox.md'`), true);
  await closePopup();

  await openPopup();
  await inPopup(`${rowOf('The article')}.querySelector('.popup-star').click(), true`);
  check('popup: a star makes the default', await popupText('.popup-target'), 'To the end of Clippings/The article.md');
  check('popup: and it is remembered', await inPopup(`JSON.parse(localStorage.getItem('markdown-catalog-editor')).defaultNote`), 'Clippings/The article.md');
  await inPopup(`${rowOf('Inbox')}.querySelector('.popup-note').click(), true`);
  check('popup: a note picked from the list', await chrome.until(popup, `window.__closed === true`), true);
  check('popup: gets it at its end', (await count('Inbox.md', 'First paragraph')) === 2 && (await fileEnds('Inbox.md', selection)), true);
  await closePopup();

  // With the panel closed the popup writes the note itself
  await closePanel();
  const clipped = await count('Clippings/The article.md', 'First paragraph');
  await openPopup();
  await pressPopup('.popup-send');
  await chrome.until(popup, `window.__closed === true`);
  check('popup without the panel: it writes the default note itself', (await count('Clippings/The article.md', 'First paragraph')) === clipped + 1 && (await fileEnds('Clippings/The article.md', selection)), true);
  await closePopup();

  // The knowledge base closed: full mode, and what is selected goes to the default note there
  await openPopup(`FileSystemHandle.prototype.queryPermission = async () => 'prompt';`);
  await shot('popup-closed', popup);
  check('popup, base closed: it says so', await popupText('.popup-empty p'), '"Notes" is closed. Open it in full mode, and what is selected goes to Clippings/The article.md.');
  await pressPopup('.popup-empty .button');
  check('popup: full mode opens the panel of its window', await chrome.until(popup, `window.__closed === true && window.__panel?.[0]?.windowId === ${windowA}`), true);
  check('popup: what is selected waits for the panel', await inWorker(`chrome.storage.session.get(null).then((all) => Object.values(all).map((sent) => [sent.kind, sent.to]))`), [['selection', 'default']]);
  await closePopup();
  await openPanel();
  check('full mode: the folder reopens', await untilPanel(`!document.getElementById('app').hidden`), true);
  check('full mode: and the selection goes to the default note', (await fileEnds('Clippings/The article.md', selection)) && (await count('Clippings/The article.md', 'First paragraph')) === clipped + 2, true);

  // Nothing selected: the page, and a note of its own through the panel's dialog
  await chrome.evaluate(siteTab, `getSelection().removeAllRanges(), true`);
  await openPopup();
  check('popup, nothing selected: the page', await popupText('.popup-what'), 'Nothing is selected: the whole page "The article"');
  await pressPopup('.popup-as-note');
  await chrome.until(popup, `window.__closed === true`);
  await dialogShown('page as a note');
  check('popup: the page as a note, asked in the panel', (await dialogState()).source, 'The page "The article" from article.test');
  await press('.clip-dialog [type=button]');
  await untilPanel(`!${dialog}`);
  await closePopup();

  // The panel's language, for the worker's menus
  await press('#settings');
  await untilPanel(`!!document.querySelector('.popover .settings-select')`);
  await inPanel(`(() => { const select = document.querySelector('.popover .settings-select'); select.value = 'ru'; select.dispatchEvent(new Event('change')); return true; })()`);
  check('the language goes to the worker', await chrome.until(worker, `chrome.storage.local.get('language').then((s) => s.language === 'ru')`), true);
  check('the panel speaks it', await untilPanel(`document.documentElement.lang === 'ru'`), true);

  await sleep(100);
  check('no errors in the panel or the worker', chrome.errors, []);
} finally {
  await chrome.close();
  server.close();
  await rm(work, { recursive: true, force: true });
}

done('extension');
