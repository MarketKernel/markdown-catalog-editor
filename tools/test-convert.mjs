/**
 * What the "Send to Markdown" extension makes of a web page, in headless
 * Chrome, which has the DOM it needs: HTML → Markdown
 * (src/extension/to-markdown.ts) case by case, and grab.ts on a page served
 * here — the article without the site's frame around it, a selection,
 * addresses made absolute.
 *
 * Needs a local Chrome (or `CHROME=/path/to/chrome`); not the build.
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { CHROME, startChrome } from './chrome.mjs';
import { checker, root } from './load.mjs';

if (!CHROME) {
  console.log('No Chrome found — set CHROME=/path/to/chrome. Skipping the converter tests.');
  process.exit(0);
}

const { check, done } = checker();


const bundle = async (entry, globalName) =>
  (
    await build({
      entryPoints: [join(root, entry)],
      bundle: true,
      format: 'iife',
      globalName,
      target: 'es2022',
      write: false,
      logLevel: 'silent',
    })
  ).outputFiles[0].text;
const converter = await bundle('src/extension/to-markdown.ts', '__toMarkdown');
const grabber = await bundle('src/extension/grab.ts', '__grab');

const ARTICLE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>The article — Site</title>
<meta property="og:title" content="The article"></head><body>
<header><nav><a href="/">Home</a> <a href="/about">About</a></nav></header>
<div class="layout">
  <aside class="sidebar"><p>Sidebar links and other things that are not the article at all.</p></aside>
  <main><article>
    <h1>The article</h1>
    <p>First paragraph with a <a href="../other.html">relative link</a> and <strong>bold</strong> words, long enough to be the text of the page and not a menu.</p>
    <p hidden>Hidden paragraph.</p>
    <p style="display:none">Not shown either.</p>
    <img data-src="/img/lazy.png" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Lazy">
    <pre class="language-python"><code>print("hi")\nprint("there")</code></pre>
    <ul><li>One point that says something</li><li>Another point, with more words in it</li></ul>
    <div class="share-buttons"><a href="https://social.example/share">Share this</a></div>
    <p>Last paragraph, also long enough to count for something in the score of the article element.</p>
    <script>document.write('')</script>
  </article></main>
</div>
<footer><p>Copyright and the like.</p></footer>
</body></html>`;

const server = createServer((req, res) => {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(ARTICLE);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const chrome = await startChrome();
try {
  const [tab] = (await chrome.targets()).filter((t) => t.type === 'page');
  const s = await chrome.attach(tab.targetId, 'page');
  await chrome.send('Page.enable', {}, s);
  await chrome.send('Page.navigate', { url: `${base}/blog/post.html` }, s);
  await chrome.until(s, `document.readyState === 'complete'`);
  await chrome.evaluate(s, `${converter};${grabber};true`);
  const md = (html, from = 'https://example.com/a/b') => chrome.evaluate(s, `__toMarkdown.htmlToMarkdown(${JSON.stringify(html)}, ${JSON.stringify(from)})`);

  check('heading and paragraph', await md('<h1>Title</h1><p>Some <b>bold</b> and <i>italic</i> text.</p>'), '# Title\n\nSome **bold** and *italic* text.');
  check('marks in the text are escaped', await md('<p>2 * 3, [x], _a_, snake_case, `tick`, &lt;b&gt;, ~~no~~, ==no==, &amp;amp;</p>'), '2 \\* 3, \\[x\\], \\_a\\_, snake_case, \\`tick\\`, \\<b>, \\~\\~no\\~\\~, \\=\\=no\\=\\=, \\&amp;');
  check('line starts are escaped', await md('<p># not a heading</p><p>1. not a list</p><p>- not one either</p><p>&gt; nor a quote</p>'), '\\# not a heading\n\n1\\. not a list\n\n\\- not one either\n\n\\> nor a quote');
  check('page HTML stays text', await md('<p>&lt;img src=x onerror=alert(1)&gt;</p>'), '\\<img src=x onerror=alert(1)>');
  check(
    'links: absolute; anchors and scripts as text',
    await md('<p><a href="/x">rel</a>, <a href="#top">anchor</a>, <a href="javascript:void 0">js</a>, <a href="https://y.org/a b">space</a></p>'),
    '[rel](https://example.com/x), anchor, js, [space](https://y.org/a%20b)',
  );
  check('link spaces outside the brackets', await md('<p>see<a href="/x"> here </a>now</p>'), 'see [here](https://example.com/x) now');
  check('image: absolute, alt escaped', await md('<p><img src="i.png" alt="An [image]"></p>'), '![An \\[image\\]](https://example.com/a/i.png)');
  check('image: placeholders and pixels left out', await md('<p>a<img src="data:image/gif;base64,R0lG">b<img src="/t.gif" width="1" height="1">c</p>'), 'abc');
  check('image inside a link', await md('<a href="/big.png"><img src="/small.png" alt="pic"></a>'), '[![pic](https://example.com/small.png)](https://example.com/big.png)');
  check(
    'lists: nested, numbered from start',
    await md('<ul><li>one</li><li>two<ul><li>inner</li></ul></li></ul><ol start="3"><li>c</li><li>d</li></ol>'),
    '- one\n- two\n  - inner\n\n3. c\n4. d',
  );
  check('lists: tasks', await md('<ul><li><input type="checkbox" checked> done</li><li><input type="checkbox"> todo</li></ul>'), '- [x] done\n- [ ] todo');
  check('lists: paragraphs make a loose list', await md('<ol><li><p>a</p><p>more</p></li><li><p>b</p></li></ol>'), '1. a\n\n   more\n\n2. b');
  check('code block with its language', await md('<pre><code class="language-js">const a = 1;\nif (a) {}\n</code></pre>'), '```js\nconst a = 1;\nif (a) {}\n```');
  check('code block: GitHub\'s wrapper names it', await md('<div class="highlight highlight-source-python"><pre>print(1)</pre></div>'), '```python\nprint(1)\n```');
  check('code block: lines as <br> and <div>', await md('<pre>a<br>b</pre><pre><div>c</div><div>d</div></pre>'), '```\na\nb\n```\n\n```\nc\nd\n```');
  check('code block: a longer fence around fences', await md('<pre>```\nx\n```</pre>'), '````\n```\nx\n```\n````');
  check('inline code: a fence past its backticks', await md('<p><code>a`b</code> and <kbd>Ctrl</kbd></p>'), '``a`b`` and `Ctrl`');
  check('quote', await md('<blockquote><p>q1</p><p>q2</p></blockquote>'), '> q1\n>\n> q2');
  check(
    'table: header, | escaped, breaks as <br>',
    await md('<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1|2</td><td>x<br>y</td></tr><tr><td colspan="2">wide</td></tr></tbody></table>'),
    '| A | B |\n| --- | --- |\n| 1\\|2 | x<br>y |\n| wide |  |',
  );
  check('table for layout: its cells, in turn', await md('<table><tr><td><h2>Side</h2></td><td><p>Main</p></td></tr></table>'), '## Side\n\nMain');
  check('line breaks; two in a row split the paragraph', await md('<p>a<br>b<br><br>c</p>'), 'a\\\nb\n\nc');
  check('strikethrough and highlight', await md('<p><del>x</del> <mark>y</mark> <s>z</s></p>'), '~~x~~ ==y== ~~z~~');
  check('spaces go outside the marks', await md('<p>a<b> bold </b>c<em></em>d</p>'), 'a **bold** cd');
  check('the same mark nested is one', await md('<p><b>a <strong>b</strong></b></p>'), '**a b**');
  check('scripts and styles are no text', await md('<p>x<script>alert(1)</script></p><style>p{}</style><noscript>n</noscript>'), 'x');
  check('a card: a link around blocks', await md('<a href="/post"><div><h2>Post</h2><p>Desc</p></div></a>'), '## Post\n\nDesc');
  check('text beside blocks becomes paragraphs', await md('<div>loose <b>text</b><p>para</p>tail</div>'), 'loose **text**\n\npara\n\ntail');
  check('divider and terms', await md('<hr><dl><dt>Term</dt><dd>Meaning</dd></dl>'), '---\n\n**Term**\n\nMeaning');
  check('non-breaking spaces and runs of them', await md('<p>a&nbsp;&nbsp; b\n\n c</p>'), 'a b c');

  // The grabber, on the page served above
  const page = await chrome.evaluate(s, `__grab.grab(false)`);
  check('grab: the title from og:title', page.title, 'The article');
  check('grab: the address', page.url, `${base}/blog/post.html`);
  check('grab: the page, not a selection', page.selection, false);
  const fromPage = await md(page.html, page.url);
  check('grab: the article is there', fromPage.startsWith('# The article\n\nFirst paragraph with a [relative link](' + `${base}/other.html) and **bold** words`), true);
  check('grab: the code block keeps its language', fromPage.includes('```python\nprint("hi")\nprint("there")\n```'), true);
  check('grab: the lazy image by its real address', fromPage.includes(`![Lazy](${base}/img/lazy.png)`), true);
  check(
    'grab: no menu, sidebar, footer, share buttons or hidden text',
    ['Home', 'Sidebar', 'Copyright', 'Share this', 'Hidden paragraph', 'Not shown'].filter((text) => fromPage.includes(text)),
    [],
  );
  check('grab: the list', fromPage.includes('- One point that says something\n- Another point, with more words in it'), true);

  await chrome.evaluate(s, `(() => { const r = document.createRange(); const code = document.querySelector('pre code').firstChild; r.setStart(code, 0); r.setEnd(code, 11); getSelection().removeAllRanges(); getSelection().addRange(r); return true; })()`);
  const picked = await chrome.evaluate(s, `__grab.grab(true)`);
  check('grab: a selection', picked.selection, true);
  check('grab: a selection in a code block stays code', await md(picked.html, picked.url), '```python\nprint("hi")\n```');
  await chrome.evaluate(s, `(() => { const r = document.createRange(); r.selectNodeContents(document.querySelector('article p')); getSelection().removeAllRanges(); getSelection().addRange(r); return true; })()`);
  const paragraph = await md((await chrome.evaluate(s, `__grab.grab(true)`)).html, page.url);
  check('grab: a selected paragraph, its link absolute', paragraph.startsWith(`First paragraph with a [relative link](${base}/other.html)`), true);
  await chrome.evaluate(s, `getSelection().removeAllRanges(), true`);
  check('grab: the selection item with nothing selected', (await chrome.evaluate(s, `__grab.grab(true)`)).html, '');
  check('describe: a link\'s text', await chrome.evaluate(s, `__grab.describe('link', ${JSON.stringify(`${base}/about`)})`), 'About');
  check('describe: an image\'s description', await chrome.evaluate(s, `__grab.describe('image', document.images[0].src)`), 'Lazy');
  check('no errors in the page', chrome.errors, []);
} finally {
  await chrome.close();
  server.close();
}

done('convert');
