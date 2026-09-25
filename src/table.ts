/**
 * A Markdown table as a grid of cells.
 *
 * In edit mode a table stays rendered and is edited one cell at a time, so the
 * editor needs to read a cell's text out of the source and put it back. A cell
 * edit rewrites only the span of that one cell and leaves the rest of the
 * table — its padding, its alignment — as the author typed it. Adding and
 * removing rows or columns rewrites the whole table in the plain `| a | b |`
 * form.
 */

export type Align = '' | 'left' | 'center' | 'right';

export interface Table {
  /**
   * `rows[0]` is the header. Cells hold their text with `\|` already unescaped
   * and `<br>` — the only line break a table row can carry — as `\n`.
   */
  rows: string[][];
  /** One entry per column: the header decides how many there are. */
  align: Align[];
}

/** The trimmed text of one cell within its line, and the pipe that closes the cell. */
interface Span {
  from: number;
  to: number;
  end: number;
}

/** The source line that holds grid row `row`: line 1 is the `| --- |` delimiter. */
function lineOf(row: number): number {
  return row === 0 ? 0 : row + 1;
}

/** Grid row of a source line; the delimiter counts as the header. */
function rowOf(line: number): number {
  return line <= 1 ? 0 : line - 1;
}

/** Splits a row line on its unescaped pipes, the way markdown-it does. */
function splitRow(line: string): Span[] {
  const pipes: number[] = [];
  for (let at = 0; at < line.length; at += 1) {
    if (line[at] === '|' && line[at - 1] !== '\\') pipes.push(at);
  }
  let start = /^\s*/.exec(line)![0].length;
  let end = line.replace(/\s+$/, '').length;
  if (pipes[0] === start) {
    pipes.shift();
    start += 1;
  }
  if (pipes.length && pipes[pipes.length - 1] === end - 1) {
    pipes.pop();
    end -= 1;
  }
  const spans: Span[] = [];
  let from = start;
  for (const to of [...pipes, end]) {
    const raw = line.slice(from, to);
    const lead = raw.length - raw.trimStart().length;
    const text = raw.trim();
    // An empty cell `|  |` is edited in its middle, so the text lands padded.
    const at = text ? from + lead : from + Math.min(1, raw.length);
    spans.push({ from: at, to: at + text.length, end: to });
    from = to + 1;
  }
  return spans;
}

const unescape = (raw: string): string => raw.replace(/\\\|/g, '|').replace(/<br\s*\/?>/gi, '\n');
const escape = (text: string): string => text.replace(/\|/g, '\\|').replace(/\n/g, '<br>');

function alignOf(cell: string): Align {
  const left = cell.startsWith(':');
  const right = cell.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return '';
}

export function parseTable(text: string): Table | null {
  const lines = text.split('\n');
  if (lines.length < 2) return null;
  const header = splitRow(lines[0]!).map((span) => unescape(lines[0]!.slice(span.from, span.to)));
  const delimiter = splitRow(lines[1]!).map((span) => lines[1]!.slice(span.from, span.to));
  if (!delimiter.every((cell) => /^:?-+:?$/.test(cell))) return null;
  const width = header.length;
  const align = Array.from({ length: width }, (_, col) => alignOf(delimiter[col] ?? ''));
  const rows = [header];
  for (const line of lines.slice(2)) {
    const cells = splitRow(line).map((span) => unescape(line.slice(span.from, span.to)));
    rows.push(Array.from({ length: width }, (_, col) => cells[col] ?? ''));
  }
  return { rows, align };
}

const DELIMITER: Record<Align, string> = { '': '---', left: ':---', center: ':---:', right: '---:' };

export function formatTable(table: Table): string {
  const line = (cells: string[]): string => `| ${cells.join(' | ')} |`;
  const width = table.align.length;
  const fit = (row: string[]): string[] => Array.from({ length: width }, (_, col) => escape(row[col] ?? ''));
  return [
    line(fit(table.rows[0] ?? [])),
    line(table.align.map((align) => DELIMITER[align])),
    ...table.rows.slice(1).map((row) => line(fit(row))),
  ].join('\n');
}

export function cellValue(text: string, row: number, col: number): string {
  return parseTable(text)?.rows[row]?.[col] ?? '';
}

/** Puts `value` into one cell, touching nothing else in the source. */
export function setCell(text: string, row: number, col: number, value: string): string {
  const lines = text.split('\n');
  const index = lineOf(row);
  const line = lines[index];
  if (line === undefined) return text;
  const span = splitRow(line)[col];
  let next: string;
  if (span) {
    const escaped = escape(value);
    const pad = span.from === span.to && line[span.from - 1] === '|' && escaped ? ' ' : '';
    next = line.slice(0, span.from) + pad + escaped + pad + line.slice(span.to);
  } else {
    // A short row: markdown-it shows the missing cells empty, the source lacks them.
    const cells = splitRow(line).map((cell) => line.slice(cell.from, cell.to));
    while (cells.length <= col) cells.push('');
    cells[col] = escape(value);
    next = `| ${cells.join(' | ')} |`;
  }
  lines[index] = next;
  return lines.join('\n');
}

/** Where cell `row`/`col` starts in the source, for the undo caret. */
export function cellOffset(text: string, row: number, col: number): number {
  const lines = text.split('\n');
  const index = lineOf(row);
  let at = 0;
  for (let line = 0; line < index && line < lines.length; line += 1) at += lines[line]!.length + 1;
  const spans = splitRow(lines[index] ?? '');
  return at + (spans[col] ?? spans[spans.length - 1])!.from;
}

/** The cell that holds `offset` of the table source, and the caret within its text. */
export function cellAt(text: string, offset: number): { row: number; col: number; caret: number } {
  const lines = text.split('\n');
  let line = 0;
  let at = 0;
  while (line < lines.length - 1 && at + lines[line]!.length < offset) {
    at += lines[line]!.length + 1;
    line += 1;
  }
  const row = rowOf(line);
  const source = lines[lineOf(row)] ?? '';
  const column = line === lineOf(row) ? offset - at : 0;
  const spans = splitRow(source);
  const width = parseTable(text)?.align.length ?? spans.length;
  let col = 0;
  while (col < spans.length - 1 && column > spans[col]!.end) col += 1;
  const span = spans[col];
  const caret = span ? Math.max(0, Math.min(column - span.from, span.to - span.from)) : 0;
  return { row, col: Math.min(col, Math.max(0, width - 1)), caret };
}

export function rowIsEmpty(table: Table, row: number): boolean {
  return (table.rows[row] ?? []).every((cell) => cell.trim() === '');
}

export function columnIsEmpty(table: Table, col: number): boolean {
  return table.rows.every((row) => (row[col] ?? '').trim() === '');
}

export function isEmpty(table: Table): boolean {
  return table.rows.every((_, row) => rowIsEmpty(table, row));
}

export function addRow(table: Table, at = table.rows.length): Table {
  const rows = table.rows.slice();
  rows.splice(Math.max(1, at), 0, table.align.map(() => ''));
  return { rows, align: table.align };
}

export function addColumn(table: Table, at = table.align.length): Table {
  const insert = <T>(list: T[], item: T): T[] => [...list.slice(0, at), item, ...list.slice(at)];
  return { rows: table.rows.map((row) => insert(row, '')), align: insert(table.align, '' as Align) };
}

/** The header row cannot go: a table without one is no table. */
export function removeRow(table: Table, row: number): Table {
  if (row < 1) return table;
  return { rows: table.rows.filter((_, index) => index !== row), align: table.align };
}

export function removeColumn(table: Table, col: number): Table {
  if (table.align.length < 2) return table;
  return {
    rows: table.rows.map((row) => row.filter((_, index) => index !== col)),
    align: table.align.filter((_, index) => index !== col),
  };
}
