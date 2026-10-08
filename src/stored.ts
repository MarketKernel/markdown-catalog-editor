/**
 * Folders of notes kept inside the browser, for the browsers that cannot write
 * to a folder on disk: Safari, Firefox, and every browser on a phone or an iPad.
 *
 * A folder or a ZIP archive the user opens there is copied into IndexedDB, and
 * the editor reads and writes that copy like any other vault; a ZIP archive is
 * the way back out. IndexedDB rather than the origin private file system,
 * which would take the File System Access code as it is: Safari writes to the
 * latter from a page only since version 26, and from a worker before that,
 * while IndexedDB keeps files in every browser the editor runs in. Both live in
 * the same storage of the site and go together when it is cleared.
 *
 * Three stores: the folders, their files ([folder, path] → the contents) and
 * their subfolders, kept apart so that an empty one still shows. A listing
 * reads keys only, never the bytes of every image.
 *
 * Each call opens the database and closes it again: Safari has been known to
 * drop a connection held while the page sat in the background, and a save
 * then fails until the page is reloaded.
 */

import { t } from './i18n';
import {
  baseOf,
  dirOf,
  isNote,
  join,
  keptFile,
  META_FILE,
  notFound,
  stripExtension,
  treeOf,
  type EntryKind,
  type TreeEntry,
  type Vault,
  type VaultWriter,
} from './vault';
import { bytesOf, unzip, zip, type ZipFile } from './zip';

export interface StoredFolder {
  id: number;
  name: string;
  /** When it was last opened, ms since the epoch. */
  opened: number;
  /** The note open in it the last time. */
  lastPath: string | null;
}

interface FileRecord {
  folder: number;
  path: string;
  /** Notes and `.meta.json` as text, everything else as bytes. */
  data: string | ArrayBuffer;
  type: string;
}

interface DirRecord {
  folder: number;
  path: string;
}

interface Stores {
  folders: IDBObjectStore;
  files: IDBObjectStore;
  dirs: IDBObjectStore;
}

const DB_NAME = 'markdown-catalog-editor-notes';
const FOLDERS = 'folders';
const FILES = 'files';
const DIRS = 'dirs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is unavailable'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FOLDERS, { keyPath: 'id', autoIncrement: true });
      request.result.createObjectStore(FILES, { keyPath: ['folder', 'path'] });
      request.result.createObjectStore(DIRS, { keyPath: ['folder', 'path'] });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable'));
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/**
 * Runs `work` in one transaction over the three stores and resolves once it
 * has committed — not before: a write the disk refused (the quota) fails
 * there. A write is "strict": on the disk when it says so, which Chrome
 * otherwise leaves to the system.
 */
async function transact<T>(mode: IDBTransactionMode, work: (stores: Stores) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction([FOLDERS, FILES, DIRS], mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
    const committed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction was aborted'));
    });
    let value: T;
    try {
      value = await work({ folders: tx.objectStore(FOLDERS), files: tx.objectStore(FILES), dirs: tx.objectStore(DIRS) });
    } catch (error) {
      try {
        tx.abort();
      } catch {
        /* already finished */
      }
      await committed.catch(() => undefined);
      throw error;
    }
    await committed;
    return value;
  } finally {
    db.close();
  }
}

/** Every entry of a folder: the keys are [folder, path], so [folder] to [folder + 1] holds them all. */
function range(folder: number): IDBKeyRange {
  return IDBKeyRange.bound([folder], [folder + 1], false, true);
}

/** The paths in a store of one folder, from the keys alone. */
async function pathsIn(store: IDBObjectStore, folder: number): Promise<string[]> {
  const keys = await result(store.getAllKeys(range(folder)));
  return keys.map((key) => String((key as [number, string])[1]));
}

/**
 * Whether the browser lets the page keep folders: not where IndexedDB is off.
 * Safari 14.1 could leave the first open after a page load hanging for good,
 * so the start does not wait on it for long: then the folder opens read-only.
 */
export async function canStore(): Promise<boolean> {
  const open = openDb().then(
    (db) => {
      db.close();
      return true;
    },
    () => false,
  );
  const late = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000));
  return Promise.race([open, late]);
}

/** Newest first; empty when there are none or IndexedDB is unavailable. */
export async function storedFolders(): Promise<StoredFolder[]> {
  try {
    const all = await transact('readonly', ({ folders }) => result(folders.getAll() as IDBRequest<StoredFolder[]>));
    return all.sort((a, b) => b.opened - a.opened);
  } catch {
    return [];
  }
}

/** Marks the folder as opened now, so it heads the list and reopens next time. */
export async function touchStored(id: number, lastPath?: string | null): Promise<void> {
  try {
    await transact('readwrite', async ({ folders }) => {
      const record = await result(folders.get(id) as IDBRequest<StoredFolder | undefined>);
      if (!record) return;
      record.opened = Date.now();
      if (lastPath !== undefined) record.lastPath = lastPath;
      await result(folders.put(record));
    });
  } catch {
    /* the list is only in another order */
  }
}

/** The folder and everything in it, gone for good. */
export async function forgetStored(id: number): Promise<void> {
  await transact('readwrite', async ({ folders, files, dirs }) => {
    await result(files.delete(range(id)));
    await result(dirs.delete(range(id)));
    await result(folders.delete(id));
  });
}

/**
 * Asks the browser to keep the stored folders when the disk runs low, rather
 * than clear them with other sites' data. Firefox asks the user, so it is
 * asked at once, while the click still counts; Chrome and Safari decide by
 * themselves, and say yes more readily to an installed app. Nothing keeps
 * them from the user clearing the site's data.
 */
export async function keepStored(): Promise<boolean> {
  try {
    return navigator.storage?.persist ? await navigator.storage.persist() : false;
  } catch {
    return false;
  }
}

const TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  // An SVG without its type is not drawn by an <img>: the browser does not sniff it.
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
};

function typeOf(path: string): string {
  if (isNote(path)) return 'text/markdown;charset=utf-8';
  if (baseOf(path) === META_FILE) return 'application/json';
  return TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()] ?? 'application/octet-stream';
}

function isText(path: string): boolean {
  return isNote(path) || path === META_FILE;
}

async function recordOf(folder: number, path: string, data: string | Blob): Promise<FileRecord> {
  const text = isText(path);
  if (typeof data === 'string') return { folder, path, data: text ? data : new TextEncoder().encode(data).buffer as ArrayBuffer, type: typeOf(path) };
  // Bytes rather than the Blob: older Safari kept Blobs in IndexedDB badly.
  return { folder, path, data: text ? await data.text() : await data.arrayBuffer(), type: text ? typeOf(path) : data.type || typeOf(path) };
}

/** A name for the new folder that no stored folder has yet: "Notes", "Notes 2"… */
function freeName(name: string, taken: readonly StoredFolder[]): string {
  const names = new Set(taken.map((folder) => folder.name));
  if (!names.has(name)) return name;
  for (let n = 2; ; n += 1) if (!names.has(`${name} ${n}`)) return `${name} ${n}`;
}

/**
 * Copies a folder — any vault: one picked or dropped, one unpacked from an
 * archive — into the browser. All of it or nothing: it is read first and
 * written in one transaction. A folder of that name already there is kept;
 * the copy gets a name of its own.
 */
export async function storeFolder(source: Vault, name = source.name): Promise<StoredFolder> {
  const { files, dirs } = paths(await source.scan());
  const read: { path: string; data: Blob }[] = [];
  for (const path of [...files, META_FILE]) {
    const data = await source.readBlob(path);
    if (data) read.push({ path, data });
  }
  const pending = await Promise.all(read.map((file) => recordOf(0, file.path, file.data)));
  return transact('readwrite', async (stores) => {
    const taken = await result(stores.folders.getAll() as IDBRequest<StoredFolder[]>);
    const record = { name: freeName(name.trim() || 'Notes', taken), opened: Date.now(), lastPath: null } as Omit<StoredFolder, 'id'>;
    const id = Number(await result(stores.folders.add(record)));
    for (const dir of dirs) stores.dirs.put({ folder: id, path: dir } satisfies DirRecord);
    for (const entry of pending) stores.files.put({ ...entry, folder: id });
    return { ...record, id };
  });
}

/** The files and the folders of a tree, as paths. */
function paths(entries: readonly TreeEntry[]): { files: string[]; dirs: string[] } {
  const files: string[] = [];
  const dirs: string[] = [];
  const walk = (list: readonly TreeEntry[]): void => {
    for (const entry of list) {
      if (entry.kind === 'dir') {
        dirs.push(entry.path);
        walk(entry.children ?? []);
      } else {
        files.push(entry.path);
      }
    }
  };
  walk(entries);
  return { files, dirs };
}

/** Whether a folder at `path` would show in the tree: not a dot-folder, not `node_modules`… */
function shownDir(path: string): boolean {
  return keptFile(`${path}/a.md`);
}

export class StoredVault implements Vault {
  readonly writable = true;
  readonly stored = true;

  constructor(private readonly folder: StoredFolder) {}

  get id(): number {
    return this.folder.id;
  }

  get name(): string {
    return this.folder.name;
  }

  /** The note open the last time, to open again. */
  get lastPath(): string | null {
    return this.folder.lastPath;
  }

  remember(path: string): void {
    this.folder.lastPath = path;
    void touchStored(this.folder.id, path);
  }

  /**
   * Refuses to write into a folder deleted meanwhile — from the start screen
   * of another tab: the text would go where nothing lists it.
   */
  private async alive(folders: IDBObjectStore): Promise<void> {
    if (!(await result(folders.getKey(this.folder.id)))) throw new Error(t('errors', 'The folder is no longer in this browser'));
  }

  private async listing(stores: Stores): Promise<{ files: string[]; dirs: string[] }> {
    return { files: await pathsIn(stores.files, this.folder.id), dirs: await pathsIn(stores.dirs, this.folder.id) };
  }

  /**
   * A name a disk would take, and one the tree shows: anything it would hide —
   * a dot-folder, `._name`, a note without its extension — would be left out
   * of the ZIP archive too, which is the only way out of the browser.
   */
  private check(dir: string, name: string, kind: EntryKind): string {
    const path = join(dir, name);
    const plain = name.trim() === name && name !== '' && name !== '.' && name !== '..' && !/[\\/]/.test(name);
    if (!plain || !(kind === 'dir' ? shownDir(path) : keptFile(path) && path !== META_FILE)) {
      throw new Error(t('errors', 'This name cannot be used here: {name}', { name }));
    }
    return path;
  }

  private taken(listing: { files: string[]; dirs: string[] }, path: string): boolean {
    return [...listing.files, ...listing.dirs].some((entry) => entry === path || entry.startsWith(`${path}/`));
  }

  async scan(): Promise<TreeEntry[]> {
    const { files, dirs } = await transact('readonly', (stores) => this.listing(stores));
    return treeOf(files.filter((path) => path !== META_FILE && keptFile(path)), dirs.filter(shownDir));
  }

  private get(path: string): Promise<FileRecord | undefined> {
    return transact('readonly', ({ files }) => result(files.get([this.folder.id, path]) as IDBRequest<FileRecord | undefined>));
  }

  async readText(path: string): Promise<string> {
    const entry = await this.get(path);
    if (!entry) throw notFound(path);
    return typeof entry.data === 'string' ? entry.data : new TextDecoder().decode(entry.data);
  }

  async readBlob(path: string): Promise<Blob | null> {
    const entry = await this.get(path);
    return entry ? new Blob([entry.data], { type: entry.type }) : null;
  }

  async writeText(path: string, text: string): Promise<void> {
    await this.put(path, text);
  }

  async writeBlob(path: string, blob: Blob): Promise<void> {
    await this.put(path, blob);
  }

  private async put(path: string, data: string | Blob): Promise<void> {
    const record = await recordOf(this.folder.id, path, data);
    await transact('readwrite', async ({ folders, files }) => {
      await this.alive(folders);
      await result(files.put(record));
    });
  }

  async createFile(dir: string, name: string): Promise<string> {
    const path = this.check(dir, name, 'file');
    await transact('readwrite', async (stores) => {
      await this.alive(stores.folders);
      if (this.taken(await this.listing(stores), path)) throw new Error(t('errors', '"{name}" already exists', { name }));
      await result(stores.files.put({ folder: this.folder.id, path, data: '', type: typeOf(path) } satisfies FileRecord));
    });
    return path;
  }

  async createDir(dir: string, name: string): Promise<string> {
    const path = this.check(dir, name, 'dir');
    await transact('readwrite', async (stores) => {
      await this.alive(stores.folders);
      if (this.taken(await this.listing(stores), path)) throw new Error(t('errors', '"{name}" already exists', { name }));
      await result(stores.dirs.put({ folder: this.folder.id, path } satisfies DirRecord));
    });
    return path;
  }

  /** A folder moves with everything in it, in one transaction: nothing is left half moved. */
  async rename(path: string, kind: EntryKind, name: string): Promise<string> {
    const target = this.check(dirOf(path), name, kind);
    if (target === path) return path;
    const id = this.folder.id;
    await transact('readwrite', async (stores) => {
      await this.alive(stores.folders);
      const listing = await this.listing(stores);
      if (this.taken(listing, target)) throw new Error(t('errors', '"{name}" already exists', { name }));
      const inside = (entry: string): boolean => entry === path || (kind === 'dir' && entry.startsWith(`${path}/`));
      const moved = (entry: string): string => target + entry.slice(path.length);
      const files = listing.files.filter(inside);
      const dirs = listing.dirs.filter(inside);
      if (!files.length && !dirs.length) throw notFound(path);
      for (const entry of files) {
        const record = (await result(stores.files.get([id, entry]))) as FileRecord;
        stores.files.delete([id, entry]);
        stores.files.put({ ...record, path: moved(entry) });
      }
      for (const entry of dirs) {
        stores.dirs.delete([id, entry]);
        stores.dirs.put({ folder: id, path: moved(entry) } satisfies DirRecord);
      }
    });
    return target;
  }

  async remove(path: string, kind: EntryKind): Promise<void> {
    const id = this.folder.id;
    await transact('readwrite', async (stores) => {
      await this.alive(stores.folders);
      const { files, dirs } = await this.listing(stores);
      const inside = (entry: string): boolean => entry === path || (kind === 'dir' && entry.startsWith(`${path}/`));
      for (const entry of files.filter(inside)) stores.files.delete([id, entry]);
      for (const entry of dirs.filter(inside)) stores.dirs.delete([id, entry]);
      // The folder it was in stays, even with nothing left in it, as it would on a disk.
      const parent = dirOf(path);
      if (parent) stores.dirs.put({ folder: id, path: parent } satisfies DirRecord);
    });
  }

  writer(): VaultWriter {
    return {
      write: (path, data) => this.put(path, data),
      list: async (dir) => {
        const { files } = await transact('readonly', (stores) => this.listing(stores));
        return files.filter((path) => path.startsWith(`${dir}/`));
      },
    };
  }
}

/* ------------------------------------------------------------------ *
 * ZIP archives: a folder out of the browser and back in
 * ------------------------------------------------------------------ */

/** A name safe as one step of a path: no slashes. */
function safeName(name: string): string {
  return name.replace(/[\\/]+/g, '-').trim() || 'Notes';
}

/**
 * The folder as a ZIP archive, everything in it under one folder of its name,
 * as a folder compressed in the Finder or Explorer comes out: unpacked, it is
 * that folder again. `open` is the note on screen, in case its save has not
 * reached the vault.
 */
export async function packFolder(source: Vault, open?: { path: string; text: string }): Promise<Blob> {
  const top = safeName(source.name);
  const { files, dirs } = paths(await source.scan());
  const packed: ZipFile[] = [];
  for (const path of [...files, META_FILE]) {
    const data = path === open?.path ? open.text : await source.readBlob(path);
    if (data !== null) packed.push({ path: `${top}/${path}`, data: await bytesOf(data) });
  }
  return zip(packed, [top, ...dirs.map((dir) => `${top}/${dir}`)]);
}

/** `path`, or `name 2.md`, `name 3.md`… beside it when that is taken. */
function freePath(path: string, taken: Set<string>): string {
  if (!taken.has(path)) return path;
  const dir = dirOf(path);
  const base = baseOf(path);
  const stem = stripExtension(base);
  const ext = base.slice(stem.length);
  for (let n = 2; ; n += 1) {
    const next = join(dir, `${stem} ${n}${ext}`);
    if (!taken.has(next)) return next;
  }
}

/**
 * The files of an archive, ready for a FileListVault, and the folder's name:
 * the one folder everything in the archive is in, or else the archive's own
 * name. Only what a vault keeps comes along (see keptFile) — and is unpacked:
 * the rest is skipped unread. Two entries that come out at the same path —
 * `a\b.md` and `a/b.md` — both stay, the second under a name of its own.
 */
export async function unpackFolder(archive: File): Promise<{ name: string; files: File[] }> {
  // What a vault would keep, at the root or inside the one folder: the Finder adds a __MACOSX beside it.
  const inside = (path: string): string => path.slice(path.indexOf('/') + 1);
  const wanted = (path: string): boolean => keptFile(path) || (path.includes('/') && keptFile(inside(path)));
  const entries = await unzip(new Uint8Array(await archive.arrayBuffer()), wanted);
  const firsts = new Set(entries.map((entry) => (entry.path.includes('/') ? entry.path.slice(0, entry.path.indexOf('/')) : '')));
  const [first] = firsts;
  const wrapped = firsts.size === 1 && first ? first : '';
  const name = wrapped || stripExtension(archive.name) || 'Notes';
  const files: File[] = [];
  const taken = new Set<string>();
  for (const entry of entries) {
    const found = wrapped ? entry.path.slice(wrapped.length + 1) : entry.path;
    if (!keptFile(found)) continue;
    const path = freePath(found, taken);
    taken.add(path);
    const file = new File([entry.data as BlobPart], baseOf(path), { type: typeOf(path) });
    // The path a picked folder would give, its own name first: FileListVault drops that step.
    Object.defineProperty(file, 'webkitRelativePath', { value: `${safeName(name)}/${path}` });
    files.push(file);
  }
  if (!files.length) throw new Error(t('errors', 'The ZIP archive has no notes'));
  return { name, files };
}
