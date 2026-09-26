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
  /** Presses at the middle of `selector`, moves by `dy` pixels and lets go. */
  const drag = async (selector, dy) => {
    const [x, y] = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    for (let step = 1; step <= 4; step += 1) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: y + (dy * step) / 4, button: 'left', buttons: 1 });
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y: y + dy, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(60);
  };
  return { evaluate, press, type, click, drag, text, view, sleep, close };
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

  await b.click('.tree-item[data-path="assets"]', 'start');
  await b.click('.tree-item[data-path="assets/Note/dot.png"]', 'start');
  await b.sleep(200);
  eq('a picture from the tree opens in the viewer, not the editor', await b.evaluate(`[
    document.getElementById('doc').hidden,
    document.querySelector('#viewer img')?.naturalWidth,
    document.querySelector('#viewer figcaption')?.textContent,
    document.getElementById('status-path').textContent,
  ]`), [true, 1, 'dot.png · 1 × 1', 'assets/Note/dot.png']);

  await b.click('.tree-item[data-path="Note.md"]', 'start');
  await b.sleep(200);
  eq('the note comes back after the picture', await b.evaluate(`[
    document.getElementById('viewer').hidden,
    document.getElementById('doc').hidden,
    document.querySelector('img.embed')?.naturalWidth,
  ]`), [true, false, 1]);
}, { 'assets/Note/dot.png': PIXEL });

const title = (b) => b.evaluate(`(() => { const t = document.getElementById('inline-title'); return t.hidden ? null : t.textContent; })()`);

await scenario('Intro\n', async (b) => {
  eq('the file name shows as a title', await title(b), 'Note');
  await b.click('#doc > .block--paragraph', 'start');
  await b.type('# note\n\n');
  await b.press('Escape');
  eq('a matching first heading hides the title', await title(b), null);
  await b.click('#doc > .block--heading');
  await b.type('s');
  await b.press('Escape');
  eq('a different first heading brings it back', await title(b), 'Note');
  await b.click('#settings', 'start');
  await b.click('#setting-inline-title', 'start');
  eq('the settings checkbox hides the title', await title(b), null);
  await b.click('#setting-inline-title', 'start');
  eq('and shows it again', await title(b), 'Note');
  await b.press('Escape');
  eq('Escape closes the settings', await b.evaluate(`document.querySelector('.popover') === null`), true);
});

await scenario('Text\n', async (b) => {
  await b.click('#settings', 'start');
  await b.evaluate(`(() => {
    const select = document.querySelector('.popover .settings-select');
    select.value = 'ru';
    select.dispatchEvent(new Event('change'));
  })()`);
  eq('the interface switches language', await b.evaluate(`[
    document.documentElement.lang,
    document.querySelector('.seg[data-mode=read]').textContent,
    document.getElementById('find').title,
    document.querySelector('.popover .settings-title')?.textContent,
  ]`), ['ru', 'Чтение', 'Поиск (⌘F)', 'Настройки']);
  await b.evaluate(`(() => {
    const select = document.querySelector('.popover .settings-select');
    select.value = 'ar';
    select.dispatchEvent(new Event('change'));
  })()`);
  eq('arabic mirrors the chrome, not the note', await b.evaluate(`[
    document.documentElement.dir,
    getComputedStyle(document.getElementById('doc')).direction,
  ]`), ['rtl', 'ltr']);
  await b.evaluate(`(() => {
    const select = document.querySelector('.popover .settings-select');
    select.value = 'en';
    select.dispatchEvent(new Event('change'));
  })()`);
  eq('and back to english', await b.evaluate(`[document.documentElement.dir, document.querySelector('.seg[data-mode=edit]').textContent]`), ['ltr', 'Edit']);
});

await scenario('---\ntags: [a]\n---\n\n# **Note**\n\nText\n', async (b) => {
  eq('front matter and emphasis do not defeat the duplicate check', await title(b), null);
});

await scenario('Text\n', async (b) => {
  const shown = `['Folder', 'Folder/Sub', 'Folder/Sub/Deep.md', 'Folder/assets', 'Folder/assets/Pic']
    .map((path) => Boolean(document.querySelector('.tree-item[data-path="' + path + '"]')))`;
  await b.click('#collapse-all', 'start');
  eq('collapse all closes every folder', await b.evaluate(shown), [true, false, false, false, false]);
  await b.click('#expand-all', 'start');
  eq('expand all opens them, but not assets', await b.evaluate(shown), [true, true, true, true, false]);
  await b.click('.tree-item[data-path="Folder/assets"]', 'start');
  await b.click('#collapse-all', 'start');
  await b.click('#expand-all', 'start');
  eq('collapse all closes an opened assets folder too', await b.evaluate(shown), [true, true, true, true, false]);
}, { 'Folder/Sub/Deep.md': 'Deep\n', 'Folder/assets/Pic/dot.png': PIXEL });

await scenario('Top\n\n**One** - a.\n**Two** - b.\n', async (b) => {
  eq('each line of a paragraph is a block', await b.view(), ['block--paragraph:Top', 'block--paragraph:One - a.', 'block--paragraph block--joined:Two - b.']);
  const gap = `(() => { const [a, c] = [...document.querySelectorAll('#doc > *')].slice(1).map((n) => n.getBoundingClientRect()); return Math.round(c.top - a.bottom); })()`;
  eq('the lines sit without a gap', await b.evaluate(gap), 0);
  await b.click('#doc > .block--joined');
  eq('a click opens just that line', await b.view(), ['block--paragraph:Top', 'block--paragraph:One - a.', '[**Two** - b.|]']);
  eq('the open line does not move', await b.evaluate(gap), 0);
  await b.press('ArrowUp');
  eq('arrow up opens the line above', (await b.view())[1], '[**One** - a.|]');
  await b.type('!');
  await b.press('Escape');
  eq('the edit lands on that line', await b.text(), 'Top\n\n**One** - a.!\n**Two** - b.\n');
});

await scenario('> [!note] \n> **Disks**\n> Vault_A, Vault_B\n\nAfter\n', async (b) => {
  eq('a callout renders with its title', await b.view(), ['block--quote:\nNote\nDisks\nVault_A, Vault_B', 'block--paragraph:After']);
  await b.click('#doc > .block--quote');
  eq('a click opens its source', (await b.view())[0].startsWith('[> [!note]'), true);
});

const cellState = (b) => b.evaluate(`(() => {
  const open = document.querySelector('#doc .cell--editing');
  return {
    textarea: Boolean(document.querySelector('#doc textarea')),
    cell: open ? [Number(open.dataset.row), Number(open.dataset.col), open.textContent] : null,
    focused: open ? document.activeElement === open : false,
  };
})()`);
const TABLE = 'Intro\n\n| Name | Size |\n| --- | --- |\n| **a** | 1 |\n\nAfter\n';

await scenario(TABLE, async (b) => {
  await b.click('#doc td[data-row="1"][data-col="0"]');
  eq('a click opens one cell, not the table source', await cellState(b), { textarea: false, cell: [1, 0, '**a**'], focused: true });
  await b.type('b');
  eq('typing writes into that cell only', await b.text(), 'Intro\n\n| Name | Size |\n| --- | --- |\n| **a**b | 1 |\n\nAfter\n');
  await b.press('Tab');
  eq('Tab goes to the next cell', (await cellState(b)).cell, [1, 1, '1']);
  await b.press('Tab');
  eq('Tab past the last cell adds a row', (await cellState(b)).cell, [2, 0, '']);
  await b.type('c');
  eq('the new row is written', await b.text(), 'Intro\n\n| Name | Size |\n| --- | --- |\n| **a**b | 1 |\n| c |  |\n\nAfter\n');
  eq('the closed cell renders again', await b.evaluate(`document.querySelector('#doc td[data-row="1"][data-col="0"]').innerHTML`), '<strong>a</strong>b');
  await b.press('z', 4);
  eq('undo reopens the cell it steps back in', (await cellState(b)).cell, [2, 0, '']);
  eq('undo steps back', await b.text(), 'Intro\n\n| Name | Size |\n| --- | --- |\n| **a**b | 1 |\n|  |  |\n\nAfter\n');
});

await scenario(TABLE, async (b) => {
  await b.click('#doc > .block--paragraph');
  await b.press('ArrowDown');
  eq('arrow down from the text above opens the header', (await cellState(b)).cell?.slice(0, 2), [0, 0]);
  await b.press('ArrowDown');
  await b.press('ArrowDown');
  eq('arrow down past the last row leaves the table', (await b.view()).at(-1), '[|After]');
  await b.press('ArrowUp');
  eq('arrow up comes back into the last row', (await cellState(b)).cell?.slice(0, 2), [1, 0]);
  await b.press('Enter');
  eq('Enter on the last row starts a block below', (await b.view()).at(-2), '[|]');
  await b.type('New');
  await b.press('Escape');
  eq('the block lands after the table', await b.text(), 'Intro\n\n| Name | Size |\n| --- | --- |\n| **a** | 1 |\n\nNew\n\nAfter\n');
});

await scenario(TABLE, async (b) => {
  await b.evaluate(`document.querySelector('#doc .table-tool--add-row').click()`);
  eq('the row bar adds a row and opens it', (await cellState(b)).cell, [2, 0, '']);
  await b.evaluate(`document.querySelector('#doc .table-tool--add-col').click()`);
  eq('the column bar adds a column and opens its header', (await cellState(b)).cell, [0, 2, '']);
  eq('both land in the text', await b.text(), 'Intro\n\n| Name | Size |  |\n| --- | --- | --- |\n| **a** | 1 |  |\n|  |  |  |\n\nAfter\n');
  await b.press('Backspace');
  eq('Backspace in an empty column removes it', (await cellState(b)).cell, [0, 1, 'Size']);
  await b.click('#doc td[data-row="2"][data-col="1"]');
  await b.press('Backspace');
  eq('Backspace in an empty row removes it', (await cellState(b)).cell, [1, 1, '1']);
  eq('the table is back to how it was', await b.text(), 'Intro\n\n| Name | Size |\n| --- | --- |\n| **a** | 1 |\n\nAfter\n');
});

await scenario('| A | B |\n| - | - |\n| x |  |\n|  |  |\n', async (b) => {
  const hover = async (selector) => {
    const box = await b.evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
    await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))`);
    return box;
  };
  const tools = `['drop-row', 'drop-col'].map((name) => !document.querySelector('#doc .table-tool--' + name).hidden)`;
  await hover('#doc td[data-row="1"][data-col="0"]');
  eq('a row with text offers no ×', await b.evaluate(tools), [false, false]);
  await hover('#doc td[data-row="2"][data-col="1"]');
  eq('an empty row offers a ×', await b.evaluate(tools), [true, false]);
  await b.evaluate(`document.querySelector('#doc .table-tool--drop-row').click()`);
  eq('the × removes it', await b.text(), '| A | B |\n| --- | --- |\n| x |  |\n');
  eq('read mode hides the controls', await b.evaluate(`(() => {
    document.querySelector('.seg[data-mode=read]').click();
    return getComputedStyle(document.querySelector('#doc .table-tool--add-row')).display;
  })()`), 'none');
});

await scenario('| A | B |\n| - | - |\n| one | x |\n| y | z |\n', async (b) => {
  await b.click('#doc td[data-row="1"][data-col="0"]');
  await b.press('Enter', 2);
  eq('Ctrl+Enter breaks the line inside the cell', await cellState(b), { textarea: false, cell: [1, 0, 'one\n'], focused: true });
  const lines = `(() => { const c = document.querySelector('#doc .cell--editing'); const st = getComputedStyle(c); return Math.round((c.clientHeight - parseFloat(st.paddingTop) - parseFloat(st.paddingBottom)) / parseFloat(st.lineHeight)); })()`;
  eq('the new empty line shows', await b.evaluate(lines), 2);
  await b.type('two');
  eq('it is written as <br>', await b.text(), '| A | B |\n| - | - |\n| one<br>two | x |\n| y | z |\n');
  await b.press('ArrowUp');
  eq('arrow up moves within the cell first', (await cellState(b)).cell, [1, 0, 'one\ntwo']);
  await b.press('ArrowDown');
  await b.press('ArrowDown');
  eq('and leaves it from its last line', (await cellState(b)).cell?.slice(0, 2), [2, 0]);
  eq('the closed cell renders the break', await b.evaluate(`document.querySelector('#doc td[data-row="1"][data-col="0"]').innerHTML`), 'one<br>two');
  eq('cells align to the top', await b.evaluate(`getComputedStyle(document.querySelector('#doc td')).verticalAlign`), 'top');
});

await scenario('Text\n', async (b) => {
  await b.click('#doc > .block--paragraph');
  await b.evaluate(`document.querySelector('[data-action=table]').click()`);
  eq('a new table opens in its first header, below the text', await cellState(b), { textarea: false, cell: [0, 0, 'Column'], focused: true });
  await b.type('Name');
  await b.press('Escape');
  eq('and the header takes the typing', await b.text(), 'Text\n\n| Name | Column |\n| --- | --- |\n|  |  |\n');
});

/**
 * A writable folder in memory behind `showDirectoryPicker`, so the page opens
 * it as it would a real one. `window.__fs` maps each path to its text, or to
 * a Blob for a file written from one.
 */
const memoryFolder = (files) => `(() => {
  const fs = window.__fs = new Map(Object.entries(${JSON.stringify(files)}));
  const join = (dir, name) => (dir ? dir + '/' + name : name);
  const file = (path) => ({
    kind: 'file',
    name: path.split('/').pop(),
    async getFile() { return new File([fs.get(path)], path.split('/').pop()); },
    async createWritable() {
      const parts = [];
      return {
        async write(data) { parts.push(data); },
        async close() { fs.set(path, parts.every((part) => typeof part === 'string') ? parts.join('') : new Blob(parts)); },
      };
    },
  });
  const dir = (path) => ({
    kind: 'directory',
    name: path ? path.split('/').pop() : 'Vault',
    async *values() {
      const seen = new Set();
      for (const key of fs.keys()) {
        if (path && !key.startsWith(path + '/')) continue;
        const [head, ...rest] = (path ? key.slice(path.length + 1) : key).split('/');
        if (seen.has(head)) continue;
        seen.add(head);
        yield rest.length ? dir(join(path, head)) : file(join(path, head));
      }
    },
    async getFileHandle(name, options) {
      const target = join(path, name);
      if (!fs.has(target)) {
        if (!options?.create) throw new DOMException('missing', 'NotFoundError');
        fs.set(target, '');
      }
      return file(target);
    },
    async getDirectoryHandle(name) { return dir(join(path, name)); },
    async removeEntry(name) {
      const target = join(path, name);
      for (const key of [...fs.keys()]) if (key === target || key.startsWith(target + '/')) fs.delete(key);
    },
    async queryPermission() { return 'granted'; },
    async requestPermission() { return 'granted'; },
  });
  window.showDirectoryPicker = async () => dir('');
})()`;

await scenario('Note\n', async (b) => {
  await b.evaluate(memoryFolder({
    'A.md': '# A\n\nText\n',
    'sub/B.md': 'B text\n',
    '.meta.json': JSON.stringify({ notes: { 'A.md': { tags: ['work/alpha'] }, 'sub/B.md': { tags: ['idea'] }, 'gone.md': { tags: ['stale'] } } }),
  }));
  await b.evaluate(`document.getElementById('vault-name').click()`);
  await b.sleep(300);
  const clickRow = (selector, text) => b.evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].find((n) => n.textContent.includes(${JSON.stringify(text)})).click()`);
  const files = `[...document.querySelectorAll('#tree .tree-label')].map((n) => n.textContent)`;
  const tags = `[...document.querySelectorAll('#tag-tree .tree-item')].map((n) => n.textContent)`;
  const bar = `[...document.querySelectorAll('#note-tags > *')].map((n) => n.className === 'tag-add' ? '+' : n.querySelector('.tag-chip-label').textContent)`;
  const stored = async () => JSON.parse(await b.evaluate(`window.__fs.get('.meta.json')`)).notes;

  eq('.meta.json stays out of the file tree', await b.evaluate(files), ['sub', 'B', 'A']);
  eq('the tag tree nests, and leaves out notes that are gone', await b.evaluate(tags), ['#idea1', '▾work1', '#alpha1']);

  await clickRow('#tree .tree-item', 'A');
  eq('the note shows its tags and a +', await b.evaluate(bar), ['#work/alpha', '+']);
  await b.evaluate(`document.querySelector('#note-tags .tag-add').click()`);
  eq('the + turns into a field', await b.evaluate(`document.activeElement.className`), 'tag-input');
  await b.type('#Idea');
  await b.press('Enter');
  await b.sleep(100);
  eq('the tag takes the known spelling, the + moves after it', await b.evaluate(bar), ['#work/alpha', '#idea', '+']);
  eq('and lands in .meta.json', (await stored())['A.md'], { tags: ['work/alpha', 'idea'] });
  eq('the tag tree counts it', await b.evaluate(tags), ['#idea2', '▾work1', '#alpha1']);
  eq('entries of missing notes are kept in the file', (await stored())['gone.md'], { tags: ['stale'] });

  await b.evaluate(`document.querySelector('#note-tags .tag-add').click()`);
  await b.press('Escape');
  eq('Escape leaves the tags as they were', await b.evaluate(bar), ['#work/alpha', '#idea', '+']);

  await clickRow('#tag-tree .tree-item', 'idea');
  const page = `[...document.querySelectorAll('#tag-page .tag-note-open')].map((n) => n.textContent)`;
  eq('a tag opens the list of its notes', await b.evaluate(page), ['A', 'Bsub']);
  eq('in place of the note', await b.evaluate(`[document.getElementById('doc').hidden, document.getElementById('note-tags').hidden, document.getElementById('status-state').textContent]`), [true, true, 'read-only']);
  eq('with nothing to format', await b.evaluate(`getComputedStyle(document.getElementById('format')).pointerEvents`), 'none');

  await clickRow('#tag-tree .tree-item', 'work');
  eq('a parent tag lists the notes of the tags under it', await b.evaluate(page), ['A']);
  await b.evaluate(`document.querySelector('#tag-tree .tree-mark--toggle').click()`);
  eq('its arrow folds it', await b.evaluate(tags), ['#idea2', '▸work1']);

  await clickRow('#tag-page .tag-chip-label', '#work/alpha');
  eq('a chip on the list opens its own tag', await b.evaluate(`document.getElementById('status-path').textContent`), '#work/alpha');
  await clickRow('#tag-tree .tree-item', 'idea');
  await clickRow('#tag-page .tag-note-open', 'B');
  eq('a note opens from the list', await b.evaluate(`[document.getElementById('tag-page').hidden, document.getElementById('status-path').textContent]`), [true, 'sub/B.md']);
  await b.evaluate(`document.querySelector('#note-tags .tag-remove').click()`);
  await b.sleep(100);
  eq('× removes a tag', await b.evaluate(bar), ['+']);
  eq('a note without tags leaves the file', Object.keys(await stored()), ['A.md', 'gone.md']);

  // Renaming a folder carries its notes' tags along.
  await b.evaluate(`document.querySelector('#note-tags .tag-add').click()`);
  await b.type('later');
  await b.press('Enter');
  await b.sleep(100);
  await b.evaluate(`document.querySelector('#tree .tree-item[data-path="sub"]').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 50, clientY: 50 }))`);
  await clickRow('.context-item', 'Rename');
  await b.evaluate(`(() => { const input = document.querySelector('.dialog-input'); input.value = 'moved'; input.form.requestSubmit(); })()`);
  await b.sleep(300);
  eq('a renamed folder keeps its notes\' tags', (await stored())['moved/B.md'], { tags: ['later'] });
  eq('the old path is gone', (await stored())['sub/B.md'], undefined);
  eq('the open note still shows them', await b.evaluate(bar), ['#later', '+']);

  const height = `document.getElementById('tags').offsetHeight`;
  const before = await b.evaluate(height);
  await b.drag('#tags-resizer', 50);
  const lowered = await b.evaluate(height);
  eq('dragging the rule down lowers the tag section', Math.abs(lowered - Math.max(72, before - 50)) <= 1, true);
  eq('and the height is remembered', await b.evaluate(`JSON.parse(localStorage.getItem('markdown-catalog-editor')).tagsHeight`), lowered);
  await b.drag('#tags-resizer', -2000);
  eq('dragging up gives back no more than the section had', await b.evaluate(height), before);
  eq('which clears the cap', await b.evaluate(`document.getElementById('tags').style.getPropertyValue('--tags-height')`), '');
});

/** Pastes a PNG named `name` into the focused element, with `text` beside it; true when the editor took it. */
const pasteImage = (b, name, text = '') => b.evaluate(`(() => {
  const bytes = Uint8Array.from(atob(${JSON.stringify(PIXEL.toString('base64'))}), (c) => c.charCodeAt(0));
  const data = new DataTransfer();
  data.items.add(new File([bytes], ${JSON.stringify(name)}, { type: 'image/png' }));
  if (${JSON.stringify(text)}) data.setData('text/plain', ${JSON.stringify(text)});
  const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
  document.activeElement.dispatchEvent(event);
  return event.defaultPrevented;
})()`);

await scenario('Note\n', async (b) => {
  await b.evaluate(memoryFolder({ 'Note.md': 'Intro\n', 'assets/Note/image-1.png': 'taken' }));
  await b.evaluate(`document.getElementById('vault-name').click()`);
  await b.sleep(300);
  const stored = (path) => b.evaluate(`(() => { const v = window.__fs.get(${JSON.stringify(path)}); return v === undefined ? null : v instanceof Blob ? v.size : v; })()`);
  const saved = async () => {
    await b.press('s', 4);
    await b.sleep(100);
    return stored('Note.md');
  };

  await b.click('#doc > .block--paragraph');
  await b.press('Enter');
  eq('a pasted image is taken over from the text', await pasteImage(b, 'image.png'), true);
  await b.sleep(200);
  eq('and saved in the note\'s assets under the next free name', await stored('assets/Note/image-2.png'), PIXEL.length);
  eq('its embed goes in at the caret', await b.view(), ['block--paragraph:Intro', '[![[image-2.png]]|]']);
  eq('and into the note', await saved(), 'Intro\n\n![[image-2.png]]\n');
  await b.press('Escape');
  await b.sleep(200);
  eq('the picture shows once the block closes', await b.evaluate(`document.querySelector('img.embed')?.naturalWidth`), 1);

  await b.click('#doc > .block--paragraph');
  eq('cells copied from a spreadsheet paste as their text, not their picture', await pasteImage(b, 'image.png', 'a\tb'), false);
  eq('a file copied in the file manager brings its name as text, and is still a picture', await pasteImage(b, 'dot.png', 'dot.png'), true);
  await b.sleep(200);
  eq('it keeps its own name', await stored('assets/Note/dot.png'), PIXEL.length);
  eq('and nothing is saved for the spreadsheet', await stored('assets/Note/image-3.png'), null);

  // The toolbar button opens the file picker and leaves the block open.
  await b.evaluate(`document.getElementById('image-picker').click = () => { window.__picking = true; }`);
  await b.evaluate(`document.getElementById('image').click()`);
  eq('the image button opens the file picker', await b.evaluate(`[window.__picking, document.activeElement.tagName]`), [true, 'TEXTAREA']);

  await b.press('Escape');
  await b.evaluate(`(() => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(PIXEL.toString('base64'))}), (c) => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], 'My [pic].png', { type: 'image/png' }));
    data.items.add(new File(['x'], 'photo.heic', { type: 'image/heic' }));
    const input = document.getElementById('image-picker');
    input.files = data.files;
    input.dispatchEvent(new Event('change'));
  })()`);
  await b.sleep(300);
  eq('a picked file loses the characters that would break its embed', await stored('assets/Note/My -pic-.png'), PIXEL.length);
  eq('a file the editor cannot show is refused', await b.evaluate(`document.querySelector('.toast')?.textContent`), 'Not an image the editor can show: photo.heic');
  eq('with no block open, the embed gets a block of its own at the end', (await b.view()).at(-1), '[![[My -pic-.png]]|]');
  eq('which the note keeps', await saved(), 'Intro![[dot.png]]\n\n![[image-2.png]]\n\n![[My -pic-.png]]\n');
  await b.press('Escape');
  await b.click('.tree-item[data-path="assets"]', 'start');
  eq('the tree shows the new files', await b.evaluate(`[...document.querySelectorAll('.tree-item[data-path^="assets/Note/"]')].map((n) => n.dataset.path)`),
    ['assets/Note/dot.png', 'assets/Note/image-1.png', 'assets/Note/image-2.png', 'assets/Note/My -pic-.png']);
});

await scenario('Text\n', async (b) => {
  await b.evaluate(memoryFolder({ 'Note.md': '| A |\n| --- |\n| b |\n' }));
  await b.evaluate(`document.getElementById('vault-name').click()`);
  await b.sleep(300);
  await b.click('#doc td');
  eq('an image pasted into a table cell', await pasteImage(b, 'image.png'), true);
  await b.sleep(200);
  eq('lands in the cell', await cellState(b), { textarea: false, cell: [1, 0, 'b![[image-1.png]]'], focused: true });
});

/**
 * Drops files on the element `target` (a JS expression) at its start, its end
 * or below it, the way a click lands there. A `.png` name is a picture.
 */
const dropFiles = (b, target, where, names) => b.evaluate(`(() => {
  const r = (${target}).getBoundingClientRect();
  const x = ${JSON.stringify(where)} === 'end' ? r.right - 2 : r.left + 2;
  const y = ${JSON.stringify(where)} === 'below' ? r.bottom + 30 : r.top + Math.min(r.height / 2, 10);
  const bytes = Uint8Array.from(atob(${JSON.stringify(PIXEL.toString('base64'))}), (c) => c.charCodeAt(0));
  const data = new DataTransfer();
  for (const name of ${JSON.stringify(names)}) {
    data.items.add(name.endsWith('.png') ? new File([bytes], name, { type: 'image/png' }) : new File(['text'], name));
  }
  document.elementFromPoint(x, y).dispatchEvent(new DragEvent('drop', { dataTransfer: data, clientX: x, clientY: y, bubbles: true, cancelable: true }));
})()`);

await scenario('Text\n', async (b) => {
  await b.evaluate(memoryFolder({ 'Note.md': 'One\n\nTwo\n\n| A |\n| --- |\n| b |\n\nEnd\n' }));
  await b.evaluate(`document.getElementById('vault-name').click()`);
  await b.sleep(300);
  const note = async () => {
    await b.press('s', 4);
    await b.sleep(100);
    return b.evaluate(`window.__fs.get('Note.md')`);
  };
  const paragraph = (n) => `document.querySelectorAll('#doc > .block--paragraph')[${n}]`;
  const mode = `document.querySelector('.seg--on')?.dataset.mode`;

  await dropFiles(b, paragraph(1), 'end', ['image.png']);
  await b.sleep(200);
  eq('a picture dropped on a block goes in where it lands', (await b.view()).slice(0, 2), ['block--paragraph:One', '[Two![[image-1.png]]|]']);
  eq('and is saved beside the note', await b.evaluate(`window.__fs.get('assets/Note/image-1.png') instanceof Blob`), true);

  await dropFiles(b, `document.querySelector('#doc textarea')`, 'start', ['image.png']);
  await b.sleep(200);
  eq('dropped on the open block, at the point in its text', (await b.view())[1], '[![[image-2.png]]|Two![[image-1.png]]]');

  await dropFiles(b, `document.querySelector('#doc td')`, 'end', ['image.png']);
  await b.sleep(200);
  eq('dropped on a table cell, into that cell', await cellState(b), { textarea: false, cell: [1, 0, 'b![[image-3.png]]'], focused: true });

  await b.evaluate(`document.querySelector('.seg[data-mode=read]').click()`);
  await dropFiles(b, `document.querySelector('#doc > .block:last-child')`, 'below', ['image.png']);
  await b.sleep(200);
  eq('below the text, at the end of the last block', (await b.view()).at(-1), '[End![[image-4.png]]|]');
  eq('a drop in read mode switches to editing', await b.evaluate(mode), 'edit');

  await b.evaluate(`document.querySelector('.seg[data-mode=read]').click()`);
  await dropFiles(b, `document.getElementById('tree')`, 'start', ['image.png', 'notes.md']);
  await b.sleep(300);
  eq('off the note, in a block of its own at the end', (await b.view()).at(-1), '[![[image-5.png]]|]');
  eq('a file that is no picture is left out', await b.evaluate(`document.querySelector('.toast')?.textContent`), 'Not an image the editor can show: notes.md');

  await dropFiles(b, paragraph(0), 'end', ['other.md']);
  await b.sleep(200);
  eq('a drop with no picture is still a folder to open', await b.evaluate(`document.querySelector('.toast')?.textContent`), 'Drag a folder, not a single file');
  eq('the note has every picture, and only those', await note(),
    'One\n\n![[image-2.png]]Two![[image-1.png]]\n\n| A |\n| --- |\n| b![[image-3.png]] |\n\nEnd![[image-4.png]]\n\n![[image-5.png]]\n');
});

await scenario('Text\n', async (b) => {
  await dropFiles(b, `document.querySelector('#doc > .block--paragraph')`, 'end', ['image.png']);
  await b.sleep(100);
  eq('a read-only folder refuses a dropped picture', await b.evaluate(`document.querySelector('.toast')?.textContent`), 'The folder is open read-only');
  eq('and leaves the note alone', await b.text(), 'Text\n');
});

await scenario('Text\n', async (b) => {
  await b.click('#doc > .block--paragraph');
  eq('a read-only folder takes the pasted image too', await pasteImage(b, 'image.png'), true);
  await b.sleep(100);
  eq('and says why it cannot keep it', await b.evaluate(`document.querySelector('.toast')?.textContent`), 'The folder is open read-only');
  eq('the text stays as it was', await b.text(), 'Text\n');
});

console.log(`${passed} browser checks passed${failed ? `, ${failed} failed` : ''}`);
process.exit(failed ? 1 : 0);
