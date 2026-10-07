/**
 * The side panel's part of the Chrome extension, in the place of
 * src/platform.ts (build.mjs swaps them). The panel is the editor itself;
 * this takes what the service worker put aside for this window
 * (messages.ts), turns its HTML into Markdown and hands it to the editor,
 * which asks where it goes.
 */

import { destination, markdownLink, type Clip } from '../clip';
import type { Language } from '../i18n';
import type { Platform, PlatformHost } from '../platform';
import { LANGUAGE_KEY, SENT_PREFIX, windowOf, type Sent } from './messages';
import { htmlToMarkdown } from './to-markdown';

let host: PlatformHost | null = null;
let windowId: number | null = null;
/** Keys taken already: the start and storage.onChanged may both see one. */
const taken = new Set<string>();

export function clipOf(sent: Sent): Clip {
  const { kind, title, url } = sent;
  switch (kind) {
    case 'link':
      return { kind, title: sent.text || title, url, markdown: markdownLink(sent.text, sent.target) };
    case 'image': {
      const alt = sent.text.replace(/\s+/g, ' ').trim().replace(/[\\[\]]/g, '\\$&');
      return { kind, title, url, markdown: `![${alt}](${destination(sent.target)})` };
    }
    default:
      return { kind, title, url, markdown: htmlToMarkdown(sent.html, url) };
  }
}

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
    if (sent) host?.clip(clipOf(sent));
  }
}

export const platform: Platform = {
  start(next) {
    host = next;
    chrome.storage.session.onChanged.addListener((changes) => {
      if (Object.keys(changes).some((key) => key.startsWith(SENT_PREFIX) && changes[key]?.newValue)) void take();
    });
    void chrome.windows.getCurrent().then((current) => {
      windowId = current.id ?? null;
      return take();
    });
  },
  languageChanged(language: Language) {
    void chrome.storage.local.set({ [LANGUAGE_KEY]: language });
  },
};
