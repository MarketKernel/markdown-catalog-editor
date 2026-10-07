/**
 * The Chrome extension's service worker: the toolbar button, its keyboard
 * shortcut and the context menu send a page, a selection, a link or an image
 * to the side panel, where the editor saves it as a note.
 *
 * Chrome opens the side panel only from inside the click's handler, before
 * any await — so the panel is opened first, and what was sent is read from
 * the tab after (grab.ts, run in the page with executeScript). The click gives
 * the extension that tab and nothing more (activeTab): it has no standing
 * access to any site. What it took goes to the panel through
 * chrome.storage.session (messages.ts).
 */

import { detectLanguage, setLanguage, t } from '../i18n';
import { describe, grab } from './grab';
import { LANGUAGE_KEY, sentKey, type Sent } from './messages';

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
  if (!changes[LANGUAGE_KEY]) return;
  await speak();
  for (const id of MENUS) chrome.contextMenus.update(id, { title: titleOf(id) }, () => void chrome.runtime.lastError);
});

// The button sends the page (or what is selected on it); Chrome's own setting would only open the panel.
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

function openPanel(windowId: number): void {
  chrome.sidePanel.open({ windowId }).catch(() => undefined);
}

chrome.action.onClicked.addListener((tab) => {
  openPanel(tab.windowId);
  void sendTab(tab, false);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;
  openPanel(tab.windowId);
  const id = info.menuItemId as MenuId;
  if (id === 'page' || id === 'selection') void sendTab(tab, id === 'selection', info.frameId, info.selectionText);
  else if (id === 'link' && info.linkUrl) void sendTarget(tab, 'link', info.linkUrl, info.frameId, info.selectionText);
  else if (id === 'image' && info.srcUrl) void sendTarget(tab, 'image', info.srcUrl, info.frameId);
});

/** The frame the menu was opened in, or the page itself. */
function targetOf(tab: chrome.tabs.Tab, frameId?: number): chrome.scripting.InjectionTarget {
  return { tabId: tab.id ?? -1, frameIds: [frameId ?? 0] };
}

/**
 * The selection, or the page's text when nothing is selected. A page no
 * extension may read — the browser's own, the Web Store, a PDF — goes as a
 * link to it.
 */
async function sendTab(tab: chrome.tabs.Tab, selectionOnly: boolean, frameId?: number, selectionText?: string): Promise<void> {
  const base = { windowId: tab.windowId, title: tab.title ?? '', url: tab.url ?? '', target: '', text: '' };
  try {
    const [result] = await chrome.scripting.executeScript({ target: targetOf(tab, frameId), func: grab, args: [selectionOnly] });
    const grabbed = result?.result;
    if (grabbed?.html.trim()) {
      await put({ ...base, kind: grabbed.selection ? 'selection' : 'page', title: grabbed.title || base.title, url: grabbed.url || base.url, html: grabbed.html });
      return;
    }
  } catch {
    /* not a page the extension may read: below */
  }
  if (selectionText?.trim()) await put({ ...base, kind: 'selection', html: escapeHtml(selectionText) });
  else if (base.url) await put({ ...base, kind: 'link', html: '', target: base.url, text: base.title });
}

async function sendTarget(tab: chrome.tabs.Tab, kind: 'link' | 'image', target: string, frameId?: number, selectionText?: string): Promise<void> {
  let text = selectionText?.trim() ?? '';
  if (!text) {
    try {
      const [result] = await chrome.scripting.executeScript({ target: targetOf(tab, frameId), func: describe, args: [kind, target] });
      text = result?.result ?? '';
    } catch {
      /* the address alone */
    }
  }
  await put({ kind, windowId: tab.windowId, title: tab.title ?? '', url: tab.url ?? '', html: '', target, text });
}

/** Into the session storage, where the panel of the window takes it; too large a page goes as a link to it. */
async function put(sent: Sent): Promise<void> {
  try {
    await chrome.storage.session.set({ [sentKey(sent.windowId)]: sent });
  } catch {
    if (sent.html) await put({ ...sent, kind: 'link', html: '', target: sent.url, text: sent.title });
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}
