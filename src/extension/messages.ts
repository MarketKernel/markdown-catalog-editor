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
 * The panel's interface language goes to the worker in chrome.storage.local,
 * for the context menu to speak it too.
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
  /** "default": straight to the default note once a folder is open, with no dialog. */
  to?: 'default';
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

export const SENT_PREFIX = 'sent:';
export const LANGUAGE_KEY = 'language';

/** A key that sorts in the order things were sent, for `windowId`'s panel. */
export function sentKey(windowId: number, now = Date.now()): string {
  return `${SENT_PREFIX}${windowId}:${String(now).padStart(15, '0')}:${Math.random().toString(36).slice(2, 8)}`;
}

export function windowOf(key: string): number | null {
  if (!key.startsWith(SENT_PREFIX)) return null;
  const id = Number(key.slice(SENT_PREFIX.length).split(':')[0]);
  return Number.isInteger(id) ? id : null;
}
