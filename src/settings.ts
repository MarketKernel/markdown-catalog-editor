/** Language, theme, zoom, images and clippings folders, updates and panel state, remembered in localStorage between sessions. */

import { cleanClipFolder, cleanNotePath, DEFAULT_CLIP_FOLDER, DEFAULT_NOTE } from './clip';
import { detectLanguage, isLanguage, type Language } from './i18n';
import { cleanImageFolder, DEFAULT_IMAGES, type ImageSettings } from './vault';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  /** 'auto' follows the browser's languages. */
  language: Language | 'auto';
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
  /** The tag section at the bottom of the file panel is unfolded. */
  tagsOpen: boolean;
  /** Parent tags folded in the tag tree. */
  collapsedTags: string[];
  /** The tag section's height cap in pixels, set by dragging; null → as tall as the panel allows. */
  tagsHeight: number | null;
  /** The HTML export's page template as the user changed it; null → the built-in one. */
  exportTemplate: string | null;
  /** The HTML export takes the tags along. */
  exportTags: boolean;
  /** The HTML export makes a site, a page per note; false → one page with every note. */
  exportSite: boolean;
  /** Where images added to a note are saved. */
  images: ImageSettings;
  /** Where the extension's pages become notes, from the root of the folder; '' → the root itself. */
  clipFolder: string;
  /** The knowledge base's default note, where "Send to Markdown" adds what is selected. */
  defaultNote: string;
  /** The installed app lets a new version in by itself while nothing is unsaved and it is out of sight. */
  autoUpdate: boolean;
}

export const SETTINGS_KEY = 'markdown-catalog-editor';

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 200;
export const ZOOM_STEP = 10;

const DEFAULTS: Settings = {
  language: 'auto',
  theme: 'system',
  zoom: 100,
  fullWidth: true,
  inlineTitle: true,
  sidebar: 260,
  sidebarHidden: false,
  mode: 'read',
  lastPath: null,
  collapsed: [],
  expanded: [],
  tagsOpen: true,
  collapsedTags: [],
  tagsHeight: null,
  exportTemplate: null,
  exportTags: true,
  exportSite: true,
  images: DEFAULT_IMAGES,
  clipFolder: DEFAULT_CLIP_FOLDER,
  defaultNote: DEFAULT_NOTE,
  autoUpdate: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    const stored = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULTS,
      ...stored,
      language: isLanguage(stored.language) ? stored.language : 'auto',
      zoom: clampZoom(Number(stored.zoom ?? DEFAULTS.zoom)),
      sidebar: Math.min(560, Math.max(160, Number(stored.sidebar ?? DEFAULTS.sidebar))),
      collapsed: Array.isArray(stored.collapsed) ? stored.collapsed : [],
      expanded: Array.isArray(stored.expanded) ? stored.expanded : [],
      collapsedTags: Array.isArray(stored.collapsedTags) ? stored.collapsedTags : [],
      tagsHeight: Number.isFinite(stored.tagsHeight) ? Number(stored.tagsHeight) : null,
      exportTemplate: typeof stored.exportTemplate === 'string' && stored.exportTemplate.trim() ? stored.exportTemplate : null,
      images: {
        folder: cleanImageFolder(String(stored.images?.folder ?? '')),
        perNote: stored.images?.perNote !== false,
      },
      clipFolder: typeof stored.clipFolder === 'string' ? cleanClipFolder(stored.clipFolder) : DEFAULT_CLIP_FOLDER,
      defaultNote: typeof stored.defaultNote === 'string' ? cleanNotePath(stored.defaultNote) : DEFAULT_NOTE,
      autoUpdate: stored.autoUpdate === true,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* private mode or a full quota — the editor works either way */
  }
}

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULTS.zoom;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom / 5) * 5));
}

/** The language the interface is shown in. */
export function resolveLanguage(choice: Settings['language']): Language {
  return choice === 'auto' ? detectLanguage() : choice;
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
