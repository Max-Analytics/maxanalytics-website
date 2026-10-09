/*
 * build.mjs — builds the deployable site into dist/. Firebase serves and deploys dist/, never the repo root.
 *
 * Copies every site file to dist/ (skipping the tooling and repo files listed in SKIP), then expands each
 * partial marker in the copied HTML with the matching snippet from partials/:
 *   <!-- partial:site-nav -->
 *   <!-- partial:cta-demo location="compare_hub" secondary_href="/pricing.html" secondary_label="See pricing" -->
 * A marker sits alone on its line; the snippet replaces the line, indented to match.
 *
 * In a partial, {{name}} takes (first match wins) a value given on the marker, then a value read from the page:
 *   root         relative path from the page to the site root ("../" per folder; "/" for 404.html)
 *   title        the page's <title>        description  its meta description
 *   url          its canonical link
 * {{name|fallback}} uses the fallback when nothing supplies the name. A missing name with no fallback, or an
 * unknown partial, fails the build, so no page ships a half-filled snippet.
 *
 * Usage:  node scripts/build.mjs           build once
 *         node scripts/build.mjs --watch   build, then rebuild whenever a source file changes
 *         node scripts/build.mjs --serve   --watch, plus the Firebase hosting emulator serving dist/
 */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const PARTIALS = join(ROOT, 'partials');
// Repo-only files and folders: never copied to dist/. Dotfiles are skipped separately.
const SKIP = new Set(['dist', 'partials', 'scripts', 'node_modules', 'firebase.json', 'package.json', 'package-lock.json']);
const SKIP_EXT = ['.md', '.log'];
// Served at whatever path was requested, so its links and assets must be root-absolute.
const ROOT_ABSOLUTE_PAGES = new Set(['404.html']);
const MARKER = /^([ \t]*)<!-- partial:([a-z0-9-]+)((?:\s+[a-z_]+="[^"]*")*)\s*-->[ \t]*$/gm;

function shipped(path) {
  const rel = relative(ROOT, path);
  if (!rel) return true;
  const name = basename(path);
  if (name.startsWith('.') || SKIP_EXT.some((ext) => name.endsWith(ext))) return false;
  return !SKIP.has(rel.split(sep)[0]);
}

function filesMatching(dir, test) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return filesMatching(path, test);
    return test(name) ? [path] : [];
  });
}
const htmlFiles = (dir) => filesMatching(dir, (name) => name.endsWith('.html'));

function pageValues(html, rel) {
  const pick = (re) => (html.match(re) || [])[1];
  return {
    root: ROOT_ABSOLUTE_PAGES.has(rel) ? '/' : '../'.repeat(rel.split('/').length - 1),
    title: pick(/<title>([^<]*)<\/title>/),
    description: pick(/<meta name="description" content="([^"]*)"/),
    url: pick(/<link rel="canonical" href="([^"]*)"/),
  };
}

function render(name, values, rel) {
  const file = join(PARTIALS, `${name}.html`);
  if (!existsSync(file)) throw new Error(`${rel}: no partial named "${name}" in partials/`);
  return readFileSync(file, 'utf8').replace(/\n$/, '').replace(/\{\{([a-z_]+)(?:\|([^}]*))?\}\}/g, (_, key, fallback) => {
    if (values[key] !== undefined) return values[key];
    if (fallback !== undefined) return fallback;
    throw new Error(`${rel}: partial "${name}" needs {{${key}}}`);
  });
}

function expand(html, rel) {
  const page = pageValues(html, rel);
  return html.replace(MARKER, (_, indent, name, attrs) => {
    const given = Object.fromEntries([...attrs.matchAll(/([a-z_]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
    return render(name, { ...page, ...given }, rel).split('\n').map((line) => (line ? indent + line : line)).join('\n');
  });
}

function build() {
  const started = Date.now();
  rmSync(OUT, { recursive: true, force: true });
  for (const name of readdirSync(ROOT)) {
    const src = join(ROOT, name);
    if (shipped(src)) cpSync(src, join(OUT, name), { recursive: true, filter: shipped });
  }
  let expanded = 0;
  for (const file of htmlFiles(OUT)) {
    const rel = relative(OUT, file).split(sep).join('/');
    const html = readFileSync(file, 'utf8');
    const out = expand(html, rel);
    if (out !== html) { writeFileSync(file, out); expanded++; }
  }
  console.log(`Built dist/ in ${Date.now() - started} ms (${expanded} page(s) with partials).`);
}

build();

const serve = process.argv.includes('--serve');
if (serve || process.argv.includes('--watch')) {
  let timer;
  console.log('Watching for changes (Ctrl+C to stop)...');
  watch(ROOT, { recursive: true }, (_, name) => {
    if (!name || !shipped(join(ROOT, name)) && !name.startsWith('partials')) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { build(); } catch (err) { console.error(err.message); }
    }, 150);
  });
}

if (serve) {
  const emulator = spawn('firebase', ['emulators:start', '--only', 'hosting:production'], { cwd: ROOT, stdio: 'inherit' });
  emulator.on('error', (err) => { console.error(`Could not start the Firebase emulator: ${err.message}`); process.exit(1); });
  emulator.on('exit', (code) => process.exit(code ?? 0));
  process.on('SIGINT', () => emulator.kill('SIGINT'));
}
