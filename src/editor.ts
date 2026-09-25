/**
 * The live-preview editor.
 *
 * The note is rendered block by block. In edit mode the one block the caret
 * sits in is swapped for a textarea holding its Markdown source, styled with
 * the same font size and line height as the rendered version so the text does
 * not jump. Move the caret away and the block renders again.
 *
 * A table is the exception: it stays rendered, and a click opens just the
 * cell under the pointer, showing that cell's own text.
 */

import type { MarkdownIt } from 'markdown-it';
import { sourceOffsetFor, splitBlocks, type Block, type BlockKind } from './blocks';
import * as fmt from './format';
import { t } from './i18n';
import * as grid from './table';

export type Mode = 'read' | 'edit';

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'mark'
  | 'link'
  | 'wikilink'
  | 'bullet'
  | 'ordered'
  | 'task'
  | 'quote'
  | 'table'
  | 'rule'
  | 'codeblock';

export interface EditorHost {
  /** The document changed — drives the dirty flag and autosave. */
  onChange(): void;
  /** A relative link to another file in the vault. */
  onOpenNote(href: string): void;
  /** A `[[wiki link]]`. */
  onOpenWiki(target: string): void;
  /** An image inside the vault: `data-asset` is a relative `src`, `data-embed` an `![[embed]]`. */
  onAsset(image: HTMLImageElement): void;
  onStatus(status: EditorStatus): void;
}

export interface EditorStatus {
  words: number;
  chars: number;
}

/** A table cell open for typing. */
interface OpenCell {
  el: HTMLElement;
  index: number;
  row: number;
  col: number;
}

interface Snapshot {
  text: string;
  /** Null when no block was open, e.g. a checkbox ticked in read mode. */
  caret: number | null;
}

const UNDO_LIMIT = 200;
const TYPING_PAUSE = 600;
const STATUS_DELAY = 150;

/** `- [ ] task` in a list or a quote, bulleted or numbered. */
const TASK_BOX = /^([\s>]*(?:[-*+]|\d+[.)])\s+\[)([ xX])\]/;

const SHORTCUTS: Record<string, FormatAction> = { b: 'bold', i: 'italic', k: 'link' };
const SHIFT_SHORTCUTS: Record<string, FormatAction> = { c: 'code', h: 'mark', k: 'wikilink' };
const INLINE = new Set<FormatAction>(['bold', 'italic', 'strike', 'code', 'mark']);

export class Editor {
  /** Always with `\n` line ends; the file's own ending is restored on the way out. */
  private text = '';
  private eol = '\n';
  private blocks: Block[] = [];
  private nodes: HTMLElement[] = [];
  private env: Record<string, unknown> = {};
  /** Rendered blocks can be reused only while the link references stay the same. */
  private envKey = '';
  private renderedEnvKey = '';
  private renderedLength = 0;

  private mode: Mode = 'read';
  private active: number | null = null;
  private area: HTMLTextAreaElement | null = null;
  private activeHead = '';
  /** Tables never open as source; while a cell is open, no block is active. */
  private cell: OpenCell | null = null;
  /**
   * Typing rewrites only the active block. The blocks after it keep their old
   * offsets, off by `shift`, until the next resplit — so a keystroke costs no
   * reparse, and `startOf` still answers correctly in between.
   */
  private shift = 0;
  private stale = false;

  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private typingTimer = 0;
  private statusTimer = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly scroller: HTMLElement,
    private readonly md: MarkdownIt,
    private readonly host: EditorHost,
  ) {
    this.root.addEventListener('mousedown', this.onMouseDown);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('mouseover', this.onMouseOver);
  }

  /* ---------------------------------------------------------------- *
   * Document
   * ---------------------------------------------------------------- */

  load(text: string): void {
    this.eol = text.includes('\r\n') ? '\r\n' : '\n';
    this.text = text.replace(/\r\n/g, '\n');
    this.undoStack = [];
    this.redoStack = [];
    this.resplit();
    this.render();
    this.scroller.scrollTop = 0;
    this.report();
  }

  getText(): string {
    return this.eol === '\n' ? this.text : this.text.replace(/\n/g, this.eol);
  }

  /** The start of the document, cheap enough to look at on every keystroke. */
  getHead(length: number): string {
    return this.text.slice(0, length);
  }

  getMode(): Mode {
    return this.mode;
  }

  setMode(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'read') {
      this.deactivate();
      return;
    }
    this.steady(this.startOf(this.firstVisibleIndex()), () => this.render());
    this.focusAt(this.startOf(this.firstVisibleIndex()));
  }

  /* ---------------------------------------------------------------- *
   * Model
   * ---------------------------------------------------------------- */

  /** Re-derives every block from the text. Leaves no block open. */
  private resplit(): void {
    this.closeCell();
    this.env = {};
    this.blocks = splitBlocks(this.md, this.text, this.env);
    this.envKey = JSON.stringify(this.env['references'] ?? {});
    this.active = null;
    this.area = null;
    this.shift = 0;
    this.stale = false;
  }

  private startOf(index: number): number {
    const block = this.blocks[index];
    if (!block) return this.text.length;
    return this.active !== null && index > this.active ? block.from + this.shift : block.from;
  }

  private endOf(index: number): number {
    return this.startOf(index) + (this.blocks[index]?.text.length ?? 0);
  }

  /** The block holding `offset`; an offset in the gap between two blocks belongs to the next one. */
  private indexAt(offset: number): number {
    let low = 0;
    let high = this.blocks.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.endOf(mid) >= offset) high = mid;
      else low = mid + 1;
    }
    return Math.max(0, low);
  }

  /* ---------------------------------------------------------------- *
   * Rendering
   * ---------------------------------------------------------------- */

  /** Rebuilds the document, reusing the rendered node of every block whose source is unchanged. */
  private render(): void {
    const pool = this.renderedEnvKey === this.envKey
      ? new NodePool(this.nodes, this.text.length - this.renderedLength)
      : null;
    this.renderedEnvKey = this.envKey;
    this.renderedLength = this.text.length;

    this.closeCell();
    this.area = null;
    const nodes = this.blocks.map((block, index) => {
      if (this.mode === 'edit' && index === this.active) return this.buildSource(block);
      const key = keyFor(block);
      const node = pool?.take(key, block.from) ?? this.buildRendered(block, key);
      node.dataset['index'] = String(index);
      node.dataset['from'] = String(block.from);
      return node;
    });

    patchChildren(this.root, nodes);
    this.nodes = nodes;
    this.root.classList.toggle('doc--edit', this.mode === 'edit');
    const area = this.area as HTMLTextAreaElement | null;
    if (area) {
      autosize(area);
      area.focus({ preventScroll: true });
    }
  }

  /** Runs `change`, then scrolls so that the text at `offset` stays put on screen. */
  private steady(offset: number, change: () => void): void {
    const top = (): number | null => {
      const node = this.nodes[this.indexAt(offset)];
      return node?.offsetParent ? node.offsetTop : null;
    };
    const before = top();
    change();
    const after = top();
    if (before !== null && after !== null) this.scroller.scrollTop += after - before;
  }

  private buildRendered(block: Block, key: string): HTMLElement {
    const el = document.createElement('div');
    el.className = classFor('block', block.kind, block.level, 'block', block.joined);
    el.dataset['key'] = key;
    el.innerHTML = this.renderBlock(block);
    if (block.kind === 'table') decorateTable(el);
    for (const image of Array.from(el.querySelectorAll<HTMLImageElement>('img[data-asset], img[data-embed]'))) {
      this.host.onAsset(image);
    }
    return el;
  }

  private renderBlock(block: Block): string {
    const escaped = this.md.utils.escapeHtml(block.text);
    if (!block.text.trim()) return '<p class="block-blank"><br></p>';
    if (block.kind === 'frontmatter') return `<pre class="frontmatter"><code>${escaped}</code></pre>`;
    if (block.kind === 'definition') return `<p class="definition">${escaped}</p>`;
    try {
      return this.md.render(block.text, this.env);
    } catch {
      return `<pre class="frontmatter"><code>${escaped}</code></pre>`;
    }
  }

  private buildSource(block: Block): HTMLTextAreaElement {
    const area = document.createElement('textarea');
    area.className = classFor('block source', block.kind, block.level, 'source', block.joined);
    area.value = block.text;
    area.rows = 1;
    area.spellcheck = true;
    area.setAttribute('aria-label', t('editor', 'Block source text'));
    area.addEventListener('beforeinput', this.onBeforeInput);
    area.addEventListener('input', this.onInput);
    area.addEventListener('keydown', this.onKeyDown);
    area.addEventListener('blur', this.onBlur);
    this.area = area;
    this.activeHead = firstLine(block.text);
    return area;
  }

  private firstVisibleIndex(): number {
    const top = this.scroller.scrollTop;
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index]!;
      if (node.offsetParent && node.offsetTop + node.offsetHeight > top) return index;
    }
    return 0;
  }

  /* ---------------------------------------------------------------- *
   * Activation
   * ---------------------------------------------------------------- */

  /**
   * Opens the block holding `offset` and puts the caret there. `anchor` is the
   * offset — in the text as it was before an edit — that must not move on screen.
   */
  private focusAt(offset: number, length = 0, anchor = offset): void {
    if (this.mode !== 'edit') return;
    this.flushTyping();
    let table = -1;
    this.steady(anchor, () => {
      if (this.stale) this.resplit();
      const index = this.indexAt(offset);
      table = this.blocks[index]?.kind === 'table' ? index : -1;
      this.active = table < 0 ? index : null;
      this.render();
    });
    if (table >= 0) {
      const at = grid.cellAt(this.blocks[table]!.text, offset - this.startOf(table));
      this.openCell(table, at.row, at.col, at.caret, length);
      this.report();
      return;
    }
    const area = this.area as HTMLTextAreaElement | null;
    if (area && this.active !== null) {
      const at = Math.max(0, Math.min(offset - this.startOf(this.active), area.value.length));
      area.setSelectionRange(at, Math.min(at + length, area.value.length));
      this.scrollIntoView(area);
    }
    this.report();
  }

  private deactivate(): void {
    this.flushTyping();
    const anchor = this.startOf(this.active ?? this.firstVisibleIndex());
    this.steady(anchor, () => {
      if (this.stale) this.resplit();
      this.active = null;
      this.render();
    });
    this.report();
  }

  /** A source block or a table cell. */
  private scrollIntoView(el: HTMLElement): void {
    const box = el.getBoundingClientRect();
    const view = this.scroller.getBoundingClientRect();
    if (box.top < view.top + 24) this.scroller.scrollTop -= view.top + 24 - box.top;
    else if (box.bottom > view.bottom - 24) this.scroller.scrollTop += box.bottom - view.bottom + 24;
  }

  /* ---------------------------------------------------------------- *
   * Mouse
   * ---------------------------------------------------------------- */

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (this.mode !== 'edit') return;
    const target = event.target as HTMLElement | null;
    const frame = target?.closest<HTMLElement>('.table-frame');
    if (target && frame) {
      this.onTableMouseDown(event, frame, target);
      return;
    }
    if (!target || target.closest('a, input, button')) return;
    const holder = target.closest<HTMLElement>('.block');
    if (!holder || holder.tagName === 'TEXTAREA') return;
    const index = Number(holder.dataset['index'] ?? '-1');
    if (index < 0) return;
    event.preventDefault();
    this.focusAt(this.startOf(index) + this.caretFromPoint(holder, event));
  };

  /** Maps the click to the matching place in the Markdown source. */
  private caretFromPoint(holder: HTMLElement, event: MouseEvent): number {
    const block = this.blocks[Number(holder.dataset['index'] ?? '0')];
    if (!block) return 0;
    const point = caretRangeAt(event.clientX, event.clientY);
    if (!point) return block.text.length;
    try {
      const range = document.createRange();
      range.setStart(holder, 0);
      range.setEnd(point.node, point.offset);
      return sourceOffsetFor(block.text, range.toString());
    } catch {
      return block.text.length;
    }
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const tool = target.closest<HTMLElement>('.table-tool');
    if (tool) {
      event.preventDefault();
      this.onTableTool(tool);
      return;
    }

    const box = target.closest<HTMLInputElement>('input.task');
    if (box) {
      event.preventDefault();
      const holder = box.closest<HTMLElement>('.block');
      this.toggleTask(Number(holder?.dataset['index'] ?? '-1'), Number(box.dataset['taskLine'] ?? '0'));
      return;
    }

    const link = target.closest<HTMLAnchorElement>('a');
    if (!link) return;
    const wiki = link.dataset['wiki'];
    if (wiki !== undefined) {
      event.preventDefault();
      this.host.onOpenWiki(wiki);
      return;
    }
    const note = link.dataset['note'];
    if (note !== undefined) {
      event.preventDefault();
      this.host.onOpenNote(note);
    }
  };

  private toggleTask(index: number, line: number): void {
    const block = this.blocks[index];
    if (!block || index === this.active) return;
    const lines = block.text.split('\n');
    const source = lines[line];
    if (source === undefined) return;
    const flipped = source.replace(TASK_BOX, (_all, head: string, mark: string) => `${head}${mark === ' ' ? 'x' : ' '}]`);
    if (flipped === source) return;
    const at = this.startOf(index) + lines.slice(0, line).reduce((sum, text) => sum + text.length + 1, 0);
    this.pushUndo();
    this.closeCell();
    if (this.active !== null) this.deactivate();
    this.text = this.text.slice(0, at) + flipped + this.text.slice(at + source.length);
    this.resplit();
    this.render();
    this.changed();
  }

  /* ---------------------------------------------------------------- *
   * Typing
   * ---------------------------------------------------------------- */

  private readonly onBeforeInput = (): void => {
    this.markTyping();
  };

  private readonly onInput = (): void => {
    const area = this.area;
    if (!area || this.active === null) return;
    this.syncFromArea();
    autosize(area);
    const head = firstLine(area.value);
    if (head !== this.activeHead) {
      this.activeHead = head;
      this.retypeActive();
    }
    this.changed();
  };

  /** Writes the textarea back into the document without touching the rest of it. */
  private syncFromArea(): void {
    const area = this.area;
    if (!area || this.active === null) return;
    const block = this.blocks[this.active]!;
    const value = area.value;
    if (value === block.text) return;
    const start = this.startOf(this.active);
    this.text = this.text.slice(0, start) + value + this.text.slice(start + block.text.length);
    this.shift += value.length - block.text.length;
    this.blocks[this.active] = { ...block, text: value };
    this.stale = true;
  }

  /** `# ` typed at the start of a line grows the source line to heading size. */
  private retypeActive(): void {
    const area = this.area;
    if (!area || this.active === null) return;
    const probe = splitBlocks(this.md, area.value).find((block) => block.kind !== 'blank');
    const kind = probe?.kind ?? 'blank';
    const level = probe?.level ?? 0;
    const block = this.blocks[this.active]!;
    if (kind === block.kind && level === block.level) return;
    this.blocks[this.active] = { ...block, kind, level };
    area.className = classFor('block source', kind, level, 'source', block.joined);
    autosize(area);
  }

  private readonly onBlur = (): void => {
    // Losing focus to the toolbar must not close the block; those controls
    // cancel their own mousedown, so a real blur means the caret left.
    window.setTimeout(() => {
      if (this.area && document.activeElement !== this.area) this.deactivate();
    }, 0);
  };

  private changed(): void {
    this.host.onChange();
    this.report();
  }

  /** Counting words is a pass over the whole text — not something to do on every keystroke. */
  private report(): void {
    window.clearTimeout(this.statusTimer);
    this.statusTimer = window.setTimeout(() => {
      this.host.onStatus({ words: countWords(this.text), chars: this.text.length });
    }, STATUS_DELAY);
  }

  /* ---------------------------------------------------------------- *
   * Keyboard
   * ---------------------------------------------------------------- */

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const area = this.area;
    // Keys pressed while an input method composes a word belong to it.
    if (!area || this.active === null || event.isComposing) return;
    const block = this.blocks[this.active]!;
    const mod = event.metaKey || event.ctrlKey;

    if (mod && event.altKey && /^[0-6]$/.test(event.key)) {
      event.preventDefault();
      this.heading(Number(event.key));
      return;
    }
    if (mod && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if (key === 'y') {
        event.preventDefault();
        this.redo();
        return;
      }
      const action = (event.shiftKey ? SHIFT_SHORTCUTS : SHORTCUTS)[key];
      if (action) {
        event.preventDefault();
        this.format(action);
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.deactivate();
      this.scroller.focus();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      this.pushUndo();
      this.apply(event.shiftKey ? fmt.outdent(this.selection()) : fmt.indent(this.selection()));
      return;
    }

    if (event.key === 'Enter' && !mod && !event.shiftKey) {
      event.preventDefault();
      this.pushUndo();
      this.onEnter(block.kind);
      return;
    }

    const collapsed = area.selectionStart === area.selectionEnd;
    if (event.key === 'Backspace' && collapsed && area.selectionStart === 0) {
      if (this.join(this.active - 1)) event.preventDefault();
      return;
    }
    if (event.key === 'Delete' && collapsed && area.selectionStart === area.value.length) {
      if (this.join(this.active)) event.preventDefault();
      return;
    }

    if (collapsed && !event.shiftKey && !mod && !event.altKey) this.onArrow(event, area);
  };

  private onEnter(kind: BlockKind): void {
    const selection = this.selection();
    if (kind === 'code' || kind === 'frontmatter' || kind === 'html' || kind === 'table') {
      this.insert(fmt.keepIndent(selection));
      return;
    }
    if (kind === 'list' || kind === 'quote') {
      const next = fmt.continueLine(selection);
      if (!next) {
        this.insert('\n');
      } else if (!next.clear) {
        this.insert(next.insert);
      } else {
        const { from, to, text } = next.clear;
        this.apply({
          value: selection.value.slice(0, from) + text + selection.value.slice(to),
          start: from + text.length,
          end: from + text.length,
        });
        // An emptied marker at the outer level means: leave the list.
        if (text === '') this.splitAtCaret();
      }
      return;
    }
    this.splitAtCaret();
  }

  private onArrow(event: KeyboardEvent, area: HTMLTextAreaElement): void {
    const index = this.active;
    if (index === null) return;
    const at = area.selectionStart;
    const head = area.value.slice(0, at);
    const column = at - (head.lastIndexOf('\n') + 1);
    const previous = this.blocks[index - 1];
    const next = this.blocks[index + 1];

    let target: number | null = null;
    if (event.key === 'ArrowLeft' && at === 0 && previous) {
      target = this.endOf(index - 1);
    } else if (event.key === 'ArrowRight' && at === area.value.length && next) {
      target = this.startOf(index + 1);
    } else if (event.key === 'ArrowUp' && !head.includes('\n') && previous) {
      const lastStart = previous.text.lastIndexOf('\n') + 1;
      target = this.startOf(index - 1) + Math.min(lastStart + column, previous.text.length);
    } else if (event.key === 'ArrowDown' && !area.value.slice(at).includes('\n') && next) {
      target = this.startOf(index + 1) + Math.min(column, firstLine(next.text).length);
    }
    if (target === null) return;
    event.preventDefault();
    this.focusAt(target);
  }

  /* ---------------------------------------------------------------- *
   * Structural edits
   * ---------------------------------------------------------------- */

  /** Enter outside a list: the block splits in two at the caret. */
  private splitAtCaret(): void {
    const area = this.area;
    if (!area || this.active === null) return;
    this.syncFromArea();
    const start = this.startOf(this.active);
    const split = fmt.splitBlock(
      this.text.slice(0, start),
      this.selection(),
      this.text.slice(start + area.value.length),
    );
    this.text = split.text;
    this.stale = true;
    this.focusAt(split.caret, 0, start + area.selectionStart);
    this.changed();
  }

  /** Backspace at the start of a block or Delete at its end: drops the gap between `index` and the next block. */
  private join(index: number): boolean {
    if (index < 0 || index >= this.blocks.length - 1) return false;
    const upper = this.blocks[index]!;
    const lower = this.blocks[index + 1]!;
    // Text glued onto a table would turn into one of its rows: step into the table instead.
    if ((upper.kind === 'table' && lower.kind !== 'blank') || (lower.kind === 'table' && upper.kind !== 'blank')) {
      this.focusAt(upper.kind === 'table' ? this.endOf(index) : this.startOf(index + 1));
      return true;
    }
    const end = this.endOf(index);
    const next = this.startOf(index + 1);
    this.pushUndo();
    this.text = this.text.slice(0, end) + this.text.slice(next);
    this.stale = true;
    this.focusAt(end);
    this.changed();
    return true;
  }

  /* ---------------------------------------------------------------- *
   * Tables
   * ---------------------------------------------------------------- */

  /**
   * Opens one cell for typing. It shows its own text — `**bold**` rather than
   * bold — but never the pipes around it. The caret is an offset into that
   * text, or `end`; `length` selects from it.
   */
  private openCell(index: number, row: number, col: number, caret: number | 'end' = 'end', length = 0): void {
    this.closeCell();
    const block = this.blocks[index];
    const el = this.nodes[index]?.querySelector<HTMLElement>(`[data-row="${row}"][data-col="${col}"]`);
    if (!block || !el) return;
    const value = grid.cellValue(block.text, row, col);
    setCellText(el, value);
    el.contentEditable = editableMode();
    el.spellcheck = true;
    el.classList.add('cell--editing');
    el.addEventListener('beforeinput', this.onBeforeInput);
    el.addEventListener('input', this.onCellInput);
    el.addEventListener('keydown', this.onCellKeyDown);
    el.addEventListener('paste', this.onCellPaste);
    el.addEventListener('blur', this.onCellBlur);
    this.cell = { el, index, row, col };
    el.focus({ preventScroll: true });
    const at = caret === 'end' ? value.length : Math.min(caret, value.length);
    setTextSelection(el, at, Math.min(at + length, value.length));
    this.scrollIntoView(el);
  }

  /** Renders the open cell again. Runs before anything re-derives the blocks. */
  private closeCell(): void {
    const cell = this.cell;
    if (!cell) return;
    this.cell = null;
    const { el } = cell;
    el.removeEventListener('beforeinput', this.onBeforeInput);
    el.removeEventListener('input', this.onCellInput);
    el.removeEventListener('keydown', this.onCellKeyDown);
    el.removeEventListener('paste', this.onCellPaste);
    el.removeEventListener('blur', this.onCellBlur);
    el.removeAttribute('contenteditable');
    el.classList.remove('cell--editing');
    const block = this.blocks[cell.index];
    const value = block?.kind === 'table' ? grid.cellValue(block.text, cell.row, cell.col) : '';
    try {
      el.innerHTML = this.md.renderInline(value.replace(/\n/g, '<br>'), this.env);
    } catch {
      el.textContent = value;
    }
    for (const image of Array.from(el.querySelectorAll<HTMLImageElement>('img[data-asset], img[data-embed]'))) {
      this.host.onAsset(image);
    }
  }

  private readonly onCellBlur = (): void => {
    const el = this.cell?.el;
    window.setTimeout(() => {
      if (el && this.cell?.el === el && document.activeElement !== el) this.closeCell();
    }, 0);
  };

  private readonly onCellInput = (): void => {
    const cell = this.cell;
    if (!cell) return;
    const block = this.blocks[cell.index]!;
    this.spliceBlock(cell.index, grid.setCell(block.text, cell.row, cell.col, cell.el.textContent ?? ''));
    // A cell that just got text is no longer an empty row or column to delete.
    for (const tool of Array.from(this.nodes[cell.index]!.querySelectorAll<HTMLElement>('.table-tool--drop-row, .table-tool--drop-col'))) {
      tool.hidden = true;
    }
    this.changed();
  };

  /** Pasted text goes in as plain text; its line breaks stay, as `<br>` in the file. */
  private readonly onCellPaste = (event: ClipboardEvent): void => {
    const text = event.clipboardData?.getData('text/plain');
    if (text === undefined) return;
    event.preventDefault();
    this.markTyping();
    this.insertInCell(text.replace(/\r\n?/g, '\n').replace(/^\n+|\n+$/g, ''));
  };

  private insertInCell(text: string): void {
    const sel = this.cellSelection(this.cell!);
    const at = sel.start + text.length;
    this.applyCell({ value: sel.value.slice(0, sel.start) + text + sel.value.slice(sel.end), start: at, end: at });
  }

  /**
   * Rewrites one block in place while no block is active. The blocks after it
   * only move, and the rendered nodes stay: nothing is parsed per keystroke.
   */
  private spliceBlock(index: number, text: string): void {
    const block = this.blocks[index]!;
    if (text === block.text) return;
    const delta = text.length - block.text.length;
    this.text = this.text.slice(0, block.from) + text + this.text.slice(block.from + block.text.length);
    this.blocks[index] = { ...block, text };
    for (let at = index + 1; at < this.blocks.length; at += 1) {
      const next = this.blocks[at]!;
      next.from += delta;
      const node = this.nodes[at];
      if (node) node.dataset['from'] = String(next.from);
    }
    this.renderedLength += delta;
    const node = this.nodes[index];
    if (node) node.dataset['key'] = keyFor(this.blocks[index]!);
  }

  /**
   * Adds or removes rows and columns: the table is written out anew. `change`
   * returns null to remove the whole table; `focus` is the cell to open after.
   */
  private editTable(index: number, change: (table: grid.Table) => grid.Table | null, focus?: { row: number; col: number }): void {
    const block = this.blocks[index];
    const table = block ? grid.parseTable(block.text) : null;
    if (!block || !table) return;
    const next = change(table);
    this.pushUndo();
    this.closeCell();
    let from = block.from;
    let to = block.from + block.text.length;
    // A removed table takes one of the gaps around it along.
    if (!next && index > 0) from = this.endOf(index - 1);
    else if (!next && index < this.blocks.length - 1) to = this.startOf(index + 1);
    this.text = this.text.slice(0, from) + (next ? grid.formatTable(next) : '') + this.text.slice(to);
    this.resplit();
    this.render();
    this.changed();
    if (!next) this.focusAt(from);
    else if (focus) this.openCell(index, focus.row, focus.col);
  }

  private onTableMouseDown(event: MouseEvent, frame: HTMLElement, target: HTMLElement): void {
    // The controls must not pull focus out of the cell being typed into.
    if (target.closest('button')) {
      event.preventDefault();
      return;
    }
    const cell = target.closest<HTMLElement>('th, td');
    if (cell && cell === this.cell?.el) return;
    if (target.closest('a, input')) return;
    event.preventDefault();
    const holder = frame.closest<HTMLElement>('.block');
    if (!cell || !holder) return;
    const row = Number(cell.dataset['row']);
    const col = Number(cell.dataset['col']);
    const block = this.blocks[Number(holder.dataset['index'])];
    // Read the click before the open block closes and the page may scroll.
    const caret = block ? cellCaretFromPoint(cell, grid.cellValue(block.text, row, col), event) : 'end';
    if (this.active !== null) this.deactivate();
    this.openCell(Number(holder.dataset['index']), row, col, caret);
  }

  private onTableTool(tool: HTMLElement): void {
    if (this.mode !== 'edit') return;
    if (this.active !== null) this.deactivate();
    const index = Number(tool.closest<HTMLElement>('.block')?.dataset['index'] ?? '-1');
    const table = grid.parseTable(this.blocks[index]?.text ?? '');
    if (!table) return;
    const row = Number(tool.dataset['row']);
    const col = Number(tool.dataset['col']);
    switch (tool.dataset['table']) {
      case 'add-row':
        this.editTable(index, (t) => grid.addRow(t), { row: table.rows.length, col: 0 });
        return;
      case 'add-col':
        this.editTable(index, (t) => grid.addColumn(t), { row: 0, col: table.align.length });
        return;
      case 'drop-row':
        this.editTable(index, (t) => grid.removeRow(t, row));
        return;
      case 'drop-col':
        this.editTable(index, (t) => grid.removeColumn(t, col));
    }
  }

  /** Puts the × of an empty row and an empty column next to the cell under the pointer. */
  private readonly onMouseOver = (event: MouseEvent): void => {
    if (this.mode !== 'edit') return;
    const target = event.target as HTMLElement | null;
    const cell = target?.closest<HTMLElement>('th, td');
    const frame = cell?.closest<HTMLElement>('.table-frame');
    const index = Number(frame?.closest<HTMLElement>('.block')?.dataset['index'] ?? '-1');
    const table = grid.parseTable(this.blocks[index]?.text ?? '');
    if (!cell || !frame || !table) return;
    const row = Number(cell.dataset['row']);
    const col = Number(cell.dataset['col']);
    const box = frame.getBoundingClientRect();
    const line = cell.parentElement!.getBoundingClientRect();
    const column = cell.getBoundingClientRect();

    const dropRow = frame.querySelector<HTMLElement>('.table-tool--drop-row')!;
    dropRow.hidden = !(row > 0 && grid.rowIsEmpty(table, row));
    dropRow.dataset['row'] = String(row);
    dropRow.style.top = `${line.top - box.top}px`;
    dropRow.style.height = `${line.height}px`;

    const dropCol = frame.querySelector<HTMLElement>('.table-tool--drop-col')!;
    dropCol.hidden = !(table.align.length > 1 && grid.columnIsEmpty(table, col));
    dropCol.dataset['col'] = String(col);
    dropCol.style.left = `${column.left - box.left}px`;
    dropCol.style.width = `${column.width}px`;
  };

  private readonly onCellKeyDown = (event: KeyboardEvent): void => {
    const cell = this.cell;
    if (!cell || event.isComposing) return;
    const mod = event.metaKey || event.ctrlKey;
    if (event.key === 'Enter') {
      event.preventDefault();
      // Ctrl+Enter (⌘Enter, Shift+Enter) breaks the line inside the cell; Enter alone goes down a row.
      if (mod || event.shiftKey) {
        this.pushUndo();
        this.insertInCell('\n');
      } else if (!event.altKey) {
        this.cellBelow();
      }
      return;
    }
    if (mod && !event.altKey) {
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault();
        if (key === 'y' || event.shiftKey) this.redo();
        else this.undo();
        return;
      }
      const action = (event.shiftKey ? SHIFT_SHORTCUTS : SHORTCUTS)[key];
      if (action) {
        event.preventDefault();
        this.format(action);
      }
      return;
    }

    const value = cell.el.textContent ?? '';
    const { start, end } = textOffsets(cell.el);
    const plain = start === end && !event.shiftKey && !mod && !event.altKey;
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeCell();
        this.scroller.focus();
        return;
      case 'Tab':
        event.preventDefault();
        this.stepCell(event.shiftKey ? -1 : 1, 'all');
        return;
      case 'Backspace':
        if (value === '') {
          event.preventDefault();
          this.dropEmpty();
        }
        return;
      case 'ArrowUp':
      case 'ArrowDown':
        // Within a cell of several lines the arrows move between its lines first.
        if (!plain || (event.key === 'ArrowUp' ? value.slice(0, start) : value.slice(start)).includes('\n')) return;
        event.preventDefault();
        this.moveRow(event.key === 'ArrowUp' ? -1 : 1);
        return;
      case 'ArrowLeft':
        if (!plain || start > 0) return;
        event.preventDefault();
        this.stepCell(-1, 'end');
        return;
      case 'ArrowRight':
        if (!plain || start < value.length) return;
        event.preventDefault();
        this.stepCell(1, 'start');
    }
  };

  /** The next or previous cell in reading order. Tab past the last cell adds a row. */
  private stepCell(delta: 1 | -1, where: 'start' | 'end' | 'all'): void {
    const cell = this.cell!;
    const table = grid.parseTable(this.blocks[cell.index]!.text);
    if (!table) return;
    const width = table.align.length;
    const flat = cell.row * width + cell.col + delta;
    if (flat < 0) {
      this.leaveTable(-1);
    } else if (flat >= table.rows.length * width) {
      if (where === 'all') this.editTable(cell.index, (t) => grid.addRow(t), { row: table.rows.length, col: 0 });
      else this.leaveTable(1);
    } else {
      const row = Math.floor(flat / width);
      const col = flat % width;
      const length = where === 'all' ? grid.cellValue(this.blocks[cell.index]!.text, row, col).length : 0;
      this.openCell(cell.index, row, col, where === 'end' ? 'end' : 0, length);
    }
  }

  private moveRow(delta: 1 | -1): void {
    const cell = this.cell!;
    const rows = grid.parseTable(this.blocks[cell.index]!.text)?.rows.length ?? 0;
    const row = cell.row + delta;
    if (row < 0 || row >= rows) this.leaveTable(delta);
    else this.openCell(cell.index, row, cell.col);
  }

  /** Enter goes down a row; on the last row it starts a new block below the table. */
  private cellBelow(): void {
    const cell = this.cell!;
    const block = this.blocks[cell.index]!;
    const rows = grid.parseTable(block.text)?.rows.length ?? 0;
    if (cell.row + 1 < rows) {
      this.openCell(cell.index, cell.row + 1, cell.col);
      return;
    }
    this.pushUndo();
    this.closeCell();
    const end = block.from + block.text.length;
    const split = fmt.splitBlock(
      this.text.slice(0, block.from),
      { value: block.text, start: block.text.length, end: block.text.length },
      this.text.slice(end),
    );
    this.text = split.text;
    this.stale = true;
    this.focusAt(split.caret, 0, block.from);
    this.changed();
  }

  /** Arrows past the edge of the table go on to the block next to it. */
  private leaveTable(direction: 1 | -1): void {
    const index = this.cell!.index;
    if (direction < 0 && index > 0) this.focusAt(this.endOf(index - 1));
    else if (direction > 0 && index < this.blocks.length - 1) this.focusAt(this.startOf(index + 1));
  }

  /**
   * Backspace in an empty cell. It removes the row when the whole row is
   * empty, else the column when the whole column is; a table left with no
   * text at all goes as a whole. Otherwise the caret steps back a cell.
   */
  private dropEmpty(): void {
    const { index, row, col } = this.cell!;
    const table = grid.parseTable(this.blocks[index]!.text);
    if (!table) return;
    if (row > 0 && grid.rowIsEmpty(table, row)) {
      this.editTable(index, (t) => grid.removeRow(t, row), { row: row - 1, col });
    } else if (table.align.length > 1 && grid.columnIsEmpty(table, col)) {
      this.editTable(index, (t) => grid.removeColumn(t, col), { row, col: Math.max(0, col - 1) });
    } else if (grid.isEmpty(table)) {
      this.editTable(index, () => null);
    } else {
      this.stepCell(-1, 'end');
    }
  }

  /** Inline marks, links and colours work inside a cell; block formats do not. */
  private formatCell(action: FormatAction): void {
    const sel = this.cellSelection(this.cell!);
    let next: fmt.Selection | null = null;
    if (INLINE.has(action)) next = fmt.toggleInline(sel, action as fmt.InlineMark);
    else if (action === 'link') next = fmt.makeLink(sel);
    else if (action === 'wikilink') next = fmt.makeWikiLink(sel);
    if (!next) return;
    this.pushUndo();
    this.applyCell(next);
  }

  private cellSelection(cell: OpenCell): fmt.Selection {
    return { value: cell.el.textContent ?? '', ...textOffsets(cell.el) };
  }

  private applyCell(next: fmt.Selection): void {
    const cell = this.cell;
    if (!cell) return;
    setCellText(cell.el, next.value);
    setTextSelection(cell.el, next.start, next.end);
    this.onCellInput();
  }

  /* ---------------------------------------------------------------- *
   * Toolbar
   * ---------------------------------------------------------------- */

  format(action: FormatAction): void {
    if (this.cell) {
      this.formatCell(action);
      return;
    }
    if (!this.area) return;
    const selection = this.selection();
    this.pushUndo();
    switch (action) {
      case 'bold':
      case 'italic':
      case 'strike':
      case 'code':
      case 'mark':
        this.apply(fmt.toggleInline(selection, action));
        return;
      case 'link':
        this.apply(fmt.makeLink(selection));
        return;
      case 'wikilink':
        this.apply(fmt.makeWikiLink(selection));
        return;
      case 'bullet':
        this.apply(fmt.toggleBullet(selection));
        return;
      case 'ordered':
        this.apply(fmt.toggleOrdered(selection));
        return;
      case 'task':
        this.apply(fmt.toggleTask(selection));
        return;
      case 'quote':
        this.apply(fmt.toggleQuote(selection));
        return;
      case 'table': {
        this.apply(fmt.table(selection));
        // The new table opens at once, in its first header cell.
        const area = this.area as HTMLTextAreaElement;
        this.focusAt(this.startOf(this.active!) + area.selectionStart, area.selectionEnd - area.selectionStart);
        return;
      }
      case 'codeblock':
        this.apply(wrapBlock(selection, '```\n', '\n```'));
        return;
      case 'rule':
        this.insert(selection.value.trim() ? '\n\n---\n' : '---');
    }
  }

  heading(level: number): void {
    if (!this.area) return;
    this.pushUndo();
    this.apply(fmt.setHeading(this.selection(), level));
  }

  colorize(style: string): void {
    if (this.cell) {
      this.pushUndo();
      this.applyCell(fmt.colorize(this.cellSelection(this.cell), style));
      return;
    }
    if (!this.area) return;
    this.pushUndo();
    this.apply(fmt.colorize(this.selection(), style));
  }

  private selection(): fmt.Selection {
    const area = this.area!;
    return { value: area.value, start: area.selectionStart, end: area.selectionEnd };
  }

  private apply(next: fmt.Selection): void {
    const area = this.area;
    if (!area) return;
    area.value = next.value;
    area.setSelectionRange(next.start, next.end);
    this.syncFromArea();
    autosize(area);
    this.retypeActive();
    area.focus({ preventScroll: true });
    this.changed();
  }

  private insert(text: string): void {
    const area = this.area;
    if (!area) return;
    const start = area.selectionStart;
    const end = area.selectionEnd;
    this.apply({
      value: area.value.slice(0, start) + text + area.value.slice(end),
      start: start + text.length,
      end: start + text.length,
    });
  }

  /* ---------------------------------------------------------------- *
   * Undo
   * ---------------------------------------------------------------- */

  private snapshot(): Snapshot {
    if (this.cell) {
      const { el, index, row, col } = this.cell;
      const block = this.blocks[index]!;
      return { text: this.text, caret: block.from + grid.cellOffset(block.text, row, col) + textOffsets(el).start };
    }
    const caret = this.area && this.active !== null ? this.startOf(this.active) + this.area.selectionStart : null;
    return { text: this.text, caret };
  }

  private pushUndo(): void {
    this.flushTyping();
    this.record();
  }

  private record(): void {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  /** A run of keystrokes is one undo step: only the first one records. */
  private markTyping(): void {
    if (!this.typingTimer) this.record();
    window.clearTimeout(this.typingTimer);
    this.typingTimer = window.setTimeout(() => {
      this.typingTimer = 0;
    }, TYPING_PAUSE);
  }

  private flushTyping(): void {
    window.clearTimeout(this.typingTimer);
    this.typingTimer = 0;
  }

  undo(): void {
    this.step(this.undoStack, this.redoStack);
  }

  redo(): void {
    this.step(this.redoStack, this.undoStack);
  }

  private step(from: Snapshot[], to: Snapshot[]): void {
    this.flushTyping();
    const target = from.pop();
    if (!target) return;
    to.push(this.snapshot());
    this.text = target.text;
    this.resplit();
    if (this.mode === 'edit' && target.caret !== null) this.focusAt(target.caret);
    else this.render();
    this.changed();
  }

  /* ---------------------------------------------------------------- *
   * Search
   * ---------------------------------------------------------------- */

  findAll(query: string, matchCase: boolean): number[] {
    if (!query) return [];
    const haystack = matchCase ? this.text : this.text.toLowerCase();
    const needle = matchCase ? query : query.toLowerCase();
    const hits: number[] = [];
    for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + needle.length)) {
      hits.push(at);
      if (hits.length > 2000) break;
    }
    return hits;
  }

  /** Scrolls a search hit into view and flashes its block. Focus stays in the search field. */
  reveal(offset: number): void {
    const node = this.nodes[this.indexAt(offset)];
    if (!node) return;
    this.scroller.scrollTop = Math.max(0, node.offsetTop - 48);
    node.classList.add('block--flash');
    window.setTimeout(() => node.classList.remove('block--flash'), 900);
  }

  /** Puts the caret on a search hit once the search is over. */
  select(offset: number, length: number): void {
    this.focusAt(offset, length);
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function autosize(area: HTMLTextAreaElement): void {
  area.style.height = '0px';
  area.style.height = `${area.scrollHeight}px`;
}

/**
 * The rendered blocks of the previous render, to be found again by source.
 * Identical blocks — two equal lists, a run of blank lines — are told apart
 * by position: where the block was, or where an edit of `shift` characters
 * before it has moved it to. Handing them out in any other order would move
 * every one of them in the DOM.
 */
class NodePool {
  private readonly byPlace = new Map<string, HTMLElement>();
  private readonly byKey = new Map<string, HTMLElement[]>();
  private readonly next = new Map<string, number>();
  private readonly used = new Set<HTMLElement>();

  constructor(nodes: readonly HTMLElement[], private readonly shift: number) {
    for (const node of nodes) {
      const key = node.dataset['key'];
      if (key === undefined) continue;
      this.byPlace.set(`${node.dataset['from']}:${key}`, node);
      const same = this.byKey.get(key);
      if (same) same.push(node);
      else this.byKey.set(key, [node]);
    }
  }

  take(key: string, from: number): HTMLElement | null {
    for (const place of [from, from - this.shift]) {
      const node = this.byPlace.get(`${place}:${key}`);
      if (node && !this.used.has(node)) return this.claim(node);
    }
    const same = this.byKey.get(key) ?? [];
    for (let at = this.next.get(key) ?? 0; at < same.length; at += 1) {
      const node = same[at]!;
      if (this.used.has(node)) continue;
      this.next.set(key, at + 1);
      return this.claim(node);
    }
    return null;
  }

  private claim(node: HTMLElement): HTMLElement {
    this.used.add(node);
    return node;
  }
}

/**
 * Makes `nodes` the children of `parent`, touching only what changed: moving
 * every node of a long note on each caret move would relayout all of it.
 */
function patchChildren(parent: HTMLElement, nodes: readonly HTMLElement[]): void {
  const keep = new Set<Node>(nodes);
  for (const child of Array.from(parent.children)) {
    if (!keep.has(child)) child.remove();
  }
  let cursor = parent.firstChild;
  for (const node of nodes) {
    if (cursor === node) cursor = cursor.nextSibling;
    else parent.insertBefore(node, cursor);
  }
}

/** What a rendered block is recognised by when the document renders again. */
function keyFor(block: Block): string {
  return `${block.kind}${block.level}${block.joined ? '+' : ''}\n${block.text}`;
}

/**
 * Tags every cell with its place in the grid and adds the controls that show
 * around the table on hover in edit mode: a bar below it adds a row, a bar to
 * its right a column, and a × deletes an empty row or column.
 */
function decorateTable(el: HTMLElement): void {
  const table = el.querySelector('table');
  if (!table) return;
  const frame = document.createElement('div');
  frame.className = 'table-frame';
  table.replaceWith(frame);
  frame.append(table);
  Array.from(table.rows).forEach((line, row) => {
    Array.from(line.cells).forEach((cell, col) => {
      cell.dataset['row'] = String(row);
      cell.dataset['col'] = String(col);
    });
  });
  frame.append(tableTool('add-row'), tableTool('add-col'), tableTool('drop-row'), tableTool('drop-col'));
}

type TableTool = 'add-row' | 'add-col' | 'drop-row' | 'drop-col';

function tableToolLabel(action: TableTool): string {
  return {
    'add-row': t('editor', 'Add a row'),
    'add-col': t('editor', 'Add a column'),
    'drop-row': t('editor', 'Delete this empty row'),
    'drop-col': t('editor', 'Delete this empty column'),
  }[action];
}

/** Puts the table controls already on the page into the current language. */
export function translateTableTools(root: ParentNode): void {
  for (const button of Array.from(root.querySelectorAll<HTMLButtonElement>('.table-tool'))) {
    const label = tableToolLabel(button.dataset['table'] as TableTool);
    button.title = label;
    button.setAttribute('aria-label', label);
  }
}

function tableTool(action: TableTool): HTMLButtonElement {
  const button = document.createElement('button');
  const label = tableToolLabel(action);
  button.type = 'button';
  button.className = `table-tool table-tool--${action}`;
  button.dataset['table'] = action;
  button.title = label;
  button.setAttribute('aria-label', label);
  button.tabIndex = -1;
  button.hidden = action.startsWith('drop');
  return button;
}

/**
 * A trailing line break shows no empty line of its own, and the caret could
 * not get onto it: a `<br>` after the text holds that line open. It is not part
 * of `textContent`, which stays the cell's text.
 */
function setCellText(el: HTMLElement, value: string): void {
  el.textContent = value;
  if (value.endsWith('\n')) el.append(document.createElement('br'));
}

let plainEditable: string | null = null;

/** `plaintext-only` keeps pasted formatting out of a cell; older browsers lack it. */
function editableMode(): string {
  if (plainEditable === null) {
    const probe = document.createElement('div');
    try {
      probe.contentEditable = 'plaintext-only';
    } catch {
      /* not supported */
    }
    plainEditable = probe.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true';
  }
  return plainEditable;
}

/** The selection inside an editable cell, as offsets into its text. */
function textOffsets(el: HTMLElement): { start: number; end: number } {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return { start: 0, end: 0 };
  const range = selection.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) {
    const length = el.textContent?.length ?? 0;
    return { start: length, end: length };
  }
  const offset = (node: Node, at: number): number => {
    const before = document.createRange();
    before.selectNodeContents(el);
    before.setEnd(node, at);
    return before.toString().length;
  };
  return { start: offset(range.startContainer, range.startOffset), end: offset(range.endContainer, range.endOffset) };
}

function setTextSelection(el: HTMLElement, start: number, end: number): void {
  const selection = window.getSelection();
  if (!selection) return;
  const place = (at: number): [Node, number] => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let left = at;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const length = node.textContent?.length ?? 0;
      if (left <= length) return [node, left];
      left -= length;
    }
    return [el, el.childNodes.length];
  };
  const range = document.createRange();
  range.setStart(...place(start));
  range.setEnd(...place(end));
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Maps a click inside a rendered cell to the same place in the cell's text. */
function cellCaretFromPoint(cell: HTMLElement, value: string, event: MouseEvent): number | 'end' {
  const point = caretRangeAt(event.clientX, event.clientY);
  if (!point || !cell.contains(point.node)) return 'end';
  try {
    const range = document.createRange();
    range.setStart(cell, 0);
    range.setEnd(point.node, point.offset);
    const prefix = range.toString();
    // Past the last character: after any closing `**` too.
    return prefix === cell.textContent ? 'end' : sourceOffsetFor(value, prefix);
  } catch {
    return 'end';
  }
}

function classFor(base: string, kind: BlockKind, level: number, prefix = 'block', joined = false): string {
  const name = `${base} ${prefix}--${kind}${joined ? ' block--joined' : ''}`;
  return kind === 'heading' ? `${name} ${prefix}--h${level}` : name;
}

function firstLine(text: string): string {
  const cut = text.indexOf('\n');
  return cut < 0 ? text : text.slice(0, cut);
}

function countWords(text: string): number {
  const matched = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return matched ? matched.length : 0;
}

function wrapBlock(sel: fmt.Selection, open: string, close: string): fmt.Selection {
  const selected = sel.value.slice(sel.start, sel.end);
  const text = open + selected + close;
  return {
    value: sel.value.slice(0, sel.start) + text + sel.value.slice(sel.end),
    start: sel.start + open.length,
    end: sel.start + open.length + selected.length,
  };
}

interface CaretPoint {
  node: Node;
  offset: number;
}

/** Firefox and Chromium disagree on the name of the same thing. */
function caretRangeAt(x: number, y: number): CaretPoint | null {
  const doc = document as Document & {
    caretPositionFromPoint?(x: number, y: number): { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?(x: number, y: number): Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(x, y);
    return position ? { node: position.offsetNode, offset: position.offset } : null;
  }
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    return range ? { node: range.startContainer, offset: range.startOffset } : null;
  }
  return null;
}
