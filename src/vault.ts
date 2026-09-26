/**
 * Access to the notes folder.
 *
 * Chromium hands over a real `FileSystemDirectoryHandle` (folder picker or a
 * drag-and-drop `getAsFileSystemHandle`), which reads *and* writes. Everywhere
 * else we only get a flat `File[]` from `<input webkitdirectory>` or the legacy
 * drag-and-drop entry tree, so the vault is read-only and saving falls back to
 * downloading the file.
 */

import { t } from './i18n';

export type EntryKind = 'file' | 'dir';

export interface TreeEntry {
  kind: EntryKind;
  name: string;
  /** Path relative to the vault root, e.g. `notes/idea.md`. */
  path: string;
  children?: TreeEntry[];
}

export interface Vault {
  readonly name: string;
  /** False → the editor saves by offering a download instead of writing to disk. */
  readonly writable: boolean;
  scan(): Promise<TreeEntry[]>;
  readText(path: string): Promise<string>;
  /** Images and other binaries; null when the vault has no such file. */
  readBlob(path: string): Promise<Blob | null>;
  writeText(path: string, text: string): Promise<void>;
  createFile(dir: string, name: string): Promise<string>;
  createDir(dir: string, name: string): Promise<string>;
  rename(path: string, kind: EntryKind, name: string): Promise<string>;
  remove(path: string, kind: EntryKind): Promise<void>;
}

export const NOTE_EXTENSIONS = ['.md', '.markdown', '.mdown', '.mkd', '.txt'];
/** Each folder keeps its notes' images in `assets/<note name>/`. */
export const ASSETS_DIR = 'assets';
/** The catalog's tags and other data, one file at the root (see meta.ts); never shown in the tree. */
export const META_FILE = '.meta.json';
const ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.ico', '.pdf'];
const MAX_DEPTH = 12;
const MAX_ENTRIES = 40000;

export function isNote(name: string): boolean {
  const lower = name.toLowerCase();
  return NOTE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isAsset(name: string): boolean {
  const lower = name.toLowerCase();
  return ASSET_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Dot-folders and dependency dumps would bury the tree in noise. */
function skipDir(name: string): boolean {
  return name.startsWith('.') || name === 'node_modules';
}

export function dirOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut < 0 ? '' : path.slice(0, cut);
}

export function baseOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut < 0 ? path : path.slice(cut + 1);
}

export function join(dir: string, name: string): string {
  return dir ? `${dir}/${name}` : name;
}

/** Sorts folders before files, then by name the way a file manager would. */
export function sortEntries(entries: TreeEntry[]): TreeEntry[] {
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
  for (const entry of entries) if (entry.children) sortEntries(entry.children);
  return entries;
}

/* ------------------------------------------------------------------ *
 * File System Access API
 * ------------------------------------------------------------------ */

interface WritableLike {
  write(data: string | Blob): Promise<void>;
  close(): Promise<void>;
}

export interface FileHandleLike {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<File>;
  createWritable?(): Promise<WritableLike>;
}

export interface DirHandleLike {
  readonly kind: 'directory';
  readonly name: string;
  values(): AsyncIterableIterator<DirHandleLike | FileHandleLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirHandleLike>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  queryPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

declare global {
  interface Window {
    showDirectoryPicker?(options?: { mode?: 'read' | 'readwrite' }): Promise<DirHandleLike>;
  }
  interface DataTransferItem {
    getAsFileSystemHandle?(): Promise<DirHandleLike | FileHandleLike | null>;
  }
}

export class DirectoryVault implements Vault {
  readonly writable: boolean;

  constructor(private readonly root: DirHandleLike, writable: boolean) {
    this.writable = writable;
  }

  get name(): string {
    return this.root.name;
  }

  async scan(): Promise<TreeEntry[]> {
    const counter = { left: MAX_ENTRIES };
    return sortEntries(await walkHandle(this.root, '', 0, counter));
  }

  async readText(path: string): Promise<string> {
    return (await (await this.fileHandle(path)).getFile()).text();
  }

  async readBlob(path: string): Promise<Blob | null> {
    try {
      return await (await this.fileHandle(path)).getFile();
    } catch {
      return null;
    }
  }

  async writeText(path: string, text: string): Promise<void> {
    const handle = await this.fileHandle(path, true);
    if (!handle.createWritable) throw new Error(t('errors', 'This browser cannot write files'));
    const stream = await handle.createWritable();
    await stream.write(text);
    await stream.close();
  }

  async createFile(dir: string, name: string): Promise<string> {
    const parent = await this.dirHandle(splitPath(dir));
    await assertFree(parent, name);
    await parent.getFileHandle(name, { create: true });
    return join(dir, name);
  }

  async createDir(dir: string, name: string): Promise<string> {
    const parent = await this.dirHandle(splitPath(dir));
    await assertFree(parent, name);
    await parent.getDirectoryHandle(name, { create: true });
    return join(dir, name);
  }

  /** The API has no rename, so this copies to the new name and drops the old one. */
  async rename(path: string, kind: EntryKind, name: string): Promise<string> {
    const dir = dirOf(path);
    const target = join(dir, name);
    if (target === path) return path;
    const parent = await this.dirHandle(splitPath(dir));
    await assertFree(parent, name);
    if (kind === 'file') {
      const source = await parent.getFileHandle(baseOf(path));
      const blob = await source.getFile();
      const created = await parent.getFileHandle(name, { create: true });
      if (!created.createWritable) throw new Error(t('errors', 'This browser cannot write files'));
      const stream = await created.createWritable();
      await stream.write(blob);
      await stream.close();
      await parent.removeEntry(baseOf(path));
    } else {
      const source = await parent.getDirectoryHandle(baseOf(path));
      const created = await parent.getDirectoryHandle(name, { create: true });
      await copyDir(source, created);
      await parent.removeEntry(baseOf(path), { recursive: true });
    }
    return target;
  }

  async remove(path: string, kind: EntryKind): Promise<void> {
    const parent = await this.dirHandle(splitPath(dirOf(path)));
    await parent.removeEntry(baseOf(path), { recursive: kind === 'dir' });
  }

  private async fileHandle(path: string, create = false): Promise<FileHandleLike> {
    const parts = splitPath(path);
    const name = parts.pop();
    if (!name) throw new Error(`Empty path: ${path}`);
    const dir = await this.dirHandle(parts, create);
    return dir.getFileHandle(name, { create });
  }

  private async dirHandle(parts: string[], create = false): Promise<DirHandleLike> {
    let dir = this.root;
    for (const part of parts) dir = await dir.getDirectoryHandle(part, { create });
    return dir;
  }
}

function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/** Refuses to silently clobber an existing file or folder. */
async function assertFree(parent: DirHandleLike, name: string): Promise<void> {
  for await (const child of parent.values()) {
    if (child.name === name) throw new Error(t('errors', '"{name}" already exists', { name }));
  }
}

async function copyDir(from: DirHandleLike, to: DirHandleLike): Promise<void> {
  for await (const child of from.values()) {
    if (child.kind === 'directory') {
      await copyDir(child, await to.getDirectoryHandle(child.name, { create: true }));
    } else {
      const blob = await child.getFile();
      const created = await to.getFileHandle(child.name, { create: true });
      if (!created.createWritable) throw new Error(t('errors', 'This browser cannot write files'));
      const stream = await created.createWritable();
      await stream.write(blob);
      await stream.close();
    }
  }
}

async function walkHandle(
  dir: DirHandleLike,
  prefix: string,
  depth: number,
  counter: { left: number },
): Promise<TreeEntry[]> {
  const entries: TreeEntry[] = [];
  for await (const child of dir.values()) {
    if (counter.left-- <= 0) break;
    const path = join(prefix, child.name);
    if (child.kind === 'directory') {
      if (skipDir(child.name) || depth >= MAX_DEPTH) continue;
      const children = await walkHandle(child, path, depth + 1, counter);
      entries.push({ kind: 'dir', name: child.name, path, children });
    } else if (isNote(child.name) || isAsset(child.name)) {
      entries.push({ kind: 'file', name: child.name, path });
    }
  }
  return entries;
}

/* ------------------------------------------------------------------ *
 * Read-only fallback: a flat list of files
 * ------------------------------------------------------------------ */

export class FileListVault implements Vault {
  readonly writable = false;
  readonly name: string;
  private readonly files = new Map<string, File>();

  constructor(files: readonly File[], name?: string) {
    let root = name ?? '';
    for (const file of files) {
      const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const parts = relative.split('/');
      if (!root && parts.length > 1) root = parts[0] ?? '';
      // Drop the picked folder's own name so paths match what the tree shows.
      const path = parts.length > 1 ? parts.slice(1).join('/') : relative;
      if (path.split('/').some((part, index, all) => index < all.length - 1 && skipDir(part))) continue;
      if (!isNote(file.name) && !isAsset(file.name) && path !== META_FILE) continue;
      this.files.set(path, file);
    }
    this.name = root || 'Notes';
  }

  get size(): number {
    return this.files.size;
  }

  async scan(): Promise<TreeEntry[]> {
    const rootEntries: TreeEntry[] = [];
    const dirs = new Map<string, TreeEntry[]>([['', rootEntries]]);

    const ensureDir = (path: string): TreeEntry[] => {
      const existing = dirs.get(path);
      if (existing) return existing;
      const parent = ensureDir(dirOf(path));
      const children: TreeEntry[] = [];
      parent.push({ kind: 'dir', name: baseOf(path), path, children });
      dirs.set(path, children);
      return children;
    };

    for (const path of this.files.keys()) {
      if (path === META_FILE) continue;
      ensureDir(dirOf(path)).push({ kind: 'file', name: baseOf(path), path });
    }
    return sortEntries(rootEntries);
  }

  async readText(path: string): Promise<string> {
    const file = this.files.get(path);
    if (!file) throw new Error(t('errors', 'File not found: {path}', { path }));
    return file.text();
  }

  async readBlob(path: string): Promise<Blob | null> {
    return this.files.get(path) ?? null;
  }

  async writeText(): Promise<void> {
    throw new Error(t('errors', 'The folder is open read-only'));
  }

  async createFile(): Promise<string> {
    throw new Error(t('errors', 'The folder is open read-only'));
  }

  async createDir(): Promise<string> {
    throw new Error(t('errors', 'The folder is open read-only'));
  }

  async rename(): Promise<string> {
    throw new Error(t('errors', 'The folder is open read-only'));
  }

  async remove(): Promise<void> {
    throw new Error(t('errors', 'The folder is open read-only'));
  }
}

/** Legacy drag-and-drop tree (`webkitGetAsEntry`) flattened into a file list. */
export async function filesFromEntry(entry: FileSystemEntry): Promise<File[]> {
  const out: File[] = [];
  const visit = async (item: FileSystemEntry, prefix: string, depth: number): Promise<void> => {
    if (item.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (item as FileSystemFileEntry).file(resolve, reject),
      );
      Object.defineProperty(file, 'webkitRelativePath', { value: join(prefix, file.name) });
      out.push(file);
      return;
    }
    if (depth >= MAX_DEPTH || (depth > 0 && skipDir(item.name))) return;
    const reader = (item as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      if (batch.length === 0) break;
      for (const child of batch) await visit(child, join(prefix, item.name), depth + 1);
    }
  };
  await visit(entry, '', 0);
  return out;
}

/** Chromium may hand a writable handle straight from the drop. */
export async function handleFromDataTransfer(items: DataTransferItemList): Promise<DirHandleLike | null> {
  for (const item of Array.from(items)) {
    if (item.kind !== 'file' || !item.getAsFileSystemHandle) continue;
    const handle = await item.getAsFileSystemHandle();
    if (handle && handle.kind === 'directory') return handle;
  }
  return null;
}

/** Asks for write access; a refusal only downgrades the vault to read-only. */
export async function ensureWritable(handle: DirHandleLike): Promise<boolean> {
  if (!handle.requestPermission) return false;
  try {
    if ((await handle.queryPermission?.({ mode: 'readwrite' })) === 'granted') return true;
    return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}
