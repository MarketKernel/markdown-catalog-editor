/** Small dialogs, a context menu, popovers and toasts — enough to avoid native prompts. */

import { t } from './i18n';

let overlay: HTMLDivElement | null = null;

function shell(): HTMLDivElement {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.hidden = true;
    document.body.append(overlay);
  }
  return overlay;
}

interface DialogOptions {
  title: string;
  label?: string;
  value?: string;
  confirm: string;
  danger?: boolean;
  message?: string;
}

function dialog(options: DialogOptions): Promise<string | null> {
  const host = shell();
  host.hidden = false;
  host.innerHTML = '';

  const box = document.createElement('form');
  box.className = 'dialog';
  box.innerHTML = `
    <h2>${escape(options.title)}</h2>
    ${options.message ? `<p class="dialog-text">${escape(options.message)}</p>` : ''}
    ${options.label ? `<label class="dialog-label">${escape(options.label)}<input class="dialog-input" type="text"></label>` : ''}
    <div class="dialog-row">
      <button type="button" class="button button--ghost" data-cancel>${escape(t('dialog', 'Cancel'))}</button>
      <button type="submit" class="button ${options.danger ? 'button--danger' : 'button--primary'}">${escape(options.confirm)}</button>
    </div>`;
  host.append(box);

  const input = box.querySelector<HTMLInputElement>('.dialog-input');
  if (input) {
    input.value = options.value ?? '';
    input.focus();
    const dot = input.value.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
  } else {
    box.querySelector<HTMLButtonElement>('[type=submit]')?.focus();
  }

  return new Promise((resolve) => {
    const close = (result: string | null): void => {
      host.hidden = true;
      host.innerHTML = '';
      document.removeEventListener('keydown', onKey, true);
      resolve(result);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close(null);
      }
    };
    document.addEventListener('keydown', onKey, true);
    box.addEventListener('submit', (event) => {
      event.preventDefault();
      close(input ? input.value.trim() : '');
    });
    box.querySelector('[data-cancel]')?.addEventListener('click', () => close(null));
    host.addEventListener('mousedown', (event) => {
      if (event.target === host) close(null);
    });
  });
}

/**
 * Shows `box` over the page until Escape, a click outside it or the returned
 * function closes it. While `locked` says so, Escape and the outside click do
 * nothing — for a dialog busy with work it must see through.
 */
export function openModal(box: HTMLElement, locked: () => boolean = () => false): () => void {
  const host = shell();
  host.hidden = false;
  host.replaceChildren(box);
  let open = true;
  const close = (): void => {
    if (!open) return;
    open = false;
    host.hidden = true;
    host.replaceChildren();
    document.removeEventListener('keydown', onKey, true);
    host.removeEventListener('mousedown', onDown);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    if (!locked()) close();
  };
  const onDown = (event: MouseEvent): void => {
    if (event.target === host && !locked()) close();
  };
  document.addEventListener('keydown', onKey, true);
  host.addEventListener('mousedown', onDown);
  return close;
}

export function ask(title: string, label: string, value = ''): Promise<string | null> {
  return dialog({ title, label, value, confirm: t('dialog', 'Done') });
}

export async function confirmAsk(title: string, message: string, confirm = t('dialog', 'Delete')): Promise<boolean> {
  return (await dialog({ title, message, confirm, danger: true })) !== null;
}

export interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
  /** Shown but greyed out, as an action that cannot run right now. */
  disabled?: boolean;
}

export function menu(x: number, y: number, items: MenuItem[]): void {
  document.querySelector('.context-menu')?.remove();
  const list = document.createElement('div');
  list.className = 'context-menu';
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = item.danger ? 'context-item context-item--danger' : 'context-item';
    button.textContent = item.label;
    button.disabled = Boolean(item.disabled);
    button.addEventListener('click', () => {
      list.remove();
      item.action();
    });
    list.append(button);
  }
  document.body.append(list);
  const width = list.offsetWidth;
  const height = list.offsetHeight;
  list.style.left = `${Math.min(x, window.innerWidth - width - 8)}px`;
  list.style.top = `${Math.min(y, window.innerHeight - height - 8)}px`;

  const dismiss = (event: Event): void => {
    if (event.target instanceof Node && list.contains(event.target)) return;
    list.remove();
    document.removeEventListener('mousedown', dismiss, true);
    document.removeEventListener('keydown', onKey, true);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') dismiss(event);
  };
  window.setTimeout(() => {
    document.addEventListener('mousedown', dismiss, true);
    document.addEventListener('keydown', onKey, true);
  });
}

/** `h('div', { class: 'row' }, child, 'text')` — an element with its attributes and children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Record<string, string>> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) node.append(child);
  return node;
}

/**
 * A panel pinned under `anchor` that closes on an outside click or Escape.
 * Returns the function that closes it.
 */
export function popover(anchor: HTMLElement, content: HTMLElement, onClose?: () => void): () => void {
  document.querySelector('.popover')?.dispatchEvent(new Event('dismiss'));
  const panel = h('div', { class: 'popover' }, content);
  document.body.append(panel);
  const place = (): void => {
    const box = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = Math.max(8, Math.min(box.right - width, window.innerWidth - width - 8));
    const below = box.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, box.top - height - 6) : below;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  };
  place();

  const onDown = (event: Event): void => {
    if (event.target instanceof Node && (panel.contains(event.target) || anchor.contains(event.target))) return;
    dismiss();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      dismiss();
    }
  };
  let open = true;
  function dismiss(): void {
    if (!open) return;
    open = false;
    panel.remove();
    document.removeEventListener('mousedown', onDown, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
    onClose?.();
  }
  panel.addEventListener('dismiss', dismiss);
  window.addEventListener('resize', place);
  window.setTimeout(() => {
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
  });
  return dismiss;
}

let toastTimer = 0;

export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
  let box = document.querySelector<HTMLDivElement>('.toast');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toast';
    document.body.append(box);
  }
  box.textContent = message;
  box.classList.toggle('toast--error', kind === 'error');
  box.classList.add('toast--shown');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => box?.classList.remove('toast--shown'), kind === 'error' ? 6000 : 2600);
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (char) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[char]};`);
}
