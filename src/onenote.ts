/**
 * OneNote's own files, read in the page: a section (`.one`) of a notebook as
 * OneNote 2010–2016 and OneNote for Windows keep it on a disk. Nothing is
 * asked of OneNote itself — a browser on a Mac could not ask it anyway — the
 * bytes are taken apart here, following [MS-ONESTORE] (the revision store:
 * file nodes, revisions, objects and their properties) and [MS-ONE] (what
 * those objects are: pages, outlines, paragraphs), the way the onenote.rs
 * parser reads them.
 *
 * What comes out is what a note in Markdown can keep: each page's title and
 * dates, the outlines in the order they stand on the page, their paragraphs
 * with the formatting of each run, lists, to-do tags, tables, pictures and
 * attached files. Ink and the exact place of things on the page stay behind.
 * Pictures and files are not copied: they are where they lie in the section,
 * and the caller slices them out of it.
 */

import { t } from './i18n';

/** Bytes of the section: a picture or an attached file. */
export interface OneData {
  offset: number;
  length: number;
}

export interface OneRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  sup?: boolean;
  sub?: boolean;
  /** `#rrggbb`; none for the automatic colour. */
  color?: string;
  highlight?: string;
  link?: string;
}

export interface OneText {
  kind: 'text';
  runs: OneRun[];
  /** The paragraph style OneNote names it by: `p`, `h1`…`h6`, `code`, `quote`, `cite`… */
  style: string;
  /** A to-do tag: unchecked or checked; null for none. */
  todo: boolean | null;
}

export interface OneTable {
  kind: 'table';
  /** Rows of cells, each cell a few paragraphs. */
  rows: OneElement[][][];
}

export interface OneImage {
  kind: 'image';
  data: OneData | null;
  /** `.png`, `.jpg`…, from the bytes; empty when they say nothing. */
  ext: string;
  name: string;
  alt: string;
}

export interface OneFile {
  kind: 'file';
  data: OneData | null;
  name: string;
}

export type OneContent = OneText | OneTable | OneImage | OneFile;

export interface OneElement {
  contents: OneContent[];
  /** Null for a paragraph that is not a list item. */
  list: { ordered: boolean } | null;
  children: OneElement[];
}

/** An outline, or a picture or a file put straight on the page: a box at its place. */
export interface OneBox {
  x: number;
  y: number;
  elements: OneElement[];
}

export interface OnePage {
  /** The page's GUID, which links to it from other pages carry as `page-id`. */
  id: string;
  title: string;
  /** 1 for a page, 2 and 3 for its subpages. */
  level: number;
  created: Date | null;
  modified: Date | null;
  /** Top to bottom, then left to right. */
  boxes: OneBox[];
}

export interface OneSection {
  /** The name OneNote shows, when the section keeps one. */
  name: string | null;
  pages: OnePage[];
}

/* ------------------------------------------------------------------ *
 * Bytes
 * ------------------------------------------------------------------ */

const SECTION_FILE = '{7b5c52e4-d88c-4da7-aeb1-5378d02996d3}';
const TOC_FILE = '{43ff2fa1-efd9-4c76-9ee2-10ea5722765f}';
const FORMAT_2010 = '{109add3f-911b-49f5-a5d0-1791edc8aed8}';
const PACKAGE_FORMAT = '{638de92f-a6d4-4bc1-9a36-b3fc2511a5b7}';
const NIL_GUID = '{00000000-0000-0000-0000-000000000000}';
const NIL = `${NIL_GUID}:0`;
/** File nodes or objects one section may take: far more than the largest notebook has, far less than would hang the page. */
const WORK = 5_000_000;

function damaged(): Error {
  return new Error(t('errors', 'The OneNote file is damaged'));
}

/** A run of the file: where it starts and how long it is; `stp` -1 is the nil reference. */
interface Chunk {
  stp: number;
  cb: number;
}

const scratch = new DataView(new ArrayBuffer(4));
const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

class Reader {
  private readonly view: DataView;

  constructor(
    readonly bytes: Uint8Array,
    public pos = 0,
    readonly end = bytes.length,
  ) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  private need(n: number): number {
    const at = this.pos;
    if (n < 0 || at + n > this.end) throw damaged();
    this.pos += n;
    return at;
  }

  u8(): number {
    return this.view.getUint8(this.need(1));
  }

  u16(): number {
    return this.view.getUint16(this.need(2), true);
  }

  u32(): number {
    return this.view.getUint32(this.need(4), true);
  }

  /** Exact up to 2^53, which is more than any offset in a file; -1 for all ones, the nil offset. */
  u64(): number {
    const lo = this.u32();
    const hi = this.u32();
    return lo === 0xffffffff && hi === 0xffffffff ? -1 : hi * 0x100000000 + lo;
  }

  guid(): string {
    const at = this.need(16);
    const b = this.bytes;
    const h = (i: number): string => HEX[b[at + i]!]!;
    return `{${h(3)}${h(2)}${h(1)}${h(0)}-${h(5)}${h(4)}-${h(7)}${h(6)}-${h(8)}${h(9)}-${h(10)}${h(11)}${h(12)}${h(13)}${h(14)}${h(15)}}`;
  }

  /** An ExtendedGUID: a GUID and a number, as one key. */
  exGuid(): string {
    const guid = this.guid();
    return `${guid}:${this.u32()}`;
  }

  peek(): number {
    if (this.pos >= this.end) throw damaged();
    return this.bytes[this.pos]!;
  }

  /** `n` bytes, little-endian; exact up to 2^53. */
  private uint(n: number): number {
    const at = this.need(n);
    let value = 0;
    for (let i = n - 1; i >= 0; i -= 1) value = value * 256 + this.bytes[at + i]!;
    return value;
  }

  /** A compact unsigned 64-bit integer of [MS-FSSHTTPB]: the lowest set bit of the first byte says how many bytes it takes. */
  compact(): number {
    const first = this.peek();
    if (first === 0) {
      this.pos += 1;
      return 0;
    }
    for (let n = 1; n <= 7; n += 1) if (first & (1 << (n - 1))) return Math.floor(this.uint(n) / 2 ** n);
    this.pos += 1;
    return this.uint(8);
  }

  /** A compact ExtendedGUID of [MS-FSSHTTPB], as the same key as exGuid() gives. */
  compactGuid(): string {
    const data = this.u8();
    let value: number;
    if (data === 0) return NIL;
    if ((data & 0x07) === 0x04) value = data >>> 3;
    else if ((data & 0x3f) === 0x20) value = (this.u8() << 2) | (data >>> 6);
    else if ((data & 0x7f) === 0x40) value = (this.u16() << 1) | (data >>> 7);
    else if (data === 0x80) value = this.u32();
    else throw damaged();
    return `${this.guid()}:${value}`;
  }

  take(n: number): Uint8Array {
    const at = this.need(n);
    return this.bytes.subarray(at, at + n);
  }
}

/** Without the NULs a string is padded with at its end; a loop, as a regular expression would take quadratic time on many of them. */
function trimNul(text: string): string {
  let end = text.length;
  while (end > 0 && text.charCodeAt(end - 1) === 0) end -= 1;
  return text.slice(0, end);
}

function utf16(bytes: Uint8Array): string {
  return trimNul(new TextDecoder('utf-16le').decode(bytes.subarray(0, bytes.length - (bytes.length % 2))));
}

function latin1(bytes: Uint8Array): string {
  return trimNul(new TextDecoder('latin1').decode(bytes));
}

/* ------------------------------------------------------------------ *
 * File nodes: the revision store's lists
 * ------------------------------------------------------------------ */

interface FileNode {
  id: number;
  /** Where the node's own fields start, after its reference. */
  at: number;
  ref: Chunk | null;
  /** The list a node of base type 2 points at. */
  list: FileNode[] | null;
}

interface Store {
  bytes: Uint8Array;
  /** How many nodes each list still has, from the transaction log: what follows them was never committed. */
  counts: Map<number, number>;
  /** Fragments already read: no list is in two places, and a damaged file pointing back must not loop. */
  read: Set<number>;
  /** Nodes left to read: a crafted file cannot make the page work forever. */
  budget: number;
}

function isNil(chunk: Chunk): boolean {
  return chunk.stp < 0;
}

function readerAt(store: Store, chunk: Chunk): Reader {
  if (isNil(chunk) || chunk.stp + chunk.cb > store.bytes.length) throw damaged();
  return new Reader(store.bytes, chunk.stp, chunk.stp + chunk.cb);
}

/** FileChunkReference64x32. */
function chunk64x32(r: Reader): Chunk {
  const stp = r.u64();
  return { stp, cb: r.u32() };
}

/** FileNodeChunkReference: its sizes are given by the node's header. */
function nodeRef(r: Reader, stpFormat: number, cbFormat: number): Chunk {
  let stp: number;
  if (stpFormat === 0) stp = r.u64();
  else if (stpFormat === 1) {
    const value = r.u32();
    stp = value === 0xffffffff ? -1 : value;
  } else if (stpFormat === 2) {
    const value = r.u16();
    stp = value === 0xffff ? -1 : value * 8;
  } else {
    const value = r.u32();
    stp = value === 0xffffffff ? -1 : value * 8;
  }
  let cb: number;
  if (cbFormat === 0) cb = r.u32();
  else if (cbFormat === 1) cb = r.u64();
  else if (cbFormat === 2) cb = r.u8() * 8;
  else cb = r.u16() * 8;
  return { stp, cb };
}

/** A file node list, all its fragments one after another. */
function readList(store: Store, first: Chunk, depth: number): FileNode[] {
  if (depth > 24) throw damaged();
  const nodes: FileNode[] = [];
  let next: Chunk = first;
  let sequence = 0;
  while (!isNil(next) && next.cb > 0) {
    if (store.read.has(next.stp)) throw damaged();
    store.read.add(next.stp);
    const r = readerAt(store, next);
    if (r.u32() !== 0xf5f7f4c4 || r.u32() !== 0xa4567ab1) throw damaged();
    const listId = r.u32();
    if (r.u32() !== sequence) throw damaged();
    sequence += 1;
    // Past the nodes: the next fragment's reference and the footer.
    const stop = next.stp + next.cb - 20;
    let left = store.counts.get(listId) ?? Infinity;
    while (left > 0 && r.pos + 4 <= stop) {
      const start = r.pos;
      const header = r.u32();
      const id = header & 0x3ff;
      // Zeros are padding; ChunkTerminatorFND ends the fragment.
      if (id === 0 || id === 0xff) break;
      const size = (header >>> 10) & 0x1fff;
      if (size < 4 || start + size > stop) throw damaged();
      const base = (header >>> 27) & 0xf;
      let ref: Chunk | null = null;
      let list: FileNode[] | null = null;
      if (base === 1 || base === 2) ref = nodeRef(r, (header >>> 23) & 3, (header >>> 25) & 3);
      if (base === 2 && ref) list = isNil(ref) ? [] : readList(store, ref, depth + 1);
      nodes.push({ id, at: r.pos, ref, list });
      if ((store.budget -= 1) < 0) throw damaged();
      r.pos = start + size;
      left -= 1;
    }
    store.counts.set(listId, left);
    r.pos = stop;
    next = chunk64x32(r);
  }
  return nodes;
}

/** How many nodes each list holds after the committed transactions. */
function readTransactions(store: Store, first: Chunk, transactions: number): void {
  let next = first;
  let done = 0;
  const seen = new Set<number>();
  while (!isNil(next) && next.cb > 0 && done < transactions) {
    if (seen.has(next.stp)) throw damaged();
    seen.add(next.stp);
    const r = readerAt(store, next);
    const entries = Math.floor((next.cb - 12) / 8);
    for (let i = 0; i < entries && done < transactions; i += 1) {
      const src = r.u32();
      const count = r.u32();
      if (src === 1) done += 1;
      else store.counts.set(src, count);
    }
    r.pos = next.stp + 8 * entries;
    next = chunk64x32(r);
  }
}

/* ------------------------------------------------------------------ *
 * Properties
 * ------------------------------------------------------------------ */

interface Prop {
  id: number;
  type: number;
  bool: boolean;
  value: number | Uint8Array | Prop[][] | null;
  /** Where its references start in the object's streams of IDs, and how many it has. */
  oid: number;
  osid: number;
  count: number;
}

/** The properties of an object, with the objects and object spaces they refer to resolved. */
class Props {
  constructor(
    private readonly list: readonly Prop[],
    private readonly oids: readonly (string | null)[],
    private readonly osids: readonly (string | null)[],
  ) {}

  static readonly none = new Props([], [], []);

  private find(id: number): Prop | undefined {
    const key = id & 0x3ffffff;
    return this.list.find((prop) => prop.id === key);
  }

  bool(id: number): boolean {
    const prop = this.find(id);
    return prop?.type === 2 ? prop.bool : false;
  }

  num(id: number): number | undefined {
    const value = this.find(id)?.value;
    return typeof value === 'number' ? value : undefined;
  }

  f32(id: number): number | undefined {
    const value = this.num(id);
    if (value === undefined) return undefined;
    scratch.setUint32(0, value >>> 0, true);
    return scratch.getFloat32(0, true);
  }

  bytes(id: number): Uint8Array | undefined {
    const value = this.find(id)?.value;
    return value instanceof Uint8Array ? value : undefined;
  }

  text(id: number): string | undefined {
    const bytes = this.bytes(id);
    return bytes ? utf16(bytes) : undefined;
  }

  ref(id: number): string | null {
    const prop = this.find(id);
    return prop?.type === 8 ? (this.oids[prop.oid] ?? null) : null;
  }

  refs(id: number): string[] {
    const prop = this.find(id);
    if (prop?.type !== 9) return [];
    return this.oids.slice(prop.oid, prop.oid + prop.count).filter((key): key is string => key !== null);
  }

  spaces(id: number): string[] {
    const prop = this.find(id);
    if (prop?.type !== 0xb) return [];
    return this.osids.slice(prop.osid, prop.osid + prop.count).filter((key): key is string => key !== null);
  }

  /** An array of property sets, each as properties of its own. */
  sets(id: number): Props[] {
    const prop = this.find(id);
    if (prop?.type !== 0x10 || !Array.isArray(prop.value)) return [];
    return prop.value.map((set) => new Props(set, this.oids, this.osids));
  }
}

interface Counter {
  oid: number;
  osid: number;
  ctx: number;
}

function readPropertySet(r: Reader, counter: Counter, depth: number): Prop[] {
  if (depth > 8) throw damaged();
  const count = r.u16();
  const ids: number[] = [];
  for (let i = 0; i < count; i += 1) ids.push(r.u32());
  const props: Prop[] = [];
  for (const raw of ids) {
    const type = (raw >>> 26) & 0x1f;
    const prop: Prop = { id: raw & 0x3ffffff, type, bool: raw >>> 31 === 1, value: null, oid: counter.oid, osid: counter.osid, count: 0 };
    switch (type) {
      case 0x1:
      case 0x2:
        break;
      case 0x3:
        prop.value = r.u8();
        break;
      case 0x4:
        prop.value = r.u16();
        break;
      case 0x5:
        prop.value = r.u32();
        break;
      case 0x6:
        prop.value = r.u64();
        break;
      case 0x7:
        prop.value = r.take(r.u32());
        break;
      case 0x8:
        prop.count = 1;
        counter.oid += 1;
        break;
      case 0x9:
        prop.count = r.u32();
        counter.oid += prop.count;
        break;
      case 0xa:
        prop.count = 1;
        counter.osid += 1;
        break;
      case 0xb:
        prop.count = r.u32();
        counter.osid += prop.count;
        break;
      case 0xc:
        counter.ctx += 1;
        break;
      case 0xd:
        counter.ctx += r.u32();
        break;
      case 0x10: {
        const sets = r.u32();
        if (sets > 0) r.u32();
        const value: Prop[][] = [];
        for (let i = 0; i < sets; i += 1) value.push(readPropertySet(r, counter, depth + 1));
        prop.value = value;
        break;
      }
      case 0x11:
        prop.value = [readPropertySet(r, counter, depth + 1)];
        break;
      default:
        throw damaged();
    }
    props.push(prop);
  }
  return props;
}

/** A global ID table: compact IDs' indexes → GUIDs. */
type IdTable = Map<number, string>;

/** A CompactID → its ExtendedGUID key; null when the table has no such index. */
function resolve(compact: number, table: IdTable | null): string | null {
  const n = compact & 0xff;
  const index = compact >>> 8;
  if (n === 0 && index === 0) return null;
  const guid = table?.get(index);
  return guid ? `${guid}:${n}` : null;
}

/** ObjectSpaceObjectPropSet: the streams of compact IDs it refers to, then its properties. */
function readRawProps(r: Reader): { oids: number[]; osids: number[]; list: Prop[] } {
  const stream = (): { ids: number[]; more: boolean; last: boolean } => {
    const header = r.u32();
    const ids: number[] = [];
    for (let i = 0, n = header & 0xffffff; i < n; i += 1) ids.push(r.u32());
    return { ids, more: (header >>> 30) & 1 ? true : false, last: header >>> 31 === 1 };
  };
  const oids = stream();
  let osids: number[] = [];
  if (!oids.last) {
    const spaces = stream();
    osids = spaces.ids;
    if (spaces.more) stream();
  }
  return { oids: oids.ids, osids, list: readPropertySet(r, { oid: 0, osid: 0, ctx: 0 }, 0) };
}

/** The properties of an object in a revision store: its IDs are resolved through the global ID table in force. */
function readObjectProps(store: Store, chunk: Chunk | null, table: IdTable | null): Props {
  if (!chunk || isNil(chunk)) return Props.none;
  const raw = readRawProps(readerAt(store, chunk));
  return new Props(
    raw.list,
    raw.oids.map((id) => resolve(id, table)),
    raw.osids.map((id) => resolve(id, table)),
  );
}

/* ------------------------------------------------------------------ *
 * Object spaces and their revisions
 * ------------------------------------------------------------------ */

interface StoredObject {
  jcid: number;
  props: Props;
  data: OneData | null;
}

interface Space {
  roots: Map<number, string>;
  objects: Map<string, StoredObject>;
}

interface Revision {
  parent: string;
  roots: Map<number, string>;
  objects: Map<string, StoredObject>;
  ids: IdTable;
}

/** The files a section keeps inside itself, by GUID: pictures and attachments. */
type DataStore = Map<string, OneData>;

function readDataStore(store: Store, nodes: readonly FileNode[]): DataStore {
  const files: DataStore = new Map();
  for (const node of nodes) {
    if (node.id !== 0x90 || !node.list) continue;
    for (const item of node.list) {
      if (item.id !== 0x94 || !item.ref) continue;
      const guid = new Reader(store.bytes, item.at).guid();
      const r = readerAt(store, item.ref);
      r.guid();
      const length = r.u64();
      const offset = item.ref.stp + 36;
      if (length < 0 || offset + length > store.bytes.length) throw damaged();
      files.set(guid, { offset, length });
    }
  }
  return files;
}

/** An object declared in a revision, or null for a node that declares none. */
function declare(store: Store, node: FileNode, table: IdTable | null, files: DataStore): [string, StoredObject] | null {
  const r = new Reader(store.bytes, node.at);
  switch (node.id) {
    case 0xa4:
    case 0xa5:
    case 0xc4:
    case 0xc5: {
      const props = readObjectProps(store, node.ref, table);
      const key = resolve(r.u32(), table);
      return key ? [key, { jcid: r.u32(), props, data: null }] : null;
    }
    case 0x2d:
    case 0x2e: {
      const props = readObjectProps(store, node.ref, table);
      const key = resolve(r.u32(), table);
      const body = r.u32();
      if ((body >>> 10) & 0xf) throw encrypted();
      return key ? [key, { jcid: 0x20000 | (body & 0x3ff), props, data: null }] : null;
    }
    case 0x72:
    case 0x73: {
      const key = resolve(r.u32(), table);
      const jcid = r.u32();
      if (node.id === 0x72) r.u8();
      else r.u32();
      const reference = utf16(r.take(r.u32() * 2));
      const match = /^<ifndf>(\{[0-9a-f-]+\})/i.exec(reference);
      const data = match ? (files.get(match[1]!.toLowerCase()) ?? null) : null;
      return key ? [key, { jcid, props: Props.none, data }] : null;
    }
    default:
      return null;
  }
}

function encrypted(): Error {
  return new Error(t('errors', 'The section is protected with a password'));
}

/** An object group: objects declared together, with a global ID table of their own. */
function readGroup(store: Store, nodes: readonly FileNode[], files: DataStore, into: Map<string, StoredObject>): void {
  let table: IdTable | null = null;
  for (const node of nodes) {
    if (node.id === 0x21 || node.id === 0x22) table = new Map();
    else if (node.id === 0x24 && table) {
      const r = new Reader(store.bytes, node.at);
      const index = r.u32();
      table.set(index, r.guid());
    } else {
      const declared = declare(store, node, table, files);
      if (declared) into.set(declared[0], declared[1]);
    }
  }
}

/** The revisions of an object space, made into the objects of the one in force. */
function readSpace(store: Store, nodes: readonly FileNode[], files: DataStore): Space {
  const revisions = new Map<string, Revision>();
  const labels = new Map<string, string>();
  const label = (context: string, role: number, rid: string): void => {
    labels.set(`${context}|${role}`, rid);
  };
  let i = 0;
  while (i < nodes.length) {
    const node = nodes[i]!;
    if (node.id === 0x1b || node.id === 0x1e || node.id === 0x1f) {
      const r = new Reader(store.bytes, node.at);
      const rid = r.exGuid();
      const parent = r.exGuid();
      if (node.id === 0x1b) r.u64();
      const role = r.u32();
      r.u16();
      const context = node.id === 0x1f ? r.exGuid() : NIL;
      const inherited = revisions.get(parent)?.ids;
      // Copying the table it builds on is work too: revisions stacked on revisions would square it.
      if ((store.budget -= inherited?.size ?? 0) < 0) throw damaged();
      const revision: Revision = { parent, roots: new Map(), objects: new Map(), ids: new Map(inherited ?? []) };
      i = readRevision(store, nodes, i + 1, revision, revisions, files);
      revisions.set(rid, revision);
      label(context, role, rid);
      continue;
    }
    if (node.id === 0x5c || node.id === 0x5d) {
      const r = new Reader(store.bytes, node.at);
      const rid = r.exGuid();
      const role = r.u32();
      if (revisions.has(rid)) label(node.id === 0x5d ? r.exGuid() : NIL, role, rid);
    }
    i += 1;
  }
  const chain: Revision[] = [];
  const seen = new Set<string>();
  for (let rid = labels.get(`${NIL}|1`); rid && rid !== NIL && !seen.has(rid); ) {
    seen.add(rid);
    const revision = revisions.get(rid);
    if (!revision) break;
    chain.unshift(revision);
    rid = revision.parent;
  }
  const space: Space = { roots: new Map(), objects: new Map() };
  for (const revision of chain) {
    for (const [role, id] of revision.roots) space.roots.set(role, id);
    for (const [id, object] of revision.objects) space.objects.set(id, object);
  }
  return space;
}

/** One revision's nodes, from after its start to its end; returns where the next one starts. */
function readRevision(store: Store, nodes: readonly FileNode[], from: number, revision: Revision, revisions: Map<string, Revision>, files: DataStore): number {
  const parentIds = revisions.get(revision.parent)?.ids;
  let table: IdTable | null = null;
  let i = from;
  for (; i < nodes.length; i += 1) {
    const node = nodes[i]!;
    const r = new Reader(store.bytes, node.at);
    switch (node.id) {
      case 0x1c:
        return i + 1;
      case 0xb0:
        readGroup(store, node.list ?? [], files, revision.objects);
        break;
      case 0x21:
      case 0x22:
        table = new Map();
        break;
      case 0x24: {
        const index = r.u32();
        table?.set(index, r.guid());
        break;
      }
      case 0x25: {
        const from = parentIds?.get(r.u32());
        const to = r.u32();
        if (from) table?.set(to, from);
        break;
      }
      case 0x26: {
        const start = r.u32();
        const count = Math.min(r.u32(), parentIds?.size ?? 0);
        const to = r.u32();
        for (let n = 0; n < count; n += 1) {
          const guid = parentIds?.get(start + n);
          if (guid) table?.set(to + n, guid);
        }
        break;
      }
      case 0x28:
        for (const [index, guid] of table ?? []) revision.ids.set(index, guid);
        break;
      case 0x41:
      case 0x42: {
        const props = readObjectProps(store, node.ref, table);
        const key = resolve(r.u32(), table);
        const before = key ? (revision.objects.get(key) ?? findDeclared(revisions, revision.parent, key)) : undefined;
        if (key && before) revision.objects.set(key, { jcid: before.jcid, props, data: before.data });
        break;
      }
      case 0x59: {
        const key = resolve(r.u32(), table);
        const role = r.u32();
        if (key) revision.roots.set(role, key);
        break;
      }
      case 0x5a: {
        const key = r.exGuid();
        revision.roots.set(r.u32(), key);
        break;
      }
      case 0x7c:
        throw encrypted();
      default: {
        const declared = declare(store, node, table, files);
        if (declared) revision.objects.set(declared[0], declared[1]);
      }
    }
  }
  return i;
}

function findDeclared(revisions: Map<string, Revision>, from: string, key: string): StoredObject | undefined {
  const seen = new Set<string>();
  for (let rid = from; rid !== NIL && !seen.has(rid); ) {
    seen.add(rid);
    const revision = revisions.get(rid);
    if (!revision) return undefined;
    const found = revision.objects.get(key);
    if (found) return found;
    rid = revision.parent;
  }
  return undefined;
}

interface ParsedStore {
  /** A section, or a notebook's table of contents. */
  section: boolean;
  root: Space;
  spaces: Map<string, Space>;
}

/**
 * A `.one` or a `.onetoc2`, in either of its two forms: the revision store
 * OneNote 2010–2016 writes, or the package of [MS-FSSHTTPB] data elements a
 * notebook synced through OneDrive or SharePoint is kept in.
 */
function readStore(bytes: Uint8Array): ParsedStore {
  if (bytes.length < 1024) throw damaged();
  const header = new Reader(bytes);
  const type = header.guid();
  if (type !== SECTION_FILE && type !== TOC_FILE) throw new Error(t('errors', 'This is not a OneNote section'));
  header.pos = 32;
  const legacy = header.guid();
  const format = header.guid();
  if (format === PACKAGE_FORMAT) return readPackage(bytes, 0);
  if (format !== FORMAT_2010) throw new Error(t('errors', 'Only sections of OneNote 2010 and later can be opened'));
  // A revision store may carry a package after its transaction log, with nothing of its own.
  if (legacy === NIL_GUID) {
    header.pos = 160;
    const log = chunk64x32(header);
    const after = log.stp + log.cb;
    if (log.stp > 0 && after + 64 <= bytes.length) {
      const probe = new Reader(bytes, after + 48);
      if (probe.guid() === PACKAGE_FORMAT) return readPackage(bytes, after);
    }
  }
  return { section: type === SECTION_FILE, ...readRevisionStore(bytes) };
}

function readRevisionStore(bytes: Uint8Array): { root: Space; spaces: Map<string, Space> } {
  const header = new Reader(bytes);
  const store: Store = { bytes, counts: new Map(), read: new Set(), budget: WORK };
  header.pos = 96;
  const transactions = header.u32();
  header.pos = 160;
  readTransactions(store, chunk64x32(header), transactions);
  header.pos = 172;
  const nodes = readList(store, chunk64x32(header), 0);
  const files = readDataStore(store, nodes);
  const spaces = new Map<string, Space>();
  let rootId = '';
  for (const node of nodes) {
    const r = new Reader(bytes, node.at);
    if (node.id === 0x04) rootId = r.exGuid();
    if (node.id !== 0x08 || !node.list) continue;
    const id = r.exGuid();
    const lists = node.list.filter((item) => item.id === 0x10 && item.list);
    const last = lists[lists.length - 1];
    if (last?.list) spaces.set(id, readSpace(store, last.list, files));
  }
  const root = spaces.get(rootId);
  if (!root) throw damaged();
  return { root, spaces };
}

/* ------------------------------------------------------------------ *
 * The package of data elements: [MS-FSSHTTPB]
 * ------------------------------------------------------------------ */

const SECTION_SCHEMA = '{1f937cb4-b26f-445f-b9f8-17e20160e461}';
const DATA_ROOT = '{84defab9-aaa3-4a0d-a3a8-520c77ac7073}:2';
const HEADER_CELL = '{1a5a319c-c26b-41aa-b9c5-9bd8c44e07d4}:1';
const ROOT_ROLE = '{4a3717f8-1c14-49e7-9526-81d942de1741}';

/** Stream object types of [MS-FSSHTTPB] 2.2.1.5 that the package is made of. */
const T = {
  dataElement: 0x01,
  objectDataBlob: 0x02,
  groupDataExcluded: 0x03,
  groupDataBlob: 0x05,
  revisionManifestRoot: 0x0a,
  cellManifest: 0x0b,
  storageManifest: 0x0c,
  revisionMapping: 0x0d,
  cellMapping: 0x0e,
  manifestMapping: 0x11,
  dataElementPackage: 0x15,
  groupDataObject: 0x16,
  storageManifestRoot: 0x07,
  groupObject: 0x18,
  groupReference: 0x19,
  revisionManifest: 0x1a,
  groupBlobReference: 0x1c,
  groupDeclaration: 0x1d,
  groupData: 0x1e,
  fragment: 0x6a,
  groupMetadata: 0x78,
  groupMetadataBlock: 0x79,
  packaging: 0x7a,
};

/** A stream object's start: its type and length, in a header of 16 or 32 bits. */
function streamHeader(r: Reader): { type: number; length: number } {
  const kind = r.peek() & 3;
  if (kind === 0) {
    const value = r.u16();
    return { type: (value >>> 3) & 0x3f, length: value >>> 9 };
  }
  if (kind === 2) {
    const value = r.u32();
    let length = value >>> 17;
    if (length === 0x7fff) length = r.compact();
    return { type: (value >>> 3) & 0x3fff, length };
  }
  throw damaged();
}

function expectStart(r: Reader, type: number): void {
  if (streamHeader(r).type !== type) throw damaged();
}

function atEnd8(r: Reader, type: number): boolean {
  const byte = r.peek();
  return (byte & 3) === 1 && byte >>> 2 === type;
}

function expectEnd8(r: Reader, type: number): void {
  const byte = r.u8();
  if ((byte & 3) !== 1 || byte >>> 2 !== type) throw damaged();
}

function serialNumber(r: Reader): string {
  if (r.u8() === 0) return '';
  const guid = r.guid();
  return `${guid}:${r.u64()}`;
}

function compactGuids(r: Reader): string[] {
  const count = r.compact();
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) out.push(r.compactGuid());
  return out;
}

/** A cell: a context and an object space, as one key. */
function cellId(r: Reader): string {
  const context = r.compactGuid();
  return `${context}|${r.compactGuid()}`;
}

function cellIds(r: Reader): string[] {
  const count = r.compact();
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) out.push(cellId(r));
  return out;
}

interface GroupObject {
  id: string;
  partition: number;
  /** Partition 1, the object's properties; 4, its JCID. */
  data?: Uint8Array;
  objects?: string[];
  cells?: string[];
  /** Partition 2: the data element holding the file. */
  blob?: string;
}

interface Package {
  indexes: Map<string, { cells: Map<string, { id: string; serial: string }>; revisions: Map<string, { manifest: string; serial: string }> }>;
  manifests: { id: string; roots: Map<string, string> }[];
  cellManifests: Map<string, string>;
  revisions: Map<string, { base: string; roots: [string, string][]; groups: string[] }>;
  groups: Map<string, GroupObject[]>;
  blobs: Map<string, OneData>;
}

function readDataElement(r: Reader, into: Package): void {
  expectStart(r, T.dataElement);
  const id = r.compactGuid();
  serialNumber(r);
  const type = r.compact();
  switch (type) {
    case 0x01: {
      const cells = new Map<string, { id: string; serial: string }>();
      const revisions = new Map<string, { manifest: string; serial: string }>();
      while (!atEnd8(r, T.dataElement)) {
        const header = streamHeader(r);
        if (header.type === T.manifestMapping) {
          r.compactGuid();
          serialNumber(r);
        } else if (header.type === T.cellMapping) {
          const cell = cellId(r);
          const mapping = r.compactGuid();
          cells.set(cell, { id: mapping, serial: serialNumber(r) });
        } else if (header.type === T.revisionMapping) {
          const revision = r.compactGuid();
          const manifest = r.compactGuid();
          revisions.set(revision, { manifest, serial: serialNumber(r) });
        } else throw damaged();
      }
      into.indexes.set(id, { cells, revisions });
      break;
    }
    case 0x02: {
      expectStart(r, T.storageManifest);
      const manifest = { id: r.guid(), roots: new Map<string, string>() };
      while (!atEnd8(r, T.dataElement)) {
        expectStart(r, T.storageManifestRoot);
        const root = r.compactGuid();
        manifest.roots.set(root, cellId(r));
      }
      into.manifests.push(manifest);
      break;
    }
    case 0x03:
      expectStart(r, T.cellManifest);
      into.cellManifests.set(id, r.compactGuid());
      break;
    case 0x04: {
      expectStart(r, T.revisionManifest);
      r.compactGuid();
      const revision = { base: r.compactGuid(), roots: [] as [string, string][], groups: [] as string[] };
      while (!atEnd8(r, T.dataElement)) {
        const header = streamHeader(r);
        if (header.type === T.revisionManifestRoot) {
          const root = r.compactGuid();
          revision.roots.push([root, r.compactGuid()]);
        } else if (header.type === T.groupReference) revision.groups.push(r.compactGuid());
        else throw damaged();
      }
      into.revisions.set(id, revision);
      break;
    }
    case 0x05:
      into.groups.set(id, readObjectGroup(r));
      break;
    case 0x06: {
      expectStart(r, T.fragment);
      r.compactGuid();
      const size = r.compact();
      r.compact();
      r.compact();
      r.take(size);
      break;
    }
    case 0x0a: {
      expectStart(r, T.objectDataBlob);
      const length = r.compact();
      into.blobs.set(id, { offset: r.pos, length });
      r.take(length);
      break;
    }
    default:
      throw damaged();
  }
  expectEnd8(r, T.dataElement);
}

/** An object group: what each object is declared as, then their data in the same order. */
function readObjectGroup(r: Reader): GroupObject[] {
  expectStart(r, T.groupDeclaration);
  const objects: GroupObject[] = [];
  while (!atEnd8(r, T.groupDeclaration)) {
    const header = streamHeader(r);
    if (header.type === T.groupObject) {
      const id = r.compactGuid();
      const partition = r.compact();
      r.compact();
      r.compact();
      r.compact();
      objects.push({ id, partition });
    } else if (header.type === T.groupDataBlob) {
      const id = r.compactGuid();
      r.compactGuid();
      const partition = r.compact();
      r.compact();
      r.compact();
      objects.push({ id, partition });
    } else throw damaged();
  }
  expectEnd8(r, T.groupDeclaration);
  let header = streamHeader(r);
  if (header.type === T.groupMetadataBlock) {
    while (!atEnd8(r, T.groupMetadataBlock)) {
      expectStart(r, T.groupMetadata);
      r.compact();
    }
    expectEnd8(r, T.groupMetadataBlock);
    header = streamHeader(r);
  }
  if (header.type !== T.groupData) throw damaged();
  let index = 0;
  while (!atEnd8(r, T.groupData)) {
    const item = streamHeader(r);
    const object = objects[index++];
    if (item.type === T.groupDataExcluded) {
      compactGuids(r);
      cellIds(r);
      r.compact();
    } else if (item.type === T.groupDataObject) {
      const refs = compactGuids(r);
      const cells = cellIds(r);
      const data = r.take(r.compact());
      if (object) Object.assign(object, { objects: refs, cells, data });
    } else if (item.type === T.groupBlobReference) {
      compactGuids(r);
      cellIds(r);
      const blob = r.compactGuid();
      if (object) object.blob = blob;
    } else throw damaged();
  }
  expectEnd8(r, T.groupData);
  return objects;
}

/** A package's object spaces, each from the revision its cell is at, back through the revisions it builds on. */
function readPackage(bytes: Uint8Array, offset: number): ParsedStore {
  const r = new Reader(bytes, offset + 64);
  if (r.u32() !== 0) throw damaged();
  expectStart(r, T.packaging);
  const indexId = r.compactGuid();
  r.guid();
  expectStart(r, T.dataElementPackage);
  if (r.u8() !== 0) throw damaged();
  const pack: Package = { indexes: new Map(), manifests: [], cellManifests: new Map(), revisions: new Map(), groups: new Map(), blobs: new Map() };
  while (!atEnd8(r, T.dataElementPackage)) readDataElement(r, pack);
  const index = pack.indexes.get(indexId) ?? pack.indexes.values().next().value;
  const manifest = pack.manifests[0];
  if (!index || !manifest) throw damaged();
  const budget = { left: WORK };
  const revisionOf = (id: string): string | null => index.revisions.get(id)?.manifest ?? (pack.revisions.has(id) ? id : null);
  const spaces = new Map<string, Space>();
  for (const [cell, mapping] of index.cells) {
    if (mapping.id === NIL || cell === manifest.roots.get(HEADER_CELL)) continue;
    const cellRevision = pack.cellManifests.get(mapping.id);
    let revision = (cellRevision ? revisionOf(cellRevision) : null) ?? revisionOf(mapping.id);
    if (!revision && mapping.serial) revision = [...index.revisions.values()].find((item) => item.serial === mapping.serial)?.manifest ?? null;
    if (revision) spaces.set(cell, readPackageSpace(bytes, pack, cell, revision, revisionOf, budget));
  }
  const root = spaces.get(manifest.roots.get(DATA_ROOT) ?? '');
  if (!root) throw damaged();
  return { section: manifest.id === SECTION_SCHEMA, root, spaces };
}

function readPackageSpace(bytes: Uint8Array, pack: Package, cell: string, first: string, revisionOf: (id: string) => string | null, budget: { left: number }): Space {
  const spaceId = cell.slice(cell.indexOf('|') + 1);
  const space: Space = { roots: new Map(), objects: new Map() };
  const seen = new Set<string>();
  // The newest revision first: what it has, it has newer than the ones it builds on.
  for (let id: string | null = first; id && !seen.has(id); ) {
    seen.add(id);
    const revision = pack.revisions.get(id);
    if (!revision) throw damaged();
    for (const [root, object] of revision.roots) {
      const role = Number(root.slice(root.lastIndexOf(':') + 1));
      if (root.startsWith(ROOT_ROLE) && !space.roots.has(role)) space.roots.set(role, object);
    }
    for (const groupId of revision.groups) {
      const group = pack.groups.get(groupId);
      if (!group) throw damaged();
      const parts = new Map(group.map((item) => [`${item.id}#${item.partition}`, item]));
      // Cells sharing revisions would read them again for each: the budget caps a file made to.
      if ((budget.left -= group.length) < 0) throw damaged();
      for (const declared of group) {
        if (space.objects.has(declared.id)) continue;
        const part = (partition: number): GroupObject | undefined => parts.get(`${declared.id}#${partition}`);
        const meta = part(4)?.data;
        const body = part(1);
        if (!meta || meta.length < 4 || !body?.data) continue;
        const raw = readRawProps(new Reader(body.data));
        // Object IDs stand for the group's references one by one; object space IDs, for the cells in other spaces.
        const spaces = (body.cells ?? []).filter((ref) => ref.slice(ref.indexOf('|') + 1) !== spaceId);
        const props = new Props(
          raw.list,
          raw.oids.map((_, i) => body.objects?.[i] ?? null),
          raw.osids.map((_, i) => spaces[i] ?? null),
        );
        const blob = part(2)?.blob;
        const jcid = new DataView(meta.buffer, meta.byteOffset, 4).getUint32(0, true);
        space.objects.set(declared.id, { jcid, props, data: blob ? (pack.blobs.get(blob) ?? null) : null });
      }
    }
    id = revision.base === NIL ? null : revisionOf(revision.base);
  }
  return space;
}

/* ------------------------------------------------------------------ *
 * What the objects are: [MS-ONE]
 * ------------------------------------------------------------------ */

const JCID = {
  sectionNode: 0x00060007,
  pageSeries: 0x00060008,
  pageNode: 0x0006000b,
  outline: 0x0006000c,
  outlineElement: 0x0006000d,
  richText: 0x0006000e,
  image: 0x00060011,
  numberList: 0x00060012,
  outlineGroup: 0x00060019,
  table: 0x00060022,
  tableRow: 0x00060023,
  tableCell: 0x00060024,
  title: 0x0006002c,
  embeddedFile: 0x00060035,
  pageManifest: 0x00060037,
  sectionMetadata: 0x00020031,
  pageMetadata: 0x00020030,
};

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
  topologyCreationTimeStamp: 0x18001c65,
  lastModifiedTime: 0x14001d7a,
  isDeleted: 0x00001de9,
  offsetHoriz: 0x14001c14,
  offsetVert: 0x14001c15,
  richEditTextUnicode: 0x1c001c22,
  textExtendedAscii: 0x1c003498,
  textRunIndex: 0x1c001e12,
  textRunFormatting: 0x24001e13,
  paragraphStyle: 0x2000342c,
  paragraphStyleId: 0x1c00345a,
  bold: 0x08001c04,
  italic: 0x08001c05,
  underline: 0x08001c06,
  strikethrough: 0x08001c07,
  superscript: 0x08001c08,
  subscript: 0x08001c09,
  fontColor: 0x14001c0c,
  highlight: 0x14001c0d,
  hyperlink: 0x08001e14,
  hidden: 0x08001e16,
  embeddedObject: 0x08001e22,
  mathFormatting: 0x08003401,
  noteTags: 0x40003489,
  noteTagDefinition: 0x20003488,
  noteTagShape: 0x10003464,
  actionItemStatus: 0x10003470,
  pictureContainer: 0x20001c3f,
  imageFilename: 0x1c001dd7,
  imageAltText: 0x1c001e58,
  embeddedFileContainer: 0x20001d9b,
  embeddedFileName: 0x1c001d9c,
};

/** Note tag shapes that are a box to tick: [MS-ONE] 2.3.85. */
const CHECKBOXES = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 28, 30, 32, 48, 50, 52, 69, 71, 73, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99]);

/** Seconds since 1980 → a date. */
function time32(value: number | undefined): Date | null {
  return value === undefined ? null : new Date(Date.UTC(1980, 0, 1) + value * 1000);
}

/** A FILETIME, 100 ns since 1601 → a date. */
function filetime(value: number | undefined): Date | null {
  if (value === undefined || value <= 0) return null;
  const date = new Date(Date.UTC(1601, 0, 1) + value / 10000);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A COLORREF → `#rrggbb`; none for the automatic colour. */
function colorOf(value: number | undefined): string | undefined {
  if (value === undefined || value >>> 24 === 0xff) return undefined;
  return `#${[value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** The first bytes of a picture → its extension. */
function pictureExtension(bytes: Uint8Array): string {
  const starts = (...sig: number[]): boolean => sig.every((b, i) => bytes[i] === b);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return '.png';
  if (starts(0xff, 0xd8, 0xff)) return '.jpg';
  if (starts(0x47, 0x49, 0x46, 0x38)) return '.gif';
  if (starts(0x42, 0x4d)) return '.bmp';
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45) return '.webp';
  if (starts(0x49, 0x49, 0x2a, 0x00) || starts(0x4d, 0x4d, 0x00, 0x2a)) return '.tiff';
  if (starts(0x01, 0x00, 0x00, 0x00) && bytes[40] === 0x20 && bytes[41] === 0x45 && bytes[42] === 0x4d && bytes[43] === 0x46) return '.emf';
  if (starts(0xd7, 0xcd, 0xc6, 0x9a)) return '.wmf';
  return '';
}

function u32s(bytes: Uint8Array | undefined): number[] {
  if (!bytes) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Array.from({ length: Math.floor(bytes.length / 4) }, (_, i) => view.getUint32(i * 4, true));
}

const HYPERLINK = /\uFDDFHYPERLINK\s+"([^"]*)"/;

class SectionReader {
  /**
   * Objects already read on this page. Each is in one place only; a damaged
   * file may point back up, or at the same object again and again, which
   * would otherwise take time doubling with every level.
   */
  private readonly done = new Set<string>();

  constructor(
    private readonly bytes: Uint8Array,
    private readonly space: Space,
  ) {}

  private get(id: string | null): StoredObject | undefined {
    return id ? this.space.objects.get(id) : undefined;
  }

  /** `work` on the object `id`, unless it has been read already, or the page goes deeper than any real one. */
  private within<T>(id: string, work: () => T, fallback: T): T {
    if (this.done.has(id) || this.depth > 64) return fallback;
    this.done.add(id);
    this.depth += 1;
    try {
      return work();
    } finally {
      this.depth -= 1;
    }
  }

  private depth = 0;

  page(): OnePage | null {
    const meta = this.get(this.space.roots.get(2) ?? null);
    if (meta?.props.bool(P.isDeleted)) return null;
    const manifest = this.get(this.space.roots.get(1) ?? null);
    const pageId = manifest?.props.refs(P.contentChildNodes)[0] ?? null;
    const node = this.get(pageId);
    if (!node || node.jcid !== JCID.pageNode) return null;
    const boxes: OneBox[] = [];
    for (const id of node.props.refs(P.elementChildNodes)) {
      const box = this.box(id);
      if (box && box.elements.length) boxes.push(box);
    }
    boxes.sort((a, b) => a.y - b.y || a.x - b.x);
    let title = '';
    const titleNode = this.get(node.props.refs(P.structureElementChildNodes)[0] ?? null);
    // The title's first outline is its text; the date and the time come after it.
    const titleOutline = titleNode?.props.refs(P.elementChildNodes)[0];
    if (titleOutline) title = this.box(titleOutline)?.elements.map(plainText).find(Boolean) ?? '';
    title ||= meta?.props.text(P.cachedTitleString)?.trim() ?? '';
    const guid = meta?.props.bytes(P.entityGuid);
    return {
      id: guid?.length === 16 ? new Reader(guid).guid() : '',
      title: title.replace(/\s+/g, ' ').trim(),
      level: meta?.props.num(P.pageLevel) ?? 1,
      created: filetime(meta?.props.num(P.topologyCreationTimeStamp)),
      modified: time32(node.props.num(P.lastModifiedTime)),
      boxes,
    };
  }

  private box(id: string): OneBox | null {
    const object = this.get(id);
    if (!object) return null;
    const x = object.props.f32(P.offsetHoriz) ?? 0;
    const y = object.props.f32(P.offsetVert) ?? 0;
    if (object.jcid === JCID.outline) return { x, y, elements: this.within(id, () => this.items(id), []) };
    const content = this.within(id, () => this.content(id), null);
    return content ? { x, y, elements: [{ contents: [content], list: null, children: [] }] } : null;
  }

  /** The children of an outline, an element or a group: groups give their own children in their place. */
  private items(id: string): OneElement[] {
    const out: OneElement[] = [];
    for (const child of this.get(id)?.props.refs(P.elementChildNodes) ?? []) {
      const object = this.get(child);
      if (object?.jcid === JCID.outlineGroup) out.push(...this.within(child, () => this.items(child), []));
      else if (object?.jcid === JCID.outlineElement) {
        const element = this.within(child, () => this.element(child), null);
        if (element) out.push(element);
      }
    }
    return out;
  }

  private element(id: string): OneElement | null {
    const object = this.get(id);
    if (!object) return null;
    const contents: OneContent[] = [];
    for (const child of object.props.refs(P.contentChildNodes)) {
      const content = this.within(child, () => this.content(child), null);
      if (content) contents.push(content);
    }
    const listNode = this.get(object.props.refs(P.listNodes)[0] ?? null);
    let list: OneElement['list'] = null;
    if (listNode?.jcid === JCID.numberList) {
      // A bullet is a character of its own; a number is a placeholder below a space, filled in as it counts.
      const format = listNode.props.text(P.numberListFormat) ?? '';
      list = { ordered: /[\u0000-\u0008\uFFFD]/.test(format.slice(1)) };
    }
    return { contents, list, children: this.items(id) };
  }

  private content(id: string): OneContent | null {
    const object = this.get(id);
    switch (object?.jcid) {
      case JCID.richText:
        return this.text(object);
      case JCID.table:
        return this.table(id);
      case JCID.image:
        return this.image(object);
      case JCID.embeddedFile: {
        const container = this.get(object.props.ref(P.embeddedFileContainer));
        return { kind: 'file', data: container?.data ?? null, name: object.props.text(P.embeddedFileName) ?? '' };
      }
      default:
        return null;
    }
  }

  private text(object: StoredObject): OneText {
    const props = object.props;
    const text = props.text(P.richEditTextUnicode) ?? latin1(props.bytes(P.textExtendedAscii) ?? new Uint8Array());
    const indices = u32s(props.bytes(P.textRunIndex));
    const styles = props.refs(P.textRunFormatting).map((style) => this.get(style)?.props ?? Props.none);
    const runs: OneRun[] = [];
    let link: string | undefined;
    let hidden = '';
    let start = 0;
    const count = Math.max(styles.length, 1);
    for (let i = 0; i < count; i += 1) {
      const end = i < indices.length ? Math.min(Math.max(indices[i]!, start), text.length) : text.length;
      const piece = text.slice(start, end);
      start = end;
      const style = styles[i] ?? Props.none;
      if (style.bool(P.hidden)) {
        hidden += piece;
        const found = HYPERLINK.exec(hidden);
        if (found) {
          link = found[1];
          hidden = '';
        }
        continue;
      }
      hidden = '';
      if (!style.bool(P.hyperlink)) link = undefined;
      if (style.bool(P.embeddedObject)) continue;
      const clean = piece.replace(/[\uFDDF\uFFFC]/g, '');
      if (!clean) continue;
      const run: OneRun = { text: clean };
      if (style.bool(P.bold)) run.bold = true;
      if (style.bool(P.italic)) run.italic = true;
      if (style.bool(P.underline)) run.underline = true;
      if (style.bool(P.strikethrough)) run.strike = true;
      if (style.bool(P.superscript)) run.sup = true;
      if (style.bool(P.subscript)) run.sub = true;
      const color = colorOf(style.num(P.fontColor));
      if (color) run.color = color;
      const highlight = colorOf(style.num(P.highlight));
      if (highlight) run.highlight = highlight;
      if (link && style.bool(P.hyperlink)) run.link = link;
      runs.push(run);
    }
    // More text than runs: the rest is kept, unformatted, rather than lost.
    if (start < text.length && styles.length) {
      const rest = text.slice(start).replace(/[\ufddf\ufffc]/g, '');
      if (rest && !HYPERLINK.test(rest)) runs.push({ text: rest });
    }
    const paragraph = this.get(props.ref(P.paragraphStyle));
    let todo: boolean | null = null;
    for (const tag of props.sets(P.noteTags)) {
      const definition = this.get(tag.ref(P.noteTagDefinition));
      if (CHECKBOXES.has(definition?.props.num(P.noteTagShape) ?? 0)) todo = ((tag.num(P.actionItemStatus) ?? 0) & 1) === 1;
    }
    return { kind: 'text', runs, style: paragraph?.props.text(P.paragraphStyleId) ?? 'p', todo };
  }

  private table(id: string): OneTable {
    const rows: OneElement[][][] = [];
    for (const rowId of this.get(id)?.props.refs(P.elementChildNodes) ?? []) {
      const row: OneElement[][] = [];
      for (const cellId of this.get(rowId)?.props.refs(P.elementChildNodes) ?? []) {
        const cell: OneElement[] = [];
        for (const elementId of this.get(cellId)?.props.refs(P.elementChildNodes) ?? []) {
          const element = this.within(elementId, () => this.element(elementId), null);
          if (element) cell.push(element);
        }
        row.push(cell);
      }
      rows.push(row);
    }
    return { kind: 'table', rows };
  }

  private image(object: StoredObject): OneImage {
    const container = this.get(object.props.ref(P.pictureContainer));
    const data = container?.data ?? null;
    const name = object.props.text(P.imageFilename) ?? '';
    const sniffed = data ? pictureExtension(this.bytes.subarray(data.offset, data.offset + 64)) : '';
    const named = /\.[a-z0-9]{1,5}$/i.exec(name)?.[0].toLowerCase() ?? '';
    return { kind: 'image', data, ext: sniffed || named, name, alt: object.props.text(P.imageAltText) ?? '' };
  }

  /** The name the section's metadata keeps, if any. */
  sectionName(): string | null {
    return this.get(this.space.roots.get(2) ?? null)?.props.text(P.sectionDisplayName)?.trim() || null;
  }
}

/** The text of an element's paragraphs, formatting left out: for a title. */
function plainText(element: OneElement): string {
  return element.contents
    .map((content) => (content.kind === 'text' ? content.runs.map((run) => run.text).join('') : ''))
    .join(' ')
    .trim();
}

/** Reads a `.one` section: its pages in the order OneNote lists them. */
export function readSection(bytes: Uint8Array): OneSection {
  const { section: isSection, root, spaces } = readStore(bytes);
  if (!isSection) throw new Error(t('errors', 'This is not a OneNote section'));
  const section: OneSection = { name: new SectionReader(bytes, root).sectionName(), pages: [] };
  const node = root.objects.get(root.roots.get(1) ?? '');
  if (!node || node.jcid !== JCID.sectionNode) throw damaged();
  const read = new Set<string>();
  for (const seriesId of node.props.refs(P.elementChildNodes)) {
    const series = root.objects.get(seriesId);
    if (series?.jcid !== JCID.pageSeries) continue;
    for (const spaceId of series.props.spaces(P.childGraphSpaceElementNodes)) {
      // A page listed twice is one page.
      if (read.has(spaceId)) continue;
      read.add(spaceId);
      const space = spaces.get(spaceId);
      const page = space ? new SectionReader(bytes, space).page() : null;
      if (page) section.pages.push(page);
    }
  }
  return section;
}
