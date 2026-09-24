/**
 * Wiring: the folder gate, the tree, the editor, saving, and the chrome around
 * them — theme, zoom, panel width, search and the toolbar.
 */

import { Editor, type EditorStatus, type FormatAction, type Mode } from './editor';
import { createMarkdown } from './markdown';
import {
  applyFullWidth,
  applySidebar,
  applyTheme,
  applyZoom,
  clampZoom,
  loadSettings,
  saveSettings,
  ZOOM_STEP,
  type Theme,
} from './settings';
import { FileTree, stripExtension } from './tree';
import { ask, confirmAsk, toast } from './ui';
import {
  ASSETS_DIR,
  DirectoryVault,
  FileListVault,
  NOTE_EXTENSIONS,
  baseOf,
  dirOf,
  ensureWritable,
  filesFromEntry,
  handleFromDataTransfer,
  isNote,
  join,
  type TreeEntry,
  type Vault,
} from './vault';

const AUTOSAVE_DELAY = 1000;

const el = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`No element #${id}`);
  return node as T;
};

const settings = loadSettings();
const md = createMarkdown();

const gate = el('gate');
const app = el('app');
const scroller = el<HTMLDivElement>('scroller');
const doc = el('doc');
const viewer = el('viewer');
const placeholder = el('placeholder');
const statusPath = el('status-path');
const statusState = el('status-state');
const statusCount = el('status-count');

let vault: Vault | null = null;
let currentPath: string | null = null;
/** An image opened from the tree; it replaces the note, so `currentPath` is null meanwhile. */
let viewedPath: string | null = null;
let dirty = false;
/** Bumped on every edit, so a save knows whether the text moved on while it was writing. */
let revision = 0;
let saveTimer = 0;
const assets = new Map<string, string>();

/* ------------------------------------------------------------------ *
 * Editor
 * ------------------------------------------------------------------ */

const editor = new Editor(doc, scroller, md, {
  onChange: () => {
    dirty = true;
    revision += 1;
    renderState();
    scheduleSave();
  },
  onOpenNote: (href) => {
    void openRelative(href);
  },
  onOpenWiki: (target) => {
    void openWiki(target);
  },
  onAsset: (image) => {
    void resolveAsset(image);
  },
  onStatus: (status) => renderCount(status),
});

const tree = new FileTree(el('tree'), el('note-count'), {
  onOpen: (path) => void (isNote(path) ? openNote(path) : openImage(path)),
  onCreateFile: (dir) => void createNote(dir),
  onCreateDir: (dir) => void createFolder(dir),
  onRename: (entry) => void renameEntry(entry),
  onDelete: (entry) => void deleteEntry(entry),
  onReveal: (path) => {
    void navigator.clipboard?.writeText(path).catch(() => undefined);
    toast(`Path copied: ${path}`);
  },
  canEdit: () => Boolean(vault?.writable),
});
tree.setCollapsed(settings.collapsed);
tree.setExpanded(settings.expanded);

/* ------------------------------------------------------------------ *
 * Opening a folder
 * ------------------------------------------------------------------ */

const gateError = el('gate-error');

async function useVault(next: Vault): Promise<void> {
  await flushSave();
  vault = next;
  currentPath = null;
  closeImage();
  dirty = false;
  for (const url of assets.values()) URL.revokeObjectURL(url);
  assets.clear();

  const entries = await next.scan();
  tree.setEntries(entries);
  el('vault-label').textContent = next.name;
  gate.hidden = true;
  app.hidden = false;
  renderState();

  const notes = tree.notes();
  if (notes.length === 0) {
    toast(next.writable ? 'No .md files in this folder — create the first note' : 'No .md files in this folder', 'error');
    return;
  }
  const remembered = settings.lastPath && notes.some((note) => note.path === settings.lastPath)
    ? settings.lastPath
    : notes[0]!.path;
  await openNote(remembered);
}

async function pickFolder(): Promise<void> {
  gateError.textContent = '';
  if (window.showDirectoryPicker) {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const writable = await ensureWritable(handle);
      await useVault(new DirectoryVault(handle, writable));
      if (!writable) toast('Read-only access: saving will offer to download the file', 'error');
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') showGateError(error);
    }
    return;
  }
  el<HTMLInputElement>('folder-picker').click();
}

function showGateError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (gate.hidden) toast(message, 'error');
  else gateError.textContent = message;
}

el('open-folder').addEventListener('click', () => void pickFolder());
el('vault-name').addEventListener('click', () => void pickFolder());

el<HTMLInputElement>('folder-picker').addEventListener('change', (event) => {
  const files = Array.from((event.target as HTMLInputElement).files ?? []);
  if (files.length === 0) return;
  void useVault(new FileListVault(files)).catch(showGateError);
});

for (const type of ['dragover', 'dragenter']) {
  document.addEventListener(type, (event) => {
    event.preventDefault();
    gate.classList.add('gate--drop');
  });
}
document.addEventListener('dragleave', (event) => {
  if (event.relatedTarget === null) gate.classList.remove('gate--drop');
});
document.addEventListener('drop', (event) => {
  event.preventDefault();
  gate.classList.remove('gate--drop');
  void acceptDrop(event).catch(showGateError);
});

async function acceptDrop(event: DragEvent): Promise<void> {
  const transfer = event.dataTransfer;
  if (!transfer) return;
  const handle = await handleFromDataTransfer(transfer.items);
  if (handle) {
    await useVault(new DirectoryVault(handle, await ensureWritable(handle)));
    return;
  }
  for (const item of Array.from(transfer.items)) {
    const entry = item.webkitGetAsEntry?.();
    if (entry?.isDirectory) {
      await useVault(new FileListVault(await filesFromEntry(entry), entry.name));
      return;
    }
  }
  showGateError(new Error('Drag a folder, not a single file'));
}

if (!window.showDirectoryPicker) {
  const note = el('browser-note');
  note.hidden = false;
  note.textContent =
    'This browser cannot write files to disk: the folder will open read-only, ' +
    'and saving will offer to download the modified file. Full editing works in Chrome, Edge and Arc.';
}

/* ------------------------------------------------------------------ *
 * Notes
 * ------------------------------------------------------------------ */

async function openNote(path: string): Promise<void> {
  if (!vault) return;
  if (path === currentPath) return;
  await flushSave();
  try {
    const text = await vault.readText(path);
    currentPath = path;
    closeImage();
    editor.load(text);
    dirty = false;
    tree.setActive(path);
    settings.lastPath = path;
    persist();
    document.title = `${stripExtension(baseOf(path))} — Notes editor`;
    placeholder.hidden = true;
    renderState();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), 'error');
  }
}

/** A relative link inside a note, resolved against the note's own folder. */
function resolvePath(from: string, href: string): string {
  if (href.startsWith('/')) return href.slice(1);
  const parts = dirOf(from).split('/').filter(Boolean);
  for (const piece of href.split('/')) {
    if (piece === '.' || piece === '') continue;
    if (piece === '..') parts.pop();
    else parts.push(piece);
  }
  return parts.join('/');
}

async function openRelative(href: string): Promise<void> {
  if (!currentPath) return;
  const target = resolvePath(currentPath, href.split('#')[0] ?? href);
  const known = tree.find(target) ?? tree.find(`${target}.md`);
  if (known?.kind === 'file' && isNote(known.name)) {
    await openNote(known.path);
    return;
  }
  toast(`Not found: ${target}`, 'error');
}

async function openWiki(target: string): Promise<void> {
  const wanted = (target.split('#')[0] ?? target).trim().toLowerCase();
  if (!wanted) return;
  const notes = tree.notes();
  const found =
    notes.find((note) => note.path.toLowerCase() === wanted) ??
    notes.find((note) => stripExtension(note.name).toLowerCase() === wanted) ??
    notes.find((note) => stripExtension(note.path).toLowerCase() === wanted);
  if (found) {
    await openNote(found.path);
    return;
  }
  if (!vault?.writable) {
    toast(`Note "${target}" not found`, 'error');
    return;
  }
  const create = await confirmAsk('Note not found', `Create "${target}.md"?`, 'Create');
  if (!create) return;
  const path = await vault.createFile(dirOf(currentPath ?? ''), `${target}.md`);
  await refreshTree();
  await openNote(path);
}

function safeDecode(uri: string): string {
  try {
    return decodeURI(uri);
  } catch {
    return uri;
  }
}

/** Where a note keeps its embedded images: `dir/page.md` → `dir/assets/page`. */
function assetsDirOf(notePath: string): string {
  return join(join(dirOf(notePath), ASSETS_DIR), stripExtension(baseOf(notePath)));
}

/** A blob URL for a vault file, kept for as long as the vault is open. */
async function assetUrl(path: string): Promise<string | null> {
  const cached = assets.get(path);
  if (cached) return cached;
  const blob = await vault?.readBlob(path);
  if (!blob) return null;
  // Files from a flat list come without a type, and an SVG will not draw without one.
  const typed = blob.type || !path.toLowerCase().endsWith('.svg') ? blob : blob.slice(0, blob.size, 'image/svg+xml');
  const url = URL.createObjectURL(typed);
  assets.set(path, url);
  return url;
}

async function resolveAsset(image: HTMLImageElement): Promise<void> {
  if (!vault || !currentPath) return;
  const embed = image.dataset['embed'];
  const path = embed !== undefined
    ? join(assetsDirOf(currentPath), embed)
    : resolvePath(currentPath, safeDecode(image.dataset['asset'] ?? ''));
  const url = await assetUrl(path);
  if (!url) {
    image.replaceWith(Object.assign(document.createElement('span'), {
      className: 'missing-asset',
      textContent: `no such file: ${path}`,
    }));
    return;
  }
  image.src = url;
}

/** Shows a picture from the tree in place of the note — never as text in the editor. */
async function openImage(path: string): Promise<void> {
  if (!vault || path === viewedPath) return;
  await flushSave();
  const url = await assetUrl(path);
  if (!url) return void toast(`Could not read ${path}`, 'error');

  const name = baseOf(path);
  const caption = document.createElement('figcaption');
  caption.textContent = name;
  let media: HTMLElement;
  if (path.toLowerCase().endsWith('.pdf')) {
    media = Object.assign(document.createElement('iframe'), { src: url, title: name });
  } else {
    const image = Object.assign(document.createElement('img'), { src: url, alt: name });
    image.addEventListener('load', () => {
      caption.textContent = `${name} · ${image.naturalWidth} × ${image.naturalHeight}`;
    });
    media = image;
  }
  viewer.replaceChildren(media, caption);

  currentPath = null;
  viewedPath = path;
  dirty = false;
  editor.load('');
  doc.hidden = true;
  placeholder.hidden = true;
  viewer.hidden = false;
  tree.setActive(path);
  document.title = `${name} — Notes editor`;
  renderState();
}

function closeImage(): void {
  viewedPath = null;
  viewer.hidden = true;
  viewer.replaceChildren();
  doc.hidden = false;
}

/* ------------------------------------------------------------------ *
 * Saving
 * ------------------------------------------------------------------ */

function scheduleSave(): void {
  if (!vault?.writable || !currentPath) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void save(), AUTOSAVE_DELAY);
}

async function flushSave(): Promise<void> {
  window.clearTimeout(saveTimer);
  if (dirty && vault?.writable && currentPath) await save();
}

async function save(): Promise<void> {
  if (!vault || !currentPath || !dirty) return;
  if (!vault.writable) {
    download(baseOf(currentPath), editor.getText());
    dirty = false;
    renderState();
    return;
  }
  const saving = revision;
  try {
    await vault.writeText(currentPath, editor.getText());
    dirty = revision !== saving;
    renderState();
  } catch (error) {
    toast(`Could not save: ${error instanceof Error ? error.message : String(error)}`, 'error');
  }
}

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

el('save').addEventListener('click', () => {
  dirty = true;
  void save();
});

window.addEventListener('beforeunload', (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

/* ------------------------------------------------------------------ *
 * Tree actions
 * ------------------------------------------------------------------ */

async function refreshTree(): Promise<void> {
  if (!vault) return;
  tree.setEntries(await vault.scan());
  tree.setActive(currentPath);
}

function withExtension(name: string): string {
  return NOTE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)) ? name : `${name}.md`;
}

async function createNote(dir: string): Promise<void> {
  if (!vault?.writable) return void toast('The folder is open read-only', 'error');
  const name = await ask('New note', 'File name', 'Untitled.md');
  if (!name) return;
  try {
    const path = await vault.createFile(dir, withExtension(name));
    await vault.writeText(path, `# ${stripExtension(baseOf(path))}\n\n`);
    await refreshTree();
    await openNote(path);
    editor.setMode('edit');
    syncModeButtons();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), 'error');
  }
}

async function createFolder(dir: string): Promise<void> {
  if (!vault?.writable) return void toast('The folder is open read-only', 'error');
  const name = await ask('New folder', 'Folder name', '');
  if (!name) return;
  try {
    await vault.createDir(dir, name);
    await refreshTree();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), 'error');
  }
}

async function renameEntry(entry: TreeEntry): Promise<void> {
  if (!vault?.writable) return;
  const name = await ask('Rename', 'New name', entry.name);
  if (!name || name === entry.name) return;
  try {
    await flushSave();
    const next = await vault.rename(entry.path, entry.kind, entry.kind === 'file' ? withExtension(name) : name);
    // A note's images follow it, or its `![[embeds]]` would all break.
    const images = entry.kind === 'file' && isNote(entry.name) ? tree.find(assetsDirOf(entry.path)) : null;
    if (images?.kind === 'dir') {
      try {
        await vault.rename(images.path, 'dir', stripExtension(baseOf(next)));
      } catch (error) {
        toast(`The note was renamed, its images were not: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    }
    if (currentPath === entry.path) currentPath = next;
    else if (currentPath?.startsWith(`${entry.path}/`)) currentPath = next + currentPath.slice(entry.path.length);
    if (viewedPath === entry.path) viewedPath = next;
    else if (viewedPath?.startsWith(`${entry.path}/`)) viewedPath = next + viewedPath.slice(entry.path.length);
    await refreshTree();
    if (currentPath) {
      tree.setActive(currentPath);
      settings.lastPath = currentPath;
      persist();
    } else if (viewedPath) {
      tree.setActive(viewedPath);
      renderState();
    }
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), 'error');
  }
}

async function deleteEntry(entry: TreeEntry): Promise<void> {
  if (!vault?.writable) return;
  const kind = entry.kind === 'dir' ? 'folder' : isNote(entry.name) ? 'note' : 'file';
  const ok = await confirmAsk('Delete', `Delete the ${kind} "${entry.name}"? This cannot be undone.`);
  if (!ok) return;
  try {
    await vault.remove(entry.path, entry.kind);
    const inside = (path: string | null): boolean => path === entry.path || Boolean(path?.startsWith(`${entry.path}/`));
    if (inside(currentPath) || inside(viewedPath)) {
      currentPath = null;
      closeImage();
      dirty = false;
      editor.load('');
      placeholder.hidden = false;
      document.title = 'Notes editor';
    }
    await refreshTree();
    renderState();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), 'error');
  }
}

el('new-note').addEventListener('click', () => void createNote(dirOf(currentPath ?? '')));
el('new-folder').addEventListener('click', () => void createFolder(dirOf(currentPath ?? '')));

el<HTMLInputElement>('tree-filter').addEventListener('input', (event) => {
  tree.setFilter((event.target as HTMLInputElement).value);
});

/* ------------------------------------------------------------------ *
 * Mode, toolbar, colours
 * ------------------------------------------------------------------ */

function setMode(mode: Mode): void {
  editor.setMode(mode);
  settings.mode = mode;
  persist();
  syncModeButtons();
}

function syncModeButtons(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('.seg')) {
    button.classList.toggle('seg--on', button.dataset['mode'] === editor.getMode());
  }
  document.body.classList.toggle('mode-edit', editor.getMode() === 'edit');
}

for (const button of document.querySelectorAll<HTMLButtonElement>('.seg')) {
  button.addEventListener('click', () => setMode(button.dataset['mode'] === 'edit' ? 'edit' : 'read'));
}

// Toolbar buttons must never take focus away from the block being edited.
const format = el('format');
format.addEventListener('mousedown', (event) => event.preventDefault());
format.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!button) return;
  if (editor.getMode() !== 'edit') setMode('edit');
  const heading = button.dataset['heading'];
  if (heading !== undefined) {
    editor.heading(Number(heading));
    return;
  }
  const action = button.dataset['action'];
  if (action) editor.format(action as FormatAction);
});

const COLORS: Array<{ name: string; value: string }> = [
  { name: 'Red', value: '#d7263d' },
  { name: 'Orange', value: '#d97706' },
  { name: 'Green', value: '#15803d' },
  { name: 'Blue', value: '#1d4ed8' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Grey', value: '#6b7280' },
];

const palette = el('palette');
const colorButton = el('color');

colorButton.addEventListener('mousedown', (event) => event.preventDefault());
colorButton.addEventListener('click', () => {
  if (!palette.hidden) {
    palette.hidden = true;
    return;
  }
  if (editor.getMode() !== 'edit') setMode('edit');
  palette.replaceChildren();
  palette.append(swatchRow('Text colour', (color) => `color:${color}`));
  palette.append(swatchRow('Background', (color) => `background:${color}33`));
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'palette-clear';
  clear.textContent = 'Clear formatting';
  clear.addEventListener('mousedown', (event) => event.preventDefault());
  clear.addEventListener('click', () => {
    editor.colorize('');
    palette.hidden = true;
  });
  palette.append(clear);

  const box = colorButton.getBoundingClientRect();
  palette.hidden = false;
  palette.style.left = `${Math.min(box.left, window.innerWidth - palette.offsetWidth - 8)}px`;
  palette.style.top = `${box.bottom + 6}px`;
});

function swatchRow(title: string, toStyle: (color: string) => string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'palette-row';
  const label = document.createElement('span');
  label.className = 'palette-title';
  label.textContent = title;
  row.append(label);
  const strip = document.createElement('div');
  strip.className = 'palette-strip';
  for (const color of COLORS) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'swatch';
    swatch.style.background = color.value;
    swatch.title = color.name;
    swatch.addEventListener('mousedown', (event) => event.preventDefault());
    swatch.addEventListener('click', () => {
      editor.colorize(toStyle(color.value));
      palette.hidden = true;
    });
    strip.append(swatch);
  }
  row.append(strip);
  return row;
}

document.addEventListener('mousedown', (event) => {
  if (palette.hidden) return;
  const target = event.target as Node;
  if (!palette.contains(target) && !colorButton.contains(target)) palette.hidden = true;
});

/* ------------------------------------------------------------------ *
 * Search
 * ------------------------------------------------------------------ */

const findbar = el('findbar');
const findInput = el<HTMLInputElement>('find-input');
const findCase = el<HTMLInputElement>('find-case');
const findCount = el('find-count');
let hits: number[] = [];
let hitIndex = 0;

function runFind(): void {
  hits = editor.findAll(findInput.value, findCase.checked);
  hitIndex = 0;
  findCount.textContent = hits.length ? `1 / ${hits.length}` : '0 / 0';
  if (hits.length) editor.reveal(hits[0]!);
}

function stepFind(delta: number): void {
  if (hits.length === 0) return;
  hitIndex = (hitIndex + delta + hits.length) % hits.length;
  findCount.textContent = `${hitIndex + 1} / ${hits.length}`;
  editor.reveal(hits[hitIndex]!);
}

function openFind(): void {
  findbar.hidden = false;
  findInput.focus();
  findInput.select();
  if (findInput.value) runFind();
}

/** Closing the search leaves the caret on the current hit, or at least the focus in the document. */
function closeFind(): void {
  findbar.hidden = true;
  const hit = hits[hitIndex];
  hits = [];
  scroller.focus();
  if (hit !== undefined) editor.select(hit, findInput.value.length);
}

el('find').addEventListener('click', () => (findbar.hidden ? openFind() : closeFind()));
el('find-close').addEventListener('click', closeFind);
el('find-next').addEventListener('click', () => stepFind(1));
el('find-prev').addEventListener('click', () => stepFind(-1));
findCase.addEventListener('change', runFind);
findInput.addEventListener('input', runFind);
findInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    if (hits.length === 0) runFind();
    else stepFind(event.shiftKey ? -1 : 1);
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    closeFind();
  }
});

/* ------------------------------------------------------------------ *
 * Theme, zoom, panel
 * ------------------------------------------------------------------ */

const THEMES: Theme[] = ['system', 'light', 'dark'];
const THEME_LABEL: Record<Theme, string> = {
  system: 'Theme: match system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

function setTheme(theme: Theme): void {
  settings.theme = theme;
  applyTheme(theme);
  el('theme').title = THEME_LABEL[theme];
  persist();
}

el('theme').addEventListener('click', () => {
  const next = THEMES[(THEMES.indexOf(settings.theme) + 1) % THEMES.length]!;
  setTheme(next);
  toast(THEME_LABEL[next]);
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (settings.theme === 'system') applyTheme('system');
});

function setZoom(zoom: number): void {
  settings.zoom = clampZoom(zoom);
  applyZoom(settings.zoom);
  el('zoom-reset').textContent = `${settings.zoom}%`;
  persist();
}

el('zoom-in').addEventListener('click', () => setZoom(settings.zoom + ZOOM_STEP));
el('zoom-out').addEventListener('click', () => setZoom(settings.zoom - ZOOM_STEP));
el('zoom-reset').addEventListener('click', () => setZoom(100));

function syncWidthButton(): void {
  const button = el('full-width');
  button.title = settings.fullWidth ? 'Text: full width' : 'Text: centred column';
  button.setAttribute('aria-pressed', String(settings.fullWidth));
}

el('full-width').addEventListener('click', () => {
  settings.fullWidth = !settings.fullWidth;
  applyFullWidth(settings.fullWidth);
  syncWidthButton();
  persist();
});

function setSidebar(width: number, hidden: boolean): void {
  settings.sidebar = Math.min(560, Math.max(160, Math.round(width)));
  settings.sidebarHidden = hidden;
  applySidebar(settings.sidebar, hidden);
  persist();
}

el('toggle-sidebar').addEventListener('click', () => setSidebar(settings.sidebar, !settings.sidebarHidden));

const resizer = el('sidebar-resizer');
resizer.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  resizer.setPointerCapture(event.pointerId);
  const move = (moveEvent: PointerEvent): void => setSidebar(moveEvent.clientX, false);
  const stop = (): void => {
    resizer.removeEventListener('pointermove', move);
    resizer.removeEventListener('pointerup', stop);
  };
  resizer.addEventListener('pointermove', move);
  resizer.addEventListener('pointerup', stop);
});
resizer.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') setSidebar(settings.sidebar - 16, settings.sidebarHidden);
  if (event.key === 'ArrowRight') setSidebar(settings.sidebar + 16, settings.sidebarHidden);
});

/* ------------------------------------------------------------------ *
 * Status bar
 * ------------------------------------------------------------------ */

function renderState(): void {
  statusPath.textContent = currentPath ?? viewedPath ?? '—';
  if (!vault) statusState.textContent = '';
  else if (!vault.writable) statusState.textContent = 'read-only';
  else statusState.textContent = dirty ? 'unsaved' : 'saved';
  statusState.classList.toggle('status-state--dirty', dirty && Boolean(vault?.writable));
}

function renderCount(status: EditorStatus): void {
  statusCount.textContent = currentPath ? `${status.words} words · ${status.chars} characters` : '';
}

function persist(): void {
  settings.collapsed = tree.getCollapsed();
  settings.expanded = tree.getExpanded();
  saveSettings(settings);
}

/* ------------------------------------------------------------------ *
 * Global keyboard
 * ------------------------------------------------------------------ */

document.addEventListener('keydown', (event) => {
  const mod = event.metaKey || event.ctrlKey;
  if (!mod) return;
  const key = event.key.toLowerCase();

  if (key === 's') {
    event.preventDefault();
    dirty = true;
    void save();
    return;
  }
  if (key === 'f') {
    event.preventDefault();
    openFind();
    return;
  }
  if (key === 'e' && !event.altKey && !event.shiftKey) {
    event.preventDefault();
    setMode(editor.getMode() === 'edit' ? 'read' : 'edit');
    return;
  }
  if (key === '\\') {
    event.preventDefault();
    setSidebar(settings.sidebar, !settings.sidebarHidden);
    return;
  }
  if (!event.altKey && (key === '=' || key === '+')) {
    event.preventDefault();
    setZoom(settings.zoom + ZOOM_STEP);
    return;
  }
  if (!event.altKey && key === '-') {
    event.preventDefault();
    setZoom(settings.zoom - ZOOM_STEP);
    return;
  }
  if (!event.altKey && key === '0') {
    event.preventDefault();
    setZoom(100);
  }
});

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */

applyTheme(settings.theme);
applyZoom(settings.zoom);
applyFullWidth(settings.fullWidth);
syncWidthButton();
applySidebar(settings.sidebar, settings.sidebarHidden);
el('zoom-reset').textContent = `${settings.zoom}%`;
el('theme').title = THEME_LABEL[settings.theme];
editor.setMode(settings.mode);
syncModeButtons();
renderState();

// Served over HTTP next to the notes? Then there is nothing to pick.
void (async () => {
  if (location.protocol.startsWith('http')) {
    try {
      const response = await fetch('index.json', { cache: 'no-store' });
      if (!response.ok) return;
      const listing = (await response.json()) as { files?: string[]; name?: string };
      if (!Array.isArray(listing.files) || listing.files.length === 0) return;
      const files = await Promise.all(
        listing.files.map(async (path) => {
          const blob = await (await fetch(path)).blob();
          const file = new File([blob], baseOf(path));
          Object.defineProperty(file, 'webkitRelativePath', { value: join(listing.name ?? 'notes', path) });
          return file;
        }),
      );
      await useVault(new FileListVault(files, listing.name ?? 'Notes'));
    } catch {
      /* no listing next to the page — the folder picker stays */
    }
  }
})();
