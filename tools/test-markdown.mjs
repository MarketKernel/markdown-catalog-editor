/**
 * Checks the vault-specific Markdown syntax: `![[image]]` embeds and the wiki
 * links they must not be confused with.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { outputFiles } = await build({
  entryPoints: [join(root, 'src/markdown.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const markdown = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text, 'utf8').toString('base64')}`);
const md = markdown.createMarkdown();

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  if (actual === expected) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`FAIL  ${name}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
}

const inline = (text) => md.renderInline(text);

check(
  'image embed',
  inline('![[image-1.png]]'),
  '<img class="embed" src="" alt="image-1.png" data-embed="image-1.png">',
);
check(
  'embed with a width',
  inline('![[photo.JPG|300]]'),
  '<img class="embed" src="" alt="photo.JPG" data-embed="photo.JPG" width="300">',
);
check(
  'embed with a caption',
  inline('![[chart.svg|Sales & costs]]'),
  '<img class="embed" src="" alt="Sales &amp; costs" data-embed="chart.svg">',
);
check(
  'embed inside text',
  inline('before ![[a b.png]] after'),
  'before <img class="embed" src="" alt="a b.png" data-embed="a b.png"> after',
);
check(
  'a note embed stays a wiki link',
  inline('![[Other note]]'),
  '!<a class="wikilink" href="#" data-wiki="Other note">Other note</a>',
);
check(
  'a plain wiki link is untouched',
  inline('[[image-1.png]]'),
  '<a class="wikilink" href="#" data-wiki="image-1.png">image-1.png</a>',
);
check(
  'a regular image still resolves against the note',
  inline('![alt](pics/x.png)'),
  '<img src="" alt="alt" data-asset="pics/x.png">',
);
check('unclosed embed is text', inline('![[image.png'), '![[image.png');
check(
  'a fenced block is labelled with its language',
  md.render('```sh\necho hi\n```').startsWith('<div class="code-block" data-lang="Bash"><pre><code class="language-sh">'),
  true,
);
const label = (tag) => md.render('```' + tag + '\nx\n```').match(/data-lang="([^"]*)"/)?.[1];
check('an alias shows the full name', label('ts'), 'TypeScript');
check('C# keeps its symbol', label('cs'), 'C#');
check('html is not "HTML, XML"', label('html'), 'HTML');
check('toml is not "TOML, also INI"', label('toml'), 'TOML');
check('an unknown language keeps its tag', label('mermaid'), 'mermaid');
check(
  'a fence without a language gets no label',
  md.render('```\nplain\n```'),
  '<pre><code>plain\n</code></pre>\n',
);

const render = (text) => md.render(text).replace(/<svg[^]*?<\/svg>/g, '<svg>');
check(
  'callout with a title-less marker',
  render('> [!note]\n> **Disks**\n> Vault_A'),
  '<blockquote class="callout" data-callout="note">\n<div class="callout-title"><svg><span class="callout-title-text">Note</span></div>\n<p><strong>Disks</strong><br>\nVault_A</p>\n</blockquote>\n',
);
check(
  'foldable callout with an alias and a Markdown title',
  render('> [!Caution]- Mind *this*\n> body'),
  '<details class="callout" data-callout="warning">\n<summary class="callout-title"><svg><span class="callout-title-text">Mind <em>this</em></span></summary>\n<p>body</p>\n</details>\n',
);
check('an unknown type looks like a note', render('> [!disks] Drives').includes('data-callout="note"><div') || render('> [!disks] Drives').includes('data-callout="note">'), true);
check('an unknown type keeps its name as the title', render('> [!disks]').includes('>Disks</span>'), true);
check('a plain quote stays a quote', md.render('> [x] plain'), '<blockquote>\n<p>[x] plain</p>\n</blockquote>\n');

console.log(`${passed} checks passed${failed ? `, ${failed} failed` : ''}`);
if (failed) process.exit(1);
