/**
 * The HTML export: a page per note with relative links that hold, a front
 * page, the tags as pages and an index, heading anchors, and a template that
 * must keep the placeholders a page cannot do without.
 */
import { checker, load } from './load.mjs';

const { check, done } = checker();
const E = await load('export', 'markdown', 'i18n');
const md = E.createMarkdown();

const site = (overrides = {}) =>
  E.buildSite({
    md,
    name: 'Notes',
    notes: [
      { path: 'Home.md', text: '# Home\n\nFirst paragraph, the description.\n\nSee [[Deep note]] and [the guide](docs/Guide.md#setup).', tags: ['idea'] },
      { path: 'docs/Guide.md', text: 'Intro line.\n\n## Setup\n\n## Setup\n\n![[shot.png|300]] ![alt](../pic.png)\n\n- [x] done\n\n[[Missing]] [[Home#Nope]]', tags: ['work/alpha', 'idea'] },
      { path: 'docs/Deep note.md', text: '---\ntitle: x\n---\n\nText.', tags: [] },
      { path: 'Note.txt', text: 'Plain.', tags: [] },
      { path: 'Note.md', text: 'Also.', tags: [] },
    ],
    template: E.DEFAULT_TEMPLATE,
    includeTags: true,
    titles: true,
    fullWidth: false,
    singlePage: false,
    lang: 'en',
    ...overrides,
  });

const files = site();
const paths = files.map((file) => file.path);
const page = (path) => files.find((file) => file.path === path)?.data;
const body = (html) => html.split('<body>')[1];

check('every file once', new Set(paths).size, paths.length);
check('pages, tags, the stylesheet and the script', paths.slice().sort(), [
  'Home.html', 'Note.html', 'Note.txt.html', 'docs/Deep note.html', 'docs/Guide.html',
  'index.html', 'search.js', 'site.js', 'style.css', 'tags/idea.html', 'tags/index.html', 'tags/work.html', 'tags/work/alpha.html',
]);
const builder = new E.SiteBuilder({
  md, name: 'N', template: E.DEFAULT_TEMPLATE, includeTags: true, titles: true, fullWidth: false, singlePage: false, lang: 'en',
  notes: [{ path: 'a.md', text: 'A', tags: ['x'] }, { path: 'b/c.md', text: 'C', tags: ['x/y'] }],
});
check('the count is what the files come to', builder.count, Array.from(builder.files()).length);
const singleBuilder = new E.SiteBuilder({
  md, name: 'N', template: E.DEFAULT_TEMPLATE, includeTags: true, titles: true, fullWidth: false, singlePage: true, lang: 'en',
  notes: [{ path: 'a.md', text: 'A', tags: ['x'] }, { path: 'b/c.md', text: 'C', tags: ['x/y'] }],
});
check('the count of a single page: its steps', singleBuilder.count, Array.from(singleBuilder.files()).length);

const home = page('Home.html');
check('the note is rendered', home.includes('<p>First paragraph, the description.</p>'), true);
check('a note that opens with its own name gets no second heading', home.includes('<h1 class="page-title">'), false);
check('a note\'s own heading becomes the title, its id kept', home.includes('<h1 class="page-title" id="home">Home</h1>'), true);
check('one h1 on a note page', home.match(/<h1[ >]/g).length, 1);
check('the tags come under the title', home.indexOf('<p class="page-tags">') > home.indexOf('<h1 class="page-title" id="home">'), true);
check('the text follows the title', home.split('<h1 class="page-title" id="home">Home</h1>')[1].includes('<p>First paragraph, the description.</p>'), true);
const titlesOff = site({ titles: false });
check('titles off: a note\'s own heading is still its title', titlesOff.find((file) => file.path === 'Home.html').data.includes('<h1 class="page-title" id="home">Home</h1>'), true);
check('titles off: no name added above a note without it', titlesOff.find((file) => file.path === 'docs/Guide.html').data.includes('page-title'), false);
check('description from the first paragraph', home.includes('<meta name="description" content="First paragraph, the description.">'), true);
check('the title', home.includes('<title>Home — Notes</title>'), true);
check('a wiki link points at the page', home.includes('<a class="wikilink" href="docs/Deep%20note.html">Deep note</a>'), true);
check('a markdown link is rewritten with its anchor', home.includes('href="docs/Guide.html#setup"'), true);
check('the note is current in the nav', home.includes('<a href="Home.html" aria-current="page">Home</a>'), true);
check('folders are details with their path', home.includes('<li class="nav-dir"><details open data-dir="docs"><summary>docs</summary>'), true);
check('only one page is current', home.match(/aria-current/g).length, 1);
check('the tree buttons wait for the script', home.includes('<span class="tree-tools" hidden><button class="tree-tool" type="button" data-tree="expand"'), true);
check('the search waits for the script', home.includes('<div class="nav-search" hidden><input type="search" placeholder="Search the notes"'), true);
check('the script is linked from the head', home.includes('<script src="site.js"></script>\n</head>'), true);
check('the stylesheet is linked on a site', home.includes('<link rel="stylesheet" href="style.css">'), true);
check('the theme button beside the name', home.includes('<a class="site-name" href="index.html">Notes</a>\n      <button class="theme-toggle"'), true);
check('a column by default', home.includes('<html lang="en" data-width="column">'), true);
check('tags on the page', home.includes('<p class="page-tags"><a class="tag" href="tags/idea.html">#idea</a></p>'), true);
check('the tag tree in the sidebar', home.includes('<nav class="tag-nav" aria-label="Tags"><h2 class="nav-heading"><a href="tags/index.html">Tags</a></h2>'), true);
check('no inline script on any page', files.some((file) => file.path.endsWith('.html') && /<script>/i.test(file.data)), false);
check('the script loads the index the site has', ['search.js', 'macaedSearch'].every((name) => page('site.js').includes(`${name}`)) && E.SEARCH_FILE === 'search.js' && E.SEARCH_GLOBAL === 'macaedSearch', true);
const index = (() => {
  const window = {};
  new Function('window', page('search.js'))(window);
  return window.macaedSearch;
})();
check('the search index: a note per entry, in tree order', index.map((entry) => entry.h), ['docs/Deep%20note.html', 'docs/Guide.html', 'Home.html', 'Note.html', 'Note.txt.html']);
check('the search index: plain text', index.find((entry) => entry.t === 'Home').x, 'Home First paragraph, the description. See Deep note and the guide.');
check('the search index: the folder', index.find((entry) => entry.t === 'Guide').d, 'docs');
check('the search index leaves out front matter', index.find((entry) => entry.t === 'Deep note').x, 'Text.');
check('the script is self-contained', (() => {
  try {
    new Function(page('site.js'));
    return true;
  } catch {
    return false;
  }
})(), true);

const guide = page('docs/Guide.html');
check('a note without its name on top gets a heading', guide.includes('<h1 class="page-title">Guide</h1>'), true);
check('root-relative stylesheet', guide.includes('href="../style.css"'), true);
check('the nav climbs out of the folder', guide.includes('<a href="../Home.html">Home</a>'), true);
check('duplicate headings get distinct ids', guide.includes('<h2 id="setup">Setup</h2>') && guide.includes('<h2 id="setup-2">Setup</h2>'), true);
check('an embed points at the assets folder', guide.includes('<img class="embed" src="assets/Guide/shot.png" alt="shot.png" width="300">'), true);
check('a relative image stays relative', guide.includes('src="../pic.png"'), true);
check('the script is reached from a folder', guide.includes('<script src="../site.js"></script>'), true);
check('the current page in a folder', guide.includes('<a href="Guide.html" aria-current="page">Guide</a>'), true);
check('a task is a plain checkbox', guide.includes('<input class="task" type="checkbox" disabled checked>'), true);
check('a missing note is not a link', guide.includes('<span class="wikilink wikilink--missing">Missing</span>'), true);
check('a heading link slugs the heading', guide.includes('<a class="wikilink" href="../Home.html#nope">Home</a>'), true);
check('the note tags link out of the folder', guide.includes('<a class="tag" href="../tags/work/alpha.html">#work/alpha</a>'), true);

check('front matter is left out', page('docs/Deep note.html').includes('title: x'), false);
check('a .txt beside a .md keeps its extension', page('Note.txt.html').includes('<p>Plain.</p>'), true);

const front = page('index.html');
check('the front page lists the notes', front.includes('<h1 class="page-title">Notes</h1>') && front.includes('<a href="docs/Guide.html">Guide</a>'), true);
check('the list on the front page is not remembered as the navigation', front.split('<article')[1].includes('data-dir'), false);
check('the front page lists the tags', front.includes('<h2 class="contents-heading"><a href="tags/index.html">Tags</a></h2>'), true);

const alpha = page('tags/work/alpha.html');
check('a tag page lists its notes', alpha.includes('<a class="tag-note-link" href="../../docs/Guide.html">'), true);
check('the parent tag links to its page', alpha.includes('<a class="tag-parent" href="../work.html">#work</a><span class="tag-sep">/</span>alpha'), true);
check('the note count', alpha.includes('<p class="tag-count">1 note</p>'), true);
check('the current tag is marked among the chips', alpha.includes('<a class="tag tag--current" href="alpha.html">#work/alpha</a>'), true);
const work = page('tags/work.html');
check('a parent tag counts the nested notes', work.includes('<p class="tag-count">1 note</p>'), true);
check('the tag index', page('tags/index.html').includes('<a href="work/alpha.html">alpha</a><span class="tag-count">1</span>'), true);

// Without tags
const plain = site({ includeTags: false });
check('no tag pages without tags', plain.map((file) => file.path).filter((path) => path.startsWith('tags/')), []);
check('no tag chips without tags', plain.find((file) => file.path === 'Home.html').data.includes('page-tags'), false);
check('the tags slot is empty', plain.find((file) => file.path === 'Home.html').data.includes('tag-nav'), false);

// Full width
check('full width', site({ fullWidth: true }).find((file) => file.path === 'Home.html').data.includes('data-width="full"'), true);

// A front page from a README, and the title setting off
const readme = E.buildSite({
  md, name: 'N', template: E.DEFAULT_TEMPLATE, includeTags: false, titles: false, fullWidth: false, singlePage: false, lang: 'en',
  notes: [{ path: 'README.md', text: 'Hello.', tags: [] }, { path: 'Other.md', text: '[[README]]', tags: [] }],
});
check('README is the front page', readme.map((file) => file.path).sort(), ['Other.html', 'index.html', 'search.js', 'site.js', 'style.css']);
check('no folders, no tree buttons', readme.find((file) => file.path === 'Other.html').data.includes('tree-tools'), false);
check('and it links as such', readme.find((file) => file.path === 'Other.html').data.includes('href="index.html">README</a>'), true);
check('titles off: no heading added', readme.find((file) => file.path === 'index.html').data.includes('page-title'), false);

// The template
check('the default template has what it needs', E.missingPlaceholders(E.DEFAULT_TEMPLATE, true), []);
check('missing placeholders are named', E.missingPlaceholders('<html>{{ content }}</html>', true), ['navigation', 'heading', 'tags']);
check('tags are optional without tags', E.missingPlaceholders('{{content}}{{navigation}}{{heading}}', false), []);
const custom = site({ template: '<x>{{navigation}}{{heading}}{{content}}{{tags}}{{unknown}}{{path}}</x>' });
check('an unknown placeholder is left alone', custom.find((file) => file.path === 'Home.html').data.includes('{{unknown}}Home.md</x>'), true);

// A single page
const oneOptions = { singlePage: true, assets: ['docs/assets/Guide/shot.png', 'pic.png', 'docs/pic.png', 'docs/assets/pic.png', 'assets/Home/x.png'] };
const oneBuilder = new E.SiteBuilder({
  md, name: 'Notes', template: E.DEFAULT_TEMPLATE, includeTags: true, titles: true, fullWidth: false, lang: 'en',
  notes: [
    { path: 'Home.md', text: '# Home\n\nFirst paragraph, the description.\n\nSee [[Deep note]] and [the guide](docs/Guide.md#setup).', tags: ['idea'] },
    { path: 'docs/Guide.md', text: 'Intro line.\n\n## Setup\n\n## Setup\n\n![[shot.png|300]] ![alt](../pic.png)\n\n- [x] done\n\n[[Missing]] [[Home#Nope]]', tags: ['work/alpha', 'idea'] },
    { path: 'docs/Deep note.md', text: '---\ntitle: x\n---\n\nText.', tags: [] },
    { path: 'Note.txt', text: 'Plain.', tags: [] },
    { path: 'Note.md', text: 'Also.', tags: [] },
  ],
  ...oneOptions,
});
const one = Array.from(oneBuilder.files()).filter(Boolean);
check('a single page: one file', one.map((file) => file.path), ['index.html']);
const all = one.find((file) => file.path === 'index.html').data;
check('a single page: the stylesheet inside', all.includes('<style>\n/* The exported site') && !all.includes('<link rel="stylesheet"'), true);
check('a single page: the script inside', all.includes('<script>\n(function siteScript()') && !all.includes('<script src='), true);
check('a single page: the inline script runs', (() => {
  try {
    new Function(all.split('<script>\n')[1].split('</script>')[0]);
    return true;
  } catch {
    return false;
  }
})(), true);
check('a single page: the sections carry what the search reads', all.includes('<section class="note-section" id="docs-guide" data-title="Guide" data-dir="docs">'), true);
check('a single page: the theme button', all.includes('<button class="theme-toggle" type="button" data-theme-toggle hidden title="Switch to the dark theme"'), true);
const oldTemplate = E.buildSite({
  md, name: 'N', includeTags: false, titles: true, fullWidth: false, singlePage: true, lang: 'en',
  template: '<link rel="stylesheet" href="{{root}}style.css">{{navigation}}{{heading}}{{content}}',
  notes: [{ path: 'a.md', text: 'A', tags: [] }],
});
check('a single page from a template without {{styles}}: style.css beside it', oldTemplate.map((file) => file.path).sort(), ['index.html', 'style.css']);
check('a single page: the search and the tree buttons wait for it', all.includes('<div class="nav-search" hidden>') && all.includes('<span class="tree-tools" hidden>'), true);
check('a single page: folders remembered by path', all.includes('<details open data-dir="docs">'), true);
check('a single page: images gather in assets, each note\'s own assets step dropped', oneOptions.assets.map((path) => oneBuilder.assetPath(path)), ['assets/docs/Guide/shot.png', 'assets/pic.png', 'assets/docs/pic.png', 'assets/docs/pic-2.png', 'assets/Home/x.png']);
check('a single page: a file it was not told about stays put', oneBuilder.assetPath('elsewhere/a.pdf'), 'elsewhere/a.pdf');
check('a site keeps every image where it was', new E.SiteBuilder({ md, name: 'N', template: E.DEFAULT_TEMPLATE, includeTags: false, titles: true, fullWidth: false, singlePage: false, lang: 'en', notes: [], assets: ['docs/assets/Guide/shot.png'] }).assetPath('docs/assets/Guide/shot.png'), 'docs/assets/Guide/shot.png');
check('a single page: no search index of its own', one.some((file) => file.path === 'search.js'), false);
check('a single page: the folder name is the title', all.includes('<title>Notes — Notes</title>') && all.includes('<h1 class="page-title">Notes</h1>'), true);
check('a single page: one h1', all.match(/<h1[ >]/g).length, 1);
check('a single page: a section per note, in tree order', Array.from(all.matchAll(/<section class="note-section[^"]*" id="([^"]+)" data-title/g), (m) => m[1]), ['docs-deep-note', 'docs-guide', 'home', 'note', 'note-2']);
check('a single page: the notes inside one set of parts', all.includes('<div class="note-parts">') && body(all).split('<div class="note-parts">').length, 2);
check('a single page: without an index or README, the first note at the root is home', all.includes('<section class="note-section note-section--home" id="home"'), true);
check('a single page: with no note at the root, the first is home', E.buildSite({
  md, name: 'N', template: E.DEFAULT_TEMPLATE, includeTags: false, titles: true, fullWidth: false, singlePage: true, lang: 'en',
  notes: [{ path: 'b/x.md', text: 'X', tags: [] }, { path: 'a/y.md', text: 'Y', tags: [] }],
})[0].data.includes('<section class="note-section note-section--home" id="a-y"'), true);
check('a single page: previous and next', all.includes('<nav class="part-nav"><a class="part-prev" href="#docs-deep-note" rel="prev" title="Previous note"><span class="part-label">Previous note</span><span class="part-name">Deep note</span></a><a class="part-next" href="#home" rel="next"'), true);
check('a single page: the first has no previous', all.split('id="docs-deep-note"')[1].split('</section>')[0].includes('<nav class="part-nav"><span></span><a class="part-next" href="#docs-guide"'), true);
check('a single page: the last has no next', all.split('id="note-2"')[1].split('</section>')[0].includes('<span class="part-name">Note</span></a><span></span></nav>'), true);
const withReadme = E.buildSite({
  md, name: 'N', template: E.DEFAULT_TEMPLATE, includeTags: false, titles: true, fullWidth: false, singlePage: true, lang: 'en',
  notes: [{ path: 'a.md', text: 'A', tags: [] }, { path: 'README.md', text: 'Hi', tags: [] }],
})[0].data;
check('a single page: a README at the root is home', withReadme.includes('<section class="note-section note-section--home" id="readme"'), true);
check('a single page: one note alone has no previous or next', body(E.buildSite({
  md, name: 'N', template: E.DEFAULT_TEMPLATE, includeTags: false, titles: true, fullWidth: false, singlePage: true, lang: 'en',
  notes: [{ path: 'a.md', text: 'A', tags: [] }],
})[0].data).includes('part-nav'), false);
check('a single page: the table of contents links to the sections', all.includes('<a href="#docs-guide">Guide</a>'), true);
check('a single page: a note\'s own h1 goes a level down to be its title, its id prefixed', all.includes('<h2 class="note-title" id="home-home">Home</h2>'), true);
check('a single page: the name above a note without it', all.includes('<section class="note-section" id="docs-guide" data-title="Guide" data-dir="docs"><h2 class="note-title">Guide</h2>'), true);
check('a single page: headings a level down, ids kept apart', all.includes('<h3 id="docs-guide-setup">Setup</h3>') && all.includes('<h3 id="docs-guide-setup-2">Setup</h3>'), true);
check('a single page: a link to a heading in another note', all.includes('href="#docs-guide-setup"'), true);
check('a single page: a wiki link to a note', all.includes('<a class="wikilink" href="#docs-deep-note">Deep note</a>'), true);
check('a single page: a wiki link to a heading', all.includes('<a class="wikilink" href="#home-nope">Home</a>'), true);
check('a single page: embeds from assets', all.includes('src="assets/docs/Guide/shot.png"'), true);
check('a single page: a relative image from assets', all.includes('src="assets/pic.png"'), true);
check('a single page: tag chips link to the tags section', all.includes('<a class="tag" href="#tag-work-alpha">#work/alpha</a>'), true);
check('a single page: the tags section', all.includes('<section class="note-section tags-section" id="tags"><h2 class="note-title">Tags</h2>'), true);
check('a single page: a heading per tag', all.includes('<h3 class="tag-heading" id="tag-work-alpha">#work/alpha</h3>'), true);
check('a single page: a tag lists its notes as anchors', all.includes('<a class="tag-note-link" href="#docs-guide">'), true);
check('a single page: the tag tree links to anchors', all.includes('<nav class="tag-nav" aria-label="Tags"><h2 class="nav-heading"><a href="#tags">Tags</a></h2>'), true);
check('a single page: no current page marked', body(all).includes('aria-current'), false);
check('a single page: the description from the home note', all.includes('<meta name="description" content="First paragraph, the description.">'), true);
check('a single page: the count is its steps', oneBuilder.count, Array.from(oneBuilder.files()).length);
const oneNoTags = site({ singlePage: true, includeTags: false }).find((file) => file.path === 'index.html').data;
check('a single page without tags: no tags section', body(oneNoTags).includes('tags-section') || body(oneNoTags).includes('page-tags'), false);
const oneNoTitles = site({ singlePage: true, titles: false }).find((file) => file.path === 'index.html').data;
check('a single page, titles off: no names added', oneNoTitles.includes('<h2 class="note-title">Guide</h2>'), false);
const hashes = E.buildSite({
  md, name: 'N', template: E.DEFAULT_TEMPLATE, includeTags: false, titles: true, fullWidth: false, singlePage: true, lang: 'en',
  notes: [{ path: 'a.md', text: '## Part one\n\n[back](#part-one) [[#Part one]]', tags: [] }],
}).find((file) => file.path === 'index.html').data;
check('a single page: an anchor within the note', hashes.includes('<a href="#a-part-one">back</a>'), true);
check('a single page: a wiki link within the note', hashes.includes('<a class="wikilink" href="#a-part-one">'), true);

// Paths
check('relative: same folder', E.relative('a/b.html', 'a/c.html'), 'c.html');
check('relative: up and down', E.relative('a/b/c.html', 'x/y z.html'), '../../x/y%20z.html');
check('relative: from the root', E.relative('index.html', 'tags/index.html'), 'tags/index.html');
check('root of a nested page', E.rootOf('a/b/c.html'), '../../');
check('slug', E.slugify('  Hello, Wörld — 2nd try! '), 'hello-wörld-2nd-try');

done('export');
