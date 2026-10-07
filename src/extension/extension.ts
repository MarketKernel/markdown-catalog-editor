/**
 * The side panel's part of the Chrome extension, in the place of
 * src/platform.ts (build.mjs swaps them). The panel is the editor itself;
 * this takes what was put aside for this window (messages.ts), turns its HTML
 * into Markdown and hands it to the editor, which asks where it goes and
 * adds it there. It answers the popup of its window, which asks it to add to a
 * note of the folder it has open. And once it has the knowledge base open, it
 * adds what the popup put aside while that was closed, and keeps its notes
 * for the popup to list.
 */

import { t, type Language } from '../i18n';
import type { Platform, PlatformHost } from '../platform';
import { recentFolders } from '../recent';
import { loadSettings } from '../settings';
import { toast } from '../ui';
import { clipOf, queuedClip } from './knowledge';
import {
  DEFAULT_NOTE_KEY,
  LANGUAGE_KEY,
  NOTES_KEY,
  ownSender,
  QUEUED_PREFIX,
  SENT_PREFIX,
  windowOf,
  type AppendReply,
  type AppendRequest,
  type ChangedNotice,
  type KnownNotes,
  type PanelPing,
  type Queued,
  type Sent,
  WRITE_LOCK,
} from './messages';
import { htmlToMarkdown } from './to-markdown';

let host: PlatformHost | null = null;
let windowId: number | null = null;
/** The recent folder's record of the folder open here. */
let openFolder: number | null = null;
/** The notes last kept for the popup, as JSON. */
let lastNotes = '';
/** Put aside, and could not be added to the folder open here: tried again when a folder opens. */
const failed = new Set<string>();
/** Keys taken already: the start and storage.onChanged may both see one. */
const taken = new Set<string>();

async function take(): Promise<void> {
  if (windowId === null) return;
  const all = (await chrome.storage.session.get(null)) as Record<string, Sent>;
  const mine = Object.keys(all)
    .filter((key) => windowOf(key) === windowId && !taken.has(key))
    .sort();
  if (!mine.length) return;
  for (const key of mine) taken.add(key);
  await chrome.storage.session.remove(mine);
  for (const key of mine) {
    const sent = all[key];
    if (sent) host?.clip(await clipOf(sent, htmlToMarkdown));
  }
}

/**
 * What the popup put aside for the folder open here, to the end of its notes
 * in the order it was sent — and what waits for a folder no longer among the
 * recent ones, which would never open again. One panel at a time, under a
 * lock, or two windows with the folder open would both add it. Each is
 * removed only once written; one that fails is said once and kept for the
 * next time the folder opens, and the rest go on.
 */
async function addQueued(): Promise<void> {
  const folder = openFolder;
  if (folder === null) return;
  await navigator.locks.request(WRITE_LOCK, async () => {
    const all = (await chrome.storage.local.get(null)) as Record<string, unknown>;
    const keys = Object.keys(all)
      .filter((key) => key.startsWith(QUEUED_PREFIX) && !failed.has(key))
      .sort();
    if (!keys.length) return;
    // An empty list is IndexedDB failing rather than every folder forgotten: then each waits for its own.
    const recent = await recentFolders();
    const forgotten = (id: number): boolean => recent.length > 0 && !recent.some((item) => item.id === id);
    let error: unknown = null;
    for (const key of keys) {
      const queued = all[key] as Queued;
      if (queued.folder !== folder && !forgotten(queued.folder)) continue;
      try {
        if (!host || !(await host.append(folder, queued.path, await queuedClip(queued, htmlToMarkdown)))) return;
      } catch (reason) {
        failed.add(key);
        error ??= reason;
        continue;
      }
      await chrome.storage.local.remove(key).catch(() => undefined);
    }
    if (error) toast(t('toast', 'Could not save: {reason}', { reason: error instanceof Error ? error.message : String(error) }), 'error');
  });
}

export const platform: Platform = {
  start(next) {
    host = next;
    // For the worker, which adds to the default note when the menu sends something with no panel open.
    void chrome.storage.local.set({ [DEFAULT_NOTE_KEY]: loadSettings().defaultNote }).catch(() => undefined);
    chrome.storage.session.onChanged.addListener((changes) => {
      if (Object.keys(changes).some((key) => key.startsWith(SENT_PREFIX) && changes[key]?.newValue)) void take();
    });
    chrome.storage.local.onChanged.addListener((changes) => {
      if (Object.keys(changes).some((key) => key.startsWith(QUEUED_PREFIX) && changes[key]?.newValue)) void addQueued();
    });
    chrome.runtime.onMessage.addListener((message: AppendRequest | ChangedNotice | PanelPing | null, sender, reply: (answer: AppendReply | boolean) => void) => {
      if (!ownSender(sender) || message?.to !== 'panel' || !host) return false;
      if (message.type === 'here') {
        if (message.windowId !== windowId) return false;
        reply(true);
        return false;
      }
      if (message.type === 'changed') {
        host.changed(message.folder, message.path);
        return false;
      }
      // The popup of another window has a panel of its own to ask.
      if (message.type !== 'append' || message.windowId !== windowId) return false;
      host.append(message.folder, message.path, message.clip).then(
        (done) => reply({ done }),
        (error: unknown) => reply({ done: false, error: error instanceof Error ? error.message : String(error) }),
      );
      return true;
    });
    void chrome.windows.getCurrent().then((current) => {
      windowId = current.id ?? null;
      return take();
    });
  },
  opened(folder, notes) {
    if (folder !== openFolder) failed.clear();
    openFolder = folder;
    if (folder === null) return;
    const known: KnownNotes = { folder, paths: notes };
    // Every rescan reports them: written only when they changed, for each write wakes the worker.
    const kept = JSON.stringify(known);
    if (kept !== lastNotes) {
      lastNotes = kept;
      void chrome.storage.local.set({ [NOTES_KEY]: known }).catch(() => undefined);
    }
    void addQueued();
  },
  languageChanged(language: Language) {
    void chrome.storage.local.set({ [LANGUAGE_KEY]: language });
  },
};
