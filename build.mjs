/**
 * Bundles src/ into ONE self-contained build/macaed.html.
 *
 * Styles, markdown-it, highlight.js, the icon and the compiled TypeScript are
 * all inlined, so the result opens from a file:// URL with no network access
 * and no sibling files.
 *
 * Beside it goes build/pages/: the same page as an installable PWA for GitHub
 * Pages — a manifest, icons and a service worker that keeps it offline and
 * brings a new version in when the user says so.
 *
 * And build/extension/: "Send to Markdown", the Chrome extension — the same
 * page as its side panel and a service worker that takes a web page, a
 * selection, a link or an image to it; zipped for the Chrome Web Store as
 * build/macaed-extension-<version>.zip.
 *
 * The version is package.json's and nowhere else: the page shows it, the
 * extension's manifest has it, the PWA's cache is named after it.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { dictionaries, MANIFEST_TEXTS, manifestText } from './tools/i18n.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const at = (...parts) => join(root, ...parts);
const watch = process.argv.includes('--watch');
const outFile = at('build', 'macaed.html');

/**
 * package.json's version, x.y.z, as Chrome's manifest takes it, and the one the
 * page shows: the same for a build of the commit tagged v<version>, with the
 * commit added for any other — 0.12.0+1a2b3c4 — so a page built from main is
 * not taken for the release.
 */
async function readRelease() {
  const { version } = JSON.parse(await readFile(at('package.json'), 'utf8'));
  const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!parts || parts.slice(1).some((n) => Number(n) > 65535)) throw new Error(`package.json: the version must be x.y.z, each up to 65535, not ${version}`);
  const git = (...args) => {
    try {
      return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  // The release workflow names the tag it builds; a checkout of a tag may not list it.
  const tagged = process.env.RELEASE_TAG === `v${version}` || git('tag', '--points-at', 'HEAD').split('\n').includes(`v${version}`);
  const commit = tagged ? '' : git('rev-parse', '--short', 'HEAD');
  return { version, label: commit ? `${version}+${commit}` : version };
}

/** Set by buildOnce() before anything is bundled. */
let release;

/** `</script` inside a string literal would close the inline tag early. */
const guard = (code) => code.replace(/<\/(script|style)/gi, '<\\/$1');

/** The extension's side panel: src/extension/extension.ts takes the place of src/platform.ts. */
const extensionPlatform = {
  name: 'extension-platform',
  setup(builder) {
    builder.onResolve({ filter: /^\.\/platform$/ }, () => ({ path: at('src/extension/extension.ts') }));
  },
};

async function bundle(entry, { format = 'iife', plugins = [] } = {}) {
  const result = await build({
    entryPoints: [at(entry)],
    bundle: true,
    // The export's page template and stylesheet ride along as strings.
    loader: { '.html': 'text', '.css': 'text' },
    format,
    target: ['es2022'],
    platform: 'browser',
    minify: !watch,
    sourcemap: false,
    legalComments: 'none',
    charset: 'utf8',
    define: { __APP_VERSION__: JSON.stringify(release.label) },
    write: false,
    plugins,
  });
  const output = result.outputFiles[0];
  if (!output) throw new Error('esbuild returned an empty result');
  return output.text;
}

/**
 * Inside an inline <script>, `<!--` followed by `<script` — with no `-->`
 * between — puts the HTML parser in its "double escaped" state: the closing
 * </script> no longer ends the script, and the page runs none of it.
 */
function assertScriptCloses(code) {
  for (let at = code.indexOf('<!--'); at >= 0; at = code.indexOf('<!--', at + 4)) {
    const close = code.indexOf('-->', at + 4);
    const script = code.slice(at + 4).search(/<script/i);
    if (script >= 0 && (close < 0 || at + 4 + script < close)) {
      throw new Error(`"<!--" followed by "<script" in the bundle would break the page: …${code.slice(Math.max(0, at - 40), at + 40)}…`);
    }
  }
}

/** The whole point of the build: nothing may be fetched at runtime. */
function assertSelfContained(html) {
  const offenders = [
    // The export writes its own `<link href="${root}style.css">` and `<script src="${root}site.js">`
    // into the pages it makes; inside the bundle their quotes may come escaped.
    [/<script[^>]+\ssrc=(?!\\?["']?(?:\{\{|\$\{))/i, '<script src=…>'],
    [/<link[^>]+href=(?!\\?["']?(?:data:|\{\{|\$\{))/i, '<link href=…>'],
    [/@import\s+(url\()?["']?(?!data:)/i, '@import'],
    [/url\(\s*["']?https?:/i, 'url(http…)'],
  ];
  for (const [pattern, name] of offenders) {
    if (pattern.test(html)) throw new Error(`An external reference is left in the file: ${name}`);
  }
  if (!html.includes('http-equiv="Content-Security-Policy"')) {
    throw new Error('The Content-Security-Policy meta tag is missing');
  }
}

const CSP = /(http-equiv="Content-Security-Policy" content=")([^"]*)/;

/** Rewrites the page's Content-Security-Policy, directive by directive. */
function editPolicy(html, edit) {
  if (!CSP.test(html)) throw new Error('The Content-Security-Policy meta tag is missing');
  return html.replace(CSP, (_, attr, policy) => {
    const directives = new Map(policy.split(';').map((d) => d.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources]));
    edit(directives);
    return attr + [...directives].map(([name, sources]) => [name, ...sources].join(' ')).join('; ');
  });
}

/**
 * The template allows inline scripts; the page has exactly one, the app, and
 * its hash takes their place. A script in a note's raw HTML — an onerror on an
 * <img>, say — then never runs.
 */
function pinScript(html, code) {
  const hash = createHash('sha256').update(code, 'utf8').digest('base64');
  return editPolicy(html, (directives) => {
    if (directives.get('script-src')?.join(' ') !== "'unsafe-inline'") throw new Error("The Content-Security-Policy must say script-src 'unsafe-inline', for the build to replace");
    directives.set('script-src', [`'sha256-${hash}'`]);
  });
}

/** Under assets/; each goes to build/pages/ under its own name. */
const PWA_ICONS = ['icon.svg', 'pwa/icon-192.png', 'pwa/icon-512.png', 'pwa/icon-maskable-512.png', 'pwa/apple-touch-icon.png'];

/** The installed app needs its manifest and its service worker, both from its own origin. */
const allowPwa = (html) =>
  editPolicy(html, (directives) => {
    directives.set('manifest-src', ["'self'"]);
    directives.set('worker-src', ["'self'"]);
  });

/**
 * build/pages/: the page plus what makes it installable. Every path is
 * relative, so it works under a project site's /<repo>/ prefix.
 */
async function buildPages(html) {
  const dir = at('build', 'pages');
  const head = [
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
    '<meta name="theme-color" content="#fbfbfa" media="(prefers-color-scheme: light)">',
    '<meta name="theme-color" content="#17181c" media="(prefers-color-scheme: dark)">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
    // The page registers the worker itself (update.ts): this is how it knows it is the PWA.
    '<meta name="service-worker" content="sw.js">',
  ].join('\n');
  const page = allowPwa(html).replace('</head>', () => `${head}\n</head>`);
  // A deploy between two releases changes the page, not the version: the hash tells them apart.
  const cache = `${release.version}-${createHash('sha256').update(page).digest('hex').slice(0, 12)}`;

  const manifest = {
    name: 'Markdown Catalog Editor',
    short_name: 'Notes',
    description: 'A Markdown editor for a local folder of notes',
    id: './',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#fbfbfa',
    theme_color: '#6c4ee6',
    icons: [
      { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const worker = (await readFile(at('src/pwa/sw.js'), 'utf8')).replaceAll('__CACHE__', cache).replaceAll('__VERSION__', release.label);
  await Promise.all([
    writeFile(join(dir, 'index.html'), page, 'utf8'),
    writeFile(join(dir, 'sw.js'), worker, 'utf8'),
    writeFile(join(dir, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    // Without it Pages runs the files through Jekyll, which is only wasted time here.
    writeFile(join(dir, '.nojekyll'), '', 'utf8'),
    ...PWA_ICONS.map((path) => copyFile(at('assets', path), join(dir, basename(path)))),
  ]);
  console.log(`build/pages/ — PWA for GitHub Pages (cache ${cache})`);
}

/**
 * A .zip as the Chrome Web Store takes it. Every entry has the same date, so
 * the same files make the same bytes, and the same SHA256SUMS line.
 */
function zip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  // 1 January 1980, 00:00: the first date a .zip can hold.
  const DOS_DATE = (0 << 9) | (1 << 5) | 1;
  for (const [name, data] of files) {
    const path = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const fields = (header) => {
      header.writeUInt16LE(20, 4 + (header.length === 46 ? 2 : 0));
      const at0 = header.length === 46 ? 8 : 6;
      header.writeUInt16LE(0x0800, at0);
      header.writeUInt16LE(8, at0 + 2);
      header.writeUInt16LE(0, at0 + 4);
      header.writeUInt16LE(DOS_DATE, at0 + 6);
      header.writeUInt32LE(crc32(data), at0 + 8);
      header.writeUInt32LE(packed.length, at0 + 12);
      header.writeUInt32LE(data.length, at0 + 16);
      header.writeUInt16LE(path.length, at0 + 20);
    };
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    fields(head);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    fields(entry);
    entry.writeUInt32LE(offset, 42);
    local.push(head, path, packed);
    central.push(entry, path);
    offset += head.length + path.length + packed.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

const EXTENSION_ICONS = ['icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png'];

/**
 * The same checks as for the single file, and those an extension adds: no
 * script in a page (Manifest V3 runs only its own files), a policy that keeps
 * the extension's pages off the network, and no standing access to websites.
 */
function assertExtension(files, manifest) {
  for (const [name, text] of files) {
    if (!name.endsWith('.html')) continue;
    for (const [pattern, what] of [
      [/<script(?![^>]*\ssrc="[\w-]+\.js")[^>]*>/i, 'an inline <script>'],
      [/<link[^>]+href=(?!\\?["']?(?:data:|\{\{|\$\{))/i, '<link href=…>'],
      [/url\(\s*["']?https?:/i, 'url(http…)'],
      [/\s(src|href)=["']?(https?:)?\/\//i, 'an address elsewhere'],
    ]) {
      if (pattern.test(text)) throw new Error(`${name} has ${what}`);
    }
  }
  const policy = manifest.content_security_policy?.extension_pages ?? '';
  if (!/(^|;)\s*connect-src 'none'/.test(policy)) throw new Error("manifest.json: the pages' policy must have connect-src 'none'");
  if (manifest.host_permissions || manifest.optional_host_permissions || manifest.content_scripts || manifest.externally_connectable) {
    throw new Error('manifest.json: no host permissions, content scripts or external connections — activeTab only');
  }
}

/**
 * Chrome's codes for the dictionaries in src/locales. Chrome ignores a code not
 * on its list (developer.chrome.com/docs/extensions/reference/api/i18n): pt and
 * zh are pt_BR and zh_CN there, the Brazilian text serves Portugal as well, and
 * Urdu has none, so Chrome shows the extension's name in English — the panel
 * itself still speaks Urdu.
 */
const CHROME_LOCALES = {
  ar: ['ar'], bn: ['bn'], de: ['de'], es: ['es'], fr: ['fr'], hi: ['hi'], id: ['id'], it: ['it'], ja: ['ja'], ko: ['ko'],
  pt: ['pt_BR', 'pt_PT'], ru: ['ru'], tr: ['tr'], uk: ['uk'], ur: [], zh: ['zh_CN'],
};

/**
 * What Chrome shows of the extension itself — its name, description, the
 * toolbar button's title — follows the browser's language, through chrome.i18n:
 * the manifest says __MSG_appName__ and _locales/<code>/messages.json has the
 * text. They are made from the same dictionaries as the page, context
 * "manifest"; English, the default, from the manifest itself.
 */
function localizeManifest(source, dictionaries) {
  const messagesOf = (translate) => {
    const messages = {};
    for (const { message, path, max } of MANIFEST_TEXTS) {
      const text = translate(manifestText(source, path));
      if (!text) continue;
      if (text.includes('$')) throw new Error(`manifest: "${text}" — chrome.i18n takes $ for a placeholder`);
      if (max && text.length > max) throw new Error(`manifest: "${text}" is longer than Chrome's ${max} characters`);
      messages[message] = { message: text };
    }
    return `${JSON.stringify(messages, null, 2)}\n`;
  };
  const locales = new Map([['_locales/en/messages.json', messagesOf((text) => text)]]);
  for (const [code, dictionary] of Object.entries(dictionaries)) {
    const codes = CHROME_LOCALES[code];
    if (!codes) throw new Error(`src/locales/${code}.json: CHROME_LOCALES in build.mjs has no Chrome code for it`);
    const messages = messagesOf((text) => dictionary.manifest?.[text]);
    for (const chrome of codes) locales.set(`_locales/${chrome}/messages.json`, messages);
  }

  const manifest = structuredClone(source);
  for (const { message, path } of MANIFEST_TEXTS) {
    const parent = path.slice(0, -1).reduce((value, key) => value[key], manifest);
    parent[path.at(-1)] = `__MSG_${message}__`;
  }
  manifest.default_locale = 'en';
  return { manifest, locales };
}

/** build/extension/: the side panel is the page itself, its script a file of its own, as Manifest V3 wants. */
async function buildExtension(template, styles, iconUri) {
  const dir = at('build', 'extension');
  const [manifestSource, texts, panelJs, backgroundJs] = await Promise.all([
    readFile(at('src/extension/manifest.json'), 'utf8').then(JSON.parse),
    dictionaries(),
    bundle('src/main.ts', { plugins: [extensionPlatform] }),
    bundle('src/extension/background.ts', { format: 'esm' }),
  ]);
  // Chrome's version is numbers only; the one with the commit goes where Chrome shows it.
  const { manifest, locales } = localizeManifest({ ...manifestSource, version: release.version }, texts);
  if (release.label !== release.version) manifest.version_name = release.label;
  const panel = editPolicy(template, (directives) => directives.set('script-src', ["'self'"]))
    .replace('/*__STYLES__*/', () => styles)
    .replace('<script>/*__APP__*/</script>', '<script src="panel.js"></script>')
    .replaceAll('__ICON__', () => iconUri);

  const files = new Map([
    ['manifest.json', `${JSON.stringify(manifest, null, 2)}\n`],
    ['panel.html', panel],
    ['panel.js', panelJs],
    ['background.js', backgroundJs],
    ...locales,
  ]);
  assertExtension(files, manifest);
  for (const name of EXTENSION_ICONS) files.set(name, await readFile(at('assets', 'extension', name)));

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const name of files.keys()) await mkdir(dirname(join(dir, name)), { recursive: true });
  await Promise.all([...files].map(([name, data]) => writeFile(join(dir, name), data)));
  const archive = zip([...files].map(([name, data]) => [name, Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')]));
  const zipName = `macaed-extension-${release.version}.zip`;
  // One zip in build/, of this version: a release takes whatever matches the name.
  for (const name of await readdir(at('build'))) if (/^macaed-extension-.*\.zip$/.test(name)) await rm(at('build', name));
  await writeFile(at('build', zipName), archive);
  const kb = (n) => (n / 1024).toFixed(1);
  console.log(`build/extension/ — Chrome extension ${release.label}, build/${zipName} ${kb(archive.length)} KB`);
}

async function buildOnce() {
  release = await readRelease();
  const [template, styles, icon, appJs] = await Promise.all([
    readFile(at('src/template.html'), 'utf8'),
    readFile(at('src/styles.css'), 'utf8'),
    readFile(at('assets/icon.svg'), 'utf8'),
    bundle('src/main.ts'),
  ]);

  const svg = icon.replace(/<\?xml[\s\S]*?\?>/, '').trim();
  const iconUri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;

  const code = guard(appJs);
  assertScriptCloses(code);
  const html = pinScript(template, code)
    .replace('/*__STYLES__*/', () => styles)
    .replace('/*__APP__*/', () => code)
    .replaceAll('__ICON__', () => iconUri);

  assertSelfContained(html);

  await mkdir(at('build'), { recursive: true });
  await writeFile(outFile, html, 'utf8');
  const kb = (n) => (n / 1024).toFixed(1);
  console.log(
    `build/macaed.html ${release.label} — ${kb(Buffer.byteLength(html, 'utf8'))} KB ` +
      `(code ${kb(appJs.length)} KB, styles ${kb(styles.length)} KB)`,
  );
  await buildPages(html);
  await buildExtension(template, styles, iconUri);
}

await buildOnce();

if (watch) {
  const { watch: watchDir } = await import('node:fs');
  let pending = null;
  for (const dir of ['src', 'assets']) {
    watchDir(at(dir), { recursive: true }, () => {
      clearTimeout(pending);
      pending = setTimeout(() => buildOnce().catch((error) => console.error(error.message)), 120);
    });
  }
  console.log('watching src/ and assets/ …');
}
