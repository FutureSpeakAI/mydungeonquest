// ------------------------------------------------------------
// G25 — THE WONDER COURT (Directive XII §VI.1, §VII.3).
// TIME-TO-WONDER is a budget, and the budget is a number: 133 whole
// seconds, seated at the pinning ceremony of July 19, 2026 (ten fresh
// live runs, median 88.32s, budget ceil(median × 1.5) = 133). The
// clock runs from the tap that commits a new tale to the first
// narrated sentence standing visible at the table — a sentence, never
// a plate (§VI.2): no ornament may gate it.
//
// Three fresh live runs, each in its own browser context (its own
// IndexedDB), sequential so rounds never contend; their MEDIAN must
// sit inside the budget — one slow round is weather, a slow median is
// a broken door. The court raises its OWN keyed house (the rig's app
// server stays keyless) and puts it out when it rests. Evidence lands
// in test-results/wonder-court.json before the judgment, so a red run
// still leaves its numbers on the record.
// ------------------------------------------------------------
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { raiseKeyedServer, type KeyedServer } from './lib/keyedServer';

const PORT = 5197;
const API_PORT = 5196;
const ROUNDS = 3;
const BUDGET_SECONDS = 133; // §VI.1's seated pin — only a new ceremony may move it.

let house: KeyedServer | null = null;

test.beforeAll(async () => {
  house = await raiseKeyedServer({ port: PORT, apiPort: API_PORT, court: 'G25' });
});

test.afterAll(async () => {
  await house?.close();
});

test('G25: the wonder court — three fresh live runs, the median inside the 133-second budget', async ({ browser }) => {
  test.setTimeout(900_000); // headroom for the preflight ladder — the judged budget is per-run tap-to-sentence, untouched
  const seconds: number[] = [];

  for (let round = 1; round <= ROUNDS; round++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.addInitScript(() => { try { sessionStorage.setItem('mdq:arrived', '1'); } catch { /* private mode */ } });
      await page.goto(house!.base + '/', { waitUntil: 'domcontentloaded' });
      await page.click('.new-spine', { timeout: 30_000 });
      await page.waitForSelector('.spark-card', { timeout: 30_000 });
      await page.locator('.spark-card').nth(1).click();
      await page.click('button:has-text("Forge the hero")');
      await page.waitForSelector('.audition-chip', { timeout: 60_000 });
      await page.locator('.audition-chip').first().click();
      // THE TAP THAT COMMITS THE TALE — the clock starts on the tap
      // itself, exactly as the patron's finger feels it.
      const t0 = Date.now();
      await page.click('button:has-text("Begin the chronicle")');
      await page.waitForFunction(() => {
        const entries = document.querySelectorAll('main.adventure-log .turn-entry');
        for (const entry of entries) {
          const text = (entry.textContent || '').trim();
          if (text.length >= 40) return true;
        }
        return false;
      }, undefined, { timeout: 120_000 });
      seconds.push((Date.now() - t0) / 1000);
    } finally {
      await context.close().catch(() => {});
    }
  }

  const sorted = [...seconds].sort((a, b) => a - b);
  const median = sorted[1];

  const evidence = {
    court: 'G25',
    at: new Date().toISOString(),
    provider: house!.provider,
    rounds: ROUNDS,
    runsSeconds: seconds.map((s) => Number(s.toFixed(2))),
    medianSeconds: Number(median.toFixed(2)),
    budgetSeconds: BUDGET_SECONDS,
    law: '§VI.1 — ceil(88.32 × 1.5) = 133, seated at the pinning ceremony of 2026-07-19',
  };
  const out = path.join(process.cwd(), 'test-results', 'wonder-court.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(evidence, null, 2));

  expect(median, `three live runs [${seconds.map((s) => s.toFixed(1)).join(', ')}]s — the median ${median.toFixed(2)}s must sit inside the ${BUDGET_SECONDS}s budget (§VI.1)`).toBeLessThanOrEqual(BUDGET_SECONDS);
});
