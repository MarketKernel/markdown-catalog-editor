/**
 * The live-preview editor.
 *
 * The note is rendered block by block. In edit mode the one block the caret
 * sits in is swapped for a textarea holding its Markdown source, styled with
 * the same font size and line height as the rendered version so the text does
 * not jump. Move the caret away and the block renders again.
 */

import type { MarkdownIt } from 'markdown-it';
import {
  blockAtLine,
  lineAtOffset,
  lineOffsets,
  sourceOffsetFor,
  splitBlocks,
  splitLines,
  type Block,
} from './blocks';
import { collectEnv } from './markdown';
import * as fmt from './format';

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
  /** An image whose `src` points inside the vault. */
  onAsset(src: string, image: HTMLImageElement): void;
  onStatus(status: EditorStatus): void;
}

export interface EditorStatus {
  words: number;
  chars: number;
  undo: boolean;
  redo: boolean;
}

interface Snapshot {
  text: string;
  caret: number;
}

const UNDO_LIMIT = 200;
const TYPING_PAUSE = 600;

export class Editor {
  private text = '';
  private lines: string[] = [''];
  private offsets: number[] = [0, 0];
  private blocks: Block[] = [];
  private nodes: HTMLElement[] = [];
  private env: Record<string, unknown> = {};

  private mode: Mode = 'read';
  private active: number | null = null;
  private area: HTMLTextAreaElement | null = null;
  /** Character offset of the active block, cached so typing stays O(1) in lookups. */
  private activeStart = 0;
  private activeLength = 0;
  private activeHead = '';

  /** A blank line the author opened with Enter; it has no tokens of its own. */
  private pending: { insertAt: number; line: number } | null = null;

  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private typingTimer = 0;

  constructor(
    private readonly root: HTMLElement,
    private readonly scroller: HTMLElement,
    private readonly md: MarkdownIt,
    private readonly host: EditorHost,
  ) {
    this.root.addEventListener('mousedown', this.onMouseDown);
    this.root.addEventListener('click', this.onClick);
  }

  /* ---------------------------------------------------------------- *
   * Document
   * ---------------------------------------------------------------- */

  load(text: string): void {
    this.text = text;
    this.pending = null;
    this.active = null;
    this.area = null;
    this.undoStack = [];
    this.redoStack = [];
    this.resplit();
    this.render(false);
    this.scroller.scrollTop = 0;
    this.report();
  }

  getText(): string {
    return this.text;
  }

  getMode(): Mode {
    return this.mode;
  }

  setMode(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'read') {
      this.deactivate();
    } else {
      this.render();
      this.activate(this.firstVisibleIndex(), 0);
    }
  }

  isEditing(): boolean {
    return this.mode === 'edit' && this.active !== null;
  }

  /* ---------------------------------------------------------------- *
   * Model
   * ---------------------------------------------------------------- */

  private resplit(): void {
    this.lines = splitLines(this.text);
    this.offsets = lineOffsets(this.lines);
    this.blocks = splitBlocks(this.md, this.text);
    this.env = collectEnv(this.md, this.text);
    this.insertPendingBlock();
  }

  /** An empty paragraph has no tokens, so the blank line is added back by hand. */
  private insertPendingBlock(): void {
    const pending = this.pending;
    if (!pending) return;
    const line = pending.line;
    const blank = line < this.lines.length && (this.lines[line] ?? '').trim() === '';
    const covered = this.blocks.some((block) => line >= block.start && line < block.end);
    if (!blank || covered) {
      this.pending = null;
      return;
    }
    const empty: Block = { start: line, end: line + 1, kind: 'paragraph', level: 0, text: '' };
    const at = this.blocks.findIndex((block) => block.start > line);
    if (at < 0) this.blocks.push(empty);
    else this.blocks.splice(at, 0, empty);
  }

  private blockStart(index: number): number {
    const block = this.blocks[index];
    return block ? (this.offsets[block.start] ?? 0) : 0;
  }

  private blockEnd(index: number): number {
    const block = this.blocks[index];
    return block ? this.blockStart(index) + block.text.length : 0;
  }

  private caretOffset(): number {
    if (!this.area || this.active === null) return 0;
    return this.activeStart + this.area.selectionStart;
  }

  /* ---------------------------------------------------------------- *
   * Rendering
   * ---------------------------------------------------------------- */

  private render(keepScroll = true): void {
    const anchor = this.active ?? this.firstVisibleIndex();
    const before = this.nodes[anchor]?.offsetTop ?? 0;

    const nodes: HTMLElement[] = [];
    for (let index = 0; index < this.blocks.length; index += 1) {
      const block = this.blocks[index]!;
      if (this.mode === 'edit' && index === this.active) nodes.push(this.buildSource(block, index));
      else nodes.push(this.buildRendered(block, index));
    }

    this.root.replaceChildren(...nodes);
    this.nodes = nodes;
    this.root.classList.toggle('doc--edit', this.mode === 'edit');

    if (this.area) {
      autosize(this.area);
      this.area.focus({ preventScroll: true });
    }
    if (keepScroll) {
      const after = this.nodes[anchor]?.offsetTop ?? 0;
      this.scroller.scrollTop += after - before;
    }
  }

  private buildRendered(block: Block, index: number): HTMLElement {
    const el = document.createElement('div');
    el.className = `block block--${block.kind}`;
    if (block.kind === 'heading') el.classList.add(`block--h${block.level}`);
    el.dataset['index'] = String(index);
    el.innerHTML = this.renderBlock(block);
    for (const image of Array.from(el.querySelectorAll<HTMLImageElement>('img[data-asset]'))) {
      this.host.onAsset(image.dataset['asset'] ?? '', image);
    }
    return el;
  }

  private renderBlock(block: Block): string {
    if (!block.text.trim()) return '<p class="block-blank"><br></p>';
    if (block.kind === 'frontmatter') {
      return `<pre class="frontmatter"><code>${this.md.utils.escapeHtml(block.text)}</code></pre>`;
    }
    try {
      return this.md.render(block.text, this.env);
    } catch {
      return `<pre class="frontmatter"><code>${this.md.utils.escapeHtml(block.text)}</code></pre>`;
    }
  }

  private buildSource(block: Block, index: number): HTMLTextAreaElement {
    const area = document.createElement('textarea');
    area.className = `block source source--${block.kind}`;
    if (block.kind === 'heading') area.classList.add(`source--h${block.level}`);
    area.dataset['index'] = String(index);
    area.value = block.text;
    area.rows = 1;
    area.spellcheck = true;
    area.setAttribute('aria-label', 'Исходный текст блока');
    area.addEventListener('beforeinput', this.onBeforeInput);
    area.addEventListener('input', this.onInput);
    area.addEventListener('keydown', this.onKeyDown);
    area.addEventListener('blur', this.onBlur);
    this.area = area;
    this.activeStart = this.blockStart(index);
    this.activeLength = block.text.length;
    this.activeHead = firstLine(block.text);
    return area;
  }

  private firstVisibleIndex(): number {
    const top = this.scroller.scrollTop;
    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index]!;
      if (node.offsetTop + node.offsetHeight > top) return index;
    }
    return 0;
  }

  /* ---------------------------------------------------------------- *
   * Activation
   * ---------------------------------------------------------------- */

  private activate(index: number, caret: number): void {
    if (this.mode !== 'edit' || this.blocks.length === 0) return;
    const target = Math.max(0, Math.min(index, this.blocks.length - 1));
    if (this.active !== null && this.active !== target) this.dropPendingIfEmpty(target);
    this.active = Math.max(0, Math.min(target, this.blocks.length - 1));
    this.area = null;
    this.render();
    const area = this.area as HTMLTextAreaElement | null;
    if (area) {
      const at = Math.max(0, Math.min(caret, area.value.length));
      area.setSelectionRange(at, at);
      this.scrollIntoView(area);
    }
    this.report();
  }

  private deactivate(): void {
    this.flushTyping();
    if (this.active !== null) this.dropPendingIfEmpty(null);
    this.active = null;
    this.area = null;
    this.resplit();
    this.render();
    this.report();
  }

  /** Enter that opened a blank line and was abandoned leaves no trace in the file. */
  private dropPendingIfEmpty(nextIndex: number | null): void {
    const pending = this.pending;
    if (!pending || !this.area) return;
    const isPendingBlock = this.blocks[this.active ?? -1]?.start === pending.line;
    if (!isPendingBlock || this.area.value.trim() !== '') {
      this.pending = null;
      return;
    }
    this.text = this.text.slice(0, pending.insertAt) + this.text.slice(pending.insertAt + 2);
    this.pending = null;
    this.resplit();
    if (nextIndex !== null && nextIndex > (this.active ?? 0)) {
      // The removed lines shifted everything after the gap up by one block.
      this.active = Math.min(nextIndex, this.blocks.length - 1);
    }
  }

  private scrollIntoView(area: HTMLTextAreaElement): void {
    const top = area.offsetTop;
    const bottom = top + area.offsetHeight;
    const viewTop = this.scroller.scrollTop;
    const viewBottom = viewTop + this.scroller.clientHeight;
    if (top < viewTop + 24) this.scroller.scrollTop = Math.max(0, top - 24);
    else if (bottom > viewBottom - 24) this.scroller.scrollTop = bottom - this.scroller.clientHeight + 24;
  }

  /* ---------------------------------------------------------------- *
   * Mouse
   * ---------------------------------------------------------------- */

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (this.mode !== 'edit') return;
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('a, input, button')) return;
    const holder = target.closest<HTMLElement>('.block');
    if (!holder || holder.tagName === 'TEXTAREA') return;
    const index = Number(holder.dataset['index'] ?? '-1');
    if (index < 0) return;
    event.preventDefault();
    this.activate(index, this.caretFromPoint(holder, event));
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

    const box = target.closest<HTMLInputElement>('input.task');
    if (box) {
      event.preventDefault();
      const holder = box.closest<HTMLElement>('.block');
      const block = this.blocks[Number(holder?.dataset['index'] ?? '-1')];
      if (block) this.toggleTask(block.start + Number(box.dataset['taskLine'] ?? '0'));
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

  private toggleTask(line: number): void {
    const source = this.lines[line];
    if (source === undefined) return;
    const flipped = source.replace(/^(\s*[-*+]\s+\[)([ xX])(\])/, (_all, head: string, mark: string, tail: string) =>
      `${head}${mark === ' ' ? 'x' : ' '}${tail}`,
    );
    if (flipped === source) return;
    this.pushUndo();
    const start = this.offsets[line] ?? 0;
    this.text = this.text.slice(0, start) + flipped + this.text.slice(start + source.length);
    const keep = this.active;
    this.resplit();
    this.active = keep !== null ? Math.min(keep, this.blocks.length - 1) : null;
    this.area = null;
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
    const value = area.value;
    this.text = this.text.slice(0, this.activeStart) + value + this.text.slice(this.activeStart + this.activeLength);
    this.activeLength = value.length;
    const block = this.blocks[this.active]!;
    this.blocks[this.active] = { ...block, text: value, end: block.start + value.split('\n').length };
  }

  /** `# ` typed at the start of a line grows the source line to heading size. */
  private retypeActive(): void {
    const area = this.area;
    if (!area || this.active === null) return;
    const probe = splitBlocks(this.md, area.value)[0];
    if (!probe) return;
    const block = this.blocks[this.active]!;
    if (probe.kind === block.kind && probe.level === block.level) return;
    this.blocks[this.active] = { ...block, kind: probe.kind, level: probe.level };
    area.className = `block source source--${probe.kind}`;
    if (probe.kind === 'heading') area.classList.add(`source--h${probe.level}`);
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

  private report(): void {
    this.host.onStatus({
      words: countWords(this.text),
      chars: this.text.length,
      undo: this.undoStack.length > 0,
      redo: this.redoStack.length > 0,
    });
  }

  /* ---------------------------------------------------------------- *
   * Keyboard
   * ---------------------------------------------------------------- */

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const area = this.area;
    if (!area || this.active === null) return;
    const block = this.blocks[this.active]!;
    const mod = event.metaKey || event.ctrlKey;

    if (mod && event.altKey && /^[0-6]$/.test(event.key)) {
      event.preventDefault();
      this.apply(fmt.setHeading(this.selection(), Number(event.key)));
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
      const shortcut: Record<string, FormatAction> = event.shiftKey
        ? { c: 'code', h: 'mark', k: 'wikilink' }
        : { b: 'bold', i: 'italic', k: 'link' };
      const action = shortcut[key];
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
      this.onEnter(event, block);
      return;
    }

    if (event.key === 'Backspace' && area.selectionStart === 0 && area.selectionEnd === 0) {
      if (this.mergeBackward()) event.preventDefault();
      return;
    }
    if (event.key === 'Delete' && area.selectionStart === area.value.length && area.selectionEnd === area.value.length) {
      if (this.mergeForward()) event.preventDefault();
      return;
    }

    this.onArrow(event, area);
  };

  private onEnter(event: KeyboardEvent, block: Block): void {
    const selection = this.selection();
    if (block.kind === 'code' || block.kind === 'frontmatter' || block.kind === 'html' || block.kind === 'table') {
      event.preventDefault();
      this.pushUndo();
      this.insert(fmt.keepIndent(selection));
      return;
    }
    if (block.kind === 'list' || block.kind === 'quote') {
      const next = fmt.continueLine(selection);
      event.preventDefault();
      this.pushUndo();
      if (!next) {
        this.insert('\n');
        return;
      }
      if (next.clear) {
        const cleared: fmt.Selection = {
          value: selection.value.slice(0, next.clear.from) + next.clear.text + selection.value.slice(next.clear.to),
          start: next.clear.from + next.clear.text.length,
          end: next.clear.from + next.clear.text.length,
        };
        this.apply(cleared);
        // An emptied marker at the outer level means: leave the list.
        if (next.clear.text === '') this.splitAtCaret();
        return;
      }
      this.insert(next.insert);
      return;
    }
    event.preventDefault();
    this.pushUndo();
    this.splitAtCaret();
  }

  private onArrow(event: KeyboardEvent, area: HTMLTextAreaElement): void {
    if (this.active === null) return;
    const at = area.selectionStart;
    const collapsed = area.selectionStart === area.selectionEnd;
    if (!collapsed) return;

    if (event.key === 'ArrowLeft' && at === 0) {
      event.preventDefault();
      this.moveTo(this.active - 1, Number.MAX_SAFE_INTEGER);
      return;
    }
    if (event.key === 'ArrowRight' && at === area.value.length) {
      event.preventDefault();
      this.moveTo(this.active + 1, 0);
      return;
    }

    const head = area.value.slice(0, at);
    const column = at - (head.lastIndexOf('\n') + 1);
    if (event.key === 'ArrowUp' && !head.includes('\n')) {
      event.preventDefault();
      const target = this.blocks[this.active - 1];
      if (!target) return;
      const lastStart = target.text.lastIndexOf('\n') + 1;
      this.moveTo(this.active - 1, Math.min(lastStart + column, target.text.length));
      return;
    }
    if (event.key === 'ArrowDown' && !area.value.slice(at).includes('\n')) {
      event.preventDefault();
      const target = this.blocks[this.active + 1];
      if (!target) return;
      const firstEnd = firstLine(target.text).length;
      this.moveTo(this.active + 1, Math.min(column, firstEnd));
    }
  }

  private moveTo(index: number, caret: number): void {
    if (index < 0 || index >= this.blocks.length) return;
    this.flushTyping();
    this.resplitKeepingActive(index);
    const block = this.blocks[Math.min(index, this.blocks.length - 1)];
    this.activate(index, Math.min(caret, block?.text.length ?? 0));
  }

  /**
   * Re-derives the blocks after edits, then maps the wanted index back onto the
   * new list by the character offset it used to point at.
   */
  private resplitKeepingActive(index: number): void {
    const anchor = index <= (this.active ?? 0) ? this.blockStart(index) : this.blockEnd(index);
    this.resplit();
    const line = lineAtOffset(this.offsets, Math.min(anchor, Math.max(0, this.text.length - 1)));
    const found = blockAtLine(this.blocks, line);
    this.active = found;
  }

  /* ---------------------------------------------------------------- *
   * Structural edits
   * ---------------------------------------------------------------- */

  private splitAtCaret(): void {
    const area = this.area;
    if (!area || this.active === null) return;
    const offset = this.activeStart + area.selectionStart;
    this.text = `${this.text.slice(0, offset)}\n\n${this.text.slice(offset)}`;
    this.pending = null;
    this.resplit();

    const target = offset + 2;
    const line = lineAtOffset(this.offsets, target);
    let index = this.blocks.findIndex((block) => line >= block.start && line < block.end);
    if (index < 0) {
      this.pending = { insertAt: offset, line };
      this.insertPendingBlock();
      index = this.blocks.findIndex((block) => block.start === line);
    }
    this.active = null;
    this.area = null;
    this.activate(index < 0 ? this.blocks.length - 1 : index, 0);
    this.changed();
  }

  private mergeBackward(): boolean {
    if (this.active === null || this.active === 0) return false;
    const previousEnd = this.blockEnd(this.active - 1);
    const start = this.blockStart(this.active);
    if (start <= previousEnd) return false;
    this.pushUndo();
    this.text = this.text.slice(0, previousEnd) + this.text.slice(start);
    this.pending = null;
    this.resplit();
    const line = lineAtOffset(this.offsets, previousEnd);
    const index = blockAtLine(this.blocks, line);
    this.active = null;
    this.area = null;
    this.activate(index, previousEnd - this.blockStart(index));
    this.changed();
    return true;
  }

  private mergeForward(): boolean {
    if (this.active === null || this.active >= this.blocks.length - 1) return false;
    const end = this.blockEnd(this.active);
    const nextStart = this.blockStart(this.active + 1);
    if (nextStart <= end) return false;
    this.pushUndo();
    this.text = this.text.slice(0, end) + this.text.slice(nextStart);
    this.pending = null;
    this.resplit();
    const line = lineAtOffset(this.offsets, end);
    const index = blockAtLine(this.blocks, line);
    this.active = null;
    this.area = null;
    this.activate(index, end - this.blockStart(index));
    this.changed();
    return true;
  }

  /* ---------------------------------------------------------------- *
   * Toolbar
   * ---------------------------------------------------------------- */

  format(action: FormatAction): void {
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
      case 'table':
        this.apply(fmt.table(selection));
        return;
      case 'codeblock':
        this.apply(wrapBlock(selection, '```\n', '\n```'));
        return;
      case 'rule':
        this.insert('\n\n---\n');
    }
  }

  heading(level: number): void {
    if (!this.area) return;
    this.pushUndo();
    this.apply(fmt.setHeading(this.selection(), level));
  }

  colorize(style: string): void {
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
    return { text: this.text, caret: this.caretOffset() };
  }

  private pushUndo(): void {
    this.flushTyping();
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  private markTyping(): void {
    if (!this.typingTimer) {
      this.undoStack.push(this.snapshot());
      if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
      this.redoStack = [];
    }
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
    this.flushTyping();
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(this.snapshot());
    this.restore(previous);
  }

  redo(): void {
    this.flushTyping();
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.snapshot());
    this.restore(next);
  }

  private restore(snapshot: Snapshot): void {
    this.text = snapshot.text;
    this.pending = null;
    this.active = null;
    this.area = null;
    this.resplit();
    if (this.mode === 'edit') {
      const line = lineAtOffset(this.offsets, Math.min(snapshot.caret, Math.max(0, this.text.length - 1)));
      const index = blockAtLine(this.blocks, line);
      this.activate(index, snapshot.caret - this.blockStart(index));
    } else {
      this.render();
    }
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

  reveal(offset: number, length: number): void {
    const line = lineAtOffset(this.offsets, Math.min(offset, Math.max(0, this.text.length - 1)));
    const index = blockAtLine(this.blocks, line);
    if (this.mode === 'edit') {
      this.activate(index, offset - this.blockStart(index));
      const area = this.area;
      if (area) {
        const start = offset - this.activeStart;
        area.setSelectionRange(start, start + length);
        this.scrollIntoView(area);
      }
      return;
    }
    const node = this.nodes[index];
    if (!node) return;
    this.scroller.scrollTop = Math.max(0, node.offsetTop - 48);
    node.classList.add('block--flash');
    window.setTimeout(() => node.classList.remove('block--flash'), 900);
  }
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function autosize(area: HTMLTextAreaElement): void {
  area.style.height = '0px';
  area.style.height = `${area.scrollHeight}px`;
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
