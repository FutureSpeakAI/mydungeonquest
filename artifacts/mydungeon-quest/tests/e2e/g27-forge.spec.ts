// ------------------------------------------------------------
// G27 — THE TWO HANDS COURT (Directive XIII, TASK 58B).
// The forge's two laws proven at the REAL doors under the proving rig:
// one tap deals a whole world and a whole hero; a field's die touches
// its field alone; the pen's ink survives every spin that is not its
// own die; and the fast path is still three choices to Chapter One.
// Last, the court walks OUT of the rig: one direct round-trip through
// POST /api/smith with a real key, judged by the engine's own
// validator, so a schema drift that silently degrades to the mock
// floor is caught here and nowhere later. Keyed evidence lands in
// test-results/smith-evidence.json.
// ------------------------------------------------------------
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { boot } from './lib/harness';

const BASE = 'http://localhost:5199';

async function openWorldDoor(page) {
  await boot(page);
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
}

test('G27a one tap deals a whole world; a field die touches its field alone', async ({ page }) => {
  await openWorldDoor(page);
  const covenant = page.locator('textarea').first();
  const tone = page.locator('input').first();
  const title = page.locator('.spin-card h3').first();

  // One tap, one whole world: the spin fills every unsovereign surface.
  const covenantBefore = await covenant.inputValue();
  await page.click('button:has-text("Spin again")');
  await expect(covenant).not.toHaveValue(covenantBefore, { timeout: 5_000 });
  expect((await covenant.inputValue()).trim().length, 'the spin dealt a promise').toBeGreaterThan(0);
  expect((await tone.inputValue()).trim().length, 'the spin dealt a feel').toBeGreaterThan(0);
  expect((await title.textContent())?.trim().length, 'the spin dealt a title').toBeGreaterThan(0);
  const meta = await page.locator('.spin-meta span').allTextContents();
  expect(meta.length, 'the card wears its shape, feel, and home').toBeGreaterThanOrEqual(3);

  // Isolation: the feel's die moves the feel and NOTHING else.
  const heldCovenant = await covenant.inputValue();
  const heldTitle = (await title.textContent())?.trim();
  const toneBefore = await tone.inputValue();
  let toneMoved = false;
  for (let attempt = 0; attempt < 3 && !toneMoved; attempt += 1) {
    await page.click('button[aria-label="Spin the feel"]');
    await page.waitForTimeout(150);
    toneMoved = (await tone.inputValue()) !== toneBefore;
  }
  expect(toneMoved, 'the feel\u2019s die moves the feel').toBe(true);
  expect(await covenant.inputValue(), 'the promise stands byte-for-byte').toBe(heldCovenant);
  expect((await title.textContent())?.trim(), 'the title stands byte-for-byte').toBe(heldTitle);
});

test('G27b the pen is sovereign: typed ink survives whole spins and neighbour dice', async ({ page }) => {
  await openWorldDoor(page);
  const covenant = page.locator('textarea').first();
  const OWN_INK = 'The bridge is paid in borrowed memories.';
  await covenant.fill(OWN_INK);

  await page.click('button:has-text("Spin again")');
  await page.waitForTimeout(200);
  await page.click('button:has-text("Spin again")');
  await page.waitForTimeout(200);
  expect(await covenant.inputValue(), 'two whole spins later, the ink stands').toBe(OWN_INK);

  const tone = page.locator('input').first();
  const toneBefore = await tone.inputValue();
  let toneMoved = false;
  for (let attempt = 0; attempt < 3 && !toneMoved; attempt += 1) {
    await page.click('button[aria-label="Spin the feel"]');
    await page.waitForTimeout(150);
    toneMoved = (await tone.inputValue()) !== toneBefore;
  }
  expect(toneMoved, 'the neighbour die still works beside the ink').toBe(true);
  expect(await covenant.inputValue(), 'the neighbour die never crosses the ink').toBe(OWN_INK);

  // Law I's consequence made visible: the typed promise names the tale.
  const title = (await page.locator('.spin-card h3').first().textContent())?.trim() || '';
  expect(title.startsWith('The Tale of '), `the typed promise named its tale (got "${title}")`).toBe(true);

  // The one consent: the field's OWN die lifts the ink.
  let inkLifted = false;
  for (let attempt = 0; attempt < 3 && !inkLifted; attempt += 1) {
    await page.click('button[aria-label="Spin a promise"]');
    await page.waitForTimeout(150);
    inkLifted = (await covenant.inputValue()) !== OWN_INK;
  }
  expect(inkLifted, 'the field\u2019s own die is the one consent').toBe(true);
});

test('G27c one tap casts a whole hero; the fast path is still three choices', async ({ page }) => {
  await openWorldDoor(page);
  const started = Date.now();
  await page.click('.spark-card'); // choice one — a whole world
  await page.click('button:has-text("Forge the hero")'); // choice two
  await page.waitForSelector('.spin-card h3');

  const name = page.locator('input[maxlength="60"]').first();
  const nameBefore = await name.inputValue();
  let recast = false;
  for (let attempt = 0; attempt < 3 && !recast; attempt += 1) {
    await page.click('button:has-text("Cast again")');
    await page.waitForTimeout(200);
    recast = (await name.inputValue()) !== nameBefore;
  }
  expect(recast, 'one tap casts a new whole hero').toBe(true);
  expect((await name.inputValue()).trim().length, 'the cast dealt a name').toBeGreaterThan(0);
  const calling = await page.locator('select').first().inputValue();
  expect(calling.trim().length, 'the cast seated a calling').toBeGreaterThan(0);

  await page.click('button:has-text("Begin the chronicle")'); // choice three
  await page.waitForSelector('.campaign-mast h1', { timeout: 30_000 });
  const elapsed = Date.now() - started;
  expect(elapsed, `three choices to Chapter One took ${elapsed}ms`).toBeLessThan(25_000);
});

test('G27d the smith deals through its own schema at both seats: the keyless route serves the floor honestly, the live smith judged in the key\u2019s own house', async ({ page }) => {
  test.setTimeout(150_000);
  // HARD STOP (series law): a keyed criterion without its key is a named
  // FAIL, never a silent skip. The key lives in the TEST process — the
  // same seat as the vision judge's — and NEVER in the app server
  // (Task 52's webserver law, learned again in iteration 58B.2).
  expect(process.env.ANTHROPIC_API_KEY, 'FAIL: ANTHROPIC_API_KEY absent — the live smith criterion cannot convene').toBeTruthy();

  const smith = await import('fatescript/smith');
  const locked = { covenant: 'The bridge is paid in borrowed memories.' };

  // SEAT ONE — the route, through the rig's KEYLESS server. A malformed
  // ask is refused at the door; a lawful ask is answered by the mock
  // floor IN ITS OWN NAME. 'anthropic' here would mean a provider key
  // leaked into the app server — the exact thing the house forbids.
  const refused = await page.request.post(`${BASE}/api/smith`, { data: { scope: 'nonsense' } });
  expect(refused.status(), 'a malformed ask is a 400, never a deal').toBe(400);
  const routed = await page.request.post(`${BASE}/api/smith`, { data: { scope: 'world', locked, seed: 7 } });
  expect(routed.ok(), `the route answers (${routed.status()})`).toBe(true);
  const floor = await routed.json();
  expect(floor.provider, 'the keyless route serves the floor in its own name').toBe('mock');
  const floorVerdict = smith.validateCandidateSet('world', null, floor.candidates, locked);
  expect(floorVerdict.ok, `the floor's set passes the engine court: ${(floorVerdict.errors || []).join('; ')}`).toBe(true);

  // SEAT TWO — the LIVE smith, convened in-process where the key
  // lawfully lives, through the same smithCandidates seat the route
  // mounts. The spend ceiling is pinned high for the court's OWN process
  // only, so the criterion is never hostage to the day's ledger; the app
  // server's guards are untouched. Provider 'mock' here is the exact
  // drift this court exists to catch — a tool schema that no longer
  // mirrors the validator, degrading silently to the floor.
  process.env.SPEND_CEILING_ANTHROPIC = '999999';
  const { smithCandidates } = await import('../../server/smith.js');
  const live = await smithCandidates({ scope: 'world', locked, seed: 7 });
  expect(live.provider, 'the live smith dealt in its own name, not the floor\u2019s').toBe('anthropic');
  expect(typeof live.model, 'the model is named in evidence').toBe('string');
  // (58B.3 lesson) This model family REFUSES the temperature parameter
  // (Anthropic 400s it) — so the live seat declares honest-null, never a
  // dial it did not set. The mock floor still declares its own 0.9.
  expect(live.temperature, 'honest-null: no dial is claimed that the model refused').toBe(null);
  expect(live.redraws ?? 0, 'redraws stay within the two allowed').toBeLessThanOrEqual(2);
  const verdict = smith.validateCandidateSet('world', null, live.candidates, locked);
  expect(verdict.ok, `the dealt set passes the engine court: ${(verdict.errors || []).join('; ')}`).toBe(true);
  for (const candidate of live.candidates) {
    expect('covenant' in candidate, 'the locked promise is never dealt over').toBe(false);
  }

  const evidence = {
    court: 'G27d',
    at: new Date().toISOString(),
    route: { provider: floor.provider, judged: 'lawful', refusedMalformed: true },
    live: {
      provider: live.provider,
      model: live.model,
      temperature: live.temperature,
      redraws: live.redraws ?? 0,
      discarded: live.discarded ?? 0,
      candidateCount: live.candidates.length,
      lockedKeysWithheld: true,
      judgedBy: 'validateCandidateSet (engine)',
      verdict: 'lawful'
    }
  };
  const out = path.join(process.cwd(), 'test-results', 'smith-evidence.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(evidence, null, 2));
});
