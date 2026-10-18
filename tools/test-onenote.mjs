/**
 * OneNote sections into notes (src/onenote.ts, src/onenote-md.ts). No real
 * notebook can ride along — the user's are private, the public samples carry
 * a licence of their own — so the test writes a small section itself, in the
 * package form OneNote keeps a notebook synced through OneDrive in: data
 * elements of [MS-FSSHTTPB] holding the objects of [MS-ONE]. Then it reads it
 * back and checks the Markdown that comes out, and what a damaged file says.
 */
import { checker, load } from './load.mjs';

const { check, done } = checker();
const M = await load('onenote-md');
const O = await load('onenote');

/* ------------------------------------------------------------------ *
 * Bytes
 * ------------------------------------------------------------------ */

class Bytes {
  parts = [];
  push(...values) {
    for (const value of values) this.parts.push(Buffer.isBuffer(value) ? value : Buffer.from(value));
    return this;
  }
  u8(n) {
    return this.push([n]);
  }
  u16(n) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n);
    return this.push(b);
  }
  u32(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n >>> 0);
    return this.push(b);
  }
  u64(n) {
    const b = Buffer.alloc(8);
    b.writeBigUInt64LE(BigInt(n));
    return this.push(b);
  }
  guid(text) {
    const hex = Buffer.from(text.replace(/[{}-]/g, ''), 'hex');
    return this.push(Buffer.from(hex.subarray(0, 4)).reverse(), Buffer.from(hex.subarray(4, 6)).reverse(), Buffer.from(hex.subarray(6, 8)).reverse(), hex.subarray(8));
  }
  /** A compact unsigned integer of [MS-FSSHTTPB] 2.2.1.1. */
  compact(n) {
    if (n === 0) return this.u8(0);
    if (n < 0x80) return this.u8((n << 1) | 1);
    if (n < 0x4000) return this.u16((n << 2) | 2);
    if (n < 0x10000000) return this.u32(n * 16 + 8);
    return this.u8(0x80).u64(n);
  }
  /** A compact ExtendedGUID; null is the nil one. */
  exGuid(id) {
    if (!id) return this.u8(0);
    if (id.n < 32) return this.u8((id.n << 3) | 4).guid(id.guid);
    return this.u8(0x80).u32(id.n).guid(id.guid);
  }
  cell(cell) {
    return this.exGuid(cell.context).exGuid(cell.space);
  }
  start16(type) {
    return this.u16(type << 3);
  }
  start32(type) {
    return this.u32((2 | 4 | (type << 3)) >>> 0);
  }
  end8(type) {
    return this.u8(1 | (type << 2));
  }
  end16(type) {
    return this.u16(3 | (type << 2));
  }
  get buffer() {
    return Buffer.concat(this.parts);
  }
}

/* ------------------------------------------------------------------ *
 * Objects and their properties
 * ------------------------------------------------------------------ */

const OBJECTS = '{0b0e0000-0000-4000-8000-000000000001}';
let next = 1;
const newId = () => ({ guid: OBJECTS, n: next++ });

/** A property: its full PropertyID of [MS-ONE] 2.1.12, and what it holds. */
const bool = (id) => ({ id, write: (b) => b, bool: true });
const u16 = (id, n) => ({ id, write: (b) => b.u16(n) });
const u32 = (id, n) => ({ id, write: (b) => b.u32(n) });
const u64 = (id, n) => ({ id, write: (b) => b.u64(n) });
const bytes = (id, data) => ({ id, write: (b) => b.u32(data.length).push(data) });
const text = (id, value) => bytes(id, Buffer.from(value, 'utf16le'));
const refs = (id, objects) => ({ id, write: (b) => b.u32(objects.length), refs: objects });
const ref = (id, object) => ({ id, write: (b) => b, refs: [object] });
const spaces = (id, cells) => ({ id, write: (b) => b.u32(cells.length), cells });
const sets = (id, list) => ({ id, sets: list });

/** A property set, the references it makes collected in the order they are made. */
function propertySet(props, out, refsOut, cellsOut) {
  out.u16(props.length);
  for (const prop of props) out.u32(prop.bool ? (prop.id | 0x80000000) >>> 0 : prop.id);
  for (const prop of props) {
    if (prop.sets) {
      out.u32(prop.sets.length).u32(0x14000000);
      for (const set of prop.sets) propertySet(set, out, refsOut, cellsOut);
      continue;
    }
    prop.write(out);
    refsOut.push(...(prop.refs ?? []));
    cellsOut.push(...(prop.cells ?? []));
  }
}

/** An object: its JCID and properties; `blob` makes it hold a file. */
function object(jcid, props, blob) {
  return { id: newId(), jcid, props, blob };
}

const P = {
  elementChildNodes: 0x24001c20,
  contentChildNodes: 0x24001c1f,
  structureElementChildNodes: 0x24001d5f,
  childGraphSpaceElementNodes: 0x2c001d63,
  listNodes: 0x24001c26,
  numberListFormat: 0x1c001c1a,
  cachedTitleString: 0x1c001cf3,
  sectionDisplayName: 0x1c00349b,
  pageLevel: 0x14001dff,
  entityGuid: 0x1c001c30,
  created: 0x18001c65,
  lastModifiedTime: 0x14001d7a,
  offsetVert: 0x14001c15,
  richEditTextUnicode: 0x1c001c22,
  textRunIndex: 0x1c001e12,
  textRunFormatting: 0x24001e13,
  paragraphStyle: 0x2000342c,
  paragraphStyleId: 0x1c00345a,
  bold: 0x08001c04,
  italic: 0x08001c05,
  fontColor: 0x14001c0c,
  hyperlink: 0x08001e14,
  hidden: 0x08001e16,
  noteTags: 0x40003489,
  noteTagDefinition: 0x20003488,
  noteTagShape: 0x10003464,
  actionItemStatus: 0x10003470,
  pictureContainer: 0x20001c3f,
  imageFilename: 0x1c001dd7,
};

const J = {
  sectionNode: 0x00060007,
  pageSeries: 0x00060008,
  pageNode: 0x0006000b,
  outline: 0x0006000c,
  element: 0x0006000d,
  richText: 0x0006000e,
  image: 0x00060011,
  numberList: 0x00060012,
  table: 0x00060022,
  row: 0x00060023,
  cell: 0x00060024,
  title: 0x0006002c,
  manifest: 0x00060037,
  sectionMeta: 0x00020031,
  pageMeta: 0x00020030,
  style: 0x0012004d,
  tagDefinition: 0x00120043,
  picture: 0x00080039,
};

const style = (props) => object(J.style, props);
/** Rich text: runs of [text, style] — the style an object, or null for plain text. */
function richText(runs, extra = []) {
  const plain = style([]);
  const ends = [];
  let at = 0;
  for (const [piece] of runs) ends.push((at += piece.length));
  ends.pop();
  return object(J.richText, [
    text(P.richEditTextUnicode, runs.map(([piece]) => piece).join('')),
    bytes(P.textRunIndex, Buffer.concat(ends.map((n) => new Bytes().u32(n).buffer))),
    refs(P.textRunFormatting, runs.map(([, s]) => s ?? plain)),
    ...extra,
  ]);
}
const element = (contents, { list, children = [] } = {}) =>
  object(J.element, [refs(P.contentChildNodes, contents), refs(P.elementChildNodes, children), ...(list ? [refs(P.listNodes, [list])] : [])]);
const paragraph = (value, extra) => element([richText([[value, null]], extra)]);

/* ------------------------------------------------------------------ *
 * The section
 * ------------------------------------------------------------------ */

const SECTION_FILE = '{7b5c52e4-d88c-4da7-aeb1-5378d02996d3}';
const PACKAGE_FORMAT = '{638de92f-a6d4-4bc1-9a36-b3fc2511a5b7}';
const SECTION_SCHEMA = '{1f937cb4-b26f-445f-b9f8-17e20160e461}';
const DATA_ROOT = { guid: '{84defab9-aaa3-4a0d-a3a8-520c77ac7073}', n: 2 };
const ROLE = '{4a3717f8-1c14-49e7-9526-81d942de1741}';
const CONTEXT = { guid: '{c0c0c0c0-0000-4000-8000-000000000000}', n: 1 };
const PAGE_ONE = '{11111111-2222-4333-8444-555555555555}';
const PAGE_TWO = '{66666666-7777-4888-8999-aaaaaaaaaaaa}';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

/** A page's object space: its manifest and metadata as the roots, everything else reachable from them. */
function page({ title, level, guid, body }) {
  const titleOutline = object(J.outline, [refs(P.elementChildNodes, [paragraph(title)])]);
  const node = object(J.pageNode, [
    refs(P.structureElementChildNodes, [object(J.title, [refs(P.elementChildNodes, [titleOutline])])]),
    refs(P.elementChildNodes, body),
    u32(P.lastModifiedTime, 1_000_000_000),
  ]);
  const meta = object(J.pageMeta, [text(P.cachedTitleString, title), u32(P.pageLevel, level), u64(P.created, 132_000_000_000_000_000n), bytes(P.entityGuid, new Bytes().guid(guid).buffer)]);
  return { cell: { context: CONTEXT, space: newId() }, roots: { 1: object(J.manifest, [refs(P.contentChildNodes, [node])]), 2: meta } };
}

const bold = style([bool(P.bold)]);
const marker = style([bool(P.hidden), bool(P.hyperlink)]);
const linked = style([bool(P.hyperlink)]);
const red = style([u32(P.fontColor, 0x0000ff)]);
const grey = style([u32(P.fontColor, 0x333333)]);
const bullet = object(J.numberList, [text(P.numberListFormat, '\u0001\u2022')]);
const numbered = object(J.numberList, [text(P.numberListFormat, '\u0003\u0000.')]);
const checkbox = object(J.tagDefinition, [u16(P.noteTagShape, 1)]);
const todo = (done) => [sets(P.noteTags, [[ref(P.noteTagDefinition, checkbox), u16(P.actionItemStatus, done ? 1 : 0)]])];
const cell = (value) => object(J.cell, [refs(P.elementChildNodes, [paragraph(value)])]);
const row = (...values) => object(J.row, [refs(P.elementChildNodes, values.map(cell))]);
const pictureId = { guid: '{b10b0000-0000-4000-8000-000000000001}', n: 1 };

const first = page({
  title: 'First: page',
  level: 1,
  guid: PAGE_ONE,
  body: [
    // Lower on the page, yet written first: the outlines go top to bottom.
    object(J.outline, [u32(P.offsetVert, 0x42c80000), refs(P.elementChildNodes, [paragraph('Bottom')])]),
    object(J.outline, [
      u32(P.offsetVert, 0x40000000),
      refs(P.elementChildNodes, [
        paragraph('Heading', [ref(P.paragraphStyle, style([text(P.paragraphStyleId, 'h2')]))]),
        element([richText([['Bold ', bold], ['\uFDDFHYPERLINK "https://example.com/a b"', marker], ['link', linked], [' and ', null], ['red', red], [', ', null], ['grey', grey]])]),
        paragraph('# not a heading, * no star, 1. no list'),
        element([richText([['Line one\vLine two', null]])]),
        element([richText([['Item', null]])], { list: bullet, children: [element([richText([['Done', null]], todo(true))]), element([richText([['Open', null]], todo(false))])] }),
        element([richText([['One', null]])], { list: numbered }),
        element([richText([['Two', null]])], { list: numbered }),
        element([object(J.table, [refs(P.elementChildNodes, [row('A', 'B|C'), row('1', '2')])])]),
        element([object(J.image, [ref(P.pictureContainer, object(J.picture, [], pictureId)), text(P.imageFilename, 'shot.png')])]),
        element([richText([['\uFDDFHYPERLINK "onenote:#Second&section-id={abc}&page-id={66666666-7777-4888-8999-AAAAAAAAAAAA}&end"', marker], ['to the second', linked]])]),
      ]),
    ]),
  ],
});
const second = page({ title: 'Second', level: 2, guid: PAGE_TWO, body: [object(J.outline, [refs(P.elementChildNodes, [paragraph('Under the first')])])] });
/** The section's own object space: its node, listing the pages, and its name. */
const rootOf = (pages) => ({
  cell: { context: CONTEXT, space: newId() },
  roots: {
    1: object(J.sectionNode, [refs(P.elementChildNodes, [object(J.pageSeries, [spaces(P.childGraphSpaceElementNodes, pages.map((p) => p.cell))])])]),
    2: object(J.sectionMeta, [text(P.sectionDisplayName, 'Section')]),
  },
});

/** Everything an object space reaches from its roots, each object once. */
function reachable(roots) {
  const seen = new Map();
  const visit = (item) => {
    if (seen.has(item.id.n)) return;
    seen.set(item.id.n, item);
    const walk = (props) => {
      for (const prop of props) {
        for (const child of prop.refs ?? []) visit(child);
        for (const set of prop.sets ?? []) walk(set);
      }
    };
    walk(item.props);
  };
  Object.values(roots).forEach(visit);
  return [...seen.values()];
}

function dataElement(out, id, type, body) {
  out.start16(0x01).exGuid(id).u8(0).compact(type);
  body(out);
  out.end8(0x01);
}

/** A section package: one revision and one object group per object space. */
function section(pages, blobs = [[pictureId, PNG]]) {
  const root = rootOf(pages);
  const out = new Bytes().guid(SECTION_FILE).guid('{f11e0000-0000-4000-8000-000000000001}').push(Buffer.alloc(16)).guid(PACKAGE_FORMAT).u32(0);
  const indexId = newId();
  out.start32(0x7a).exGuid(indexId).guid('{5c4e0000-0000-4000-8000-000000000001}').start16(0x15).u8(0);
  const elements = [];
  const spaces = [root, ...pages].map((space) => ({ ...space, revision: newId(), group: newId() }));
  elements.push((o) =>
    dataElement(o, indexId, 0x01, (b) => {
      for (const space of spaces) b.start16(0x0e).cell(space.cell).exGuid(space.revision).u8(0);
    }),
  );
  elements.push((o) => dataElement(o, newId(), 0x02, (b) => b.start16(0x0c).guid(SECTION_SCHEMA).start16(0x07).exGuid(DATA_ROOT).cell(root.cell)));
  for (const space of spaces) {
    elements.push((o) =>
      dataElement(o, space.revision, 0x04, (b) => {
        b.start16(0x1a).exGuid(space.revision).exGuid(null);
        for (const [role, item] of Object.entries(space.roots)) b.start16(0x0a).exGuid({ guid: ROLE, n: Number(role) }).exGuid(item.id);
        b.start16(0x19).exGuid(space.group);
      }),
    );
    const objects = reachable(space.roots);
    elements.push((o) =>
      dataElement(o, space.group, 0x05, (b) => {
        b.start16(0x1d);
        for (const item of objects) for (const partition of item.blob ? [4, 1, 2] : [4, 1]) b.start16(0x18).exGuid(item.id).compact(partition).compact(0).compact(0).compact(0);
        b.end8(0x1d).start16(0x1e);
        for (const item of objects) {
          b.start16(0x16).compact(0).compact(0).compact(4).u32(item.jcid);
          const props = new Bytes();
          const found = [];
          const cells = [];
          const body = new Bytes();
          propertySet(item.props, body, found, cells);
          props.u32(found.length | (cells.length ? 0 : 0x80000000));
          found.forEach((_, i) => props.u32(((i + 1) << 8) | 1));
          if (cells.length) {
            props.u32(cells.length);
            cells.forEach((_, i) => props.u32(((i + 1) << 8) | 1));
          }
          const data = Buffer.concat([props.buffer, body.buffer]);
          b.start16(0x16).compact(found.length);
          found.forEach((child) => b.exGuid(child.id));
          b.compact(cells.length);
          cells.forEach((c) => b.cell(c));
          b.compact(data.length).push(data);
          if (item.blob) b.start16(0x1c).compact(0).compact(0).exGuid(item.blob);
        }
        b.end8(0x1e);
      }),
    );
  }
  for (const [id, data] of blobs) elements.push((o) => dataElement(o, id, 0x0a, (b) => b.start16(0x02).compact(data.length).push(data)));
  for (const write of elements) write(out);
  out.end8(0x15).end16(0x7a);
  // A store is never this small; the reader takes less than a kilobyte for damaged.
  return Buffer.concat([out.buffer, Buffer.alloc(1024)]);
}

/* ------------------------------------------------------------------ *
 * Checks
 * ------------------------------------------------------------------ */

const bytesOf = section([first, second]);
const parsed = O.readSection(new Uint8Array(bytesOf));
check('section: its name', parsed.name, 'Section');
check('section: pages in order, with levels', parsed.pages.map((p) => [p.title, p.level, p.id]), [
  ['First: page', 1, PAGE_ONE],
  ['Second', 2, PAGE_TWO],
]);
// A FILETIME counts 100 ns from 1601; LastModifiedTime, seconds from 1980.
check('section: the dates', [parsed.pages[0].created.toISOString(), parsed.pages[0].modified.toISOString()], ['2019-04-17T18:40:00.000Z', '2011-09-09T01:46:40.000Z']);

const converted = await M.convertNotebook([{ path: 'Group/Section.one', file: new Blob([bytesOf]) }, { path: 'Group/Open Notebook.onetoc2', file: new Blob(['x']) }]);
check('notebook: the notes and the picture', [...converted.files.keys()].sort(), ['Group/Section/First page.md', 'Group/Section/First page/Second.md', 'Group/Section/assets/First page/shot.png']);
check('notebook: counted', [converted.pages, converted.failed], [2, []]);
const picture = converted.files.get('Group/Section/assets/First page/shot.png');
check('picture: its bytes, sliced from the section', Buffer.from(await picture.arrayBuffer()).equals(PNG), true);

const note = converted.files.get('Group/Section/First page.md');
const [matter, body] = [note.slice(0, note.indexOf('\n---\n') + 5), note.slice(note.indexOf('\n---\n') + 5)];
check('note: front matter with the title as it was', matter.split('\n').slice(0, 2), ['---', 'title: "First: page"']);
check('note: dates in the front matter', /\ncreated: 2019-04-1\d \d\d:\d\d\nupdated: 2011-09-0\d \d\d:\d\d\n/.test(matter), true);
check(
  'note: the page as Markdown',
  body.trim().split('\n'),
  [
    '## Heading',
    '',
    '**Bold** [link](<https://example.com/a%20b>) and <span style="color:#ff0000">red</span>, grey',
    '',
    '\\# not a heading, \\* no star, 1. no list',
    '',
    'Line one',
    'Line two',
    '',
    '- Item',
    '  - [x] Done',
    '  - [ ] Open',
    '1. One',
    '2. Two',
    '',
    '| A | B\\|C |',
    '| --- | --- |',
    '| 1 | 2 |',
    '',
    '![[assets/First page/shot.png]]',
    '',
    '[to the second](First%20page/Second.md)',
    '',
    'Bottom',
  ],
);
check('note: a subpage', converted.files.get('Group/Section/First page/Second.md').split('---\n')[2], '\nUnder the first\n');
const headed = await M.convertNotebook([{ path: 'S.one', file: new Blob([bytesOf]) }], { heading: true });
check('note: the title as a heading, when asked', headed.files.get('S/First page/Second.md').split('---\n')[2], '\n# Second\n\nUnder the first\n');

/* What a crafted section could do, and must not. */

// Styles the converter shows no difference between: nothing is written between their runs.
const small = style([u16(0x10001c0b, 20)]);
const large = style([u16(0x10001c0b, 40)]);
let chain = null;
for (let i = 0; i < 40; i += 1) chain = element([richText([[`level ${i}`, null]])], chain ? { children: [chain, chain] } : {});
const emfId = { guid: '{b10b0000-0000-4000-8000-000000000002}', n: 1 };
const EMF = Buffer.alloc(64);
EMF.writeUInt32LE(1, 0);
EMF.write(' EMF', 40, 'latin1');
const crafted = page({
  title: 'Crafted',
  level: 1,
  guid: '{12121212-3434-4565-8787-909090909090}',
  body: [
    object(J.outline, [
      refs(P.elementChildNodes, [
        element([richText([['<', small], ['img src=x onerror=alert(1)>', large]])]),
        element([richText([['~', small], ['~struck~', large], ['~', small], [' and =', large], ['=mark', small]])]),
        element([richText([['x\v# heading\v- item\v---', null]])]),
        chain,
        element([object(J.image, [ref(P.pictureContainer, object(J.picture, [], emfId)), text(P.imageFilename, 'drawing.emf')])]),
        element([object(J.image, [ref(P.pictureContainer, object(J.picture, [], pictureId)), text(P.imageFilename, '?.png')])]),
      ]),
    ]),
  ],
});
const craftedBytes = section([crafted, crafted], [[pictureId, PNG], [emfId, EMF]]);
const started = Date.now();
const attack = await M.convertNotebook([{ path: 'C.one', file: new Blob([craftedBytes]) }]);
const lines = attack.files.get('C/Crafted.md').split('\n');
check('crafted: a page listed twice is one note', [...attack.files.keys()].filter((path) => path.endsWith('.md')), ['C/Crafted.md']);
check('crafted: a tag split across runs stays text', [lines.includes('\\<img src=x onerror=alert(1)>'), lines.some((line) => /<img/.test(line.replace(/\\</g, '')))], [true, false]);
check('crafted: ~ and = split across runs pair with nothing', lines.find((line) => line.includes('struck')), '\\~\\~struck\\~\\~ and \\=\\=mark');
check('crafted: every line of a paragraph escaped at its start', lines.slice(lines.indexOf('x'), lines.indexOf('x') + 4), ['x', '\\# heading', '\\- item', '\\---']);
check('crafted: an element listed twice is read once, quickly', [lines.filter((line) => line === 'level 0').length, Date.now() - started < 3000], [1, true]);
check('crafted: a picture no browser draws is linked as a file', lines.includes('[drawing.emf](assets/Crafted/drawing.emf)'), true);
check('crafted: a picture named only by refused characters', lines.includes('![[assets/Crafted/image 2.png]]'), true);

check('sections: the recycle bin and lock files left out', ['A.one', 'G/B.one', 'OneNote_RecycleBin/OneNote_DeletedPages.one', '~C.one', 'D.onetoc2'].filter(M.isSectionFile), ['A.one', 'G/B.one']);
const picked = (path) => Object.defineProperty(new File(['x'], path.split('/').pop()), 'webkitRelativePath', { value: path });
check('notebook: a folder with its table of contents is one', [M.isNotebookList([picked('Book/Open Notebook.onetoc2'), picked('Book/A.one')]), M.isNotebookList([picked('Notes/a.md'), picked('Notes/archive/old.one')])], [true, false]);
check('sections: picked files, paths inside the notebook', M.sectionsOf([picked('Book/A.one'), picked('Book/G/B.one'), picked('Book/notes.md')]).map((s) => s.path), ['A.one', 'G/B.one']);

const refused = async (data) => {
  const result = await M.convertNotebook([{ path: 'Bad.one', file: new Blob([data]) }]);
  return result.failed.map((item) => item.reason);
};
const garbled = Buffer.from(bytesOf);
garbled.fill(0xff, 200, 400);
check('damaged: garbled in the middle', await refused(garbled), ['The OneNote file is damaged']);
check('damaged: cut short', await refused(bytesOf.subarray(0, bytesOf.length - 1024 - 40)), ['The OneNote file is damaged']);
check('damaged: not OneNote at all', await refused(Buffer.alloc(4096, 7)), ['This is not a OneNote section']);
const older = Buffer.from(bytesOf);
Buffer.from('ffffffffffffffffffffffffffffffff', 'hex').copy(older, 48);
check('damaged: a format of before 2010', await refused(older), ['Only sections of OneNote 2010 and later can be opened']);

done('onenote');
