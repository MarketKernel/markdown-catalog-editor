/**
 * The toolbar button's popup: the quick way in. It shows what is selected on
 * the tab — or, with nothing selected, the page's text — as Markdown, and
 * adds it to the knowledge base: to the default note with one click on "Send
 * to Markdown", or to any other note picked from the list, where a star makes
 * a note the default. With nothing selected, the page can also become a note
 * of its own, through the side panel's dialog.
 *
 * The knowledge base is the folder the side panel opened last. The popup
 * reads and writes it itself while the browser still lets the extension in —
 * the panel has it open, or it was allowed on every visit. Otherwise "Open in
 * full mode" opens the side panel, where a click on the folder lets the
 * browser ask, and what was selected goes on to the default note from there.
 * Choosing a folder is the panel's: a picker would close the popup anyway.
 *
 * The panel of this window, when it has the knowledge base open, does the
 * writing itself: it may hold the note with unsaved changes (messages.ts).
 */

import { appendClip, type Clip } from '../clip';
import { setLanguage, t } from '../i18n';
import { isGranted, recentFolders, type RecentFolder } from '../recent';
import { applyTheme, loadSettings, resolveLanguage, saveSettings } from '../settings';
import { h, toast } from '../ui';
import { baseOf, dirOf, DirectoryVault, isNote, type TreeEntry } from '../vault';
import { clipOf } from './extension';
import type { AppendReply, AppendRequest, ChangedNotice, Sent } from './messages';
import { putForPanel, takeTab } from './take';

const NAME = 'Markdown Knowledge Base';

const settings = loadSettings();
setLanguage(resolveLanguage(settings.language));
applyTheme(settings.theme);

let windowId = -1;
let sent: Sent | null = null;
let clip: Clip | null = null;
let base: RecentFolder | null = null;
let vault: DirectoryVault | null = null;
let notes: string[] = [];
let query = '';
let busy = false;

const root = document.getElementById('popup') as HTMLElement;

function icon(paths: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = paths;
  return svg;
}
const FOLDER = '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
const PANEL = '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>';
const STAR = '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>';

/** Every note of the folder, as paths, in the tree's order. */
function notePaths(entries: TreeEntry[]): string[] {
  return entries.flatMap((entry) => (entry.kind === 'dir' ? notePaths(entry.children ?? []) : isNote(entry.name) ? [entry.path] : []));
}

async function start(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  windowId = (await chrome.windows.getCurrent()).id ?? tab?.windowId ?? -1;
  // The click on the button gave the extension this tab (activeTab): what is selected on it, read now.
  sent = tab ? await takeTab(tab, false) : null;
  clip = sent ? clipOf(sent) : null;
  base = (await recentFolders())[0] ?? null;
  if (base && (await isGranted(base.handle))) {
    try {
      vault = new DirectoryVault(base.handle, true);
      notes = notePaths(await vault.scan());
    } catch {
      // Moved or deleted: the panel says what happened when the folder is picked there.
      vault = null;
    }
  }
  render();
}

function render(): void {
  const head = h('header', { class: 'popup-head' }, icon(FOLDER), h('span', { class: 'popup-base', text: base?.name ?? NAME }));
  const foot = h('footer', { class: 'popup-foot' });
  const full = h('button', { type: 'button', class: 'button button--small popup-full' }, icon(PANEL), t('popup', 'Full mode'));
  full.addEventListener('click', () => openFullMode(null));
  foot.append(full);
  root.replaceChildren(head, preview(), h('div', { class: 'popup-body' }, ...body()), foot);
}

/** What will be sent, as Markdown, and where it comes from. */
function preview(): HTMLElement {
  if (!clip) return h('section', { class: 'popup-preview' }, h('p', { class: 'popup-what', text: t('popup', 'Nothing on this tab can be sent.') }));
  const what =
    clip.kind === 'selection'
      ? t('popup', 'The selection on {site}', { site: siteOf(clip.url) })
      : clip.kind === 'page'
        ? t('popup', 'Nothing is selected: the whole page "{title}"', { title: clip.title })
        : t('popup', 'A link to "{title}"', { title: clip.title });
  return h('section', { class: 'popup-preview' }, h('p', { class: 'popup-what', text: what }), h('pre', { class: 'popup-markdown', text: clip.markdown }));
}

function body(): HTMLElement[] {
  if (!base) {
    return [empty(t('popup', 'There is no knowledge base yet: open a folder of notes in full mode.'), t('popup', 'Open in full mode'), null)];
  }
  if (!vault) {
    return [
      empty(
        clip
          ? t('popup', '"{name}" is closed. Open it in full mode, and what is selected goes to {note}.', { name: base.name, note: settings.defaultNote })
          : t('popup', '"{name}" is closed. Open it in full mode.', { name: base.name }),
        t('popup', 'Open in full mode'),
        clip ? 'default' : null,
      ),
    ];
  }
  const send = h('button', { type: 'button', class: 'button button--primary popup-send', text: t('popup', 'Send to Markdown') });
  send.disabled = !clip;
  send.addEventListener('click', () => void add(settings.defaultNote));
  const target = h('p', { class: 'popup-target' }, t('popup', 'To the end of {note}', { note: settings.defaultNote }));
  if (!notes.includes(settings.defaultNote)) target.append(' ', h('span', { class: 'popup-new', text: t('popup', '(a new note)') }));
  const actions = h('div', { class: 'popup-actions' }, send);
  if (clip?.kind === 'page') {
    const asNote = h('button', { type: 'button', class: 'button popup-as-note', text: t('popup', 'As a new note') });
    asNote.addEventListener('click', () => openFullMode('dialog'));
    actions.append(asNote);
  }

  const filter = h('input', { class: 'popup-filter', type: 'search', placeholder: t('popup', 'Add to another note'), 'aria-label': t('popup', 'Add to another note'), autocomplete: 'off', spellcheck: 'false' });
  filter.value = query;
  const list = h('ul', { class: 'popup-notes' });
  const fill = (): void => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    // The default note first: it is the one most often picked again.
    const ordered = [...notes].sort((a, b) => Number(b === settings.defaultNote) - Number(a === settings.defaultNote));
    const shown = ordered.filter((path) => words.every((word) => path.toLowerCase().includes(word))).slice(0, 200);
    list.replaceChildren(...shown.map(noteRow));
    if (!shown.length) list.append(h('li', { class: 'popup-none', text: t('popup', 'No notes match') }));
  };
  filter.addEventListener('input', () => {
    query = filter.value;
    fill();
  });
  fill();
  return [actions, target, filter, list];
}

function noteRow(path: string): HTMLElement {
  const isDefault = path === settings.defaultNote;
  const pick = h(
    'button',
    { type: 'button', class: 'popup-note', title: t('popup', 'Add to {note}', { note: path }) },
    h('span', { class: 'popup-note-name', text: baseOf(path).replace(/\.(md|markdown|mdown|mkd|txt)$/i, '') }),
    h('span', { class: 'popup-note-dir', text: dirOf(path) }),
  );
  pick.disabled = !clip;
  pick.addEventListener('click', () => void add(path));
  const label = isDefault ? t('popup', 'The default note') : t('popup', 'Make it the default note');
  const star = h('button', { type: 'button', class: `icon-button popup-star${isDefault ? ' popup-star--on' : ''}`, title: label, 'aria-label': label, 'aria-pressed': String(isDefault) }, icon(STAR));
  star.addEventListener('click', () => {
    settings.defaultNote = path;
    // The panel keeps its own copy of the settings: it hears of this through the storage event.
    saveSettings({ ...loadSettings(), defaultNote: path });
    render();
  });
  return h('li', { class: `popup-row${isDefault ? ' popup-row--default' : ''}` }, pick, star);
}

function empty(text: string, button: string, send: 'default' | null): HTMLElement {
  const open = h('button', { type: 'button', class: 'button button--primary', text: button });
  open.addEventListener('click', () => openFullMode(send));
  return h('div', { class: 'popup-empty' }, h('p', { text }), open);
}

/** Adds what was selected to the note: through the panel of this window when it has the knowledge base, else here. */
async function add(path: string): Promise<void> {
  if (!clip || !base || !vault || busy) return;
  busy = true;
  root.classList.add('popup--busy');
  try {
    const request: AppendRequest = { to: 'panel', type: 'append', windowId, folder: base.id, path, clip };
    const reply = (await chrome.runtime.sendMessage(request).catch(() => null)) as AppendReply | null;
    if (reply?.error) throw new Error(reply.error);
    if (!reply?.done) {
      const text = notes.includes(path) ? await vault.readText(path) : '';
      await vault.writeText(path, appendClip(text, clip));
      const changed: ChangedNotice = { to: 'panel', type: 'changed', folder: base.id, path };
      void chrome.runtime.sendMessage(changed).catch(() => undefined);
    }
    done(path);
  } catch (error) {
    busy = false;
    root.classList.remove('popup--busy');
    toast(t('toast', 'Could not save: {reason}', { reason: error instanceof Error ? error.message : String(error) }), 'error');
  }
}

function done(path: string): void {
  root.replaceChildren(h('div', { class: 'popup-done' }, h('p', { text: t('clip', 'Added to the end of {name}', { name: baseOf(path) }) })));
  window.setTimeout(() => window.close(), 900);
}

/**
 * The side panel, opened in the click itself, as Chrome wants. `default`:
 * what is selected goes to the default note once the knowledge base is open
 * there; `dialog`: the panel asks where it goes; null: only the panel.
 */
function openFullMode(then: 'default' | 'dialog' | null): void {
  const opening = chrome.sidePanel.open({ windowId }).catch(() => undefined);
  const handOver = sent && then ? putForPanel({ ...sent, windowId, ...(then === 'default' ? { to: 'default' as const } : {}) }) : Promise.resolve();
  void Promise.all([opening, handOver]).finally(() => window.close());
}

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
}

void start();
