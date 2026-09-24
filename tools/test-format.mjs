/** Checks the toolbar transforms: wrapping, list markers, indentation, Enter. */
import { transform } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, 'src/format.ts'), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const f = await import(`data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`);

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) passed += 1;
  else {
    failed += 1;
    console.error(`FAIL  ${name}\n  ожидалось: ${b}\n  получено:  ${a}`);
  }
}

/** `text|word|tail` — the bars mark the selection. */
function sel(marked) {
  const start = marked.indexOf('|');
  const end = marked.indexOf('|', start + 1);
  return { value: marked.replace(/\|/g, ''), start, end: end < 0 ? start : end - 1 };
}
function show(result) {
  const { value, start, end } = result;
  return value.slice(0, start) + '|' + value.slice(start, end) + '|' + value.slice(end);
}

check('жирный', show(f.toggleInline(sel('раз |два| три'), 'bold')), 'раз **|два|** три');
check('жирный снимается', show(f.toggleInline(sel('раз |**два**| три'), 'bold')), 'раз |два| три');
check('жирный снимается снаружи', show(f.toggleInline(sel('раз **|два|** три'), 'bold')), 'раз |два| три');
check('курсив по слову под кареткой', show(f.toggleInline(sel('раз дв|а три'), 'italic')), 'раз *|два|* три');
check('выделение цветом', show(f.toggleInline(sel('|важно|'), 'mark')), '==|важно|==');
check('моноширинный', show(f.toggleInline(sel('|kod|'), 'code')), '`|kod|`');

check('ссылка из текста', show(f.makeLink(sel('|Anthropic|'))), '[Anthropic](||)');
check('ссылка из URL', show(f.makeLink(sel('|https://example.org|'))), '[||](https://example.org)');
check('вики-ссылка', show(f.makeWikiLink(sel('|Заметка|'))), '[[|Заметка|]]');

check('цвет текста', f.colorize(sel('|важно|'), 'color:#c00').value, '<span style="color:#c00">важно</span>');
check('цвет снимается', f.colorize(sel('|<span style="color:#c00">важно</span>|'), '').value, 'важно');

check('заголовок', f.setHeading(sel('Текст|'), 2).value, '## Текст');
check('заголовок меняет уровень', f.setHeading(sel('## Текст|'), 3).value, '### Текст');
check('заголовок снимается', f.setHeading(sel('## Текст|'), 2).value, 'Текст');
check('заголовок сбрасывается', f.setHeading(sel('### Текст|'), 0).value, 'Текст');

check('маркированный список', f.toggleBullet(sel('|раз\nдва|')).value, '- раз\n- два');
check('список снимается', f.toggleBullet(sel('|- раз\n- два|')).value, 'раз\nдва');
check('нумерованный список', f.toggleOrdered(sel('|раз\nдва|')).value, '1. раз\n2. два');
check('чекбокс из пункта', f.toggleTask(sel('|- раз|')).value, '- [ ] раз');
check('чекбокс снимается', f.toggleTask(sel('|- [x] раз|')).value, '- раз');
check('цитата', f.toggleQuote(sel('|раз\nдва|')).value, '> раз\n> два');
check('цитата снимается', f.toggleQuote(sel('|> раз\n> два|')).value, 'раз\nдва');

check('отступ списка', f.indent(sel('- раз|')).value, '  - раз');
check('отступ в тексте — табуляция', f.indent(sel('текст|')).value, 'текст  ');
check('снятие отступа', f.outdent(sel('  - раз|')).value, '- раз');

check('продолжение списка', f.continueLine(sel('- раз|')), { insert: '\n- ' });
check('продолжение чекбоксов', f.continueLine(sel('- [x] раз|')), { insert: '\n- [ ] ' });
check('нумерация растёт', f.continueLine(sel('3. раз|')), { insert: '\n4. ' });
check('пустой вложенный пункт поднимается', f.continueLine(sel('  - |')), {
  insert: '',
  clear: { from: 0, to: 4, text: '- ' },
});
check('пустой пункт выходит из списка', f.continueLine(sel('- |')), {
  insert: '',
  clear: { from: 0, to: 2, text: '' },
});
check('продолжение цитаты', f.continueLine(sel('> раз|')), { insert: '\n> ' });
check('обычный абзац не продолжается', f.continueLine(sel('раз|')), null);
check('отступ сохраняется в коде', f.keepIndent(sel('    const a = 1;|')), '\n    ');

console.log(`${passed} проверок пройдено${failed ? `, ${failed} провалено` : ''}`);
if (failed) process.exit(1);
