/**
 * The Chrome extension's service worker: the context menu, which sends a
 * page, a selection, a link or an image to the side panel, where the editor
 * asks where it goes. The toolbar button opens the popup (popup.ts) and needs
 * nothing here.
 *
 * Chrome opens the side panel only from inside the click's handler, before
 * any await — so the panel is opened first, and what was sent is read from
 * the tab after (take.ts). The click gives the extension that tab and nothing
 * more (activeTab): it has no standing access to any site. What it took goes
 * to the panel through chrome.storage.session (messages.ts).
 */

import { detectLanguage, setLanguage, t } from '../i18n';
import { LANGUAGE_KEY } from './messages';
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
  if (!changes[LANGUAGE_KEY]) return;
  await speak();
  for (const id of MENUS) chrome.contextMenus.update(id, { title: titleOf(id) }, () => void chrome.runtime.lastError);
});

// The button opens the popup; the panel opens from there ("Full mode") or from the menu.
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => undefined);
  const id = info.menuItemId as MenuId;
  const sent =
    id === 'page' || id === 'selection'
      ? takeTab(tab, id === 'selection', info.frameId, info.selectionText)
      : id === 'link' && info.linkUrl
        ? takeTarget(tab, 'link', info.linkUrl, info.frameId, info.selectionText)
        : id === 'image' && info.srcUrl
          ? takeTarget(tab, 'image', info.srcUrl, info.frameId)
          : Promise.resolve(null);
  void sent.then((what) => (what ? putForPanel(what) : undefined));
});
