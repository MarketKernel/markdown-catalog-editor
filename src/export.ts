/**
 * A folder of notes as HTML, in one of two shapes:
 *
 * - a static site: one page per note, a page per tag and an index of tags, a
 *   stylesheet, a small script and a search index. The pages carry all their
 *   text and plain relative links — folders are `<details>`, nothing is loaded
 *   to show a page — so the site works from a file:// URL, from any web server
 *   and for a crawler. The script (export-script.ts) only adds comfort: search,
 *   expand/collapse all, a resizable navigation column;
 * - a single page: every note one after another under a table of contents,
 *   the tags as a section of their own, every link an anchor on the page. It
 *   shows one note at a time — the one the address's `#anchor` points into,
 *   by CSS `:target`, so no script is needed — with links to the previous
 *   and the next. One file: the stylesheet and the script are inside it, and
 *   the search reads the page itself. Only the images sit beside it, gathered
 *   in `assets/`.
 *
 * Either is cut from a template with `{{placeholders}}`; the default one is
 * export-template.html, and the user may bring their own as long as it keeps
 * the placeholders that carry the page (see REQUIRED).
 *
 * Pure: no DOM here, so the whole thing runs in a test as well as in the page.
 * Images and other files are copied by the caller, to `assetPath()`.
 */

import type { MarkdownIt, Token } from 'markdown-it';
import { frontMatterEnd, leadingHeading, titleKey } from './blocks';
import { SITE_SCRIPT } from './export-script';
import DEFAULT_TEMPLATE from './export-template.html';
import STYLES from './export.css';
import { language, t, tn } from './i18n';
import { EXTERNAL, plainText, slugify, type ExportLinks } from './markdown';
import { Meta, type TagNode } from './meta';
import { ASSETS_DIR, assetsDirOf, baseOf, dirOf, isNote, join, resolvePath, sortEntries, stripExtension, type TreeEntry } from './vault';

export { DEFAULT_TEMPLATE };

/** Everything a template may ask for, in the order the dialog lists them. */
export const PLACEHOLDERS = [
  'title', 'site', 'lang', 'width', 'description', 'root', 'styles', 'script', 'theme', 'path', 'navigation', 'tags', 'heading', 'pagetags', 'content',
] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/** Without these a page has no way in, no name and no text. */
export const REQUIRED: readonly Placeholder[] = ['navigation', 'heading', 'content'];

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;

export function placeholder(name: Placeholder): string {
  return `{{${name}}}`;
}

/** The placeholders a site needs that `template` lacks; `{{tags}}` counts once tags go along. */
export function missingPlaceholders(template: string, includeTags: boolean): Placeholder[] {
  const needed: Placeholder[] = includeTags ? [...REQUIRED, 'tags'] : [...REQUIRED];
  const present = new Set(Array.from(template.matchAll(PLACEHOLDER), (match) => match[1]));
  return needed.filter((name) => !present.has(name));
}

/** Fills the placeholders in; one the site does not know stays as it is. */
function fill(template: string, values: Record<Placeholder, string>): string {
  return template.replace(PLACEHOLDER, (match, name: string) => (Object.hasOwn(values, name) ? values[name as Placeholder] : match));
}

/* ------------------------------------------------------------------ *
 * Input and output
 * ------------------------------------------------------------------ */

export interface SiteNote {
  /** Relative to the folder being exported, as the tree shows it. */
  path: string;
  text: string;
  tags: readonly string[];
}

export interface SiteOptions {
  md: MarkdownIt;
  /** The site's name: the folder's. */
  name: string;
  notes: readonly SiteNote[];
  template: string;
  /** Tags on the pages, a page per tag and an index of tags. */
  includeTags: boolean;
  /** The note's name as a heading above it, unless the note opens with that heading itself. */
  titles: boolean;
  /** The text fills the page instead of a centred column, as the editor's "Full width". */
  fullWidth: boolean;
  /** One page with every note on it instead of a page per note. */
  singlePage: boolean;
  /** The images and other files that go along, as paths like the notes'. */
  assets?: readonly string[];
  /** The `lang` of the pages; the interface language by default. */
  lang?: string;
}

export interface SiteFile {
  path: string;
  data: string;
}

/** One entry of the search index, short keys to keep the file small. */
export interface SearchEntry {
  /** The note's name. */
  t: string;
  /** Its folder, '' at the root. */
  d: string;
  /** Its page, from the site's root. */
  h: string;
  /** Its text, plain. */
  x: string;
}

export const STYLE_FILE = 'style.css';
export const SCRIPT_FILE = 'site.js';
/** The search index, loaded by site.js the first time something is searched for. */
export const SEARCH_FILE = 'search.js';
/** The global search.js sets, and site.js reads. */
export const SEARCH_GLOBAL = 'macaedSearch';
const TAGS_DIR = 'tags';
const INDEX = 'index.html';
/** The id of the tags section on a single page. */
const TAGS_ANCHOR = 'tags';
/** A root note by one of these names is the site's front page. */
const FRONT_PAGES = new Set(['index', 'readme']);
/** As much of the first paragraph as a search result shows. */
const DESCRIPTION_LENGTH = 160;

const EXPAND_ICON = 'm8 9 4-4 4 4M8 15l4 4 4-4';
const COLLAPSE_ICON = 'm8 5 4 4 4-4M8 19l4-4 4 4';
const MOON_ICON = 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z';
const SUN_ICON = 'M12 3v2M12 19v2M5.6 5.6 7 7M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z';
/** A template placeholder by name, spaces inside the braces allowed. */
const slot = (name: Placeholder): RegExp => new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`);

/**
 * Text for inside `<script>`: nothing in it may close the tag or open an HTML
 * comment. (The comment opener is spelled `<!-{2}` here: written out, it would
 * itself upset the editor's own inline script.)
 */
function scriptText(code: string): string {
  return code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!-{2}/g, '<\\!-\\-');
}

/* ------------------------------------------------------------------ *
 * The site
 * ------------------------------------------------------------------ */

/** Every file at once — what the tests use. */
export function buildSite(options: SiteOptions): SiteFile[] {
  return Array.from(new SiteBuilder(options).files()).filter((file): file is SiteFile => file !== null);
}

/**
 * The export step by step: `files()` makes each file only when it is asked
 * for, so a caller can write one while the next is being made, and report how
 * far it got out of `count`. A step with nothing to write yet — a note put on
 * the single page — comes as null.
 */
export class SiteBuilder {
  private readonly md: MarkdownIt;
  private readonly escape: (text: string) => string;
  private readonly lang: string;
  private readonly single: boolean;
  /** The notes in tree order. */
  private readonly notes: SiteNote[];
  private readonly tree: TreeEntry[];
  private readonly hasFolders: boolean;
  /** Note path → page path; on a single page every note is on `index.html`. */
  private readonly pages = new Map<string, string>();
  /** Note path → the id of its section on a single page. */
  private readonly anchors = new Map<string, string>();
  private readonly taken = new Set<string>([STYLE_FILE, SCRIPT_FILE, SEARCH_FILE]);
  private readonly ids = new Set<string>([TAGS_ANCHOR]);
  private readonly meta = Meta.empty();
  private readonly tagTree: TagNode[] = [];
  /** Tag → page path, or the id of its heading on a single page. */
  private readonly tagPages = new Map<string, string>();
  private readonly tagAnchors = new Map<string, string>();
  private tagIndex: string | null = null;
  /** The front page is a note of its own, or a contents page when there is none. */
  private frontNote: string | null = null;
  /** `[[wiki]]` targets, lower-cased: by path, by name and by path without the extension. */
  private readonly byPath = new Map<string, string>();
  private readonly byName = new Map<string, string>();
  private readonly byStem = new Map<string, string>();
  /** The navigation is the same for every page in a folder, bar the current one. */
  private readonly navCache = new Map<string, string>();
  private readonly tagNavCache = new Map<string, string>();
  /** An image's path in the folder → its path in the export. */
  private readonly assetPaths = new Map<string, string>();
  /**
   * The single page carries its stylesheet in `{{styles}}`. A template from
   * before that placeholder still links style.css, so then the file is written.
   */
  private readonly inlineStyles: boolean;

  constructor(private readonly options: SiteOptions) {
    this.md = options.md;
    this.escape = options.md.utils.escapeHtml;
    this.lang = options.lang ?? language();
    this.single = options.singlePage;
    this.inlineStyles = this.single && slot('styles').test(options.template);
    const notes = options.notes.filter((note) => isNote(note.path));
    this.tree = treeOf(notes.map((note) => note.path));
    const byTree = new Map(notesOf(this.tree).map((path, index) => [path, index]));
    this.notes = notes.slice().sort((a, b) => byTree.get(a.path)! - byTree.get(b.path)!);
    this.hasFolders = this.tree.some((entry) => entry.kind === 'dir');
    for (const note of this.notes) {
      const add = (map: Map<string, string>, key: string): void => {
        if (!map.has(key)) map.set(key, note.path);
      };
      add(this.byPath, note.path.toLowerCase());
      add(this.byName, stripExtension(baseOf(note.path)).toLowerCase());
      add(this.byStem, stripExtension(note.path).toLowerCase());
    }
    if (this.single) this.allocateAnchors();
    else this.allocatePages();
    if (options.includeTags) this.allocateTags();
    this.allocateAssets(options.assets ?? []);
  }

  /** Where an image or file of the folder goes in the export; one it does not know stays put. */
  assetPath(path: string): string {
    return this.assetPaths.get(path) ?? path;
  }

  /** How many steps `files()` takes. */
  get count(): number {
    if (this.single) return (this.inlineStyles ? 1 : 2) + this.notes.length;
    const tags = this.tagIndex === null ? 0 : 1 + this.tagPages.size;
    return 3 + (this.frontNote === null ? 1 : 0) + this.notes.length + tags;
  }

  *files(): Generator<SiteFile | null> {
    if (!this.inlineStyles) yield { path: STYLE_FILE, data: STYLES };
    if (this.single) {
      const sections: string[] = [];
      const home = this.homeNote();
      for (const [index, note] of this.notes.entries()) {
        sections.push(this.noteSection(note, note === home, this.notes[index - 1], this.notes[index + 1]));
        yield null;
      }
      yield { path: INDEX, data: this.singlePage(sections) };
      return;
    }
    yield { path: SCRIPT_FILE, data: SITE_SCRIPT };
    yield { path: SEARCH_FILE, data: this.searchIndex() };
    if (this.frontNote === null) yield { path: INDEX, data: this.contentsPage() };
    for (const note of this.notes) yield { path: this.pages.get(note.path)!, data: this.notePage(note) };
    if (this.tagIndex !== null) {
      yield { path: this.tagIndex, data: this.tagIndexPage() };
      for (const [tag, path] of this.tagPages) yield { path, data: this.tagPage(tag) };
    }
  }

  /* ---------------------------------------------------------------- *
   * Where everything goes
   * ---------------------------------------------------------------- */

  private unique(wanted: string): string {
    let path = wanted;
    for (let n = 2; this.taken.has(path.toLowerCase()); n += 1) path = wanted.replace(/\.html$/, `-${n}.html`);
    this.taken.add(path.toLowerCase());
    return path;
  }

  private uniqueId(wanted: string): string {
    const stem = wanted || 'note';
    let id = stem;
    for (let n = 2; this.ids.has(id); n += 1) id = `${stem}-${n}`;
    this.ids.add(id);
    return id;
  }

  private allocatePages(): void {
    const front = this.notes.find((note) => !dirOf(note.path) && FRONT_PAGES.has(stripExtension(note.path).toLowerCase()))?.path;
    this.taken.add(INDEX);
    if (front) {
      this.frontNote = front;
      this.pages.set(front, INDEX);
    }
    for (const { path } of this.notes) {
      if (path === front) continue;
      const stem = join(dirOf(path), `${stripExtension(baseOf(path))}.html`);
      // `note.md` beside `note.txt`: the second keeps its extension in the name.
      this.pages.set(path, this.taken.has(stem.toLowerCase()) ? this.unique(`${path}.html`) : this.unique(stem));
    }
  }

  /** On a single page each note is a section: `docs/Guide.md` → `#docs-guide`. */
  private allocateAnchors(): void {
    for (const { path } of this.notes) {
      this.pages.set(path, INDEX);
      this.anchors.set(path, this.uniqueId(slugify(stripExtension(path).replace(/\//g, ' '))));
    }
  }

  /**
   * On a site an image keeps its path: each page sits where its note did. The
   * single page gathers them under `assets/`, the folders on the way kept but
   * each note's own `assets` step dropped: `docs/assets/Guide/a.png` →
   * `assets/docs/Guide/a.png`.
   */
  private allocateAssets(paths: readonly string[]): void {
    if (!this.single) return;
    const taken = new Set<string>();
    for (const path of paths) {
      const wanted = join(ASSETS_DIR, splitPath(path).filter((part) => part !== ASSETS_DIR).join('/'));
      let target = wanted;
      for (let n = 2; taken.has(target.toLowerCase()); n += 1) {
        const dot = wanted.lastIndexOf('.');
        target = dot > wanted.lastIndexOf('/') ? `${wanted.slice(0, dot)}-${n}${wanted.slice(dot)}` : `${wanted}-${n}`;
      }
      taken.add(target.toLowerCase());
      this.assetPaths.set(path, target);
    }
  }

  private allocateTags(): void {
    for (const note of this.notes) for (const tag of note.tags) this.meta.addTag(note.path, tag);
    this.tagTree.push(...this.meta.tree());
    if (this.tagTree.length === 0) return;
    this.tagIndex = this.single ? INDEX : this.unique(join(TAGS_DIR, INDEX));
    const walk = (nodes: readonly TagNode[]): void => {
      for (const node of nodes) {
        if (this.single) this.tagAnchors.set(node.tag, this.uniqueId(`tag-${slugify(node.tag.replace(/\//g, ' '))}`));
        else this.tagPages.set(node.tag, this.unique(join(TAGS_DIR, `${node.tag.split('/').map(fileName).join('/')}.html`)));
        walk(node.children);
      }
    };
    walk(this.tagTree);
  }

  /** The href from the page `at` to a note. */
  private noteHref(at: string, path: string): string {
    return this.single ? `#${this.anchors.get(path)!}` : relative(at, this.pages.get(path)!);
  }

  private tagHref(at: string, tag: string): string {
    return this.single ? `#${this.tagAnchors.get(tag)!}` : relative(at, this.tagPages.get(tag)!);
  }

  private tagIndexHref(at: string): string {
    return this.single ? `#${TAGS_ANCHOR}` : relative(at, this.tagIndex!);
  }

  /* ---------------------------------------------------------------- *
   * The pages
   * ---------------------------------------------------------------- */

  private page(
    at: string,
    values: Omit<Record<Placeholder, string>, 'site' | 'lang' | 'width' | 'root' | 'styles' | 'script' | 'theme' | 'navigation' | 'tags'>,
  ): string {
    const root = rootOf(at);
    return fill(this.options.template, {
      ...values,
      site: this.escape(this.options.name),
      lang: this.escape(this.lang),
      width: this.options.fullWidth ? 'full' : 'column',
      root,
      styles: this.inlineStyles ? `<style>\n${STYLES}</style>` : `<link rel="stylesheet" href="${root}${STYLE_FILE}">`,
      script: this.single ? `<script>\n${scriptText(SITE_SCRIPT)}</script>` : `<script src="${root}${SCRIPT_FILE}"></script>`,
      theme: this.themeButton(),
      navigation: this.navigation(at),
      tags: this.tagNavigation(at),
    });
  }

  /** Light or dark, whatever the system says: shown by site.js, which remembers the choice. */
  private themeButton(): string {
    const dark = this.escape(t('site', 'Switch to the dark theme'));
    const light = this.escape(t('site', 'Switch to the light theme'));
    return `<button class="theme-toggle" type="button" data-theme-toggle hidden title="${dark}" aria-label="${dark}" ` +
      `data-dark-label="${dark}" data-light-label="${light}">` +
      `<svg class="theme-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="${MOON_ICON}"/></svg>` +
      `<svg class="theme-sun" viewBox="0 0 24 24" aria-hidden="true"><path d="${SUN_ICON}"/></svg></button>`;
  }

  private notePage(note: SiteNote): string {
    const at = this.pages.get(note.path)!;
    const body = bodyOf(note.text);
    const { heading, content } = this.render(note, body, at, {}, 'h1', 'page-title');
    return this.page(at, {
      title: this.escape(stripExtension(baseOf(note.path))),
      description: this.escape(this.description(body)),
      path: this.escape(note.path),
      heading,
      pagetags: this.chips(this.options.includeTags ? this.meta.tagsOf(note.path) : [], at, null),
      content,
    });
  }

  /**
   * A note's HTML and the heading above it. A note that opens with its own
   * name gives that heading up to be the title — its id kept — so the tags
   * come under it and nothing adds a gap above; otherwise the name goes above
   * it when the setting says so.
   */
  private render(
    note: SiteNote,
    body: string,
    at: string,
    extra: Partial<ExportLinks>,
    tag: 'h1' | 'h2',
    className: string,
  ): { heading: string; content: string } {
    const name = stripExtension(baseOf(note.path));
    const env: { export: ExportLinks } = { export: { ...this.links(note, at), ...extra } };
    const content = this.md.render(body, env);
    const leading = leadingHeading(body);
    if (leading !== null && titleKey(leading) === titleKey(name)) {
      const own = new RegExp(`^\\s*<${tag}(\\s[^>]*)?>[\\s\\S]*?</${tag}>\\n?`).exec(content);
      if (own) return { heading: own[0].trim().replace(`<${tag}`, `<${tag} class="${className}"`), content: content.slice(own[0].length) };
      return { heading: '', content };
    }
    return { heading: this.options.titles ? `<${tag} class="${className}">${this.escape(name)}</${tag}>` : '', content };
  }

  /**
   * The note the single page opens on: an index or README at the root, else
   * the first note at the root — the tree lists folders first — else the first.
   */
  private homeNote(): SiteNote | undefined {
    return (
      this.notes.find((note) => !dirOf(note.path) && FRONT_PAGES.has(stripExtension(note.path).toLowerCase())) ??
      this.notes.find((note) => !dirOf(note.path)) ??
      this.notes[0]
    );
  }

  /**
   * A note on the single page: a section of its own, its headings one level
   * down, and links to the notes before and after it — the page shows one at a time.
   */
  private noteSection(note: SiteNote, home: boolean, previous: SiteNote | undefined, next: SiteNote | undefined): string {
    const id = this.anchors.get(note.path)!;
    const { heading, content } = this.render(note, bodyOf(note.text), INDEX, { prefix: `${id}-`, shift: 1 }, 'h2', 'note-title');
    const tags = this.chips(this.options.includeTags ? this.meta.tagsOf(note.path) : [], INDEX, null);
    // The name and folder ride on the section: the search on this page reads them from there.
    const data = ` data-title="${this.escape(stripExtension(baseOf(note.path)))}" data-dir="${this.escape(dirOf(note.path))}"`;
    const step = (other: SiteNote | undefined, rel: 'prev' | 'next'): string => {
      if (!other) return '<span></span>';
      const label = this.escape(rel === 'prev' ? t('site', 'Previous note') : t('site', 'Next note'));
      const name = this.escape(stripExtension(baseOf(other.path)));
      return `<a class="part-${rel}" href="#${this.anchors.get(other.path)!}" rel="${rel}" title="${label}">` +
        `<span class="part-label">${label}</span><span class="part-name">${name}</span></a>`;
    };
    const steps = previous || next ? `<nav class="part-nav">${step(previous, 'prev')}${step(next, 'next')}</nav>` : '';
    return `<section class="note-section${home ? ' note-section--home' : ''}" id="${id}"${data}>${heading}${tags}\n${content}${steps}</section>\n`;
  }

  private singlePage(sections: readonly string[]): string {
    let content = `<div class="note-parts">\n${sections.join('')}`;
    if (this.tagIndex !== null) {
      content += `<section class="note-section tags-section" id="${TAGS_ANCHOR}"><h2 class="note-title">${this.escape(t('sidebar', 'Tags'))}</h2>`;
      const walk = (nodes: readonly TagNode[]): void => {
        for (const node of nodes) {
          content += `<h3 class="tag-heading" id="${this.tagAnchors.get(node.tag)!}">${this.escape(`#${node.tag}`)}</h3>${this.tagNotes(INDEX, node.tag)}`;
          walk(node.children);
        }
      };
      walk(this.tagTree);
      content += '</section>\n';
    }
    content += '</div>\n';
    const first = this.homeNote();
    return this.page(INDEX, {
      title: this.escape(this.options.name),
      description: first ? this.escape(this.description(bodyOf(first.text))) : '',
      path: '',
      heading: `<h1 class="page-title">${this.escape(this.options.name)}</h1>`,
      pagetags: '',
      content,
    });
  }

  /** The front page when no note is called index or README: the notes as a list, and the tags. */
  private contentsPage(): string {
    let content = `<div class="contents">${this.list(this.tree, INDEX, false)}</div>`;
    if (this.tagIndex !== null) {
      content += `<h2 class="contents-heading"><a href="${this.escape(this.tagIndexHref(INDEX))}">${this.escape(t('sidebar', 'Tags'))}</a></h2>`;
      content += `<div class="contents">${this.tagList(this.tagTree, INDEX)}</div>`;
    }
    return this.page(INDEX, {
      title: this.escape(this.options.name),
      description: '',
      path: '',
      heading: `<h1 class="page-title">${this.escape(this.options.name)}</h1>`,
      pagetags: '',
      content,
    });
  }

  private tagIndexPage(): string {
    const at = this.tagIndex!;
    return this.page(at, {
      title: this.escape(t('sidebar', 'Tags')),
      description: '',
      path: '',
      heading: `<h1 class="page-title">${this.escape(t('sidebar', 'Tags'))}</h1>`,
      pagetags: '',
      content: `<div class="contents">${this.tagList(this.tagTree, at)}</div>`,
    });
  }

  /** Every note with the tag, or with a tag nested under it, as the tag's page in the app. */
  private tagPage(tag: string): string {
    const at = this.tagPages.get(tag)!;
    const parts = tag.split('/');
    // Each parent of a nested tag links to its own page: #project / alpha.
    const heading = parts
      .map((part, index) => {
        const label = this.escape(index === 0 ? `#${part}` : part);
        if (index === parts.length - 1) return label;
        const href = this.escape(this.tagHref(at, parts.slice(0, index + 1).join('/')));
        return `<a class="tag-parent" href="${href}">${label}</a><span class="tag-sep">/</span>`;
      })
      .join('');
    return this.page(at, {
      title: this.escape(`#${tag}`),
      description: '',
      path: '',
      heading: `<h1 class="page-title tag-title">${heading}</h1>`,
      pagetags: '',
      content: this.tagNotes(at, tag),
    });
  }

  /** The count and the list of a tag's notes, each with all its tags. */
  private tagNotes(at: string, tag: string): string {
    const notes = this.meta.notesWith(tag);
    let html = `<p class="tag-count">${this.escape(tn('tags', '{count} note', '{count} notes', notes.length))}</p>`;
    if (notes.length === 0) return `${html}<p class="tag-empty">${this.escape(t('tags', 'No notes with this tag'))}</p>`;
    html += '<ul class="tag-notes">';
    for (const path of notes) {
      const dir = dirOf(path);
      html +=
        `<li class="tag-note"><a class="tag-note-link" href="${this.escape(this.noteHref(at, path))}">` +
        `<span class="tag-note-name">${this.escape(stripExtension(baseOf(path)))}</span>` +
        (dir ? `<span class="tag-note-dir">${this.escape(dir)}</span>` : '') +
        `</a>${this.chips(this.meta.tagsOf(path), at, tag)}</li>`;
    }
    return `${html}</ul>`;
  }

  /** What search.js holds: every note's name, folder, page and plain text. */
  private searchIndex(): string {
    const entries: SearchEntry[] = this.notes.map((note) => ({
      t: stripExtension(baseOf(note.path)),
      d: dirOf(note.path),
      h: relative(INDEX, this.pages.get(note.path)!),
      x: this.plain(bodyOf(note.text)),
    }));
    return `window.${SEARCH_GLOBAL} = ${JSON.stringify(entries)};\n`;
  }

  /* ---------------------------------------------------------------- *
   * Pieces
   * ---------------------------------------------------------------- */

  /** Marks the link to `at` itself as the current page. */
  private current(html: string, at: string): string {
    if (this.single) return html;
    const href = `<a href="${this.escape(relative(at, at))}">`;
    return html.replace(href, `${href.slice(0, -1)} aria-current="page">`);
  }

  private navigation(at: string): string {
    const dir = dirOf(at);
    let html = this.navCache.get(dir);
    if (html === undefined) {
      const notes = this.escape(t('sidebar', 'Notes'));
      // The search and the buttons show once site.js runs: without it they could do nothing.
      const search =
        `<div class="nav-search" hidden><input type="search" placeholder="${this.escape(t('site', 'Search the notes'))}" ` +
          `aria-label="${this.escape(t('site', 'Search the notes'))}" data-empty="${this.escape(t('tree', 'Nothing found'))}" ` +
          'autocomplete="off" spellcheck="false"></div>';
      const tools = this.hasFolders
        ? `<span class="tree-tools" hidden>${this.tool('expand', t('sidebar', 'Expand all folders'), EXPAND_ICON)}` +
          `${this.tool('collapse', t('sidebar', 'Collapse all folders'), COLLAPSE_ICON)}</span>`
        : '';
      html =
        `<nav class="nav" aria-label="${notes}" data-resize-label="${this.escape(t('sidebar', 'File panel width'))}">${search}` +
        `<div class="nav-head"><h2 class="nav-heading">${notes}</h2>${tools}</div>${this.list(this.tree, at, true)}</nav>`;
      this.navCache.set(dir, html);
    }
    return this.current(html, at);
  }

  private tool(action: string, label: string, icon: string): string {
    const text = this.escape(label);
    return `<button class="tree-tool" type="button" data-tree="${action}" title="${text}" aria-label="${text}">` +
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg></button>`;
  }

  /**
   * Folders as `<details>`, open, so the whole site is a click away without a
   * script. In the navigation each carries its path, for site.js to remember.
   */
  private list(entries: readonly TreeEntry[], at: string, marked: boolean): string {
    let html = '<ul class="nav-list">';
    for (const entry of entries) {
      if (entry.kind === 'dir') {
        const dir = marked ? ` data-dir="${this.escape(entry.path)}"` : '';
        html += `<li class="nav-dir"><details open${dir}><summary>${this.escape(entry.name)}</summary>${this.list(entry.children ?? [], at, marked)}</details></li>`;
        continue;
      }
      html += `<li class="nav-note"><a href="${this.escape(this.noteHref(at, entry.path))}">${this.escape(stripExtension(entry.name))}</a></li>`;
    }
    return `${html}</ul>`;
  }

  private tagNavigation(at: string): string {
    if (this.tagIndex === null) return '';
    const dir = dirOf(at);
    let html = this.tagNavCache.get(dir);
    if (html === undefined) {
      html =
        `<nav class="tag-nav" aria-label="${this.escape(t('sidebar', 'Tags'))}">` +
        `<h2 class="nav-heading"><a href="${this.escape(this.tagIndexHref(at))}">${this.escape(t('sidebar', 'Tags'))}</a></h2>` +
        `${this.tagList(this.tagTree, at)}</nav>`;
      this.tagNavCache.set(dir, html);
    }
    return this.current(html, at);
  }

  private tagList(nodes: readonly TagNode[], at: string): string {
    let html = '<ul class="tag-list">';
    for (const node of nodes) {
      html += `<li class="tag-item"><a href="${this.escape(this.tagHref(at, node.tag))}">${this.escape(node.name)}</a>` +
        `<span class="tag-count">${node.count}</span>`;
      if (node.children.length) html += this.tagList(node.children, at);
      html += '</li>';
    }
    return `${html}</ul>`;
  }

  /** A note's tags as `#chips`, each a link to the tag's page. */
  private chips(tags: readonly string[], at: string, current: string | null): string {
    if (tags.length === 0) return '';
    const items = tags.map((tag) => {
      const label = this.escape(`#${tag}`);
      if (!this.tagPages.has(tag) && !this.tagAnchors.has(tag)) return `<span class="tag">${label}</span>`;
      const own = tag === current ? ' tag--current' : '';
      return `<a class="tag${own}" href="${this.escape(this.tagHref(at, tag))}">${label}</a>`;
    });
    return `<p class="page-tags">${items.join(' ')}</p>`;
  }

  private parse(body: string): Token[] {
    try {
      return this.md.parse(body, {});
    } catch {
      return [];
    }
  }

  /** The first paragraph, as plain words, cut where a search result would cut it. */
  private description(body: string): string {
    const tokens = this.parse(body);
    const index = tokens.findIndex((token) => token.type === 'paragraph_open' && token.level === 0);
    const inline = index >= 0 ? tokens[index + 1] : undefined;
    if (!inline || inline.type !== 'inline') return '';
    const text = plainText(inline.children ?? []).replace(/\s+/g, ' ').trim();
    if (text.length <= DESCRIPTION_LENGTH) return text;
    const cut = text.lastIndexOf(' ', DESCRIPTION_LENGTH - 1);
    return `${text.slice(0, cut > DESCRIPTION_LENGTH / 2 ? cut : DESCRIPTION_LENGTH - 1)}…`;
  }

  /** All of a note's words, for the search: text, code and the text inside raw HTML. */
  private plain(body: string): string {
    const parts: string[] = [];
    for (const token of this.parse(body)) {
      if (token.type === 'inline') parts.push(plainText(token.children ?? []));
      else if (token.type === 'fence' || token.type === 'code_block') parts.push(token.content);
      else if (token.type === 'html_block') parts.push(token.content.replace(/<[^>]*>/g, ' '));
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /** How the links in one note are written where it is shown. */
  private links(note: SiteNote, at: string): ExportLinks {
    // On a single page `#section` belongs to this note's part of the page.
    const own = (anchor: string): string => (this.single && anchor ? `#${this.anchors.get(note.path)!}-${slugify(anchor)}` : anchor ? `#${anchor}` : '');
    const target = (path: string, anchor: string): string => {
      if (!this.single) return relative(at, this.pages.get(path)!) + (anchor ? `#${anchor}` : '');
      const id = this.anchors.get(path)!;
      return anchor ? `#${id}-${slugify(anchor)}` : `#${id}`;
    };
    return {
      link: (href) => {
        if (EXTERNAL.test(href) || href.startsWith('data:')) return href;
        if (href.startsWith('#')) return this.single ? own(safeDecodeComponent(href.slice(1))) : href;
        const hash = href.indexOf('#');
        const [file, anchor] = hash < 0 ? [href, ''] : [href.slice(0, hash), href.slice(hash + 1)];
        const path = resolvePath(note.path, safeDecode(file));
        const found = this.pages.has(path) ? path : this.pages.has(`${path}.md`) ? `${path}.md` : null;
        if (found) return target(found, this.single ? safeDecodeComponent(anchor) : anchor);
        // An image or a file. A page in the note's own folder reaches it as the note did;
        // the single page, at the root, finds it where `assets/` has it.
        return this.single ? relative(at, this.assetPath(path)) + (anchor ? `#${anchor}` : '') : href;
      },
      wiki: (wikiTarget) => {
        const hash = wikiTarget.indexOf('#');
        const [name, heading] = hash < 0 ? [wikiTarget, ''] : [wikiTarget.slice(0, hash), wikiTarget.slice(hash + 1)];
        const wanted = name.trim().toLowerCase();
        const anchor = heading.trim() ? slugify(heading) : '';
        // A heading of the note itself: `[[#Section]]`.
        if (!wanted) return anchor ? (this.single ? `#${this.anchors.get(note.path)!}-${anchor}` : `#${anchor}`) : null;
        const found = this.byPath.get(wanted) ?? this.byName.get(wanted) ?? this.byStem.get(wanted);
        return found ? target(found, anchor) : null;
      },
      embed: (name) => relative(at, this.assetPath(join(assetsDirOf(note.path), name))),
    };
  }
}

/* ------------------------------------------------------------------ *
 * Paths
 * ------------------------------------------------------------------ */

/** A tree of the notes alone: no images, and no folder without a note in it. */
function treeOf(paths: readonly string[]): TreeEntry[] {
  const root: TreeEntry[] = [];
  const dirs = new Map<string, TreeEntry[]>([['', root]]);
  const ensureDir = (path: string): TreeEntry[] => {
    const existing = dirs.get(path);
    if (existing) return existing;
    const children: TreeEntry[] = [];
    ensureDir(dirOf(path)).push({ kind: 'dir', name: baseOf(path), path, children });
    dirs.set(path, children);
    return children;
  };
  for (const path of paths) ensureDir(dirOf(path)).push({ kind: 'file', name: baseOf(path), path });
  return sortEntries(root);
}

function notesOf(entries: readonly TreeEntry[]): string[] {
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.kind === 'file') out.push(entry.path);
    else out.push(...notesOf(entry.children ?? []));
  }
  return out;
}

function splitPath(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/** `../` for each folder the page sits in, so `{{root}}style.css` reaches the root. */
export function rootOf(page: string): string {
  return '../'.repeat(splitPath(dirOf(page)).length);
}

/** The href from the page `from` to the site file `to`, each segment URL-encoded. */
export function relative(from: string, to: string): string {
  const fromDirs = splitPath(dirOf(from));
  const toDirs = splitPath(dirOf(to));
  let common = 0;
  while (common < fromDirs.length && common < toDirs.length && fromDirs[common] === toDirs[common]) common += 1;
  const parts = [
    ...new Array<string>(fromDirs.length - common).fill('..'),
    ...toDirs.slice(common).map(encodeURIComponent),
    encodeURIComponent(baseOf(to)),
  ];
  return parts.join('/');
}

/** A tag segment as a file name: what no file system takes becomes a dash. */
function fileName(segment: string): string {
  return segment.replace(/[\\/:*?"<>|#%\u0000-\u001f]+/g, '-').replace(/^\.+/, '') || 'tag';
}

/** The note without its front matter, which is data, not text. */
function bodyOf(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const skip = frontMatterEnd(lines);
  return skip > 0 ? lines.slice(skip).join('\n') : text;
}

function safeDecode(uri: string): string {
  try {
    return decodeURI(uri);
  } catch {
    return uri;
  }
}

function safeDecodeComponent(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
