/**
 * Wiring: the folder gate, the tree, the editor, saving, and the chrome around
 * them — language, theme, zoom, panel width, search, settings and the toolbar.
 */

import { Editor, translateTableTools, type EditorStatus, type FormatAction, type Mode } from './editor';
import { FLAGS, isRightToLeft, LANGUAGES, setLanguage, t, tn, translatePage, type Language } from './i18n';
import { createMarkdown } from './markdown';
import {
  applyFullWidth,
  applySidebar,
  applyTheme,
  applyZoom,
  clampZoom,
  loadSettings,
  resolveLanguage,
  saveSettings,
  ZOOM_STEP,
  type Settings,
  type Theme,
} from './settings';
import { FileTree, stripExtension } from './tree';
import { ask, confirmAsk, h, popover, toast } from './ui';
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
const inlineTitle = el('inline-title');
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
let lastStatus: EditorStatus | null = null;
const assets = new Map<string, string>();

/* ------------------------------------------------------------------ *
 * Editor
 * ------------------------------------------------------------------ */

const editor = new Editor(doc, scroller, md, {
  onChange: () => {
    dirty = true;
    revision += 1;
    renderState();
    renderTitle();
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
  onStatus: (status) => {
    lastStatus = status;
    renderCount();
  },
});

const tree = new FileTree(el('tree'), el('note-count'), {
  onOpen: (path) => void (isNote(path) ? openNote(path) : openImage(path)),
  onCreateFile: (dir) => void createNote(dir),
  onCreateDir: (dir) => void createFolder(dir),
  onRename: (entry) => void renameEntry(entry),
  onDelete: (entry) => void deleteEntry(entry),
  onReveal: (path) => {
    void navigator.clipboard?.writeText(path).catch(() => undefined);
    toast(t('toast', 'Path copied: {path}', { path }));
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
  renderTitle();

  const notes = tree.notes();
  if (notes.length === 0) {
    toast(next.writable ? t('toast', 'No .md files in this folder — create the first note') : t('toast', 'No .md files in this folder'), 'error');
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
      if (!writable) toast(t('toast', 'Read-only access: saving will offer to download the file'), 'error');
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
  showGateError(new Error(t('gate', 'Drag a folder, not a single file')));
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
    renderDocumentTitle();
    placeholder.hidden = true;
    renderState();
    renderTitle();
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
  toast(t('toast', 'Not found: {target}', { target }), 'error');
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
    toast(t('toast', 'Note "{target}" not found', { target }), 'error');
    return;
  }
  const create = await confirmAsk(t('dialog', 'Note not found'), t('dialog', 'Create "{name}"?', { name: `${target}.md` }), t('dialog', 'Create'));
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
      textContent: t('doc', 'no such file: {path}', { path }),
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
  if (!url) return void toast(t('toast', 'Could not read {path}', { path }), 'error');

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
  renderDocumentTitle();
  renderState();
  renderTitle();
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
    toast(t('toast', 'Could not save: {reason}', { reason: error instanceof Error ? error.message : String(error) }), 'error');
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
  if (!vault?.writable) return void toast(t('errors', 'The folder is open read-only'), 'error');
  const name = await ask(t('dialog', 'New note'), t('dialog', 'File name'), `${t('dialog', 'Untitled')}.md`);
  if (!name) return;
  try {
    const path = await vault.createFile(dir, withExtension(name));
    // The inline title already names the note; a heading is only needed without it.
    await vault.writeText(path, settings.inlineTitle ? '' : `# ${stripExtension(baseOf(path))}\n\n`);
    await refreshTree();
    await openNote(path);
    editor.setMode('edit');
    syncModeButtons();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), 'error');
  }
}

async function createFolder(dir: string): Promise<void> {
  if (!vault?.writable) return void toast(t('errors', 'The folder is open read-only'), 'error');
  const name = await ask(t('dialog', 'New folder'), t('dialog', 'Folder name'), '');
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
  const name = await ask(t('dialog', 'Rename'), t('dialog', 'New name'), entry.name);
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
        toast(t('toast', 'The note was renamed, its images were not: {reason}', { reason: error instanceof Error ? error.message : String(error) }), 'error');
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
      renderTitle();
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
  const values = { name: entry.name };
  const question =
    entry.kind === 'dir'
      ? t('dialog', 'Delete the folder "{name}"? This cannot be undone.', values)
      : isNote(entry.name)
        ? t('dialog', 'Delete the note "{name}"? This cannot be undone.', values)
        : t('dialog', 'Delete the file "{name}"? This cannot be undone.', values);
  const ok = await confirmAsk(t('dialog', 'Delete'), question);
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
      renderDocumentTitle();
    }
    await refreshTree();
    renderState();
    renderTitle();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error), 'error');
  }
}

el('new-note').addEventListener('click', () => void createNote(dirOf(currentPath ?? '')));
el('new-folder').addEventListener('click', () => void createFolder(dirOf(currentPath ?? '')));

el('expand-all').addEventListener('click', () => {
  tree.expandAll();
  persist();
});
el('collapse-all').addEventListener('click', () => {
  tree.collapseAll();
  persist();
});

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
// The ones that don't fit move to the » menu (see fitFormat), so both hosts
// handle clicks the same way.
const format = el('format');
const formatMore = el('format-more');
const formatMenu = el('format-menu');
for (const host of [format, formatMenu]) {
  host.addEventListener('mousedown', (event) => event.preventDefault());
  host.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (host === formatMenu) closeFormatMenu();
    if (editor.getMode() !== 'edit') setMode('edit');
    const heading = button.dataset['heading'];
    if (heading !== undefined) {
      editor.heading(Number(heading));
      return;
    }
    const action = button.dataset['action'];
    if (action) editor.format(action as FormatAction);
  });
}

const COLORS = [
  { key: 'red', value: '#d7263d' },
  { key: 'orange', value: '#d97706' },
  { key: 'green', value: '#15803d' },
  { key: 'blue', value: '#1d4ed8' },
  { key: 'violet', value: '#7c3aed' },
  { key: 'grey', value: '#6b7280' },
] as const;

function colorName(key: (typeof COLORS)[number]['key']): string {
  return {
    red: t('palette', 'Red'),
    orange: t('palette', 'Orange'),
    green: t('palette', 'Green'),
    blue: t('palette', 'Blue'),
    violet: t('palette', 'Violet'),
    grey: t('palette', 'Grey'),
  }[key];
}

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
  palette.append(swatchRow(t('palette', 'Text colour'), (color) => `color:${color}`));
  palette.append(swatchRow(t('palette', 'Background'), (color) => `background:${color}33`));
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'palette-clear';
  clear.textContent = t('palette', 'Clear formatting');
  clear.addEventListener('mousedown', (event) => event.preventDefault());
  clear.addEventListener('click', () => {
    editor.colorize('');
    palette.hidden = true;
  });
  palette.append(clear);

  // Opened from the » menu, which closes on this click: hang it off the » instead.
  const box = (formatMenu.contains(colorButton) ? formatMore : colorButton).getBoundingClientRect();
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
    swatch.title = colorName(color.key);
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

/** Every format button and separator, in toolbar order. */
const formatItems = Array.from(format.children);

/** Moves the format buttons that don't fit the toolbar, from the end, into the » menu. */
function fitFormat(): void {
  closeFormatMenu();
  format.append(...formatItems);
  formatMore.hidden = true;
  if (format.scrollWidth <= format.clientWidth) return;
  formatMore.hidden = false;
  while (format.lastElementChild && format.scrollWidth > format.clientWidth) {
    formatMenu.prepend(format.lastElementChild);
  }
}

function closeFormatMenu(): void {
  formatMenu.hidden = true;
  formatMore.setAttribute('aria-expanded', 'false');
}

// The toolbar only resizes with the window and the file panel; the format
// group itself would also resize when » appears and loop the observer.
new ResizeObserver(fitFormat).observe(el('toolbar'));

formatMore.addEventListener('mousedown', (event) => event.preventDefault());
formatMore.addEventListener('click', () => {
  if (!formatMenu.hidden) {
    closeFormatMenu();
    return;
  }
  palette.hidden = true;
  const box = formatMore.getBoundingClientRect();
  formatMenu.hidden = false;
  formatMore.setAttribute('aria-expanded', 'true');
  formatMenu.style.left = `${Math.max(8, box.right - formatMenu.offsetWidth)}px`;
  formatMenu.style.top = `${box.bottom + 6}px`;
});

document.addEventListener('mousedown', (event) => {
  if (formatMenu.hidden) return;
  const target = event.target as Node;
  if (!formatMenu.contains(target) && !formatMore.contains(target)) closeFormatMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !formatMenu.hidden) closeFormatMenu();
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
 * Settings: language, theme, zoom, text width, note title
 * ------------------------------------------------------------------ */

const settingsButton = el('settings');
let closeSettings: (() => void) | null = null;

function selectBox<T extends string>(value: T, choices: [T, string][], onChange: (value: T) => void): HTMLSelectElement {
  const node = h('select', { class: 'settings-select' });
  for (const [choice, label] of choices) {
    const option = h('option', { value: choice, text: label });
    option.selected = choice === value;
    node.append(option);
  }
  node.addEventListener('change', () => {
    const picked = choices.find(([choice]) => choice === node.value);
    if (picked) onChange(picked[0]);
  });
  return node;
}

function iconButton(text: string, title: string, onClick: () => void): HTMLButtonElement {
  const button = h('button', { class: 'icon-button', type: 'button', title, 'aria-label': title, text });
  button.addEventListener('click', onClick);
  return button;
}

function openSettings(): void {
  const row = (label: string, control: HTMLElement): HTMLElement =>
    h('label', { class: 'settings-row' }, h('span', { text: label }), control);

  const languages: [Settings['language'], string][] = [
    ['auto', `🌐 ${t('settings', 'System')}`],
    ...(Object.entries(LANGUAGES) as [Language, string][]).map(
      ([code, name]): [Language, string] => [code, `${FLAGS[code]} ${name}`],
    ),
  ];
  const language = selectBox(settings.language, languages, setLanguageChoice);

  const themes: Theme[] = ['system', 'light', 'dark'];
  const theme = selectBox(settings.theme, themes.map((choice): [Theme, string] => [choice, themeLabel(choice)]), setTheme);

  const width = selectBox(
    settings.fullWidth ? 'full' : 'column',
    [
      ['column', t('settings', 'Centred column')],
      ['full', t('settings', 'Full width')],
    ],
    (choice) => {
      settings.fullWidth = choice === 'full';
      applyFullWidth(settings.fullWidth);
      persist();
    },
  );

  const zoomValue = h('button', { class: 'zoom-value', type: 'button', title: t('settings', 'Reset zoom (⌘0)'), text: `${settings.zoom}%` });
  zoomValue.addEventListener('click', () => setZoom(100));
  // A div, not a label: a click on the label's text would press its first button.
  const zoom = h(
    'div',
    { class: 'settings-row' },
    h('span', { text: t('settings', 'Zoom') }),
    h(
      'div',
      { class: 'zoom', role: 'group', 'aria-label': t('settings', 'Zoom') },
      iconButton('−', t('settings', 'Zoom out (⌘−)'), () => setZoom(settings.zoom - ZOOM_STEP)),
      zoomValue,
      iconButton('+', t('settings', 'Zoom in (⌘+)'), () => setZoom(settings.zoom + ZOOM_STEP)),
    ),
  );

  const title = h('input', { type: 'checkbox', id: 'setting-inline-title' });
  title.checked = settings.inlineTitle;
  title.addEventListener('change', () => {
    settings.inlineTitle = title.checked;
    renderTitle();
    persist();
  });

  const panel = h(
    'div',
    { class: 'settings' },
    h('h3', { class: 'settings-title', text: t('settings', 'Settings') }),
    row(t('settings', 'Language'), language),
    row(t('settings', 'Theme'), theme),
    zoom,
    row(t('settings', 'Text width'), width),
    h('label', { class: 'settings-row settings-row--check' }, title, h('span', { text: t('settings', 'Show the note name as a title') })),
  );
  settingsButton.setAttribute('aria-expanded', 'true');
  closeSettings = popover(settingsButton, panel, () => {
    closeSettings = null;
    settingsButton.setAttribute('aria-expanded', 'false');
  });
}

settingsButton.addEventListener('click', () => (closeSettings ? closeSettings() : openSettings()));

function themeLabel(theme: Theme): string {
  return { system: t('settings', 'System'), light: t('settings', 'Light'), dark: t('settings', 'Dark') }[theme];
}

/** Shows the interface in another language: the markup is translated again and the views redrawn. */
function setLanguageChoice(choice: Settings['language']): void {
  settings.language = choice;
  persist();
  applyLanguage();
  tree.render();
  renderState();
  renderCount();
  renderDocumentTitle();
  // The panel itself is built from translated text: rebuilt, with the focus back on the language.
  openSettings();
  document.querySelector<HTMLSelectElement>('.popover .settings-select')?.focus();
}

function applyLanguage(): void {
  setLanguage(resolveLanguage(settings.language));
  translatePage();
  translateTableTools(doc);
  const note = el('browser-note');
  note.hidden = Boolean(window.showDirectoryPicker);
  note.textContent = note.hidden
    ? ''
    : t('gate', 'This browser cannot write files to disk: the folder will open read-only, and saving will offer to download the modified file. Full editing works in Chrome, Edge and Arc.');
}

function setTheme(theme: Theme): void {
  settings.theme = theme;
  applyTheme(theme);
  persist();
}

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (settings.theme === 'system') applyTheme('system');
});

function setZoom(zoom: number): void {
  settings.zoom = clampZoom(zoom);
  applyZoom(settings.zoom);
  const value = document.querySelector('.popover .zoom-value');
  if (value) value.textContent = `${settings.zoom}%`;
  persist();
}

/* ------------------------------------------------------------------ *
 * Inline title
 * ------------------------------------------------------------------ */

/** Enough of the note to get past any front matter to its first line of text. */
const TITLE_HEAD = 8192;

/** Compares titles the way a reader would: no emphasis marks, case or spacing. */
function titleKey(text: string): string {
  return text.replace(/\[\[|\]\]|[*_`~=]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** The text of an H1 the note opens with (after front matter and blank lines), if it does. */
function leadingHeading(head: string): string | null {
  const lines = head.split('\n');
  let at = 0;
  if ((lines[0] ?? '').trim() === '---') {
    const close = lines.findIndex((line, index) => index > 0 && (line.trim() === '---' || line.trim() === '...'));
    if (close < 0) return null;
    at = close + 1;
  }
  while (at < lines.length && lines[at]!.trim() === '') at += 1;
  const line = lines[at] ?? '';
  const atx = /^ {0,3}#[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
  if (atx) return atx[1]!;
  if (line.trim() && /^ {0,3}=+[ \t]*$/.test(lines[at + 1] ?? '')) return line;
  return null;
}

/** Shows the file name above the note, unless it is switched off or the note already opens with it. */
function renderTitle(): void {
  if (!currentPath || !settings.inlineTitle) {
    inlineTitle.hidden = true;
    return;
  }
  const name = stripExtension(baseOf(currentPath));
  const heading = leadingHeading(editor.getHead(TITLE_HEAD));
  inlineTitle.textContent = name;
  inlineTitle.hidden = heading !== null && titleKey(heading) === titleKey(name);
}

function renderDocumentTitle(): void {
  const name = currentPath ? stripExtension(baseOf(currentPath)) : viewedPath ? baseOf(viewedPath) : null;
  document.title = name ? `${name} — ${t('app', 'Notes editor')}` : t('app', 'Notes editor');
}

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
  // Right to left, the panel sits on the right and grows leftwards.
  const move = (moveEvent: PointerEvent): void =>
    setSidebar(isRightToLeft() ? window.innerWidth - moveEvent.clientX : moveEvent.clientX, false);
  const stop = (): void => {
    resizer.removeEventListener('pointermove', move);
    resizer.removeEventListener('pointerup', stop);
  };
  resizer.addEventListener('pointermove', move);
  resizer.addEventListener('pointerup', stop);
});
resizer.addEventListener('keydown', (event) => {
  const wider = isRightToLeft() ? 'ArrowLeft' : 'ArrowRight';
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    setSidebar(settings.sidebar + (event.key === wider ? 16 : -16), settings.sidebarHidden);
  }
});

/* ------------------------------------------------------------------ *
 * Status bar
 * ------------------------------------------------------------------ */

function renderState(): void {
  statusPath.textContent = currentPath ?? viewedPath ?? '—';
  if (!vault) statusState.textContent = '';
  else if (!vault.writable) statusState.textContent = t('status', 'read-only');
  else statusState.textContent = dirty ? t('status', 'unsaved') : t('status', 'saved');
  statusState.classList.toggle('status-state--dirty', dirty && Boolean(vault?.writable));
}

function renderCount(): void {
  statusCount.textContent =
    currentPath && lastStatus
      ? `${tn('status', '{count} word', '{count} words', lastStatus.words)} · ${tn('status', '{count} character', '{count} characters', lastStatus.chars)}`
      : '';
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

applyLanguage();
renderDocumentTitle();
applyTheme(settings.theme);
applyZoom(settings.zoom);
applyFullWidth(settings.fullWidth);
applySidebar(settings.sidebar, settings.sidebarHidden);
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
