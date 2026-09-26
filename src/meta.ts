/**
 * The catalog's own data, kept apart from the notes in one `.meta.json` at the
 * vault root:
 *
 *   { "notes": { "folder/note.md": { "tags": ["project/alpha", "idea"] } } }
 *
 * Paths are relative to the root, as the tree shows them. A tag may nest with
 * `/`: `project/alpha` sits under `project` in the tag tree, and a note tagged
 * with it is counted under `project` too. Fields this editor does not know —
 * at the top or per note — are kept as they are when the file is written back.
 */

type Json = Record<string, unknown>;

interface NoteMeta extends Json {
  tags?: string[];
}

export interface TagNode {
  /** The last segment: `alpha` for `project/alpha`. */
  name: string;
  /** The whole tag: `project/alpha`. */
  tag: string;
  /** Notes tagged with this tag or any tag nested under it. */
  count: number;
  children: TagNode[];
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** `#Project / Alpha ` → `Project/Alpha`; spaces become dashes. Null when nothing is left. */
export function normalizeTag(raw: string): string | null {
  const tag = raw
    .trim()
    .replace(/^#+/, '')
    .split('/')
    .map((part) => part.trim().replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('/');
  return tag || null;
}

/** True when `tag` is `parent` itself or nested under it. */
export function isUnder(tag: string, parent: string): boolean {
  return tag === parent || tag.startsWith(`${parent}/`);
}

export class Meta {
  private constructor(
    private readonly rest: Json,
    private readonly notes: Map<string, NoteMeta>,
  ) {}

  static empty(): Meta {
    return new Meta({}, new Map());
  }

  /** Throws on text that is not a JSON object, so a broken file is never overwritten. */
  static parse(text: string): Meta {
    if (!text.trim()) return Meta.empty();
    const data: unknown = JSON.parse(text);
    if (!isObject(data)) throw new Error('not a JSON object');
    const { notes, ...rest } = data;
    const map = new Map<string, NoteMeta>();
    if (isObject(notes)) {
      for (const [path, value] of Object.entries(notes)) {
        if (!isObject(value)) continue;
        const entry: NoteMeta = { ...value };
        if (Array.isArray(value['tags'])) {
          entry.tags = dedupe(value['tags'].filter((tag): tag is string => typeof tag === 'string').map(normalizeTag));
        } else delete entry.tags;
        map.set(path, entry);
      }
    }
    return new Meta(rest, map);
  }

  /** Stable output: notes sorted by path, empty entries dropped, two-space indent. */
  serialize(): string {
    const notes: Record<string, NoteMeta> = {};
    for (const path of Array.from(this.notes.keys()).sort()) {
      const entry = this.notes.get(path)!;
      const out: NoteMeta = { ...entry };
      if (!out.tags?.length) delete out.tags;
      if (Object.keys(out).length > 0) notes[path] = out;
    }
    return `${JSON.stringify({ ...this.rest, notes }, null, 2)}\n`;
  }

  tagsOf(path: string): string[] {
    return this.notes.get(path)?.tags?.slice() ?? [];
  }

  /**
   * Adds a tag to a note; returns the tag as stored, or null when there was
   * nothing to add. A tag that differs from a known one only in case takes the
   * known spelling, so `Idea` and `idea` never split into two.
   */
  addTag(path: string, raw: string): string | null {
    const normalized = normalizeTag(raw);
    if (!normalized) return null;
    const known = this.allTags().find((tag) => tag.toLowerCase() === normalized.toLowerCase());
    const tag = known ?? normalized;
    const tags = this.tagsOf(path);
    if (tags.includes(tag)) return null;
    this.entry(path).tags = [...tags, tag];
    return tag;
  }

  removeTag(path: string, tag: string): boolean {
    const tags = this.tagsOf(path);
    if (!tags.includes(tag)) return false;
    this.entry(path).tags = tags.filter((other) => other !== tag);
    this.prune(path);
    return true;
  }

  /** Follows a rename: a note's own entry, or every entry inside a renamed folder. */
  move(from: string, to: string): boolean {
    let changed = false;
    for (const [path, entry] of Array.from(this.notes)) {
      const inside = path === from ? '' : path.startsWith(`${from}/`) ? path.slice(from.length) : null;
      if (inside === null) continue;
      this.notes.delete(path);
      this.notes.set(to + inside, entry);
      changed = true;
    }
    return changed;
  }

  /** Forgets a deleted note, or every note inside a deleted folder. */
  remove(target: string): boolean {
    let changed = false;
    for (const path of Array.from(this.notes.keys())) {
      if (path !== target && !path.startsWith(`${target}/`)) continue;
      this.notes.delete(path);
      changed = true;
    }
    return changed;
  }

  /** Every tag in use, sorted. */
  allTags(): string[] {
    const all = new Set<string>();
    for (const entry of this.notes.values()) for (const tag of entry.tags ?? []) all.add(tag);
    return Array.from(all).sort(collator.compare);
  }

  /**
   * Notes carrying `tag` or a tag nested under it, in path order. `exists`
   * leaves out entries whose note is gone from the folder.
   */
  notesWith(tag: string, exists: (path: string) => boolean = () => true): string[] {
    const out: string[] = [];
    for (const [path, entry] of this.notes) {
      if (exists(path) && entry.tags?.some((other) => isUnder(other, tag))) out.push(path);
    }
    return out.sort(collator.compare);
  }

  /** The tags as a tree: `a/b` and `a/c` share the node `a`. Only notes that `exists` count. */
  tree(exists: (path: string) => boolean = () => true): TagNode[] {
    const roots: TagNode[] = [];
    const nodes = new Map<string, TagNode>();
    const members = new Map<string, Set<string>>();
    for (const [path, entry] of this.notes) {
      if (!exists(path)) continue;
      for (const tag of entry.tags ?? []) {
        let parent = roots;
        let prefix = '';
        for (const name of tag.split('/')) {
          prefix = prefix ? `${prefix}/${name}` : name;
          let node = nodes.get(prefix);
          if (!node) {
            node = { name, tag: prefix, count: 0, children: [] };
            nodes.set(prefix, node);
            members.set(prefix, new Set());
            parent.push(node);
          }
          members.get(prefix)!.add(path);
          parent = node.children;
        }
      }
    }
    for (const [tag, node] of nodes) node.count = members.get(tag)!.size;
    const sort = (list: TagNode[]): TagNode[] => {
      list.sort((a, b) => collator.compare(a.name, b.name));
      for (const node of list) sort(node.children);
      return list;
    };
    return sort(roots);
  }

  private entry(path: string): NoteMeta {
    let entry = this.notes.get(path);
    if (!entry) {
      entry = {};
      this.notes.set(path, entry);
    }
    return entry;
  }

  private prune(path: string): void {
    const entry = this.notes.get(path);
    if (!entry) return;
    if (!entry.tags?.length) delete entry.tags;
    if (Object.keys(entry).length === 0) this.notes.delete(path);
  }
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dedupe(tags: (string | null)[]): string[] {
  return Array.from(new Set(tags.filter((tag): tag is string => tag !== null)));
}
