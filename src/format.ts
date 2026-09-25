/**
 * Toolbar actions as pure text transforms.
 *
 * Every action takes the editable block's value plus the selection and returns
 * the new value and selection, so the same code powers the buttons, the
 * keyboard shortcuts and the tests.
 */

export interface Selection {
  value: string;
  start: number;
  end: number;
}

export type InlineMark = 'bold' | 'italic' | 'strike' | 'code' | 'mark';

const MARKERS: Record<InlineMark, string> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  code: '`',
  mark: '==',
};

const WORD = /[\p{L}\p{N}_-]/u;

/** An empty selection is grown to the word under the caret, the way editors do. */
export function expandToWord(sel: Selection): Selection {
  if (sel.start !== sel.end) return sel;
  let start = sel.start;
  let end = sel.end;
  while (start > 0 && WORD.test(sel.value[start - 1] ?? '')) start -= 1;
  while (end < sel.value.length && WORD.test(sel.value[end] ?? '')) end += 1;
  return { value: sel.value, start, end };
}

export function toggleInline(input: Selection, mark: InlineMark): Selection {
  const marker = MARKERS[mark];
  const sel = expandToWord(input);
  const selected = sel.value.slice(sel.start, sel.end);

  // Already wrapped, inside the selection or just outside it → unwrap.
  if (selected.length >= marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(marker.length, selected.length - marker.length);
    return splice(sel.value, sel.start, sel.end, inner, 0, inner.length);
  }
  const before = sel.value.slice(Math.max(0, sel.start - marker.length), sel.start);
  const after = sel.value.slice(sel.end, sel.end + marker.length);
  if (before === marker && after === marker) {
    return splice(sel.value, sel.start - marker.length, sel.end + marker.length, selected, 0, selected.length);
  }
  const wrapped = `${marker}${selected}${marker}`;
  return splice(sel.value, sel.start, sel.end, wrapped, marker.length, marker.length + selected.length);
}

export function makeLink(input: Selection, href = ''): Selection {
  const sel = expandToWord(input);
  const selected = sel.value.slice(sel.start, sel.end);
  const looksLikeUrl = /^(https?:\/\/|www\.|\/|\.{1,2}\/)\S*$/i.test(selected);
  const text = looksLikeUrl ? '' : selected;
  const target = href || (looksLikeUrl ? selected : '');
  const replacement = `[${text}](${target})`;
  // Park the caret wherever the author still has to type.
  const caret = text ? replacement.length - 1 : 1;
  return splice(sel.value, sel.start, sel.end, replacement, caret, caret);
}

export function makeWikiLink(input: Selection): Selection {
  const sel = expandToWord(input);
  const selected = sel.value.slice(sel.start, sel.end);
  const replacement = `[[${selected}]]`;
  return splice(sel.value, sel.start, sel.end, replacement, 2, 2 + selected.length);
}

/** Wraps the selection in a span — the only way Markdown carries a colour. */
export function colorize(input: Selection, style: string): Selection {
  const sel = expandToWord(input);
  const selected = sel.value.slice(sel.start, sel.end);
  const bare = stripSpan(selected);
  if (!style) return splice(sel.value, sel.start, sel.end, bare, 0, bare.length);
  const replacement = `<span style="${style}">${bare}</span>`;
  const offset = replacement.indexOf('>') + 1;
  return splice(sel.value, sel.start, sel.end, replacement, offset, offset + bare.length);
}

function stripSpan(text: string): string {
  const match = /^<span style="[^"]*">([\s\S]*)<\/span>$/.exec(text);
  return match ? (match[1] ?? '') : text;
}

/* ------------------------------------------------------------------ *
 * Line-level actions
 * ------------------------------------------------------------------ */

const HEADING = /^(\s*)(#{1,6})\s+/;
const BULLET = /^(\s*)([-*+])\s+/;
const ORDERED = /^(\s*)(\d+)([.)])\s+/;
const QUOTE = /^(\s*)>\s?/;
const TASK = /^(\s*)([-*+])\s+\[([ xX])\]\s+/;

/** Rewrites every line the selection touches, keeping the selection over them. */
function mapLines(sel: Selection, transform: (line: string, index: number) => string): Selection {
  const lineStart = sel.value.lastIndexOf('\n', Math.max(0, sel.start - 1)) + 1;
  const lineEndRaw = sel.value.indexOf('\n', sel.end);
  const lineEnd = lineEndRaw < 0 ? sel.value.length : lineEndRaw;
  const block = sel.value.slice(lineStart, lineEnd);
  const replacement = block.split('\n').map(transform).join('\n');
  return splice(sel.value, lineStart, lineEnd, replacement, 0, replacement.length);
}

export function setHeading(sel: Selection, level: number): Selection {
  return mapLines(sel, (line) => {
    const current = HEADING.exec(line);
    const body = current ? line.slice(current[0].length) : line.replace(/^\s+/, '');
    const indent = current?.[1] ?? '';
    if (level === 0) return indent + body;
    if (current && current[2]?.length === level) return indent + body;
    return `${indent}${'#'.repeat(level)} ${body}`;
  });
}

export function toggleBullet(sel: Selection): Selection {
  const allBullets = everyLine(sel, (line) => BULLET.test(line) && !TASK.test(line));
  return mapLines(sel, (line) => {
    if (!line.trim()) return line;
    if (allBullets) return line.replace(BULLET, '$1');
    return `${stripMarkers(line)}`.replace(/^(\s*)/, '$1- ');
  });
}

export function toggleOrdered(sel: Selection): Selection {
  const allOrdered = everyLine(sel, (line) => ORDERED.test(line));
  let counter = 0;
  return mapLines(sel, (line) => {
    if (!line.trim()) return line;
    if (allOrdered) return line.replace(ORDERED, '$1');
    counter += 1;
    return stripMarkers(line).replace(/^(\s*)/, `$1${counter}. `);
  });
}

export function toggleTask(sel: Selection): Selection {
  const allTasks = everyLine(sel, (line) => TASK.test(line));
  return mapLines(sel, (line) => {
    if (!line.trim()) return line;
    if (allTasks) return line.replace(TASK, '$1$2 ');
    if (BULLET.test(line)) return line.replace(BULLET, '$1$2 [ ] ');
    return stripMarkers(line).replace(/^(\s*)/, '$1- [ ] ');
  });
}

export function toggleQuote(sel: Selection): Selection {
  const allQuoted = everyLine(sel, (line) => QUOTE.test(line));
  return mapLines(sel, (line) => (allQuoted ? line.replace(QUOTE, '$1') : line.replace(/^(\s*)/, '$1> ')));
}

function stripMarkers(line: string): string {
  return line.replace(TASK, '$1').replace(BULLET, '$1').replace(ORDERED, '$1');
}

function everyLine(sel: Selection, predicate: (line: string) => boolean): boolean {
  const lineStart = sel.value.lastIndexOf('\n', Math.max(0, sel.start - 1)) + 1;
  const lineEndRaw = sel.value.indexOf('\n', sel.end);
  const lineEnd = lineEndRaw < 0 ? sel.value.length : lineEndRaw;
  const lines = sel.value.slice(lineStart, lineEnd).split('\n').filter((line) => line.trim());
  return lines.length > 0 && lines.every(predicate);
}

export const INDENT = '  ';

export function indent(sel: Selection): Selection {
  if (sel.start === sel.end && !sel.value.slice(0, sel.start).endsWith('\n')) {
    const line = currentLine(sel);
    // Inside a list the caret indents the item; in running text it is a tab stop.
    if (!BULLET.test(line) && !ORDERED.test(line) && !TASK.test(line)) {
      return splice(sel.value, sel.start, sel.end, INDENT, INDENT.length, INDENT.length);
    }
  }
  return mapLines(sel, (line) => (line.trim() ? INDENT + line : line));
}

export function outdent(sel: Selection): Selection {
  return mapLines(sel, (line) => {
    if (line.startsWith(INDENT)) return line.slice(INDENT.length);
    return line.replace(/^[ \t]+/, '');
  });
}

function currentLine(sel: Selection): string {
  const start = sel.value.lastIndexOf('\n', Math.max(0, sel.start - 1)) + 1;
  const endRaw = sel.value.indexOf('\n', sel.start);
  return sel.value.slice(start, endRaw < 0 ? sel.value.length : endRaw);
}

/* ------------------------------------------------------------------ *
 * Enter inside a list or a quote
 * ------------------------------------------------------------------ */

export interface Continuation {
  /** The text to insert in place of a plain newline. */
  insert: string;
  /** Set when the empty marker should be dropped instead: the line to rewrite. */
  clear?: { from: number; to: number; text: string };
}

/**
 * Enter on `- item` opens the next item; Enter on an empty item unwinds one
 * level of nesting and finally leaves the list.
 */
export function continueLine(sel: Selection): Continuation | null {
  const lineStart = sel.value.lastIndexOf('\n', Math.max(0, sel.start - 1)) + 1;
  const line = sel.value.slice(lineStart, sel.start);

  const task = TASK.exec(line);
  if (task) {
    const body = line.slice(task[0].length);
    if (!body.trim()) return clearOr(lineStart, sel.start, task[1] ?? '', `${task[2]} [ ] `);
    return { insert: `\n${task[1] ?? ''}${task[2]} [ ] ` };
  }

  const bullet = BULLET.exec(line);
  if (bullet) {
    const body = line.slice(bullet[0].length);
    if (!body.trim()) return clearOr(lineStart, sel.start, bullet[1] ?? '', `${bullet[2]} `);
    return { insert: `\n${bullet[1] ?? ''}${bullet[2]} ` };
  }

  const ordered = ORDERED.exec(line);
  if (ordered) {
    const body = line.slice(ordered[0].length);
    const next = Number(ordered[2]) + 1;
    if (!body.trim()) return clearOr(lineStart, sel.start, ordered[1] ?? '', `${ordered[2]}${ordered[3]} `);
    return { insert: `\n${ordered[1] ?? ''}${next}${ordered[3]} ` };
  }

  const quote = QUOTE.exec(line);
  if (quote) {
    const body = line.slice(quote[0].length);
    if (!body.trim()) return { clear: { from: lineStart, to: sel.start, text: '' }, insert: '' };
    return { insert: `\n${quote[1] ?? ''}> ` };
  }

  return null;
}

/** An empty marker: outdent it if it is nested, otherwise ask to leave the block. */
function clearOr(from: number, to: number, indentText: string, marker: string): Continuation {
  if (indentText.length >= INDENT.length) {
    return { insert: '', clear: { from, to, text: indentText.slice(INDENT.length) + marker } };
  }
  return { insert: '', clear: { from, to, text: '' } };
}

/* ------------------------------------------------------------------ *
 * Enter outside a list
 * ------------------------------------------------------------------ */

export interface Split {
  /** The whole document after the split. */
  text: string;
  /** Where the caret goes: the start of the second half. */
  caret: number;
}

/**
 * Splits the block `sel.value`, which sits between `head` and `tail` in the
 * document, into two blocks at the selection.
 *
 * An empty half becomes a blank line of its own. It gets an extra gap line
 * wherever it would otherwise touch a neighbouring block: a blank line next to
 * a block is not shown, and whatever is typed into it later would glue onto
 * that block. Two blank lines need no gap between them.
 */
export function splitBlock(head: string, sel: Selection, tail: string): Split {
  const before = sel.value.slice(0, sel.start).replace(/\n[ \t]*$/, '');
  const after = sel.value.slice(sel.end).replace(/^[ \t]*\n/, '');
  const emptyBefore = before.trim() === '';
  const emptyAfter = after.trim() === '';
  const lead = emptyBefore && !endsWithBlankLine(head) ? '\n' : '';
  const gap = emptyBefore && emptyAfter ? '\n' : '\n\n';
  const trail = emptyAfter && !startsWithBlankLine(tail) ? '\n' : '';
  return {
    text: head + lead + before + gap + after + trail + tail,
    caret: head.length + lead.length + before.length + gap.length,
  };
}

/** Nothing comes before, or what does ends on a blank line. */
function endsWithBlankLine(head: string): boolean {
  return head === '' || /(^|\n)[ \t]*\n$/.test(head);
}

/** A blank line follows — the newline that ends the file counts as one. */
function startsWithBlankLine(tail: string): boolean {
  return /^\n[ \t]*(\n|$)/.test(tail);
}

/** Keeps the leading whitespace when Enter is pressed inside a fenced block. */
export function keepIndent(sel: Selection): string {
  const lineStart = sel.value.lastIndexOf('\n', Math.max(0, sel.start - 1)) + 1;
  const line = sel.value.slice(lineStart, sel.start);
  return `\n${/^[ \t]*/.exec(line)?.[0] ?? ''}`;
}

/**
 * A table cannot share its lines with text, so it goes below the block — or
 * in its place when the block is empty — with the first header selected.
 */
export function table(sel: Selection): Selection {
  const text = '| Column | Column |\n| --- | --- |\n|  |  |';
  const head = sel.value.trim() ? `${sel.value.replace(/\s+$/, '')}\n\n` : '';
  return { value: head + text, start: head.length + 2, end: head.length + 8 };
}

function splice(value: string, from: number, to: number, text: string, selStart: number, selEnd: number): Selection {
  return {
    value: value.slice(0, from) + text + value.slice(to),
    start: from + selStart,
    end: from + selEnd,
  };
}
