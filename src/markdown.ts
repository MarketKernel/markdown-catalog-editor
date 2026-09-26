/**
 * The Markdown engine: markdown-it with the extras a note vault needs —
 * `==highlight==`, `[[wiki links]]`, clickable task lists, syntax highlighting
 * and image/link sources tagged for the app to resolve against the folder.
 */

import MarkdownItFactory from 'markdown-it';
import type { MarkdownIt, StateCore, StateInline, Token } from 'markdown-it';
import hljs from 'highlight.js/lib/core';

import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

for (const [name, lang] of Object.entries({
  bash, c, cpp, csharp, css, diff, go, ini, java, javascript,
  json, markdown, php, python, rust, sql, typescript, xml, yaml,
})) {
  hljs.registerLanguage(name, lang);
}

// Where highlight.js's own name lumps several formats together, the fence tag decides.
const LANGUAGE_NAMES: Record<string, string> = {
  html: 'HTML', xhtml: 'XHTML', xml: 'XML', svg: 'SVG', rss: 'RSS', atom: 'Atom', plist: 'Property list',
  ini: 'INI', toml: 'TOML', php: 'PHP',
};

/** `ts` → "TypeScript"; a language highlight.js doesn't know keeps its tag. */
function languageName(tag: string): string {
  return LANGUAGE_NAMES[tag.toLowerCase()] ?? hljs.getLanguage(tag)?.name ?? tag;
}

export const EXTERNAL = /^[a-z][a-z0-9+.-]*:|^\/\//i;
const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;

/**
 * Rendering for a static site (see export.ts): links point at files instead of
 * being tagged for the app to open, and headings get ids for `#anchors`.
 * Passed as `env.export` to `md.render`.
 */
export interface ExportLinks {
  /** A link relative to the note, `#hash` included → the href to write. */
  link(href: string): string;
  /** A `[[wiki]]` target → the href of that note's page, or null when there is none. */
  wiki(target: string): string | null;
  /** `![[image.png]]` → the src of the image in the note's assets folder. */
  embed(name: string): string;
  /** Put before every heading id, so notes sharing one page never share an id. */
  prefix?: string;
  /** Heading levels moved down: 1 makes `#` an `<h2>`, under the note's own title. */
  shift?: number;
}

interface Env {
  [key: string | symbol]: unknown;
  export?: ExportLinks;
  /** Heading ids already used on the page, each with how often. */
  slugs?: Map<string, number>;
}

/** `Hello, World!` → `hello-world`: letters and digits of any script, dashes between. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
}

/** The plain words of inline tokens: for a heading id or a page description. */
export function plainText(tokens: readonly Token[]): string {
  let out = '';
  for (const token of tokens) {
    if (token.type === 'text' || token.type === 'code_inline' || token.type === 'wikilink' || token.type === 'embed') out += token.content;
    else if (token.type === 'softbreak' || token.type === 'hardbreak') out += ' ';
    else if (token.type === 'image') out += plainText(token.children ?? []);
  }
  return out;
}

export function createMarkdown(): MarkdownIt {
  const md = new MarkdownItFactory({
    // Own notes, own machine: raw HTML is what makes `<span style="color:…">` work.
    html: true,
    linkify: true,
    // A line break in the source is one on screen, as in Obsidian.
    breaks: true,
    highlight(code, lang) {
      const language = lang.trim().split(/\s+/)[0] ?? '';
      if (language && hljs.getLanguage(language)) {
        try {
          return hljs.highlight(code, { language, ignoreIllegals: true }).value;
        } catch {
          /* fall through to the escaped plain text below */
        }
      }
      return '';
    },
  });

  md.inline.ruler.before('emphasis', 'mark', markRule);
  md.inline.ruler.before('link', 'wikilink', wikiRule);
  md.inline.ruler.before('image', 'embed', embedRule);
  md.core.ruler.after('inline', 'task_lists', taskRule);
  md.core.ruler.before('inline', 'callouts', calloutRule);

  md.renderer.rules['mark_open'] = () => '<mark>';
  md.renderer.rules['mark_close'] = () => '</mark>';
  md.renderer.rules['wikilink'] = (tokens, index, _options, env: Env | undefined) => {
    const token = tokens[index]!;
    const target = String(token.attrGet('target') ?? '');
    const label = md.utils.escapeHtml(token.content);
    if (env?.export) {
      const href = env.export.wiki(target);
      if (href === null) return `<span class="wikilink wikilink--missing">${label}</span>`;
      return `<a class="wikilink" href="${md.utils.escapeHtml(href)}">${label}</a>`;
    }
    return `<a class="wikilink" href="#" data-wiki="${md.utils.escapeHtml(target)}">${label}</a>`;
  };

  // `![[image.png]]` lives in the note's own assets folder; the app knows where that is.
  md.renderer.rules['embed'] = (tokens, index, _options, env: Env | undefined) => {
    const token = tokens[index]!;
    const target = String(token.attrGet('target') ?? '');
    const name = md.utils.escapeHtml(target);
    const width = token.attrGet('width');
    const size = width ? ` width="${width}"` : '';
    const alt = md.utils.escapeHtml(token.content);
    if (env?.export) return `<img class="embed" src="${md.utils.escapeHtml(env.export.embed(target))}" alt="${alt}"${size}>`;
    return `<img class="embed" src="" alt="${alt}" data-embed="${name}"${size}>`;
  };

  // Images inside the vault are resolved to blob URLs after the HTML lands in the DOM.
  md.renderer.rules['image'] = (tokens, index, options, env: Env | undefined, self) => {
    const token = tokens[index]!;
    const src = String(token.attrGet('src') ?? '');
    token.attrSet('alt', self.renderInlineAsText(token.children ?? [], options, env));
    if (!EXTERNAL.test(src) && !src.startsWith('data:')) {
      if (env?.export) token.attrSet('src', env.export.link(src));
      else {
        token.attrSet('data-asset', src);
        token.attrSet('src', '');
      }
    }
    return self.renderToken(tokens, index, options);
  };

  const renderLink = md.renderer.rules['link_open'];
  md.renderer.rules['link_open'] = (tokens, index, options, env: Env | undefined, self) => {
    const token = tokens[index]!;
    const href = String(token.attrGet('href') ?? '');
    if (EXTERNAL.test(href)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noreferrer noopener');
    } else if (href && env?.export) {
      // `#anchors` too: on a single page each note's headings carry the note's prefix.
      token.attrSet('href', env.export.link(href));
    } else if (href && !href.startsWith('#')) {
      token.attrSet('data-note', safeDecode(href));
    }
    return renderLink
      ? renderLink(tokens, index, options, env, self)
      : self.renderToken(tokens, index, options);
  };

  // On a static page a heading carries an id, so `[link](note.md#section)` lands on it.
  md.renderer.rules['heading_open'] = (tokens, index, options, env: Env | undefined, self) => {
    const open = tokens[index]!;
    const inline = tokens[index + 1];
    if (env?.export && inline?.type === 'inline') {
      const slug = slugify(plainText(inline.children ?? []));
      if (slug) {
        env.slugs ??= new Map();
        const seen = env.slugs.get(slug) ?? 0;
        env.slugs.set(slug, seen + 1);
        open.attrSet('id', `${env.export.prefix ?? ''}${seen ? `${slug}-${seen + 1}` : slug}`);
      }
      const shift = env.export.shift ?? 0;
      const close = tokens[index + 2];
      if (shift && close?.type === 'heading_close') {
        const tag = `h${Math.min(6, Number(open.tag.slice(1)) + shift)}`;
        open.tag = tag;
        close.tag = tag;
      }
    }
    return self.renderToken(tokens, index, options);
  };

  // A fenced block names its language in the corner; the label is CSS, so copying the code skips it.
  const renderFence = md.renderer.rules['fence']!;
  md.renderer.rules['fence'] = (tokens, index, options, env, self) => {
    const html = renderFence(tokens, index, options, env, self);
    const language = tokens[index]!.info.trim().split(/\s+/)[0] ?? '';
    if (!language) return html;
    return `<div class="code-block" data-lang="${md.utils.escapeHtml(languageName(language))}">${html}</div>\n`;
  };

  // `> [!tip] Title`: the title row carries the icon; a foldable one is a <details>.
  md.renderer.rules['callout_title_open'] = (tokens, index) => {
    const token = tokens[index]!;
    return `<${token.tag} class="callout-title">${calloutIcon(token.info)}<span class="callout-title-text">`;
  };
  md.renderer.rules['callout_title_close'] = (tokens, index) => `</span></${tokens[index]!.tag}>\n`;

  // A checkbox carries its line within the block, so a click can flip the source.
  md.renderer.rules['checkbox'] = (tokens, index, _options, env: Env | undefined) => {
    const token = tokens[index]!;
    const checked = token.attrGet('checked') ? ' checked' : '';
    if (env?.export) return `<input class="task" type="checkbox" disabled${checked}>`;
    const line = token.attrGet('line') ?? '0';
    return `<input class="task" type="checkbox" data-task-line="${line}"${checked}>`;
  };

  return md;
}

/** `==highlighted==` → `<mark>`. */
function markRule(state: StateInline, silent: boolean): boolean {
  if (silent) return false;
  const start = state.pos;
  const max = state.posMax;
  if (state.src.charCodeAt(start) !== 0x3d || state.src.charCodeAt(start + 1) !== 0x3d) return false;
  if (start + 2 >= max || /\s|=/.test(state.src[start + 2] ?? '')) return false;

  let found = -1;
  for (let pos = start + 2; pos < max - 1; pos += 1) {
    if (
      state.src.charCodeAt(pos) === 0x3d &&
      state.src.charCodeAt(pos + 1) === 0x3d &&
      !/\s/.test(state.src[pos - 1] ?? ' ')
    ) {
      found = pos;
      break;
    }
  }
  if (found < 0) return false;

  const savedMax = state.posMax;
  state.push('mark_open', 'mark', 1);
  state.pos = start + 2;
  state.posMax = found;
  state.md.inline.tokenize(state);
  state.push('mark_close', 'mark', -1);
  state.pos = found + 2;
  state.posMax = savedMax;
  return true;
}

/** `[[note]]`, `[[note|label]]`, `[[note#heading]]`. */
function wikiRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5b) return false;
  const close = state.src.indexOf(']]', start + 2);
  if (close < 0 || close > state.posMax) return false;

  const body = state.src.slice(start + 2, close);
  if (!body || body.includes('[') || body.includes('\n')) return false;

  if (!silent) {
    const bar = body.indexOf('|');
    const target = (bar < 0 ? body : body.slice(0, bar)).trim();
    const label = (bar < 0 ? body.split('#')[0] || body : body.slice(bar + 1)).trim();
    const token = state.push('wikilink', 'a', 0);
    token.content = label;
    token.attrSet('target', target);
  }
  state.pos = close + 2;
  return true;
}

/**
 * `![[image.png]]`, `![[image.png|300]]` (width) or `![[image.png|caption]]`.
 * Anything but an image stays a plain wiki link — notes are not transcluded.
 */
function embedRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== 0x21 || state.src.charCodeAt(start + 1) !== 0x5b) return false;
  if (state.src.charCodeAt(start + 2) !== 0x5b) return false;
  const close = state.src.indexOf(']]', start + 3);
  if (close < 0 || close > state.posMax) return false;

  const body = state.src.slice(start + 3, close);
  if (!body || body.includes('[') || body.includes('\n')) return false;
  const bar = body.indexOf('|');
  const target = (bar < 0 ? body : body.slice(0, bar)).trim();
  if (!IMAGE.test(target)) return false;

  if (!silent) {
    const option = bar < 0 ? '' : body.slice(bar + 1).trim();
    const width = /^\d+$/.test(option) ? option : null;
    const token = state.push('embed', 'img', 0);
    token.content = width || !option ? target : option;
    token.attrSet('target', target);
    if (width) token.attrSet('width', width);
  }
  state.pos = close + 2;
  return true;
}

const CALLOUT = /^\[!([\w-]+)\]([+-]?)[ \t]*(.*)(?:\n|$)/;

/** Obsidian's callout types and their aliases; an unknown type looks like a note. */
const CALLOUT_ALIASES: Record<string, string> = {
  summary: 'abstract', tldr: 'abstract',
  hint: 'tip', important: 'tip',
  check: 'success', done: 'success',
  help: 'question', faq: 'question',
  caution: 'warning', attention: 'warning',
  fail: 'failure', missing: 'failure',
  error: 'danger',
  cite: 'quote',
};

const CALLOUT_ICONS: Record<string, string> = {
  note: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  abstract: 'M9 2h6v4H9zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h6',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01',
  todo: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3',
  tip: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.1a2.5 2.5 0 0 0 2.5 2.6Z',
  success: 'M20 6 9 17l-5-5',
  question: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
  warning: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0ZM12 9v4M12 17h.01',
  failure: 'M18 6 6 18M6 6l12 12',
  danger: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z',
  bug: 'M9 7.1V6a3 3 0 1 1 6 0v1.1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6ZM12 20v-9M6 13H2M22 13h-4M6.5 17C4.6 17.2 3 18.9 3 21M17.5 17c1.9.2 3.5 1.9 3.5 4M6.5 9C4.6 8.8 3 7.1 3 5M17.5 9c1.9-.2 3.5-1.9 3.5-4',
  example: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  quote: 'M3 21c3 0 7-1 7-8V5c0-1.2-.8-2-2-2H4c-1.3 0-2 .8-2 2v6c0 1.1.8 2 2 2h3c0 4-2 6-4 6M15 21c3 0 7-1 7-8V5c0-1.2-.8-2-2-2h-4c-1.3 0-2 .8-2 2v6c0 1.1.8 2 2 2h3c0 4-2 6-4 6',
};

function calloutIcon(kind: string): string {
  return `<svg class="callout-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${CALLOUT_ICONS[kind] ?? CALLOUT_ICONS['note']}"/></svg>`;
}

/**
 * `> [!note] Title` turns the quote into a callout: the marker line becomes
 * the title row, and `[!note]-` / `[!note]+` make it fold, closed or open.
 * Runs before inline parsing, so the title is Markdown like any other text.
 */
function calloutRule(state: StateCore): void {
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index += 1) {
    const open = tokens[index]!;
    const inline = tokens[index + 2];
    if (open.type !== 'blockquote_open' || tokens[index + 1]?.type !== 'paragraph_open' || inline?.type !== 'inline') continue;
    const match = CALLOUT.exec(inline.content);
    if (!match) continue;

    const type = match[1]!.toLowerCase();
    const kind = CALLOUT_ALIASES[type] ?? (type in CALLOUT_ICONS ? type : 'note');
    const fold = match[2];
    const title = match[3]!.trim() || type.charAt(0).toUpperCase() + type.slice(1);

    open.attrJoin('class', 'callout');
    open.attrSet('data-callout', kind);
    if (fold) {
      const close = tokens.slice(index + 1).find((token) => token.type === 'blockquote_close' && token.level === open.level);
      open.tag = 'details';
      if (close) close.tag = 'details';
      if (fold === '+') open.attrSet('open', '');
    }

    const titleOpen = new state.Token('callout_title_open', fold ? 'summary' : 'div', 1);
    titleOpen.info = kind;
    const titleText = new state.Token('inline', '', 0);
    titleText.content = title;
    titleText.map = inline.map;
    titleText.children = [];
    const titleClose = new state.Token('callout_title_close', titleOpen.tag, -1);
    for (const token of [titleOpen, titleText, titleClose]) token.level = open.level + 1;

    const rest = inline.content.slice(match[0].length);
    if (rest.trim()) {
      inline.content = rest;
      tokens.splice(index + 1, 0, titleOpen, titleText, titleClose);
    } else {
      // Only the marker line: its paragraph is the title and nothing else.
      tokens.splice(index + 1, 3, titleOpen, titleText, titleClose);
    }
  }
}

/** Turns `- [ ] item` into a real checkbox that carries its source line. */
function taskRule(state: StateCore): void {
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index += 1) {
    const inline = tokens[index];
    if (!inline || inline.type !== 'inline') continue;
    if (!isFirstChildOfListItem(tokens, index)) continue;

    const match = /^\[([ xX])\]\s+/.exec(inline.content);
    if (!match) continue;
    const children = inline.children;
    const first = children?.[0];
    if (!first || first.type !== 'text') continue;

    inline.content = inline.content.slice(match[0].length);
    first.content = first.content.slice(match[0].length);

    const box = new state.Token('checkbox', 'input', 0);
    box.attrSet('line', String(inline.map?.[0] ?? 0));
    if (match[1] !== ' ') box.attrSet('checked', 'true');
    children!.unshift(box);
    // Mark the item, not the list: a plain bullet beside a task keeps its dot.
    tokens[index - 2]?.attrJoin('class', 'task-item');
  }
}

function isFirstChildOfListItem(tokens: Token[], index: number): boolean {
  return tokens[index - 1]?.type === 'paragraph_open' && tokens[index - 2]?.type === 'list_item_open';
}

function safeDecode(uri: string): string {
  try {
    return decodeURI(uri);
  } catch {
    return uri;
  }
}
