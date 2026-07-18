import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { act, boot, forgeNewChronicle, readCampaign, rollIfAsked, turnCount } from './lib/harness';
import { ensureFreshProse, PROSE_STORE_DIR } from './lib/harvestManifest';

// ============================================================
// G24 — THE PROSE COURT (0.9.0, THE WRITER'S ROOM). Six criteria
// over the run's OWN shipped prose — never fresh drafts, never the
// house's word for it. The evidence is what the run left on disk:
// the g05 pour witness (the dom sitting's sealed retraction ledger)
// and the harvest's session records, judged by the server's own
// courts through one probe (tools/g24-probe.mjs) so the law lives
// in exactly one place. The instruments were proven first: tooth 10
// bit the Editor's rubric, tooth 19 bit the retraction observer —
// this court trusts silence only because the teeth drew blood.
//
// G24f's bound: re-pinned for 0.9.0 (the salted-pad era) at
// [180, 620] folded characters, observed p50 345 across the
// standing walks (fixture + live, ten pages). A p50 under the floor
// is starved prose; over the ceiling is bloat no measure band
// assigned.
// ============================================================

test.describe.configure({ mode: 'serial' });

const P50_FLOOR = 180;
const P50_CEILING = 620;
const WITNESS = 'test-results/g05-pour-witness.json';

let court: {
  pages: number; walks: number;
  echoFlags: number; clicheFlags: number; samenessFlags: number;
  cueRows: number; captionRows: number; captionErrors: { turn: unknown; faults: string[] }[];
  p50: number; foldedLengths: number[];
} | null = null;

function convene() {
  if (court) return court;
  const out = execSync('node tests/e2e/tools/g24-probe.mjs', { encoding: 'utf8' });
  const parsed = JSON.parse(out);
  if (parsed.error) throw new Error(`the prose court cannot convene: ${parsed.error}`);
  court = parsed;
  expect(court!.pages, 'a starved walk proves nothing — the court needs at least three pages').toBeGreaterThanOrEqual(3);
  console.log(`[G24] the docket: ${JSON.stringify({ pages: court!.pages, walks: court!.walks, cueRows: court!.cueRows, captionRows: court!.captionRows, p50: court!.p50 })}`);
  return court!;
}

// G24w — THE FRESH WALK (review round). The prose store carries one mock
// walk sealed under the CURRENT writer's-room law; it reseeds only when
// that law moves. Mock prose is deterministic and the walk never waits
// on paint, so this freshness costs seconds and no judge dice — the
// stale-court hole closed without touching the standing plate store.
test('G24w the prose store is fresh — one mock walk under the current law', async ({ page }) => {
  test.setTimeout(300_000);
  const law = ensureFreshProse();
  if (law.reused) {
    console.log(`[G24w] prose law ${law.hash.slice(0, 12)}… holds — the standing walk remains lawful evidence`);
    return;
  }
  console.log(`[G24w] prose law moved to ${law.hash.slice(0, 12)}… — reseeding with one fresh walk`);
  await boot(page);
  await forgeNewChronicle(page, { sparkIndex: 1, hero: { name: 'Sable Quill', mark: 'an ink-stain crescent on the left wrist', presentation: 'feminine', pronouns: 'she/her' } });
  const campaignId = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.js');
    const all = await db.campaigns.orderBy('updatedAt').reverse().toArray();
    return all[0]?.id;
  });
  expect(campaignId, 'a chronicle was born for the prose walk').toBeTruthy();
  for (const step of ['I study the room and name what I see.', 'I press on toward the sound beyond the door.']) {
    // The composer LEAVES the DOM while a roll ask stands — the roll
    // button takes its seat. 58.11 wedged exactly here: one rollIfAsked
    // left a CHAINED ask standing and the next act found no door.
    // Drain every ask, then wait for the composer's own seat.
    while (await rollIfAsked(page)) { /* chained asks drain until the table is quiet */ }
    await page.waitForSelector('.composer textarea:not([disabled])', { timeout: 120_000 });
    const before = await turnCount(page);
    await act(page, step);
    await page.waitForFunction((count: number) => document.querySelectorAll('main.adventure-log .turn-entry').length > count, before, { timeout: 120_000 });
    while (await rollIfAsked(page)) { /* the fresh turn's asks drain too */ }
    // The row is evidence only once it is SEALED: the dm turn whole and
    // every narration paged — a half-poured page must never be judged.
    await page.waitForFunction(async () => {
      const { db } = await import('/src/lib/db.js');
      const all = await db.campaigns.orderBy('updatedAt').reverse().toArray();
      const logs = all[0]?.logs || [];
      const last = logs[logs.length - 1];
      return Boolean(last?.dm && Array.isArray(last.dm.narration_blocks) && last.dm.narration_blocks.length
        && Array.isArray(last.narrations) && last.narrations.length === last.dm.narration_blocks.length);
    }, { timeout: 120_000 });
  }
  const campaign = await readCampaign(page, campaignId);
  fs.writeFileSync(path.join(PROSE_STORE_DIR, 'session.json'),
    JSON.stringify({ campaignId, styleBible: campaign.styleBible, logs: campaign.logs }, null, 2));
  console.log(`[G24w] reseeded: ${campaign.logs.length} rows sealed under the current law`);
});

test('G24a the pour only grew — the dom sitting\'s retraction ledger is empty', () => {
  expect(fs.existsSync(WITNESS), 'the dom sitting left no pour witness — g05 seals it before this court sits').toBe(true);
  const witness = JSON.parse(fs.readFileSync(WITNESS, 'utf8'));
  expect(Array.isArray(witness.retractions), 'the witness carries a ledger').toBe(true);
  expect(witness.retractions, `the pour only ever grows — the sitting's ledger must be empty: [${(witness.retractions || []).join(' | ')}]`).toEqual([]);
});

test('G24b the echo court finds no repeated run across the shipped walks', () => {
  const c = convene();
  expect(c.echoFlags, 'no shipped page repeats an eight-word run from its twenty-page window').toBe(0);
});

test('G24c the cliche court finds no page past the pinned density', () => {
  const c = convene();
  expect(c.clicheFlags, 'no shipped page crowds past two lexicon hits per thousand characters').toBe(0);
});

test('G24d the sameness court finds every pair of roads distinct', () => {
  const c = convene();
  expect(c.samenessFlags, 'no turn offers two roads that are nearly the same road').toBe(0);
});

test('G24e every sealed caption stands the caption court; legacy rides free', () => {
  const c = convene();
  console.log(`[G24e] cue rows ${c.cueRows}, sealed captions ${c.captionRows} (caption-less cues are legacy — out of session by law)`);
  expect(c.captionErrors, `a shipped caption broke Law X: ${JSON.stringify(c.captionErrors)}`).toEqual([]);
});

test('G24f the measure of the house — p50 within the re-pinned bound', () => {
  const c = convene();
  console.log(`[G24f] folded lengths: ${JSON.stringify(c.foldedLengths)} → p50 ${c.p50}, bound [${P50_FLOOR}, ${P50_CEILING}]`);
  expect(c.p50, `p50 ${c.p50} under the floor is starved prose`).toBeGreaterThanOrEqual(P50_FLOOR);
  expect(c.p50, `p50 ${c.p50} over the ceiling is bloat no band assigned`).toBeLessThanOrEqual(P50_CEILING);
});
