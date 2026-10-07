/**
 * How what the "Send to Markdown" extension sends lands in the notes
 * (src/clip.ts): the note's file name, a free one beside the others, the
 * front matter, adding to the end of a note. What it makes of a web page's
 * HTML needs a DOM, and is tools/test-convert.mjs, in Chrome.
 */
import { checker, load } from './load.mjs';

const { check, done } = checker();
const C = await load('clip');

check('file name: what a disk refuses', C.clipFileName('A: B / C? "D" <E>'), 'A B C D E.md');
check('file name: wiki-link marks', C.clipFileName('Notes #1 [draft] ^x |y'), 'Notes 1 draft x y.md');
check('file name: dots at the ends', C.clipFileName('..hidden.'), 'hidden.md');
check('file name: nothing left', C.clipFileName(' / ? '), 'Clipping.md');
check('file name: the fallback given', C.clipFileName('', 'Вырезка'), 'Вырезка.md');
const long = C.clipFileName('word '.repeat(40));
check('file name: at most 100 characters, at a word', [long.length <= 103, long.endsWith('word.md')], [true, true]);
check('file name: unicode kept', C.clipFileName('Привет — мир'), 'Привет — мир.md');

const taken = new Set(['note.md', 'note 2.md']);
check('free name: free', C.freeName('Other.md', (n) => taken.has(n.toLowerCase())), 'Other.md');
check('free name: numbered past the taken', C.freeName('Note.md', (n) => taken.has(n.toLowerCase())), 'Note 3.md');

check('clip folder: cleaned', C.cleanClipFolder(' ../Web//Clips: new/ '), 'Web/Clips- new');
check('clip folder: the root', C.cleanClipFolder(' / '), '');

check('link text escaped', C.markdownLink('a [b]  c', 'https://x.org/p'), '[a \\[b\\] c](https://x.org/p)');
check('link: an address with a space or brackets', C.markdownLink('t', 'https://x.org/a b(1)'), '[t](<https://x.org/a%20b(1)>)');
check('link: no text → the address', C.markdownLink('', 'https://x.org/'), '[https://x.org/](https://x.org/)');

const page = { kind: 'page', title: 'A "quoted"  title', url: 'https://x.org/a', markdown: '# A\n\nText.\n' };
check(
  'new note: front matter, then the text',
  C.clipNote(page, new Date(2025, 11, 31, 23, 59)),
  '---\ntitle: "A \\"quoted\\" title"\nsource: "https://x.org/a"\nclipped: 2025-12-31\n---\n\n# A\n\nText.\n',
);
const selection = { kind: 'selection', title: 'Page', url: 'https://x.org/a', markdown: 'Quote.' };
check('append: a blank line, the text, the source', C.appendClip('# Note\n\nBody\n\n\n', selection), '# Note\n\nBody\n\nQuote.\n\n— [Page](https://x.org/a)\n');
check('append: a link is its own source', C.appendClip('Body', { kind: 'link', title: 'T', url: 'https://x.org/a', markdown: '[T](https://y.org/)' }), 'Body\n\n[T](https://y.org/)\n');
check('append: to an empty note', C.appendClip('', selection), 'Quote.\n\n— [Page](https://x.org/a)\n');
check('append: the note keeps its line endings', C.appendClip('A\r\nB\r\n', selection), 'A\r\nB\r\n\r\nQuote.\r\n\r\n— [Page](https://x.org/a)\r\n');

done('clip');
