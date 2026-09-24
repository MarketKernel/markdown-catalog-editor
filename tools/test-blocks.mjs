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
    console.error(`FAIL  ${name}\n  ожидалось: ${b}\n  получено:  ${a}`);
  }
}

const kinds = (text) => blocks.splitBlocks(md, text).map((block) => block.kind);
const texts = (text) => blocks.splitBlocks(md, text).map((block) => block.text);

check('заголовок и абзац', kinds('# Заголовок\n\nТекст.'), ['heading', 'paragraph']);
check('уровень заголовка', blocks.splitBlocks(md, '### Три').map((b) => b.level), [3]);

check(
  'список — один блок',
  texts('- один\n- два\n- три'),
  ['- один\n- два\n- три'],
);
check(
  'свободный список остаётся одним блоком',
  kinds('1. один\n\n2. два\n\n3. три'),
  ['list'],
);
check(
  'код-блок с пустой строкой внутри',
  texts('```js\nconst a = 1;\n\nconst b = 2;\n```'),
  ['```js\nconst a = 1;\n\nconst b = 2;\n```'],
);
check(
  'таблица — один блок',
  kinds('| a | b |\n| - | - |\n| 1 | 2 |'),
  ['table'],
);
check('цитата', kinds('> цитата\n> вторая строка'), ['quote']);
check('горизонтальная линия', kinds('текст\n\n---\n\nещё'), ['paragraph', 'hr', 'paragraph']);
check('front matter', kinds('---\ntitle: Тест\n---\n\n# Привет'), ['frontmatter', 'heading']);
check('пустой документ', kinds(''), ['paragraph']);

// Blocks are line ranges over the original text, so nothing may be lost or reordered.
for (const sample of [
  '# A\n\nтекст\n\n- раз\n- два\n\n```sh\nls -la\n```\n\n> цитата\n\nхвост\n',
  'Просто абзац без ничего',
  '---\nkey: value\n---\n\nТело\n\n## Раздел\n\n| a | b |\n| - | - |\n| 1 | 2 |\n',
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
  check(`покрытие: ${JSON.stringify(sample.slice(0, 18))}…`, ok, true);
}

// Offsets
const lines = blocks.splitLines('раз\nдва\nтри');
const offsets = blocks.lineOffsets(lines);
check('смещения строк', offsets, [0, 4, 8, 11]);
check('строка по смещению 0', blocks.lineAtOffset(offsets, 0), 0);
check('строка по смещению 5', blocks.lineAtOffset(offsets, 5), 1);
check('строка по смещению 10', blocks.lineAtOffset(offsets, 10), 2);

check('каретка: слово в жирном тексте', blocks.sourceOffsetFor('**жирный** текст', 'жирны'), 7);
check('каретка: заголовок', blocks.sourceOffsetFor('## Раздел', 'Разд'), 7);
check('каретка: начало', blocks.sourceOffsetFor('- пункт', ''), 0);

console.log(`${passed} проверок пройдено${failed ? `, ${failed} провалено` : ''}`);
if (failed) process.exit(1);
