/**
 * Screenshots of the main screens, to look at a layout rather than assume it:
 * builds, then opens build/macaed.html in headless Chrome beside a small
 * folder of notes (served with an index.json, so it opens by itself) — the
 * start screen, a note to read and to edit, the settings, the dark theme,
 * Arabic right to left, a phone with the file panel shut and open, the start
 * screen where the notes are kept in the browser — and runs
 * the extension's test with --shots for its side panel.
 *
 *   npm run shots                  # -> shots/
 *   npm run shots -- shots/before  # -> shots/before/
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { CHROME, sleep, startChrome } from './chrome.mjs';
import { root } from './load.mjs';

const dir = resolve(process.argv[2] ?? 'shots');
mkdirSync(dir, { recursive: true });
if (!CHROME) {
  console.log('No Chrome found — set CHROME=/path/to/chrome.');
  process.exit(1);
}
const built = spawnSync(process.execPath, ['build.mjs'], { cwd: root, stdio: 'inherit' });
if (built.status !== 0) process.exit(built.status ?? 1);

const NOTES = {
  'Welcome.md': `# Welcome

A folder of **Markdown** notes, read and written in place. Links go to [[Ideas]] and to [the web](https://example.com).

- [x] Open a folder
- [ ] Write the first note
- A list item with \`code\` and ==highlighted== text

| Key | Action |
| --- | --- |
| ⌘E | Read / edit |
| ⌘S | Save |

\`\`\`js
const greeting = 'hello';
console.log(greeting);
\`\`\`

> A quote, to see how one looks.
`,
  'Ideas.md': '# Ideas\n\nSome ideas.\n',
  'Projects/Roadmap.md': '# Roadmap\n\n1. First\n2. Second\n',
};
const state = { notes: true };
const html = readFileSync(join(root, 'build', 'macaed.html'));
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1));
  if (path === 'index.json' && state.notes) {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ name: 'Notes', files: Object.keys(NOTES) }));
  } else if (path in NOTES && state.notes) {
    res.end(NOTES[path]);
  } else if (path === '') {
    res.setHeader('content-type', 'text/html');
    res.end(html);
  } else {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/`;

const chrome = await startChrome();
try {
  const [tab] = (await chrome.targets()).filter((t) => t.type === 'page');
  const s = await chrome.attach(tab.targetId, 'page');
  await chrome.send('Page.enable', {}, s);
  const viewport = (width, height, mobile = false) => chrome.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }, s);
  /** Opens the page afresh with these settings, as a new visit would. */
  const open = async (settings) => {
    await chrome.send('Page.navigate', { url }, s);
    await chrome.until(s, `document.readyState === 'complete'`);
    await chrome.evaluate(s, `localStorage.setItem('markdown-catalog-editor', ${JSON.stringify(JSON.stringify({ lastPath: 'Welcome.md', ...settings }))}), true`);
    await chrome.send('Page.reload', {}, s);
    await chrome.until(s, `!document.getElementById('gate').classList.contains('gate--starting') && (!${state.notes} || document.querySelectorAll('#doc .block').length > 0)`);
    await sleep(300);
  };
  const shot = async (name) => {
    const { data } = await chrome.send('Page.captureScreenshot', { format: 'png' }, s);
    await writeFile(join(dir, `${name}.png`), Buffer.from(data, 'base64'));
  };

  await viewport(1200, 800);
  state.notes = false;
  await open({ language: 'en' });
  await shot('1-gate');
  state.notes = true;
  await open({ language: 'en', mode: 'read' });
  await shot('2-read');
  await open({ language: 'en', mode: 'edit' });
  await shot('3-edit');
  await chrome.evaluate(s, `document.getElementById('settings').click(), true`);
  await sleep(200);
  await shot('4-settings');
  await open({ language: 'en', mode: 'read', theme: 'dark' });
  await shot('5-dark');
  await open({ language: 'ar', mode: 'read' });
  await shot('6-arabic');
  await viewport(390, 844, true);
  await open({ language: 'en', mode: 'read' });
  await shot('7-phone');
  await chrome.evaluate(s, `document.getElementById('toggle-sidebar').click(), true`);
  await sleep(300);
  await shot('7b-phone-files');

  // Without a folder picker — Safari, Firefox, a phone — the gate offers to keep the notes in the browser.
  state.notes = false;
  const { identifier } = await chrome.send('Page.addScriptToEvaluateOnNewDocument', { source: 'delete Window.prototype.showDirectoryPicker; delete window.showDirectoryPicker;' }, s);
  await viewport(1200, 800);
  await open({ language: 'en' });
  await shot('1b-gate-browser');
  await viewport(390, 844, true);
  await open({ language: 'en' });
  await shot('7c-phone-gate-browser');
  await chrome.send('Page.removeScriptToEvaluateOnNewDocument', { identifier }, s);
} finally {
  await chrome.close();
  server.close();
}

const extension = spawnSync(process.execPath, ['tools/test-extension.mjs', '--shots', dir], { cwd: root, stdio: 'inherit' });
if (extension.status !== 0) process.exit(extension.status ?? 1);
console.log(`screenshots in ${dir}`);
