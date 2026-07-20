import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_ROOT, judge, noteLowConfidence, noteNear } from './lib/vision';
import {
  HARVEST_DIR, preflightManifest, rolePlate, sha256Hex, topBytes
} from './lib/harvestManifest';
import type { TopManifest, TopPlate } from './lib/harvestManifest';
import { markLaw } from './lib/markLaw';
import { fixtureHero } from './lib/harness';
import { magnifiedMark } from './lib/magnifier';

// ============================================================
// G9 — CHARACTER CONSTANCY, restated by TASK 53 Move One as a1–a4 (the
// ONE sanctioned test change of this loop):
//   a1  the mark is HARD law at portrait distance;
//   a2  identity + presentation are HARD law on every hero-bearing plate;
//   a3  at scene distance the mark may hide only on the sealed record's
//       say-so (the attested lack, bound by assetHash); judge-sees-mark
//       AND attested-lack together = YELLOW warden disagreement (pass);
//       markless AND attested-SEEN is the MIRROR disagreement (54.5) —
//       the record spoke and was CONTRADICTED: it FAILS, named as a
//       warden–judge contradiction (the review round refused the first
//       draft's yellow here — widening acceptance is weakening);
//   a4  markless with NO signature-bearing attestation at all fails
//       NAMING the attestation path — that red is reserved for silence.
// This court reads only the harvest store. One judge call per hero scene
// serves a2 — identity and presentation. (TASK 54B §3) The MARK is no
// longer asked at full-plate distance anywhere: every mark examination
// is THE MAGNIFIED LOOK — the same two-stage instrument the production
// repaint warden holds (head-and-shoulders box, sharp crop at stated
// padding, one mark question on the crop alone). Tooth 12 proves the
// magnifier can tell a markless control from the hero anchor before
// this court sits — the ladder enforces the order.
// ============================================================

const YELLOW_FILE = path.join(GAME_ROOT, 'test-results', 'yellow.ndjson');

test('G09 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g09-character');
});

function heroScenes(m: TopManifest): TopPlate[] {
  return m.plates.filter((p) => p.role === 'scene' && p.heroBearing);
}

function attestedLackFor(m: TopManifest, hash: string): boolean {
  const record = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.recordLive), 'utf8'));
  const rows = (record.journal || []).filter((row: any) => row.type === 'media_attestation');
  return rows.some((row: any) => row.payload?.assetHash === hash && row.payload?.warden && row.payload.warden.signature === false);
}

/** (54.5) The mirror scan: an attestation claiming the mark SEEN. */
function attestedSeenFor(m: TopManifest, hash: string): boolean {
  const record = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.recordLive), 'utf8'));
  const rows = (record.journal || []).filter((row: any) => row.type === 'media_attestation');
  return rows.some((row: any) => row.payload?.assetHash === hash && row.payload?.warden && row.payload.warden.signature === true);
}

/** ONE call per hero-bearing plate for a2 — identity and presentation.
 * (54B §3) mark_visible left this look for the magnified instrument;
 * the protocol bump re-keys the cache lawfully (§4). */
async function heroPlateVerdict(m: TopManifest, plate: TopPlate) {
  // Source-aware (store seat-binding law): the fixture bust row speaks the
  // FIXTURE canon; live rows speak the live hero. The cross-store FACE
  // pairing itself (fixture bust vs live anchor) is the court's designed
  // premise — both paint from harmonized canon — and stands unchanged.
  const presentation = plate.role === 'hero-bust-fixture' ? fixtureHero().presentation : m.hero.presentation;
  return judge({
    id: `g09-a2a3-${String(plate.assetHash).slice(0, 16)}`,
    protocol: 'p2',
    criterion: 'g09-a2a3-hero-constancy',
    images: [topBytes(rolePlate(m, 'hero-anchor')), topBytes(plate)],
    question: `Image 1 is the portrait anchor of the hero: a ${presentation}-presenting figure. Image 2 is another plate of the same story. Answer: same_character — is the anchor's character present in image 2 (same face, hair, build, wardrobe language)? presentation_matches — does the character's gender presentation in image 2 match image 1?`,
    schema: { same_character: 'boolean', presentation_matches: 'boolean', confidence: 'number 0..1' }
  });
}

/** The one mark text, quoted identically at every distance. */
function heroMarkText(m: TopManifest): string {
  return `"${m.hero.mark}" (a burn scar in the shape of a key)`;
}

/** Fixture-store seats speak the fixture canon's mark (store seat-binding law). */
function fixtureHeroMarkText(): string {
  return `"${fixtureHero().mark}" (a burn scar in the shape of a key)`;
}

test('G9 a1: the mark is HARD law at portrait distance — under the magnified look', async () => {
  test.setTimeout(300_000);
  const m = preflightManifest('g09-character');
  for (const role of ['hero-anchor', 'hero-bust-fixture']) {
    const plate = rolePlate(m, role);
    const look = await magnifiedMark({
      bytes: topBytes(plate),
      markText: role === 'hero-bust-fixture' ? fixtureHeroMarkText() : heroMarkText(m),
      idSeed: `g09-a1-${role}-${String(plate.assetHash).slice(0, 12)}`,
      criterion: 'g09-a1-mark-at-portrait-distance',
    });
    expect(look.found, `${role}: the magnifier must box a head and shoulders on a bust portrait`).toBe(true);
    expect(look.mark_visible, `${role} must wear the mark under the magnified look: ${JSON.stringify(look)}`).toBe(true);
    expect(look.confidence, `${role} mark confidence (stage two)`).toBeGreaterThanOrEqual(0.75);
    noteNear(`g09-a1-${role}`, look.confidence, 0.75, 'min');
    noteLowConfidence(`g09-a1-${role}`, look.confidence);
  }
});

test('G9 a2: identity and presentation are HARD law on every hero-bearing plate', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g09-character');
  const plates: { name: string; plate: TopPlate }[] = [
    { name: 'hero-bust-fixture', plate: rolePlate(m, 'hero-bust-fixture') },
    ...heroScenes(m).map((plate) => ({ name: `scene ${plate.file}`, plate })),
  ];
  const failures: any[] = [];
  for (const { name, plate } of plates) {
    const verdict = await heroPlateVerdict(m, plate);
    if (!verdict.same_character || !verdict.presentation_matches || Number(verdict.confidence) < 0.75) {
      failures.push({ plate: name, verdict });
    }
    noteNear(`g09-a2-${plate.file}`, Number(verdict.confidence), 0.75, 'min');
    noteLowConfidence(`g09-a2-${plate.file}`, Number(verdict.confidence));
  }
  expect(failures, `every hero-bearing plate holds face and presentation:\n${JSON.stringify(failures, null, 2)}`).toEqual([]);
});

test('G9 a3/a4: at scene distance the mark is visible OR its lack is attested — never silently absent', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g09-character');
  const rulings: any[] = [];
  const failures: any[] = [];
  for (const plate of heroScenes(m)) {
    // The attestation scans read recordLive ONLY. A fixture hero-bearing
    // scene would be routed silently wrong — fail loud instead (review
    // round): source-aware routing must land before fixture heroes sit here.
    if (!String(plate.file).startsWith('live/')) {
      throw new Error(`G9 a3/a4: ${plate.file} — attestation scan is recordLive-only; a fixture hero-bearing scene cannot sit this court until the scan routes by source`);
    }
    const bytes = topBytes(plate);
    const hash = sha256Hex(bytes);
    expect(hash, `content address holds for ${plate.file}`).toBe(plate.assetHash);
    // (54B §3) The court's mark examination is THE MAGNIFIED LOOK — the
    // same two-stage instrument the production warden holds. The identity
    // look (a2's call) no longer answers for the mark.
    const look = await magnifiedMark({
      bytes,
      markText: heroMarkText(m),
      idSeed: `g09-a3-mag-${String(plate.assetHash).slice(0, 12)}`,
      criterion: 'g09-a3-magnified-mark',
    });
    const ruling = markLaw({
      plate: plate.file,
      assetHash: hash,
      markVisible: look.mark_visible === true,
      attestedLack: attestedLackFor(m, hash),
      attestedSeen: attestedSeenFor(m, hash),
    });
    rulings.push({ plate: plate.file, boxed: look.found, mark_visible: look.mark_visible, ruling: ruling.verdict });
    if (ruling.verdict === 'yellow') {
      fs.appendFileSync(YELLOW_FILE, JSON.stringify({
        at: new Date().toISOString(), criterion: 'g09-a3-warden-disagreement', plate: plate.file, note: ruling.note
      }) + '\n');
    }
    if (ruling.verdict === 'fail') failures.push({ plate: plate.file, reason: ruling.reason, verdict: ruling.verdict, mark_visible: look.mark_visible });
  }
  console.log(`[g09 a3] rulings: ${JSON.stringify(rulings)}`);
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
});

test('G9b the villain holds his face from intro to a later plate', async () => {
  test.setTimeout(180_000);
  const m = preflightManifest('g09-character');
  const verdict = await judge({
    id: 'g09b-villain-constancy', criterion: 'g09b-villain-constancy',
    images: [topBytes(rolePlate(m, 'villain-intro')), topBytes(rolePlate(m, 'villain-later'))],
    question: 'Image 1 is a character\'s introduction portrait. Image 2 is a later plate of the same story. Is the same character depicted in both (same face, features, silhouette, costume language)?',
    schema: { same_character: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.same_character, JSON.stringify(verdict)).toBe(true);
  expect(Number(verdict.confidence)).toBeGreaterThanOrEqual(0.75);
  noteNear('g09b-confidence', Number(verdict.confidence), 0.75, 'min');
  noteLowConfidence('g09b', Number(verdict.confidence));
});

test('G9c the Edda regression: feminine, elder, forever', async () => {
  test.setTimeout(180_000);
  const m = preflightManifest('g09-character');
  const verdict = await judge({
    id: 'g09c-edda-regression', criterion: 'g09c-edda-regression',
    images: [topBytes(rolePlate(m, 'edda-bust'))],
    question: 'State the apparent presentation and age band of this figure.',
    schema: { presentation: 'feminine|masculine|androgynous', age_band: 'child|young adult|adult|elder', confidence: 'number 0..1' }
  });
  expect(String(verdict.presentation).toLowerCase(), JSON.stringify(verdict)).toContain('feminine');
  expect(String(verdict.age_band).toLowerCase(), JSON.stringify(verdict)).toContain('elder');
  noteLowConfidence('g09c', Number(verdict.confidence));
});
