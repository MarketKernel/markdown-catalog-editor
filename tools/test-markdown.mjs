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

console.log(`${passed} checks passed${failed ? `, ${failed} failed` : ''}`);
if (failed) process.exit(1);
