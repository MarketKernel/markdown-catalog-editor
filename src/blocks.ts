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
  | 'frontmatter'
  /** Link reference definitions: markdown-it consumes them without a token. */
  | 'definition'
  /** An empty line the author can type into (see `isFreeLine`). */
  | 'blank';

export interface Block {
  /** First line of the block, inclusive. */
  start: number;
  /** Line after the block, exclusive. */
  end: number;
  /** Character offset of the block's first character. */
  from: number;
  kind: BlockKind;
  /** Heading depth 1–6, else 0. Drives the font size of the source line. */
  level: number;
  /** A line of the paragraph above it: no gap in between. */
  joined: boolean;
  text: string;
}

function splitLines(text: string): string[] {
  return text.split('\n');
}

/**
 * Splits a document into blocks. `env` receives what markdown-it collects on
 * the way — the link references the blocks are later rendered against.
 */
export function splitBlocks(md: MarkdownIt, text: string, env: Record<string, unknown> = {}): Block[] {
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
  const tokens = parse(md, body, env);
  tokens.forEach((token, index) => {
    if (token.level !== 0 || !token.map) return;
    const [from, to] = token.map;
    if (from < covered) return;
    covered = to;
    const block = makeBlock(lines, from + scanFrom, Math.min(to + scanFrom, lines.length), kindOf(token), levelOf(token));
    if (block.end <= block.start) return;
    if (block.kind === 'paragraph' && block.end - block.start > 1 && splitsIntoLines(md, tokens[index + 1], lines.slice(block.start, block.end), env)) {
      for (let line = block.start; line < block.end; line += 1) {
        blocks.push({ ...makeBlock(lines, line, line + 1, 'paragraph', 0), joined: line > block.start });
      }
    } else {
      blocks.push(block);
    }
  });

  const all = withGaps(lines, blocks);
  if (all.length === 0) all.push(makeBlock(lines, 0, 1, 'blank', 0));
  const offsets = lineOffsets(lines);
  for (const block of all) block.from = offsets[block.start] ?? 0;
  return all;
}

/**
 * Fills the lines no token claimed. Text there is a run of link definitions;
 * a blank line becomes a block only when it is free.
 */
function withGaps(lines: string[], blocks: Block[]): Block[] {
  const out: Block[] = [];
  let line = 0;
  const fill = (until: number): void => {
    while (line < until) {
      if (isBlank(lines[line])) {
        if (isFreeLine(lines, line)) out.push(makeBlock(lines, line, line + 1, 'blank', 0));
        line += 1;
        continue;
      }
      const from = line;
      while (line < until && !isBlank(lines[line])) line += 1;
      out.push(makeBlock(lines, from, line, 'definition', 0));
    }
  };
  for (const block of blocks) {
    fill(block.start);
    out.push(block);
    line = block.end;
  }
  fill(lines.length);
  return out;
}

/**
 * A blank line is shown — and can be typed into — only when both of its
 * neighbours are blank too. The line next to a block is the gap that keeps the
 * blocks apart; text typed there would glue onto that block. The last line of
 * the file is the newline that ends it, not a line of its own.
 */
function isFreeLine(lines: string[], line: number): boolean {
  if (line >= lines.length - 1) return false;
  return (line === 0 || isBlank(lines[line - 1])) && isBlank(lines[line + 1]);
}

/**
 * A paragraph whose lines each read the same on their own opens line by line.
 * It does not when a line alone would turn into something else (`2. item`, an
 * indented line) or when inline syntax runs across the break (`**bold\nstill**`).
 */
function splitsIntoLines(md: MarkdownIt, inline: Token | undefined, lines: string[], env: Record<string, unknown>): boolean {
  const children = inline?.type === 'inline' ? inline.children ?? [] : [];
  const segments: Token[][] = [[]];
  for (const child of children) {
    if (child.type === 'softbreak' || child.type === 'hardbreak') segments.push([]);
    else segments[segments.length - 1]!.push(child);
  }
  if (segments.length !== lines.length) return false;
  return lines.every((line, index) => {
    const alone = parse(md, line, {});
    if (alone.length !== 3 || alone[0]!.type !== 'paragraph_open') return false;
    const render = (tokens: Token[]): string => md.renderer.renderInline(tokens, md.options, env);
    return render(alone[1]!.children ?? []) === render(segments[index]!);
  });
}

function isBlank(line: string | undefined): boolean {
  return (line ?? '').trim() === '';
}

function parse(md: MarkdownIt, text: string, env: Record<string, unknown>): Token[] {
  try {
    return md.parse(text, env);
  } catch {
    return [];
  }
}

/** Trailing blank lines belong to the gap between blocks, not to the block. */
function makeBlock(lines: string[], start: number, end: number, kind: BlockKind, level: number): Block {
  let last = end;
  while (last > start + 1 && isBlank(lines[last - 1])) last -= 1;
  return { start, end: last, from: 0, kind, level, joined: false, text: lines.slice(start, last).join('\n') };
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
function lineOffsets(lines: string[]): number[] {
  const offsets = new Array<number>(lines.length + 1);
  let at = 0;
  for (let index = 0; index < lines.length; index += 1) {
    offsets[index] = at;
    at += (lines[index] ?? '').length + 1;
  }
  offsets[lines.length] = Math.max(0, at - 1);
  return offsets;
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
