import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_ROOT, judge, noteLowConfidence, noteNear } from './lib/vision';
import {
  HARVEST_DIR, preflightManifest, rolePlate, sha256Hex, topBytes
} from './lib/harvestManifest';
import type { TopManifest, TopPlate } from './lib/harvestManifest';
import { markLaw } from './lib/markLaw';

// ============================================================
// G9 — CHARACTER CONSTANCY, restated by TASK 53 Move One as a1–a4 (the
// ONE sanctioned test change of this loop):
//   a1  the mark is HARD law at portrait distance;
//   a2  identity + presentation are HARD law on every hero-bearing plate;
//   a3  at scene distance the mark may hide only on the sealed record's
//       say-so (the attested lack, bound by assetHash); judge-sees-mark
//       AND attested-lack together = YELLOW warden disagreement (pass);
//   a4  markless with NO attestation fails NAMING the attestation path.
// This court reads only the harvest store. One judge call per hero scene
// serves a2 and a3 — the vision cache binds them to the same verdict.
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

/** ONE call per hero-bearing plate, shared by a2 and a3 through the
 * deterministic judge cache (same id + same bytes = same verdict). */
async function heroPlateVerdict(m: TopManifest, plate: TopPlate) {
  return judge({
    id: `g09-a2a3-${String(plate.assetHash).slice(0, 16)}`,
    criterion: 'g09-a2a3-hero-constancy',
    images: [topBytes(rolePlate(m, 'hero-anchor')), topBytes(plate)],
    question: `Image 1 is the portrait anchor of the hero: a ${m.hero.presentation}-presenting figure whose distinguishing mark is "${m.hero.mark}" (a key-shaped burn scar). Image 2 is another plate of the same story. Answer: same_character — is the anchor's character present in image 2 (same face, hair, build, wardrobe language)? mark_visible — is the key-shaped burn mark visible on that character in image 2? presentation_matches — does the character's gender presentation in image 2 match image 1?`,
    schema: { same_character: 'boolean', mark_visible: 'boolean', presentation_matches: 'boolean', confidence: 'number 0..1' }
  });
}

test('G9 a1: the mark is HARD law at portrait distance', async () => {
  test.setTimeout(300_000);
  const m = preflightManifest('g09-character');
  for (const role of ['hero-anchor', 'hero-bust-fixture']) {
    const plate = rolePlate(m, role);
    const verdict = await judge({
      id: `g09-a1-${role}-${String(plate.assetHash).slice(0, 12)}`,
      criterion: 'g09-a1-mark-at-portrait-distance',
      images: [topBytes(plate)],
      question: `This is a bust portrait of a hero whose distinguishing mark is "${m.hero.mark}" (a burn scar in the shape of a key). Is that mark clearly visible on the figure?`,
      schema: { mark_visible: 'boolean', confidence: 'number 0..1' }
    });
    expect(verdict.mark_visible, `${role} must wear the mark at portrait distance: ${JSON.stringify(verdict)}`).toBe(true);
    expect(Number(verdict.confidence), `${role} mark confidence`).toBeGreaterThanOrEqual(0.75);
    noteNear(`g09-a1-${role}`, Number(verdict.confidence), 0.75, 'min');
    noteLowConfidence(`g09-a1-${role}`, Number(verdict.confidence));
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
    const bytes = topBytes(plate);
    const hash = sha256Hex(bytes);
    expect(hash, `content address holds for ${plate.file}`).toBe(plate.assetHash);
    const verdict = await heroPlateVerdict(m, plate);
    const ruling = markLaw({
      plate: plate.file,
      assetHash: hash,
      markVisible: verdict.mark_visible === true,
      attestedLack: attestedLackFor(m, hash),
    });
    rulings.push({ plate: plate.file, mark_visible: verdict.mark_visible, ruling: ruling.verdict });
    if (ruling.verdict === 'yellow') {
      fs.appendFileSync(YELLOW_FILE, JSON.stringify({
        at: new Date().toISOString(), criterion: 'g09-a3-warden-disagreement', plate: plate.file, note: ruling.note
      }) + '\n');
    }
    if (ruling.verdict === 'fail') failures.push({ plate: plate.file, reason: ruling.reason, verdict });
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
