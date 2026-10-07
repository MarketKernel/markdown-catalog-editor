/**
 * How the extension's two parts hand things over: the service worker
 * (background.ts) puts what was sent into chrome.storage.session, one key per
 * sending, and the side panel of that window (extension.ts) takes it out. A
 * panel opened by the click that sent it finds it there when it starts; one
 * open already hears of it through storage.onChanged. Nothing travels as a
 * message, so no web page or other extension can send anything: the storage
 * is the extension's own, and content scripts — it has none — could not reach
 * the session area either.
 *
 * The panel's interface language goes the other way, in chrome.storage.local,
 * for the context menu to speak it too.
 */

import type { ClipKind } from '../clip';

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
