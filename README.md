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
raw Markdown. A block is a paragraph, a heading, a whole list, a code block, a table or a
quote: a list does not fall apart line by line.

The source line keeps the font size, weight and line height of the formatted one, so the text
does not jump: `# Heading` is shown at heading size. This is checked automatically — when a
block is switched its top edge moves by less than a pixel at any zoom level from 50 to 200 %.

There are two places where the height does change, and that is unavoidable for this mode: a
code block gains two fence lines of `` ``` ``, and a table in source form takes up as many
lines as are written in it. Neighbouring blocks do not twitch in the process — only what is
below shifts.

Enter outside a list starts a new block. Pressed at the end of a block, or on an empty line,
it opens an empty line below and puts the caret on it; pressed again, it adds another. In
Markdown a single blank line only separates two blocks, so an empty line you can type into
is one with blank lines on both sides — the editor adds the separating line itself, and
typed text never glues onto the neighbouring block. Such lines and link reference
definitions (`[id]: https://…`) are shown only in edit mode; the read view renders the
Markdown as it is.

## Features

- **File tree**: collapsible folders, filtering by name, creating, renaming and deleting
  through the context menu, resizable panel, hideable panel (`⌘\`).
- **Formatting the selection**: headings H1–H3, bold, italic, strikethrough, monospace,
  `==…==` highlight, text and background colour, link, `[[wiki link]]`, lists, tasks, quote,
  code block, table, divider.
- **Markup**: CommonMark plus tables, tasks with clickable checkboxes, `==highlight==`,
  `[[wiki links]]`, front matter, syntax highlighting for 19 languages, images from the
  folder.
- **Theme**: system, light, dark. **Zoom**: 50–200 %.
- Autosave one second after an edit, undo and redo, search within the note.
- The theme, zoom, panel width and last opened note are remembered.

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
npm install
npm run build      # -> build/macaed.html
npm run watch      # rebuild on changes in src/
npm run typecheck  # tsc --noEmit
npm test           # 69 checks of the block model and of formatting
npm run test:browser  # 30 checks of the built editor in headless Chrome
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
src/markdown.ts     markdown-it: ==highlight==, [[wiki links]], tasks, code highlighting
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
