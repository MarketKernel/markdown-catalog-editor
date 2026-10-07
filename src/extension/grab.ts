/**
 * What runs inside the web page: chrome.scripting.executeScript sends these
 * functions there as their source text, so each is self-contained — nothing
 * from outside its own body, no imports, no helpers of the module.
 *
 * grab() takes the selection, or the page's main text when nothing is
 * selected: a copy of the DOM with only what reads as content — no scripts,
 * forms, menus, hidden parts — and every address made absolute. It returns
 * HTML; the side panel turns it into Markdown (to-markdown.ts).
 */

export interface Grabbed {
  title: string;
  url: string;
  html: string;
  /** The HTML is the selection, not the page. */
  selection: boolean;
}

/** `selectionOnly`: from the "selection" menu item — the page is no fallback there. */
export function grab(selectionOnly: boolean): Grabbed {
  const MAX = 4_000_000;
  // Never content, wherever they are.
  const DROP = new Set(['script', 'style', 'noscript', 'template', 'iframe', 'object', 'embed', 'canvas', 'svg', 'math', 'button', 'select', 'textarea', 'dialog', 'link', 'meta']);
  // A site's frame around the text, left out of the page but kept in a selection, where the user chose it.
  // Not <form>: some sites wrap the whole page in one; its fields go anyway.
  const FRAME = new Set(['nav', 'aside', 'footer']);
  const NOISE_ROLES = new Set(['navigation', 'banner', 'contentinfo', 'complementary', 'search', 'dialog', 'alertdialog', 'menu', 'menubar', 'toolbar']);
  const NOISE_NAMES = /(^|[\s_-])(share|sharing|social|comments?|related|advert|advertisement|ads|promo|newsletter|cookies?|consent|subscribe|breadcrumbs?|sidebar|toc)([\s_-]|$)/i;
  const KEEP = new Set(['href', 'src', 'alt', 'colspan', 'rowspan', 'start', 'type', 'checked', 'class', 'data-lang', 'data-language', 'width', 'height']);

  const noisy = (el: Element): boolean =>
    FRAME.has(el.localName) ||
    NOISE_ROLES.has(el.getAttribute('role') ?? '') ||
    el.getAttribute('aria-hidden') === 'true' ||
    NOISE_NAMES.test(`${el.id} ${typeof el.className === 'string' ? el.className : ''}`);

  const copy = (node: Node, page: boolean, top = false): Node | null => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue ?? '');
    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      const out = document.createDocumentFragment();
      for (const child of Array.from(node.childNodes)) {
        const next = copy(child, page);
        if (next) out.append(next);
      }
      return out;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as Element;
    const tag = el.localName;
    if (DROP.has(tag) || el.hasAttribute('hidden')) return null;
    if (page && !top && noisy(el)) return null;
    // A copied selection is out of the document: what it shows is what was selected.
    if (el.isConnected && el instanceof HTMLElement && el.checkVisibility && !el.checkVisibility({ visibilityProperty: true })) return null;
    const out = el.cloneNode(false) as Element;
    for (const { name } of Array.from(out.attributes)) if (!KEEP.has(name)) out.removeAttribute(name);
    if (el instanceof HTMLAnchorElement && el.hasAttribute('href')) out.setAttribute('href', el.href);
    if (el instanceof HTMLImageElement) {
      // A lazy image keeps its picture in a data- attribute until it scrolls into view.
      const lazy = el.getAttribute('data-src') ?? el.getAttribute('data-original') ?? el.getAttribute('data-lazy-src');
      const shown = el.currentSrc || el.src;
      const src = !shown || shown.startsWith('data:') ? (lazy ? new URL(lazy, document.baseURI).href : shown) : shown;
      if (src) out.setAttribute('src', src);
    }
    if (el instanceof HTMLInputElement && el.type === 'checkbox' && el.checked) out.setAttribute('checked', '');
    for (const child of Array.from(el.childNodes)) {
      const next = copy(child, page);
      if (next) out.append(next);
    }
    return out;
  };

  const title = (document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content || document.title || location.hostname).trim();
  const box = document.createElement('div');

  const selection = getSelection();
  if (selection && !selection.isCollapsed && selection.toString().trim()) {
    for (let at = 0; at < selection.rangeCount; at += 1) {
      const range = selection.getRangeAt(at);
      const common = range.commonAncestorContainer;
      const host = common instanceof Element ? common : common.parentElement;
      // A selection inside a code block, a heading, a quote or a link keeps being one.
      const inside = host?.closest('pre') ?? host?.closest('code, h1, h2, h3, h4, h5, h6, a, blockquote');
      const part = copy(range.cloneContents(), false);
      if (!part) continue;
      const wrap = inside ? (copy(inside.cloneNode(false), false) as Element | null) : null;
      if (wrap) {
        wrap.append(part);
        box.append(wrap);
      } else box.append(part);
    }
    return { title, url: location.href, html: box.innerHTML.slice(0, MAX), selection: true };
  }
  if (selectionOnly) return { title, url: location.href, html: '', selection: true };

  // The main text: the candidate with the most text that is not links, then the
  // deepest one inside it that still holds most of that text.
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'article, main, [role="main"], [itemprop="articleBody"], .post-content, .entry-content, .article-content, .article-body, .post-body, .markdown-body, #content, #main, .content',
    ),
  );
  const scoreOf = (el: HTMLElement): number => {
    const text = el.innerText.length;
    let links = 0;
    for (const a of Array.from(el.querySelectorAll('a'))) links += a.innerText.length;
    return text > 0 ? text * (1 - links / text) : 0;
  };
  const scored = candidates.map((el) => ({ el, score: scoreOf(el) })).sort((a, b) => b.score - a.score);
  let root: HTMLElement = document.body;
  const best = scored[0];
  if (best && best.score >= 250) {
    root = best.el;
    for (const { el, score } of scored) if (score >= best.score * 0.66 && root.contains(el) && el !== root) root = el;
  }
  const content = copy(root, true, true) as Element | null;
  return { title, url: location.href, html: (content?.innerHTML ?? '').slice(0, MAX), selection: false };
}

/** The text of the link or the description of the image the context menu was opened on. */
export function describe(kind: 'link' | 'image', url: string): string {
  if (kind === 'link') {
    const link = Array.from(document.querySelectorAll('a')).find((a) => a.href === url);
    return (link?.innerText ?? '').replace(/\s+/g, ' ').trim();
  }
  const image = Array.from(document.images).find((img) => img.currentSrc === url || img.src === url);
  return (image?.alt || image?.title || '').replace(/\s+/g, ' ').trim();
}
