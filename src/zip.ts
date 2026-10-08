/**
 * ZIP archives, written and read in the page: a whole folder of notes taken out
 * of the browser and brought back in (see stored.ts), and the HTML export of a
 * folder kept in the browser.
 *
 * Writing deflates where the browser has CompressionStream("deflate-raw") and
 * stores the files as they are where it does not. Reading uses
 * DecompressionStream where there is one, and an inflater of its own elsewhere:
 * Safari has had it only since 16.4, and the iPads that stopped at an older
 * iPadOS are the ones that need archives most — they cannot open a folder at
 * all. Names are written as UTF-8; read as UTF-8 too, unless they are not,
 * which is how Explorer writes Cyrillic names (code page 866). No ZIP64
 * (4 GB, 65 535 files), no encryption.
 */

import { t } from './i18n';

export interface ZipFile {
  /** A path inside the archive, with `/` between folders; a folder's own entry is not listed. */
  path: string;
  data: Uint8Array;
}

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;
/** Bit 11 of the flags: the names are UTF-8, which is what tells other tools so. */
const UTF8 = 0x0800;
const STORED = 0;
const DEFLATED = 8;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** The time as the archive keeps it: two 16-bit numbers, local time, to two seconds. */
function dosTime(date: Date): [number, number] {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107);
  return [
    (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  ];
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined' || data.length < 64) return null;
  try {
    const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw' as CompressionFormat));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    /* "deflate-raw" is newer than CompressionStream itself: the file is stored as it is */
    return null;
  }
}

/** Text as UTF-8, a Blob as its bytes. */
export async function bytesOf(data: string | Blob | Uint8Array): Promise<Uint8Array> {
  if (typeof data === 'string') return new TextEncoder().encode(data);
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(await new Response(data).arrayBuffer());
}

/** The archive of `files`, in their order; `folders` are empty folders to keep. */
export async function zip(files: readonly ZipFile[], folders: readonly string[] = [], date = new Date()): Promise<Blob> {
  const entries = [...folders.map((path) => ({ path: `${path}/`, data: new Uint8Array(0), folder: true })), ...files.map((file) => ({ ...file, folder: false }))];
  // 65 535 itself is how ZIP64 marks an archive that has more: a reader would take it for one.
  if (entries.length >= 0xffff) throw new Error(t('errors', 'Too many files for a ZIP archive'));
  const [time, day] = dosTime(date);
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const crc = crc32(entry.data);
    const deflated = await deflateRaw(entry.data);
    const packed = deflated && deflated.length < entry.data.length ? deflated : entry.data;
    const method = packed === entry.data ? STORED : DEFLATED;
    if (offset + 30 + name.length + packed.length > 0xffffffff) throw new Error(t('errors', 'Too much for a ZIP archive: over 4 GB'));

    const local = new Uint8Array(30 + name.length);
    const head = new DataView(local.buffer);
    head.setUint32(0, LOCAL, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, UTF8, true);
    head.setUint16(8, method, true);
    head.setUint16(10, time, true);
    head.setUint16(12, day, true);
    head.setUint32(14, crc, true);
    head.setUint32(18, packed.length, true);
    head.setUint32(22, entry.data.length, true);
    head.setUint16(26, name.length, true);
    local.set(name, 30);

    const record = new Uint8Array(46 + name.length);
    const view = new DataView(record.buffer);
    view.setUint32(0, CENTRAL, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(8, UTF8, true);
    view.setUint16(10, method, true);
    view.setUint16(12, time, true);
    view.setUint16(14, day, true);
    view.setUint32(16, crc, true);
    view.setUint32(20, packed.length, true);
    view.setUint32(24, entry.data.length, true);
    view.setUint16(28, name.length, true);
    // The MS-DOS "directory" attribute marks a folder's entry for the tools that look at it.
    view.setUint32(38, entry.folder ? 0x10 : 0, true);
    view.setUint32(42, offset, true);
    record.set(name, 46);

    parts.push(local, packed);
    central.push(record);
    offset += local.length + packed.length;
  }
  const size = central.reduce((sum, record) => sum + record.length, 0);
  const end = new Uint8Array(22);
  const tail = new DataView(end.buffer);
  tail.setUint32(0, END, true);
  tail.setUint16(8, entries.length, true);
  tail.setUint16(10, entries.length, true);
  tail.setUint32(12, size, true);
  tail.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end] as BlobPart[], { type: 'application/zip' });
}

const utf8 = new TextDecoder('utf-8', { fatal: true });

/**
 * A name as the archive has it. Without the UTF-8 flag it may still be UTF-8
 * (the Finder and `zip` write it so), or else the DOS code page of a Windows
 * that made it: 866 is the Cyrillic one. A Western 437 comes out wrong in it,
 * but different names stay different, which is what keeps a file from taking
 * another's place.
 */
function decodeName(bytes: Uint8Array, flagged: boolean): string {
  try {
    return utf8.decode(bytes);
  } catch {
    return new TextDecoder(flagged ? 'utf-8' : 'ibm866').decode(bytes);
  }
}

/**
 * The files of an archive; `keep` says which, by path, before any is
 * unpacked. A path is cleaned of `..`, `.` and a leading `/`, so nothing lands
 * outside the folder it is unpacked into; backslashes, which some Windows
 * tools write, become slashes. A file never unpacks past the size the archive
 * gives it, so an archive cannot blow up into more memory than it says.
 */
export async function unzip(archive: Uint8Array, keep: (path: string) => boolean = () => true): Promise<ZipFile[]> {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const broken = (): Error => new Error(t('errors', 'This is not a ZIP archive, or it is damaged'));
  // The end record is the last thing in the file, followed only by a comment of up to 64 KB.
  let end = -1;
  for (let at = archive.length - 22; at >= Math.max(0, archive.length - 22 - 0xffff); at -= 1) {
    if (view.getUint32(at, true) === END) {
      end = at;
      break;
    }
  }
  if (end < 0) throw broken();
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  if (count === 0xffff || at === 0xffffffff) throw new Error(t('errors', 'The ZIP archive is too large: over 4 GB or 65 535 files'));

  const files: ZipFile[] = [];
  for (let index = 0; index < count; index += 1) {
    if (at + 46 > archive.length || view.getUint32(at, true) !== CENTRAL) throw broken();
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const packedSize = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const skip = nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    const offset = view.getUint32(at + 42, true);
    const name = decodeName(archive.subarray(at + 46, at + 46 + nameLength), Boolean(flags & UTF8));
    at += 46 + skip;

    const path = cleanPath(name);
    if (name.endsWith('/') || name.endsWith('\\') || !path || !keep(path)) continue;
    if (flags & 1) throw new Error(t('errors', 'The ZIP archive is encrypted: {path}', { path }));
    if (offset + 30 > archive.length || view.getUint32(offset, true) !== LOCAL) throw broken();
    // The local header's own name and extra field may differ in length from the central one's.
    const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
    const packed = archive.subarray(start, start + packedSize);
    if (packed.length !== packedSize) throw broken();
    let data: Uint8Array;
    if (method === STORED) data = packed;
    else if (method === DEFLATED) data = await inflateRaw(packed, size);
    else throw new Error(t('errors', 'The ZIP archive is compressed in a way this editor cannot read: {path}', { path }));
    if (data.length !== size || crc32(data) !== crc) throw broken();
    files.push({ path, data });
  }
  return files;
}

function cleanPath(name: string): string {
  const parts: string[] = [];
  for (const part of name.split(/[\\/]+/)) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
}

async function inflateRaw(data: Uint8Array, size: number): Promise<Uint8Array> {
  if (typeof DecompressionStream !== 'undefined') {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      reader = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat)).getReader();
      // Deflate packs at most 1032 to 1: a larger size is a lie, not a buffer to allocate.
      const most = Math.min(size, data.length * 1032);
      const out = new Uint8Array(most);
      let length = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return out.subarray(0, length);
        // More than the archive said: a damaged file, or one made to fill the memory. Either way, no further.
        if (length + value.length > most) break;
        out.set(value, length);
        length += value.length;
      }
    } catch {
      /* no "deflate-raw" here, or the stream refused the data: the inflater below says which */
    }
    void reader?.cancel().catch(() => undefined);
  }
  return inflate(data, size);
}

/* ------------------------------------------------------------------ *
 * Inflate (RFC 1951), after Mark Adler's puff.c: small and plain, with
 * the codes decoded a bit at a time rather than through lookup tables.
 * ------------------------------------------------------------------ */

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DISTANCE_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DISTANCE_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
/** The order the lengths of the code-length code come in. */
const CODE_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

interface Huffman {
  /** How many codes there are of each length, 0 to 15. */
  counts: Uint16Array;
  /** The symbols, by code length and then by value — the order canonical codes are given in. */
  symbols: Uint16Array;
}

/** The code of these lengths; one with more codes than its lengths leave room for is damaged. */
function huffman(lengths: ArrayLike<number>): Huffman {
  const counts = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i += 1) counts[lengths[i]!]! += 1;
  let left = 1;
  for (let len = 1; len < 16; len += 1) {
    left = left * 2 - counts[len]!;
    if (left < 0) throw new Error(t('errors', 'This is not a ZIP archive, or it is damaged'));
  }
  const offsets = new Uint16Array(16);
  for (let len = 1; len < 15; len += 1) offsets[len + 1] = offsets[len]! + counts[len]!;
  const symbols = new Uint16Array(lengths.length);
  for (let i = 0; i < lengths.length; i += 1) if (lengths[i]) symbols[offsets[lengths[i]!]!++] = i;
  return { counts, symbols };
}

const FIXED = (() => {
  const lengths = new Uint8Array(288);
  lengths.fill(8, 0, 144).fill(9, 144, 256).fill(7, 256, 280).fill(8, 280, 288);
  return { codes: huffman(lengths), distances: huffman(new Uint8Array(30).fill(5)) };
})();

/**
 * The raw deflate stream `input` unpacked. `limit` is the most it may come to:
 * the size the archive gives, past which the stream is damaged.
 */
export function inflate(input: Uint8Array, limit = Infinity): Uint8Array {
  // Deflate packs at most 1032 to 1: a larger size is a lie, not a buffer to allocate.
  let out = new Uint8Array(Math.max(Math.min(limit, input.length * 1032), 1024));
  let length = 0;
  let pos = 0;
  let buffer = 0;
  let held = 0;
  const damaged = (): Error => new Error(t('errors', 'This is not a ZIP archive, or it is damaged'));

  const room = (more: number): void => {
    if (length + more > limit) throw damaged();
    if (length + more <= out.length) return;
    const grown = new Uint8Array(Math.max(out.length * 2, length + more));
    grown.set(out.subarray(0, length));
    out = grown;
  };
  const bits = (count: number): number => {
    while (held < count) {
      if (pos >= input.length) throw damaged();
      buffer |= input[pos++]! << held;
      held += 8;
    }
    const value = buffer & ((1 << count) - 1);
    buffer >>>= count;
    held -= count;
    return value;
  };
  const decode = (code: Huffman): number => {
    let value = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len < 16; len += 1) {
      value |= bits(1);
      const count = code.counts[len]!;
      if (value - count < first) return code.symbols[index + (value - first)]!;
      index += count;
      first = (first + count) << 1;
      value <<= 1;
    }
    throw damaged();
  };
  const codes = (lit: Huffman, dist: Huffman): void => {
    for (;;) {
      const symbol = decode(lit);
      if (symbol < 256) {
        room(1);
        out[length++] = symbol;
      } else if (symbol === 256) {
        return;
      } else {
        const at = symbol - 257;
        if (at >= 29) throw damaged();
        const len = LENGTH_BASE[at]! + bits(LENGTH_EXTRA[at]!);
        const which = decode(dist);
        if (which >= 30) throw damaged();
        const distance = DISTANCE_BASE[which]! + bits(DISTANCE_EXTRA[which]!);
        if (distance > length) throw damaged();
        room(len);
        // Byte by byte: the copy may overlap what it is writing, which is how runs are packed.
        for (let i = 0; i < len; i += 1, length += 1) out[length] = out[length - distance]!;
      }
    }
  };

  for (let last = 0; !last; ) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      // A stored block starts at the next whole byte; what is left of this one is padding.
      buffer = 0;
      held = 0;
      if (pos + 4 > input.length) throw damaged();
      const len = input[pos]! | (input[pos + 1]! << 8);
      const check = input[pos + 2]! | (input[pos + 3]! << 8);
      if (len !== (~check & 0xffff)) throw damaged();
      pos += 4;
      if (pos + len > input.length) throw damaged();
      room(len);
      out.set(input.subarray(pos, pos + len), length);
      length += len;
      pos += len;
    } else if (type === 1) {
      codes(FIXED.codes, FIXED.distances);
    } else if (type === 2) {
      const literals = bits(5) + 257;
      const distances = bits(5) + 1;
      const lengthCodes = bits(4) + 4;
      if (literals > 286 || distances > 30) throw damaged();
      const order = new Uint8Array(19);
      for (let i = 0; i < lengthCodes; i += 1) order[CODE_ORDER[i]!] = bits(3);
      const lengthCode = huffman(order);
      const lengths = new Uint8Array(literals + distances);
      for (let i = 0; i < lengths.length; ) {
        const symbol = decode(lengthCode);
        if (symbol < 16) {
          lengths[i++] = symbol;
          continue;
        }
        let repeat: number;
        let value = 0;
        if (symbol === 16) {
          if (i === 0) throw damaged();
          value = lengths[i - 1]!;
          repeat = 3 + bits(2);
        } else if (symbol === 17) {
          repeat = 3 + bits(3);
        } else {
          repeat = 11 + bits(7);
        }
        if (i + repeat > lengths.length) throw damaged();
        lengths.fill(value, i, i + repeat);
        i += repeat;
      }
      if (lengths[256] === 0) throw damaged();
      codes(huffman(lengths.subarray(0, literals)), huffman(lengths.subarray(literals)));
    } else {
      throw damaged();
    }
  }
  return out.subarray(0, length);
}
