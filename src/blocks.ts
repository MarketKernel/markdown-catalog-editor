/**
 * The document model behind live preview.
 *
 * The file is kept verbatim as one string; blocks are just line ranges over it,
 * derived from markdown-it's own token map. That is what makes a list, a fenced
 * code block or a table open as a single editable chunk instead of falling
 * apart line by line.
 */

import type { MarkdownIt, Token } from 'markdown-it';

export type BlockKind =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'quote'
  | 'list'
  | 'table'
  | 'html'
  | 'hr'
  | 'frontmatter';

export interface Block {
  /** First line of the block, inclusive. */
  start: number;
  /** Line after the block, exclusive. */
  end: number;
  kind: BlockKind;
  /** Heading depth 1–6, else 0. Drives the font size of the source line. */
  level: number;
  text: string;
}

export function splitLines(text: string): string[] {
  return text.split('\n');
}

export function splitBlocks(md: MarkdownIt, text: string): Block[] {
  const lines = splitLines(text);
  const blocks: Block[] = [];
  let scanFrom = 0;

  const matter = frontMatterEnd(lines);
  if (matter > 0) {
    blocks.push(makeBlock(lines, 0, matter, 'frontmatter', 0));
    scanFrom = matter;
  }

  const body = scanFrom === 0 ? text : lines.slice(scanFrom).join('\n');
  let covered = 0;
  for (const token of parse(md, body)) {
    if (token.level !== 0 || !token.map) continue;
    const [from, to] = token.map;
    if (from < covered) continue;
    covered = to;
    const block = makeBlock(lines, from + scanFrom, Math.min(to + scanFrom, lines.length), kindOf(token), levelOf(token));
    if (block.end > block.start) blocks.push(block);
  }

  if (blocks.length === 0) blocks.push(makeBlock(lines, 0, Math.min(1, lines.length), 'paragraph', 0));
  return blocks;
}

function parse(md: MarkdownIt, text: string): Token[] {
  try {
    return md.parse(text, {});
  } catch {
    return [];
  }
}

/** Trailing blank lines belong to the gap between blocks, not to the block. */
function makeBlock(lines: string[], start: number, end: number, kind: BlockKind, level: number): Block {
  let last = end;
  while (last > start + 1 && (lines[last - 1] ?? '').trim() === '') last -= 1;
  return { start, end: last, kind, level, text: lines.slice(start, last).join('\n') };
}

function kindOf(token: Token): BlockKind {
  switch (token.type) {
    case 'heading_open':
      return 'heading';
    case 'fence':
    case 'code_block':
      return 'code';
    case 'blockquote_open':
      return 'quote';
    case 'bullet_list_open':
    case 'ordered_list_open':
      return 'list';
    case 'table_open':
      return 'table';
    case 'html_block':
      return 'html';
    case 'hr':
      return 'hr';
    default:
      return 'paragraph';
  }
}

function levelOf(token: Token): number {
  if (token.type !== 'heading_open') return 0;
  const depth = Number(token.tag.slice(1));
  return Number.isFinite(depth) ? depth : 0;
}

/** A leading `---` fence: YAML metadata, shown as-is rather than as a stray rule. */
function frontMatterEnd(lines: string[]): number {
  if ((lines[0] ?? '').trim() !== '---') return 0;
  for (let index = 1; index < Math.min(lines.length, 200); index += 1) {
    const line = (lines[index] ?? '').trim();
    if (line === '---' || line === '...') return index + 1;
  }
  return 0;
}

/* ------------------------------------------------------------------ *
 * Offsets
 * ------------------------------------------------------------------ */

/** Character offset of the first character of every line, plus the end. */
export function lineOffsets(lines: string[]): number[] {
  const offsets = new Array<number>(lines.length + 1);
  let at = 0;
  for (let index = 0; index < lines.length; index += 1) {
    offsets[index] = at;
    at += (lines[index] ?? '').length + 1;
  }
  offsets[lines.length] = Math.max(0, at - 1);
  return offsets;
}

export function lineAtOffset(offsets: readonly number[], offset: number): number {
  let low = 0;
  let high = offsets.length - 2;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if ((offsets[mid] ?? 0) <= offset) low = mid;
    else high = mid - 1;
  }
  return low;
}

export function blockAtLine(blocks: readonly Block[], line: number): number {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    if (line < block.end) return index;
  }
  return Math.max(0, blocks.length - 1);
}

/**
 * Maps a position in a block's *rendered* text back to the source.
 *
 * The rendered text is very nearly a subsequence of the Markdown source, so
 * walking both in step and skipping the syntax characters lands the caret on
 * the word the reader actually clicked.
 */
export function sourceOffsetFor(source: string, renderedPrefix: string): number {
  let at = 0;
  for (const char of renderedPrefix) {
    const found = source.indexOf(char, at);
    if (found < 0) break;
    // A run of syntax characters may separate the two, but a whole paragraph
    // may not: an unmatched character means the mapping has drifted.
    if (found - at > 24) break;
    at = found + 1;
  }
  return at;
}
