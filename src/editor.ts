/**
 * The live-preview editor.
 *
 * The note is rendered block by block. In edit mode the one block the caret
 * sits in is swapped for a textarea holding its Markdown source, styled with
 * the same font size and line height as the rendered version so the text does
 * not jump. Move the caret away and the block renders again.
 */

import type { MarkdownIt } from 'markdown-it';
import { sourceOffsetFor, splitBlocks, type Block, type BlockKind } from './blocks';
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

    this.area = null;
    const nodes = this.blocks.map((block, index) => {
      if (this.mode === 'edit' && index === this.active) return this.buildSource(block);
      const key = `${block.kind}${block.level}\n${block.text}`;
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
    el.className = classFor('block', block.kind, block.level);
    el.dataset['key'] = key;
    el.innerHTML = this.renderBlock(block);
    for (const image of Array.from(el.querySelectorAll<HTMLImageElement>('img[data-asset]'))) {
      this.host.onAsset(image.dataset['asset'] ?? '', image);
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
    area.className = classFor('block source', block.kind, block.level, 'source');
    area.value = block.text;
    area.rows = 1;
    area.spellcheck = true;
    area.setAttribute('aria-label', 'Block source text');
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
    this.steady(anchor, () => {
      if (this.stale) this.resplit();
      this.active = this.indexAt(offset);
      this.render();
    });
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
    area.className = classFor('block source', kind, level, 'source');
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
        this.insert(selection.value.trim() ? '\n\n---\n' : '---');
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

function classFor(base: string, kind: BlockKind, level: number, prefix = 'block'): string {
  const name = `${base} ${prefix}--${kind}`;
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
