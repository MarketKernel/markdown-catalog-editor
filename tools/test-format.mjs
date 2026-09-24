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
    console.error(`FAIL  ${name}\n  expected: ${b}\n  actual:   ${a}`);
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

check('bold', show(f.toggleInline(sel('one |two| three'), 'bold')), 'one **|two|** three');
check('bold comes off', show(f.toggleInline(sel('one |**two**| three'), 'bold')), 'one |two| three');
check('bold comes off from outside', show(f.toggleInline(sel('one **|two|** three'), 'bold')), 'one |two| three');
check('italic on the word under the caret', show(f.toggleInline(sel('one tw|o three'), 'italic')), 'one *|two|* three');
check('highlight', show(f.toggleInline(sel('|important|'), 'mark')), '==|important|==');
check('monospace', show(f.toggleInline(sel('|code|'), 'code')), '`|code|`');

check('link from text', show(f.makeLink(sel('|Anthropic|'))), '[Anthropic](||)');
check('link from a URL', show(f.makeLink(sel('|https://example.org|'))), '[||](https://example.org)');
check('wiki link', show(f.makeWikiLink(sel('|Note|'))), '[[|Note|]]');

check('text colour', f.colorize(sel('|important|'), 'color:#c00').value, '<span style="color:#c00">important</span>');
check('colour comes off', f.colorize(sel('|<span style="color:#c00">important</span>|'), '').value, 'important');

check('heading', f.setHeading(sel('Text|'), 2).value, '## Text');
check('heading changes level', f.setHeading(sel('## Text|'), 3).value, '### Text');
check('heading comes off', f.setHeading(sel('## Text|'), 2).value, 'Text');
check('heading is reset', f.setHeading(sel('### Text|'), 0).value, 'Text');

check('bulleted list', f.toggleBullet(sel('|one\ntwo|')).value, '- one\n- two');
check('list comes off', f.toggleBullet(sel('|- one\n- two|')).value, 'one\ntwo');
check('numbered list', f.toggleOrdered(sel('|one\ntwo|')).value, '1. one\n2. two');
check('checkbox from an item', f.toggleTask(sel('|- one|')).value, '- [ ] one');
check('checkbox comes off', f.toggleTask(sel('|- [x] one|')).value, '- one');
check('quote', f.toggleQuote(sel('|one\ntwo|')).value, '> one\n> two');
check('quote comes off', f.toggleQuote(sel('|> one\n> two|')).value, 'one\ntwo');

check('list indent', f.indent(sel('- one|')).value, '  - one');
check('indent in text is a tab stop', f.indent(sel('text|')).value, 'text  ');
check('outdent', f.outdent(sel('  - one|')).value, '- one');

check('list continues', f.continueLine(sel('- one|')), { insert: '\n- ' });
check('checkboxes continue', f.continueLine(sel('- [x] one|')), { insert: '\n- [ ] ' });
check('numbering grows', f.continueLine(sel('3. one|')), { insert: '\n4. ' });
check('an empty nested item moves up a level', f.continueLine(sel('  - |')), {
  insert: '',
  clear: { from: 0, to: 4, text: '- ' },
});
check('an empty item leaves the list', f.continueLine(sel('- |')), {
  insert: '',
  clear: { from: 0, to: 2, text: '' },
});
check('a quote continues', f.continueLine(sel('> one|')), { insert: '\n> ' });
check('a plain paragraph does not continue', f.continueLine(sel('one|')), null);
check('indentation is kept in code', f.keepIndent(sel('    const a = 1;|')), '\n    ');

// Enter outside a list. `head` and `tail` are the document around the block.
const split = (head, marked, tail) => {
  const { text, caret } = f.splitBlock(head, sel(marked), tail);
  return text.slice(0, caret) + '|' + text.slice(caret);
};
check('split in the middle', split('', 'Hel|lo', '\n'), 'Hel\n\n|lo\n');
check('enter at the end opens a blank line', split('', 'Hello|', '\n\nWorld'), 'Hello\n\n|\n\nWorld');
check('…padded when the next block is glued on', split('', '# Head|', '\ntext'), '# Head\n\n|\n\ntext');
check('…and at the end of a file without a newline', split('', 'Hello|', ''), 'Hello\n\n|\n');
check('…but not when the file ends with one', split('', 'Hello|', '\n'), 'Hello\n\n|\n');
check('enter on a blank line adds one more', split('Hello\n\n', '|', '\n\nWorld'), 'Hello\n\n\n|\n\nWorld');
check('enter at the start pushes the block down', split('A\n\n', '|B', '\n'), 'A\n\n\n\n|B\n');
check('…padded after a glued-on block', split('# H\n', '|text', '\n'), '# H\n\n\n\n|text\n');
check('an emptied last list line leaves the list', split('', '- a\n|', '\n'), '- a\n\n|\n');
check('a selection is replaced', split('', 'a|bc|d', ''), 'a\n\n|d');

console.log(`${passed} checks passed${failed ? `, ${failed} failed` : ''}`);
if (failed) process.exit(1);
