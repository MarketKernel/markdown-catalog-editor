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

const EXTERNAL = /^[a-z][a-z0-9+.-]*:|^\/\//i;
const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;

export function createMarkdown(): MarkdownIt {
  const md = new MarkdownItFactory({
    // Own notes, own machine: raw HTML is what makes `<span style="color:…">` work.
    html: true,
    linkify: true,
    breaks: false,
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

  md.renderer.rules['mark_open'] = () => '<mark>';
  md.renderer.rules['mark_close'] = () => '</mark>';
  md.renderer.rules['wikilink'] = (tokens, index) => {
    const token = tokens[index]!;
    const target = String(token.attrGet('target') ?? '');
    return `<a class="wikilink" href="#" data-wiki="${md.utils.escapeHtml(target)}">${md.utils.escapeHtml(token.content)}</a>`;
  };

  // `![[image.png]]` lives in the note's own assets folder; the app knows where that is.
  md.renderer.rules['embed'] = (tokens, index) => {
    const token = tokens[index]!;
    const name = md.utils.escapeHtml(String(token.attrGet('target') ?? ''));
    const width = token.attrGet('width');
    const size = width ? ` width="${width}"` : '';
    return `<img class="embed" src="" alt="${md.utils.escapeHtml(token.content)}" data-embed="${name}"${size}>`;
  };

  // Images inside the vault are resolved to blob URLs after the HTML lands in the DOM.
  md.renderer.rules['image'] = (tokens, index, options, _env, self) => {
    const token = tokens[index]!;
    const src = String(token.attrGet('src') ?? '');
    token.attrSet('alt', self.renderInlineAsText(token.children ?? [], options, _env));
    if (!EXTERNAL.test(src) && !src.startsWith('data:')) {
      token.attrSet('data-asset', src);
      token.attrSet('src', '');
    }
    return self.renderToken(tokens, index, options);
  };

  const renderLink = md.renderer.rules['link_open'];
  md.renderer.rules['link_open'] = (tokens, index, options, env, self) => {
    const token = tokens[index]!;
    const href = String(token.attrGet('href') ?? '');
    if (EXTERNAL.test(href)) {
      token.attrSet('target', '_blank');
      token.attrSet('rel', 'noreferrer noopener');
    } else if (href && !href.startsWith('#')) {
      token.attrSet('data-note', safeDecode(href));
    }
    return renderLink
      ? renderLink(tokens, index, options, env, self)
      : self.renderToken(tokens, index, options);
  };

  // A checkbox carries its line within the block, so a click can flip the source.
  md.renderer.rules['checkbox'] = (tokens, index) => {
    const token = tokens[index]!;
    const checked = token.attrGet('checked') ? ' checked' : '';
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
