# markdown-catalog-editor

<!-- languages -->
<h3 align="center">
<b>🇬🇧 English</b> ·
<a href="docs/readme/README.zh.md">🇨🇳 中文</a> ·
<a href="docs/readme/README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="docs/readme/README.es.md">🇪🇸 Español</a> ·
<a href="docs/readme/README.fr.md">🇫🇷 Français</a> ·
<a href="docs/readme/README.ar.md">🇸🇦 العربية</a> ·
<a href="docs/readme/README.bn.md">🇧🇩 বাংলা</a> ·
<a href="docs/readme/README.pt.md">🇧🇷 Português</a> ·
<a href="docs/readme/README.ru.md">🇷🇺 Русский</a> ·
<a href="docs/readme/README.ur.md">🇵🇰 اردو</a> ·
<a href="docs/readme/README.id.md">🇮🇩 Bahasa Indonesia</a> ·
<a href="docs/readme/README.de.md">🇩🇪 Deutsch</a> ·
<a href="docs/readme/README.ja.md">🇯🇵 日本語</a> ·
<a href="docs/readme/README.tr.md">🇹🇷 Türkçe</a> ·
<a href="docs/readme/README.ko.md">🇰🇷 한국어</a> ·
<a href="docs/readme/README.it.md">🇮🇹 Italiano</a> ·
<a href="docs/readme/README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

A Markdown editor for a local folder of notes — in the spirit of Obsidian, but entirely
contained in one standalone HTML file. No network is used: files are read from and saved to
disk directly.

**[Online demo](https://markdown.marketkernel.com/)** — the same editor
as a PWA (Progressive Web App): it can be installed into the system and then runs as a
separate app, with its own window and icon, and works offline. On a computer, in Chrome,
Edge and Arc, use the install button in the address bar; on Android, Chrome's ⋮ menu →
Install app; on iOS, Share → Add to Home Screen, in Safari or in Chrome. Your notes stay on
your disk there too, the installed app opens a `.md` straight from the Finder or Explorer,
and it updates when you say so — see "[GitHub Pages](#github-pages)". Where a browser cannot
write to a disk — Safari, Firefox, an iPad or a phone — the notes are kept inside the browser
and go in and out as a ZIP archive: see "[Notes kept in the browser](#notes-kept-in-the-browser)".

The same editor is also **Markdown Knowledge Base**, a
[Chrome extension](#markdown-knowledge-base-the-chrome-extension): select text on a web page,
press its button, and **Send to Markdown** adds it to the default note of your knowledge base —
or to any note you pick. The editor itself opens beside the page in Chrome's side panel.

![The editor with a folder of notes open: the file tree and tags on the left, a note in edit mode on the right](docs/macaed.jpg)

```
┌──────────────────────────────────────────────┐
│ Toolbar                                      │
├────────────┬─────────────────────────────────┤
│ File and   │ #tags +                         │
│ folder     │ Document                        │
│ tree       │ (read / edit)                   │
├╌╌╌╌╌╌╌╌╌╌╌╌┤                                 │
│ Tags       │                                 │
└────────────┴─────────────────────────────────┘
```

## How to use

1. Build `build/macaed.html` (see "[Build](#build)") and open it in a browser.
2. "Open folder" → pick a folder with `.md` files. You can also just drag the folder into
   the window.
3. The **Read / Edit** switch at the top, or `⌘E`.

In Chrome, Edge and Arc the folder is opened through the File System Access API: notes are
read and written in place, and creating, renaming and deleting files and folders all work.
Safari and Firefox cannot write to a folder on disk, nor can phones and iPads: Chrome on
Android has no File System Access, and every browser on iOS and iPadOS, Chrome included, runs
on Safari's engine. There the notes are kept inside the browser — see
"[Notes kept in the browser](#notes-kept-in-the-browser)".

The editor remembers the last six folders opened there (a page never learns a folder's path,
so it keeps the folder's handle in the browser's IndexedDB), and the note last open in each.
On the next start the last folder opens by itself if the browser still allows it — in an
installed app, or once you chose "Allow on every visit". Otherwise the start screen lists the
recent folders: one click, and the browser asks for access again. To go back to that list —
to switch folders or open a new one — click the folder's name at the top of the file panel,
or "Close folder" in the settings; × removes a folder from the list.

If you put `macaed.html` next to your notes and serve it over HTTP, the page picks the folder
up by itself — provided an `index.json` sits alongside it, of the form
`{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`.

### Notes kept in the browser

Where the browser cannot write to a folder on disk — Safari, Firefox, any browser on a phone
or an iPad — the start screen says so and offers two ways in: **Open folder** and **Open ZIP
archive** (or drag either onto the window). What you open is copied into the browser's
IndexedDB, and from then on the editor reads and writes that copy: autosave, new notes and
folders, renaming, deleting, images, tags — everything works as on a disk. Nothing leaves the
device.

- **The way back out** is a ZIP archive: settings → **Download ZIP** packs the whole folder
  — notes, images, `.meta.json` — under one folder of its name, as a folder compressed in the
  Finder or Explorer would be. Opened again as an archive, it comes back as it was. The
  button is there with a folder on disk too, as a quick copy of it.
- **An archive** made by the Finder, Explorer or `zip` opens as the one folder inside it (or,
  with files at the top, under the archive's name). Only what the editor shows is copied —
  notes, images and attachments, `.meta.json`; dot-folders, `node_modules`, `output/` and the
  Mac's `__MACOSX` stay out. It needs no folder picker at all, which is what an older iPad,
  whose Safari cannot pick a folder, needs.
- **The start screen lists the folders** kept in this browser, newest first, and the last one
  opens by itself on the next start. Opening the same folder or archive again adds a second
  copy beside the first ("Notes 2") rather than overwriting the edits in the first. × deletes
  a copy from the browser, after asking — it may be the only one.
- **Export to HTML** downloads the site as a ZIP archive instead of writing it to `output/`.
- **How long they stay**: the browser is asked to keep the site's data for good
  (`navigator.storage.persist()`) — Firefox asks you, Chrome and Safari decide by themselves,
  more readily for an installed app. A browser that says no may clear the notes when the
  disk runs low, and Safari clears the data of a site not visited in seven days of using
  Safari, unless it is added to the Home Screen. Clearing the site's data or the browser's history deletes them
  in any browser. So download a ZIP archive now and then — it is the only copy outside the
  browser.

Where IndexedDB is off (some private windows), a folder opens read-only, as before, and
`⌘S` offers to download the modified note.

### A single note

A `.md` file can be opened on its own, without its folder:

- **From the Finder or Explorer**, in the installed app (Chrome or Edge on a computer): Open
  With → the app, or make it the default app for `.md`. The note comes to the app's window
  when one is open — two windows on one file would overwrite each other's saves — and takes
  the place of the folder shown there; opening the same note again leaves it as it is.
- **Dragged onto the window**, in any browser.

The note is read and written in place, as in a folder — in Safari and Firefox read-only, with
`⌘S` offering a download (a note is not copied into the browser; its folder can be). With no folder around it there is nothing to create, rename or
delete beside it, and no images from its folder, tags or export: those come with opening the
folder. A note opened this way is not added to the recent folders.

## Markdown Knowledge Base: the Chrome extension

`npm run build` also writes `build/extension/`: the editor as a Chrome extension, and
`build/macaed-extension-<version>.zip` of it for the Chrome Web Store; a release carries the
zip too. To install it: `chrome://extensions` → Developer mode → Load unpacked →
`build/extension` (or the unpacked zip).

**The knowledge base** is the folder of notes opened last in the extension. The editor itself
— **full mode** — lives in Chrome's side panel, beside the page, in the phone layout, since a
panel is narrow; it stays there across tabs. A folder opens in it as in the file, and the
recent folders are remembered — the extension's own, apart from those of the file or the PWA.

**The toolbar button** (or `Alt+Shift+M`) opens a small window over the page:

- At the top, what is selected on the page, as Markdown — or, with nothing selected, the
  page's main text: the article, without the site's menus, sidebars, footer, share buttons,
  forms and hidden parts.
- **Send to Markdown** adds it to the end of the **default note** — `Inbox.md` at the root of
  the knowledge base to begin with, made the first time it is needed. After a blank line comes
  the text, then a line `— [The page's title](https://…)` that links where it came from. The
  window closes once it is written.
- **Add to another note**: the notes of the knowledge base, with a field to find one by name;
  a click on a note adds it there instead. The star beside a note makes it the default; the
  default is listed first.
- With nothing selected, **As a new note** turns the page into a note of its own (below).
- **Full mode** opens the side panel.

**When the knowledge base is closed** — Chrome takes the access to a folder back once the last
side panel closes, and after a restart, unless you chose "Allow on every visit" — a page cannot
get into the folder until you click. The window then says so and still lists the notes, as the
panel last saw them: **Send to Markdown**, or a click on a note, puts what you selected aside,
in the extension's own storage, and it goes to the end of that note once a side panel opens the
folder again. **Open** asks Chrome for the folder right in the window; one click on the folder
in the side panel does the same. When Chrome asks, choose **Allow on every visit**: the folder
then stays open when the panel closes, and after a restart.

When the side panel has the knowledge base open, it is the panel that adds to the note — it
may have that note open with changes not yet saved, which a write behind its back would lose.
With no panel open and the folder still allowed — on every visit, or through **Open** — the window
writes the note itself.

**The context menu** of a page has **Send the page to Markdown**; on selected text, **Send the
selection to Markdown**; on a link, **Send the link to Markdown**; on an image, **Send the
image to Markdown**. None of them opens the side panel: a panel opening squeezes the page
aside. With no panel open in the window, what you chose goes to the end of the default note,
as with **Send to Markdown** — or, with the knowledge base closed, waits for it, as above. The
toolbar button says what happened: a tick for a moment, `!` with the reason in its title, and
how many sendings wait, until a panel opens the folder. With the panel of the window open, it
goes there instead, where a dialog shows what came — and from which site — as Markdown you can
still change, and asks where it goes:

- **A new note**, the default for a page: in the clippings folder (`Clippings` at the root
  unless you change it; the folder is remembered, empty means the root), named after the
  page's title, with what a file name cannot hold left out. A name already taken gets a
  number, `Title 2.md`. The note starts with front matter — the page's title, its address
  and the day — and then the text; it opens once saved.

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **The end of the open note**, the default for a selection, a link or an image, the same
  way as Send to Markdown. A link needs no source line: it is its own source.

Sent before any folder was ever opened, it waits: the panel asks for a folder, and the dialog
comes once one is open. A page the extension may not read — Chrome's own pages, the Web Store, a
PDF — arrives as a link to it.

**What the Markdown is.** Headings, paragraphs, **bold**, *italic*, ~~strikethrough~~,
==highlight==, `code`, links and images with their full addresses, lists — nested, numbered,
tasks — quotes, code blocks with their language (from `language-…`, GitHub's
`highlight-source-…` and the like), tables (a line break in a cell as `<br>`, as the editor
writes it), dividers. Text reads as itself: a `*`, a `#` at the start of a line or a `<b>`
typed on the page is escaped, so it never turns into formatting, and no HTML of the page gets
into the note. Images stay on the web, linked by their address; a lazy image's real address is
taken rather than its placeholder, tracking pixels are left out.

**Permissions.** `activeTab`: a click on the button, in the menu or the shortcut gives the
extension that one tab, and only then does it read it — with `scripting`, a function run in
the page that copies its text and returns. No content script runs anywhere, and there is no
access to any site otherwise: no `host_permissions`, which the build refuses. `offscreen`: the
worker has no DOM, so with no panel open a page's or a selection's HTML becomes Markdown in an
offscreen document of the extension, which closes once it is done. `contextMenus`,
`sidePanel`, and `storage` — what is sent to the side panel goes to the panel of its window
through `chrome.storage.session`, gone when the browser closes; in `chrome.storage.local`, what
the button's window put aside while the knowledge base was closed, the list of its notes, and
the panel's language and the default note, for the worker. The button's window and the worker
ask a panel that has the knowledge base open to add to a note with a `chrome.runtime` message,
which the panel takes only from the extension's own pages. The extension's pages have
`connect-src 'none'`: the editor reaches nothing on the network; the build checks that, and
that no page has an inline script or an outside address.

**How it is made.** The panel is the page itself: `panel.html` with its script in `panel.js`,
as Manifest V3 wants — the same `src/main.ts`, with `src/extension/extension.ts` in the place
of `src/platform.ts`, whose hooks do nothing in the file and the PWA. The button's window is
`popup.html` and `popup.js` (`src/extension/popup.ts`), with the page's styles: it reads the
knowledge base's handle from the same IndexedDB as the panel, and writes through it while the
browser still allows it; otherwise it puts what is sent aside in `chrome.storage.local`, where
the panel that opens the folder finds it (`src/extension/messages.ts`). The worker,
`background.js`, has the menu: it reads the tab (`src/extension/take.ts`, `grab.ts`), and sends
what it took to the panel of the window, or adds it to the default note as the button's window
does (`src/extension/knowledge.ts`), through `offscreen.html` for the Markdown
(`src/extension/offscreen.ts`). HTML becomes Markdown in `src/extension/to-markdown.ts`, and the
editor adds it or asks where it goes (`src/clip.ts`, `src/clip-ui.ts`).

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

## Tags

Tags group notes across folders. They are not written into the notes: the Markdown stays
exactly as it was, and all tags of the folder live in one file beside the notes.

- **On a note**: the tags sit under the title as `#tag` chips, followed by a **+**. The
  **+** turns into a field; Enter adds the tag, and the **+** reappears after it. Tags
  already used in the folder are suggested as you type. Esc cancels; leaving the field
  with text in it adds the tag too. **×** on a chip removes the tag, and a click on the
  chip opens the tag's page. Tags can be changed in both read and edit mode.
- **Spelling**: a leading `#` is dropped and spaces inside a tag become dashes, so
  `#to do` is stored as `to-do`. A tag that differs from an existing one only in case takes
  the existing spelling — `Idea` and `idea` never become two tags. A note cannot carry the
  same tag twice.
- **Nesting**: `/` nests tags. `work/alpha` and `work/beta` sit under `work` in the tag
  tree, and a note tagged `work/alpha` is counted under `work` as well.
- **The tag tree**: the section at the bottom of the file panel, set apart from the file
  tree. Each tag shows how many notes carry it or a tag nested under it; the arrow of a
  parent tag folds its children, and the heading folds the whole section. The name filter
  above the file tree filters the tags too. The section takes up to 42 % of the panel and
  scrolls inside; dragging the line above it makes it lower (never taller), a double click
  on the line gives the room back, and with the line focused ↑ and ↓ do the same. The
  height is remembered.
- **A tag's page**: clicking a tag in the tree, or a chip, shows the notes carrying it — a
  parent tag lists the notes of every tag under it too. Each row gives the note's name, its
  folder and all its tags; a click on the name opens the note, a click on a tag opens that
  tag. The page is read-only: there is nothing to edit on it, and the formatting toolbar
  is switched off. For a nested tag the parents in its title link to their own pages.
- **Renaming and deleting**: tags follow a note, or every note in a folder, when it is
  renamed or deleted from the file panel. A note moved or deleted outside the editor keeps
  its entry in the file, but the entry is not shown or counted while the note is missing.
- **Read-only folders** (Safari, Firefox): the tags are shown, but the **+** and **×** are
  not.

### `.meta.json`

The file sits at the root of the opened folder and is created with the first tag. It is
never shown in the file tree.

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

The keys are note paths relative to the root, as the tree shows them; the tags keep the
order they were added in. The file is written with the notes sorted by path and two-space
indentation, so it reads well in a diff, and notes with no tags left are dropped from it.
Fields the editor does not know — at the top or inside a note's entry — are kept when it
writes the file back, so other tools can store their own data in it. If the file is not a
valid JSON object, the editor says so, shows no tags and never writes over it; tags cannot
be changed until the file is fixed and the folder opened again.

When the folder is served over HTTP with an `index.json` (see "[How to use](#how-to-use)"),
list `.meta.json` among its files to have the tags show.

## Export to HTML

The export button on the toolbar (next to Save) turns the whole folder into a static site;
**Export to HTML…** in a folder's context menu does the same for that folder alone, and on
the empty space under the tree for the whole folder. The site is written into
`output/<folder>/` at the root of the notes folder; the folder is named after the moment of
the export, `2025-12-31_23-33-33`, and can be renamed in the dialog. `output` is never
shown in the tree. Only a folder opened for writing can be exported.

While the export runs, the dialog shows the step it is on — reading the notes, writing the
pages, copying the images — with a progress bar, and cannot be closed; **Stop** ends it
after the files already under way, leaving what was written so far. The export button and
the menu item are off until it is done. Files are read and written several at a time, each
folder on the way created once. At the end the export reads the folder back from the disk:
should any file be missing, the dialog says how many and names one, rather than reporting
success over an empty folder.

**Create a static site** — on by default — makes a page per note, as described below. Off,
the export is a single page, `index.html`, with every note in it: the left panel is a table
of contents, each note is a section with its name above it, its headings a level lower and
their ids prefixed with the note's, so links between notes and to their headings become
anchors on the page. The page shows one note at a time — the one the address's `#anchor`
points at or into, and at first the root `index` or `README`, else the first note at the
root. The table of contents, links, search results and the **previous** / **next** links at
the end of each note switch between them. It is done in CSS (`:target`), so it works
without the script too; the script only marks the note on show in the table of contents.
Printing shows every note. The browser's own find (`⌘F`) sees only the note on show — the
search field looks through all of them. With tags, the
tag tree in the panel and the chips on the notes lead to a tags section at the end, a
heading per tag with its notes. The page is one file: the stylesheet and the script are
written into it. Only the images sit beside it, gathered in an `assets` folder that keeps
the folders they came from but not each note's own `assets` step: `docs/assets/Guide/a.png`
becomes `assets/docs/Guide/a.png`. The single page has the same search, theme button,
**expand all** / **collapse all** buttons and resizable panel as a site; the search reads
the notes straight from the page, and a result jumps to its note.

The text width and the note's name above it follow the editor's settings at the time of
the export: **Text width** set to the full pane gives full-width pages, and with **Show the
note name as a title** off no name is added above the notes.

The pages carry all their text and plain relative links, with nothing loaded later: the
site opens from a `file://` URL, from any web server and for a search engine — each page
has a `<title>`, a `<meta name="description">` taken from its first paragraph, a `lang`
and one `<h1>`. Folders in the navigation fold with `<details>`; the theme follows the
system.

One small script, `site.js`, adds what HTML alone cannot:

- **Search**: a field at the top of the left panel. It looks for every word typed in the
  notes' names, folders and text; the results take the tree's place — names that match
  first, each with a snippet around the words found, marked — and the tree comes back when
  the field is cleared (Esc). Enter opens the first result, ↓ and ↑ walk the list. The
  text comes from `search.js`, which the script loads the first time the field is used,
  so the pages themselves stay as light as they were.
- **Expand all** and **collapse all** beside "Notes" above the navigation.
- A **theme** button beside the site's name: a moon switches to the dark theme, a sun back
  to the light one, whatever the system prefers. Until it is pressed the theme follows the
  system.
- A handle on the panel's right edge that makes it wider or narrower (160–560 px; a double
  click gives the default back, ← → move it with the handle focused).

The theme, the column's width and the folders' state are remembered from page to page, per
site; the
folders of the page being shown always open. Without the script — blocked, or taken out of
the template — the search field, the buttons and the handle are simply not there, the theme
follows the system, and the site reads and links the same.

- **Pages**: `dir/Note.md` becomes `dir/Note.html`. A note that opens with a heading equal
  to its name has that heading as the page's title, with its tags under it. A root note called `index` or `README`
  becomes the front page, `index.html`; without one the front page lists the notes and the
  tags. `[text](other.md)` and `[[wiki links]]` point at the pages, `[[Note#Heading]]` at
  the heading — every heading carries an id — and a link to a note that is not in the
  export stays plain text. Task checkboxes are shown, not clickable. Front matter is left
  out.
- **Images**: every picture and PDF in the folder is copied at the same path, so both
  `![[image.png]]` and `![alt](path.png)` keep working; an embed is found where the editor
  finds it.
- **Tags**: with the **Export tags** box on, each page shows its tags, the tag tree sits
  under the navigation, and a page per tag lists its notes — a parent tag the notes of
  every tag under it — plus an index of tags at `tags/index.html`. Only notes in the export
  count.
- **Template**: the dialog shows the page template; edit it there or **Reset to default**,
  and it is remembered. The template is HTML with `{{placeholders}}`:

  | Placeholder | Stands for |
  | --- | --- |
  | `{{navigation}}` | the folder tree as a `<nav>`, the current page marked — required |
  | `{{heading}}` | the page's `<h1>`, empty when the note opens with its own — required |
  | `{{content}}` | the note as HTML — required |
  | `{{tags}}` | the tag tree as a `<nav>`; required when tags are exported, empty otherwise |
  | `{{pagetags}}` | the note's tags as `#chips` linking to their pages |
  | `{{title}}` | the page's name as plain text, for `<title>` |
  | `{{site}}` | the name of the exported folder |
  | `{{description}}` | the first paragraph, plain text, for `<meta name="description">` |
  | `{{width}}` | `full` or `column`, from the text width setting |
  | `{{root}}` | `../` per folder the page sits in, so `{{root}}style.css` reaches the root |
  | `{{styles}}` | the stylesheet: a `<link>` to `style.css`, or the whole `<style>` on a single page |
  | `{{script}}` | the script: a `<script src>` for `site.js`, or the whole `<script>` on a single page |
  | `{{theme}}` | the light/dark button |
  | `{{path}}` | the note's path, `docs/Note.md` |
  | `{{lang}}` | the interface language, for `<html lang>` |

  A site gets `style.css`, `site.js` and `search.js` at its root whether the template uses
  them or not; a single page carries its stylesheet and script inside, and gets a
  `style.css` beside it only when its template, from before `{{styles}}`, still links one. The default stylesheet styles the note as the editor's read view and reads
  the width from `<html data-width="{{width}}">`. A placeholder the export does not know is
  left as it is. A template saved before a new placeholder appeared does not use it:
  **Reset to default** brings it in.

## Privacy and security

- **The page reaches nothing.** A Content-Security-Policy in the file lets its code fetch
  nothing but files beside it on the same server (`connect-src 'self'`, for a folder served
  with an `index.json`), and send no form anywhere. The build fails if the policy goes missing
  or an external reference creeps in. The PWA's copy lets in its manifest and its service
  worker, both from its own origin.
- **Scripts in notes never run.** Notes may hold HTML — that is how text colours work — so the
  policy allows exactly one script, the editor's own, by its hash: an `onerror` on an `<img>` or
  a `<script>` in a note does nothing.
- **What a note links to on the web loads from there**: an image, a video or an embedded
  frame with an `https://` address, as in any Markdown viewer — that is the note's choice, not
  the editor's. Such requests carry no `Referer`.
- **Files stay on your disk.** Notes are read and written in place through the File System
  Access API; the remembered folders are handles in the browser's IndexedDB, never paths or
  contents. Where a browser cannot write to a disk, the folders you open are copied into its
  IndexedDB, on this device only, and leave it only as a ZIP archive you download — see
  "[Notes kept in the browser](#notes-kept-in-the-browser)".
- The extension's permissions: see "[Markdown Knowledge Base](#markdown-knowledge-base-the-chrome-extension)".

## Features

- **File tree**: collapsible folders, filtering by name, creating, renaming and deleting
  through the context menu, resizable panel, hideable panel (`⌘\`).
- **Formatting the selection**: headings H1–H3, bold, italic, strikethrough, monospace,
  `==…==` highlight, text and background colour, link, `[[wiki link]]`, lists, tasks, quote,
  code block, table, divider.
- **Markup**: CommonMark plus tables, tasks with clickable checkboxes, `==highlight==`,
  `[[wiki links]]`, front matter, syntax highlighting for 19 languages, images from the
  folder.
- **Images**: `![alt](assets/Note/image-1.png)` shows an image by its path from the note's
  folder. Obsidian's `![[assets/Note/image-1.png]]` works too, the path from the note's
  folder or else from the root (`![[…|300]]` sets the width). An older
  embed with a bare name, `![[image-1.png]]`, is looked for in the images folder of the
  settings, with and without the note's subfolder, in `assets/<note name>/`, beside the
  note, and then anywhere in the folder by its name, as Obsidian does. Images folders start
  collapsed in the tree. Renaming a note renames its image folder too and changes the
  note's links to its images, in either form, to the new path. A picture clicked in the tree opens as a picture, not as
  text.
- **Adding images**: the picture button on the toolbar picks image files; an image pasted
  with `⌘V` — a screenshot, a picture copied in the browser, a file copied in the file
  manager — goes in the same way. Either is saved into the images folder beside the note,
  `assets/<note name>/` by default, and put in as plain Markdown with its path,
  `![image-1](assets/<note name>/image-1.png)`, which every editor shows (a space in the path
  is written `%20`): at the caret, or at the end of the note when no block is open. Images dragged
  onto the note go in where they are dropped: at that point in a block or a table cell, and
  beside the text or between two blocks, at the end of the block above; a drop in read mode
  switches to editing, and one off the note adds the images at the end. A drop with a folder
  in it still opens the folder. A pasted
  screenshot is named `image-1.png`, `image-2.png` and on; a picked file keeps its own name,
  with a number added when it is taken. Cells copied from a spreadsheet paste as text, not
  as the picture that comes with them. Only a folder opened for writing takes new images.
- **Tags**: nested tags on notes, a tag tree and a page per tag, kept apart from the notes
  in `.meta.json` — see "[Tags](#tags)".
- **Export to HTML**: the folder, or one of its subfolders, as a static site with search,
  or as one page — see "[Export to HTML](#export-to-html)".
- **A single note** opened from the Finder or Explorer in the installed app, or dropped on the
  window — see "[A single note](#a-single-note)".
- **Notes kept in the browser** where it cannot write to a disk — Safari, Firefox, phones,
  iPads — in and out as a ZIP archive; any folder downloads as one from the settings — see
  "[Notes kept in the browser](#notes-kept-in-the-browser)".
- **Markdown Knowledge Base**: what is selected in Chrome to the default note, or to one you
  pick, with Send to Markdown; a page, a link or an image to a note — see
  "[Markdown Knowledge Base](#markdown-knowledge-base-the-chrome-extension)".
- **Settings** (the gear at the top right, next to search): interface language, theme
  (system, light, dark), zoom 50–200 %, text width (a centred column or the full pane),
  whether the note name is shown as a title, and where added images go: the images folder
  beside the note (`assets` by default) and whether each note gets a subfolder of its own
  in it; without one, all the images go straight into the folder. Then the open folder:
  Close folder, and Download ZIP for all of it as an archive. At the bottom, the version
  — and in the installed app, a check for updates and whether to install them by themselves.
- **Languages**: English and 16 more — 中文, हिन्दी, Español, Français, العربية, বাংলা,
  Português, Русский, اردو, Bahasa Indonesia, Deutsch, 日本語, Türkçe, 한국어, Italiano,
  Українська. By default the interface follows the browser's language. In Arabic and Urdu the
  chrome is mirrored right to left; the note itself keeps its own direction.
- **Phones**: on a screen narrower than 720 px the file panel slides over the note — ☰
  opens it, picking a note or a tap beside it closes it — and the toolbar fits one row;
  formatting gets a second row in edit mode only. Export is left out there. On a touch
  screen the fields are at least 16 px, so iOS does not zoom into them, and the tree's rows
  are taller. The desktop layout and its remembered panel width are untouched.
- Autosave one second after an edit, undo and redo, search within the note.
- The language, theme, zoom, text width, panel width, tag panel height and last opened note
  are remembered.

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

## Translations

The English text stays in the code: `t('tree', 'Delete')`, `tn('status', '{count} word',
'{count} words', n)`, and `data-i18n="context"` / `data-i18n-attr="context"` in the
template. The first argument is the context — the part of the interface a string belongs
to, so the same English word can be translated differently in two places. A dictionary,
`src/locales/<code>.json`, maps context → English text → translation:

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

A string the dictionary lacks is shown in English. A text with a number has one form per
plural category of the language (`Intl.PluralRules`), keyed by the English plural form.
`npm run i18n` lists, per language, the strings not translated yet and the ones no longer
used; `npm test` checks that every translation keeps the English placeholders and has all
plural forms.

What Chrome shows of the extension itself — its name and description, the toolbar button's
title — follows the browser's language rather than the panel's, through `chrome.i18n`. Those
texts are the English ones in `src/extension/manifest.json`, translated in the same
dictionaries under the context `manifest`; the build writes them to
`_locales/<code>/messages.json` and puts `__MSG_appName__` and the like into the manifest.
Chrome has codes of its own and ignores the rest: `pt` becomes `pt_BR` and `pt_PT`, `zh`
becomes `zh_CN`, and Urdu has none, so there Chrome describes the extension in English. The
build stops at a name over 75 characters or a description over 132. The context menu speaks
the panel's language once the panel has been opened, the browser's before that.

This README is translated as well: `docs/readme/README.<code>.md`, one per language, with the
list of languages at the top of each. A change here belongs in the translations too.

## Build

```sh
./build.sh         # installs the dependencies if needed, then builds
npm install
npm run build      # -> build/macaed.html, build/pages/, build/extension/ and its zip
npm run watch      # rebuild on changes in src/ and assets/
npm run typecheck  # tsc --noEmit
npm test           # the block model, formatting, Markdown syntax, tags, the export, clippings and the dictionaries
npm run test:browser  # in headless Chrome: the editor, HTML → Markdown, the PWA, the extension
npm run i18n       # strings each dictionary lacks or no longer needs
npm run check      # typecheck, test, build and test:browser in a row: green means done
```

`build.mjs` bundles `src/main.ts` with esbuild into an IIFE and substitutes it, along with
the styles and the icon (a data URI), into `src/template.html`; the export's template and
stylesheet are bundled as strings. The template's Content-Security-Policy gets the hash of
that one script. The result is `build/macaed.html`, around 640 KB. The build fails if even one
external reference is left in it.

The same run writes `build/pages/`: that page as an installable PWA — `index.html` with a
manifest link and a `<meta name="service-worker">` that tells the page to register its worker,
`manifest.webmanifest`, the icons and `sw.js`, which caches the page so it opens offline.
`build/macaed.html` itself stays a single file with no external references.

And `build/extension/`: `panel.html` — the template, its script in `panel.js` — `popup.html`
(with the page's styles and `popup.css`) and `popup.js`, `background.js`, `offscreen.html` and
`offscreen.js`, the icons,
`_locales/` and `manifest.json`, whose version is `package.json`'s.
`build/macaed-extension-<version>.zip` holds the same files with fixed dates: the same sources
give the same bytes.

The browser tests start the local Chrome (`CHROME=/path/to/chrome` to pick one) and speak the
DevTools protocol to it, with no dependencies; without a Chrome they are skipped.
`tools/test-extension.mjs` loads the extension through that protocol (`Extensions.loadUnpacked`
over a pipe; `--load-extension` is gone from Chrome since version 137), opens a folder in the
side panel and sends it pages, selections, links and images from test sites on a local server;
then the button's window adds selections to the default note and to one picked, through the
panel and on its own, and, with the knowledge base closed, puts them aside for the panel, or
opens it itself; with no panel open, the menu adds to the default note, or puts it aside. A context
menu cannot be clicked from DevTools, so the test fires the worker's `onClicked` itself, and
opens the button's window as a page of its own, told which tab is beside it; with no real click
Chrome grants no `activeTab`, so the copy under test may reach the test sites, `*.test`, as host
permissions.

## Versions and releases

The version is written in one place, `package.json`. The build puts it into the page (the
line under the start screen, the bottom of the settings), into the extension's
`manifest.json` and into the PWA's cache name. A build of the commit tagged `v<version>` shows
it as it is; any other adds its commit, `0.11.0+1a2b3c4`, so a page from `main` on GitHub
Pages is not taken for the release. Chrome's `version` holds numbers only, so there the commit
goes into `version_name`.

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, a commit and the tag v0.12.0
git push --follow-tags      # the tag starts .github/workflows/release.yml
```

The release workflow stops if the tag and `package.json` disagree, runs the tests, then
attaches `macaed-<tag>.html`, `macaed-extension-<tag>.zip` and `SHA256SUMS.txt`.

## GitHub Pages

`.github/workflows/pages.yml` builds and tests every push to `main` and deploys
`build/pages/` to GitHub Pages (Settings → Pages → Source: GitHub Actions), at
<https://marketkernel.github.io/markdown-catalog-editor/>. In Chrome, Edge and Arc the
install button in the address bar turns it into a separate app window; on iOS it is Share →
Add to Home Screen. Folders open the same way as in the single file.

**Offline.** Once opened, the editor works with no connection: the service worker keeps the
page, its manifest and icons in a cache named after the version, and serves the page from
there. Notes never pass through it — they are on your disk.

**Updates.** Each deploy changes `sw.js`, so the browser finds the new worker by itself — on a
launch with a connection, every few hours while the app stays open, when the connection comes
back, or when Settings → Check for updates asks. The new worker downloads its version into a
cache of its own and waits; the running one keeps serving the old page, offline too, so
nothing changes under your hands. The settings, with a dot on their button, and the start
screen then say "Version … is ready. Update": Update saves the open note (or asks, when it
cannot be saved), lets the new worker in and reloads the page, which says once that it has
been updated; the old cache is deleted. Without the button the new version starts once every
window of the app has been closed — or, with "Install updates by themselves when everything is
saved and the app is in the background" ticked in the settings, as soon as nothing is unsaved
and the window is out of sight.

That is also the trade-off: an installed PWA runs whatever the last deploy put there, while a
downloaded file stays the version it is. For a version fixed on disk, take `macaed-<tag>.html`
from a release and compare it with `SHA256SUMS.txt`.

**Opening a `.md`.** The manifest names Markdown files as files the app opens
(`file_handlers`) and keeps them to one window (`launch_handler`, `focus-existing`): see "[A
single note](#a-single-note)". The page takes them through `launchQueue`, once its start —
reopening the last folder — is over, so the folder never replaces the note; one that comes
during an export or with a dialog open waits until you open it again.

The installed app asks the browser to keep its storage (`navigator.storage.persist()`): a disk
running low could otherwise take the offline copy and the remembered folders with it.

`npm run test:browser` opens `build/pages/` too (`tools/test-pwa.mjs`): the service worker
takes the page over, Chrome finds the manifest installable, and with the server gone the page
still loads; then a check finds nothing, then no connection, then a new deploy, which waits
until Update lets it in. Headless Chrome hands no file to an app, so a stand-in `launchQueue`
gives the page a real file handle: the note opens on its own and an edit is saved into it.

## Layout

```
src/template.html   markup with the __STYLES__/__APP__/__ICON__ placeholders and the CSP
src/styles.css      palette, light and dark themes, block paired with its source
src/main.ts         opening a folder, saving, toolbar, search, settings
src/vault.ts        File System Access API, drag-and-drop, webkitdirectory; file CRUD; a note on its own
src/stored.ts       folders kept in the browser's IndexedDB where it cannot write to a disk; a folder ⇄ ZIP
src/zip.ts          ZIP archives: writing, reading, and an inflater for browsers without DecompressionStream
src/editor.ts       live preview: active block, caret, Enter, joining, undo
src/blocks.ts       splitting the document into blocks by markdown-it tokens
src/format.ts       toolbar actions as pure text transforms
src/markdown.ts     markdown-it: ==highlight==, [[wiki links]], ![[embeds]], tasks, code highlighting
src/tree.ts         folder and file tree
src/meta.ts         .meta.json: tags per note, the tag tree, renames and deletes
src/tags.ts         the tag tree, the tags under a note's title, a tag's page
src/export.ts       the static site: pages, navigation, tag pages, links between them
src/export-ui.ts    the export dialog and its progress
src/export-script.ts   site.js: search, expand/collapse all and the resizable column on the exported site
src/export-template.html, src/export.css   the default page template and its stylesheet
src/settings.ts     localStorage: language, theme, zoom, panel width, last note
src/i18n.ts         t()/tn(), the language list and flags, translating the page's markup
src/locales/        one dictionary per language
src/ui.ts           dialogs, context menu, popover, notifications
src/update.ts       the installed app's updates: the waiting worker, its version, Update
src/platform.ts     what the page does beyond itself: nothing, except in the extension
src/clip.ts         what the extension sends, as a note: file name, front matter, the end of a note
src/clip-ui.ts      the dialog that asks where it goes
src/pwa/sw.js       the service worker of the Pages build: offline, and a new version waits
src/extension/      "Markdown Knowledge Base": manifest.json; popup.ts, popup.html, popup.css
                    (the button's window: Send to Markdown); background.ts (the menu); take.ts
                    and grab.ts (run in the page: its text or the selection); to-markdown.ts
                    (HTML → Markdown); extension.ts (in the place of platform.ts); messages.ts;
                    knowledge.ts (adding to a note from the popup and the worker); offscreen.ts,
                    offscreen.html (HTML → Markdown for the worker)
tools/              build helpers (load.mjs, i18n.mjs, chrome.mjs) and the tests: block model,
                    formatting, tags, the export, clippings, ZIP archives, dictionaries; in headless Chrome
                    the editor, HTML → Markdown, the PWA and the extension
assets/             icon.svg; pwa/ its PNG sizes for the PWA; extension/ the extension's icons
docs/               the README screenshot and its translations, docs/readme/
build/macaed.html   the build output
build/pages/        the PWA for GitHub Pages
build/extension/    the Chrome extension, and build/macaed-extension-<version>.zip of it
```

## Limitations

- Collaborative editing, plugins, sync and a link graph are not supported.
- On a phone the layout is made for reading: the tree's context menu needs a long press
  that iOS does not turn into one, and tables are extended with bars that appear on hover.
- Only Chromium-based browsers on a computer can write files to a folder on disk; elsewhere
  the notes are kept in the browser and brought out as a ZIP archive.
- The extension is for Chrome (and browsers built on it with a side panel, such as Edge); it
  is not in the Chrome Web Store yet. It keeps images on the web rather than downloading them
  into the folder: that would need access to every site.

## License

MIT — see [LICENSE](LICENSE).
