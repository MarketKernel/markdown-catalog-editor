/**
 * The extension's offscreen document: a page with no window, made by the
 * worker when the context menu sends something with no side panel open. The
 * worker has no DOM, and HTML becomes Markdown with DOMParser — here, as it
 * does in the panel (to-markdown.ts). It holds nothing; the worker closes it.
 */

import { ownSender, type MarkdownReply, type MarkdownRequest } from './messages';
import { htmlToMarkdown } from './to-markdown';

chrome.runtime.onMessage.addListener((message: MarkdownRequest | null, sender, reply: (answer: MarkdownReply) => void) => {
  if (!ownSender(sender) || message?.to !== 'offscreen' || message.type !== 'markdown') return false;
  reply({ markdown: htmlToMarkdown(message.html, message.url) });
  return false;
});
