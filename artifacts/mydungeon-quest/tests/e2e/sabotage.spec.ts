import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { boot, loadManifest, plateBytes } from './lib/harness';
import type { PlateEntry } from './lib/harness';
import { GAME_ROOT, histogramDelta, judge } from './lib/vision';
import { checkFeedOrder } from './lib/feedOrder';

// SECTION 5 — THE SABOTAGE CHECK. A consistency test that cannot fail is
// not a test. Six teeth, using the SAME questions and schemas as the real
// criteria, must bite on deliberately wrong inputs.

const EVIDENCE = path.join(GAME_ROOT, 'test-results', 'vision', 'evidence');

function need(tag: 'live' | 'fixture', predicate: (entry: PlateEntry) => boolean, what: string): Buffer {
  const manifest = loadManifest(tag);
  if (!manifest) throw new Error(`plate store "${tag}" missing — harvest first`);
  const entry = manifest.find(predicate);
  if (!entry) throw new Error(`plate store missing ${what}`);
  return plateBytes(entry);
}

function saveDeterministicEvidence(name: string, record: unknown) {
  const dir = path.join(EVIDENCE, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'verdict.json'), JSON.stringify(record, null, 2));
}

test('tooth 1: the hero is not the villain', async () => {
  test.setTimeout(180_000);
  const hero = need('live', (e) => e.klass === 'portrait' && e.label === 'Maren' && e.variant === 'bust', 'hero anchor');
  const villain = need('live', (e) => e.label === 'The Hollow Regent' && e.variant === 'bust', 'villain portrait');
  const verdict = await judge({
    id: 'sabotage-1-hero-vs-villain', criterion: 'sabotage-1',
    images: [hero, villain],
    question: 'Image 1 is a character\'s introduction portrait. Image 2 is a later plate of the same story. Is the same character depicted in both (same face, features, silhouette, costume language)?',
    schema: { same_character: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.same_character, `the tooth must bite: ${JSON.stringify(verdict)}`).toBe(false);
});

test('tooth 2: thriving versus blighted explodes the histogram', async () => {
  const thriving = need('fixture', (e) => e.klass === 'region' && !String(e.cacheKey || '').startsWith('proving:'), 'thriving Vale');
  const blighted = need('fixture', (e) => String(e.cacheKey || '').endsWith(':vale-blighted'), 'blighted Vale');
  const delta = await histogramDelta(thriving, blighted);
  expect(delta, `histogramDelta(thriving, blighted) = ${delta} must exceed 0.35`).toBeGreaterThan(0.35);
  saveDeterministicEvidence('sabotage-2-histogram', { delta, threshold: 0.35, bites: delta > 0.35 });
});

test('tooth 3: a text-bearing page is seen as text-bearing', async ({ page }) => {
  test.setTimeout(180_000);
  await boot(page, { proving: false });
  const shot = await page.screenshot();
  const verdict = await judge({
    id: 'sabotage-3-text-control', criterion: 'sabotage-3',
    images: [shot],
    question: 'Does this image contain rendered text, lettering, a signature, or a watermark? Is it in a cartoon, cel-shaded, or obvious 3D-render style rather than a painted illustration?',
    schema: { contains_text_or_watermark: 'boolean', is_cartoon_or_3d: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.contains_text_or_watermark, `the tooth must bite: ${JSON.stringify(verdict)}`).toBe(true);
});

test('tooth 4: the false caption is refused', async () => {
  test.setTimeout(180_000);
  const plate = need('fixture', (e) => e.klass === 'region' && !String(e.cacheKey || '').startsWith('proving:'), 'Vale establishing plate');
  const verdict = await judge({
    id: 'sabotage-4-false-caption', criterion: 'sabotage-4',
    images: [plate],
    question: 'Does this caption plausibly describe this image: "Corin Voss duels atop a burning bell tower at midnight"?',
    schema: { caption_plausible: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.caption_plausible, `the tooth must bite: ${JSON.stringify(verdict)}`).toBe(false);
});

test('tooth 5: the beheaded portrait is seen as cropped', async () => {
  test.setTimeout(180_000);
  const hero = need('live', (e) => e.klass === 'portrait' && e.label === 'Maren' && e.variant === 'bust', 'hero anchor');
  const meta = await sharp(hero).metadata();
  const top = Math.floor((meta.height || 0) * 0.4);
  const mutilated = await sharp(hero)
    .extract({ left: 0, top, width: meta.width || 1, height: (meta.height || 1) - top })
    .png().toBuffer();
  const verdict = await judge({
    id: 'sabotage-5-cropped-hero', criterion: 'sabotage-5',
    images: [mutilated],
    question: 'This is a character portrait. Is the subject fully in frame — head not cropped at crown or chin, both eyes visible? Is there exactly one primary subject? Is the composition free of awkward crops (limbs or face cut off mid-feature)?',
    schema: { subject_fully_in_frame: 'boolean', single_subject: 'boolean', awkward_crop: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.subject_fully_in_frame, `the tooth must bite: ${JSON.stringify(verdict)}`).toBe(false);
});

test('tooth 6: the order checker fails the shuffled feed', async () => {
  // Iteration-1 logged edit: these synthetic rows carried `turn` as a bare
  // NUMBER (and 0 is falsy), not the checker's TurnParts shape — so the
  // checker lawfully skipped them and only the tick-tick bite landed. The
  // rows are now well-formed; the checker itself is untouched and must name
  // every bite: deed-before-roll, the stamp that never increases, tick/tick.
  const rows: any[] = [
    { kind: 'turn', turn: { turn: 0, order: ['player', 'deed', 'roll', 'narration'], speakers: [] } }, // deed before roll
    { kind: 'tick', phrase: 'The hour turns.', whispers: [] },
    { kind: 'tick', phrase: 'And turns again.', whispers: [] },                                        // tick against tick
    { kind: 'turn', turn: { turn: 0, order: ['narration'], speakers: [] } }                            // duplicate stamp
  ];
  const violations = checkFeedOrder({ rows, introducedBy: {}, heroName: 'Maren' });
  expect(violations.length, `the checker must fail the shuffled feed:\n${violations.join('\n')}`).toBeGreaterThanOrEqual(2);
  expect(violations.some((v) => /order|deed|roll/i.test(v)), `a deed-before-roll violation is named:\n${violations.join('\n')}`).toBe(true);
  expect(violations.some((v) => /tick|stamp|duplicate|increase/i.test(v)), `a stamp/tick violation is named:\n${violations.join('\n')}`).toBe(true);
  saveDeterministicEvidence('sabotage-6-order', { rows, violations, bites: violations.length >= 2 });
});
