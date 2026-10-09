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
 * The build also writes dist/sitemap.xml: every page whose canonical link points at itself and that isn't
 * noindex, dated by the last commit that changed its source file (today if uncommitted). It fails on
 * structured data (application/ld+json) that isn't valid JSON, and on any image a page, stylesheet or script uses
 * that is over IMAGE_LIMIT_KB; it warns about images that ship but nothing uses. README "Images" has the how-to.
 *
 * With --staging the build writes dist-staging/ instead (the staging target's public folder) and adds the review
 * pages in staging/, served at the same paths; production's dist/ never holds them. Each must be noindex.
 *
 * Usage:  node scripts/build.mjs           build once
 *         node scripts/build.mjs --watch   build, then rebuild whenever a source file changes
 *         node scripts/build.mjs --serve   --watch, plus the Firebase hosting emulator serving dist/
 * Add --staging to any of these for dist-staging/ (the staging deploy's build; npm run dev:staging serves it).
 */
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WITH_STAGING = process.argv.includes('--staging');
const OUT = join(ROOT, WITH_STAGING ? 'dist-staging' : 'dist');
const PARTIALS = join(ROOT, 'partials');
const STAGING = join(ROOT, 'staging');
// Repo-only files and folders: never copied to dist/. Dotfiles are skipped separately.
const SKIP = new Set(['dist', 'dist-staging', 'partials', 'scripts', 'staging', 'node_modules', 'firebase.json', 'package.json', 'package-lock.json', 'sitemap.xml']);
const SKIP_EXT = ['.md', '.log'];
// Served at whatever path was requested, so its links and assets must be root-absolute.
const ROOT_ABSOLUTE_PAGES = new Set(['404.html']);
const SITE = 'https://maxanalytics.ca/';
// Self-canonical pages kept out of the sitemap: the family survey form (until it is marked noindex).
const SITEMAP_EXCLUDE = new Set(['feedback/index.html']);
const IMAGE_LIMIT_KB = 300;
const IMAGE_EXT = /\.(png|jpe?g|jfif|gif|webp|avif)$/i;
const MARKER = /^([ \t]*)<!-- partial:([a-z0-9-]+)((?:\s+[a-z_]+="[^"]*")*)\s*-->[ \t]*$/gm;

const repoOnlyName = (name) => name.startsWith('.') || SKIP_EXT.some((ext) => name.endsWith(ext));

function shipped(path) {
  const rel = relative(ROOT, path);
  if (!rel) return true;
  if (repoOnlyName(basename(path))) return false;
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

// Staging review pages don't count as uses, so both builds warn about the same unused images.
function checkImages(stagingRels) {
  const code = filesMatching(OUT, (name) => /\.(html|css|js)$/.test(name))
    .filter((f) => !stagingRels.has(relative(OUT, f).split(sep).join('/')))
    .map((f) => readFileSync(f, 'utf8')).join('\n');
  const used = (name) => new RegExp(`(?<![\\w.-])${name.replace(/[.]/g, '\\.')}(?![\\w])`).test(code);
  const tooBig = [];
  const unused = [];
  for (const file of filesMatching(OUT, (name) => IMAGE_EXT.test(name))) {
    const rel = relative(OUT, file).split(sep).join('/');
    const kb = Math.round(statSync(file).size / 1024);
    if (!used(basename(file))) unused.push(rel);
    else if (kb > IMAGE_LIMIT_KB) tooBig.push(`${rel} (${kb} KB)`);
  }
  if (unused.length) console.warn(`Unused images still deployed (delete them if nothing needs them):\n  ${unused.join('\n  ')}`);
  if (tooBig.length) {
    throw new Error(`Images over ${IMAGE_LIMIT_KB} KB (see README "Images"):\n  ${tooBig.join('\n  ')}`);
  }
}

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

function lastChanged(rel) {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
    return date || new Date().toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function sitemapEntry(html, rel) {
  const self = SITE + rel.replace(/(^|\/)index\.html$/, '$1');
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  if (canonical !== self || SITEMAP_EXCLUDE.has(rel) || /<meta name="robots" content="[^"]*noindex/.test(html)) return null;
  return { loc: self, lastmod: lastChanged(rel) };
}

function checkStructuredData(html, rel) {
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json); } catch (err) { throw new Error(`${rel}: invalid structured data (${err.message})`); }
  }
}

function writeSitemap(entries) {
  entries.sort((a, b) => (a.loc === SITE ? -1 : b.loc === SITE ? 1 : a.loc.localeCompare(b.loc)));
  const urls = entries.map((e) => `    <url>\n        <loc>${e.loc}</loc>\n        <lastmod>${e.lastmod}</lastmod>\n    </url>`);
  writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
}

function build() {
  const started = Date.now();
  rmSync(OUT, { recursive: true, force: true });
  for (const name of readdirSync(ROOT)) {
    const src = join(ROOT, name);
    if (shipped(src)) cpSync(src, join(OUT, name), { recursive: true, filter: shipped });
  }
  const stagingRels = new Set();
  if (WITH_STAGING && existsSync(STAGING)) {
    const keep = (src) => !repoOnlyName(basename(src));
    for (const file of filesMatching(STAGING, (name) => !repoOnlyName(name))) {
      stagingRels.add(relative(STAGING, file).split(sep).join('/'));
    }
    // errorOnExist: a staging page may never replace a site file.
    cpSync(STAGING, OUT, { recursive: true, force: false, errorOnExist: true, filter: keep });
  }
  let expanded = 0;
  const sitemap = [];
  for (const file of htmlFiles(OUT)) {
    const rel = relative(OUT, file).split(sep).join('/');
    const html = readFileSync(file, 'utf8');
    const out = expand(html, rel);
    if (out !== html) { writeFileSync(file, out); expanded++; }
    checkStructuredData(out, rel);
    if (stagingRels.has(rel) && !/<meta name="robots" content="[^"]*noindex/.test(out)) {
      throw new Error(`staging/${rel}: review pages must carry <meta name="robots" content="noindex">`);
    }
    const entry = sitemapEntry(out, rel);
    if (entry) sitemap.push(entry);
  }
  writeSitemap(sitemap);
  checkImages(stagingRels);
  console.log(`Built ${relative(ROOT, OUT)}/ in ${Date.now() - started} ms (${expanded} page(s) with partials, ${sitemap.length} in the sitemap).`);
}

build();

const serve = process.argv.includes('--serve');
if (serve || process.argv.includes('--watch')) {
  let timer;
  console.log('Watching for changes (Ctrl+C to stop)...');
  watch(ROOT, { recursive: true }, (_, name) => {
    const source = WITH_STAGING ? /^(partials|staging)([\\/]|$)/ : /^partials([\\/]|$)/;
    if (!name || !shipped(join(ROOT, name)) && !source.test(name)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { build(); } catch (err) { console.error(err.message); }
    }, 150);
  });
}

if (serve) {
  const target = WITH_STAGING ? 'hosting:staging' : 'hosting:production';
  const emulator = spawn('firebase', ['emulators:start', '--only', target], { cwd: ROOT, stdio: 'inherit' });
  emulator.on('error', (err) => { console.error(`Could not start the Firebase emulator: ${err.message}`); process.exit(1); });
  emulator.on('exit', (code) => process.exit(code ?? 0));
  process.on('SIGINT', () => emulator.kill('SIGINT'));
}
