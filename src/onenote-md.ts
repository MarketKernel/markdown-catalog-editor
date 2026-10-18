/**
 * A OneNote notebook as a folder of notes: each section a folder, each page a
 * note in it, a subpage in a folder named after its page, pictures and
 * attached files in `assets/<page>/` beside them, as the editor keeps its own.
 *
 * OneNote lets text stand anywhere on a page; Markdown is one line after
 * another. The outlines of a page come top to bottom, then left to right,
 * and what OneNote indents under a paragraph that is not a list item comes
 * out at the same level. Links between pages become links between the notes;
 * the page's title and dates go into its front matter. No DOM here.
 */

import { destination, clipFileName, freeName } from './clip';
import { t } from './i18n';
import { linkDestination } from './markdown';
import { readSection, type OneBox, type OneData, type OneElement, type OneFile, type OneImage, type OnePage, type OneRun, type OneTable } from './onenote';
import { baseOf, dirOf, join, stripExtension, type DirHandleLike } from './vault';

/** A file of the notebook: its path inside the notebook's folder, `/` between the steps. */
export interface NotebookFile {
  path: string;
  file: Blob;
}

export interface ConvertedNotebook {
  /** Notes as text, pictures and attachments as slices of the sections they came from. */
  files: Map<string, string | Blob>;
  pages: number;
  /** Sections that could not be read, and why. */
  failed: { path: string; reason: string }[];
}

export interface ConvertOptions {
  /** Start each note with its title as a heading: for when the editor does not show the file name as one. */
  heading?: boolean;
  progress?: (done: number, total: number) => void;
}

/** A section file worth converting: a `.one` outside the recycle bin, not a lock or temporary file. */
export function isSectionFile(path: string): boolean {
  const parts = path.split('/');
  const name = parts[parts.length - 1] ?? '';
  return /\.one$/i.test(name) && !name.startsWith('.') && !name.startsWith('~') && !parts.some((part) => /^OneNote_RecycleBin$/i.test(part));
}

/**
 * Whether a folder is a OneNote notebook: its table of contents, the
 * `.onetoc2` OneNote always writes, straight in it. A `.one` alone is not
 * enough: a folder of notes may keep an old section somewhere among them.
 */
export async function isNotebookFolder(root: DirHandleLike): Promise<boolean> {
  for await (const entry of root.values()) if (entry.kind === 'file' && /\.onetoc2$/i.test(entry.name)) return true;
  return false;
}

/** The same for the files of a picked or dropped folder: a `.onetoc2` straight in it. */
export function isNotebookList(files: readonly File[]): boolean {
  return files.some((file) => {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    return /^[^/]*\/[^/]+\.onetoc2$/i.test(relative);
  });
}

/** The sections under a folder, section groups' folders included, with their paths in it. */
export async function sectionsIn(root: DirHandleLike, prefix = '', depth = 0): Promise<NotebookFile[]> {
  const found: NotebookFile[] = [];
  if (depth > 12) return found;
  for await (const entry of root.values()) {
    const path = join(prefix, entry.name);
    if (entry.kind === 'directory') {
      if (!entry.name.startsWith('.')) found.push(...(await sectionsIn(entry, path, depth + 1)));
    } else if (isSectionFile(path)) found.push({ path, file: await entry.getFile() });
  }
  return found;
}

/**
 * Picked or dropped files → the sections among them, with their paths inside
 * the folder that was picked: a picked folder's own name is the first step of
 * `webkitRelativePath`, which a file dropped on its own has none of.
 */
export function sectionsOf(files: readonly File[]): NotebookFile[] {
  return files
    .map((file) => {
      const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const path = relative.includes('/') ? relative.slice(relative.indexOf('/') + 1) : relative;
      return { path, file };
    })
    .filter((item) => isSectionFile(item.path));
}

interface PlannedPage {
  page: OnePage;
  /** The section's pictures and files, copied out of it as it was read: OneNote may write to it meanwhile. */
  data: Map<OneData, Blob>;
  path: string;
}

/** Every picture and file of the pages, each as a Blob of its own. */
function copyData(pages: readonly OnePage[], bytes: Uint8Array): Map<OneData, Blob> {
  const out = new Map<OneData, Blob>();
  const walk = (elements: readonly OneElement[]): void => {
    for (const element of elements) {
      for (const content of element.contents) {
        if ((content.kind === 'image' || content.kind === 'file') && content.data) {
          const { offset, length } = content.data;
          out.set(content.data, new Blob([bytes.slice(offset, offset + length)]));
        } else if (content.kind === 'table') for (const row of content.rows) for (const cell of row) walk(cell);
      }
      walk(element.children);
    }
  };
  for (const page of pages) for (const box of page.boxes) walk(box.elements);
  return out;
}

/** Converts the sections among `sources`; the rest is left alone. */
export async function convertNotebook(sources: readonly NotebookFile[], options: ConvertOptions = {}): Promise<ConvertedNotebook> {
  const sections = sources.filter((source) => isSectionFile(source.path)).sort((a, b) => a.path.localeCompare(b.path));
  const result: ConvertedNotebook = { files: new Map(), pages: 0, failed: [] };
  const taken = new Set<string>();
  const planned: PlannedPage[] = [];
  for (const [index, source] of sections.entries()) {
    options.progress?.(index, sections.length);
    // A breath between sections: the page stays responsive, and shows the progress.
    await new Promise((resolve) => setTimeout(resolve, 0));
    let pages: OnePage[];
    let data: Map<OneData, Blob>;
    try {
      const bytes = new Uint8Array(await source.file.arrayBuffer());
      pages = readSection(bytes).pages;
      data = copyData(pages, bytes);
    } catch (error) {
      result.failed.push({ path: source.path, reason: error instanceof Error ? error.message : String(error) });
      continue;
    }
    const folder = stripExtension(source.path);
    // A subpage goes into a folder named after the page above it.
    const parents: { level: number; dir: string }[] = [];
    for (const page of pages) {
      while (parents.length && parents[parents.length - 1]!.level >= page.level) parents.pop();
      const dir = parents.length ? parents[parents.length - 1]!.dir : folder;
      const name = freeName(clipFileName(page.title || fallbackTitle(page), t('dialog', 'Untitled')), (name) => taken.has(join(dir, name).toLowerCase()));
      const path = join(dir, name);
      taken.add(path.toLowerCase());
      planned.push({ page, data, path });
      parents.push({ level: page.level, dir: join(dir, stripExtension(name)) });
    }
  }
  options.progress?.(sections.length, sections.length);
  const byId = new Map(planned.filter((item) => item.page.id).map((item) => [item.page.id, item.path]));
  for (const item of planned) {
    const writer = new PageWriter(item, byId, result.files);
    result.files.set(item.path, writer.note(options.heading ?? false));
    result.pages += 1;
  }
  return result;
}

/** A title for a page without one: its first words, or else the day it was made. */
function fallbackTitle(page: OnePage): string {
  for (const box of page.boxes) {
    for (const element of box.elements) {
      for (const content of element.contents) {
        if (content.kind !== 'text') continue;
        const text = content.runs.map((run) => run.text).join('').replace(/\s+/g, ' ').trim();
        if (text) return text.length > 60 ? `${text.slice(0, 60).replace(/\s+\S*$/, '')}…` : text;
      }
    }
  }
  return page.created ? stamp(page.created).slice(0, 10) : '';
}

/** Pictures a browser draws, as markdown.ts embeds them. */
const SHOWN = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;

/** `2025-12-31 23:59`, local time. */
function stamp(date: Date): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** The way from one note to another path in the same folder tree. */
function relativePath(from: string, to: string): string {
  const fromDirs = dirOf(from).split('/').filter(Boolean);
  const toParts = to.split('/');
  let same = 0;
  while (same < fromDirs.length && same < toParts.length - 1 && fromDirs[same] === toParts[same]) same += 1;
  return [...fromDirs.slice(same).map(() => '..'), ...toParts.slice(same)].join('/');
}

/* ------------------------------------------------------------------ *
 * Text
 * ------------------------------------------------------------------ */

/** Text that reads as itself in Markdown, wherever in a line it stands. */
function escapeText(text: string): string {
  return text
    .replace(/\\(?=[!-/:-@[-`{-~]|$)/g, '\\\\')
    .replace(/[`*[\]]/g, '\\$&')
    .replace(/(^|[^\p{L}\p{N}])_|_(?=[^\p{L}\p{N}]|$)/gu, (match) => match.replace('_', '\\_'))
    // Each piece of a run is escaped on its own: a `~` or `=` at its edge, or a `<`
    // anywhere, could make a pair or a tag with the piece next to it.
    .replace(/^~|~$|~(?=~)|(?<=~)~/g, '\\~')
    .replace(/^=|=$|=(?=\=)|(?<==)=/g, '\\=')
    .replace(/</g, '\\<')
    .replace(/&(?=#?\w+;)/g, '\\&');
}

/** `text` without the spaces and tabs at its end; a loop, as `/\s+$/` takes quadratic time on a long run of them. */
function trimEnd(text: string): string {
  let end = text.length;
  while (end > 0 && /\s/.test(text[end - 1]!)) end -= 1;
  return text.slice(0, end);
}

/** What would make the start of a line into a heading, a quote, a list or a fence, escaped. */
function escapeLineStart(line: string): string {
  if (/^(#{1,6}(\s|$)|>|[-+*](\s|$)|[-=]+\s*$|```|~~~)/.test(line)) return `\\${line}`;
  return line.replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2');
}

type Mark = 'link' | 'color' | 'highlight' | 'bold' | 'italic' | 'strike' | 'underline' | 'sup' | 'sub';
const MARKS: Mark[] = ['link', 'color', 'highlight', 'bold', 'italic', 'strike', 'underline', 'sup', 'sub'];

function channels(color: string): number[] {
  return [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
}

/**
 * A text colour worth keeping. Text pasted from the web brings its page's
 * near-black greys along — #333, #24292e — which read as plain text anyway.
 */
function textColor(color: string | undefined): string | null {
  if (!color) return null;
  const rgb = channels(color);
  const grey = Math.max(...rgb) - Math.min(...rgb) <= 48;
  return grey && Math.max(...rgb) <= 0x70 ? null : color;
}

/** A highlight worth keeping: not the white or light grey background a pasted page had. */
function highlightColor(color: string | undefined): string | null {
  if (!color) return null;
  const rgb = channels(color);
  return Math.max(...rgb) - Math.min(...rgb) <= 24 && Math.min(...rgb) >= 0xc0 ? null : color;
}

/** A mark with its value: the link's address or the colour, nothing for the rest. */
function markOf(run: OneRun, mark: Mark, link: (url: string) => string): string | null {
  switch (mark) {
    case 'link':
      // What a pasted page ran a script with is no place to go.
      return run.link && !/^\s*(javascript|vbscript|data):/i.test(run.link) ? link(run.link) : null;
    case 'color':
      return textColor(run.color);
    case 'highlight':
      return highlightColor(run.highlight);
    case 'strike':
      return run.strike ? '' : null;
    default:
      return run[mark] ? '' : null;
  }
}

function opening(mark: Mark, value: string): string {
  switch (mark) {
    case 'link':
      return '[';
    case 'color':
      return `<span style="color:${value}">`;
    case 'highlight':
      // Yellow is what `==mark==` shows; another colour keeps its own.
      return value === '#ffff00' ? '==' : `<span style="background:${value}">`;
    case 'bold':
      return '**';
    case 'italic':
      return '*';
    case 'strike':
      return '~~';
    case 'underline':
      return '<u>';
    default:
      return `<${mark}>`;
  }
}

function closing(mark: Mark, value: string): string {
  switch (mark) {
    case 'link':
      return `](${value})`;
    case 'color':
      return '</span>';
    case 'highlight':
      return value === '#ffff00' ? '==' : '</span>';
    case 'underline':
      return '</u>';
    case 'sup':
    case 'sub':
      return `</${mark}>`;
    default:
      return opening(mark, value);
  }
}

/**
 * Runs of formatted text → Markdown. The marks open and close as the runs
 * change, nested the way they were opened, so two bold runs of different
 * colours stay one bold, and whitespace is kept outside the markers, where
 * Markdown needs it. `br` is what a line break inside the paragraph becomes.
 */
function inline(runs: readonly OneRun[], br: string, link: (url: string) => string): string {
  let out = '';
  const open: { mark: Mark; value: string }[] = [];
  const closeTo = (depth: number): void => {
    if (open.length <= depth) return;
    const kept = trimEnd(out);
    const trailing = out.slice(kept.length);
    out = kept;
    while (open.length > depth) {
      const top = open.pop()!;
      out += closing(top.mark, top.value);
    }
    out += trailing;
  };
  for (const run of runs) {
    const wanted = MARKS.map((mark) => ({ mark, value: markOf(run, mark, link) })).filter((item): item is { mark: Mark; value: string } => item.value !== null);
    // Whitespace alone changes no formatting.
    if (!run.text.trim()) {
      out += run.text;
      continue;
    }
    let keep = 0;
    while (keep < open.length && wanted.some((item) => item.mark === open[keep]!.mark && item.value === open[keep]!.value)) keep += 1;
    closeTo(keep);
    const leading = /^\s*/.exec(run.text)![0];
    out += leading;
    for (const item of wanted) {
      if (open.some((existing) => existing.mark === item.mark)) continue;
      open.push(item);
      out += opening(item.mark, item.value);
    }
    const body = run.text.slice(leading.length);
    out += body
      .split(/\r\n|[\r\n\v\u2028\u2029]/)
      .map((line) => escapeText(line))
      .join(br);
  }
  closeTo(0);
  return trimEnd(out);
}

/* ------------------------------------------------------------------ *
 * A page
 * ------------------------------------------------------------------ */

interface Block {
  text: string;
  /** A list item: the next one follows without a blank line. */
  item: boolean;
}

class PageWriter {
  private readonly assetDir: string;
  private readonly assetNames = new Set<string>();
  private pictures = 0;

  constructor(
    private readonly planned: PlannedPage,
    private readonly byId: Map<string, string>,
    private readonly files: Map<string, string | Blob>,
  ) {
    this.assetDir = join(dirOf(planned.path), join('assets', stripExtension(baseOf(planned.path))));
  }

  note(heading: boolean): string {
    const { page } = this.planned;
    const matter = ['---', `title: ${JSON.stringify(page.title || stripExtension(baseOf(this.planned.path)))}`];
    if (page.created) matter.push(`created: ${stamp(page.created)}`);
    if (page.modified) matter.push(`updated: ${stamp(page.modified)}`);
    matter.push('---');
    const blocks: Block[] = [];
    if (heading) blocks.push({ text: `# ${escapeText(page.title || stripExtension(baseOf(this.planned.path)))}`, item: false });
    for (const box of page.boxes) this.box(box, blocks);
    let body = '';
    for (const [index, block] of blocks.entries()) {
      if (index > 0) body += block.item && blocks[index - 1]!.item ? '\n' : '\n\n';
      body += block.text;
    }
    return body ? `${matter.join('\n')}\n\n${body}\n` : `${matter.join('\n')}\n`;
  }

  private box(box: OneBox, blocks: Block[]): void {
    this.elements(box.elements, '', blocks);
  }

  private elements(elements: readonly OneElement[], indent: string, blocks: Block[]): void {
    let number = 0;
    for (const element of elements) {
      number = element.list?.ordered ? number + 1 : 0;
      this.element(element, indent, number, blocks);
    }
  }

  private element(element: OneElement, indent: string, number: number, blocks: Block[]): void {
    let style = 'p';
    let todo: boolean | null = null;
    const pieces: string[] = [];
    const tables: OneTable[] = [];
    for (const content of element.contents) {
      if (content.kind === 'text') {
        style = content.style;
        todo ??= content.todo;
        pieces.push(content.runs.length ? '\u0000' : '');
      } else if (content.kind === 'table') tables.push(content);
      else pieces.push(this.attachment(content));
    }
    const marker = element.list ? (element.list.ordered ? `${number}. ` : '- ') : todo !== null ? '- ' : '';
    const box = todo === null ? '' : todo ? '[x] ' : '[ ] ';
    const inner = indent + ' '.repeat(marker.length);
    const level = /^h([1-6])$/i.exec(style)?.[1] ?? (style === 'PageTitle' ? '1' : '');
    const quote = !marker && /^(quote|blockquote)$/i.test(style);
    // A heading has no second line; a quote's go on with `>`.
    const br = level ? ' ' : quote ? `\n${indent}> ` : `\n${inner}`;
    let textIndex = 0;
    const texts = element.contents.filter((content) => content.kind === 'text');
    let body = pieces
      .map((piece) => {
        if (piece !== '\u0000') return piece;
        const content = texts[textIndex++];
        return content?.kind === 'text' ? inline(content.runs, br, (url) => this.link(url)) : '';
      })
      .filter(Boolean)
      .join(' ')
      .trim();
    body = body
      .split(br)
      .map((line) => escapeLineStart(line.trim()))
      .join(br);
    if (body && style === 'cite' && !/^\*[^*]/.test(body)) body = `*${body}*`;
    // Code is the text as it is, not escaped: inside backticks a backslash would show.
    const raw = texts.map((content) => (content.kind === 'text' ? content.runs.map((run) => run.text).join('') : '')).join(' ').trim();
    if (body && /^code$/i.test(style) && raw && !/[`\r\n\v]/.test(raw)) body = `\`${raw}\``;
    if (body) {
      const prefix = level ? `${'#'.repeat(Number(level))} ` : quote ? '> ' : '';
      blocks.push({ text: `${indent}${marker}${box}${prefix}${body}`, item: Boolean(marker) });
    }
    for (const table of tables) blocks.push({ text: this.table(table, marker ? inner : indent), item: false });
    this.elements(element.children, marker ? inner : indent, blocks);
  }

  /** A table as a Markdown table, the first row its head; cells keep their lines with `<br>`. */
  private table(table: OneTable, indent: string): string {
    const width = Math.max(1, ...table.rows.map((row) => row.length));
    const cell = (elements: readonly OneElement[]): string => this.cellText(elements).join('<br>').replace(/\|/g, '\\|') || ' ';
    const lines = table.rows.map((row) => `| ${Array.from({ length: width }, (_, i) => cell(row[i] ?? [])).join(' | ')} |`);
    if (!lines.length) lines.push(`| ${' '.repeat(1)} |`);
    lines.splice(1, 0, `| ${Array.from({ length: width }, () => '---').join(' | ')} |`);
    return lines.map((line) => indent + line).join('\n');
  }

  private cellText(elements: readonly OneElement[], depth = 0): string[] {
    const lines: string[] = [];
    for (const element of elements) {
      const parts: string[] = [];
      for (const content of element.contents) {
        if (content.kind === 'text') parts.push(inline(content.runs, '<br>', (url) => this.link(url)));
        else if (content.kind === 'table') parts.push(...content.rows.flatMap((row) => row.flatMap((cell) => this.cellText(cell, depth + 1))));
        else parts.push(this.attachment(content));
      }
      const text = parts.filter(Boolean).join(' ').trim();
      const todo = element.contents.find((content) => content.kind === 'text' && content.todo !== null);
      const box = todo?.kind === 'text' ? (todo.todo ? '☑ ' : '☐ ') : '';
      const bullet = element.list ? (element.list.ordered ? '' : '• ') : '';
      if (text) lines.push(`${'\u00a0'.repeat(depth * 2)}${bullet}${box}${text}`);
      lines.push(...this.cellText(element.children, depth + 1));
    }
    return lines;
  }

  /** A picture or a file, written beside the note; its embed or link. */
  private attachment(content: OneImage | OneFile): string {
    if (!content.data) return '';
    let name: string;
    if (content.kind === 'image') {
      this.pictures += 1;
      const ext = content.ext || '.png';
      // clipFileName gives `<name>.md`, never empty: `image 3` stands for a name of only what a disk refuses.
      const own = clipFileName(content.name.replace(/\.[a-z0-9]{1,5}$/i, ''), `image ${this.pictures}`).slice(0, -3);
      name = `${own}${ext}`;
    } else {
      name = clipFileName(content.name || 'file', 'file').replace(/\.md$/, '');
      if (!/\.[^.]+$/.test(name)) name = `${name}.bin`;
    }
    name = freeName(name, (candidate) => this.assetNames.has(candidate.toLowerCase()));
    this.assetNames.add(name.toLowerCase());
    const path = join(this.assetDir, name);
    const blob = this.planned.data.get(content.data);
    if (!blob) return '';
    this.files.set(path, blob);
    const target = relativePath(this.planned.path, path);
    // What a browser cannot draw — EMF, WMF, TIFF — is linked to, as a file.
    if (content.kind === 'image' && SHOWN.test(name)) return `![[${target}]]`;
    return `[${escapeText(name)}](${linkDestination(target)})`;
  }

  /** A link's destination, as written in the link: a page of this notebook becomes the way to its note. */
  private link(url: string): string {
    if (!/^onenote:/i.test(url)) return destination(url);
    let decoded = url;
    try {
      decoded = decodeURIComponent(url);
    } catch {
      /* kept as it is */
    }
    const id = /page-id=(\{[0-9a-f-]+\})/i.exec(decoded)?.[1]?.toLowerCase();
    const target = id ? this.byId.get(id) : undefined;
    return target ? linkDestination(relativePath(this.planned.path, target)) : destination(url);
  }
}
