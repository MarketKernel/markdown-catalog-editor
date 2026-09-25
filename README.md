# markdown-catalog-editor

A Markdown editor for a local folder of notes — in the spirit of Obsidian, but entirely
contained in one standalone HTML file. No network is used: files are read from and saved to
disk directly.

```
┌──────────────────────────────────────────────┐
│ Toolbar                                      │
├────────────┬─────────────────────────────────┤
│ File and   │ Document                        │
│ folder     │ (read / edit)                   │
│ tree       │                                 │
└────────────┴─────────────────────────────────┘
```

## How to use

1. Build `build/macaed.html` (see "[Build](#build)") and open it in a browser.
2. "Open folder" → pick a folder with `.md` files. You can also just drag the folder into
   the window.
3. The **Read / Edit** switch at the top, or `⌘E`.

In Chrome, Edge and Arc the folder is opened through the File System Access API: notes are
read and written in place, and creating, renaming and deleting files and folders all work.
In Safari and Firefox the folder opens read-only, and `⌘S` offers to download the modified
file.

If you put `macaed.html` next to your notes and serve it over HTTP, the page picks the folder
up by itself — provided an `index.json` sits alongside it, of the form
`{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`.

## Live preview

In edit mode the document stays formatted, and only the block the caret sits in turns into
raw Markdown. A block is a paragraph, a heading, a whole list, a code block or a quote: a
list does not fall apart line by line. Tables are edited differently — see
"[Tables](#tables)".

The source line keeps the font size, weight and line height of the formatted one, so the text
does not jump: `# Heading` is shown at heading size. This is checked automatically — when a
block is switched its top edge moves by less than a pixel at any zoom level from 50 to 200 %.

There is one place where the height does change, and that is unavoidable for this mode: a
code block gains two fence lines of `` ``` ``. Neighbouring blocks do not twitch in the
process — only what is below shifts.

Enter outside a list starts a new block. Pressed at the end of a block, or on an empty line,
it opens an empty line below and puts the caret on it; pressed again, it adds another. In
Markdown a single blank line only separates two blocks, so an empty line you can type into
is one with blank lines on both sides — the editor adds the separating line itself, and
typed text never glues onto the neighbouring block. Such lines and link reference
definitions (`[id]: https://…`) are shown only in edit mode; the read view renders the
Markdown as it is.

## Tables

A table never turns into `| pipes |`. A click opens just the cell under the pointer, and the
cell shows its own text — `**bold**` rather than bold — so inline formatting and the
toolbar's marks, links and colours still work inside it. Typing rewrites only that cell in
the file; the rest of the table keeps its padding and alignment.

- **Moving**: Tab and Shift+Tab go to the next and previous cell, Enter to the cell below,
  the arrows to the neighbouring cell at the edge of the text — and past the edge of the
  table on to the block next to it. Enter on the last row starts a new block below the table.
- **Line breaks**: Ctrl+Enter (also ⌘Enter or Shift+Enter) starts a new line inside the
  cell. A table row is one line of Markdown, so the break is written as `<br>`; the cell
  being edited shows it as a real line break, and pasted text keeps its lines the same way.
  Within a cell of several lines, the up and down arrows move between its lines first. Cell
  text is aligned to the top.
- **Adding**: in edit mode, hovering over a table shows a bar with **+** below it, which adds
  a row, and one to its right, which adds a column. Tab in the last cell adds a row too.
- **Deleting**: only empty rows and columns are deleted, so no text is lost by a slip.
  Hovering over an empty row shows a **×** to its left, over an empty column a **×** above
  it. Backspace in an empty cell does the same from the keyboard: it deletes the row if the
  whole row is empty, else the column if the whole column is (header included); a table with
  no text left in it is deleted as a whole. The header row stays — a table needs one.

Adding or deleting rewrites the table in the plain `| a | b |` form.

## Features

- **File tree**: collapsible folders, filtering by name, creating, renaming and deleting
  through the context menu, resizable panel, hideable panel (`⌘\`).
- **Formatting the selection**: headings H1–H3, bold, italic, strikethrough, monospace,
  `==…==` highlight, text and background colour, link, `[[wiki link]]`, lists, tasks, quote,
  code block, table, divider.
- **Markup**: CommonMark plus tables, tasks with clickable checkboxes, `==highlight==`,
  `[[wiki links]]`, front matter, syntax highlighting for 19 languages, images from the
  folder.
- **Images**: `![[image-1.png]]` shows `assets/<note name>/image-1.png` from the note's
  folder (`![[image-1.png|300]]` sets the width). `assets` folders start collapsed in the
  tree, and renaming a note renames its image folder too. A picture clicked in the tree
  opens as a picture, not as text.
- **Theme**: system, light, dark. **Zoom**: 50–200 %. **Width**: a centred column or the full pane.
- Autosave one second after an edit, undo and redo, search within the note.
- The theme, zoom, text width, panel width and last opened note are remembered.

## Keyboard shortcuts

| Action | Keys |
| --- | --- |
| Read / edit mode | `⌘E` |
| Save | `⌘S` |
| Search within the note | `⌘F` |
| File panel | `⌘\` |
| Zoom | `⌘+` · `⌘−` · `⌘0` |
| Bold · italic · link | `⌘B` · `⌘I` · `⌘K` |
| Monospace · highlight · wiki link | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| Heading 1–6 · plain text | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| Undo · redo | `⌘Z` · `⌘⇧Z` |
| List indent | `Tab` · `⇧Tab` |
| Leave the block | `Esc` |

## Build

```sh
./build.sh         # installs the dependencies if needed, then builds build/macaed.html
npm install
npm run build      # -> build/macaed.html
npm run watch      # rebuild on changes in src/
npm run typecheck  # tsc --noEmit
npm test           # 77 checks of the block model, formatting and Markdown syntax
npm run test:browser  # 35 checks of the built editor in headless Chrome
```

`build.mjs` bundles `src/main.ts` with esbuild into an IIFE and substitutes it, along with
the styles and the icon (a data URI), into `src/template.html`. The result is
`build/macaed.html`, around 270 KB. The build fails if even one external reference is left
in it.

## Layout

```
src/template.html   markup with the __STYLES__/__APP__/__ICON__ placeholders
src/styles.css      palette, light and dark themes, block paired with its source
src/main.ts         opening a folder, saving, toolbar, search, theme, zoom
src/vault.ts        File System Access API, drag-and-drop, webkitdirectory; file CRUD
src/editor.ts       live preview: active block, caret, Enter, joining, undo
src/blocks.ts       splitting the document into blocks by markdown-it tokens
src/format.ts       toolbar actions as pure text transforms
src/markdown.ts     markdown-it: ==highlight==, [[wiki links]], ![[embeds]], tasks, code highlighting
src/tree.ts         folder and file tree
src/settings.ts     localStorage: theme, zoom, panel width, last note
src/ui.ts           dialogs, context menu, notifications
tools/              tests: block model, formatting, the editor in headless Chrome
vendor/icon.svg     the icon
docs/               working notes (not under git)
build/macaed.html   the build output
```

## Limitations

- Collaborative editing, plugins, sync and a link graph are not supported.
- The layout targets the desktop; on a narrow screen the file panel hides itself.
- Only Chromium-based browsers can write files.

## License

MIT — see [LICENSE](LICENSE).
