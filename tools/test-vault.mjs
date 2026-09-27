/**
 * Where a note's images go and where its `![[embeds]]` are looked for: a path
 * from the note's folder for the new ones, the old places for a bare name.
 */
import { checker, load } from './load.mjs';

const { check, done } = checker();
const V = await load('vault');
const perNote = { folder: 'assets', perNote: true };
const shared = { folder: 'media/img', perNote: false };

check('a folder as typed: slashes, dots and embed-breaking characters go', V.cleanImageFolder(' /../media\\ img|x/./ '), 'media/img-x');
check('an empty folder is assets', V.cleanImageFolder('  / '), 'assets');

check('a subfolder per note, beside the note', V.imageDirOf('docs/Ubuntu.md', perNote), 'docs/assets/Ubuntu');
check('no subfolder: the images folder itself', V.imageDirOf('docs/Ubuntu.md', shared), 'docs/media/img');
check('a note at the root', V.imageDirOf('Ubuntu.md', perNote), 'assets/Ubuntu');

check('the embed is the path from the note\'s folder', V.embedTarget('docs/Ubuntu.md', 'docs/assets/Ubuntu/a b.jpg'), 'assets/Ubuntu/a b.jpg');
check('at the root it is the vault path', V.embedTarget('Ubuntu.md', 'assets/Ubuntu/a.jpg'), 'assets/Ubuntu/a.jpg');

check('an embed with a path: from the note\'s folder, then from the root', V.embedCandidates('docs/Ubuntu.md', 'assets/Ubuntu/a.jpg', perNote), ['docs/assets/Ubuntu/a.jpg', 'assets/Ubuntu/a.jpg']);
check('an embed with a path, at the root, is one place', V.embedCandidates('Ubuntu.md', 'assets/Ubuntu/a.jpg', perNote), ['assets/Ubuntu/a.jpg']);
check('an embed with a path may climb out', V.embedCandidates('docs/Ubuntu.md', '../pics/a.jpg', perNote), ['pics/a.jpg']);
check('a bare name: the note\'s subfolder first, then the folder, beside the note, the root', V.embedCandidates('docs/Ubuntu.md', 'a.jpg', perNote), [
  'docs/assets/Ubuntu/a.jpg', 'docs/assets/a.jpg', 'docs/a.jpg', 'a.jpg',
]);
check('a bare name without subfolders: the folder first, and the old assets/<note> still', V.embedCandidates('docs/Ubuntu.md', 'a.jpg', shared), [
  'docs/media/img/a.jpg', 'docs/media/img/Ubuntu/a.jpg', 'docs/assets/Ubuntu/a.jpg', 'docs/assets/a.jpg', 'docs/a.jpg', 'a.jpg',
]);

const files = new Set(['docs/assets/a.jpg', 'elsewhere/b.jpg', 'assets/Ubuntu/c.jpg']);
const has = (path) => files.has(path);
const named = (name) => [...files].find((path) => path.endsWith(`/${name}`)) ?? null;
check('a bare name found in the shared folder', V.findEmbed('docs/Ubuntu.md', 'a.jpg', perNote, has, named), 'docs/assets/a.jpg');
check('a bare name found anywhere by its name', V.findEmbed('docs/Ubuntu.md', 'b.jpg', perNote, has, named), 'elsewhere/b.jpg');
check('a path found from the root', V.findEmbed('docs/Ubuntu.md', 'assets/Ubuntu/c.jpg', perNote, has, named), 'assets/Ubuntu/c.jpg');
check('a path is not looked for by its name', V.findEmbed('docs/Ubuntu.md', 'wrong/b.jpg', perNote, has, named), null);

done('vault');
