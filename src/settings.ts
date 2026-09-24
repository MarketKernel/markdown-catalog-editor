/** Theme, zoom and panel state, remembered in localStorage between sessions. */

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  theme: Theme;
  /** Percent; the document area scales, the chrome does not. */
  zoom: number;
  /** The text fills the whole pane instead of a centred column. */
  fullWidth: boolean;
  /** The file name shown as a title above the note, as Obsidian's inline title. */
  inlineTitle: boolean;
  sidebar: number;
  sidebarHidden: boolean;
  mode: 'read' | 'edit';
  lastPath: string | null;
  collapsed: string[];
  /** `assets` folders the user opened; they are collapsed otherwise. */
  expanded: string[];
}

const KEY = 'markdown-catalog-editor';

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 10;

const DEFAULTS: Settings = {
  theme: 'system',
  zoom: 100,
  fullWidth: false,
  inlineTitle: true,
  sidebar: 260,
  sidebarHidden: false,
  mode: 'read',
  lastPath: null,
  collapsed: [],
  expanded: [],
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const stored = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULTS,
      ...stored,
      zoom: clampZoom(Number(stored.zoom ?? DEFAULTS.zoom)),
      sidebar: Math.min(560, Math.max(160, Number(stored.sidebar ?? DEFAULTS.sidebar))),
      collapsed: Array.isArray(stored.collapsed) ? stored.collapsed : [],
      expanded: Array.isArray(stored.expanded) ? stored.expanded : [],
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode or a full quota — the editor works either way */
  }
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULTS.zoom;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom / 5) * 5));
}

export function applyTheme(theme: Theme): void {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
  document.documentElement.dataset['themeMode'] = theme;
}

export function applyZoom(zoom: number): void {
  document.documentElement.style.setProperty('--zoom', String(zoom / 100));
}

export function applyFullWidth(full: boolean): void {
  document.body.classList.toggle('doc-full', full);
}

export function applySidebar(width: number, hidden: boolean): void {
  document.documentElement.style.setProperty('--sidebar', `${width}px`);
  document.body.classList.toggle('sidebar-hidden', hidden);
}
