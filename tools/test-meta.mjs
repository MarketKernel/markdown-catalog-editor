/** The catalog data in .meta.json: tags per note, the tag tree, renames and deletes. */
import { checker, load } from './load.mjs';

const { check, done } = checker();
const { Meta, normalizeTag, isUnder } = await load('meta');

// Normalising
check('hash and spaces trimmed', normalizeTag('  #idea '), 'idea');
check('inner spaces become dashes', normalizeTag('to do  later'), 'to-do-later');
check('nested, loose slashes tidied', normalizeTag('/project / alpha/'), 'project/alpha');
check('nothing left', normalizeTag(' # / '), null);
check('under itself', isUnder('a', 'a'), true);
check('under a parent', isUnder('a/b', 'a'), true);
check('a shared prefix is not a parent', isUnder('ab', 'a'), false);

// Reading
check('empty file', Meta.parse('').serialize(), '{\n  "notes": {}\n}\n');
let threw = false;
try {
  Meta.parse('[1, 2]');
} catch {
  threw = true;
}
check('an array is refused', threw, true);
const read = Meta.parse(JSON.stringify({
  version: 1,
  notes: { 'b.md': { tags: ['#x', 'x', 7, ' '] , pinned: true }, 'a.md': 'junk' },
}));
check('tags cleaned on read', read.tagsOf('b.md'), ['x']);
check('unknown fields survive', JSON.parse(read.serialize()), { version: 1, notes: { 'b.md': { tags: ['x'], pinned: true } } });

// Adding and removing
const meta = Meta.empty();
check('add', meta.addTag('n/one.md', 'Idea'), 'Idea');
check('the known spelling wins', meta.addTag('two.md', 'idea'), 'Idea');
check('no duplicate', meta.addTag('two.md', '#Idea'), null);
check('empty refused', meta.addTag('two.md', '  '), null);
meta.addTag('two.md', 'project/alpha');
meta.addTag('n/one.md', 'project/beta');
meta.addTag('n/one.md', 'project');
check('in order of adding', meta.tagsOf('n/one.md'), ['Idea', 'project/beta', 'project']);
check('all tags sorted', meta.allTags(), ['Idea', 'project', 'project/alpha', 'project/beta']);
check('notes with a tag include nested ones', meta.notesWith('project'), ['n/one.md', 'two.md']);
check('a leaf', meta.notesWith('project/alpha'), ['two.md']);
check('missing notes left out', meta.notesWith('project', (path) => path !== 'two.md'), ['n/one.md']);

const shape = (nodes) => nodes.map((node) => [node.tag, node.count, shape(node.children)]);
check('tree', shape(meta.tree()), [
  ['Idea', 2, []],
  ['project', 2, [['project/alpha', 1, []], ['project/beta', 1, []]]],
]);
check('tree counts only existing notes', shape(meta.tree((path) => path === 'two.md')), [
  ['Idea', 1, []],
  ['project', 1, [['project/alpha', 1, []]]],
]);

check('remove', meta.removeTag('two.md', 'Idea'), true);
check('remove twice', meta.removeTag('two.md', 'Idea'), false);

// Renames and deletes
check('rename a folder', meta.move('n', 'm'), true);
check('its notes follow', meta.tagsOf('m/one.md'), ['Idea', 'project/beta', 'project']);
check('a sibling with a shared prefix stays', meta.move('tw', 'x'), false);
check('rename a note', meta.move('two.md', 'm/two.md'), true);
check('stable, sorted output', meta.serialize(), `${JSON.stringify({ notes: {
  'm/one.md': { tags: ['Idea', 'project/beta', 'project'] },
  'm/two.md': { tags: ['project/alpha'] },
} }, null, 2)}\n`);
meta.removeTag('m/two.md', 'project/alpha');
check('a note without tags is dropped', Object.keys(JSON.parse(meta.serialize()).notes), ['m/one.md']);
check('delete a folder', meta.remove('m'), true);
check('nothing left', meta.allTags(), []);

done('meta');
