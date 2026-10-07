/**
 * HTML → Markdown, for what the extension takes from a web page (grab.ts).
 *
 * The editor's own dialect comes out: CommonMark with GFM tables, task lists,
 * ~~strikethrough~~ and ==highlight==. Text is escaped so that it reads as
 * itself — a `*` or a `<b>` typed on the page does not become formatting, and
 * no HTML from the page reaches the note. Line breaks inside a paragraph are a
 * backslash at the end of the line; inside a table cell, `<br>`, as the
 * editor writes them.
 *
 * Runs where there is a DOM: the side panel parses the HTML with DOMParser.
 */

import { destination } from '../clip';

const BLOCKS = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'center', 'dd', 'details', 'dir', 'div', 'dl', 'dt', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main',
  'menu', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);
const BLOCK_SELECTOR = [...BLOCKS].join(',');
const SKIP = new Set(['script', 'style', 'noscript', 'template', 'head', 'title', 'meta', 'link', 'iframe', 'object', 'embed', 'canvas', 'svg', 'math', 'button', 'select', 'textarea', 'option']);

/** A line break inside a paragraph: a backslash ends the line. */
const BREAK = '\\\n';

interface Context {
  strong?: boolean;
  em?: boolean;
  del?: boolean;
  mark?: boolean;
  link?: boolean;
}

export function htmlToMarkdown(html: string, base: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return tidy(new Converter(base).blocks(doc.body).join('\n\n'));
}

/** Three blank lines are one; no spaces at the ends of lines. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Text that reads as itself: what Markdown would take for formatting is escaped. */
export function escapeText(text: string): string {
  return text
    .replace(/[\\`*[\]]/g, '\\$&')
    .replace(/_/g, (mark, at: number, all: string) => (/[\p{L}\p{N}]/u.test(all[at - 1] ?? ' ') && /[\p{L}\p{N}]/u.test(all[at + 1] ?? ' ') ? mark : '\\_'))
    .replace(/~~/g, '\\~\\~')
    .replace(/==/g, '\\=\\=')
    .replace(/<(?=[A-Za-z/!?])/g, '\\<')
    .replace(/&(?=#?\w+;)/g, '\\&');
}

/** What a line of text must not start with, or it would turn into a heading, a quote or a list. */
function escapeLineStart(line: string): string {
  return line
    .replace(/^(#{1,6})(?=\s|$)/, '\\$1')
    .replace(/^>/, '\\>')
    .replace(/^([-+])(?=\s|$)/, '\\$1')
    .replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2')
    .replace(/^(=+|-+)\s*$/, '\\$1');
}

/** Spaces at the edges go outside the marks: `** bold **` is no emphasis. */
function wrap(inner: string, mark: string): string {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
  const [, lead = '', core = '', trail = ''] = match ?? [];
  return core ? `${lead}${mark}${core}${mark}${trail}` : inner;
}

function codeSpan(text: string): string {
  const code = text.replace(/\s*\n\s*/g, ' ');
  if (!code.trim()) return '';
  const longest = Math.max(0, ...Array.from(code.matchAll(/`+/g), (run) => run[0].length));
  const fence = '`'.repeat(longest + 1);
  const pad = code.startsWith('`') || code.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${code}${pad}${fence}`;
}

const isElement = (node: Node): node is Element => node.nodeType === Node.ELEMENT_NODE;
const isText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE;

class Converter {
  constructor(private readonly base: string) {}

  private absolute(url: string): string | null {
    try {
      return new URL(url, this.base).href;
    } catch {
      return null;
    }
  }

  /** The blocks of a container: inline content between its block children becomes paragraphs. */
  blocks(parent: Node): string[] {
    const out: string[] = [];
    let run = '';
    const flush = (): void => {
      const paragraph = this.paragraph(run);
      if (paragraph) out.push(paragraph);
      run = '';
    };
    for (const node of Array.from(parent.childNodes)) {
      if (isText(node)) {
        run += this.text(node.data);
        continue;
      }
      if (!isElement(node)) continue;
      const tag = node.localName;
      if (SKIP.has(tag)) continue;
      if (tag === 'br') {
        run += BREAK;
        continue;
      }
      // A link or a span around whole blocks — a card on a list page — is a container.
      if (!BLOCKS.has(tag) && !node.querySelector(BLOCK_SELECTOR)) {
        run += this.inline(node, {});
        continue;
      }
      flush();
      out.push(...this.block(node));
    }
    flush();
    return out;
  }

  private block(el: Element): string[] {
    const tag = el.localName;
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const text = this.flat(el);
        return text ? [`${'#'.repeat(Number(tag[1]))} ${text}`] : [];
      }
      case 'p':
        return this.blocks(el);
      case 'pre':
        return [this.pre(el)];
      case 'blockquote': {
        const inner = this.blocks(el).join('\n\n');
        return inner ? [inner.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')] : [];
      }
      case 'ul':
      case 'ol':
      case 'menu':
      case 'dir': {
        const list = this.list(el);
        return list ? [list] : [];
      }
      case 'hr':
        return ['---'];
      case 'table':
        return this.table(el);
      case 'dt':
      case 'summary': {
        const text = this.flat(el);
        return text ? [`**${text}**`] : [];
      }
      default:
        return this.blocks(el);
    }
  }

  /** Inline content on one line, for a heading or a term. */
  private flat(el: Element): string {
    return this.blocks(el).join(' ').replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** A run of inline Markdown as a paragraph — or several, where two line breaks in a row split it. */
  private paragraph(run: string): string {
    return run
      .split(/\\\n(?:[ \t]*\\\n)+/)
      .map((part) =>
        part
          .split('\n')
          .map((line) => escapeLineStart(line.replace(/[ \t]{2,}/g, ' ').trim()))
          .filter((line) => line && line !== '\\')
          .join('\n')
          .replace(/\\$/, '')
          .trim(),
      )
      .filter(Boolean)
      .join('\n\n');
  }

  private text(data: string): string {
    return escapeText(data.replace(/[\s ]+/g, ' '));
  }

  private kids(el: Element, context: Context): string {
    let out = '';
    for (const node of Array.from(el.childNodes)) {
      if (isText(node)) out += this.text(node.data);
      else if (isElement(node)) out += this.inline(node, context);
    }
    return out;
  }

  private inline(el: Element, context: Context): string {
    const tag = el.localName;
    if (SKIP.has(tag)) return '';
    switch (tag) {
      case 'br':
        return BREAK;
      case 'strong':
      case 'b':
        return context.strong ? this.kids(el, context) : wrap(this.kids(el, { ...context, strong: true }), '**');
      case 'em':
      case 'i':
        return context.em ? this.kids(el, context) : wrap(this.kids(el, { ...context, em: true }), '*');
      case 'del':
      case 's':
      case 'strike':
        return context.del ? this.kids(el, context) : wrap(this.kids(el, { ...context, del: true }), '~~');
      case 'mark':
        return context.mark ? this.kids(el, context) : wrap(this.kids(el, { ...context, mark: true }), '==');
      case 'code':
      case 'kbd':
      case 'samp':
      case 'tt':
        return codeSpan(el.textContent ?? '');
      case 'a':
        return this.link(el, context);
      case 'img':
        return this.image(el);
      case 'input':
        return '';
      default:
        // A block met inside a line — a paragraph inside a link — keeps a space from its neighbours.
        return BLOCKS.has(tag) ? ` ${this.kids(el, context)} ` : this.kids(el, context);
    }
  }

  private link(el: Element, context: Context): string {
    const inner = this.kids(el, { ...context, link: true });
    const href = el.getAttribute('href')?.trim() ?? '';
    // A link inside a link, an anchor on the same page, a script: the text alone.
    if (context.link || !href || href.startsWith('#') || /^javascript:/i.test(href)) return inner;
    const url = this.absolute(href);
    if (!url) return inner;
    const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner);
    const [, lead = '', core = '', trail = ''] = match ?? [];
    return core.replace(/\\\n/g, ' ').trim() ? `${lead}[${core.replace(/\\\n/g, ' ')}](${destination(url)})${trail}` : inner;
  }

  private image(el: Element): string {
    const src = el.getAttribute('src')?.trim() ?? '';
    // A placeholder of a lazy image, or a tracking pixel: nothing to see.
    if (!src || src.startsWith('data:')) return '';
    if (['width', 'height'].some((name) => Number(el.getAttribute(name)) > 0 && Number(el.getAttribute(name)) <= 2)) return '';
    const url = this.absolute(src);
    if (!url) return '';
    const alt = (el.getAttribute('alt') ?? '').replace(/\s+/g, ' ').trim().replace(/[\\[\]]/g, '\\$&');
    return `![${alt}](${destination(url)})`;
  }

  private pre(el: Element): string {
    const code = preText(el).replace(/^\n/, '').replace(/\s+$/, '');
    const longest = Math.max(2, ...Array.from(code.matchAll(/^\s*(`{3,}|~{3,})/gm), (run) => run[1]?.length ?? 0));
    const fence = '`'.repeat(longest + 1);
    return `${fence}${languageOf(el)}\n${code}\n${fence}`;
  }

  private list(el: Element): string {
    const ordered = el.localName === 'ol';
    let number = Number(el.getAttribute('start') ?? 1);
    if (!Number.isFinite(number)) number = 1;
    let loose = false;
    const items: string[] = [];
    for (const li of Array.from(el.children)) {
      if (li.localName !== 'li') {
        // A list nested straight in a list, as some pages write it, belongs to the item above.
        if ((li.localName === 'ul' || li.localName === 'ol') && items.length) {
          const nested = this.list(li);
          if (nested) items[items.length - 1] += `\n${indent(nested, ordered ? 3 : 2)}`;
        }
        continue;
      }
      const marker = ordered ? `${number++}. ` : '- ';
      const box = Array.from(li.querySelectorAll('input[type="checkbox"]')).find((input) => input.closest('li') === li);
      const task = box ? (box.hasAttribute('checked') ? '[x] ' : '[ ] ') : '';
      const parts = this.blocks(li);
      const paragraphs = parts.filter((part) => !/^(- |\d+\. )/.test(part));
      if (paragraphs.length > 1 || parts.some((part) => part.includes('\n\n') && !/^(- |\d+\. |```)/.test(part))) loose = true;
      const body = parts.join(paragraphs.length > 1 ? '\n\n' : '\n');
      items.push(`${marker}${task}${indent(body, marker.length).trimStart()}`);
    }
    return items.join(loose ? '\n\n' : '\n');
  }

  private table(el: Element): string[] {
    const rows = Array.from(el.querySelectorAll('tr')).filter((row) => row.closest('table') === el);
    if (!rows.length) return this.blocks(el);
    // A table that lays out a page rather than holding data reads better as its cells, one after another.
    if (el.querySelector('table, pre, h1, h2, h3, h4, h5, h6, blockquote')) return rows.flatMap((row) => Array.from(row.children).flatMap((cell) => this.blocks(cell)));
    const cells = rows.map((row) =>
      Array.from(row.children)
        .filter((cell) => cell.localName === 'td' || cell.localName === 'th')
        .flatMap((cell) => {
          const text = this.blocks(cell)
            .join('<br>')
            .replace(/\\\n|\n/g, '<br>')
            .replace(/\|/g, '\\|')
            .trim();
          const span = Math.max(1, Math.min(50, Number(cell.getAttribute('colspan') ?? 1) || 1));
          return [text, ...Array<string>(span - 1).fill('')];
        }),
    );
    const width = Math.max(...cells.map((row) => row.length));
    if (width === 0) return [];
    const line = (row: string[]): string => `| ${Array.from({ length: width }, (_, at) => row[at] ?? '').join(' | ')} |`;
    const [head = [], ...body] = cells;
    return [[line(head), `| ${Array(width).fill('---').join(' | ')} |`, ...body.map(line)].join('\n')];
  }
}

function indent(text: string, by: number): string {
  const pad = ' '.repeat(by);
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n');
}

/** A code block's text: a <br> or a line wrapped in its own <div> is a new line. */
function preText(node: Node): string {
  let out = '';
  for (const child of Array.from(node.childNodes)) {
    if (isText(child)) out += child.data;
    else if (isElement(child)) {
      if (child.localName === 'br') out += '\n';
      else {
        out += preText(child);
        if ((child.localName === 'div' || child.localName === 'p') && !out.endsWith('\n')) out += '\n';
      }
    }
  }
  return out;
}

/** `language-js`, `lang-js`, `highlight-source-js` (GitHub) or data-lang, on the block, its code or its wrapper. */
function languageOf(pre: Element): string {
  for (const el of [pre, pre.querySelector('code'), pre.parentElement]) {
    if (!el) continue;
    const named = el.getAttribute('data-lang') ?? el.getAttribute('data-language');
    if (named && /^[\w+#.-]+$/.test(named)) return named.toLowerCase();
    const found = /(?:^|\s)(?:language|lang|highlight-source|brush:)-?([\w+#.-]+)/.exec(el.getAttribute('class') ?? '');
    if (found?.[1]) return found[1].toLowerCase();
  }
  return '';
}
