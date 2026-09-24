/** The folder tree in the left panel: navigation plus file and folder actions. */

import { dirOf, isNote, type TreeEntry } from './vault';
import { menu, type MenuItem } from './ui';

export interface TreeHost {
  onOpen(path: string): void;
  onCreateFile(dir: string): void;
  onCreateDir(dir: string): void;
  onRename(entry: TreeEntry): void;
  onDelete(entry: TreeEntry): void;
  onReveal(path: string): void;
  /** False → the vault is read-only and the editing actions stay hidden. */
  canEdit(): boolean;
}

export class FileTree {
  private entries: TreeEntry[] = [];
  private collapsed = new Set<string>();
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

  setCollapsed(paths: readonly string[]): void {
    this.collapsed = new Set(paths);
  }

  getCollapsed(): string[] {
    return Array.from(this.collapsed);
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
      this.collapsed.delete(prefix);
    }
  }

  private render(): void {
    const visible = this.filter ? filterTree(this.entries, this.filter) : this.entries;
    this.root.replaceChildren(this.buildList(visible, 0));
    this.counter.textContent = String(countNotes(this.entries));
    if (visible.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'tree-empty';
      empty.textContent = this.filter ? 'Nothing found' : 'The folder is empty';
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
      row.style.paddingLeft = `${8 + depth * 14}px`;
      row.dataset['path'] = entry.path;
      row.dataset['kind'] = entry.kind;
      row.title = entry.path;

      const open = entry.kind === 'dir' && !this.collapsed.has(entry.path);
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
      if (this.collapsed.has(path)) this.collapsed.delete(path);
      else this.collapsed.add(path);
      this.render();
      return;
    }
    this.host.onOpen(path);
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    if (!this.host.canEdit()) return;
    event.preventDefault();
    const row = (event.target as HTMLElement | null)?.closest<HTMLElement>('.tree-item');
    const entry = row ? this.find(row.dataset['path'] ?? '') : null;
    const dir = !entry ? '' : entry.kind === 'dir' ? entry.path : dirOf(entry.path);

    const items: MenuItem[] = [
      { label: 'New note', action: () => this.host.onCreateFile(dir) },
      { label: 'New folder', action: () => this.host.onCreateDir(dir) },
    ];
    if (entry) {
      items.push(
        { label: 'Rename', action: () => this.host.onRename(entry) },
        { label: 'Copy path', action: () => this.host.onReveal(entry.path) },
        { label: 'Delete', action: () => this.host.onDelete(entry), danger: true },
      );
    }
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

export function stripExtension(name: string): string {
  const cut = name.lastIndexOf('.');
  return cut > 0 ? name.slice(0, cut) : name;
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
