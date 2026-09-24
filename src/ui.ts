/** Small dialogs, a context menu and toasts — enough to avoid native prompts. */

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
      <button type="button" class="button button--ghost" data-cancel>Cancel</button>
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

export function ask(title: string, label: string, value = ''): Promise<string | null> {
  return dialog({ title, label, value, confirm: 'Done' });
}

export async function confirmAsk(title: string, message: string, confirm = 'Delete'): Promise<boolean> {
  return (await dialog({ title, message, confirm, danger: true })) !== null;
}

export interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
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
