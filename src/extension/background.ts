/**
 * The Chrome extension's service worker: the context menu, which sends a
 * page, a selection, a link or an image to the knowledge base. The toolbar
 * button opens the popup (popup.ts) and needs nothing here.
 *
 * The menu opens nothing: a side panel opening squeezes the page aside. With
 * the panel of the window open, what was sent goes there, and the editor asks
 * where it goes; with none, it goes to the end of the default note, as the
 * popup's Send to Markdown does (knowledge.ts) — or, with the knowledge base
 * closed, waits for a panel to open it. The button's badge says what
 * happened: a tick for a moment, and how many sendings wait — or "!" with
 * the reason in its title, until the next one.
 *
 * The click gives the extension that tab and nothing more (activeTab): it
 * has no standing access to any site. What it took goes to the panel through
 * chrome.storage.session (messages.ts). The worker has no DOM, so a page's or
 * a selection's HTML becomes Markdown in the offscreen document (offscreen.ts).
 */

import { DEFAULT_NOTE, type Clip } from '../clip';
import { detectLanguage, setLanguage, t, tn } from '../i18n';
import { isGranted, recentFolders } from '../recent';
import { baseOf, DirectoryVault } from '../vault';
import { clipOf, writeClip } from './knowledge';
import { DEFAULT_NOTE_KEY, LANGUAGE_KEY, NO_FOLDER, panelOpen, QUEUED_PREFIX, queuedKey, type MarkdownReply, type MarkdownRequest, type Queued, type Sent } from './messages';
import { putForPanel, takeTab, takeTarget } from './take';

type MenuId = 'page' | 'selection' | 'link' | 'image';

const MENUS: MenuId[] = ['page', 'selection', 'link', 'image'];

function titleOf(id: MenuId): string {
  switch (id) {
    case 'page':
      return t('extension', 'Send the page to Markdown');
    case 'selection':
      return t('extension', 'Send the selection to Markdown');
    case 'link':
      return t('extension', 'Send the link to Markdown');
    case 'image':
      return t('extension', 'Send the image to Markdown');
  }
}

/** The menus speak the panel's language once it has chosen one, the browser's until then. */
async function speak(): Promise<void> {
  const stored = (await chrome.storage.local.get(LANGUAGE_KEY))[LANGUAGE_KEY];
  setLanguage(detectLanguage([typeof stored === 'string' ? stored : chrome.i18n.getUILanguage()]));
}

async function createMenus(): Promise<void> {
  await speak();
  await chrome.contextMenus.removeAll();
  // Each item shows where its own thing is: the page anywhere, the selection on selected text, and so on.
  for (const id of MENUS) chrome.contextMenus.create({ id, title: titleOf(id), contexts: [id] });
}

chrome.runtime.onInstalled.addListener(() => void createMenus());
chrome.storage.local.onChanged.addListener(async (changes) => {
  if (Object.keys(changes).some((key) => key.startsWith(QUEUED_PREFIX))) void showWaiting();
  if (!changes[LANGUAGE_KEY]) return;
  await speak();
  for (const id of MENUS) chrome.contextMenus.update(id, { title: titleOf(id) }, () => void chrome.runtime.lastError);
  void showWaiting();
});

// The button opens the popup; the panel opens from there ("Full mode").
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab) void send(info, tab);
});

async function send(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab): Promise<void> {
  const panel = await panelOpen(tab.windowId);
  const id = info.menuItemId as MenuId;
  const sent =
    id === 'page' || id === 'selection'
      ? await takeTab(tab, id === 'selection', info.frameId, info.selectionText)
      : id === 'link' && info.linkUrl
        ? await takeTarget(tab, 'link', info.linkUrl, info.frameId, info.selectionText)
        : id === 'image' && info.srcUrl
          ? await takeTarget(tab, 'image', info.srcUrl, info.frameId)
          : null;
  if (!sent) return;
  if (panel) return putForPanel(sent);
  await speak();
  failure = null;
  try {
    await toDefaultNote(sent);
  } catch (error) {
    // Not even put aside: the panel of the window gets it when it opens, as the menu did before.
    await putForPanel(sent);
    fail(error);
  }
}

/**
 * To the end of the default note: written now while the browser lets the
 * extension in, else put aside for when a panel opens the knowledge base —
 * and put aside too when the write fails, the reason on the button. Put
 * aside as it was sent when it could not be made Markdown here.
 */
async function toDefaultNote(sent: Sent): Promise<void> {
  const [base] = await recentFolders();
  const stored = (await chrome.storage.local.get(DEFAULT_NOTE_KEY))[DEFAULT_NOTE_KEY];
  const path = typeof stored === 'string' && stored ? stored : DEFAULT_NOTE;
  let clip: Clip | null = null;
  let error: unknown = null;
  try {
    clip = await clipOf(sent, toMarkdown);
  } catch (reason) {
    error = reason;
  }
  if (base && clip && (await isGranted(base.handle))) {
    try {
      await writeClip(new DirectoryVault(base.handle, true), base.id, path, clip, toMarkdown, sent.windowId);
      flash('✓', '#2e7d4f', t('clip', 'Added to the end of {name}', { name: baseOf(path) }));
      return;
    } catch (reason) {
      error = reason;
    }
  }
  const queued: Queued = { folder: base?.id ?? NO_FOLDER, path, ...(clip ? { clip } : { sent }) };
  await chrome.storage.local.set({ [queuedKey()]: queued });
  if (error) fail(error);
  else if (!base) flash('…', '#b26a00', t('popup', 'There is no knowledge base yet: open a folder of notes in full mode.'));
  else flash('…', '#b26a00', t('popup', 'It goes to the end of {name} once "{base}" opens', { name: baseOf(path), base: base.name }));
}

/*
 * HTML into Markdown, in the offscreen document. It is made for the first
 * sending and closed once none is left; making and closing go one after the
 * other, so a sending never finds it half made or on its way out.
 */

const OFFSCREEN = 'offscreen.html';
let converting = 0;
/** The last making or closing of the document; `open`: the last one was a making. */
let lifecycle: Promise<unknown> = Promise.resolve();
let open = false;

function makeOffscreen(): Promise<void> {
  return chrome.offscreen
    .createDocument({ url: OFFSCREEN, reasons: [chrome.offscreen.Reason.DOM_PARSER], justification: 'Turns the HTML of a page or a selection sent from the context menu into Markdown.' })
    .catch((error: unknown) => {
      // Left from before the worker last stopped: that one serves.
      if (!/single offscreen/i.test(String(error))) throw error;
    });
}

async function toMarkdown(html: string, url: string): Promise<string> {
  converting += 1;
  try {
    if (!open) {
      open = true;
      lifecycle = lifecycle.catch(() => undefined).then(makeOffscreen);
      lifecycle.catch(() => (open = false));
    }
    await lifecycle;
    const request: MarkdownRequest = { to: 'offscreen', type: 'markdown', html, url };
    const reply = (await chrome.runtime.sendMessage(request)) as MarkdownReply | undefined;
    if (typeof reply?.markdown !== 'string') throw new Error('No Markdown from the offscreen document');
    return reply.markdown;
  } finally {
    converting -= 1;
    if (!converting && open) {
      open = false;
      lifecycle = lifecycle.catch(() => undefined).then(() => chrome.offscreen.closeDocument().catch(() => undefined));
    }
  }
}

/* The button's badge */

let flashing = 0;
/** Why the last sending was not written, until the next one: on the button. */
let failure: string | null = null;

/** For a few seconds, what just happened; then the count of what waits. */
function flash(text: string, color: string, title: string): void {
  void chrome.action.setBadgeBackgroundColor({ color });
  void chrome.action.setBadgeText({ text });
  void chrome.action.setTitle({ title });
  clearTimeout(flashing);
  flashing = setTimeout(() => {
    flashing = 0;
    void showWaiting();
  }, 4000);
}

function fail(error: unknown): void {
  clearTimeout(flashing);
  flashing = 0;
  failure = t('toast', 'Could not save: {reason}', { reason: error instanceof Error ? error.message : String(error) });
  void showWaiting();
}

/** What waits for the knowledge base to open, counted on the button — or why the last sending failed. */
async function showWaiting(): Promise<void> {
  if (flashing) return;
  if (failure) {
    void chrome.action.setBadgeBackgroundColor({ color: '#c0392b' });
    void chrome.action.setBadgeText({ text: '!' });
    void chrome.action.setTitle({ title: failure });
    return;
  }
  const all = await chrome.storage.local.get(null);
  const count = Object.keys(all).filter((key) => key.startsWith(QUEUED_PREFIX)).length;
  void chrome.action.setBadgeBackgroundColor({ color: '#b26a00' });
  void chrome.action.setBadgeText({ text: count ? String(count) : '' });
  void chrome.action.setTitle({
    title: count ? tn('extension', '{count} sending waits for the knowledge base to open', '{count} sendings wait for the knowledge base to open', count) : chrome.i18n.getMessage('actionTitle'),
  });
}

void speak().then(showWaiting);
