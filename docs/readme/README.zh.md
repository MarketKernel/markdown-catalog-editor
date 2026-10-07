# markdown-catalog-editor

<!-- languages -->
<h3 align="center">
<a href="../../README.md">🇬🇧 English</a> ·
<b>🇨🇳 中文</b> ·
<a href="README.hi.md">🇮🇳 हिन्दी</a> ·
<a href="README.es.md">🇪🇸 Español</a> ·
<a href="README.fr.md">🇫🇷 Français</a> ·
<a href="README.ar.md">🇸🇦 العربية</a> ·
<a href="README.bn.md">🇧🇩 বাংলা</a> ·
<a href="README.pt.md">🇧🇷 Português</a> ·
<a href="README.ru.md">🇷🇺 Русский</a> ·
<a href="README.ur.md">🇵🇰 اردو</a> ·
<a href="README.id.md">🇮🇩 Bahasa Indonesia</a> ·
<a href="README.de.md">🇩🇪 Deutsch</a> ·
<a href="README.ja.md">🇯🇵 日本語</a> ·
<a href="README.tr.md">🇹🇷 Türkçe</a> ·
<a href="README.ko.md">🇰🇷 한국어</a> ·
<a href="README.it.md">🇮🇹 Italiano</a> ·
<a href="README.uk.md">🇺🇦 Українська</a>
</h3>
<!-- /languages -->

一款面向本地笔记文件夹的 Markdown 编辑器——精神上近似 Obsidian，但完全包含在一个独立的 HTML
文件中。不使用网络：文件直接在磁盘上读取和保存。

**[在线演示](https://markdown.marketkernel.com/)** —— 同一款编辑器，以 PWA（渐进式网页应用）
的形式提供：可以将其安装到系统中，之后作为一个独立的应用运行，拥有自己的窗口和图标，并可离线使
用。在电脑上，Chrome、Edge 和 Arc 可使用地址栏中的安装按钮；在 Android 上，使用 Chrome 的 ⋮
菜单 → 安装应用；在 iOS 上，在 Safari 或 Chrome 中使用“分享”→“添加到主屏幕”。你的笔记同样留
在你自己的磁盘上，已安装的应用可以直接从 Finder 或资源管理器打开 `.md` 文件，并会在你确认时
更新——参见“[GitHub Pages](#github-pages)”。

同一款编辑器也是 **Markdown Knowledge Base**，一个
[Chrome 扩展程序](#markdown-knowledge-base-chrome-扩展程序)：在网页上选中文字，点击它的按
钮，**Send to Markdown** 就会把内容添加到你知识库的默认笔记——或你选择的任意一篇笔记。编辑
器本身会在 Chrome 的侧边栏中、页面旁边打开。

![编辑器中打开了一个笔记文件夹：左侧是文件树和标签，右侧是处于编辑模式的笔记](../macaed.jpg)

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

## 使用方法

1. 构建 `build/macaed.html`（参见“[构建](#构建)”），然后在浏览器中打开它。
2. “打开文件夹” → 选择一个包含 `.md` 文件的文件夹。你也可以直接把文件夹拖进窗口。
3. 顶部的 **阅读 / 编辑** 切换开关，或 `⌘E`。

在 Chrome、Edge 和 Arc 中，文件夹通过 File System Access API 打开：笔记会被原地读取和写入，新
建、重命名和删除文件及文件夹都能正常使用。在 Safari 和 Firefox 中，文件夹以只读方式打开，`⌘S`
会提供下载修改后文件的选项——手机上也是如此：Android 上的 Chrome 没有 File System Access，而
iOS 上的所有浏览器，包括 Chrome 在内，都运行在 Safari 的引擎之上。

编辑器会记住最近在此打开过的六个文件夹（页面从不获知文件夹的路径，而是把文件夹的句柄保存在浏
览器的 IndexedDB 中），以及每个文件夹中最后打开的笔记。下次启动时，如果浏览器仍然允许，上次的
文件夹会自动打开——无论是在已安装的应用中，还是你曾选择过“每次访问都允许”。否则，起始界面会
列出最近使用过的文件夹：点击一下，浏览器会再次请求访问权限。要返回该列表——切换文件夹或打开一
个新文件夹——点击文件面板顶部的文件夹名称，或在设置中选择“关闭文件夹”；× 会将某个文件夹从列
表中移除。

如果你把 `macaed.html` 放在笔记旁边，并通过 HTTP 提供服务，页面会自动识别该文件夹——前提是同
一目录下有一个 `index.json`，形如 `{ "name": "Notes", "files": ["Note.md", "Folder/Other.md"] }`。

### 单篇笔记

`.md` 文件可以在没有其所在文件夹的情况下单独打开：

- **从 Finder 或资源管理器打开**，在已安装的应用中（电脑上的 Chrome 或 Edge）：选择“打开方
  式”→ 该应用，或将其设为 `.md` 的默认应用。如果应用已有一个窗口打开，笔记会进入该窗口——同
  一个文件若由两个窗口打开，保存时会相互覆盖——并取代那里原本显示的文件夹；再次打开同一篇笔
  记时，窗口会保持原样。
- **拖放到窗口上**，在任意浏览器中均可。

笔记会像在文件夹中一样被原地读取和写入——在 Safari 和 Firefox 中为只读，`⌘S` 会提供下载选
项。由于周围没有文件夹，也就没有可以新建、重命名或删除的内容，也没有来自其文件夹的图片、标
签或导出：这些功能都需要打开文件夹才能使用。以这种方式打开的笔记不会被加入最近使用的文件夹列
表。

## Markdown Knowledge Base: Chrome 扩展程序

`npm run build` 还会写出 `build/extension/`：以 Chrome 扩展程序形式呈现的编辑器，以及供 Chrome
网上应用店使用的 `build/macaed-extension-<version>.zip`；发布版本中也包含这个 zip 包。安装方法：
`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → `build/extension`（或解压后的
zip）。

**知识库** 是扩展程序中最近一次打开的笔记文件夹。编辑器本身——即 **完整模式**——位于 Chrome
的侧边栏中，在页面旁边，采用手机版布局，因为侧边栏比较窄；它会在各个标签页之间保持不变。在其
中打开文件夹的方式与在单文件版本中相同，最近使用过的文件夹也会被记住——这是扩展程序自己的记
录，与单文件版本或 PWA 的记录相互独立。

**工具栏按钮**（或 `Alt+Shift+M`）会在页面上方打开一个小窗口：

- 顶部显示页面上被选中的内容，以 Markdown 形式呈现——如果没有选中任何内容，则显示页面的主
  要文本：文章本身，不含网站的菜单、侧边栏、页脚、分享按钮、表单和隐藏部分。
- **Send to Markdown** 会把内容添加到 **默认笔记** 的末尾——最初是知识库根目录下的
  `Inbox.md`，在首次需要时创建。在一个空行之后是正文，然后是一行
  `— [The page's title](https://…)`，链接到内容的来源。写入完成后窗口会关闭。
- **添加到其他笔记**：显示知识库中的笔记，并带有按名称查找的字段；点击某篇笔记会改为添加到
  那里。笔记旁边的星标可以把它设为默认笔记；默认笔记排在最前面。
- 没有选中任何内容时，**作为新笔记** 会把整个页面变成一篇独立的笔记（见下文）。
- **完整模式** 会打开侧边栏。

**当知识库处于关闭状态时**——最后一个侧边栏关闭后，以及重启之后，Chrome 都会收回对文件夹的
访问权限，除非你曾选择过“每次访问都允许”——在你点击之前，页面都无法进入文件夹。此时窗口会
说明这一点，并仍会按侧边栏最后看到的样子列出笔记：**Send to Markdown**，或点击某篇笔记，会
把你选中的内容暂存到扩展程序自己的存储中，一旦某个侧边栏重新打开该文件夹，它就会被添加到那
篇笔记的末尾。**打开** 会直接在窗口中向 Chrome 请求该文件夹；在侧边栏中点击一下文件夹也是
同样的效果。当 Chrome 询问时，选择**每次访问都允许**：这样文件夹会在侧边栏关闭后，以及重
启之后，仍保持打开状态。

当侧边栏中打开着知识库时，是侧边栏在向笔记中添加内容——它可能已经打开了那篇笔记，并带有尚未
保存的更改，背着它写入会丢失这些更改。当没有侧边栏打开、且文件夹仍被允许访问时——无论是通
过“每次访问都允许”，还是通过**打开**——则由窗口自己写入笔记。

页面的**右键菜单**中有**将页面发送到 Markdown**；选中文字时，有**将选中内容发送到
Markdown**；在链接上，有**将链接发送到 Markdown**；在图片上，有**将图片发送到 Markdown**。
它们都不会打开侧边栏：打开侧边栏会把页面挤到一边。当窗口中没有打开的侧边栏时，你选择的内容
会像 **Send to Markdown** 一样添加到默认笔记的末尾——如果知识库处于关闭状态，则像上文所说
的那样先等待它。工具栏按钮会显示发生了什么：短暂显示一个勾号，或在标题中带有原因的 `!`，
以及有多少条待发送内容在等待侧边栏打开文件夹。当窗口的侧边栏已打开时，内容会改为发送到那
里，其中的对话框会显示收到的内容——以及来自哪个网站——以 Markdown 形式呈现，你仍可以修改
它，并会询问要保存到哪里：

- **新建笔记**，页面的默认选项：保存在剪藏文件夹中（默认是根目录下的 `Clippings`，可自行更
  改；该文件夹会被记住，留空表示根目录），以页面标题命名，文件名中不允许出现的字符会被去掉。
  如果名称已被占用，会加上数字，如 `Title 2.md`。笔记以前言（front matter）开头——页面标题、
  地址和日期——然后是正文；保存后会自动打开。

  ```markdown
  ---
  title: "The page's title"
  source: "https://example.com/post"
  clipped: 2026-10-07
  ---

  # The page's title

  The text…
  ```

- **当前打开笔记的末尾**，选中内容、链接或图片的默认选项，方式与 Send to Markdown 相同。链
  接不需要来源行——它自己就是来源。

如果在任何文件夹被打开之前就发送了内容，它会先等待：侧边栏会要求你打开一个文件夹，对话框会
在文件夹
打开后出现。扩展程序无法读取的页面——Chrome 自身的页面、网上应用店、PDF——会以指向它的链接形
式送达。

**Markdown 的构成。** 标题、段落、**粗体**、*斜体*、~~删除线~~、==高亮==、`代码`、带有完整地
址的链接和图片、列表——嵌套、编号、任务清单——引用、带有语言标注的代码块（来自
`language-…`、GitHub 的 `highlight-source-…` 等），表格（单元格内的换行写作 `<br>`，与编辑器
自身的写法一致），分隔线。文本会原样保留：页面上输入的 `*`、位于行首的 `#` 或 `<b>` 都会被转
义，因此永远不会变成格式，页面本身的 HTML 也不会进入笔记。图片仍留在网络上，以其地址链接；懒
加载图片会取其真实地址而非占位图，跟踪像素会被去掉。

**权限。** `activeTab`：点击按钮、菜单项或快捷键，才会把那一个标签页授予扩展程序，也只有这时
扩展程序才会读取它——通过 `scripting`，在页面中运行一个函数，复制其文本并返回。扩展程序在任
何地方都不运行内容脚本，也没有其他方式访问任何网站：没有 `host_permissions`，构建流程会拒绝它
的出现。`offscreen`：后台工作进程没有 DOM，因此在没有侧边栏打开时，页面或选中内容的 HTML
会在扩展程序的一个 offscreen 文档中转换为 Markdown，完成后该文档会关闭。`contextMenus`、
`sidePanel` 和 `storage`——发送到侧边栏的内容会通过
`chrome.storage.session`（浏览器关闭即清空）交给所在窗口的侧边栏；`chrome.storage.local` 中
保存着按钮的窗口在知识库关闭期间暂存的内容、它的笔记列表，以及侧边栏的语言和默认笔记，供后
台工作进程使用。按钮的窗口和后台工作进程都会通过 `chrome.runtime` 消息，请求已打开知识库的
侧边栏把内容添加到一篇笔记中，而侧边栏只会接受来自扩展程序自身页面的这类消息。
扩展程序的页面带有 `connect-src 'none'`：编辑器不会在网络上访问任何东西；构建流程会检查这一
点，以及是否有页面包含内联脚本或外部地址。

**实现方式。** 侧边栏本身就是这个页面：`panel.html`，其脚本在 `panel.js` 中，这是 Manifest V3
的要求——同样的 `src/main.ts`，只是用 `src/extension/extension.ts` 取代了 `src/platform.ts`，
后者的钩子在单文件版本和 PWA 中什么都不做。按钮的窗口是 `popup.html` 和 `popup.js`
（`src/extension/popup.ts`），带有与该页面相同的样式：它从与侧边栏相同的 IndexedDB 中读取知
识库的句柄，并在浏览器仍然允许的情况下通过它写入；否则会把发送的内容暂存到 `chrome.storage.local` 中，
由打开该文件夹的侧边栏在那里找到它（`src/extension/messages.ts`）。后台工作进程
`background.js` 负责菜单：它读取标签页内容（`src/extension/take.ts`、`grab.ts`），并把取得
的内容发送给窗口的侧边栏，或者像按钮的窗口一样把它添加到默认笔记中
（`src/extension/knowledge.ts`），通过 `offscreen.html` 来转换 Markdown
（`src/extension/offscreen.ts`）。HTML 会在 `src/extension/to-markdown.ts` 中转换为
Markdown，编辑器再将其添加进去，或询问它要保存到哪里（`src/clip.ts`、`src/clip-ui.ts`）。

## 实时预览

在编辑模式下，文档始终保持格式化显示，只有光标所在的那个块会变回原始 Markdown。块可以是一个
段落、一个标题、一整个列表、一个代码块或一段引用：列表不会逐行散开。表格的编辑方式有所不
同——参见“[表格](#表格)”。

源码行保留着格式化版本的字号、字重和行高，因此文本不会跳动：`# Heading` 会以标题的大小显示。
这一点会被自动检查——在 50% 到 200% 的任意缩放级别下，切换块时其顶边移动的距离都小于一个像
素。

有一处高度确实会发生变化，这在这种模式下是无法避免的：代码块会多出两行 `` ``` `` 围栏。在此
过程中，相邻的块不会抖动——只有下方的内容会随之移动。

在列表之外按下 Enter 会开始一个新块。在块末尾或空行上按下时，会在下方打开一个空行并把光标放
在那里；再次按下则再加一行。在 Markdown 中，单独一个空行只用来分隔两个块，所以你能在其中输入
的空行，两侧都另有空行——编辑器会自动添加这条分隔行，输入的文字也绝不会粘连到相邻的块上。这
类空行以及链接引用定义（`[id]: https://…`）只在编辑模式下显示；阅读视图会按原样渲染
Markdown。

## 表格

表格永远不会变成 `| 竖线 |` 的原始形式。点击只会打开指针所在的那个单元格，该单元格会显示自己
的源文本——`**粗体**` 而不是加粗效果——因此行内格式以及工具栏的标记、链接和颜色在其中依然可
用。输入只会重写文件中的那一个单元格；表格的其余部分保持其原有的内边距和对齐方式。

- **移动**：Tab 和 Shift+Tab 移至下一个和上一个单元格，Enter 移至下方单元格，方向键在到达文
  字边缘时移至相邻单元格——越过表格边缘后则移到旁边的块上。在最后一行按 Enter 会在表格下方开
  始一个新块。
- **换行**：Ctrl+Enter（也可以是 ⌘Enter 或 Shift+Enter）在单元格内开始新的一行。表格的一行是
  一行 Markdown，因此换行会写成 `<br>`；正在编辑的单元格会把它显示为真正的换行，粘贴的文本也
  会以同样的方式保留换行。在有多行内容的单元格中，上下方向键会先在其内部的各行之间移动。单元
  格文字靠顶部对齐。
- **添加**：在编辑模式下，将指针悬停在表格上会显示一条带 **+** 的工具条，表格下方的 **+** 用
  于添加行，右侧的用于添加列。在最后一个单元格按 Tab 同样会添加一行。
- **删除**：只会删除空行和空列，因此不会因为一时失误而丢失文字。将指针悬停在空行上，其左侧
  会出现 **×**；悬停在空列上，其上方会出现 **×**。在空单元格中按 Backspace 可以通过键盘实现
  同样的效果：如果整行都是空的就删除该行，否则如果整列（包括表头）都是空的就删除该列；一个已
  经没有任何文字的表格会被整体删除。表头行会保留——表格总需要一个表头。

添加或删除操作会把表格重写为纯文本的 `| a | b |` 形式。

## 标签

标签用来跨文件夹对笔记进行分组。标签不会写入笔记本身：Markdown 内容保持完全不变，该文件夹的
所有标签都保存在笔记旁边的一个文件中。

- **在笔记中**：标签以 `#tag` 小标签的形式位于标题下方，后面跟着一个 **+**。点击 **+** 会变
  成一个输入框；按 Enter 添加标签后，**+** 会重新出现在其后。输入时会提示该文件夹中已经使用
  过的标签。Esc 取消输入；如果输入框中还有文字就移开焦点，同样会添加该标签。点击标签上的
  **×** 可移除该标签，点击标签本身会打开该标签的页面。标签在阅读模式和编辑模式下都可以修改。
- **拼写**：开头的 `#` 会被去掉，标签内部的空格会变成连字符，因此 `#to do` 会被存储为
  `to-do`。如果新标签仅在大小写上与已有标签不同，会采用已有的拼写——`Idea` 和 `idea` 永远不
  会变成两个标签。一篇笔记不能重复携带同一个标签。
- **嵌套**：`/` 用于嵌套标签。`work/alpha` 和 `work/beta` 在标签树中位于 `work` 之下，带有
  `work/alpha` 标签的笔记同样会计入 `work`。
- **标签树**：位于文件面板底部、与文件树分开的区域。每个标签都会显示有多少篇笔记带有它或带
  有嵌套在它之下的标签；父标签的箭头可折叠其子标签，标题栏可折叠整个区域。文件树上方的名称过
  滤器同样会过滤标签。该区域最多占面板的 42%，并在内部滚动；拖动它上方的分隔线可以降低其高度
  （但不能增高），双击该分隔线可以把空间还回去，分隔线获得焦点时，↑ 和 ↓ 也能实现同样的效
  果。高度会被记住。
- **标签页面**：点击标签树中的某个标签，或点击某个标签小标签，会显示带有该标签的笔记——父
  标签还会列出其下所有标签对应的笔记。每一行给出笔记的名称、所在文件夹及其所有标签；点击名称
  会打开该笔记，点击标签会打开那个标签。该页面是只读的：没有任何内容可以编辑，格式工具栏也会
  被关闭。对于嵌套标签，其标题中的各级父标签会链接到各自的页面。
- **重命名与删除**：当在文件面板中对笔记或整个文件夹进行重命名或删除时，标签会随之变化。如
  果笔记是在编辑器之外被移动或删除的，它在文件中的条目会保留下来，但只要笔记缺失，该条目就既
  不会显示也不会被计入统计。
- **只读文件夹**（Safari、Firefox）：标签会照常显示，但 **+** 和 **×** 不会出现。

### `.meta.json`

这个文件位于所打开文件夹的根目录，会在添加第一个标签时创建。它永远不会出现在文件树中。

```json
{
  "notes": {
    "Ideas.md": { "tags": ["idea", "work/alpha"] },
    "Projects/Roadmap.md": { "tags": ["work/alpha", "planning"] }
  }
}
```

键是笔记相对于根目录的路径，与文件树中显示的一致；标签保持着它们被添加时的顺序。写入文件时，
笔记会按路径排序，并使用两个空格缩进，因此在 diff 中阅读体验良好；不再带有任何标签的笔记会从
文件中删除。编辑器不认识的字段——无论位于顶层还是某篇笔记的条目内——在回写文件时都会被保留，
因此其他工具也可以在其中存储自己的数据。如果该文件不是一个合法的 JSON 对象，编辑器会予以提
示，不显示任何标签，也绝不会覆盖它；在文件被修复并重新打开文件夹之前，标签都无法更改。

当文件夹通过 HTTP 配合 `index.json` 提供服务时（参见“[使用方法](#使用方法)”），把
`.meta.json` 列入其文件列表，标签才会显示出来。

## 导出为 HTML

工具栏上的导出按钮（在“保存”旁边）会把整个文件夹转换为一个静态网站；文件夹右键菜单中的
**导出为 HTML…** 则只对该文件夹本身执行同样的操作，而在文件树下方空白处使用它则针对整个文件
夹。生成的网站会被写入笔记文件夹根目录下的 `output/<folder>/`；该文件夹以导出时刻命名，如
`2025-12-31_23-33-33`，也可以在对话框中重命名。`output` 永远不会出现在文件树中。只有以可写方
式打开的文件夹才能导出。

导出进行期间，对话框会显示当前所处的步骤——读取笔记、写入页面、复制图片——并配有进度条，此时
无法关闭；**停止** 会在已经在处理的文件完成后结束导出，保留目前已写入的内容。在导出完成之
前，导出按钮和菜单项都处于禁用状态。文件会按批读取和写入，沿途经过的每个文件夹只创建一次。导
出结束时会从磁盘重新读取该文件夹：如果有文件缺失，对话框会说明缺失的数量并指出其中一个文件
名，而不会在文件夹实际为空的情况下报告成功。

**生成静态网站**——默认开启——会为每篇笔记生成一个页面，具体见下文。关闭后，导出结果是单独
一个页面 `index.html`，其中包含所有笔记：左侧面板是目录，每篇笔记是一个小节，上方是它的名
称，其标题整体降低一级，并以该笔记为前缀加上 id，这样笔记之间以及指向其标题的链接就都变成了
页面内的锚点。页面一次只显示一篇笔记——即地址中 `#anchor` 所指向或所处的那一篇，首次打开时显
示根目录下的 `index` 或 `README`，否则显示根目录下的第一篇笔记。目录、链接、搜索结果，以及每
篇笔记末尾的**上一条**／**下一条**链接，都可以在笔记之间切换。这是通过 CSS（`:target`）实现
的，因此即使没有脚本也能工作；脚本只负责在目录中标记当前显示的笔记。打印时会显示所有笔记。浏
览器自带的查找功能（`⌘F`）只能看到当前显示的笔记——搜索框则会查遍全部笔记。启用标签时，面板
中的标签树和笔记上的标签小标签会指向末尾的标签小节，每个标签对应一个标题及其笔记列表。该页面
是单一文件：样式表和脚本都写入其中。只有图片单独存放，汇集在一个 `assets` 文件夹中，保留它们
各自原来所在的文件夹，但不保留每篇笔记自身的 `assets` 这一级：`docs/assets/Guide/a.png` 会变
成 `assets/docs/Guide/a.png`。这个单页版本拥有与网站版本相同的搜索、主题按钮、**展开全
部**／**折叠全部**按钮和可调整宽度的面板；搜索直接从页面本身读取笔记内容，点击结果会跳转到对
应的笔记。

文本宽度以及笔记上方显示的名称，遵循导出那一刻的编辑器设置：**文本宽度** 设为全宽时，生成的
页面也是全宽的；关闭 **将笔记名称显示为标题** 后，笔记上方就不会添加名称。

页面携带全部文本内容和普通的相对链接，不需要之后再加载任何内容：网站可以通过 `file://` 地址
打开，也可以通过任意网络服务器打开，同样适用于搜索引擎——每个页面都有一个 `<title>`、一个取
自首段的 `<meta name="description">`、一个 `lang`，以及一个 `<h1>`。导航中的文件夹使用
`<details>` 折叠；主题跟随系统。

一个小小的脚本 `site.js` 添加了仅靠 HTML 无法实现的功能：

- **搜索**：位于左侧面板顶部的输入框。它会在笔记的名称、所在文件夹和正文中查找输入的每一个
  词；搜索结果会取代文件树显示——名称匹配的排在最前，每条结果都带有找到的词语周围的摘要并加
  以标记——清空输入框（Esc）后文件树会重新出现。Enter 打开第一条结果，↓ 和 ↑ 在列表中移动。
  搜索所需的文本来自 `search.js`，脚本会在输入框首次被使用时才加载它，因此页面本身依然保持轻
  量。
- 导航上方“笔记”旁边的**展开全部**和**折叠全部**。
- 网站名称旁边的**主题**按钮：月亮图标切换到深色主题，太阳图标切回浅色主题，无论系统偏好如
  何。在被点击之前，主题会跟随系统。
- 面板右边缘的一个手柄，可以把它拖宽或拖窄（160–560 像素；双击恢复默认宽度，手柄获得焦点时
  ← → 也能调整宽度）。

主题、栏宽和各文件夹的展开状态会在同一个网站内的各个页面之间被记住；当前显示页面所在的各级文
件夹始终处于展开状态。没有脚本时——无论是被阻止还是从模板中去掉——搜索框、各个按钮和手柄就不
会出现，主题会跟随系统，网站的阅读和链接方式则不受影响。

- **页面**：`dir/Note.md` 会变成 `dir/Note.html`。如果一篇笔记以与其自身名称相同的标题开
  头，该标题就会作为页面标题，其标签显示在下方。名为 `index` 或 `README` 的根笔记会成为首页
  `index.html`；如果没有这样的笔记，首页就会列出所有笔记和标签。`[text](other.md)` 和
  `[[wiki links]]` 指向对应页面，`[[Note#Heading]]` 指向对应标题——每个标题都带有一个 id——
  指向未被导出的笔记的链接会保留为纯文本。任务复选框会显示出来，但不可点击。前言会被略去。
- **图片**：文件夹中的每张图片和每个 PDF 都会按相同路径复制，因此 `![[image.png]]` 和
  `![alt](path.png)` 都能继续正常工作；嵌入内容的查找位置与编辑器中相同。
- **标签**：勾选 **导出标签** 后，每个页面都会显示自己的标签，标签树位于导航下方，每个标签
  都有一个页面列出带有该标签的笔记——父标签会列出其下所有标签对应的笔记——此外还有一个位于
  `tags/index.html` 的标签索引。只统计被导出的笔记。
- **模板**：对话框中会显示页面模板；可以直接在那里编辑，或点击 **恢复默认**，所做的修改会
  被记住。模板是带有 `{{占位符}}` 的 HTML：

  | 占位符 | 含义 |
  | --- | --- |
  | `{{navigation}}` | 以 `<nav>` 形式呈现的文件夹树，当前页面会被标记——必需 |
  | `{{heading}}` | 页面的 `<h1>`；如果笔记本身已有标题则为空——必需 |
  | `{{content}}` | 以 HTML 形式呈现的笔记内容——必需 |
  | `{{tags}}` | 以 `<nav>` 形式呈现的标签树；导出标签时必需，否则为空 |
  | `{{pagetags}}` | 笔记的标签，以链接到各自页面的 `#标签小标签` 形式呈现 |
  | `{{title}}` | 页面名称的纯文本形式，用于 `<title>` |
  | `{{site}}` | 所导出文件夹的名称 |
  | `{{description}}` | 首段的纯文本内容，用于 `<meta name="description">` |
  | `{{width}}` | `full` 或 `column`，取决于文本宽度设置 |
  | `{{root}}` | 根据页面所在文件夹层级为 `../`，因此 `{{root}}style.css` 能指向根目录 |
  | `{{styles}}` | 样式表：单页网站中是指向 `style.css` 的 `<link>`，在单一页面中则是完整的 `<style>` |
  | `{{script}}` | 脚本：网站中是指向 `site.js` 的 `<script src>`，在单一页面中则是完整的 `<script>` |
  | `{{theme}}` | 亮色／暗色切换按钮 |
  | `{{path}}` | 笔记的路径，如 `docs/Note.md` |
  | `{{lang}}` | 界面语言，用于 `<html lang>` |

  无论模板是否使用它们，网站的根目录都会得到 `style.css`、`site.js` 和 `search.js`；单一页面
  则把样式表和脚本带在内部，只有当其模板是在引入 `{{styles}}` 之前保存、仍然链接着一个
  `style.css` 时，才会在旁边得到一个 `style.css`。默认样式表会把笔记呈现为编辑器阅读视图的样
  子，并从 `<html data-width="{{width}}">` 读取宽度。导出流程不认识的占位符会被原样保留。在
  新占位符出现之前保存的模板不会使用它：**恢复默认** 可以把它引入进来。

## 隐私和安全

- **页面不会访问任何东西。** 文件中的内容安全策略（Content-Security-Policy）只允许其代码获
  取同一服务器上、与之相邻的文件（`connect-src 'self'`，针对配合 `index.json` 提供服务的文
  件夹），并且不向任何地方提交表单。如果策略缺失，或者出现了外部引用，构建就会失败。PWA 版
  本的策略则额外允许其清单文件和 Service Worker，两者都来自其自身的源。
- **笔记中的脚本永远不会运行。** 笔记可以包含 HTML——文字颜色正是这样实现的——因此该策略只
  允许一个脚本，即编辑器自身的脚本，通过其哈希值加以识别：笔记中 `<img>` 上的 `onerror`，或
  者笔记中的 `<script>`，都不会产生任何效果。
- **笔记在网络上链接到的内容，会从那里加载**：带有 `https://` 地址的图片、视频或嵌入框架，
  就像在任何 Markdown 查看器中一样——这是笔记自身的选择，而非编辑器的选择。此类请求不会携带
  `Referer`。
- **文件始终留在你的磁盘上。** 笔记通过 File System Access API 被原地读取和写入；被记住的文
  件夹是浏览器 IndexedDB 中的句柄，绝不是路径或内容本身。
- 扩展程序的权限：参见“[Markdown Knowledge Base](#markdown-knowledge-base-chrome-扩展程序)”。

## 功能

- **文件树**：可折叠的文件夹，按名称过滤，通过右键菜单新建、重命名和删除，面板可调整宽度，
  面板可隐藏（`⌘\`）。
- **格式化选中内容**：标题 H1–H3、粗体、斜体、删除线、等宽、`==…==` 高亮、文字和背景颜色、
  链接、`[[wiki 链接]]`、列表、任务清单、引用、代码块、表格、分隔线。
- **标记语法**：CommonMark 加上表格、带可点击复选框的任务清单、`==高亮==`、`[[wiki 链
  接]]`、前言、针对 19 种语言的语法高亮，以及来自文件夹的图片。
- **图片**：`![alt](assets/Note/image-1.png)` 会按相对于笔记所在文件夹的路径显示图片。
  Obsidian 风格的 `![[assets/Note/image-1.png]]` 同样有效，路径可以相对于笔记所在文件夹，也
  可以相对于根目录（`![[…|300]]` 用于设置宽度）。只带裸名称的旧式嵌入 `![[image-1.png]]`，
  会在设置中的图片文件夹里查找，分别尝试带上和不带笔记子文件夹的情况，即 `assets/<笔记
  名>/`、笔记旁边，然后像 Obsidian 一样按名称在文件夹中的任意位置查找。图片文件夹在文件树中
  默认折叠。重命名笔记时，其图片文件夹也会一并重命名，笔记中以两种形式指向其图片的链接也会
  更新为新路径。在文件树中点击一张图片会以图片形式打开，而不是以文本形式。
- **添加图片**：工具栏上的图片按钮用于选取图片文件；用 `⌘V` 粘贴图片——截图、在浏览器中复
  制的图片、在文件管理器中复制的文件——也以同样的方式加入。两者都会被保存到笔记旁边的图片文
  件夹中（默认是 `assets/<笔记名>/`），并以普通 Markdown 形式按其路径插入，如
  `![image-1](assets/<笔记名>/image-1.png)`，任何编辑器都能显示（路径中的空格会写作
  `%20`）：插入位置在光标处，若当前没有打开任何块，则插入在笔记末尾。拖放到笔记上的图片会在
  放下的位置插入：在某个块或表格单元格内的那个点，或者在文字旁边、两个块之间——插入在上方块
  的末尾；在阅读模式下拖放会切换到编辑模式，拖放到笔记之外则会把图片添加到末尾。如果拖放的
  内容中包含文件夹，仍然会打开该文件夹。粘贴的截图依次命名为 `image-1.png`、`image-2.png`
  等；选取的文件保留自己的原名，如果重名则加上数字。从电子表格复制的单元格会以文本形式粘
  贴，而不是随之而来的图片。只有以可写方式打开的文件夹才能接收新图片。
- **标签**：笔记上的嵌套标签、标签树以及每个标签对应的页面，与笔记本身分开保存在
  `.meta.json` 中——参见“[标签](#标签)”。
- **导出为 HTML**：将文件夹或其中某个子文件夹导出为带搜索功能的静态网站，或导出为单独一个
  页面——参见“[导出为 HTML](#导出为-html)”。
- **单篇笔记**：可以从 Finder 或资源管理器在已安装的应用中打开，也可以拖放到窗口上——参见
  “[单篇笔记](#单篇笔记)”。
- **Markdown Knowledge Base**：通过 Send to Markdown，把 Chrome 中选中的内容发送到默认笔
  记，或发送到你选择的笔记；页面、链接或图片也可以发送到笔记中——参见
  “[Markdown Knowledge Base](#markdown-knowledge-base-chrome-扩展程序)”。
- **设置**（右上角、搜索旁边的齿轮图标）：界面语言、主题（跟随系统、浅色、深色）、
  50%–200% 的缩放、文本宽度（居中栏或全宽）、是否将笔记名称显示为标题，以及新增图片的去
  向：笔记旁边的图片文件夹（默认是 `assets`），以及是否为每篇笔记在其中建立专属子文件夹；如
  果不建立，所有图片就直接放入该文件夹。底部是版本号——在已安装的应用中，还有检查更新的入
  口，以及是否自动安装更新的选项。
- **语言**：英语以及另外 16 种语言——中文、हिन्दी、Español、Français、العربية、বাংলা、
  Português、Русский、اردو、Bahasa Indonesia、Deutsch、日本語、Türkçe、한국어、
  Italiano、Українська。默认情况下，界面会跟随浏览器的语言。在阿拉伯语和乌尔都语中，界面外
  框会从右到左镜像显示；笔记本身仍保持其自身的文字方向。
- **手机**：在宽度小于 720 像素的屏幕上，文件面板会滑动覆盖在笔记之上——☰ 打开它，选中一篇
  笔记或在其旁边点击一下即可关闭——工具栏会收进一行；格式选项只有在编辑模式下才会占用第二
  行。导出功能在此处被略去。在触摸屏上，输入框至少有 16 像素高，这样 iOS 就不会放大它们，文
  件树的行高也更高。桌面布局及其被记住的面板宽度不受影响。
- 编辑后一秒自动保存，支持撤销和重做，以及在笔记内搜索。
- 语言、主题、缩放、文本宽度、面板宽度、标签面板高度以及最后打开的笔记都会被记住。

## 键盘快捷键

| 操作 | 按键 |
| --- | --- |
| 阅读 / 编辑模式 | `⌘E` |
| 保存 | `⌘S` |
| 在笔记内搜索 | `⌘F` |
| 文件面板 | `⌘\` |
| 缩放 | `⌘+` · `⌘−` · `⌘0` |
| 粗体 · 斜体 · 链接 | `⌘B` · `⌘I` · `⌘K` |
| 等宽 · 高亮 · wiki 链接 | `⌘⇧C` · `⌘⇧H` · `⌘⇧K` |
| 标题 1–6 · 正文 | `⌘⌥1`…`⌘⌥6` · `⌘⌥0` |
| 撤销 · 重做 | `⌘Z` · `⌘⇧Z` |
| 列表缩进 | `Tab` · `⇧Tab` |
| 离开该块 | `Esc` |

## 翻译

英文文本保留在代码中：`t('tree', 'Delete')`、`tn('status', '{count} word', '{count}
words', n)`，以及模板中的 `data-i18n="context"` / `data-i18n-attr="context"`。第一个参数是
上下文（context）——即该字符串在界面中所属的部分，因此同一个英文单词在两个不同的地方可以被
翻译成不同的内容。一份字典文件 `src/locales/<code>.json` 把“上下文 → 英文文本”映射到译文：

```json
{
  "tree": { "Delete": "Удалить" },
  "status": { "{count} words": { "one": "{count} слово", "few": "{count} слова", "many": "{count} слов", "other": "{count} слова" } }
}
```

字典中缺失的字符串会以英文显示。带有数字的文本，会按照该语言的每个复数类别各提供一种形式
（`Intl.PluralRules`），以英文的复数形式作为键。`npm run i18n` 会按语言列出尚未翻译的字符
串，以及不再使用的字符串；`npm test` 会检查每条译文是否保留了英文中的占位符，以及是否包含了
全部复数形式。

Chrome 为扩展程序本身显示的内容——名称和描述、工具栏按钮的标题——通过 `chrome.i18n` 跟随浏
览器的语言，而不是侧边栏的语言。这些文本就是 `src/extension/manifest.json` 中的英文文本，在
同一套字典中以 `manifest` 作为上下文进行翻译；构建流程会把它们写入
`_locales/<code>/messages.json`，并把 `__MSG_appName__` 之类的占位符放进清单文件。Chrome 有
自己的一套语言代码，其余的则会被忽略：`pt` 会变成 `pt_BR` 和 `pt_PT`，`zh` 会变成 `zh_CN`，
乌尔都语则没有对应代码，因此在那种情况下 Chrome 会用英文描述扩展程序。如果名称超过 75 个字
符，或描述超过 132 个字符，构建就会失败。右键菜单在侧边栏曾被打开之后会使用侧边栏的语言，在
此之前则使用浏览器的语言。

这份 README 同样有译文：`docs/readme/README.<code>.md`，每种语言一份，每份文件顶部都有语言
列表。这里的改动也应当同步到各语言译文中。

## 构建

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

`build.mjs` 使用 esbuild 把 `src/main.ts` 打包成一个 IIFE，并将其与样式和图标（一个 data
URI）一起替换进 `src/template.html`；导出功能所用的模板和样式表则作为字符串打包进去。模板的
内容安全策略会写入这一个脚本的哈希值。最终结果是 `build/macaed.html`，大约 640 KB。只要其中
留有哪怕一个外部引用，构建就会失败。

同一次运行还会写出 `build/pages/`：将那个页面做成一个可安装的 PWA——带有清单链接和
`<meta name="service-worker">`（用来告诉页面注册其 Service Worker）的 `index.html`、
`manifest.webmanifest`、各个图标，以及用来缓存页面以便离线打开的 `sw.js`。`build/macaed.html`
本身依旧是一个不含任何外部引用的单一文件。

还有 `build/extension/`：`panel.html`——模板本身，其脚本位于 `panel.js`——`popup.html`
（带有该页面的样式和 `popup.css`）及 `popup.js`、`background.js`、`offscreen.html` 和
`offscreen.js`、各个图标、`_locales/` 以及 `manifest.json`，其版本号取自 `package.json`。
`build/macaed-extension-<version>.zip` 包含同样的文件，并带有固定的日期：相同的源码总是产生
相同的字节。

浏览器测试会启动本地 Chrome（可用 `CHROME=/path/to/chrome` 指定具体位置），并通过 DevTools
协议与其通信，不依赖任何其他组件；如果没有 Chrome，这些测试会被跳过。
`tools/test-extension.mjs` 通过该协议加载扩展程序（通过管道调用 `Extensions.loadUnpacked`；
`--load-extension` 自 Chrome 137 版起已被移除），在侧边栏中打开一个文件夹，并向它发送来自本
地服务器上测试网站的页面、选中内容、链接和图片；随后按钮的窗口会通过侧边栏以及独立地，把选
中内容添加到默认笔记和指定笔记中，并在知识库关闭的情况下，把内容暂存给侧边栏，或自行打开
它；在没有侧边栏打开的情况下，菜单会添加到默认笔记，或者把内容暂存起来。右键菜单
无法从 DevTools 中点击，因此测试会自行触发后台工作进程的 `onClicked`，并把按钮的窗口作为一个
独立页面打开，告知它旁边是哪一个标签页；由于没有真实的点击，Chrome 不会授予 `activeTab`，因
此被测试的这一份扩展程序可能需要把测试网站 `*.test` 作为主机权限才能访问。

## 版本和发布

版本号只写在一个地方：`package.json`。构建流程会把它写入页面（起始界面下方的那一行、设置底
部）、扩展程序的 `manifest.json`，以及 PWA 的缓存名称。对打了 `v<version>` 标签的提交进行构
建时，版本号会原样显示；其他任何情况都会附加上提交号，如 `0.11.0+1a2b3c4`，这样来自 GitHub
Pages 上 `main` 分支的页面就不会被误认为是正式发布版本。Chrome 的 `version` 字段只能包含数
字，因此在那里提交号会被放进 `version_name`。

```sh
npm version minor           # 0.11.0 -> 0.12.0: package.json, package-lock.json, a commit and the tag v0.12.0
git push --follow-tags      # the tag starts .github/workflows/release.yml
```

如果标签与 `package.json` 不一致，发布工作流会中止；否则它会运行测试，然后附上
`macaed-<tag>.html`、`macaed-extension-<tag>.zip` 和 `SHA256SUMS.txt`。

## GitHub Pages

`.github/workflows/pages.yml` 会在每次推送到 `main` 时进行构建和测试，并把 `build/pages/`
部署到 GitHub Pages（Settings → Pages → Source: GitHub Actions），地址为
<https://marketkernel.github.io/markdown-catalog-editor/>。在 Chrome、Edge 和 Arc 中，地址栏
中的安装按钮可以把它变成一个独立的应用窗口；在 iOS 上则是“分享”→“添加到主屏幕”。文件夹的打
开方式与单文件版本相同。

**离线使用。** 一旦打开过，编辑器就可以在没有网络连接的情况下工作：Service Worker 会把页
面、清单文件和图标保存在一个以版本号命名的缓存中，并从那里提供页面。笔记内容从不经过它——笔
记在你自己的磁盘上。

**更新。** 每次部署都会改变 `sw.js`，因此浏览器会自行发现新的 Service Worker——在有网络连
接的情况下启动时、应用保持打开状态期间每隔几个小时、网络连接恢复时，或者通过设置中的“检查
更新”主动询问时。新的 Service Worker 会把自己的版本下载到专属的缓存中并等待；正在运行的那
个会继续提供旧页面，离线时也是如此，因此不会在你手中发生任何变化。此时设置（其按钮上会出现
一个小圆点）和起始界面会显示“版本 … 已就绪。更新”：点击“更新”会保存当前打开的笔记（如果
无法保存则会先询问），让新的 Service Worker 接管并重新加载页面，页面会提示一次已完成更新；
旧的缓存会被删除。如果不点击该按钮，新版本会在应用的所有窗口都关闭后自行启动——或者，如果
在设置中勾选了“当所有内容已保存且应用在后台运行时，自动安装更新”，只要没有未保存的内容且窗
口不在可见范围内，新版本就会立即启动。

这也是其中的取舍：已安装的 PWA 始终运行最近一次部署的内容，而下载下来的文件则会保持原有的
版本不变。如果需要一个固定在磁盘上的版本，可以从某个发布版本中获取 `macaed-<tag>.html`，并
用 `SHA256SUMS.txt` 进行校验。

**打开一个 `.md` 文件。** 清单（manifest）把 Markdown 文件列为该应用可以打开的文件类型
（`file_handlers`），并让它们只出现在一个窗口中（`launch_handler`，`focus-existing`）：参见
“[单篇笔记](#单篇笔记)”。页面会在其启动流程——重新打开上次的文件夹——结束后，通过
`launchQueue` 接收这些文件，因此文件夹不会取代笔记；如果文件是在导出过程中或对话框打开时到
达的，会等到你再次打开它。

已安装的应用会请求浏览器保留其存储空间（`navigator.storage.persist()`）：否则在磁盘空间不
足时，离线副本和被记住的文件夹都可能被一并清除。

`npm run test:browser` 也会打开 `build/pages/`（`tools/test-pwa.mjs`）：Service Worker 接管
页面，Chrome 认为该清单可以安装，即使服务器关闭，页面依然能加载；随后依次测试检查更新无结
果、无网络连接，以及一次新的部署——该部署会一直等待，直到“更新”把它放行。无头 Chrome 不会
向应用传递真实文件，因此一个替代的 `launchQueue` 会给页面一个真实的文件句柄：笔记会单独打
开，而编辑会被保存进去。

## 布局

```
src/template.html   markup with the __STYLES__/__APP__/__ICON__ placeholders and the CSP
src/styles.css      palette, light and dark themes, block paired with its source
src/main.ts         opening a folder, saving, toolbar, search, settings
src/vault.ts        File System Access API, drag-and-drop, webkitdirectory; file CRUD; a note on its own
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
                    formatting, tags, the export, clippings, dictionaries; in headless Chrome
                    the editor, HTML → Markdown, the PWA and the extension
assets/             icon.svg; pwa/ its PNG sizes for the PWA; extension/ the extension's icons
docs/               the README screenshot and its translations, docs/readme/
build/macaed.html   the build output
build/pages/        the PWA for GitHub Pages
build/extension/    the Chrome extension, and build/macaed-extension-<version>.zip of it
```

## 限制

- 不支持协作编辑、插件、同步和链接关系图。
- 在手机上，布局是为阅读而设计的：文件树的右键菜单需要长按触发，而 iOS 不会把普通的触摸转
  换成长按；表格的扩展操作栏则是在悬停时才会出现。
- 只有基于 Chromium 的浏览器才能写入文件。
- 该扩展程序面向 Chrome（以及基于它构建、带有侧边栏的浏览器，例如 Edge）；目前尚未上架
  Chrome 网上应用店。它会把图片留在网络上，而不是下载到文件夹中：那样做将需要访问每一个网站
  的权限。

## 许可证

MIT —— 参见 [LICENSE](../../LICENSE)。
