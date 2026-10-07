/**
 * The dialog for what the extension sent (clip.ts): a new note — its folder
 * and name — or the end of the note that is open, and the Markdown itself,
 * to look over and change before it is saved.
 */

import type { Clip } from './clip';
import { t } from './i18n';
import { h, openModal } from './ui';

export interface ClipChoice {
  /** To the end of the open note; false → a new note. */
  append: boolean;
  folder: string;
  name: string;
  markdown: string;
}

export interface ClipDialogOptions {
  clip: Clip;
  folder: string;
  name: string;
  /** The open note's name, which the clip can go to the end of; null → only a new note. */
  note: string | null;
  append: boolean;
}

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
}

function whatWasSent(clip: Clip): string {
  const site = siteOf(clip.url);
  switch (clip.kind) {
    case 'page':
      return t('clip', 'The page "{title}" from {site}', { title: clip.title, site });
    case 'selection':
      return t('clip', 'The selection on "{title}" from {site}', { title: clip.title, site });
    case 'link':
      return t('clip', 'A link from {site}', { site });
    case 'image':
      return t('clip', 'An image from {site}', { site });
  }
}

export function clipDialog(options: ClipDialogOptions): Promise<ClipChoice | null> {
  const radio = (checked: boolean, disabled = false): HTMLInputElement => {
    const input = h('input', { type: 'radio', name: 'clip-target' });
    input.checked = checked;
    input.disabled = disabled;
    return input;
  };
  const toNew = radio(!options.append || !options.note);
  const toEnd = radio(options.append && Boolean(options.note), !options.note);

  const folder = h('input', { class: 'dialog-input clip-folder', type: 'text', spellcheck: 'false', autocomplete: 'off', placeholder: '/' });
  folder.value = options.folder;
  const name = h('input', { class: 'dialog-input clip-name', type: 'text', spellcheck: 'false', autocomplete: 'off' });
  name.value = options.name;
  const where = h(
    'div',
    { class: 'clip-where' },
    h('label', { class: 'dialog-label' }, t('clip', 'Folder'), folder),
    h('label', { class: 'dialog-label' }, t('clip', 'Name'), name),
  );

  const markdown = h('textarea', { class: 'export-template clip-markdown', spellcheck: 'false', rows: '10', 'aria-label': t('clip', 'Markdown') });
  markdown.value = options.clip.markdown;

  const render = (): void => {
    where.hidden = toEnd.checked;
  };
  render();
  toNew.addEventListener('change', render);
  toEnd.addEventListener('change', render);

  const submit = h('button', { class: 'button button--primary', type: 'submit', text: t('clip', 'Save') });
  const cancel = h('button', { class: 'button button--ghost', type: 'button', text: t('dialog', 'Cancel') });
  const box = h(
    'form',
    { class: 'dialog dialog--wide clip-dialog' },
    h('h2', { text: t('clip', 'Send to Markdown') }),
    h('p', { class: 'dialog-text clip-source', text: whatWasSent(options.clip) }),
    h(
      'div',
      { class: 'clip-targets', role: 'radiogroup' },
      h('label', { class: 'settings-row settings-row--check' }, toNew, h('span', { text: t('clip', 'A new note') })),
      h(
        'label',
        { class: 'settings-row settings-row--check' },
        toEnd,
        h('span', { text: options.note ? t('clip', 'The end of "{note}"', { note: options.note }) : t('clip', 'The end of the open note') }),
      ),
    ),
    where,
    markdown,
    h('div', { class: 'dialog-row' }, cancel, submit),
  );

  return new Promise((resolve) => {
    let result: ClipChoice | null = null;
    const close = openModal(box, undefined, () => resolve(result));
    cancel.addEventListener('click', close);
    box.addEventListener('submit', (event) => {
      event.preventDefault();
      result = { append: toEnd.checked, folder: folder.value, name: name.value, markdown: markdown.value };
      close();
    });
    markdown.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        box.requestSubmit();
      }
    });
    if (toEnd.checked) submit.focus();
    else {
      name.focus();
      const dot = name.value.lastIndexOf('.');
      name.setSelectionRange(0, dot > 0 ? dot : name.value.length);
    }
  });
}
