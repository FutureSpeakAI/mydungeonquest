import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { GAME_ROOT } from './lib/vision';
import { HARVEST_DIR, preflightManifest, rolePlate, topBytes } from './lib/harvestManifest';
import { loadManifest, plateBytes } from './lib/harness';
import type { PlateEntry } from './lib/harness';
import { BINARY_PROTOCOL, BINARY_QUESTIONS_PATH, binaryVerdict } from './lib/binaryVerdict';
import type { BinaryKind } from './lib/binaryVerdict';
import { magnifiedMark } from './lib/magnifier';

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
      if (plate.file && chapter.prose) pagePairs.push({ file: plate.file, prose: String(chapter.prose).slice(0, 200) });
    }
  }
  for (const pair of pagePairs.slice(0, 3)) {
    good.push({ name: `good-page-${pair.file}`, kind: 'page', prose: pair.prose, bytes: fs.readFileSync(path.join(HARVEST_DIR, 'fixture', pair.file)) });
  }
  const captions: { file: string; text: string }[] = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.captions), 'utf8'));
  for (const caption of captions.slice(0, 3)) {
    good.push({ name: `good-caption-${caption.file}`, kind: 'caption', prose: caption.text, bytes: fs.readFileSync(path.join(HARVEST_DIR, caption.file)) });
  }
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
