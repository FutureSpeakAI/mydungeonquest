import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { boot, loadManifest, plateBytes } from './lib/harness';
import type { PlateEntry } from './lib/harness';
import { GAME_ROOT, histogramDelta, judge } from './lib/vision';
import { checkFeedOrder } from './lib/feedOrder';
import { JUDGE_PROJECTS, doctorFirstNeed, doctorRefusedNeed, loadTopManifest, preflightManifest } from './lib/harvestManifest';
import { binaryVerdict } from './lib/binaryVerdict';
import { markLaw } from './lib/markLaw';
import { classifyAttestations, waitForResolutions } from './lib/terminality';

// SECTION 5 — THE SABOTAGE CHECK. A consistency test that cannot fail is
// not a test. NINE teeth, using the SAME questions, schemas, and laws as
// the real criteria, must bite on deliberately wrong inputs. Teeth 7 and
// 8 joined under TASK 53: the mark law refuses the unattested markless
// plate by name, and every judge preflight refuses its doctored manifest.
// Teeth 8b and 9 joined under TASK 54 (THE TERMINAL ANSWER): a REFUSED
// required artifact fails its courts by name, and the harvest's wait
// reads a sealed refusal in seconds — never at a cap, never as a timeout.

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
  // (54B §1) The caption court speaks the binary protocol now; its tooth
  // bites in the same tongue — the false caption must fail the conjunction.
  const plate = need('fixture', (e) => e.klass === 'region' && !String(e.cacheKey || '').startsWith('proving:'), 'Vale establishing plate');
  const outcome = await binaryVerdict({
    kind: 'caption',
    prose: 'Corin Voss duels atop a burning bell tower at midnight',
    bytes: plate,
    idSeed: 'sabotage-4-false-caption',
    criterion: 'sabotage-4',
  });
  expect(outcome.pass, `the tooth must bite — a false caption cannot pass the three binaries: ${JSON.stringify(outcome)}`).toBe(false);
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

test('tooth 7: the markless crop is seen markless, and the mark law refuses it by name', async () => {
  test.setTimeout(180_000);
  // A narrow band from the anchor's crown: real painted pixels, but no
  // room for a key-shaped burn. The REAL judge must answer mark_visible
  // false on real bytes, and the pure mark law — handed that verdict with
  // the attestations stripped — must fail NAMING the attestation path.
  const hero = need('live', (e) => e.klass === 'portrait' && e.label === 'Maren' && e.variant === 'bust', 'hero anchor');
  const meta = await sharp(hero).metadata();
  const band = await sharp(hero)
    .extract({ left: 0, top: 0, width: meta.width || 1, height: Math.max(16, Math.floor((meta.height || 1) * 0.18)) })
    .png().toBuffer();
  const verdict = await judge({
    id: 'sabotage-7-markless-crop', criterion: 'sabotage-7',
    images: [band],
    question: 'Is a key-shaped burn mark (a burn scar in the shape of a key) visible anywhere in this image?',
    schema: { mark_visible: 'boolean', confidence: 'number 0..1' }
  });
  expect(verdict.mark_visible, `the judge must see no mark in the crown band: ${JSON.stringify(verdict)}`).toBe(false);
  const ruling = markLaw({ plate: 'sabotage-7-crop', assetHash: 'stripped-attestations', markVisible: false, attestedLack: false });
  expect(ruling.verdict, 'the mark law must refuse the unattested markless plate').toBe('fail');
  expect((ruling as any).reason, 'the refusal names the attestation path').toMatch(/attestation path/);
  // (54.5 + review round) The MIRROR lane is proven too: the same markless
  // verdict WITH a signature:true attestation STILL FAILS — acceptance is
  // never widened — but it fails under its honest name (a warden–judge
  // contradiction), never under the attestation-path accusation, which
  // stays reserved for true silence.
  const mirror = markLaw({ plate: 'sabotage-7-crop', assetHash: 'attested-seen', markVisible: false, attestedLack: false, attestedSeen: true });
  expect(mirror.verdict, 'the warden–judge contradiction fails — acceptance never widened').toBe('fail');
  expect((mirror as any).reason, 'the contradiction is named').toMatch(/CONTRADICTION/);
  expect((mirror as any).reason, 'the silence accusation stays out of the contradiction lane').not.toMatch(/attestation path/);
  saveDeterministicEvidence('sabotage-7-mark-law', { verdict, ruling, mirror, bites: ruling.verdict === 'fail' && mirror.verdict === 'fail' });
});

test('tooth 8: every judge preflight refuses its doctored manifest by name', () => {
  const top = loadTopManifest();
  if (!top) throw new Error('plate store missing the top manifest — harvest first');
  const messages: Record<string, string> = {};
  for (const project of JUDGE_PROJECTS) {
    const { manifest, what } = doctorFirstNeed(project, top);
    let thrown: Error | null = null;
    try { preflightManifest(project, manifest); } catch (error: any) { thrown = error; }
    expect(thrown, `${project} must refuse its doctored manifest (doctored: ${what})`).toBeTruthy();
    expect(String(thrown!.message), `${project} names its own court`).toContain(`${project} preflight: harvest artifact missing`);
    expect(String(thrown!.message), `${project} names the missing artifact`).toContain(what);
    messages[project] = String(thrown!.message);
  }
  saveDeterministicEvidence('sabotage-8-preflight', { messages, bites: Object.keys(messages).length === JUDGE_PROJECTS.length });
});

test('tooth 8b: a REFUSED required artifact fails every paint-dependent court by name', () => {
  const top = loadTopManifest();
  if (!top) throw new Error('plate store missing the top manifest — harvest first');
  const messages: Record<string, string> = {};
  for (const project of JUDGE_PROJECTS) {
    const doctored = doctorRefusedNeed(project, top);
    if (!doctored) continue; // capture-only courts (g18) bite in tooth 8's missing pass
    let thrown: Error | null = null;
    try { preflightManifest(project, doctored.manifest); } catch (error: any) { thrown = error; }
    expect(thrown, `${project} must refuse its refusal-doctored manifest (need: ${doctored.what})`).toBeTruthy();
    expect(String(thrown!.message), `${project} says REFUSED, never missing`).toContain('harvest artifact REFUSED');
    expect(String(thrown!.message), `${project} names the refused need`).toContain(doctored.what);
    messages[project] = String(thrown!.message);
  }
  expect(Object.keys(messages).length, 'every paint-dependent court bites').toBeGreaterThanOrEqual(5);
  saveDeterministicEvidence('sabotage-8b-refused', { messages, bites: Object.keys(messages).length });
});

test('tooth 9: the terminality wait reads a sealed refusal in seconds and starves only at the cap', async () => {
  // A COPY of the real fixture record's journal — never the record itself,
  // and never a marker row in any store: the plant lives in test memory.
  const recordPath = path.join(GAME_ROOT, 'test-results', 'harvest', 'fixture', 'record.json');
  if (!fs.existsSync(recordPath)) throw new Error('plate store missing the fixture record — harvest first');
  const journal: any[] = JSON.parse(fs.readFileSync(recordPath, 'utf8')).journal || [];
  const planted = {
    i: (journal[journal.length - 1]?.i ?? 0) + 1,
    type: 'media_attestation',
    recordHash: 'tooth9-planted',
    payload: {
      kind: 'paint', cacheKey: 'tooth9:required-plate', label: 'Tooth Nine', variant: 'bust', subtype: 'portrait',
      assetHash: 'tooth9-dropped-bytes', originTurnHash: null,
      warden: { warden: 'refused', reason: 'tooth 9 — planted refusal in a record copy' },
    },
  };
  const need = { what: 'the tooth-nine required plate', matches: (r: any) => r.cacheKey === 'tooth9:required-plate' };

  // (a) A refusal is TERMINAL: the REAL wait fails in milliseconds, not at its cap.
  const refusedStart = Date.now();
  let refused: Error | null = null;
  try {
    await waitForResolutions(async () => classifyAttestations([...journal, planted], new Set()), [need], { capMs: 60_000, pollMs: 50 });
  } catch (error: any) { refused = error; }
  const refusedMs = Date.now() - refusedStart;
  expect(refused, 'the wait must throw on the planted refusal').toBeTruthy();
  expect(String(refused!.message)).toMatch(/HARVEST-REFUSED/);
  expect(String(refused!.message), 'the refusal names the ask').toContain('tooth9:required-plate');
  expect(refusedMs, `a sealed refusal resolves in seconds, never at a cap (took ${refusedMs}ms of a 60s cap)`).toBeLessThan(5_000);

  // (b) True silence starves at the cap — and names the starved need.
  const starvedStart = Date.now();
  let starved: Error | null = null;
  try {
    await waitForResolutions(async () => classifyAttestations(journal, new Set()), [need], { capMs: 3_000, pollMs: 100 });
  } catch (error: any) { starved = error; }
  const starvedMs = Date.now() - starvedStart;
  expect(starved, 'the wait must starve on true silence').toBeTruthy();
  expect(String(starved!.message)).toMatch(/HARVEST-STARVED/);
  expect(String(starved!.message), 'the starvation names the need').toContain('the tooth-nine required plate');
  expect(starvedMs, 'starvation waits the whole measured cap').toBeGreaterThanOrEqual(3_000);

  // (c) (iteration 54.2's lesson) An anchor-fallback is TERMINAL NON-DELIVERY
  // for a distinct-plate need: the REAL wait fails in milliseconds, names the
  // ask, and carries the warden's drift notes — never a starved cap.
  const anchorPlant = {
    i: planted.i + 1,
    type: 'media_attestation',
    recordHash: 'tooth9-anchored',
    payload: {
      kind: 'paint', cacheKey: 'tooth9:anchored-plate', label: 'Tooth Nine', variant: 'dramatic', subtype: 'portrait',
      assetHash: 'tooth9-anchor-bytes', originTurnHash: null,
      warden: { warden: 'fallback', reason: 'the likeness would not hold', drift: ['tooth 9 — planted drift note'] },
    },
  };
  const anchorNeed = { what: 'the tooth-nine anchored plate', matches: (r: any) => r.cacheKey === 'tooth9:anchored-plate' };
  const anchoredStart = Date.now();
  let anchoredErr: Error | null = null;
  try {
    await waitForResolutions(async () => classifyAttestations([...journal, anchorPlant], new Set(['tooth9-anchor-bytes'])), [anchorNeed], { capMs: 60_000, pollMs: 50 });
  } catch (error: any) { anchoredErr = error; }
  const anchoredMs = Date.now() - anchoredStart;
  expect(anchoredErr, 'the wait must throw on the planted anchor-fallback').toBeTruthy();
  expect(String(anchoredErr!.message)).toMatch(/HARVEST-ANCHORED/);
  expect(String(anchoredErr!.message), 'the anchor terminal names the ask').toContain('tooth9:anchored-plate');
  expect(String(anchoredErr!.message), 'the anchor terminal carries the drift').toContain('tooth 9 — planted drift note');
  expect(anchoredMs, `an anchor terminal resolves in seconds, never at a cap (took ${anchoredMs}ms of a 60s cap)`).toBeLessThan(5_000);

  saveDeterministicEvidence('sabotage-9-terminality', {
    refusedMs, refusedMessage: String(refused!.message),
    starvedMs, starvedMessage: String(starved!.message),
    anchoredMs, anchoredMessage: String(anchoredErr!.message),
    bites: true,
  });
});
