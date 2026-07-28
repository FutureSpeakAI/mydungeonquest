/**
 * D7 — SURFACE PARITY EVAL
 *
 * Verifies that cast, graph, party, and clock surfaces all derive from
 * the same selectors and cannot silently diverge:
 *
 *   § 1 — Clock selector: currentClock exported from waypost; both HUD
 *          (App.jsx) and Book (Book.jsx) route through it.
 *   § 2 — Canonical names: canonicalNames exported from waypost; SoulsWeb
 *          uses it as the knowledge gate (not introducedNames).
 *   § 3 — Hero in cast: Book.jsx cast grid seats a hero-synthetic entry
 *          before shownCast so the hero card appears in the People chapter.
 *   § 4 — No-scene / scene plate mutual exclusion: the region-strip art is
 *          gated on groundChip.name — no procedural backdrop behind the
 *          "no scene set" banner.
 *   § 5 — Travels-alone reconciliation: when knownCount > 0 and party is
 *          empty the HUD shows an "Alone — N known" chip, not "travels alone".
 *   § 6 — Runtime selector agreement: for a fixture campaign, currentClock
 *          returns the same value from both call paths; canonicalNames
 *          includes hero + all introduced cast + party members.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

const appSrc    = readFileSync(join(root, 'src/App.jsx'),                  'utf8');
const bookSrc   = readFileSync(join(root, 'src/components/Book.jsx'),      'utf8');
const webSrc    = readFileSync(join(root, 'src/components/SoulsWeb.jsx'),  'utf8');
const waySrc    = readFileSync(join(root, 'src/lib/waypost.js'),           'utf8');

const failures = [];
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.log(`  ✗ ${msg}`); failures.push(msg); };

// ── §1  Clock selector ────────────────────────────────────────────────────
console.log('\n§1 Clock selector — one seat for both surfaces');

if (/export\s+function\s+currentClock/.test(waySrc))
  pass('currentClock exported from waypost.js');
else
  fail('currentClock must be exported from waypost.js');

// App.jsx must import currentClock from waypost
if (/currentClock/.test(appSrc) && /from.*waypost/.test(appSrc))
  pass('App.jsx imports currentClock from waypost.js');
else
  fail('App.jsx must import currentClock from waypost.js');

// App.jsx calendar chip must call currentClock(current), not chips[0].words
if (/currentClock\(current\)/.test(appSrc))
  pass('App.jsx HUD calendar uses currentClock(current)');
else
  fail('App.jsx HUD calendar chip must render currentClock(current), not table.chips[0].words');

// App.jsx must NOT use chips[0].words for the calendar chip render
const calendarBlockMatch = appSrc.match(/data-chip="calendar"[^<]*\{([^}]{0,120})\}/);
if (calendarBlockMatch && /chips\[0\]\.words/.test(calendarBlockMatch[0]))
  fail('App.jsx calendar chip still uses chips[0].words — must be replaced by currentClock(current)');
else
  pass('App.jsx calendar chip does not fall back to chips[0].words');

// Book.jsx must use currentClock(campaign), not clockWords(logs)
if (/currentClock\(campaign\)/.test(bookSrc))
  pass('Book.jsx codex-head uses currentClock(campaign)');
else
  fail('Book.jsx must render currentClock(campaign) in the codex-head clock');

// Book.jsx must NOT call clockWords(logs) in a live render path
// (the import line is commented out; an uncommented call would be the bug)
const bookClockCalls = [...bookSrc.matchAll(/(?<!\/\/.*)\bclockWords\s*\(/g)];
if (bookClockCalls.length === 0)
  pass('Book.jsx has no live clockWords(…) render calls');
else
  fail(`Book.jsx still has ${bookClockCalls.length} uncommented clockWords() call(s) — replace with currentClock(campaign)`);

// ── §2  Canonical names ───────────────────────────────────────────────────
console.log('\n§2 Canonical names — one gate for the soul graph');

if (/export\s+function\s+canonicalNames/.test(waySrc))
  pass('canonicalNames exported from waypost.js');
else
  fail('canonicalNames must be exported from waypost.js');

// canonicalNames must include hero, introducedCast, and codex.party
if (/hero.*name.*names\.add|names\.add.*hero.*name/s.test(waySrc) || /hero.*trim.*toLowerCase/.test(waySrc))
  pass('canonicalNames seeds the hero name');
else if (/names\.add\(hero\.name/.test(waySrc) || /names\.add.*hero\.name/.test(waySrc))
  pass('canonicalNames seeds the hero name');
else
  fail('canonicalNames must add the hero name to the set');

if (/introducedCast\(campaign\)/.test(waySrc))
  pass('canonicalNames walks introducedCast');
else
  fail('canonicalNames must walk introducedCast(campaign)');

if (/codex.*party/.test(waySrc))
  pass('canonicalNames includes codex.party members');
else
  fail('canonicalNames must include campaign.codex.party members');

// SoulsWeb must use canonicalNames, not introducedNames
if (/canonicalNames\(campaign\)/.test(webSrc))
  pass('SoulsWeb.jsx uses canonicalNames(campaign) as the known gate');
else
  fail('SoulsWeb.jsx must pass canonicalNames(campaign) to buildSoulsWeb');

if (/introducedNames/.test(webSrc))
  fail('SoulsWeb.jsx still references introducedNames — must be replaced by canonicalNames');
else
  pass('SoulsWeb.jsx has no introducedNames reference');

// ── §3  Hero in cast ──────────────────────────────────────────────────────
console.log('\n§3 Hero in cast grid');

// Book.jsx cast grid must seat a hero synthetic before shownCast.map
if (/__heroSynthetic/.test(bookSrc))
  pass('Book.jsx cast grid contains a __heroSynthetic hero entry');
else
  fail('Book.jsx must prepend a hero-synthetic entry to the cast grid before shownCast.map');

// Hero card must use heroName and campaign.hero.className
if (/name:\s*heroName/.test(bookSrc))
  pass('Hero-synthetic entry uses heroName as the name');
else
  fail('Hero-synthetic entry must set name: heroName');

if (/role:\s*campaign\.hero\?\.className/.test(bookSrc))
  pass('Hero-synthetic entry uses campaign.hero?.className as role');
else
  fail('Hero-synthetic entry must set role: campaign.hero?.className || \'\'');

// ── §4  No-scene / scene plate mutual exclusion ───────────────────────────
console.log('\n§4 No-scene banner / scene plate mutual exclusion');

// App.jsx region-strip must gate the background art on groundChip.name
if (/sceneArt\s*=\s*groundChip\.name\s*\?/.test(appSrc))
  pass('region-strip art is gated: sceneArt = groundChip.name ? ... : null');
else
  fail('App.jsx must compute sceneArt = groundChip.name ? (regionPlate || regionArt) : null');

// The background-image must branch on sceneArt, not blindly use regionArt
if (/sceneArt\s*\?/.test(appSrc))
  pass('region-strip backgroundImage branches on sceneArt');
else
  fail('App.jsx region-strip style must branch: sceneArt ? url(…) : gradient-only');

// Ensure the old unconditional regionPlate || regionArt is gone from the strip
if (/url\(".*regionPlate \|\| regionArt/.test(appSrc))
  fail('App.jsx region-strip still uses unconditional regionPlate || regionArt in url()');
else
  pass('App.jsx region-strip no longer uses unconditional regionPlate || regionArt');

// ── §5  Travels-alone reconciliation ─────────────────────────────────────
console.log('\n§5 Travels-alone reconciliation');

if (/knownCount\s*>/.test(appSrc))
  pass('App.jsx checks knownCount to reconcile the party-empty state');
else
  fail('App.jsx must check knownCount > 0 before showing "travels alone"');

// T8 (E7): party chip now says "Traveling alone"; a separate chip carries
// the known-count fact. Check for the new pattern.
if (/Traveling alone/.test(appSrc))
  pass('App.jsx party chip says "Traveling alone" (T8: no house term, no contradictory fact)');
else
  fail('App.jsx party chip must say "Traveling alone" for the no-companions case (T8)');

if (/data-chip="known"/.test(appSrc))
  pass('App.jsx has a separate data-chip="known" for the cast count (T8: one fact per chip)');
else
  fail('App.jsx must have a separate data-chip="known" chip for the known-character count (T8)');

// ── §6  Runtime selector agreement ───────────────────────────────────────
console.log('\n§6 Runtime — selectors agree on a fixture campaign');

// Build a fixture that has a hero, two introduced cast members, and one party member
const { currentClock, canonicalNames } = await import(join(root, 'src/lib/waypost.js'));

const campaign = {
  hero: { name: 'Lira', className: 'Ranger', visual: 'Keen-eyed and swift' },
  codex: {
    cast: [
      { name: 'Owain',  role: 'scribe',  status: 'active', bond: 1, introduced_turn: 2, known_facts: ['Writes in cursive'], bond_arc: [] },
      { name: 'Vesper', role: 'herald',  status: 'active', bond: 2, introduced_turn: 3, known_facts: [],                    bond_arc: [] },
    ],
    party: [{ name: 'Torr', joinedTurn: 4 }],
    regions: [], threads: [], trove: [], purses: [], blight: 0,
    spine: { label: 'Act I', beats: [], beatIndex: 0 }, arc: {}, clocks: [], memoir: []
  },
  logs: []
};

// currentClock must return a non-empty string
const clockStr = currentClock(campaign);
if (typeof clockStr === 'string' && clockStr.trim().length > 0)
  pass(`currentClock returns a non-empty string: "${clockStr}"`);
else
  fail(`currentClock must return a non-empty string, got: ${JSON.stringify(clockStr)}`);

// canonicalNames must include all four: hero, owain, vesper, torr
const names = canonicalNames(campaign);
const expected = ['lira', 'owain', 'vesper', 'torr'];
for (const n of expected) {
  if (names.has(n)) pass(`canonicalNames includes "${n}"`);
  else fail(`canonicalNames is missing "${n}"`);
}

// canonicalNames must NOT include stray entries (set size = 4)
if (names.size === 4)
  pass('canonicalNames size is exactly 4 (hero + 2 cast + 1 party)');
else
  fail(`canonicalNames size is ${names.size}, expected 4`);

// currentClock returns the same value if called twice on the same campaign
// (determinism — no timestamp, no random source)
const clockStr2 = currentClock(campaign);
if (clockStr === clockStr2)
  pass('currentClock is deterministic across two calls');
else
  fail('currentClock returns different values on repeated calls — must be deterministic');

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
if (failures.length === 0) {
  console.log('SURFACE PARITY — all checks passed.');
} else {
  console.log(`SURFACE PARITY — ${failures.length} failure(s):`);
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
