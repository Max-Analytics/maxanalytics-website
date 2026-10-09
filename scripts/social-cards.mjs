/*
 * social-cards.mjs — renders each page's social share card (og:image / twitter:card) into assets/social/.
 *
 * Every card is scripts/social-cards/template.html, the insights paper card's style, filled with one CARDS entry and
 * screenshotted at 1200x630 by headless Chrome, then saved as JPEG (social sites handle JPEG best).
 * Each page points at its card from its social-meta marker: image="https://maxanalytics.ca/assets/social/<name>.jpg".
 * Copy on a card must match its page: no claim, number or name that the page doesn't already make.
 *
 * Not part of the build: run it after changing a card, then commit the images.
 * Needs Google Chrome (override the path with CHROME=...), macOS sips for the JPEG step, and a network for fonts.
 *
 * Usage:  node scripts/social-cards.mjs            render every card
 *         node scripts/social-cards.mjs pricing    render only the named card(s)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = join(ROOT, 'scripts', 'social-cards', 'template.html');
const OUT = join(ROOT, 'assets', 'social');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const JPEG_QUALITY = '82';

const SKATER = { kind: 'photo', src: 'assets/hero-skater-halo-2.webp', size: 'auto 120%', position: '30% 40%' };
const SKATER_CLOSE = { kind: 'photo', src: 'assets/hero-skater-halo-2.webp', size: 'auto 175%', position: '32% 38%' };
const TEAMMATES = { kind: 'cutout', src: 'assets/cta-teammates.webp', style: { height: '520px', right: '-70px', bottom: '0' } };
const TEAMMATES_CLOSE = { kind: 'cutout', src: 'assets/cta-teammates.webp', style: { height: '700px', right: '-190px', bottom: '-130px' } };
const CHECK_IN = { kind: 'screen', src: 'images/check-in-tall.webp', style: { width: '470px', right: '40px', top: '120px' } };
const REPORT_CARD = { kind: 'screen', src: 'images/report-card.webp', style: { width: '400px', right: '70px', top: '90px' } };
const WHEEL = { kind: 'figure', src: 'assets/mdc-transparent-bg.webp', style: { width: '500px', right: '30px', top: '90px' } };

// name = the image file and the CLI filter; page = the page whose social-meta marker uses it.
const CARDS = [
  {
    name: 'home', page: 'index.html', art: SKATER,
    kicker: 'Minor hockey player evaluation software',
    headline: ['Fair,', 'consistent', 'evaluations'],
    sub: 'Placements you can explain to every family.',
    chips: ['Bias-calibrated rankings', 'A report card for every player'],
  },
  {
    name: 'tryout-software', page: 'minor-hockey-tryout-software/index.html', art: SKATER_CLOSE,
    kicker: 'Hockey tryout software',
    headline: ['Tryouts,', 'start to', 'finish'],
    sub: 'Scheduling, family email and text, check-in, live scoring, rankings and team placement.',
    chips: ['Built for minor hockey associations'],
  },
  {
    name: 'benefits', page: 'benefits.html', art: REPORT_CARD,
    kicker: 'Why associations choose Max',
    headline: ['Beyond', 'paper score', 'sheets'],
    sub: 'Fewer volunteer hours, defensible placements and a report card for every player.',
  },
  {
    name: 'process', page: 'process.html', art: CHECK_IN,
    kicker: 'How Max runs evaluations',
    headline: ['Five steps', 'to fair', 'placements'],
    sub: 'Registration, scheduling, check-in and on-ice scoring, rankings and team assignment, then progress reports.',
  },
  {
    name: 'pricing', page: 'pricing.html', art: { ...REPORT_CARD, style: { width: '300px', right: '-10px', top: '60px' } },
    kicker: 'Pricing',
    headline: ['Simple', 'per-player', 'pricing'],
    sub: 'CAD per player per year, with unlimited evaluators and administrators.',
    stats: [
      { value: '$8', label: 'Evaluate', label2: 'per player' },
      { value: '$12', label: 'Develop', label2: 'per player' },
      { value: '$16', label: 'Compete', label2: 'per player' },
    ],
  },
  {
    name: 'evaluators', page: 'evaluators.html', art: { ...SKATER_CLOSE, flip: true, position: '5% 38%' },
    kicker: 'Become an evaluator',
    headline: ['Become a', 'qualified', 'evaluator'],
    sub: 'Experienced players, coaches and instructors helping associations run fair, consistent evaluations.',
  },
  {
    name: 'faqs', page: 'faqs.html', art: { ...WHEEL, style: { width: '640px', right: '-170px', top: '40px' } },
    kicker: 'FAQs',
    headline: ['Your', 'questions,', 'answered'],
    sub: 'Getting set up, custom evaluation formats, devices and optional features.',
  },
  {
    name: 'about', page: 'about.html', art: TEAMMATES,
    kicker: 'About Max Analytics',
    headline: ['The team', 'behind', 'Max'],
    sub: 'Player evaluation and tryout software for minor hockey associations and clubs across North America.',
  },
  {
    name: 'contact', page: 'contact.html', art: TEAMMATES_CLOSE,
    kicker: 'Contact Max Analytics',
    headline: ['See Max', 'in action'],
    sub: 'Request a demo of our evaluation and tryout software, or get help with your evaluations.',
    chips: ['Request a demo'],
  },
  {
    name: 'feedback', page: 'feedback/index.html', art: { ...TEAMMATES, style: { height: '560px', right: '-120px', bottom: '-20px' } },
    kicker: 'Family feedback',
    headline: ['How did', 'evaluations', 'go?'],
    sub: "Share feedback on your association's evaluations so we can make next year better.",
  },
  {
    name: 'compare', page: 'compare/index.html', art: { ...SKATER, flip: true, position: '2% 40%' },
    kicker: 'Compare tryout software',
    headline: ['Minor hockey', 'tryout software', 'compared'],
    sub: 'Max Analytics, TeamGenius and SkillShark, side by side.',
    chips: ['Evaluator bias', 'Family messaging', 'Pricing'],
  },
  {
    name: 'max-vs-teamgenius', page: 'compare/max-vs-teamgenius/index.html', art: { ...SKATER, size: 'auto 140%', position: '38% 45%' },
    kicker: 'Hockey tryout software compared', lime: [0],
    headline: ['Max Analytics', 'vs TeamGenius'],
    sub: 'Evaluator bias, family email and text, check-in, regrouping between skates and pricing.',
  },
  {
    name: 'max-vs-skillshark', page: 'compare/max-vs-skillshark/index.html', art: { ...CHECK_IN, style: { width: '540px', right: '-30px', top: '170px' } },
    kicker: 'Hockey tryout software compared', lime: [0],
    headline: ['Max Analytics', 'vs SkillShark'],
    sub: 'Family email and text, check-in and jerseys, evaluator bias, scheduling and pricing.',
  },
  {
    name: 'max-vs-playbook', page: 'compare/max-vs-playbook/index.html', art: { ...TEAMMATES, style: { height: '600px', right: '-150px', bottom: '-40px' } },
    kicker: 'Hockey tryout software compared', lime: [0],
    headline: ['Max Analytics', 'vs Playbook'],
    sub: 'Software built for minor hockey evaluations, and an all-in-one youth sports platform with a tryout module.',
  },
  {
    name: 'insights', page: 'insights/index.html', art: { ...SKATER, size: 'auto 100%', position: '0% 50%' },
    kicker: 'Max Analytics Insights', kicker2: 'Competitive balance in youth hockey',
    headline: ['Why seasons', 'stop being', 'fun'],
    sub: 'Why so many seasons stop challenging players, and what would have to change.',
    stats: [{ value: '3', label: 'short papers', label2: 'one series' }],
  },
  {
    name: 'insights-subscribe', page: 'insights/subscribe/index.html', art: { ...SKATER, flip: true, size: 'auto 100%', position: '0% 50%' },
    kicker: 'Max Analytics Insights', kicker2: 'A three-part series',
    headline: ['Get each', 'paper as it', 'lands'],
    sub: 'The youth hockey series from Max Analytics, by email.',
  },
  {
    name: 'help-centre', page: 'support-help-centre/index.html', art: { ...TEAMMATES_CLOSE, style: { ...TEAMMATES_CLOSE.style, transform: 'scaleX(-1)' } },
    kicker: 'Help centre',
    headline: ["We're", 'here to', 'help'],
    sub: 'Answers about registration, ice times and the evaluation process.',
  },
  {
    name: 'evaluation-process', page: 'support-help-centre/minor-hockey-evaluation-process/index.html', art: WHEEL,
    kicker: 'Help centre',
    headline: ['How a Max', 'evaluation', 'works'],
    sub: 'How players are grouped into ice times, the skills assessed, and how results guide placement.',
    chips: ["Hockey Canada's skill development matrix"],
  },
];

function render(card, tmp) {
  const png = join(tmp, `${card.name}.png`);
  const jpg = join(OUT, `${card.name}.jpg`);
  const url = `${pathToFileURL(TEMPLATE).href}#${encodeURIComponent(JSON.stringify(card))}`;
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--allow-file-access-from-files',
    '--window-size=1200,630', '--virtual-time-budget=10000', `--screenshot=${png}`, url,
  ], { stdio: 'ignore' });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', JPEG_QUALITY, png, '--out', jpg], { stdio: 'ignore' });
  console.log(`  assets/social/${card.name}.jpg (${Math.round(statSync(jpg).size / 1024)} KB) <- ${card.page}`);
}

const only = process.argv.slice(2);
const unknown = only.filter((name) => !CARDS.some((c) => c.name === name));
if (unknown.length) throw new Error(`No card named ${unknown.join(', ')}`);
mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'social-cards-'));
try {
  console.log('Rendering social cards:');
  CARDS.filter((c) => !only.length || only.includes(c.name)).forEach((card) => render(card, tmp));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
