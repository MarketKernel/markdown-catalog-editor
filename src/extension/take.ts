/**
 * What the extension takes from a tab, for the context menu (background.ts)
 * and the popup (popup.ts) alike: grab.ts, run in the page, gives the
 * selection or the page's text as HTML. A page no extension may read — the
 * browser's own, the Web Store, a PDF — goes as a link to it.
 */

import { describe, grab } from './grab';
import { sentKey, type Sent } from './messages';

/** The frame the menu was opened in, or the page itself. */
function targetOf(tab: chrome.tabs.Tab, frameId?: number): chrome.scripting.InjectionTarget {
  return { tabId: tab.id ?? -1, frameIds: [frameId ?? 0] };
}

/** The selection, or the page's text when nothing is selected; null when there is nothing to send. */
export async function takeTab(tab: chrome.tabs.Tab, selectionOnly: boolean, frameId?: number, selectionText?: string): Promise<Sent | null> {
  const base = { windowId: tab.windowId, title: tab.title ?? '', url: tab.url ?? '', target: '', text: '' };
  try {
    const [result] = await chrome.scripting.executeScript({ target: targetOf(tab, frameId), func: grab, args: [selectionOnly] });
    const grabbed = result?.result;
    if (grabbed?.html.trim()) {
      return { ...base, kind: grabbed.selection ? 'selection' : 'page', title: grabbed.title || base.title, url: grabbed.url || base.url, html: grabbed.html };
    }
  } catch {
    /* not a page the extension may read: below */
  }
  if (selectionText?.trim()) return { ...base, kind: 'selection', html: escapeHtml(selectionText) };
  if (/^(https?|file):/.test(base.url)) return { ...base, kind: 'link', html: '', target: base.url, text: base.title };
  return null;
}

/** A link or an image the context menu was opened on, with its text or description from the page. */
export async function takeTarget(tab: chrome.tabs.Tab, kind: 'link' | 'image', target: string, frameId?: number, selectionText?: string): Promise<Sent> {
  let text = selectionText?.trim() ?? '';
  if (!text) {
    try {
      const [result] = await chrome.scripting.executeScript({ target: targetOf(tab, frameId), func: describe, args: [kind, target] });
      text = result?.result ?? '';
    } catch {
      /* the address alone */
    }
  }
  return { kind, windowId: tab.windowId, title: tab.title ?? '', url: tab.url ?? '', html: '', target, text };
}

/** Into the session storage, where the panel of the window takes it; too large a page goes as a link to it. */
export async function putForPanel(sent: Sent): Promise<void> {
  try {
    await chrome.storage.session.set({ [sentKey(sent.windowId)]: sent });
  } catch {
    if (sent.html) await putForPanel({ ...sent, kind: 'link', html: '', target: sent.url, text: sent.title });
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
}
