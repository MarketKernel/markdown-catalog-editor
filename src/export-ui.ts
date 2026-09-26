/**
 * The export dialog: where the site goes, whether the tags go along, and the
 * page template — the default one, or the user's own, checked for the
 * placeholders a page cannot do without. While the export runs the dialog
 * shows how far it got and cannot be dismissed; Stop ends it early. The site
 * itself is built in export.ts.
 */

import { DEFAULT_TEMPLATE, missingPlaceholders, placeholder, PLACEHOLDERS, REQUIRED, type Placeholder } from './export';
import { t } from './i18n';
import { h, openModal } from './ui';
import { OUTPUT_DIR } from './vault';

export interface ExportChoice {
  /** The folder inside `output/` the site is written to. */
  folder: string;
  template: string;
  includeTags: boolean;
  /** A page per note; false → one page with every note. Both come with search. */
  site: boolean;
}

export interface ExportDialogOptions {
  /** What is being exported, for the reader: "Everything in Notes". */
  scope: string;
  /** False → the tags box is off and disabled: there is nothing to export. */
  hasTags: boolean;
  template: string;
  includeTags: boolean;
  site: boolean;
}

export interface ExportRun {
  /** The step under way and how far into it: "Writing the pages", 40 of 200. */
  report(step: string, done: number, total: number): void;
  /** Aborted once Stop is pressed; the run finishes the files it has started and returns. */
  signal: AbortSignal;
}

/** `2025-12-31_23-33-33`: local time, sortable, safe as a folder name. */
export function stamp(now = new Date()): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
  const time = `${two(now.getHours())}-${two(now.getMinutes())}-${two(now.getSeconds())}`;
  return `${date}_${time}`;
}

/** A folder name that stays inside `output/`: no empty name, no `..`, no slashes at the ends. */
function cleanFolder(raw: string): string | null {
  const parts = raw.trim().split(/[\\/]+/).filter(Boolean);
  if (parts.length === 0 || parts.some((part) => part === '.' || part === '..')) return null;
  return parts.join('/');
}

/**
 * Opens the dialog; `run` does the export once the choice is made. The dialog
 * stays until it ends: closed when it succeeds or is stopped, open with the
 * reason when it throws.
 */
export function exportDialog(options: ExportDialogOptions, run: (choice: ExportChoice, progress: ExportRun) => Promise<void>): void {
  const folder = h('input', { class: 'dialog-input export-folder', type: 'text', spellcheck: 'false', autocomplete: 'off' });
  folder.value = stamp();

  const site = h('input', { type: 'checkbox' });
  site.checked = options.site;
  const siteHint = h('span', { class: 'export-check-hint' });
  const renderSite = (): void => {
    siteHint.textContent = site.checked
      ? t('export', 'A page per note, with search and a navigation that remembers its folders.')
      : t('export', 'One file with every note, shown one at a time from a table of contents, with search; the images in assets.');
  };
  renderSite();
  site.addEventListener('change', renderSite);

  const tags = h('input', { type: 'checkbox' });
  tags.checked = options.hasTags && options.includeTags;
  tags.disabled = !options.hasTags;

  const template = h('textarea', { class: 'export-template', spellcheck: 'false', rows: '12' });
  template.value = options.template;

  const reset = h('button', { class: 'button button--ghost button--small', type: 'button', text: t('export', 'Reset to default') });
  reset.addEventListener('click', () => {
    template.value = DEFAULT_TEMPLATE;
    showError('');
  });

  const required = h('p', { class: 'dialog-hint' });
  const list = (names: readonly Placeholder[]): string => names.map(placeholder).join(', ');
  const renderHint = (): void => {
    const needed = tags.checked ? [...REQUIRED, 'tags' as const] : REQUIRED;
    required.textContent = `${t('export', 'Required placeholders: {list}.', { list: list(needed) })} ${t('export', 'Also available: {list}.', {
      list: list(PLACEHOLDERS.filter((name) => !needed.includes(name))),
    })}`;
  };
  renderHint();
  tags.addEventListener('change', renderHint);

  const error = h('p', { class: 'dialog-error', 'aria-live': 'polite' });
  const showError = (message: string): void => {
    error.textContent = message;
  };

  const step = h('span', { class: 'export-progress-step' });
  const count = h('span', { class: 'export-progress-count' });
  const bar = h('progress', { max: '1', value: '0' });
  const progress = h('div', { class: 'export-progress', role: 'status' }, h('div', { class: 'export-progress-text' }, step, count), bar);
  progress.hidden = true;

  const submit = h('button', { class: 'button button--primary', type: 'submit', text: t('export', 'Export') });
  const cancel = h('button', { class: 'button button--ghost', type: 'button', text: t('dialog', 'Cancel') });

  const box = h(
    'form',
    { class: 'dialog dialog--wide' },
    h('h2', { text: t('export', 'Export to HTML') }),
    h('p', { class: 'dialog-text', text: options.scope }),
    h(
      'label',
      { class: 'dialog-label' },
      t('export', 'Folder'),
      h('span', { class: 'export-folder-row' }, h('span', { class: 'export-folder-prefix', text: `${OUTPUT_DIR}/` }), folder),
    ),
    h(
      'label',
      { class: 'settings-row settings-row--check export-check' },
      site,
      h('span', {}, h('span', { text: t('export', 'Create a static site') }), siteHint),
    ),
    h(
      'label',
      { class: 'settings-row settings-row--check export-check' },
      tags,
      h('span', { text: options.hasTags ? t('export', 'Export tags: a page per tag and an index of tags') : t('export', 'There are no tags to export') }),
    ),
    h('div', { class: 'export-template-head' }, h('span', { class: 'dialog-label', text: t('export', 'Template') }), reset),
    template,
    required,
    h('p', { class: 'dialog-hint', text: t('export', 'The text width and the note name above each note follow the editor settings.') }),
    progress,
    error,
    h('div', { class: 'dialog-row' }, cancel, submit),
  );

  let controller: AbortController | null = null;
  const close = openModal(box, () => controller !== null);

  /** While the export runs nothing in the dialog can change, and Cancel becomes Stop. */
  const busy = (on: boolean): void => {
    for (const control of [folder, template, reset, submit, site]) control.disabled = on;
    tags.disabled = on || !options.hasTags;
    submit.textContent = on ? t('export', 'Exporting…') : t('export', 'Export');
    cancel.textContent = on ? t('export', 'Stop') : t('dialog', 'Cancel');
    cancel.disabled = false;
    progress.hidden = !on;
  };

  cancel.addEventListener('click', () => {
    if (!controller) return close();
    controller.abort();
    cancel.disabled = true;
    cancel.textContent = t('export', 'Stopping…');
  });
  folder.focus();
  folder.select();

  box.addEventListener('submit', (event) => {
    event.preventDefault();
    if (controller) return;
    const name = cleanFolder(folder.value);
    if (name === null) return showError(t('export', 'Give the folder a name'));
    const missing = missingPlaceholders(template.value, tags.checked);
    if (missing.length) return showError(t('export', 'The template must contain {list}', { list: list(missing) }));
    showError('');
    const running = new AbortController();
    controller = running;
    busy(true);
    step.textContent = '';
    count.textContent = '';
    bar.value = 0;
    const report = (label: string, done: number, total: number): void => {
      step.textContent = label;
      count.textContent = `${done} / ${total}`;
      bar.value = total ? done / total : 0;
    };
    void run({ folder: name, template: template.value, includeTags: tags.checked, site: site.checked }, { report, signal: running.signal })
      .then(() => {
        controller = null;
        close();
      })
      .catch((reason: unknown) => {
        controller = null;
        busy(false);
        showError(reason instanceof Error ? reason.message : String(reason));
      });
  });
}
