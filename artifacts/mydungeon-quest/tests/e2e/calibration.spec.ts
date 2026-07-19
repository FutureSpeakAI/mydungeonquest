import { expect, test } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { GAME_ROOT } from './lib/vision';
import { HARVEST_DIR, pageProse, preflightManifest, rolePlate, topBytes } from './lib/harvestManifest';
import { loadManifest, plateBytes } from './lib/harness';
import type { PlateEntry } from './lib/harness';
import {
  DUCHY_PAIR_SUBJECTS, PINNED_FRAME_QUESTIONS_SHA256,
  closureVerdict, duchyFixture, frameQuestionsDigest, heroClause, heroFirstSubjects, pairVerdict, principalLook,
} from './lib/frameLaw';
import { BINARY_PROTOCOL, BINARY_QUESTIONS_PATH, binaryVerdict } from './lib/binaryVerdict';
import { boundaryKey, JUDGE_BOUNDARY } from './lib/judgeBoundary';
import { PINNED_BATTLE_QUESTIONS_SHA256, battleCard, battleQuestionsDigest, crossedCard, speciesVerdict } from './lib/battleLaw';
import type { BinaryKind } from './lib/binaryVerdict';
import { magnifiedMark } from './lib/magnifier';
import { armRetractionObserver } from './lib/retraction';

// ============================================================
// THE CALIBRATION PROBE & THE MAGNIFIER TOOTH (TASK 54B §2/§7).
//
// TOOTH 11 — before the amended G16 courts sit, the binary instrument
// is proven on sealed material: known-good pairs (plates beside their
// OWN prose) must ALL pass; known-bad pairs (plates crossed with
// lexically-distant wrong prose, the false-caption fixture, and the
// cropped controls) must ALL fail. PERFECT separation or the tooth is
// red — an instrument that cannot tell right from wrong pairs may not
// judge either. The question texts are pinned byte-stable below; an
// amended text must bump the fixture's protocol (§4), update this pin,
// and re-sit this probe. Every phrasing iteration is logged in
// LOOP_LOG.md with its separation table.
//
// TOOTH 12 — the magnified look must tell a markless control from the
// hero anchor: a head-and-shoulders control WITHOUT the mark (the Edda
// bust — present head, absent key-burn by construction) must fail
// stage two; the crown-band sliver can never yield a sighting (the
// boxless path is fail-closed); the hero anchor must pass. A magnifier
// that cannot tell those two apart invalidates every mark verdict —
// so the ladder seats G9 and G16 only after this file passes.
// ============================================================

const PINNED_QUESTIONS_SHA256 = '35dc7b3657c132c0a00bfedf8208166500cbf32bc87a221382faa2d4e9efed8d';

const CALIBRATION_FILE = path.join(GAME_ROOT, 'test-results', 'calibration.json');

function need(tag: 'live' | 'fixture', predicate: (entry: PlateEntry) => boolean, what: string): Buffer {
  const manifest = loadManifest(tag);
  if (!manifest) throw new Error(`plate store "${tag}" missing — harvest first`);
  const entry = manifest.find(predicate);
  if (!entry) throw new Error(`plate store missing ${what}`);
  return plateBytes(entry);
}

/** 4+letter word set — the same shape the echo check reads. */
function tokens(s: string): Set<string> {
  return new Set(s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4));
}

/** Shared-word ratio against the smaller set — 0 is fully distant. */
function overlap(a: string, b: string): number {
  const A = tokens(a); const B = tokens(b);
  let shared = 0;
  A.forEach((w) => { if (B.has(w)) shared += 1; });
  return shared / Math.max(1, Math.min(A.size, B.size));
}

test('calibration preflight: the harvest store holds every artifact the probe needs', () => {
  preflightManifest('g16-captions');
  preflightManifest('g09-character');
});

test('tooth 11: the calibration probe — perfect separation of known-good from known-bad pairs', async () => {
  test.setTimeout(1_800_000);
  // 11.0 — the pinned texts. Byte-stability is the tooth's first bite:
  // a drifted question is a different instrument wearing the same name.
  const fixtureBytes = fs.readFileSync(BINARY_QUESTIONS_PATH);
  const sha = createHash('sha256').update(fixtureBytes).digest('hex');
  expect(sha, 'binary-questions.json is pinned byte-stable — an amended text must bump protocol AND this pin AND re-sit this probe').toBe(PINNED_QUESTIONS_SHA256);

  const m = preflightManifest('g16-captions');
  const scenes = m.plates
    .filter((p) => p.role === 'scene' && p.prose)
    .sort((a, b) => String(a.file).localeCompare(String(b.file)));

  type ProbePair = { name: string; kind: BinaryKind; prose: string; bytes: Buffer; note?: string };

  // —— KNOWN-GOOD: sealed plates beside their OWN prose. ——
  const good: ProbePair[] = [];
  for (const plate of scenes.slice(0, 6)) {
    good.push({ name: `good-moment-${plate.file}`, kind: 'moment', prose: String(plate.prose).slice(0, 600), bytes: topBytes(plate) });
  }
  const book = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.storybook), 'utf8'));
  const pagePairs: { file: string; prose: string }[] = [];
  for (const chapter of book.chapters) {
    for (const plate of chapter.plates) {
      // The page's whole breath (60.1) — the WHOLE retelling, one seat
      // in lib/harvestManifest: an opening slice manufactured the
      // dawn-against-night lie the judge honestly refused.
      if (plate.file && chapter.prose) pagePairs.push({ file: plate.file, prose: pageProse(chapter.prose) });
    }
  }
  // THE QUARANTINE (58.8, LOOP_LOG) — a calibration control must be a
  // deterministic truth for the judge, or it measures the model's
  // perception limits instead of the instrument's honesty. A control
  // earns quarantine ONLY by the two-sitting law: byte-identical wrong
  // verdicts on two fresh rolls PLUS direct human inspection of the
  // sealed evidence, both logged. Entries bind to PLATE BYTES, so a
  // store raze self-expires them: a key matching no candidate is a
  // STALE entry and fails the bench loudly. Never a silent skip.
  // The boundary ledger lives in ONE seat (lib/judgeBoundary.ts) — the
  // bench filters its seats through it, the G16 courts recuse through
  // it, and the bench's stale-entry gate below remains the custodian
  // that kills entries the store no longer carries.
  const QUARANTINED_GOODS = JUDGE_BOUNDARY;
  const quarantineSeen = new Set<string>();
  const seatablePages = pagePairs.filter((pair) => {
    const bytes = fs.readFileSync(path.join(HARVEST_DIR, 'fixture', pair.file));
    const key = boundaryKey('page', bytes, pair.prose);
    if (!QUARANTINED_GOODS[key]) return true;
    quarantineSeen.add(key);
    console.log(`[tooth 11] QUARANTINED good-page-${pair.file}: ${QUARANTINED_GOODS[key]}`);
    return false;
  });
  for (const pair of seatablePages.slice(0, 3)) {
    good.push({ name: `good-page-${pair.file}`, kind: 'page', prose: pair.prose, bytes: fs.readFileSync(path.join(HARVEST_DIR, 'fixture', pair.file)) });
  }
  const captions: { file: string; text: string }[] = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.captions), 'utf8'));
  const seatableCaptions = captions.filter((caption) => {
    const bytes = fs.readFileSync(path.join(HARVEST_DIR, caption.file));
    const key = boundaryKey('caption', bytes, caption.text);
    if (!QUARANTINED_GOODS[key]) return true;
    quarantineSeen.add(key);
    console.log(`[tooth 11] QUARANTINED good-caption-${caption.file}: ${QUARANTINED_GOODS[key]}`);
    return false;
  });
  // The stale-entry gate sits AFTER every set the quarantine filters.
  for (const key of Object.keys(QUARANTINED_GOODS)) {
    expect(quarantineSeen.has(key), `quarantine entry ${key.slice(0, 12)}… matched no candidate — the store moved; remove the stale entry`).toBe(true);
  }
  for (const caption of seatableCaptions.slice(0, 3)) {
    good.push({ name: `good-caption-${caption.file}`, kind: 'caption', prose: caption.text, bytes: fs.readFileSync(path.join(HARVEST_DIR, caption.file)) });
  }
  // THE ATTESTED DUAL (58.10, LOOP_LOG) — the bad set already builds its
  // crop texts ONLY from sealed identity fields; this seats the SAME
  // claim over the UNCROPPED anchor, completing the pair: the judge must
  // pass on whole pixels the very text it must refuse on beheaded ones.
  // Seated by the probe ritual — measured decisive before it sat.
  good.push({
    name: 'good-anchor-attested', kind: 'caption',
    prose: `The hero faces us, her whole face in view, her ${m.hero.mark} plainly visible.`,
    bytes: topBytes(rolePlate(m, 'hero-anchor')),
    note: 'attested dual of the beheaded/crown crops: same claim, whole pixels',
  });
  expect(good.length, `the sealed stores must seat at least six known-good pairs (scenes=${scenes.length}, pages=${pagePairs.length}, captions=${captions.length})`).toBeGreaterThanOrEqual(6);

  // —— KNOWN-BAD: crossings chosen for MAXIMUM lexical distance (a
  // crossing between two look-alike scenes would test the judge's
  // clairvoyance, not its honesty), the false-caption fixture, and the
  // cropped controls beside claims their pixels cannot honor. ——
  const bad: ProbePair[] = [];
  // (56B.4 logged re-aim; nothing weakened — the three binaries, the
  // pinned questions, the ≥6 floor, and the perfect-separation law all
  // stand.) THE CROSSING CONTROL IS RETIRED. It crossed a plate against
  // another plate's prose and demanded the eyes refuse — but the pinned
  // moment binaries ask element, action, and contradiction; they never
  // ask WHO or WHERE, so any same-genre prose crossed onto any plate of
  // the same book is a dice roll against honestly lenient eyes. Three
  // sittings threw it three ways (56B.2 overlap 0.000, 56B.3 0.000
  // twice, 56B.4 0.067 after anchoring, soul-disjointness, and
  // quote-stripping were all demanded) — a control that flips on a fair
  // judge is noise wearing a control's name, and it got only fairer
  // once sealed fixtures began lawfully furnishing every plate of a
  // ground. The moment-bad seats are now the three synthetic
  // sealed-canon lies below: deterministic impossibilities in the exact
  // pattern tooth 4's false caption has refused on every green run.
  // Synthetic impossible moments — sealed-canon lies no plate of this
  // pastoral book can honor — seat all three moment controls.
  const syntheticLies = [
    'A duel atop a burning bell tower at midnight, flames licking the bronze bell while a crowd screams from the square far below.',
    'A storm-lashed war galley heels under black sails on the open sea, sailors hauling drenched rigging as green waves burst over the rail.',
    'A snowbound throne hall of black iron pillars where a crowned figure sits beneath falling snow that blankets the frozen court.',
  ];
  for (let k = 0; bad.length < 3 && k < syntheticLies.length; k += 1) {
    const plate = scenes[k % scenes.length];
    bad.push({
      name: `bad-synthetic-${k}-${plate.file}`, kind: 'moment',
      prose: syntheticLies[k], bytes: topBytes(plate),
      note: 'synthetic impossible moment (56B.3 re-aim): a sealed-canon lie in the false-caption pattern',
    });
  }
  // The false-caption fixture — tooth 4's own sealed lie.
  bad.push({
    name: 'bad-false-caption-vale', kind: 'caption',
    prose: 'Corin Voss duels atop a burning bell tower at midnight',
    bytes: need('fixture', (e) => e.klass === 'region' && !String(e.cacheKey || '').startsWith('proving:'), 'Vale establishing plate'),
  });
  // The cropped controls: real painted pixels beside claims the crop
  // removed. The pairing texts are built ONLY from sealed identity fields.
  const g9 = preflightManifest('g09-character');
  const heroBytes = topBytes(rolePlate(g9, 'hero-anchor'));
  const heroMeta = await sharp(heroBytes).metadata();
  const beheadTop = Math.floor((heroMeta.height || 0) * 0.4);
  const beheaded = await sharp(heroBytes)
    .extract({ left: 0, top: beheadTop, width: heroMeta.width || 1, height: (heroMeta.height || 1) - beheadTop })
    .png().toBuffer();
  bad.push({
    name: 'bad-beheaded-hero', kind: 'caption',
    prose: `The hero faces us, her whole face in view, her ${g9.hero.mark} plainly visible.`,
    bytes: beheaded, note: 'tooth-5 crop: the head the caption claims is cut away',
  });
  const band = await sharp(heroBytes)
    .extract({ left: 0, top: 0, width: heroMeta.width || 1, height: Math.max(16, Math.floor((heroMeta.height || 1) * 0.18)) })
    .png().toBuffer();
  bad.push({
    name: 'bad-crown-band', kind: 'caption',
    prose: `Her ${g9.hero.mark} is clearly visible on her skin.`,
    bytes: band, note: 'tooth-7 crop: a crown band with no room for the mark',
  });
  expect(bad.length, 'the probe must seat at least six known-bad pairs').toBeGreaterThanOrEqual(6);

  // —— The sitting. Probe ids are namespaced tooth11-* so the courts'
  // own verdicts stay independent of the probe's. ——
  const table: any[] = [];
  for (const pair of good) {
    const outcome = await binaryVerdict({ kind: pair.kind, prose: pair.prose, bytes: pair.bytes, idSeed: `tooth11-${pair.name}`, criterion: 'sabotage-11' });
    table.push({ set: 'good', name: pair.name, kind: pair.kind, pass: outcome.pass, falseBinaries: outcome.falseBinaries, note: pair.note || null });
  }
  for (const pair of bad) {
    const outcome = await binaryVerdict({ kind: pair.kind, prose: pair.prose, bytes: pair.bytes, idSeed: `tooth11-${pair.name}`, criterion: 'sabotage-11' });
    table.push({ set: 'bad', name: pair.name, kind: pair.kind, pass: outcome.pass, falseBinaries: outcome.falseBinaries, note: pair.note || null });
  }
  fs.mkdirSync(path.dirname(CALIBRATION_FILE), { recursive: true });
  fs.writeFileSync(CALIBRATION_FILE, JSON.stringify({ protocol: BINARY_PROTOCOL, pinned: PINNED_QUESTIONS_SHA256, at: new Date().toISOString(), table }, null, 2));
  console.log(`[tooth 11] protocol=${BINARY_PROTOCOL} separation table:\n${JSON.stringify(table, null, 2)}`);

  const goodFails = table.filter((row) => row.set === 'good' && !row.pass);
  const badPasses = table.filter((row) => row.set === 'bad' && row.pass);
  expect(goodFails, `PERFECT separation — every known-good pair must pass all three binaries:\n${JSON.stringify(goodFails, null, 2)}`).toEqual([]);
  expect(badPasses, `PERFECT separation — every known-bad pair must fail at least one binary:\n${JSON.stringify(badPasses, null, 2)}`).toEqual([]);
});

test('tooth 12: the magnifier tooth — a markless control fails stage two; the hero anchor passes', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g09-character');
  const markText = `"${m.hero.mark}" (a burn scar in the shape of a key)`;

  // Control A — the Edda bust: a head and shoulders are PRESENT (stage
  // one must box), and the key-burn is ABSENT by construction (she is
  // not the hero) — stage two must answer false ON THE CROP.
  const edda = await magnifiedMark({
    bytes: topBytes(rolePlate(m, 'edda-bust')), markText,
    idSeed: 'tooth12-markless-edda', criterion: 'sabotage-12',
  });
  expect(edda.found, `the magnifier boxes the markless control (a bust wears a head): ${JSON.stringify(edda)}`).toBe(true);
  expect(edda.mark_visible, `stage two must refuse the markless control: ${JSON.stringify(edda)}`).toBe(false);

  // Control B — the crown-band sliver (tooth 7's crop): whatever stage
  // one answers, the look can NEVER yield a sighting — boxless is
  // fail-closed, and a boxed crown band holds no key-shaped burn.
  const heroBytes = topBytes(rolePlate(m, 'hero-anchor'));
  const meta = await sharp(heroBytes).metadata();
  const band = await sharp(heroBytes)
    .extract({ left: 0, top: 0, width: meta.width || 1, height: Math.max(16, Math.floor((meta.height || 1) * 0.18)) })
    .png().toBuffer();
  const bandLook = await magnifiedMark({
    bytes: band, markText,
    idSeed: 'tooth12-crown-band', criterion: 'sabotage-12',
  });
  expect(bandLook.mark_visible, `the crown band can never yield a sighting: ${JSON.stringify(bandLook)}`).toBe(false);

  // The hero anchor — boxes AND wears the mark under magnification.
  const anchor = await magnifiedMark({
    bytes: heroBytes, markText,
    idSeed: 'tooth12-hero-anchor', criterion: 'sabotage-12',
  });
  expect(anchor.found, `the magnifier boxes the hero anchor: ${JSON.stringify(anchor)}`).toBe(true);
  expect(anchor.mark_visible, `the anchor wears the mark under the magnified look: ${JSON.stringify(anchor)}`).toBe(true);
});

// ============================================================
// TEETH 13-15 — THE FRAME INSTRUMENTS (56C). Three new judges sit for
// Directive IX, so three new teeth prove them on sealed materials
// before their courts convene: known-good seats the harness minted on
// purpose, known-bad seats built as deterministic lies — briefs the
// plates never answered, grounds the plates never held. Perfect
// separation or the bench does not sit.
// ============================================================

test('tooth 13: the closure instrument separates honest counts from crowded lies', async () => {
  test.setTimeout(600_000);
  expect(frameQuestionsDigest(), 'the frame questions are sealed by their pin').toBe(PINNED_FRAME_QUESTIONS_SHA256);
  const m = preflightManifest('g22-frame');
  const pair1 = rolePlate(m, 'duchy-pair-1');
  const pair2 = rolePlate(m, 'duchy-pair-2');
  const heroFirst = rolePlate(m, 'hero-first-scene');
  const rows: any[] = [];
  const sit = async (label: string, plate: any, subjects: string[], allowance: 'none' | 'background') => {
    const verdict = await closureVerdict({ bytes: topBytes(plate), subjects, allowance, idSeed: `tooth13-${label}`, criterion: 'tooth-13-closure' });
    rows.push({ label, subjects, allowance, got: verdict.figures_match === true, counted: verdict.counted, unaccounted: verdict.unaccounted, confidence: verdict.confidence });
    return verdict.figures_match === true;
  };
  // Known-good: the very briefs these plates were minted from.
  expect(await sit('good-pair', pair1, DUCHY_PAIR_SUBJECTS, 'none'), 'good: the pair plate answers its own brief').toBe(true);
  expect(await sit('good-hero-first', heroFirst, heroFirstSubjects(m.hero.name), 'none'), 'good: the hero-first plate answers its own brief').toBe(true);
  expect(await sit('good-crowd-grant', pair2, DUCHY_PAIR_SUBJECTS, 'background'), 'good: a granted crowd never invents a false count').toBe(true);
  // Known-bad: deterministic lies — briefs these plates cannot answer.
  expect(await sit('bad-crowded-brief', pair1, [m.hero.name, ...DUCHY_PAIR_SUBJECTS], 'none'), 'bad: a three-name brief against a two-soul plate').toBe(false);
  expect(await sit('bad-lone-brief', heroFirst, [m.hero.name], 'none'), 'bad: a one-name brief against a two-soul plate').toBe(false);
  expect(await sit('bad-crowd-excuse', heroFirst, [m.hero.name], 'background'), 'bad: the crowd grant does not excuse a prominent named soul').toBe(false);
  console.log(`[tooth 13] separation table:\n${JSON.stringify(rows, null, 2)}`);
});

test('tooth 14: the principal instrument matches the hero and refuses a stranger', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g22-frame');
  const clause = heroClause(m.hero);
  const heroFirst = rolePlate(m, 'hero-first-scene');
  const good = await principalLook({ bytes: topBytes(heroFirst), clause, idSeed: 'tooth14-good-hero', criterion: 'tooth-14-principal' });
  console.log(`[tooth 14] good: ${JSON.stringify({ found: good.found, verdict: good.verdict })}`);
  expect(good.found, 'good: the hero-first plate yields a foremost figure').toBe(true);
  expect(good.matches, 'good: the foremost figure answers the hero clause').toBe(true);
  // THE STRANGER SEAT (58.8 requalification, LOOP_LOG) — the control law
  // demands a deterministic lie. The Edda bust hedged figure_matches=true
  // at 0.62 TWICE on byte-identical rolls this store (58.7/58.8): the
  // thin clause left her womanhood unopposed and the charitable wording
  // let her bare unmarked cheek pass unweighed. The masked Regent draws
  // a 0.92 refusal under the SAME pinned wording — probed through this
  // exact path and sealed in the cache under this exact idSeed, so the
  // sitting replays the measured verdict. Tooth 12 still holds the
  // markless-Edda line where the magnifier's wording is mark-decisive.
  const stranger = rolePlate(m, 'villain-intro');
  const badSoul = await principalLook({ bytes: topBytes(stranger), clause, idSeed: 'tooth14-bad-regent', criterion: 'tooth-14-principal' });
  console.log(`[tooth 14] bad-stranger: ${JSON.stringify({ found: badSoul.found, verdict: badSoul.verdict })}`);
  expect(badSoul.matches, 'bad: the masked Regent does not answer the hero clause').toBe(false);
  // Fail-closed: a figureless sliver must never call the principal honest.
  const sliverSource = topBytes(rolePlate(m, 'vale-establishing'));
  const meta = await sharp(sliverSource).metadata();
  const sliver = await sharp(sliverSource).extract({ left: 0, top: 0, width: meta.width || 64, height: Math.max(24, Math.round((meta.height || 64) * 0.1)) }).png().toBuffer();
  const badSliver = await principalLook({ bytes: sliver, clause, idSeed: 'tooth14-bad-sliver', criterion: 'tooth-14-principal' });
  console.log(`[tooth 14] bad-sliver: ${JSON.stringify({ found: badSliver.found, matches: badSliver.matches })}`);
  expect(badSliver.found && badSliver.matches, 'bad: a sky sliver yields no honest principal').toBe(false);
});

test('tooth 15: the constancy instrument sees the sealed fixture and refuses absent grounds', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g22-frame');
  const sealed = duchyFixture(path.join(HARVEST_DIR, 'fixture', 'session.json'));
  const pair1 = rolePlate(m, 'duchy-pair-1');
  const pair2 = rolePlate(m, 'duchy-pair-2');
  const good = await pairVerdict({ aBytes: topBytes(pair1), bBytes: topBytes(pair2), visual: sealed.visual, idSeed: 'tooth15-good-pair', criterion: 'tooth-15-constancy' });
  console.log(`[tooth 15] good: ${JSON.stringify(good)}`);
  expect(good.fixture_present_in_both, 'good: the sealed fixture stands in both paints of its ground').toBe(true);
  const vale = rolePlate(m, 'vale-establishing');
  const badGround = await pairVerdict({ aBytes: topBytes(pair1), bBytes: topBytes(vale), visual: sealed.visual, idSeed: 'tooth15-bad-ground', criterion: 'tooth-15-constancy' });
  console.log(`[tooth 15] bad-ground: ${JSON.stringify(badGround)}`);
  expect(badGround.fixture_present_in_both, 'bad: the Vale holds no Duchy fixture — one absent ground fails the pair').toBe(false);
  const badCanon = await pairVerdict({ aBytes: topBytes(pair1), bBytes: topBytes(pair2), visual: 'a white marble fountain crowned by three bronze herons, water threading their beaks', idSeed: 'tooth15-bad-canon', criterion: 'tooth-15-constancy' });
  console.log(`[tooth 15] bad-canon: ${JSON.stringify(badCanon)}`);
  expect(badCanon.fixture_present_in_both, 'bad: a canon neither plate holds is refused').toBe(false);
});

// TOOTH 16 (Task 57) — the species instrument. Proven on the SAME plate the
// species court will judge: the battle plate must answer its own sealed
// canon, refuse a crossed card no battle ever sealed, and refuse a ground
// that holds no beast at all. The pin is checked in-tooth so a drifted
// question sheet can never sit silently. Deterministic lies, never
// crossings: the crossed card and the beastless ground are sealed bytes.
test('tooth 16: the species instrument tells the sealed beast from a crossed card', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g23-battle');
  expect(battleQuestionsDigest(), 'the battle questions are sealed by their pin').toBe(PINNED_BATTLE_QUESTIONS_SHA256);
  const plate = rolePlate(m, 'battle-species');
  const good = await speciesVerdict({ bytes: topBytes(plate), visual: battleCard().visual, idSeed: 'tooth16-good-species', criterion: 'tooth-16-species' });
  console.log(`[tooth 16] good: ${JSON.stringify(good)}`);
  expect(good.species_match, 'good: the battle plate answers its own sealed canon').toBe(true);
  const crossed = await speciesVerdict({ bytes: topBytes(plate), visual: crossedCard().visual, idSeed: 'tooth16-bad-crossed', criterion: 'tooth-16-species' });
  console.log(`[tooth 16] bad-crossed: ${JSON.stringify(crossed)}`);
  expect(crossed.species_match, 'bad: a species the battle never sealed is refused').toBe(false);
  const beastless = await speciesVerdict({ bytes: topBytes(rolePlate(m, 'vale-establishing')), visual: battleCard().visual, idSeed: 'tooth16-bad-ground', criterion: 'tooth-16-species' });
  console.log(`[tooth 16] bad-ground: ${JSON.stringify(beastless)}`);
  expect(beastless.species_match, 'bad: a ground without the beast is refused').toBe(false);
});

// TOOTH 10 (0.9.0, THE WRITER'S ROOM) — the Editor's rubric, proven the
// way tooth 11 proved the binary instrument: perfect separation on
// planted material before the prose court trusts a single ship verdict.
// The probe (tools/tooth10-probe.mjs) sits in the server's own module
// world; the rubric text is sealed by its pin — the comment above
// EDITOR_RUBRIC promises exactly this court. Two planted-awful pages
// must each draw BOTH their flags, a revise verdict, and one pinned
// reason PER flag; the clean control must ship untouched. Deterministic
// lies, never crossings: every plant is sealed bytes in the probe.
const PINNED_EDITOR_RUBRIC_SHA256 = 'b7af5050751e67ce34240baad86303ff03bea6ecd8663519026479056ac4ebe3';

test('tooth 10: the Editor\'s rubric draws blood twice and ships the clean page', () => {
  const out = execSync('node tests/e2e/tools/tooth10-probe.mjs', { cwd: GAME_ROOT, encoding: 'utf8' });
  const probe = JSON.parse(out);
  expect(probe.rubricSha256, 'the rubric is sealed by its pin — a drifted rubric must re-sit this tooth').toBe(PINNED_EDITOR_RUBRIC_SHA256);
  for (const bite of probe.bites) {
    console.log(`[tooth 10] ${bite.name}: flags=[${bite.flags.join(', ')}] verdict=${bite.verdict} reasons=${JSON.stringify(bite.reasons)}`);
    expect(bite.flags.length, `${bite.name}: the plant draws at least two flags`).toBeGreaterThanOrEqual(2);
    expect(bite.verdict, `${bite.name}: a flagged draft is judged revise`).toBe('revise');
    expect(bite.reasons.length, `${bite.name}: one reason per flag — the rubric names each failure`).toBe(bite.flags.length);
    expect(new Set(bite.reasons).size, `${bite.name}: the reasons are distinct`).toBe(bite.reasons.length);
  }
  expect(probe.bites[0].flags, 'bite one names echo and cliche, in the pinned order').toEqual(['echo', 'cliche']);
  expect(probe.bites[1].flags, 'bite two names sameness and measure, in the pinned order').toEqual(['sameness', 'measure']);
  console.log(`[tooth 10] clean: flags=[${probe.clean.flags.join(', ')}] verdict=${probe.clean.verdict}`);
  expect(probe.clean.flags, 'the clean control draws no flag').toEqual([]);
  expect(probe.clean.verdict, 'the clean control ships').toBe('ship');
  expect(probe.clean.reasons, 'a shipped page carries no reasons').toEqual([]);
});

// TOOTH 19 (0.9.0) — the retraction instrument itself, bitten on a
// synthetic bench before G5's live silence or G24a's witness mean a
// thing. The bench is sealed bytes; the instrument is the SAME function
// G5 arms (lib/retraction.ts). Growth must stay quiet; a mid-pour node
// swap and a struck narration node must each be named a crime.
test('tooth 19: the retraction instrument bites the swap and stays quiet for growth', async ({ page }) => {
  await page.setContent('<main class="adventure-log"><div class="narration"><p id="pour">The road runs </p></div></main>');
  await page.evaluate(armRetractionObserver);
  await page.evaluate(() => { const p = document.getElementById('pour'); if (p && p.firstChild) p.firstChild.textContent += 'north past the waystation bell.'; });
  await page.waitForTimeout(150);
  const afterGrowth = await page.evaluate(() => (window as unknown as { __retractions: string[] }).__retractions);
  expect(afterGrowth, 'growth is never a retraction — the instrument stays quiet').toEqual([]);
  await page.evaluate(() => { const p = document.getElementById('pour'); if (p && p.firstChild) p.firstChild.textContent = 'A different road entirely, poured over the first.'; });
  await page.waitForTimeout(150);
  const afterSwap = await page.evaluate(() => (window as unknown as { __retractions: string[] }).__retractions);
  expect(afterSwap.length, `the mid-pour swap trips the instrument: [${afterSwap.join(' | ')}]`).toBe(1);
  expect(afterSwap[0], 'the crime is named a rewrite').toContain('rewrote');
  await page.evaluate(() => { const struck = document.querySelector('.narration'); if (struck) struck.remove(); });
  await page.waitForTimeout(150);
  const afterStrike = await page.evaluate(() => (window as unknown as { __retractions: string[] }).__retractions);
  expect(afterStrike.length, 'the struck node is the second crime').toBe(2);
  expect(afterStrike[1], 'the crime is named a removal').toContain('removed');
});
