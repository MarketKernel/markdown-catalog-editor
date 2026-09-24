/**
 * Checks that a document splits into the blocks the live-preview editor expects:
 * one chunk per list, fence or table, and never a lost character.
 */
import { transform } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import MarkdownIt from 'markdown-it';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, 'src/blocks.ts'), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const blocks = await import(`data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`);

const md = new MarkdownIt({ html: true, linkify: true });

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) {
    passed += 1;
  } else {
    failed += 1;
    console.error(`FAIL  ${name}\n  expected: ${b}\n  actual:   ${a}`);
  }
}

const kinds = (text) => blocks.splitBlocks(md, text).map((block) => block.kind);
const texts = (text) => blocks.splitBlocks(md, text).map((block) => block.text);

check('heading and paragraph', kinds('# Heading\n\nText.'), ['heading', 'paragraph']);
check('heading level', blocks.splitBlocks(md, '### Three').map((b) => b.level), [3]);

check(
  'a list is one block',
  texts('- one\n- two\n- three'),
  ['- one\n- two\n- three'],
);
check(
  'a loose list stays one block',
  kinds('1. one\n\n2. two\n\n3. three'),
  ['list'],
);
check(
  'a code block with a blank line inside',
  texts('```js\nconst a = 1;\n\nconst b = 2;\n```'),
  ['```js\nconst a = 1;\n\nconst b = 2;\n```'],
);
check(
  'a table is one block',
  kinds('| a | b |\n| - | - |\n| 1 | 2 |'),
  ['table'],
);
check('quote', kinds('> quote\n> second line'), ['quote']);
check('horizontal rule', kinds('text\n\n---\n\nmore'), ['paragraph', 'hr', 'paragraph']);
check('front matter', kinds('---\ntitle: Test\n---\n\n# Hello'), ['frontmatter', 'heading']);
check('empty document', kinds(''), ['blank']);

// Blank lines: only a line with blank lines on both sides is a block of its own.
check('one gap line is no block', kinds('A\n\nB'), ['paragraph', 'paragraph']);
check('two gap lines are no block', kinds('A\n\n\nB'), ['paragraph', 'paragraph']);
check('the middle of three is', kinds('A\n\n\n\nB'), ['paragraph', 'blank', 'paragraph']);
check('the final newline is no line', kinds('A\n'), ['paragraph']);
check('a blank line before it is', kinds('A\n\n\n'), ['paragraph', 'blank']);
check('blank lines at the top', kinds('\n\nA'), ['blank', 'paragraph']);
check('blank lines inside a fence stay in it', kinds('```\na\n\n\n\nb\n```'), ['code']);

check('link definitions get a block', kinds('[a]: https://x.org\n\nSee [a].'), ['definition', 'paragraph']);
const env = {};
blocks.splitBlocks(md, '[a]: https://x.org\n\nSee [a].', env);
check('link definitions reach the env', Object.keys(env.references ?? {}), ['A']);

check('offsets', blocks.splitBlocks(md, 'one\n\ntwo\n\n\n\n# three').map((b) => b.from), [0, 5, 10, 12]);

// Blocks are line ranges over the original text, so nothing may be lost or reordered.
for (const sample of [
  '# A\n\ntext\n\n- one\n- two\n\n```sh\nls -la\n```\n\n> quote\n\ntail\n',
  'Just a paragraph and nothing else',
  '---\nkey: value\n---\n\nBody\n\n## Section\n\n| a | b |\n| - | - |\n| 1 | 2 |\n',
]) {
  const lines = sample.split('\n');
  const parts = blocks.splitBlocks(md, sample);
  let ok = true;
  let previousEnd = 0;
  for (const block of parts) {
    if (block.start < previousEnd) ok = false;
    if (block.text !== lines.slice(block.start, block.end).join('\n')) ok = false;
    previousEnd = block.end;
  }
  // Every non-blank line must live inside some block.
  for (let index = 0; index < lines.length; index += 1) {
    if ((lines[index] ?? '').trim() === '') continue;
    if (!parts.some((block) => index >= block.start && index < block.end)) ok = false;
  }
  check(`coverage: ${JSON.stringify(sample.slice(0, 18))}…`, ok, true);
}

check('caret: a word inside bold text', blocks.sourceOffsetFor('**bold** text', 'bold'), 6);
check('caret: heading', blocks.sourceOffsetFor('## Section', 'Sect'), 7);
check('caret: start', blocks.sourceOffsetFor('- item', ''), 0);

console.log(`${passed} checks passed${failed ? `, ${failed} failed` : ''}`);
if (failed) process.exit(1);
