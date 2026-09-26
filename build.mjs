/**
 * Bundles src/ into ONE self-contained build/macaed.html.
 *
 * Styles, markdown-it, highlight.js, the icon and the compiled TypeScript are
 * all inlined, so the result opens from a file:// URL with no network access
 * and no sibling files.
 */
import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
