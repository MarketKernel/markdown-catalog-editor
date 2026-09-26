/**
 * site.js — the exported site's one script. It only adds comfort; every page
 * reads and links the same without it:
 *
 * - a search field above the navigation: note names and text, the results in
 *   place of the tree while something is typed. On a site the text comes from
 *   search.js, loaded the first time it is needed; the single page already
 *   holds every note, so its sections are read instead;
 * - a light/dark button beside the site's name, over the system's choice;
 * - on the single page, the note on show marked in the table of contents,
 *   its folders opened, as the address's #anchor moves;
 * - the expand-all and collapse-all buttons above the navigation (the field and
 *   the buttons are hidden until the script shows them);
 * - a handle on the navigation's edge that makes the column wider or narrower
 *   (a double click gives the default width back);
 * - all of it remembered from page to page in localStorage, per site. The
 *   folders of the page being shown always open.
 *
 * `siteScript` is written out as its own source, so it must stay
 * self-contained: nothing from outside the function but browser globals.
 */

export function siteScript(): void {
  const MIN = 160;
  const MAX = 560;
  const STEP = 16;
  const script = document.currentScript as HTMLScriptElement | null;
  // The script sits at the site's root, so its folder tells one exported site from another;
  // written into a single page, the page's own folder does.
  const base = new URL('.', script?.src || location.href).href;
  const key = (name: string): string => `macaed-site:${base}:${name}`;
  const load = (name: string): string | null => {
    try {
      return localStorage.getItem(key(name));
    } catch {
      return null;
    }
  };
  const store = (name: string, value: string | null): void => {
    try {
      if (value === null) localStorage.removeItem(key(name));
      else localStorage.setItem(key(name), value);
    } catch {
      /* private mode or blocked storage: nothing is remembered, nothing breaks */
    }
  };

  const root = document.documentElement;
  const setWidth = (width: number | null): void => {
    if (width === null) root.style.removeProperty('--sidebar');
    else root.style.setProperty('--sidebar', `${Math.min(MAX, Math.max(MIN, Math.round(width)))}px`);
  };
  // Run from <head>, before the page is drawn: the column never jumps to its width.
  const saved = Number(load('sidebar'));
  if (saved > 0) setWidth(saved);
  const theme = load('theme');
  if (theme === 'light' || theme === 'dark') root.dataset['theme'] = theme;
  root.classList.add('js');

  /* ---------------------------------------------------------------- *
   * Theme
   * ---------------------------------------------------------------- */

  const dark = (): boolean => (root.dataset['theme'] ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  const themes = (): void => {
    for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]'))) {
      button.hidden = false;
      const label = (dark() ? button.dataset['lightLabel'] : button.dataset['darkLabel']) ?? '';
      button.title = label;
      button.setAttribute('aria-label', label);
      if (button.dataset['ready']) continue;
      button.dataset['ready'] = '1';
      button.addEventListener('click', () => {
        const next = dark() ? 'light' : 'dark';
        root.dataset['theme'] = next;
        store('theme', next);
        themes();
      });
    }
  };

  const start = (): void => {
    themes();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themes);
    const nav = document.querySelector<HTMLElement>('.nav');
    if (!nav) return;
    const folders = Array.from(nav.querySelectorAll<HTMLDetailsElement>('details[data-dir]'));
    const parts = document.querySelector<HTMLElement>('.note-parts');
    if (parts) showing(parts, nav);
    let closed: unknown = [];
    try {
      closed = JSON.parse(load('closed') ?? '[]');
    } catch {
      closed = [];
    }
    const shut = new Set<unknown>(Array.isArray(closed) ? closed : []);
    const current = nav.querySelector('[aria-current]');
    for (const folder of folders) {
      folder.open = !shut.has(folder.dataset['dir']) || (current !== null && folder.contains(current));
    }
    const save = (): void => {
      store('closed', JSON.stringify(folders.filter((folder) => !folder.open).map((folder) => folder.dataset['dir'])));
    };
    for (const folder of folders) folder.addEventListener('toggle', save);
    for (const button of Array.from(nav.querySelectorAll<HTMLButtonElement>('[data-tree]'))) {
      if (button.parentElement) button.parentElement.hidden = false;
      button.addEventListener('click', () => {
        const open = button.dataset['tree'] === 'expand';
        for (const folder of folders) folder.open = open;
        save();
      });
    }
    current?.scrollIntoView({ block: 'nearest' });

    const column = nav.closest('aside') ?? nav;
    const field = nav.querySelector<HTMLInputElement>('.nav-search input');
    if (field) search(field, column);

    const width = (): number => column.getBoundingClientRect().width;
    const commit = (): void => store('sidebar', String(Math.round(width())));
    const handle = document.createElement('div');
    handle.className = 'resizer';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', nav.dataset['resizeLabel'] ?? '');
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      handle.setPointerCapture(event.pointerId);
      handle.classList.add('resizer--active');
      // Where on the handle it was caught: the edge moves with the pointer, never jumps to it.
      const box = column.getBoundingClientRect();
      const grab = box.right - event.clientX;
      const move = (moveEvent: PointerEvent): void => setWidth(moveEvent.clientX + grab - box.left);
      const stop = (): void => {
        handle.classList.remove('resizer--active');
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', stop);
        commit();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', stop);
    });
    handle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      setWidth(width() + (event.key === 'ArrowRight' ? STEP : -STEP));
      commit();
    });
    handle.addEventListener('dblclick', () => {
      setWidth(null);
      store('sidebar', null);
    });
    document.body.append(handle);
  };

  /* ---------------------------------------------------------------- *
   * The single page's parts
   * ---------------------------------------------------------------- */

  /** Marks the note on show — the one the #anchor points at or into — in the table of contents. */
  const showing = (parts: HTMLElement, nav: HTMLElement): void => {
    const mark = (): void => {
      let target: HTMLElement | null = null;
      try {
        target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
      } catch {
        target = null;
      }
      const section = target?.closest<HTMLElement>('.note-parts > section[id]') ?? parts.querySelector<HTMLElement>('.note-section--home');
      const aside = nav.closest('aside') ?? nav;
      for (const link of Array.from(aside.querySelectorAll('a[aria-current]'))) link.removeAttribute('aria-current');
      const links = section ? Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')).filter((link) => link.getAttribute('href') === `#${section.id}`) : [];
      // A tag's heading in the tags section: its own link in the tag tree.
      const tag = target ? Array.from(aside.querySelectorAll<HTMLAnchorElement>('.tag-nav a')).filter((link) => link.getAttribute('href') === `#${target!.id}`) : [];
      for (const link of [...links, ...tag]) {
        link.setAttribute('aria-current', 'page');
        for (let folder = link.closest('details'); folder; folder = folder.parentElement?.closest('details') ?? null) folder.open = true;
        link.scrollIntoView({ block: 'nearest' });
      }
    };
    mark();
    window.addEventListener('hashchange', mark);
  };

  /* ---------------------------------------------------------------- *
   * Search
   * ---------------------------------------------------------------- */

  interface Entry {
    t: string;
    d: string;
    h: string;
    x: string;
  }
  interface Indexed extends Entry {
    title: string;
    text: string;
  }
  const LIMIT = 50;
  const BEFORE = 40;
  const AFTER = 110;

  let index: Promise<Indexed[]> | null = null;
  const indexed = (entries: readonly Entry[]): Indexed[] =>
    entries.map((entry) => ({ ...entry, title: entry.t.toLowerCase(), text: entry.x.toLowerCase() }));
  /**
   * The single page's notes are its sections: name and folder on each, the
   * text inside. A site's come from search.js, loaded as a script — a page
   * opened from a file may not fetch its neighbours.
   */
  const loadIndex = (): Promise<Indexed[]> => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('section[id][data-title]'));
    if (sections.length) {
      index ??= Promise.resolve(indexed(sections.map((section) => {
        // The note's own words: not its title, its tags or the way to its neighbours,
        // and a space between blocks, which textContent would run together.
        const skip = section.querySelectorAll('.note-title, .page-tags, .part-nav');
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
        const words: string[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!Array.from(skip).some((part) => part.contains(node))) words.push(node.textContent ?? '');
        }
        const text = words.join(' ').replace(/\s+/g, ' ').trim();
        return { t: section.dataset['title'] ?? '', d: section.dataset['dir'] ?? '', h: `#${section.id}`, x: text };
      })));
      return index;
    }
    index ??= new Promise((resolve) => {
      const done = (): void => resolve(indexed((window as unknown as Record<string, Entry[] | undefined>)['macaedSearch'] ?? []));
      const tag = document.createElement('script');
      tag.src = `${base}search.js`;
      tag.onload = done;
      tag.onerror = done;
      document.head.append(tag);
    });
    return index;
  };

  /** `text` with every word of the query marked. */
  const marked = (text: string, words: readonly string[]): DocumentFragment => {
    const out = document.createDocumentFragment();
    const lower = text.toLowerCase();
    let at = 0;
    while (at < text.length) {
      let hit = -1;
      let size = 0;
      for (const word of words) {
        const found = lower.indexOf(word, at);
        if (found >= 0 && (hit < 0 || found < hit || (found === hit && word.length > size))) {
          hit = found;
          size = word.length;
        }
      }
      if (hit < 0) break;
      out.append(text.slice(at, hit));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(hit, hit + size);
      out.append(mark);
      at = hit + size;
    }
    out.append(text.slice(at));
    return out;
  };

  /** The part of the text around the first word found in it. */
  const snippet = (entry: Indexed, words: readonly string[]): string => {
    const hits = words.map((word) => entry.text.indexOf(word)).filter((hit) => hit >= 0);
    if (hits.length === 0) return entry.x.slice(0, BEFORE + AFTER);
    const hit = Math.min(...hits);
    const from = Math.max(0, entry.x.lastIndexOf(' ', Math.max(0, hit - BEFORE)) + 1);
    const to = Math.min(entry.x.length, hit + AFTER);
    return `${from > 0 ? '…' : ''}${entry.x.slice(from, to).trim()}${to < entry.x.length ? '…' : ''}`;
  };

  const search = (field: HTMLInputElement, column: Element): void => {
    const box = field.parentElement!;
    box.hidden = false;
    const results = document.createElement('ul');
    results.className = 'search-results';
    results.hidden = true;
    box.after(results);
    let timer = 0;
    let asked = 0;

    const show = async (): Promise<void> => {
      const query = field.value.trim();
      const ticket = ++asked;
      const words = Array.from(new Set(query.toLowerCase().split(/\s+/).filter(Boolean)));
      if (words.length === 0) {
        column.classList.remove('searching');
        results.hidden = true;
        results.replaceChildren();
        return;
      }
      const entries = await loadIndex();
      // A later keystroke has asked again meanwhile: its answer wins.
      if (ticket !== asked) return;
      const found = entries
        .map((entry) => {
          const all = `${entry.title} ${entry.d.toLowerCase()} ${entry.text}`;
          if (!words.every((word) => all.includes(word))) return null;
          // Names first: all the words in the name, then some of them, then the text alone.
          const inTitle = words.filter((word) => entry.title.includes(word)).length;
          return { entry, score: inTitle === words.length ? 2 : inTitle ? 1 : 0 };
        })
        .filter((hit): hit is { entry: Indexed; score: number } => hit !== null)
        .sort((a, b) => b.score - a.score);

      results.replaceChildren();
      if (found.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'search-empty';
        empty.textContent = field.dataset['empty'] ?? '';
        results.append(empty);
      }
      for (const { entry } of found.slice(0, LIMIT)) {
        const link = document.createElement('a');
        link.className = 'search-result';
        link.href = entry.h.startsWith('#') ? entry.h : `${base}${entry.h}`;
        const title = document.createElement('span');
        title.className = 'search-title';
        title.append(marked(entry.t, words));
        link.append(title);
        if (entry.d) {
          const dir = document.createElement('span');
          dir.className = 'search-dir';
          dir.textContent = entry.d;
          link.append(dir);
        }
        const text = document.createElement('span');
        text.className = 'search-snippet';
        text.append(marked(snippet(entry, words), words));
        link.append(text);
        const item = document.createElement('li');
        item.append(link);
        results.append(item);
      }
      column.classList.add('searching');
      results.hidden = false;
    };

    const links = (): HTMLAnchorElement[] => Array.from(results.querySelectorAll('a'));
    field.addEventListener('focus', () => void loadIndex(), { once: true });
    field.addEventListener('input', () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void show(), 80);
    });
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        field.value = '';
        void show();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        window.clearTimeout(timer);
        void show().then(() => links()[0]?.click());
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        links()[0]?.focus();
      }
    });
    // ↑ and ↓ walk the results; ↑ past the first goes back to the field.
    results.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const all = links();
      const at = all.indexOf(document.activeElement as HTMLAnchorElement);
      if (at < 0) return;
      event.preventDefault();
      const next = at + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) field.focus();
      else all[Math.min(next, all.length - 1)]?.focus();
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}

/** The script as the site gets it. */
export const SITE_SCRIPT = `(${siteScript.toString()})();\n`;
