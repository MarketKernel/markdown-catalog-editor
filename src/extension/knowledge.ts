/**
 * Adding to the knowledge base from outside the side panel: the popup's Send
 * to Markdown and the context menu with no panel open. A panel that has the
 * folder open writes the note itself — it may hold that note with changes not
 * yet saved, which a write behind its back would lose — so the panels are
 * asked first, the one of the window first; with none of them, the note is
 * written here, and the panels hear of it. What was put aside while the
 * folder was closed goes before anything new (messages.ts), all of it under
 * one lock, WRITE_LOCK.
 *
 * No DOM here: the service worker uses it too, and turns HTML into Markdown
 * through the offscreen document.
 */

import { appendClip, destination, markdownLink, type Clip } from '../clip';
import type { DirectoryVault } from '../vault';
import { QUEUED_PREFIX, WRITE_LOCK, type AppendReply, type AppendRequest, type ChangedNotice, type Queued, type Sent } from './messages';

export type ToMarkdown = (html: string, url: string) => string | Promise<string>;

/** What was taken from a tab, as it goes into a note; `toMarkdown` turns a page's or a selection's HTML into Markdown. */
export async function clipOf(sent: Sent, toMarkdown: ToMarkdown): Promise<Clip> {
  const { kind, title, url } = sent;
  switch (kind) {
    case 'link':
      return { kind, title: sent.text || title, url, markdown: markdownLink(sent.text, sent.target) };
    case 'image': {
      const alt = sent.text.replace(/\s+/g, ' ').trim().replace(/[\\[\]]/g, '\\$&');
      return { kind, title, url, markdown: `![${alt}](${destination(sent.target)})` };
    }
    default:
      return { kind, title, url, markdown: await toMarkdown(sent.html, url) };
  }
}

/** What waits, as it goes into the note: put aside as it was sent, it becomes Markdown now. */
export async function queuedClip(queued: Queued, toMarkdown: ToMarkdown): Promise<Clip> {
  if (queued.clip) return queued.clip;
  if (!queued.sent) throw new Error('Nothing in what waits');
  return clipOf(queued.sent, toMarkdown);
}

/** The panels showing the folder read the note again: one of them may have it open. */
function tellPanels(folder: number, path: string): void {
  const changed: ChangedNotice = { to: 'panel', type: 'changed', folder, path };
  void chrome.runtime.sendMessage(changed).catch(() => undefined);
}

/** True once a panel with the folder open has added it; `first`: the window whose panel is asked first. */
async function throughPanel(folder: number, path: string, clip: Clip, first?: number): Promise<boolean> {
  // Asked window by window — Chrome's contexts give a side panel no window — so that one panel answers.
  const panels = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.SIDE_PANEL] });
  if (!panels.length) return false;
  const windows = (await chrome.windows.getAll()).map((window) => window.id ?? -1).sort((a, b) => Number(b === first) - Number(a === first));
  for (const windowId of windows) {
    const request: AppendRequest = { to: 'panel', type: 'append', windowId, folder, path, clip };
    const reply = (await chrome.runtime.sendMessage(request).catch(() => null)) as AppendReply | null;
    if (reply?.error) throw new Error(reply.error);
    if (reply?.done) return true;
  }
  return false;
}

/** To the end of the note — made if it is not there yet — through a panel that has the folder open, else here. */
async function addToNote(vault: DirectoryVault, folder: number, path: string, clip: Clip, first?: number): Promise<void> {
  if (!(await throughPanel(folder, path, clip, first))) {
    let text = '';
    try {
      text = await vault.readText(path);
    } catch (error) {
      if ((error as DOMException)?.name !== 'NotFoundError') throw error;
    }
    await vault.writeText(path, appendClip(text, clip));
  }
  tellPanels(folder, path);
}

/**
 * Adds the clip to the end of the note, after what was put aside for the
 * folder while it was closed — what is sent now would land before it
 * otherwise. Each of those is removed once written; a failure stops there
 * and keeps the rest. Should the worker stop between a write and its removal,
 * that one is added twice — rather than lost.
 */
export async function writeClip(vault: DirectoryVault, folder: number, path: string, clip: Clip, toMarkdown: ToMarkdown, first?: number): Promise<void> {
  await navigator.locks.request(WRITE_LOCK, async () => {
    const all = (await chrome.storage.local.get(null)) as Record<string, unknown>;
    for (const key of Object.keys(all).filter((key) => key.startsWith(QUEUED_PREFIX)).sort()) {
      const queued = all[key] as Queued;
      if (queued.folder !== folder) continue;
      await addToNote(vault, folder, queued.path, await queuedClip(queued, toMarkdown), first);
      await chrome.storage.local.remove(key).catch(() => undefined);
    }
    await addToNote(vault, folder, path, clip, first);
  });
}
