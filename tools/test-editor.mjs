/**
 * Drives the built editor in headless Chrome: typing, Enter, arrows, clicks.
 *
 * Needs `npm run build` first and a local Chrome (or `CHROME=/path/to/chrome`).
 * Each scenario serves build/macaed.html next to one note over HTTP, so the
 * page opens it by itself (read-only); the text is read back through the
 * "download" that ⌘S offers in that mode. No dependencies beyond Node: the
 * DevTools protocol is spoken over the built-in WebSocket.
 */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const APP = join(root, 'build', 'macaed.html');
const CHROME =
  process.env.CHROME ??
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((path) => existsSync(path));

if (!CHROME) {
  console.log('No Chrome found — set CHROME=/path/to/chrome. Skipping the browser tests.');
  process.exit(0);
}
if (typeof WebSocket === 'undefined') {
  console.error('Run with `node --experimental-websocket` on Node 20.');
  process.exit(1);
}

/** `files`: extra vault files beside the note, `{ 'assets/Note/a.png': Buffer }`. */
async function launch(note, files = {}) {
  const html = await readFile(APP);
  const server = createServer((req, res) => {
    const path = decodeURIComponent(req.url.slice(1));
    if (req.url.startsWith('/index.json')) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ name: 'T', files: ['Note.md', ...Object.keys(files)] }));
    } else if (req.url.startsWith('/Note.md')) {
      res.end(note);
    } else if (path in files) {
      res.end(files[path]);
    } else {
      res.setHeader('content-type', 'text/html');
      res.end(html);
    }
  });
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const profile = await mkdtemp(join(tmpdir(), 'macaed-chrome-'));
  const flags = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--window-size=1200,900'];
  if (process.platform === 'linux') flags.push('--no-sandbox');
  const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve) => {
    let buf = '';
    chrome.stderr.on('data', (d) => {
      buf += d;
      const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf);
      if (m) resolve(m[1]);
    });
  });
  const debugPort = new URL(wsUrl).port;
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && waiting.has(msg.id)) {
      waiting.get(msg.id)(msg);
      waiting.delete(msg.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      waiting.set(n, (msg) => (msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)));
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed');
    return r.result.value;
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      localStorage.setItem('markdown-catalog-editor', JSON.stringify({ mode: 'edit' }));
      const orig = URL.createObjectURL;
      URL.createObjectURL = (blob) => { window.__lastBlob = blob; return orig(blob); };
      HTMLAnchorElement.prototype.click = function () {};
    `,
  });
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  for (let i = 0; i < 50; i += 1) {
    await sleep(100);
    if (await evaluate(`document.querySelectorAll('#doc .block').length > 0`)) break;
  }
  await sleep(200);

  const KEYS = {
    Enter: { code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' },
    Backspace: { code: 'Backspace', windowsVirtualKeyCode: 8 },
    Delete: { code: 'Delete', windowsVirtualKeyCode: 46 },
    ArrowUp: { code: 'ArrowUp', windowsVirtualKeyCode: 38 },
    ArrowDown: { code: 'ArrowDown', windowsVirtualKeyCode: 40 },
    ArrowLeft: { code: 'ArrowLeft', windowsVirtualKeyCode: 37 },
    ArrowRight: { code: 'ArrowRight', windowsVirtualKeyCode: 39 },
    Escape: { code: 'Escape', windowsVirtualKeyCode: 27 },
    Tab: { code: 'Tab', windowsVirtualKeyCode: 9 },
    s: { code: 'KeyS', windowsVirtualKeyCode: 83 },
    z: { code: 'KeyZ', windowsVirtualKeyCode: 90 },
  };
  /** `modifiers`: 4 is ⌘. */
  const press = async (key, modifiers = 0) => {
    const k = KEYS[key];
    const text = modifiers ? undefined : k.text;
    await send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, modifiers, ...k, text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, modifiers, ...k });
    await sleep(30);
  };
  const type = async (text) => {
    await send('Input.insertText', { text });
    await sleep(30);
  };
  const click = async (selector, where = 'end') => {
    const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
    const x = where === 'start' ? box[0] + 2 : box[0] + box[2] - 2;
    const y = box[1] + Math.min(box[3] / 2, 10);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
    await sleep(60);
  };
  /** The document text, fetched through the read-only "download" path of ⌘S. */
  const text = async () => {
    await evaluate(`window.__lastBlob = null`);
    await press('s', 4);
    await sleep(50);
    return evaluate(`window.__lastBlob ? window.__lastBlob.text() : null`);
  };
  /** One entry per block: active source shows as [value|caret]. */
  const view = () =>
    evaluate(`Array.from(document.querySelectorAll('#doc > *')).map((n) => {
      if (n.tagName === 'TEXTAREA') return '[' + n.value.slice(0, n.selectionStart) + '|' + n.value.slice(n.selectionStart) + ']';
      return (n.className.replace('block ', '') + ':' + n.textContent).trim();
    })`);

  const close = async () => {
    ws.close();
    chrome.kill();
    server.close();
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  };
  return { evaluate, press, type, click, text, view, sleep, close };
}

/* ------------------------------------------------------------------ *
 * Scenarios
 * ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const eq = (name, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) passed += 1;
  else failed += 1;
  if (!ok) console.error(`FAIL  ${name}\n  expected: ${JSON.stringify(b)}\n  actual:   ${JSON.stringify(a)}`);
};
async function scenario(note, fn, files) {
  const b = await launch(note, files);
  try {
    await fn(b);
  } catch (error) {
    failed += 1;
    console.log('FAIL (threw)', error.message);
  } finally {
    await b.close();
  }
}

await scenario('# Title\n\nHello\n\nWorld\n', async (b) => {
  await b.click('#doc > .block--paragraph');
  await b.press('Enter');
  eq('enter at end opens an empty line', await b.view(), ['block--heading block--h1:Title', 'block--paragraph:Hello', '[|]', 'block--paragraph:World']);
  await b.press('Enter');
  eq('enter on an empty line adds another', await b.view(), ['block--heading block--h1:Title', 'block--paragraph:Hello', 'block--blank:', '[|]', 'block--paragraph:World']);
  await b.press('Enter');
  eq('and another', (await b.view()).length, 6);
  await b.type('New');
  await b.press('Escape');
  eq('text after typing into the third empty line', await b.text(), '# Title\n\nHello\n\n\n\nNew\n\nWorld\n');
  const visible = `[...document.querySelectorAll('#doc > *')].filter(n => n.offsetParent).length`;
  eq('edit view shows the free blank line', await b.evaluate(visible), 5);
  await b.evaluate(`document.querySelector('.seg[data-mode=read]').click()`);
  eq('read view hides it', await b.evaluate(visible), 4);
});

await scenario('# Title\n\nHello\n', async (b) => {
  await b.click('#doc > .block--paragraph');
  await b.press('Enter');
  await b.press('Enter');
  await b.type('X');
  eq('enter twice at the end of the file', await b.text(), '# Title\n\nHello\n\n\nX\n');
  await b.press('Backspace');
  await b.press('Backspace');
  eq('backspace removes the empty line', await b.text(), '# Title\n\nHello\n\n\n');
  eq('caret sits on the remaining empty line', await b.view(), ['block--heading block--h1:Title', 'block--paragraph:Hello', '[|]']);
  await b.press('Backspace');
  eq('backspace on the last empty line returns to Hello', await b.view(), ['block--heading block--h1:Title', '[Hello|]']);
});

await scenario('Hello', async (b) => {
  await b.click('#doc > .block--paragraph');
  await b.press('Enter');
  await b.type('Next');
  eq('enter at end of a file without newline', await b.text(), 'Hello\n\nNext\n');
});

await scenario('# Title\n\nHello\n\nWorld\n\nTail\n', async (b) => {
  await b.click('#doc > .block--heading');
  await b.type(' plus many new characters here');
  await b.click('#doc > .block:last-child');
  await b.type('!');
  eq('type, click a block below, type', await b.text(), '# Title plus many new characters here\n\nHello\n\nWorld\n\nTail!\n');
  await b.click('#doc > .block--heading');
  await b.type('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
  await b.press('ArrowDown');
  eq('ArrowDown after typing moves to the next block', (await b.view())[1], '[Hello|]');
  await b.press('Delete');
  eq('Delete at the end joins with the next block', (await b.view())[1], '[Hello|World]');
});

await scenario('Line one\r\n\r\nLine two\r\n', async (b) => {
  await b.click('#doc > .block:last-child');
  await b.press('Enter');
  await b.type('three');
  eq('CRLF is kept', await b.text(), 'Line one\r\n\r\nLine two\r\n\r\nthree\r\n');
});

await scenario('- one\n- two\n\nAfter\n', async (b) => {
  await b.click('#doc > .block--list');
  await b.press('Enter');
  await b.type('three');
  await b.press('Enter');
  await b.press('Enter');
  await b.type('para');
  eq('list continues, then leaves', await b.text(), '- one\n- two\n- three\n\npara\n\nAfter\n');
});

await scenario('[ref]: https://example.org\n\nSee [the site][ref].\n', async (b) => {
  eq('definitions are editable blocks', await b.view(), ['block--definition:[ref]: https://example.org', 'block--paragraph:See the site.']);
  eq('reference link resolves', await b.evaluate(`document.querySelector('#doc a')?.href`), 'https://example.org/');
});

await scenario('# T\n\nfind me here\n', async (b) => {
  await b.click('#doc > .block--heading');
  await b.press('Escape');
  await b.evaluate(`document.getElementById('find').click()`);
  await b.type('fi');
  await b.type('nd');
  eq('search keeps focus while typing', await b.evaluate(`document.activeElement.id`), 'find-input');
  eq('document untouched by search typing', await b.text(), '# T\n\nfind me here\n');
});

await scenario('- [ ] task\n\ntext\n', async (b) => {
  await b.click('#doc > .block--paragraph');
  await b.type(' more');
  await b.click('#doc input.task', 'start');
  await b.sleep(50);
  eq('checkbox toggles after typing elsewhere', await b.text(), '- [x] task\n\ntext more\n');
});

await scenario('Alpha\n\nBeta\n', async (b) => {
  await b.click('#doc > .block:last-child', 'start');
  await b.press('Enter');
  eq('enter at the start pushes the block down', await b.view(), ['block--paragraph:Alpha', 'block--blank:', '[|Beta]']);
  await b.press('ArrowUp');
  eq('arrow up lands on the blank line', await b.view(), ['block--paragraph:Alpha', '[|]', 'block--paragraph:Beta']);
  await b.press('z', 4);
  eq('undo removes it', await b.text(), 'Alpha\n\nBeta\n');
  await b.click('#doc > .block:last-child');
  await b.evaluate(`(() => { const a = document.querySelector('textarea'); a.setSelectionRange(2, 2); })()`);
  await b.press('Enter');
  eq('enter in the middle splits the paragraph', await b.view(), ['block--paragraph:Alpha', 'block--paragraph:Be', '[|ta]']);
  await b.press('Backspace');
  eq('backspace joins it back', await b.view(), ['block--paragraph:Alpha', '[Be|ta]']);
});

await scenario('# Head\ntext right below\n', async (b) => {
  await b.click('#doc > .block--heading');
  await b.press('Enter');
  await b.type('between');
  await b.press('Escape');
  eq('enter after a heading glued to text', await b.text(), '# Head\n\nbetween\n\ntext right below\n');
});

await scenario('```js\nconst a = 1;\n```\n', async (b) => {
  await b.click('#doc > .block--code');
  await b.evaluate(`(() => { const a = document.querySelector('textarea'); a.setSelectionRange(18, 18); })()`);
  await b.press('Enter');
  await b.type('b');
  eq('enter inside code stays in code', await b.text(), '```js\nconst a = 1;\nb\n```\n');
});

await scenario(Array.from({ length: 40 }, (_, i) => `Para ${i} text.\n\n\`\`\`js\nconst v = ${i};\n\`\`\``).join('\n\n') + '\n', async (b) => {
  await b.evaluate(`document.getElementById('scroller').scrollTop = 1500`);
  await b.sleep(50);
  await b.evaluate(`(() => { const code = [...document.querySelectorAll('#doc > .block--code')].find((n) => n.getBoundingClientRect().top > 100); code.id = 'c1'; code.nextElementSibling.id = 'p1'; })()`);
  await b.click('#c1');
  const before = await b.evaluate(`document.getElementById('p1').getBoundingClientRect().top`);
  await b.click('#p1');
  const after = await b.evaluate(`document.querySelector('#doc textarea').getBoundingClientRect().top`);
  // The code block above loses its two fence lines; the clicked block must stay put.
  eq('a clicked block does not jump', Math.abs(after - before) < 1, true);
  eq('the toolbar does not scroll away', await b.evaluate(`document.scrollingElement.scrollTop`), 0);
});

// A 1×1 PNG, for `![[embeds]]` served from the note's assets folder.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
await scenario('Intro\n\n![[dot.png]]\n\n![[gone.png]]\n', async (b) => {
  await b.sleep(200);
  eq('an embed loads from assets/<note>/', await b.evaluate(`document.querySelector('img.embed')?.naturalWidth`), 1);
  eq('a missing embed names the expected path', await b.evaluate(`document.querySelector('.missing-asset')?.textContent`), 'no such file: assets/Note/gone.png');
  eq('the assets folder starts collapsed', await b.evaluate(`[
    document.querySelector('.tree-item[data-path="assets"] .tree-mark')?.textContent,
    Boolean(document.querySelector('.tree-item[data-path="assets/Note"]')),
  ]`), ['▸', false]);
}, { 'assets/Note/dot.png': PIXEL });

console.log(`${passed} browser checks passed${failed ? `, ${failed} failed` : ''}`);
process.exit(failed ? 1 : 0);
