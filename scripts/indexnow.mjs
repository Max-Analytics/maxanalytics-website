/*
 * indexnow.mjs — tells IndexNow search engines (Bing, which feeds ChatGPT search and Copilot, plus Yandex,
 * Seznam and Naver) which pages changed in a production deploy, so they recrawl them within hours.
 *
 * Runs as two Firebase hooks on the production target (firebase.json):
 *   predeploy:   --snapshot   saves the live sitemap (what is deployed now) to a temp file
 *   postdeploy:  (no flag)    sends every page in dist/sitemap.xml that is new or whose lastmod changed
 * lastmod is the date of the last commit to a page's source, so shared partials don't count as changes.
 * Without a snapshot (first deploy, live sitemap unreachable) every sitemap page is sent.
 *
 * Neither step can fail a deploy: problems are printed as warnings and the script exits 0.
 * The key is public by design: IndexNow verifies it by fetching https://maxanalytics.ca/<KEY>.txt.
 *
 * Usage:  node scripts/indexnow.mjs --snapshot
 *         node scripts/indexnow.mjs [--dry-run]
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'maxanalytics.ca';
const SITE = `https://${HOST}/`;
const KEY = 'f2b7d001fdf70d4f23c61b922d7002ab';
const SNAPSHOT = join(tmpdir(), 'maxanalytics-indexnow-live-sitemap.xml');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const entries = (xml) => new Map([...xml.matchAll(/<loc>([^<]+)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>/g)].map((m) => [m[1], m[2]]));

async function snapshot() {
  try {
    const res = await fetch(`${SITE}sitemap.xml`);
    writeFileSync(SNAPSHOT, res.ok ? await res.text() : '');
    console.log(`IndexNow: saved the live sitemap (HTTP ${res.status}).`);
  } catch (err) {
    writeFileSync(SNAPSHOT, '');
    console.warn(`IndexNow: couldn't read the live sitemap (${err.message}); every page will be sent.`);
  }
}

async function submit() {
  const sitemapFile = join(ROOT, 'dist', 'sitemap.xml');
  if (!existsSync(sitemapFile)) throw new Error('dist/sitemap.xml not found: run node scripts/build.mjs first');
  if (!existsSync(join(ROOT, `${KEY}.txt`))) throw new Error(`Key file ${KEY}.txt is missing from the site root`);
  const now = entries(readFileSync(sitemapFile, 'utf8'));
  const before = existsSync(SNAPSHOT) ? entries(readFileSync(SNAPSHOT, 'utf8')) : new Map();
  const urlList = [...now].filter(([url, lastmod]) => before.get(url) !== lastmod).map(([url]) => url);
  if (!dryRun) rmSync(SNAPSHOT, { force: true });

  if (!urlList.length) {
    console.log('IndexNow: no indexable page changed in this deploy.');
    return;
  }
  console.log(`IndexNow: ${urlList.length} page(s)\n  ${urlList.join('\n  ')}`);
  if (dryRun) return;

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}${KEY}.txt`, urlList }),
  });
  // 200 = accepted, 202 = accepted while the key is checked for the first time.
  if (res.status !== 200 && res.status !== 202) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  console.log(`IndexNow accepted (HTTP ${res.status}).`);
}

try {
  await (args.includes('--snapshot') ? snapshot() : submit());
} catch (err) {
  console.warn(`IndexNow skipped: ${err.message}`);
}
