/**
 * ZIP archives: the inflater of our own against zlib's deflate in every kind of
 * block, archives written and read back — with the browser's streams and
 * without them, as on an old iPad — and a folder packed and unpacked again.
 */
import { deflateRawSync, constants } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import { checker, load } from './load.mjs';

const { check, done } = checker();
const Z = await load('zip', 'stored', 'vault');

const text = new TextEncoder().encode('# Заметка\n\n' + 'Повтор строки, чтобы было что сжать. '.repeat(400) + '\nend\n');
const noise = randomBytes(70000);
const runs = new Uint8Array(100000).fill(97);
const same = (a, b) => a.length === b.length && Buffer.from(a).equals(Buffer.from(b));

for (const [name, data] of [['text', text], ['random bytes', noise], ['one long run', runs], ['nothing', new Uint8Array(0)]]) {
  check(`inflate: ${name}, dynamic codes`, same(Z.inflate(deflateRawSync(data), data.length), data), true);
  check(`inflate: ${name}, fixed codes`, same(Z.inflate(deflateRawSync(data, { strategy: constants.Z_FIXED })), data), true);
  check(`inflate: ${name}, stored blocks`, same(Z.inflate(deflateRawSync(data, { level: 0 })), data), true);
  check(`inflate: ${name}, Huffman only`, same(Z.inflate(deflateRawSync(data, { strategy: constants.Z_HUFFMAN_ONLY })), data), true);
}
const refused = (run) => {
  try {
    run();
    return '';
  } catch (error) {
    return error.message;
  }
};
check('inflate: no further than the size the archive gives', refused(() => Z.inflate(deflateRawSync(text), 10)), 'This is not a ZIP archive, or it is damaged');
// A code-length code with three codes of length 1: more than one bit can tell apart.
check('inflate: a code with more codes than room is damaged, not a crash', refused(() => Z.inflate(Uint8Array.from([0x05, 0x00, 0x24, 0x09, 0x00]))), 'This is not a ZIP archive, or it is damaged');
let threw = '';
try {
  Z.inflate(deflateRawSync(noise).subarray(0, 2000));
} catch (error) {
  threw = error.message;
}
check('inflate: a cut stream is an error, not a short file', threw, 'This is not a ZIP archive, or it is damaged');

check('crc32 of "123456789"', Z.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);

const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
const files = [
  { path: 'Заметки/Идея.md', data: text },
  { path: 'Заметки/assets/Идея/noise.png', data: noise },
  { path: 'empty.md', data: new Uint8Array(0) },
];
const archive = await bytes(await Z.zip(files, ['Заметки/Пустая']));
const listed = (entries) => entries.map((entry) => [entry.path, entry.data.length]);
check('an archive reads back, its folder entries left out', listed(await Z.unzip(archive)), listed(files));
check('the text is the same', same((await Z.unzip(archive))[0].data, text), true);
check('the text is deflated, the noise is stored', archive.length < text.length / 5 + noise.length + 1000, true);

// An old iPad: no CompressionStream to write with, no DecompressionStream to read with.
const { CompressionStream: C, DecompressionStream: D } = globalThis;
delete globalThis.CompressionStream;
delete globalThis.DecompressionStream;
const plain = await bytes(await Z.zip(files));
check('without CompressionStream the files are stored', plain.length > text.length + noise.length, true);
check('and read back', listed(await Z.unzip(plain)), listed(files));
check('a deflated archive is read by the inflater of our own', same((await Z.unzip(archive))[0].data, text), true);
globalThis.CompressionStream = C;
globalThis.DecompressionStream = D;

/**
 * An archive as other tools write it: the sizes after the data (bit 3) with
 * zeros in the local header, an extra field there only, and names to clean.
 */
function foreign(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const packed = deflateRawSync(data);
    const raw = Buffer.from(name);
    const extra = Buffer.alloc(9, 1);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0808, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(raw.length, 26);
    local.writeUInt16LE(extra.length, 28);
    const descriptor = Buffer.alloc(16);
    descriptor.writeUInt32LE(0x08074b50, 0);
    descriptor.writeUInt32LE(Z.crc32(data), 4);
    descriptor.writeUInt32LE(packed.length, 8);
    descriptor.writeUInt32LE(data.length, 12);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(0x0808, 8);
    record.writeUInt16LE(8, 10);
    record.writeUInt32LE(Z.crc32(data), 16);
    record.writeUInt32LE(packed.length, 20);
    record.writeUInt32LE(data.length, 24);
    record.writeUInt16LE(raw.length, 28);
    record.writeUInt32LE(offset, 42);
    parts.push(local, raw, extra, packed, descriptor);
    central.push(record, raw);
    offset += local.length + raw.length + extra.length + packed.length + descriptor.length;
  }
  const size = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(size, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...parts, ...central, end, Buffer.from('a comment')]));
}
const note = new TextEncoder().encode('# Note\n');
check('sizes after the data, an extra field, a comment, and paths that climb out', listed(await Z.unzip(foreign([
  { name: 'Notes\\a.md', data: note },
  { name: '../../etc/b.md', data: note },
  { name: '/./c.md', data: note },
]))), [['Notes/a.md', 7], ['etc/b.md', 7], ['c.md', 7]]);

// Explorer's "Compressed folder": Cyrillic names in code page 866, without the UTF-8 flag.
const cp866 = (name) => Uint8Array.from([...name].map((c) => {
  const low = 'абвгдежзийклмноп'.indexOf(c);
  const high = 'рстуфхцчшщъыьэюя'.indexOf(c);
  return low >= 0 ? 0xa0 + low : high >= 0 ? 0xe0 + high : c.charCodeAt(0);
}));
const explorer = new Uint8Array(await (await Z.zip([{ path: 'AAAA.md', data: note }, { path: 'BBBB.md', data: note }])).arrayBuffer());
const swap = (from, to) => {
  const bytes = new TextEncoder().encode(from);
  for (let i = 0; i + bytes.length <= explorer.length; i += 1) if (bytes.every((b, k) => explorer[i + k] === b)) explorer.set(to, i);
};
swap('AAAA.md', cp866('идея.md'));
swap('BBBB.md', cp866('план.md'));
const flags = new DataView(explorer.buffer);
for (let i = 0; i + 4 <= explorer.length; i += 1) {
  if (flags.getUint32(i, true) === 0x04034b50) flags.setUint16(i + 6, 0, true);
  if (flags.getUint32(i, true) === 0x02014b50) flags.setUint16(i + 8, 0, true);
}
check('names in code page 866, as Explorer writes them', (await Z.unzip(explorer)).map((entry) => entry.path), ['идея.md', 'план.md']);
check('a file the caller does not keep is skipped', (await Z.unzip(archive, (path) => path.endsWith('.md'))).map((entry) => entry.path), ['Заметки/Идея.md', 'empty.md']);

// A bomb: a megabyte of zeros that says it is ten bytes.
const bomb = new Uint8Array(await (await Z.zip([{ path: 'zeros.md', data: new Uint8Array(1 << 20) }])).arrayBuffer());
const sizes = new DataView(bomb.buffer);
for (let i = 0; i + 4 <= bomb.length; i += 1) {
  if (sizes.getUint32(i, true) === 0x04034b50) sizes.setUint32(i + 22, 10, true);
  if (sizes.getUint32(i, true) === 0x02014b50) sizes.setUint32(i + 24, 10, true);
}
let blown = '';
try {
  await Z.unzip(bomb);
} catch (error) {
  blown = error.message;
}
check('a file that unpacks past its size stops there', blown, 'This is not a ZIP archive, or it is damaged');

const damaged = archive.slice();
damaged[200] ^= 0xff;
for (const [name, data] of [['a damaged archive', damaged], ['not an archive', new TextEncoder().encode('# just a note')]]) {
  let message = '';
  try {
    await Z.unzip(data);
  } catch (error) {
    message = error.message;
  }
  check(`${name} is an error`, message, 'This is not a ZIP archive, or it is damaged');
}

// A folder out and back in: packed under its own name, unpacked with that name dropped again.
const picked = [
  ['Notes/Idea.md', '# Idea\n'],
  ['Notes/docs/Plan.md', '# Plan\n'],
  ['Notes/docs/assets/Plan/pic.png', 'PNG'],
  ['Notes/.meta.json', '{"tags":{}}'],
  ['Notes/.git/config', 'secret'],
  ['Notes/script.js', 'alert(1)'],
].map(([path, body]) => {
  const file = new File([body], path.slice(path.lastIndexOf('/') + 1));
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
});
const vault = new Z.FileListVault(picked);
const packed = await Z.packFolder(vault, { path: 'Idea.md', text: '# Idea, edited\n' });
const inside = await Z.unzip(await bytes(packed));
check('a folder packs under its own name, in tree order: notes, images and .meta.json only', inside.map((entry) => entry.path), [
  'Notes/docs/assets/Plan/pic.png', 'Notes/docs/Plan.md', 'Notes/Idea.md', 'Notes/.meta.json',
]);
check('the note on screen goes in as it is on screen', new TextDecoder().decode(inside[2].data), '# Idea, edited\n');

const asFile = (blob, name) => new File([blob], name);
const back = await Z.unpackFolder(asFile(packed, 'Whatever.zip'));
check('unpacked, the folder has its name back', back.name, 'Notes');
const reopened = new Z.FileListVault(back.files, back.name);
check('and the same files at the same paths', JSON.stringify(await reopened.scan()), JSON.stringify(await vault.scan()));
check('.meta.json comes along', await reopened.readText('.meta.json'), '{"tags":{}}');

const loose = await Z.zip([
  { path: 'a.md', data: note },
  { path: 'sub/b.md', data: note },
  { path: '__MACOSX/._a.md', data: note },
  { path: '.DS_Store', data: note },
]);
const flat = await Z.unpackFolder(asFile(loose, 'Archive.zip'));
check('files at the top: the archive names the folder', flat.name, 'Archive');
check('and the Mac\'s own files stay out', flat.files.map((file) => file.webkitRelativePath), ['Archive/a.md', 'Archive/sub/b.md']);

const finder = await Z.zip([
  { path: 'Мои заметки/a.md', data: note },
  { path: '__MACOSX/Мои заметки/._a.md', data: note },
]);
check('a Finder archive: one folder, __MACOSX beside it', (await Z.unpackFolder(asFile(finder, 'Мои заметки.zip'))).name, 'Мои заметки');

const twice = await Z.zip([{ path: 'N/a\\b.md', data: note }, { path: 'N/a/b.md', data: note }, { path: 'N/x/../a/b.md', data: note }]);
check('entries that come out at one path all stay, under names of their own', (await Z.unpackFolder(asFile(twice, 'N.zip'))).files.map((file) => file.webkitRelativePath), [
  'N/a/b.md', 'N/a/b 2.md', 'N/a/b 3.md',
]);

let empty = '';
try {
  await Z.unpackFolder(asFile(await Z.zip([{ path: 'x/run.exe', data: note }]), 'x.zip'));
} catch (error) {
  empty = error.message;
}
check('an archive without notes is said to be one', empty, 'The ZIP archive has no notes');

check('kept files: notes, images, .meta.json; not in dot-folders or __MACOSX', [
  'a.md', 'x/b.png', '.meta.json', 'x/.meta.json', '.obsidian/a.md', '__MACOSX/a.md', 'x/._a.md', 'output/a.md', 'x/output/a.md', 'run.exe',
].map((path) => Z.keptFile(path)), [true, true, true, false, false, false, false, false, true, false]);

done('zip');
