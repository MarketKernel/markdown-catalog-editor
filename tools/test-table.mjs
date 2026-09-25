/** Checks the table model: reading cells, writing one back, adding and removing rows and columns. */
import { transform } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = await readFile(join(root, 'src/table.ts'), 'utf8');
const { code } = await transform(source, { loader: 'ts', format: 'esm' });
const t = await import(`data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`);

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) passed += 1;
  else {
    failed += 1;
    console.error(`FAIL  ${name}\n  expected: ${b}\n  actual:   ${a}`);
  }
}

const basic = '| Name | Size |\n| --- | ---: |\n| a | 1 |\n|  |  |';

check('parse', t.parseTable(basic), { rows: [['Name', 'Size'], ['a', '1'], ['', '']], align: ['', 'right'] });
check('no outer pipes', t.parseTable('a | b\n:-: | -\nc | d').rows, [['a', 'b'], ['c', 'd']]);
check('alignment', t.parseTable('| a | b | c |\n|:--|:-:|--|').align, ['left', 'center', '']);
check('escaped pipe', t.parseTable('| a \\| b | c |\n| - | - |').rows[0], ['a | b', 'c']);
check('short row is padded', t.parseTable('| a | b |\n| - | - |\n| x |').rows[1], ['x', '']);
check('not a table', t.parseTable('| a |\nplain'), null);

check('set a cell keeps the rest', t.setCell(basic, 1, 0, 'abc'), '| Name | Size |\n| --- | ---: |\n| abc | 1 |\n|  |  |');
check('set an empty cell', t.setCell(basic, 2, 1, 'x'), '| Name | Size |\n| --- | ---: |\n| a | 1 |\n|  | x |');
check('set a cell in a tight table', t.setCell('|a||\n|-|-|', 0, 1, 'x'), '|a| x |\n|-|-|');
check('empty a cell', t.setCell(basic, 1, 0, ''), '| Name | Size |\n| --- | ---: |\n|  | 1 |\n|  |  |');
check('padded source keeps its padding', t.setCell('| Name   | Size |\n| ------ | ---- |', 0, 0, 'N'), '| N   | Size |\n| ------ | ---- |');
check('a pipe is escaped', t.setCell(basic, 0, 0, 'a|b'), '| a\\|b | Size |\n| --- | ---: |\n| a | 1 |\n|  |  |');
check('a missing cell is added', t.setCell('| a | b |\n| - | - |\n| x |', 1, 1, 'y'), '| a | b |\n| - | - |\n| x | y |');
check('a <br> reads as a line break', t.parseTable('| a<br>b | c<br/>d |\n| - | - |').rows[0], ['a\nb', 'c\nd']);
check('a line break is written as <br>', t.setCell(basic, 1, 0, 'x\ny'), '| Name | Size |\n| --- | ---: |\n| x<br>y | 1 |\n|  |  |');
check('round trip of an escaped pipe', t.cellValue(t.setCell(basic, 1, 0, 'p|q'), 1, 0), 'p|q');

check('cell at the header', t.cellAt(basic, 3), { row: 0, col: 0, caret: 1 });
check('cell at a body cell', t.cellAt(basic, basic.indexOf('| 1') + 2), { row: 1, col: 1, caret: 0 });
check('cell at the delimiter maps to the header', t.cellAt(basic, 18).row, 0);
check('cell at the end', t.cellAt(basic, basic.length), { row: 2, col: 1, caret: 0 });
check('cell offset', t.cellOffset(basic, 1, 1), basic.indexOf('1 |'));
check('cell offset back to the same cell', t.cellAt(basic, t.cellOffset(basic, 2, 1)), { row: 2, col: 1, caret: 0 });

const table = t.parseTable(basic);
check('format', t.formatTable(table), '| Name | Size |\n| --- | ---: |\n| a | 1 |\n|  |  |');
check('add row', t.formatTable(t.addRow(table)).split('\n').length, 5);
check('add column', t.formatTable(t.addColumn(table)), '| Name | Size |  |\n| --- | ---: | --- |\n| a | 1 |  |\n|  |  |  |');
check('remove row', t.removeRow(table, 2).rows, [['Name', 'Size'], ['a', '1']]);
check('header row stays', t.removeRow(table, 0).rows.length, 3);
check('remove column', t.formatTable(t.removeColumn(table, 1)), '| Name |\n| --- |\n| a |\n|  |');
check('last column stays', t.removeColumn(t.removeColumn(table, 1), 0).align.length, 1);

check('empty row', [t.rowIsEmpty(table, 1), t.rowIsEmpty(table, 2)], [false, true]);
check('empty column', t.columnIsEmpty(t.addColumn(table), 2), true);
check('non-empty column', t.columnIsEmpty(table, 0), false);
check('empty table', [t.isEmpty(table), t.isEmpty(t.parseTable('|  |\n| - |\n|  |'))], [false, true]);

console.log(`${passed} table checks passed${failed ? `, ${failed} failed` : ''}`);
process.exit(failed ? 1 : 0);
