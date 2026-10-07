/**
 * A headless Chrome for the browser tests, spoken to over a pipe with the
 * DevTools protocol — no dependencies beyond Node. Over a pipe, not a port:
 * only a pipe may load an unpacked extension (Extensions.loadUnpacked, with
 * --enable-unsafe-extension-debugging), since Chrome 137 dropped the
 * --load-extension flag.
 *
 * The Chrome is the local one, or CHROME=/path/to/chrome; a test without one
 * says so and passes.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const CHROME =
  process.env.CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((path) => existsSync(path));

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startChrome(extraFlags = []) {
  const profile = await mkdtemp(join(tmpdir(), 'macaed-chrome-'));
  const flags = [
    '--headless=new',
    '--remote-debugging-pipe',
    '--enable-unsafe-extension-debugging',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--window-size=1200,900',
    ...extraFlags,
  ];
  if (process.platform === 'linux') flags.push('--no-sandbox');
  const chrome = spawn(CHROME, [...flags, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  chrome.stderr.on('data', () => undefined);
  const [, , , input, output] = chrome.stdio;

  let lastId = 0;
  const waiting = new Map();
  const listeners = new Set();
  const names = new Map();
  /** Uncaught exceptions and console.error in any attached page or worker. */
  const errors = [];
  let buffer = '';
  output.on('data', (chunk) => {
    buffer += chunk;
    for (let end = buffer.indexOf('\0'); end >= 0; end = buffer.indexOf('\0')) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id && waiting.has(message.id)) {
        waiting.get(message.id)(message);
        waiting.delete(message.id);
        continue;
      }
      const from = names.get(message.sessionId) ?? '?';
      if (message.method === 'Runtime.exceptionThrown') errors.push(`${from}: ${message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text}`);
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(`${from}: ${message.params.args.map((a) => a.value ?? a.description).join(' ')}`);
      for (const listener of listeners) listener(message);
    }
  });

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++lastId;
      waiting.set(id, (message) => (message.error ? reject(new Error(`${method}: ${JSON.stringify(message.error)}`)) : resolve(message.result)));
      input.write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
    });

  async function attach(targetId, name = targetId) {
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    names.set(sessionId, name);
    await send('Runtime.enable', {}, sessionId);
    return sessionId;
  }

  /** Runs `expression` in the session; `gesture` makes it count as the user's doing, as a click would. */
  async function evaluate(sessionId, expression, gesture = false) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: gesture }, sessionId);
    if (result.exceptionDetails) throw new Error(`${expression}\n${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}`);
    return result.result.value;
  }

  /** Asks again until `expression` is true, through navigations and reloads. */
  async function until(sessionId, expression, timeout = 10000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      try {
        if (await evaluate(sessionId, expression)) return true;
      } catch {
        /* the page is still loading */
      }
      await sleep(60);
    }
    return false;
  }

  const targets = async () => (await send('Target.getTargets')).targetInfos;

  async function waitForTarget(match, timeout = 8000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const found = (await targets()).find(match);
      if (found) return found;
      await sleep(100);
    }
    return null;
  }

  /** Clicks the middle of the element, as a mouse would. */
  async function click(sessionId, selector) {
    const box = await evaluate(
      sessionId,
      `(() => { const n = document.querySelector(${JSON.stringify(selector)}); if (!n) return null; n.scrollIntoView({ block: 'nearest' }); const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`,
    );
    if (!box) throw new Error(`Nothing to click: ${selector}`);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box[0], y: box[1], button: 'left', clickCount: 1 }, sessionId);
    await sleep(80);
  }

  async function close() {
    chrome.kill();
    await new Promise((resolve) => (chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve)));
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }

  return { send, attach, evaluate, until, targets, waitForTarget, click, close, errors, listeners };
}
