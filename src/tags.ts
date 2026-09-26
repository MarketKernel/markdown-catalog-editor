/**
 * Tags on screen: the tag tree at the bottom of the left panel, the row of
 * tags under a note's title, and the read-only page that lists a tag's notes.
 * The data lives in meta.ts; this only draws it and reports clicks.
 */

import { t, tn } from './i18n';
import type { TagNode } from './meta';
import { h } from './ui';

/* ------------------------------------------------------------------ *
 * The tag tree
 * ------------------------------------------------------------------ */

export class TagTree {
  private nodes: TagNode[] = [];
  private collapsed = new Set<string>();
  private active: string | null = null;
  private filter = '';

  constructor(
    private readonly root: HTMLElement,
    private readonly counter: HTMLElement,
    private readonly onOpen: (tag: string) => void,
  ) {
    this.root.addEventListener('click', this.onClick);
  }

  setNodes(nodes: TagNode[]): void {
    this.nodes = nodes;
    this.render();
  }

  setCollapsed(tags: readonly string[]): void {
    this.collapsed = new Set(tags);
  }

  getCollapsed(): string[] {
    return Array.from(this.collapsed);
  }

  setActive(tag: string | null): void {
    this.active = tag;
    // The parents of the tag being shown open, as a file's folders do.
    if (tag) {
      const parts = tag.split('/');
      for (let at = 1; at < parts.length; at += 1) this.collapsed.delete(parts.slice(0, at).join('/'));
    }
    this.render();
    this.root.querySelector('.tree-item--active')?.scrollIntoView({ block: 'nearest' });
  }

  setFilter(query: string): void {
    this.filter = query.trim().toLowerCase();
    this.render();
  }

  render(): void {
    const visible = this.filter ? filterTags(this.nodes, this.filter) : this.nodes;
    this.root.replaceChildren(this.buildList(visible, 0));
    this.counter.textContent = String(countTags(this.nodes));
    if (visible.length === 0) {
      this.root.append(h('p', { class: 'tree-empty', text: this.filter ? t('tree', 'Nothing found') : t('tags', 'No tags yet') }));
    }
  }

  private buildList(nodes: readonly TagNode[], depth: number): HTMLElement {
    const list = h('ul', { class: 'tree-list' });
    for (const node of nodes) {
      const parent = node.children.length > 0;
      // Filtering shows every match, whatever was folded.
      const open = parent && (Boolean(this.filter) || !this.collapsed.has(node.tag));
      const row = h(
        'div',
        { class: 'tree-item tree-item--tag', title: `#${node.tag}` },
        h('span', { class: parent ? 'tree-mark tree-mark--toggle' : 'tree-mark', text: parent ? (open ? '▾' : '▸') : '#' }),
        h('span', { class: 'tree-label', text: node.name }),
        h('span', { class: 'tree-count', text: String(node.count) }),
      );
      if (node.tag === this.active) row.classList.add('tree-item--active');
      row.style.paddingInlineStart = `${8 + depth * 14}px`;
      row.dataset['tag'] = node.tag;
      const item = h('li', { class: 'tree-node' }, row);
      if (open) item.append(this.buildList(node.children, depth + 1));
      list.append(item);
    }
    return list;
  }

  /** The arrow folds a parent tag; anywhere else on the row opens the tag. */
  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const row = target?.closest<HTMLElement>('.tree-item');
    const tag = row?.dataset['tag'];
    if (!tag) return;
    if (target?.closest('.tree-mark--toggle')) {
      if (this.collapsed.has(tag)) this.collapsed.delete(tag);
      else this.collapsed.add(tag);
      this.render();
      return;
    }
    this.onOpen(tag);
  };
}

function countTags(nodes: readonly TagNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countTags(node.children), 0);
}

/** Keeps tags whose name matches, with their parents on the way. */
function filterTags(nodes: readonly TagNode[], query: string): TagNode[] {
  const out: TagNode[] = [];
  for (const node of nodes) {
    const children = filterTags(node.children, query);
    if (children.length > 0 || node.name.toLowerCase().includes(query)) out.push({ ...node, children });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The row of tags under the title
 * ------------------------------------------------------------------ */

export interface TagBarOptions {
  tags: readonly string[];
  /** False → the tags are only shown: no + and no ×. */
  editable: boolean;
  /** Tags offered while typing a new one. */
  suggestions: readonly string[];
  onOpen(tag: string): void;
  onAdd(tag: string): void;
  onRemove(tag: string): void;
}

function chip(tag: string, onOpen: (tag: string) => void, extra?: HTMLElement): HTMLElement {
  const label = h('button', { class: 'tag-chip-label', type: 'button', text: `#${tag}` });
  label.addEventListener('click', () => onOpen(tag));
  return h('span', { class: 'tag-chip' }, label, extra);
}

/** Draws the tags and a + after them; the + turns into a field for one more tag. */
export function renderTagBar(host: HTMLElement, options: TagBarOptions): void {
  host.replaceChildren();
  host.hidden = options.tags.length === 0 && !options.editable;
  for (const tag of options.tags) {
    let remove: HTMLElement | undefined;
    if (options.editable) {
      remove = h('button', { class: 'tag-remove', type: 'button', title: t('tags', 'Remove the tag'), 'aria-label': t('tags', 'Remove the tag'), text: '×' });
      remove.addEventListener('click', () => options.onRemove(tag));
    }
    host.append(chip(tag, options.onOpen, remove));
  }
  if (!options.editable) return;

  const add = h('button', { class: 'tag-add', type: 'button', title: t('tags', 'Add a tag'), 'aria-label': t('tags', 'Add a tag'), text: '+' });
  add.addEventListener('click', () => {
    const list = h('datalist', { id: 'tag-suggestions' });
    for (const tag of options.suggestions) if (!options.tags.includes(tag)) list.append(h('option', { value: tag }));
    const input = h('input', { class: 'tag-input', type: 'text', list: 'tag-suggestions', placeholder: t('tags', 'New tag'), 'aria-label': t('tags', 'New tag'), autocomplete: 'off', spellcheck: 'false' });
    let done = false;
    const finish = (commit: boolean): void => {
      if (done) return;
      done = true;
      const value = input.value.trim();
      if (commit && value) options.onAdd(value);
      else renderTagBar(host, options);
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
    add.replaceWith(input, list);
    input.focus();
  });
  host.append(add);
}

/* ------------------------------------------------------------------ *
 * A tag's page
 * ------------------------------------------------------------------ */

export interface TaggedNote {
  path: string;
  name: string;
  /** The folder it sits in, '' at the root. */
  dir: string;
  tags: readonly string[];
}

export interface TagPageOptions {
  tag: string;
  notes: readonly TaggedNote[];
  onOpenNote(path: string): void;
  onOpenTag(tag: string): void;
}

/** Every note with the tag, or with a tag nested under it — to read, not to edit. */
export function renderTagPage(host: HTMLElement, options: TagPageOptions): void {
  const title = h('h1', { class: 'tag-page-title' });
  // Each parent of a nested tag links to its own page: #project / alpha.
  const parts = options.tag.split('/');
  parts.forEach((part, index) => {
    const tag = parts.slice(0, index + 1).join('/');
    if (index > 0) title.append(h('span', { class: 'tag-page-sep', text: '/' }));
    if (index === parts.length - 1) {
      title.append(index === 0 ? `#${part}` : part);
      return;
    }
    const link = h('button', { class: 'tag-page-parent', type: 'button', text: index === 0 ? `#${part}` : part });
    link.addEventListener('click', () => options.onOpenTag(tag));
    title.append(link);
  });

  const list = h('ul', { class: 'tag-notes' });
  for (const note of options.notes) {
    const open = h(
      'button',
      { class: 'tag-note-open', type: 'button', title: note.path },
      h('span', { class: 'tag-note-name', text: note.name }),
      note.dir ? h('span', { class: 'tag-note-dir', text: note.dir }) : null,
    );
    open.addEventListener('click', () => options.onOpenNote(note.path));
    const tags = h('div', { class: 'tag-note-tags' });
    for (const tag of note.tags) {
      const item = chip(tag, options.onOpenTag);
      if (tag === options.tag) item.classList.add('tag-chip--current');
      tags.append(item);
    }
    list.append(h('li', { class: 'tag-note' }, open, tags));
  }

  host.replaceChildren(
    title,
    h('p', { class: 'tag-page-count', text: tn('tags', '{count} note', '{count} notes', options.notes.length) }),
    options.notes.length ? list : h('p', { class: 'tag-page-empty', text: t('tags', 'No notes with this tag') }),
  );
}
