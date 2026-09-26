/**
 * Bundles src/ into ONE self-contained build/macaed.html.
 *
 * Styles, markdown-it, highlight.js, the icon and the compiled TypeScript are
 * all inlined, so the result opens from a file:// URL with no network access
 * and no sibling files.
 *
 * Beside it goes build/pages/: the same page as an installable PWA for GitHub
 * Pages — a manifest, icons and a service worker that keeps it offline.
 */
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const at = (...parts) => join(root, ...parts);
const watch = process.argv.includes('--watch');
const outFile = at('build', 'macaed.html');

/** `</script` inside a string literal would close the inline tag early. */
const guard = (code) => code.replace(/<\/(script|style)/gi, '<\\/$1');

async function bundleApp() {
  const result = await build({
    entryPoints: [at('src/main.ts')],
    bundle: true,
    // The export's page template and stylesheet ride along as strings.
    loader: { '.html': 'text', '.css': 'text' },
    format: 'iife',
    target: ['es2022'],
    platform: 'browser',
    minify: !watch,
    sourcemap: false,
    legalComments: 'none',
    charset: 'utf8',
    write: false,
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
}

const PWA_ICONS = ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

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
    "<script>if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js'));</script>",
  ].join('\n');
  const page = html.replace('</head>', () => `${head}\n</head>`);
  const version = createHash('sha256').update(page).digest('hex').slice(0, 12);

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
  const worker = (await readFile(at('src/sw.js'), 'utf8')).replaceAll('__VERSION__', version);
  await Promise.all([
    writeFile(join(dir, 'index.html'), page, 'utf8'),
    writeFile(join(dir, 'sw.js'), worker, 'utf8'),
    writeFile(join(dir, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    // Without it Pages runs the files through Jekyll, which is only wasted time here.
    writeFile(join(dir, '.nojekyll'), '', 'utf8'),
    ...PWA_ICONS.map((name) => copyFile(at('vendor', name), join(dir, name))),
  ]);
  console.log(`build/pages/ — PWA for GitHub Pages (cache ${version})`);
}

async function buildOnce() {
  const [template, styles, icon, appJs] = await Promise.all([
    readFile(at('src/template.html'), 'utf8'),
    readFile(at('src/styles.css'), 'utf8'),
    readFile(at('vendor/icon.svg'), 'utf8'),
    bundleApp(),
  ]);

  const svg = icon.replace(/<\?xml[\s\S]*?\?>/, '').trim();
  const iconUri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;

  assertScriptCloses(guard(appJs));
  const html = template
    .replace('/*__STYLES__*/', () => styles)
    .replace('/*__APP__*/', () => guard(appJs))
    .replaceAll('__ICON__', () => iconUri);

  assertSelfContained(html);

  await mkdir(at('build'), { recursive: true });
  await writeFile(outFile, html, 'utf8');
  const kb = (n) => (n / 1024).toFixed(1);
  console.log(
    `build/macaed.html — ${kb(Buffer.byteLength(html, 'utf8'))} KB ` +
      `(code ${kb(appJs.length)} KB, styles ${kb(styles.length)} KB)`,
  );
  await buildPages(html);
}

await buildOnce();

if (watch) {
  const { watch: watchDir } = await import('node:fs');
  let pending = null;
  for (const dir of ['src', 'vendor']) {
    watchDir(at(dir), { recursive: true }, () => {
      clearTimeout(pending);
      pending = setTimeout(() => buildOnce().catch((error) => console.error(error.message)), 120);
    });
  }
  console.log('watching src/ and vendor/ …');
}
