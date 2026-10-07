/**
 * What the "Send to Markdown" extension sends, as it lands in the notes: a
 * page or a selection becomes a note of its own in the clippings folder, with
 * front matter naming where it came from, or goes to the end of the note that
 * is open. No DOM here — the HTML is Markdown by now (src/extension/to-markdown.ts).
 */

export type ClipKind = 'page' | 'selection' | 'link' | 'image';

export interface Clip {
  kind: ClipKind;
  /** The page's title. */
  title: string;
  /** The page's address. */
  url: string;
  /** What was sent, as Markdown. */
  markdown: string;
}

export const DEFAULT_CLIP_FOLDER = 'Clippings';

/** A clippings folder as typed → a path inside the notes folder; nothing → the root. */
export function cleanClipFolder(folder: string): string {
  return folder
    .split(/[\\/]+/)
    .map((part) => part.replace(/[[\]|#^:*?"<>\u0000-\u001f]+/g, '-').trim())
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
}

/**
 * A note's file name from a page's title: what no file system takes, or what
 * would break a [[wiki link]], becomes a space; at most 100 characters.
 */
export function clipFileName(title: string, fallback = 'Clipping'): string {
  let name = title
    .replace(/[\\/:*?"<>|#^[\]\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length > 100) name = name.slice(0, 100).replace(/\s+\S*$/, '') || name.slice(0, 100);
  // A leading dot hides the file; a trailing one or a space Windows drops.
  name = name.replace(/^[.\s]+|[.\s]+$/g, '');
  return `${name || fallback}.md`;
}

/** `Name.md`, or `Name 2.md`, `Name 3.md` … — the first one `taken` does not know. */
export function freeName(name: string, taken: (name: string) => boolean): string {
  if (!taken(name)) return name;
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 2; ; n += 1) {
    const next = `${stem} ${n}${ext}`;
    if (!taken(next)) return next;
  }
}

/** `2025-12-31`, local time. */
export function day(now = new Date()): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

/** Text that reads as itself inside the brackets of a Markdown link. */
export function linkText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/([\\[\]])/g, '\\$1');
}

/** An address as a link's destination: in angle brackets when a space or a bracket would end it. */
export function destination(url: string): string {
  return /[\s()<>]/.test(url) ? `<${url.replace(/[<>]/g, (c) => encodeURIComponent(c)).replace(/\s/g, '%20')}>` : url;
}

/** `[text](url)`; the address itself when there is no text. */
export function markdownLink(text: string, url: string): string {
  return `[${linkText(text) || linkText(url)}](${destination(url)})`;
}

/**
 * A new note: front matter with the page's title, address and the day, then
 * the Markdown. Values are quoted as JSON, which YAML reads as it is.
 */
export function clipNote(clip: Clip, now = new Date()): string {
  const matter = [
    '---',
    `title: ${JSON.stringify(clip.title.replace(/\s+/g, ' ').trim())}`,
    `source: ${JSON.stringify(clip.url)}`,
    `clipped: ${day(now)}`,
    '---',
  ].join('\n');
  const body = clip.markdown.trim();
  return body ? `${matter}\n\n${body}\n` : `${matter}\n`;
}

/**
 * The note's text with the clip at its end, a blank line before it. A link is
 * its own source; anything else is followed by a link to the page it came
 * from. The note keeps its line endings.
 */
export function appendClip(text: string, clip: Clip): string {
  const body = clip.markdown.trim();
  const source = clip.kind === 'link' || !clip.url ? '' : `— ${markdownLink(clip.title, clip.url)}`;
  const block = [body, source].filter(Boolean).join('\n\n');
  const before = text.replace(/\s+$/, '');
  const joined = before ? `${before}\n\n${block}\n` : `${block}\n`;
  return text.includes('\r\n') ? joined.replace(/\r?\n/g, '\r\n') : joined;
}
