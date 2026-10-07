/**
 * How the extension's parts hand things over.
 *
 * What is sent to the side panel — from the context menu (background.ts), or
 * from the popup when the knowledge base has to be opened first (popup.ts) —
 * goes into chrome.storage.session, one key per sending, and the panel of
 * that window (extension.ts) takes it out. A panel opened by the click that
 * sent it finds it there when it starts; one open already hears of it through
 * storage.onChanged. The storage is the extension's own: content scripts — it
 * has none — could not reach the session area either.
 *
 * The popup asks the panel of its window to add to a note itself, when that
 * panel has the knowledge base open: the panel may hold the note with
 * unsaved changes, which a write behind its back would lose. Those are
 * chrome.runtime messages, taken only from the extension's own pages.
 *
 * What the popup sends while the knowledge base is closed — the browser took
 * the access back when the last panel closed — waits in chrome.storage.local,
 * which outlives a restart, one key per sending; the panel that opens the
 * folder again adds it to its notes. For the popup to list those notes
 * meanwhile, the panel keeps them there too, as it last scanned them.
 *
 * The worker has no DOM: it hands HTML to the offscreen document
 * (offscreen.ts) and takes Markdown back.
 *
 * The panel's interface language goes to the worker in chrome.storage.local,
 * for the context menu to speak it too, and so does the default note, which
 * the settings keep in localStorage — where a worker cannot look.
 */

import type { Clip, ClipKind } from '../clip';

/** What the worker took from a tab. */
export interface Sent {
  kind: ClipKind;
  windowId: number;
  title: string;
  /** The page's address. */
  url: string;
  /** The page or the selection, as HTML; empty for a link or an image. */
  html: string;
  /** The link's or the image's address. */
  target: string;
  /** The link's text, the image's description. */
  text: string;
}

/** The popup to the panel of its window: add this to that note, if the knowledge base is yours. */
export interface AppendRequest {
  to: 'panel';
  type: 'append';
  windowId: number;
  /** The knowledge base, as its record among the recent folders. */
  folder: number;
  path: string;
  clip: Clip;
}

/** Is the panel of this window open? It answers true; Chrome's contexts give a panel no window. */
export interface PanelPing {
  to: 'panel';
  type: 'here';
  windowId: number;
}

export function panelOpen(windowId: number): Promise<boolean> {
  const ping: PanelPing = { to: 'panel', type: 'here', windowId };
  return chrome.runtime.sendMessage(ping).then(
    (answer: unknown) => answer === true,
    () => false,
  );
}

/** The popup wrote a note itself: a panel showing it reads it again. */
export interface ChangedNotice {
  to: 'panel';
  type: 'changed';
  folder: number;
  path: string;
}

/** The panel's answer: done, or not its knowledge base (the popup writes then), or what went wrong. */
export interface AppendReply {
  done: boolean;
  error?: string;
}

/** A message from the extension's own pages, and not from a web page or another extension. */
export function ownSender(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id && Boolean(sender.url?.startsWith(chrome.runtime.getURL('')));
}

/**
 * Sent while the knowledge base was closed: to the end of that note once it
 * opens. `folder` is NO_FOLDER when none was ever opened: then it goes to the
 * first one that is. As Markdown, or — when that could not be made — as it
 * was sent, for a panel to turn into Markdown.
 */
export interface Queued {
  folder: number;
  path: string;
  clip?: Clip;
  sent?: Sent;
}

export const NO_FOLDER = -1;

/** The notes of the knowledge base as its panel last saw them. */
export interface KnownNotes {
  folder: number;
  paths: string[];
}

/** The worker to the offscreen document: this HTML, as Markdown. */
export interface MarkdownRequest {
  to: 'offscreen';
  type: 'markdown';
  html: string;
  /** The page's address, which relative links are resolved against. */
  url: string;
}

export interface MarkdownReply {
  markdown: string;
}

export const SENT_PREFIX = 'sent:';
export const QUEUED_PREFIX = 'queued:';
/**
 * Held while a note of the knowledge base is written from outside a panel,
 * and while what waits is added: by the popup, the worker and the panels
 * alike, or two of them would read a note, both add to it, and one write
 * would lose the other.
 */
export const WRITE_LOCK = 'knowledge-base';
export const NOTES_KEY = 'notes';
export const LANGUAGE_KEY = 'language';
export const DEFAULT_NOTE_KEY = 'defaultNote';

/** Sorts in the order things were sent, as the keys below do. */
function stamp(now: number): string {
  return `${String(now).padStart(15, '0')}:${Math.random().toString(36).slice(2, 8)}`;
}

/** A key that sorts in the order things were sent, for `windowId`'s panel. */
export function sentKey(windowId: number, now = Date.now()): string {
  return `${SENT_PREFIX}${windowId}:${stamp(now)}`;
}

export function queuedKey(now = Date.now()): string {
  return `${QUEUED_PREFIX}${stamp(now)}`;
}

export function windowOf(key: string): number | null {
  if (!key.startsWith(SENT_PREFIX)) return null;
  const id = Number(key.slice(SENT_PREFIX.length).split(':')[0]);
  return Number.isInteger(id) ? id : null;
}
