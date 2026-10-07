/**
 * Recently opened folders, remembered in IndexedDB between sessions.
 *
 * A page never learns a folder's path, but Chromium lets it keep the folder's
 * handle: IndexedDB stores it as it is (localStorage only holds strings). After
 * a reload the handle comes back without access; the browser grants it again
 * on a click, or at once when the user chose to allow it on every visit and in
 * an installed app. Only folders opened with a handle are remembered — the
 * read-only ones of Safari and Firefox have nothing to keep.
 */

import { t } from './i18n';
import { ensureWritable, type DirHandleLike } from './vault';

export interface RecentFolder {
  id: number;
  name: string;
  handle: DirHandleLike;
  /** When it was last opened, ms since the epoch. */
  opened: number;
  /** The note open in it the last time. */
  lastPath: string | null;
}

const IDB_NAME = 'markdown-catalog-editor';
const IDB_STORE = 'recent';
const RECENT_MAX = 6;

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB is unavailable'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const idb = await openIdb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(idb.transaction(IDB_STORE, mode).objectStore(IDB_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
  } finally {
    idb.close();
  }
}

/** Newest first; empty where IndexedDB or folder handles are unavailable. */
export async function recentFolders(): Promise<RecentFolder[]> {
  // The extension's worker has no picker, but reads the folders its panel keeps.
  if (typeof indexedDB === 'undefined' || !('showDirectoryPicker' in globalThis || 'ServiceWorkerGlobalScope' in globalThis)) return [];
  try {
    const all = await withStore<RecentFolder[]>('readonly', (store) => store.getAll() as IDBRequest<RecentFolder[]>);
    return all.sort((a, b) => b.opened - a.opened);
  } catch {
    return [];
  }
}

/**
 * Puts the folder at the top of the list and returns its record. The same
 * folder picked again keeps its record — and the note last open in it — even
 * when another remembered folder has the same name.
 */
export async function rememberFolder(handle: DirHandleLike): Promise<RecentFolder | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const all = await recentFolders();
    let known: RecentFolder | undefined;
    for (const item of all) {
      if (await sameFolder(item.handle, handle)) {
        known = item;
        break;
      }
    }
    const record = { name: handle.name, handle, opened: Date.now(), lastPath: known?.lastPath ?? null } as RecentFolder;
    if (known) record.id = known.id;
    record.id = Number(await withStore('readwrite', (store) => store.put(record)));
    for (const stale of (await recentFolders()).slice(RECENT_MAX)) await forgetFolder(stale.id);
    keepStorage();
    return record;
  } catch {
    /* no IndexedDB (private mode) — the folder simply is not offered next time */
    return null;
  }
}

/**
 * Asks the browser to keep this origin's storage — the remembered folders —
 * when the disk runs low, instead of clearing it with the other sites' data.
 * Only where the answer comes without a question: the installed app and the
 * extension's panel. A tab in Firefox would ask the user, for no good reason.
 */
function keepStorage(): void {
  const installed = ['standalone', 'minimal-ui', 'window-controls-overlay'].some((mode) => matchMedia(`(display-mode: ${mode})`).matches);
  if (!installed && location.protocol !== 'chrome-extension:') return;
  void navigator.storage
    ?.persisted?.()
    .then((kept) => kept || navigator.storage.persist())
    .catch(() => false);
}

/** Remembers the note open in the folder, to reopen it there next time. */
export async function rememberNote(id: number, path: string | null): Promise<void> {
  try {
    const record = await withStore<RecentFolder | undefined>('readonly', (store) => store.get(id) as IDBRequest<RecentFolder | undefined>);
    if (!record || record.lastPath === path) return;
    record.lastPath = path;
    await withStore('readwrite', (store) => store.put(record));
  } catch {
    /* the note is simply not reopened next time */
  }
}

export async function forgetFolder(id: number): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(id));
  } catch {
    /* nothing to forget */
  }
}

/** True when the browser already lets the page write to the folder — no click needed. */
export async function isGranted(handle: DirHandleLike): Promise<boolean> {
  try {
    return (await handle.queryPermission?.({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

/**
 * Asks for access again: to write, or at least to read. Must run from a click.
 * Resolves to whether the folder is writable.
 */
export async function regainAccess(handle: DirHandleLike): Promise<boolean> {
  if (await ensureWritable(handle)) return true;
  try {
    if ((await handle.queryPermission?.({ mode: 'read' })) === 'granted') return false;
    if ((await handle.requestPermission?.({ mode: 'read' })) === 'granted') return false;
  } catch {
    /* reported below */
  }
  throw new Error(t('errors', 'The browser was not allowed to open the folder'));
}

async function sameFolder(a: DirHandleLike, b: DirHandleLike): Promise<boolean> {
  try {
    return a.isSameEntry ? await a.isSameEntry(b) : false;
  } catch {
    return false;
  }
}
