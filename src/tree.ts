/** The folder tree in the left panel: navigation plus file and folder actions. */

import { ASSETS_DIR, baseOf, dirOf, isNote, stripExtension, type TreeEntry } from './vault';

export { stripExtension };
import { t } from './i18n';
import { menu, type MenuItem } from './ui';

export interface TreeHost {
  onOpen(path: string): void;
  onCreateFile(dir: string): void;
  onCreateDir(dir: string): void;
  onRename(entry: TreeEntry): void;
  onDelete(entry: TreeEntry): void;
  onReveal(path: string): void;
  /** Export a folder ('' for the whole vault) as a static HTML site. */
  onExport(dir: string): void;
  /** False while an export is running: a second one waits for it. */
  canExport(): boolean;
  /** False → the vault is read-only and the editing actions stay hidden. */
  canEdit(): boolean;
}

export class FileTree {
  private entries: TreeEntry[] = [];
  private collapsed = new Set<string>();
  /** `assets` folders start closed, so the tree remembers the ones opened instead. */
  private expanded = new Set<string>();
  private active: string | null = null;
  private filter = '';

  constructor(
    private readonly root: HTMLElement,
    private readonly counter: HTMLElement,
    private readonly host: TreeHost,
  ) {
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('contextmenu', this.onContextMenu);
  }

  setEntries(entries: TreeEntry[]): void {
    this.entries = entries;
    this.render();
  }

  getEntries(): TreeEntry[] {
    return this.entries;
  }

  setCollapsed(paths: readonly string[]): void {
    this.collapsed = new Set(paths);
  }

  getCollapsed(): string[] {
    return Array.from(this.collapsed);
  }

  setExpanded(paths: readonly string[]): void {
    this.expanded = new Set(paths);
  }

  getExpanded(): string[] {
    return Array.from(this.expanded);
  }

  private isOpen(path: string): boolean {
    return isAssets(path) ? this.expanded.has(path) : !this.collapsed.has(path);
  }

  private setOpen(path: string, open: boolean): void {
    if (isAssets(path)) {
      if (open) this.expanded.add(path);
      else this.expanded.delete(path);
    } else if (open) this.collapsed.delete(path);
    else this.collapsed.add(path);
  }

  /** Closes every folder, `assets` ones included. */
  collapseAll(): void {
    this.collapsed = new Set(dirPaths(this.entries).filter((path) => !isAssets(path)));
    this.expanded.clear();
    this.render();
  }

  /** Opens every folder except `assets` ones, which would bury the notes under pictures. */
  expandAll(): void {
    this.collapsed.clear();
    this.render();
  }

  setActive(path: string | null): void {
    this.active = path;
    this.expandTo(path);
    this.render();
    this.root.querySelector('.tree-item--active')?.scrollIntoView({ block: 'nearest' });
  }

  setFilter(query: string): void {
    this.filter = query.trim().toLowerCase();
    this.render();
  }

  private expandTo(path: string | null): void {
    if (!path) return;
    const parts = path.split('/');
    parts.pop();
    let prefix = '';
    for (const part of parts) {
      prefix = prefix ? `${prefix}/${part}` : part;
      this.setOpen(prefix, true);
    }
  }

  render(): void {
    const visible = this.filter ? filterTree(this.entries, this.filter) : this.entries;
    this.root.replaceChildren(this.buildList(visible, 0));
    this.counter.textContent = String(countNotes(this.entries));
    if (visible.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tree-empty';
      empty.textContent = this.filter ? t('tree', 'Nothing found') : t('tree', 'The folder is empty');
      this.root.append(empty);
    }
  }

  private buildList(entries: readonly TreeEntry[], depth: number): HTMLElement {
    const list = document.createElement('ul');
    list.className = 'tree-list';
    for (const entry of entries) {
      const item = document.createElement('li');
      item.className = 'tree-node';

      const row = document.createElement('div');
      row.className = `tree-item tree-item--${entry.kind}`;
      if (entry.path === this.active) row.classList.add('tree-item--active');
      row.style.paddingInlineStart = `${8 + depth * 14}px`;
      row.dataset['path'] = entry.path;
      row.dataset['kind'] = entry.kind;
      row.title = entry.path;

      const open = entry.kind === 'dir' && this.isOpen(entry.path);
      const mark = document.createElement('span');
      mark.className = 'tree-mark';
      mark.textContent = entry.kind === 'dir' ? (open ? '▾' : '▸') : isNote(entry.name) ? '·' : '▫';
      row.append(mark);

      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = entry.kind === 'file' ? stripExtension(entry.name) : entry.name;
      row.append(label);

      item.append(row);
      if (entry.kind === 'dir' && open && entry.children?.length) {
        item.append(this.buildList(entry.children, depth + 1));
      }
      list.append(item);
    }
    return list;
  }

  private readonly onClick = (event: MouseEvent): void => {
    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('.tree-item');
    if (!row) return;
    const path = row.dataset['path'] ?? '';
    if (row.dataset['kind'] === 'dir') {
      this.setOpen(path, !this.isOpen(path));
      this.render();
      return;
    }
    this.host.onOpen(path);
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('.tree-item');
    const entry = row ? this.find(row.dataset['path'] ?? '') : null;
    const dir = !entry ? '' : entry.kind === 'dir' ? entry.path : dirOf(entry.path);
    const editable = this.host.canEdit();

    const items: MenuItem[] = [];
    if (editable) {
      items.push(
        { label: t('tree', 'New note'), action: () => this.host.onCreateFile(dir) },
        { label: t('tree', 'New folder'), action: () => this.host.onCreateDir(dir) },
      );
      if (entry) items.push({ label: t('tree', 'Rename'), action: () => this.host.onRename(entry) });
    }
    if (entry) items.push({ label: t('tree', 'Copy path'), action: () => this.host.onReveal(entry.path) });
    // A folder, or the empty space below the tree for the whole vault.
    if (!entry || entry.kind === 'dir') {
      items.push({ label: t('tree', 'Export to HTML…'), action: () => this.host.onExport(dir), disabled: !this.host.canExport() });
    }
    if (editable && entry) items.push({ label: t('tree', 'Delete'), action: () => this.host.onDelete(entry), danger: true });
    menu(event.clientX, event.clientY, items);
  };

  find(path: string): TreeEntry | null {
    const walk = (entries: readonly TreeEntry[]): TreeEntry | null => {
      for (const entry of entries) {
        if (entry.path === path) return entry;
        const found = entry.children ? walk(entry.children) : null;
        if (found) return found;
      }
      return null;
    };
    return walk(this.entries);
  }

  /** All note paths in tree order — used by wiki links. */
  notes(): TreeEntry[] {
    const out: TreeEntry[] = [];
    const walk = (entries: readonly TreeEntry[]): void => {
      for (const entry of entries) {
        if (entry.kind === 'file' && isNote(entry.name)) out.push(entry);
        if (entry.children) walk(entry.children);
      }
    };
    walk(this.entries);
    return out;
  }
}

function isAssets(path: string): boolean {
  return baseOf(path) === ASSETS_DIR;
}

function dirPaths(entries: readonly TreeEntry[]): string[] {
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.kind !== 'dir') continue;
    out.push(entry.path);
    if (entry.children) out.push(...dirPaths(entry.children));
  }
  return out;
}

function countNotes(entries: readonly TreeEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    if (entry.kind === 'file' && isNote(entry.name)) total += 1;
    if (entry.children) total += countNotes(entry.children);
  }
  return total;
}

/** Keeps files whose name matches, plus every folder on the way to them. */
function filterTree(entries: readonly TreeEntry[], query: string): TreeEntry[] {
  const out: TreeEntry[] = [];
  for (const entry of entries) {
    if (entry.kind === 'file') {
      if (entry.name.toLowerCase().includes(query)) out.push(entry);
      continue;
    }
    const children = filterTree(entry.children ?? [], query);
    if (children.length > 0 || entry.name.toLowerCase().includes(query)) {
      out.push({ ...entry, children });
    }
  }
  return out;
}
