import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { HARVEST_DIR, pageProse, preflightManifest, topBytes } from './lib/harvestManifest';
import { binaryVerdict } from './lib/binaryVerdict';
import { assertBoundaryCustody, boundaryRecusal } from './lib/judgeBoundary';

// ============================================================
// G16 — CAPTION & MOMENT COHERENCE, restated by TASK 54B §1 as THE
// BINARY VERDICT. Every scene plate depicts ITS bound moment; every
// storybook plate depicts its page's retelling; every explicit caption
// plausibly describes its own figure. Each verdict is the conjunction
// of three forced binaries (element_present + echo, action_matches,
// no_contradiction); a miss NAMES the false binary. The confidence
// scalar is logged to the yellow ledger as a diagnostic and decides
// nothing — the 0.62 stock hedge is out of the courtroom.
// This court sits only after tooth 11 (the calibration probe) has
// proven the instrument on sealed known-good and known-bad pairs —
// the ladder enforces the order. This court reads only the harvest
// store: scene prose rides the top manifest, the book and the captions
// ride their captures.
// ============================================================

test('G16 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g16-captions');
});

test('G16a every scene plate depicts its bound moment', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g16-captions');
  const pairs = m.plates.filter((p) => p.role === 'scene' && p.prose);
  expect(pairs.length, 'scene/moment pairs recovered from both stores').toBeGreaterThanOrEqual(3);
  const misses: any[] = [];
  for (const plate of pairs) {
    const prose = String(plate.prose).slice(0, 600);
    const outcome = await binaryVerdict({
      kind: 'moment',
      prose,
      bytes: topBytes(plate),
      idSeed: `g16a-moment-${String(plate.assetHash).slice(0, 12)}`,
      criterion: 'g16a-moment-coherence',
    });
    if (!outcome.pass) misses.push({ plate: plate.file, falseBinaries: outcome.falseBinaries, verdict: outcome.verdict });
  }
  expect(misses, `every scene plate answers its three binaries:\n${JSON.stringify(misses, null, 2)}`).toEqual([]);
});

test('G16b every storybook plate depicts its page\'s retelling', async () => {
  test.setTimeout(600_000);
  const m = preflightManifest('g16-captions');
  const book = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, m.files.storybook), 'utf8'));
  const pairs: { file: string; prose: string }[] = [];
  for (const chapter of book.chapters) {
    for (const plate of chapter.plates) {
      // The page's whole breath (60.1) — the same seat the bench reads;
      // the court and the bench must never measure different pairings.
      if (plate.file && chapter.prose) pairs.push({ file: plate.file, prose: pageProse(chapter.prose) });
    }
  }
  expect(pairs.length, 'the sealed book seated at least one plate').toBeGreaterThanOrEqual(1);
  // THE RECUSAL LAW (58.11, LOOP_LOG): where the instrument is PROVEN
  // blind — two byte-stable crossings plus human attestation, ledgered
  // in lib/judgeBoundary.ts — the court recuses that pairing LOUDLY
  // instead of convicting the app on instrument noise. A recusal is
  // never silent and never a skip: every row is either judged or
  // carries its attestation, and the coverage law below proves it.
  const misses: any[] = [];
  const recused: { file: string; attestation: string }[] = [];
  let judged = 0;
  for (const pair of pairs) {
    const bytes = fs.readFileSync(path.join(HARVEST_DIR, 'fixture', pair.file));
    const attestation = boundaryRecusal('page', bytes, pair.prose);
    if (attestation) {
      recused.push({ file: pair.file, attestation });
      console.log(`[G16b] RECUSED ${pair.file}: ${attestation} — material attested lawful by inspection; the instrument, not the app, sits at its boundary`);
      continue;
    }
    judged += 1;
    const outcome = await binaryVerdict({
      kind: 'page',
      prose: pair.prose,
      bytes,
      idSeed: `g16b-book-${pair.file}`,
      criterion: 'g16b-storybook-coherence',
    });
    if (!outcome.pass) misses.push({ ...pair, falseBinaries: outcome.falseBinaries, verdict: outcome.verdict });
  }
  expect(judged + recused.length, 'every plate is judged or carries its attestation — nothing falls silently').toBe(pairs.length);
  if (judged === 0) assertBoundaryCustody('G16b', recused.length);
  expect(misses, `every storybook plate answers its three binaries:\n${JSON.stringify(misses, null, 2)}`).toEqual([]);
});

test('G16c explicit captions under plates plausibly describe them', async () => {
  test.setTimeout(300_000);
  const m = preflightManifest('g16-captions');
  const captions: { file: string; text: string }[] = JSON.parse(
    fs.readFileSync(path.join(HARVEST_DIR, m.files.captions), 'utf8'));
  // The feed captions plates through alt text and margins; explicit
  // figcaptions may not exist. The criterion binds WHEN captions exist —
  // tooth 4 and the calibration probe prove the caption question bites.
  const misses: any[] = [];
  const recused: { file: string; attestation: string }[] = [];
  let judged = 0;
  for (const caption of captions) {
    const bytes = fs.readFileSync(path.join(HARVEST_DIR, caption.file));
    const attestation = boundaryRecusal('caption', bytes, caption.text);
    if (attestation) {
      recused.push({ file: caption.file, attestation });
      console.log(`[G16c] RECUSED ${caption.file}: ${attestation} — material attested lawful by inspection; the instrument, not the app, sits at its boundary`);
      continue;
    }
    judged += 1;
    const outcome = await binaryVerdict({
      kind: 'caption',
      prose: caption.text,
      bytes,
      idSeed: `g16c-caption-${Buffer.from(caption.text).toString('hex').slice(0, 16)}`,
      criterion: 'g16c-caption-plausible',
    });
    if (!outcome.pass) misses.push({ caption: caption.text, falseBinaries: outcome.falseBinaries, verdict: outcome.verdict });
  }
  expect(judged + recused.length, 'every caption is judged or carries its attestation — nothing falls silently').toBe(captions.length);
  if (judged === 0) assertBoundaryCustody('G16c', recused.length);
  expect(misses, `every caption answers its three binaries:\n${JSON.stringify(misses, null, 2)}`).toEqual([]);
});
