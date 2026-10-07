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
 * the panel has it open, or it was allowed on every visit. Chrome takes the
 * access back once the last panel closes: then the popup lists the notes as
 * the panel last saw them, and what is sent waits in the extension's storage
 * until a panel opens the folder again (messages.ts). Or "Open" asks the
 * browser for the folder right here. Choosing another folder is the panel's:
 * a picker would close the popup anyway.
 *
 * A panel that has the knowledge base open — this window's first — does the
 * writing itself: it may hold the note with unsaved changes (knowledge.ts).
 */

import type { Clip } from '../clip';
import { setLanguage, t } from '../i18n';
import { isGranted, recentFolders, type RecentFolder } from '../recent';
import { applyTheme, loadSettings, resolveLanguage, saveSettings } from '../settings';
import { h, toast } from '../ui';
import { baseOf, dirOf, DirectoryVault, ensureWritable, isNote, type TreeEntry } from '../vault';
import { clipOf, writeClip } from './knowledge';
import { DEFAULT_NOTE_KEY, NOTES_KEY, queuedKey, type KnownNotes, type Queued, type Sent } from './messages';
import { putForPanel, takeTab } from './take';
import { htmlToMarkdown } from './to-markdown';

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
  clip = sent ? await clipOf(sent, htmlToMarkdown) : null;
  void chrome.storage.local.set({ [DEFAULT_NOTE_KEY]: settings.defaultNote }).catch(() => undefined);
  base = (await recentFolders())[0] ?? null;
  if (base && (await isGranted(base.handle))) await scan();
  if (base && !vault) {
    const known = (await chrome.storage.local.get(NOTES_KEY))[NOTES_KEY] as KnownNotes | undefined;
    if (known?.folder === base.id) notes = known.paths;
  }
  render();
}

/** The knowledge base, read now that the browser lets the extension in. */
async function scan(): Promise<void> {
  if (!base) return;
  try {
    const opened = new DirectoryVault(base.handle, true);
    notes = notePaths(await opened.scan());
    vault = opened;
  } catch {
    // Moved or deleted: the panel says what happened when the folder is picked there.
    vault = null;
  }
}

/** "Open": the browser asks for the folder over the popup; turned down, it stays closed. */
async function open(): Promise<void> {
  if (!base || busy) return;
  if (await ensureWritable(base.handle)) await scan();
  if (vault) render();
  else toast(t('popup', 'The browser did not open the folder here. Open it in full mode.'), 'error');
}

function render(): void {
  const head = h('header', { class: 'popup-head' }, icon(FOLDER), h('span', { class: 'popup-base', text: base?.name ?? NAME }));
  const foot = h('footer', { class: 'popup-foot' });
  const full = h('button', { type: 'button', class: 'button button--small popup-full' }, icon(PANEL), t('popup', 'Full mode'));
  full.addEventListener('click', () => openFullMode(false));
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
    return [empty(t('popup', 'There is no knowledge base yet: open a folder of notes in full mode.'), t('popup', 'Open in full mode'))];
  }
  const send = h('button', { type: 'button', class: 'button button--primary popup-send', text: t('popup', 'Send to Markdown') });
  send.disabled = !clip;
  send.addEventListener('click', () => void add(settings.defaultNote));
  const target = h('p', { class: 'popup-target' }, t('popup', 'To the end of {note}', { note: settings.defaultNote }));
  if (!notes.includes(settings.defaultNote)) target.append(' ', h('span', { class: 'popup-new', text: t('popup', '(a new note)') }));
  const actions = h('div', { class: 'popup-actions' }, send);
  if (clip?.kind === 'page') {
    const asNote = h('button', { type: 'button', class: 'button popup-as-note', text: t('popup', 'As a new note') });
    asNote.addEventListener('click', () => openFullMode(true));
    actions.append(asNote);
  }
  const shown: HTMLElement[] = [actions, target];
  if (!vault) {
    const reopen = h('button', { type: 'button', class: 'button button--small', text: t('popup', 'Open') });
    reopen.addEventListener('click', () => void open());
    shown.unshift(
      h(
        'div',
        { class: 'popup-closed' },
        h('p', { text: t('popup', '"{name}" is closed: what you send is added once it opens.', { name: base.name }) }),
        h('p', { class: 'popup-hint', text: t('popup', 'When Chrome asks, choose "Allow on every visit", and it stays open.') }),
        reopen,
      ),
    );
    // Never opened in a panel since the notes were kept: the default note is all there is to offer.
    if (!notes.length) return shown;
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
  return [...shown, filter, list];
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
    void chrome.storage.local.set({ [DEFAULT_NOTE_KEY]: path }).catch(() => undefined);
    render();
  });
  return h('li', { class: `popup-row${isDefault ? ' popup-row--default' : ''}` }, pick, star);
}

function empty(text: string, button: string): HTMLElement {
  const open = h('button', { type: 'button', class: 'button button--primary', text: button });
  open.addEventListener('click', () => openFullMode(false));
  return h('div', { class: 'popup-empty' }, h('p', { text }), open);
}

/**
 * Adds what was selected to the note: through the panel of this window when
 * it has the knowledge base, else here; with the knowledge base closed, it
 * waits for a panel to open it.
 */
async function add(path: string): Promise<void> {
  if (!clip || !base || busy) return;
  busy = true;
  root.classList.add('popup--busy');
  try {
    if (!vault) {
      const queued: Queued = { folder: base.id, path, clip };
      await chrome.storage.local.set({ [queuedKey()]: queued });
      done(t('popup', 'It goes to the end of {name} once "{base}" opens', { name: baseOf(path), base: base.name }));
      return;
    }
    await writeClip(vault, base.id, path, clip, htmlToMarkdown, windowId);
    done(t('clip', 'Added to the end of {name}', { name: baseOf(path) }));
  } catch (error) {
    busy = false;
    root.classList.remove('popup--busy');
    toast(t('toast', 'Could not save: {reason}', { reason: error instanceof Error ? error.message : String(error) }), 'error');
  }
}

function done(text: string): void {
  root.replaceChildren(h('div', { class: 'popup-done' }, h('p', { text })));
  window.setTimeout(() => window.close(), 900);
}

/** The side panel, opened in the click itself, as Chrome wants; `withPage`: the panel asks where the page goes. */
function openFullMode(withPage: boolean): void {
  const opening = chrome.sidePanel.open({ windowId }).catch(() => undefined);
  const handOver = sent && withPage ? putForPanel({ ...sent, windowId }) : Promise.resolve();
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
