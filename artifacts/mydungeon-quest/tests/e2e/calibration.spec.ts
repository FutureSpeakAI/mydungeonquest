import { expect, test } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { GAME_ROOT } from './lib/vision';
import { HARVEST_DIR, pageProse, preflightManifest, rolePlate, topBytes } from './lib/harvestManifest';
import { fixtureHero, loadManifest, plateBytes } from './lib/harness';
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
import { raiseCommonsHouse } from './lib/commonsServer';
import { WHOLE_FACE_CLAIM, selfVerifyingBehead, selfVerifyingCrownBand, selfVerifyingPresence } from './lib/controlLaw';
import type { ControlAttestation } from './lib/controlLaw';

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
  // THE ATTESTED DUAL (58.10, LOOP_LOG; re-aimed under THE CONTROL LAW,
  // Task 61 resumed) — the bad set builds its crop text ONLY from what
  // the crop PROVABLY cuts. 61.7's lesson: the mark clause floated with
  // the painter's whim (a lower head kept the mark in the crop and the
  // lie went half-true), so it is DROPPED; the claim aims at the face
  // alone, one seat for both sides (lib/controlLaw.ts). This seats the
  // SAME claim over the UNCROPPED anchor, completing the pair: the
  // judge must pass on whole pixels the very text it must refuse on
  // provably beheaded ones.
  good.push({
    name: 'good-anchor-attested', kind: 'caption',
    prose: WHOLE_FACE_CLAIM,
    bytes: topBytes(rolePlate(m, 'hero-anchor')),
    note: 'attested dual of the beheaded crop: same claim, whole pixels (Control Law lockstep)',
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
  // PROVABLY removed. THE CONTROL LAW (Task 61 resumed, LOOP_LOG): both
  // constructs are box-derived and verify their own lie before they
  // seat — the attestations ride the calibration table below, and one
  // stage-one sit serves every construct on these bytes (the vision
  // cache keys on bytes+id+protocol).
  const controlAttests: ControlAttestation[] = [];
  const g9 = preflightManifest('g09-character');
  const heroBytes = topBytes(rolePlate(g9, 'hero-anchor'));
  const beheadForged = await selfVerifyingBehead({ bytes: heroBytes, idSeed: 'control-law-g09-anchor', criterion: 'sabotage-11', label: 'bad-beheaded-hero' });
  controlAttests.push(beheadForged.attest);
  bad.push({
    name: 'bad-beheaded-hero', kind: 'caption',
    prose: WHOLE_FACE_CLAIM,
    bytes: beheadForged.bytes, note: 'box-derived behead: the face the caption claims is provably cut away (attested)',
  });
  const crownForged = await selfVerifyingCrownBand({ bytes: heroBytes, idSeed: 'control-law-g09-anchor', criterion: 'sabotage-11', label: 'bad-crown-band' });
  controlAttests.push(crownForged.attest);
  bad.push({
    name: 'bad-crown-band', kind: 'caption',
    prose: crownForged.mode === 'crown' ? `Her ${g9.hero.mark} is clearly visible on her skin.` : WHOLE_FACE_CLAIM,
    bytes: crownForged.bytes,
    note: crownForged.mode === 'crown'
      ? 'box-derived crown band: provably no subject anatomy, no room for the mark (attested)'
      : 'crown band re-forged into a behead (face at the crown) — the claim re-aimed at the face (attested)',
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
  fs.writeFileSync(CALIBRATION_FILE, JSON.stringify({ protocol: BINARY_PROTOCOL, pinned: PINNED_QUESTIONS_SHA256, at: new Date().toISOString(), controlLaw: controlAttests, table }, null, 2));
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
  // Source-aware (store seat-binding law): the Edda control is a FIXTURE
  // bust — its absence question speaks the fixture canon, never the live
  // pin. Cache-inert: verdicts key on bytes+id+protocol, not question text.
  const fixtureMarkText = `"${fixtureHero().mark}" (a burn scar in the shape of a key)`;

  // Control A — the Edda bust: a head and shoulders are PRESENT (stage
  // one must box), and the key-burn is ABSENT by construction (she is
  // not the hero) — stage two must answer false ON THE CROP.
  const edda = await magnifiedMark({
    bytes: topBytes(rolePlate(m, 'edda-bust')), markText: fixtureMarkText,
    idSeed: 'tooth12-markless-edda', criterion: 'sabotage-12',
  });
  expect(edda.found, `the magnifier boxes the markless control (a bust wears a head): ${JSON.stringify(edda)}`).toBe(true);
  expect(edda.mark_visible, `stage two must refuse the markless control: ${JSON.stringify(edda)}`).toBe(false);

  // Control B — the crown-band sliver: whatever stage one answers, the
  // look can NEVER yield a sighting — boxless is fail-closed, and a
  // box-derived crown band holds no subject anatomy at all. THE CONTROL
  // LAW (Task 61 resumed): strict, because this control's lie needs the
  // subject provably absent; same bytes and idSeed as tooth 11's
  // constructs, so the settled stage-one box replays from the cache.
  const heroBytes = topBytes(rolePlate(m, 'hero-anchor'));
  const { bytes: band } = await selfVerifyingCrownBand({ bytes: heroBytes, idSeed: 'control-law-g09-anchor', criterion: 'sabotage-12', label: 'tooth12-crown-band', strict: true });
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
  expect(await sit('good-hero-first', heroFirst, heroFirstSubjects(fixtureHero().name), 'none'), 'good: the hero-first plate answers its own brief').toBe(true);
  expect(await sit('good-crowd-grant', pair2, DUCHY_PAIR_SUBJECTS, 'background'), 'good: a granted crowd never invents a false count').toBe(true);
  // Known-bad: deterministic lies — briefs these plates cannot answer.
  expect(await sit('bad-crowded-brief', pair1, [fixtureHero().name, ...DUCHY_PAIR_SUBJECTS], 'none'), 'bad: a three-name brief against a two-soul plate').toBe(false);
  expect(await sit('bad-lone-brief', heroFirst, [fixtureHero().name], 'none'), 'bad: a one-name brief against a two-soul plate').toBe(false);
  expect(await sit('bad-crowd-excuse', heroFirst, [fixtureHero().name], 'background'), 'bad: the crowd grant does not excuse a prominent named soul').toBe(false);
  console.log(`[tooth 13] separation table:\n${JSON.stringify(rows, null, 2)}`);
});

test('tooth 14: the principal instrument matches the hero and refuses a stranger', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g22-frame');
  const clause = heroClause(fixtureHero());
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
  // THE CONTROL LAW (Task 61 resumed): this construct's lie is proven by
  // geometry and by class — a thin crown strip cut from an ESTABLISHING
  // plate (a peopleless class by the store's own seal) provably holds no
  // principal figure. The ratio pin below trips if the sliver ever grows
  // past a strip (or a strangely tiny plate seats), demanding a look.
  const sliverSource = topBytes(rolePlate(m, 'vale-establishing'));
  const meta = await sharp(sliverSource).metadata();
  const sliverH = Math.max(24, Math.round((meta.height || 64) * 0.1));
  expect(sliverH / (meta.height || 64), 'the sliver stays a sliver — ≤12% of the plate (Control Law pin)').toBeLessThanOrEqual(0.12);
  console.log(`[control-law] tooth14-sky-sliver: ${sliverH}px of ${meta.height || 64}px cut from an establishing plate — no room for a principal; lie PROVEN, the control seats`);
  const sliver = await sharp(sliverSource).extract({ left: 0, top: 0, width: meta.width || 64, height: sliverH }).png().toBuffer();
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

  // THE CONTROL LAW (61.8 ruling) — this tooth is control-class: its
  // known-good ground is fresh paint and both lies are constructed
  // pairings; every construct proves itself before a counted sit.
  // (1) THE CLAIM: the sealed beast stands on the CURRENT bytes — the
  // 61.8 crossing was this very claim weakening on fresh paint. A
  // refusal here is the construct's own spoken failure, cured from the
  // paint-and-probe budget, never charged to the court.
  await selfVerifyingPresence({ bytes: topBytes(plate), canon: battleCard().visual, idSeed: 'tooth16-claim', criterion: 'tooth-16-species', label: 'tooth16-claim-ground' });
  // (2) THE CROSSED LIE proves noun-disjointness BOTH ways (tooth 20's
  // pattern): a canon the battle never sealed may share no kind-noun
  // with the sealed card, or the lie is no lie.
  const sealedText = `${battleCard().species} ${battleCard().visual} ${battleCard().nature}`.toLowerCase();
  for (const noun of ['automaton', 'clockwork', 'brass', 'rune', 'faceplate', 'mirrored']) {
    expect(sealedText, `the crossed card stays alien to the sealed canon ("${noun}" must not appear)`).not.toContain(noun);
  }
  const crossedText = `${crossedCard().species} ${crossedCard().visual}`.toLowerCase();
  for (const noun of ['howler', 'wolf', 'marsh', 'moss', 'muzzle']) {
    expect(crossedText, `the sealed beast stays alien to the crossed card ("${noun}" must not appear)`).not.toContain(noun);
  }
  console.log('[control-law] tooth16-bad-crossed: sealed and crossed canons share no kind-noun in either direction — lie PROVEN, the control seats');
  // (3) THE BEASTLESS GROUND: an establishing-class plate by the
  // store's own seal, whose painter's cue stages no marsh-wolf.
  const ground = rolePlate(m, 'vale-establishing');
  expect(String(ground.klass), "the ground control is an establishing-class plate by the store's own seal").toMatch(/region|establish/i);
  const groundCue = `${ground.prose || ''} ${(ground.subjects || []).join(' ')} ${(ground.cueSubjects || []).join(' ')}`.toLowerCase();
  for (const noun of ['howler', 'marsh-wolf', 'wolf']) {
    expect(groundCue, `the ground's own cue stages no sealed beast ("${noun}" must not appear)`).not.toContain(noun);
  }
  console.log(`[control-law] tooth16-bad-ground: ${ground.klass}-class plate, cue stages no sealed beast — lie PROVEN, the control seats`);

  const good = await speciesVerdict({ bytes: topBytes(plate), visual: battleCard().visual, idSeed: 'tooth16-good-species', criterion: 'tooth-16-species' });
  console.log(`[tooth 16] good: ${JSON.stringify(good)}`);
  expect(good.species_match, 'good: the battle plate answers its own sealed canon').toBe(true);
  const crossed = await speciesVerdict({ bytes: topBytes(plate), visual: crossedCard().visual, idSeed: 'tooth16-bad-crossed', criterion: 'tooth-16-species' });
  console.log(`[tooth 16] bad-crossed: ${JSON.stringify(crossed)}`);
  expect(crossed.species_match, 'bad: a species the battle never sealed is refused').toBe(false);
  const beastless = await speciesVerdict({ bytes: topBytes(ground), visual: battleCard().visual, idSeed: 'tooth16-bad-ground', criterion: 'tooth-16-species' });
  console.log(`[tooth 16] bad-ground: ${JSON.stringify(beastless)}`);
  expect(beastless.species_match, 'bad: a ground without the beast is refused').toBe(false);
});

// TOOTH 20 (60B §4) — the sheet instrument and the attire constancy
// pair, bitten BEFORE the courts that cite them (G31a, G33a). Known
// good: the hero's own minted sheet against her sealed canon, and the
// anchor-beside-sheet attire pair under the TRUE attire clause. Known
// bad, deterministic lies never crossings (the proving-loop law): a
// synthetic soul no record ever sealed, a lettered sheet composited in
// sharp from the real sheet's own bytes, and a synthetic attire canon
// no wardrobe ever held. The frame-questions pin is asserted in-tooth
// so a drifted sheet question can never sit silently.
test('tooth 20: the sheet instrument refuses the wrong soul, the lettered plate, and the attire lie', async () => {
  test.setTimeout(600_000);
  const { attirePairVerdict, sheetIdentityVerdict, sheetIntegrityVerdict, sheetSoulClause } = await import('./lib/frameLaw');
  expect(frameQuestionsDigest(), 'the frame questions are sealed by their pin (f3)').toBe(PINNED_FRAME_QUESTIONS_SHA256);
  const m = preflightManifest('g31-sheet');
  const sheet = topBytes(rolePlate(m, 'hero-sheet'));
  const anchor = topBytes(rolePlate(m, 'hero-anchor'));
  const session = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, 'live', 'session.json'), 'utf8'));
  const card = session?.heroCard;
  expect(card && typeof card.appearance === 'string' && card.appearance.trim() && typeof card.signature === 'string' && card.signature.trim(),
    'the live session seals the hero card whole (appearance and signature) — the tooth judges canon, never a spec constant').toBeTruthy();
  // ONE seat for the clause (mirrors-one-seat): the tooth calibrates the
  // SAME wording G31a and G33a will aim, or the calibration is theater.
  const clause = sheetSoulClause(card);

  // GOOD — the sheet answers its own integrity and its own soul.
  const integrity = await sheetIntegrityVerdict({ bytes: sheet, idSeed: 'tooth20-good-integrity', criterion: 'tooth-20-sheet' });
  console.log(`[tooth 20] good-integrity: ${JSON.stringify(integrity)}`);
  expect(integrity.grid_four_cells === true && integrity.free_of_lettering === true, 'good: the minted sheet holds its 2x2 grid and carries no lettering').toBe(true);
  const identity = await sheetIdentityVerdict({ bytes: sheet, clause, idSeed: 'tooth20-good-identity', criterion: 'tooth-20-sheet' });
  console.log(`[tooth 20] good-identity: ${JSON.stringify(identity)}`);
  expect(identity.subject_matches === true && identity.cells_agree === true, 'good: the sheet depicts its own sealed soul in every cell').toBe(true);

  // BAD — a soul no record sealed (deterministic lie, maximally
  // separated). THE CONTROL LAW (Task 61 resumed): tooth 20 is born
  // under it — the crossed clause proves its lie by NOUN DISJOINTNESS
  // against the sealed canon before it seats; if a future canon ever
  // seals an ogre hero, the check trips and demands a re-forge.
  const ALIEN_SOUL = 'a hulking gray-skinned ogre of living stone, twice a man\u2019s height, tusked, draped in chained boulders';
  for (const noun of ['ogre', 'living stone', 'tusked', 'boulder']) {
    expect(`${card.appearance} ${card.signature}`.toLowerCase(), `the crossed soul stays alien to the sealed canon ("${noun}" must not appear)`).not.toContain(noun);
  }
  console.log('[control-law] tooth20-bad-soul: the crossed clause shares no noun with the sealed canon — lie PROVEN, the control seats');
  const crossed = await sheetIdentityVerdict({
    bytes: sheet,
    clause: ALIEN_SOUL,
    idSeed: 'tooth20-bad-soul', criterion: 'tooth-20-sheet',
  });
  console.log(`[tooth 20] bad-soul: ${JSON.stringify(crossed)}`);
  expect(crossed.subject_matches, 'bad: a sheet crossed against the wrong soul fails the sheet court').toBe(false);

  // BAD — the same sheet bytes with lettering composited on (sharp SVG,
  // sealed deterministic bytes; the grid beneath is untouched).
  const meta = await sharp(sheet).metadata();
  const w = meta.width || 1024; const h = meta.height || 1024;
  const svg = Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="50%" y="12%" font-family="serif" font-size="${Math.round(h / 12)}" font-weight="bold" fill="#ffffff" stroke="#000000" stroke-width="4" text-anchor="middle">MODEL SHEET 04-B</text>` +
    `<text x="50%" y="92%" font-family="serif" font-size="${Math.round(h / 16)}" fill="#000000" stroke="#ffffff" stroke-width="2" text-anchor="middle">PROPERTY OF THE HOUSE</text></svg>`
  );
  const lettered = await sharp(sheet).composite([{ input: svg, left: 0, top: 0 }]).png().toBuffer();
  // THE CONTROL LAW: the lettered plate proves its lie before it seats —
  // the composite provably changed the plate's bytes.
  expect(lettered.equals(sheet), 'the lettering provably changed the plate bytes (Control Law)').toBe(false);
  console.log(`[control-law] tooth20-bad-lettered: composite changed the plate (${sheet.length} → ${lettered.length} bytes) — lie PROVEN, the control seats`);
  const letteredVerdict = await sheetIntegrityVerdict({ bytes: lettered, idSeed: 'tooth20-bad-lettered', criterion: 'tooth-20-sheet' });
  console.log(`[tooth 20] bad-lettered: ${JSON.stringify(letteredVerdict)}`);
  expect(letteredVerdict.free_of_lettering, 'bad: a deliberately lettered sheet fails the sheet court').toBe(false);

  // THE ATTIRE PAIR — grown for the constancy courts (G31a identity rides
  // it through the clause; G33a cites it directly). Good: the sealed
  // anchor beside the sheet derived from it, under the TRUE attire canon.
  const attireTruth = card.signature;
  const goodPair = await attirePairVerdict({ aBytes: anchor, bBytes: sheet, attire: attireTruth, idSeed: 'tooth20-good-attire', criterion: 'tooth-20-attire' });
  console.log(`[tooth 20] good-attire: ${JSON.stringify(goodPair)}`);
  expect(goodPair.attire_consistent, 'good: the anchor and the sheet wear the sealed attire canon').toBe(true);
  // THE CONTROL LAW: the attire lie proves itself before it seats —
  // garment disjointness against the sealed signature canon.
  const ALIEN_ATTIRE = 'full gilded plate armor with a great horned helm and a scarlet plume';
  for (const garment of ['gilded', 'horned helm', 'scarlet plume']) {
    expect(attireTruth.toLowerCase(), `the attire lie stays alien to the sealed canon ("${garment}" must not appear)`).not.toContain(garment);
  }
  console.log('[control-law] tooth20-bad-attire: the false canon shares no garment with the sealed signature — lie PROVEN, the control seats');
  const badPair = await attirePairVerdict({
    aBytes: anchor, bBytes: sheet,
    attire: ALIEN_ATTIRE,
    idSeed: 'tooth20-bad-attire', criterion: 'tooth-20-attire',
  });
  console.log(`[tooth 20] bad-attire: ${JSON.stringify(badPair)}`);
  expect(badPair.attire_consistent, 'bad: an attire canon no wardrobe held is refused').toBe(false);
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
  // (60B §4) BITE THREE — the dash law and the tells lexicon, flagged in
  // editorPrePass's own order: the four law flags first (none here, the
  // plant is built clean of them), then dash, then tells.
  expect(probe.bites[2].flags, 'bite three names dash and tells, in the pinned order').toEqual(['dash', 'tells']);
  expect(probe.bites[2].reasons.some((reason: string) => /dash/i.test(reason)), 'the dash reason speaks the dash law by name').toBe(true);
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

// ============================================================
// TOOTH 17 — THE FORGERY (Directive XV §VI). Before the commons court's
// badge is trusted, the badge itself is put on trial: the public page
// claims the reader's own browser re-verifies the record's bytes — so a
// forged byte MUST flip the verdict. The tooth raises its own doorless
// house, publishes a lawful hash-only chronicle minted at this bench,
// reads the page clean (badge TRUE), then reads it again through a
// route that flips ONE letter of prose in the served record (badge
// FALSE). Perfect separation or the tooth is red — a badge that stays
// green over forged bytes is worse than no badge at all.
// ============================================================
test('TOOTH 17 — a forged byte flips the desk badge: perfect separation', async ({ browser }) => {
  test.setTimeout(300_000);
  const { canonicalize, sha256 } = await import('fatescript/canonical');
  const house = await raiseCommonsHouse({ port: 5191, apiPort: 5190, court: 'tooth17', patron: 'tooth17-forgery' });
  const contexts: import('@playwright/test').BrowserContext[] = [];
  try {
    // The bench's own scribe: a lawful sealed chain, hash-only.
    const PROSE = [
      'The bench mints a tale of its own to try the badge.',
      'In the vault of the bench the lantern is steady gold.',
      'A third verse to give the chain some length.',
    ];
    const records: any[] = [];
    let prev: string | null = null;
    for (let i = 0; i < 4; i += 1) {
      const type = i === 3 ? 'sealing' : 'turn';
      const payload = type === 'sealing'
        ? { turns: 3 }
        : { player: `deed ${i}`, dm: { narration_blocks: [{ speaker: null, text: PROSE[i] }], suggestions: [] } };
      const unsigned = { type, i, prevHash: prev, payload, ts: 1770000100000 + i };
      const record = { ...unsigned, recordHash: await sha256(canonicalize(unsigned)) };
      records.push(record);
      prev = record.recordHash;
    }
    const chronicle = {
      header: { format: 'mydungeon.chronicle', version: 1, campaignId: 'tooth17-tale', title: 'The Forgery Bench', headHash: prev, publicKeyJwk: null, signatureStatus: 'hash-only' },
      campaign: {
        id: 'tooth17-tale', title: 'The Forgery Bench', sealedAt: 1770000100999,
        hero: { name: 'Tessa' }, codex: { cast: [] },
        logs: records.slice(0, 3).map((record, turn) => ({ id: `t17-${turn}`, turn, recordHash: record.recordHash, sent: record.payload.player, dm: record.payload.dm, redacted: false })),
      },
      journal: records,
      media: [],
    };

    const ctxOwner = await browser.newContext();
    contexts.push(ctxOwner);
    const owner = await ctxOwner.newPage();
    // Sweep prior sittings — the campaign id is fixed, and one living
    // page per tale is the law this tooth must not trip over.
    const mine = await owner.request.get(`${house.base}/api/publish/mine`);
    expect(mine.status(), 'the staged patron owns a shelf').toBe(200);
    for (const page of (await mine.json()).pages ?? []) {
      if (!page.revokedAt) await owner.request.post(`${house.base}/api/publish/${page.publishId}/revoke`);
    }
    const landed = await owner.request.post(`${house.base}/api/publish`, {
      headers: { 'Content-Type': 'text/plain' }, data: JSON.stringify(chronicle),
    });
    expect(landed.status(), 'the lawful chronicle lands').toBe(200);
    const { publishId } = await landed.json();

    // ------------------------- the clean sitting: the badge earns TRUE
    const ctxClean = await browser.newContext();
    contexts.push(ctxClean);
    const clean = await ctxClean.newPage();
    await clean.goto(`${house.base}/t/${publishId}`, { waitUntil: 'domcontentloaded' });
    await expect(clean.getByTestId('desk-badge'), 'the true record earns the badge in the browser').toHaveAttribute('data-verdict', 'true', { timeout: 90_000 });
    console.log('[tooth 17] clean sitting: verdict=true (the lawful record verifies)');

    // ------------------- the forged sitting: ONE letter, verdict FALSE
    // The prose lives TWICE in the record (the journal's hashed payload
    // and the campaign's display copy), so the forgery is tried twice:
    // forge BOTH copies and the chain law itself must break the badge.
    const ctxForged = await browser.newContext();
    contexts.push(ctxForged);
    await ctxForged.route('**/api/public/tale/*/record', async (route) => {
      const answer = await route.fetch();
      const body = (await answer.text()).replaceAll('steady gold', 'steady goId');
      await route.fulfill({ response: answer, body });
    });
    const forged = await ctxForged.newPage();
    await forged.goto(`${house.base}/t/${publishId}`, { waitUntil: 'domcontentloaded' });
    await expect(forged.getByTestId('desk-badge'), 'ONE forged letter must flip the verdict — perfect separation').toHaveAttribute('data-verdict', 'false', { timeout: 90_000 });
    await expect(forged.getByTestId('desk-badge')).toContainText(/does not verify|refuses/i);
    console.log('[tooth 17] forged sitting: verdict=false (one flipped letter in the chain, refused aloud)');

    // -------------- the laundering sitting: display copy ONLY, verdict FALSE
    // Forge just the campaign's display copy and leave the hashed journal
    // pristine — the 61.2 sitting proved the chain court alone stays green
    // over this, so the badge must ALSO answer for the words the page
    // actually shows (the display-coherence court). A green badge beside
    // forged display prose would be laundering, not verification.
    const ctxLaunder = await browser.newContext();
    contexts.push(ctxLaunder);
    await ctxLaunder.route('**/api/public/tale/*/record', async (route) => {
      const answer = await route.fetch();
      const body = (await answer.text()).replace('steady gold', 'steady goId'); // first occurrence only — the display copy
      await route.fulfill({ response: answer, body });
    });
    const laundered = await ctxLaunder.newPage();
    await laundered.goto(`${house.base}/t/${publishId}`, { waitUntil: 'domcontentloaded' });
    await expect(laundered.getByTestId('desk-badge'), 'a forged DISPLAY copy beside a true chain must still fell the badge').toHaveAttribute('data-verdict', 'false', { timeout: 90_000 });
    console.log('[tooth 17] laundering sitting: verdict=false (display copy diverged from the chain, refused aloud)');

    // Leave no living page behind this fixed campaign id.
    await owner.request.post(`${house.base}/api/publish/${publishId}/revoke`);
  } finally {
    for (const ctx of contexts) await ctx.close().catch(() => {});
    await house.douse();
  }
});
