// ------------------------------------------------------------
// G26 — THE RETURN COURT (Directive XII §VI.4, §VII.3).
// THE RETURN LAW: a played, writable tale greets a sitting with
// exactly ONE recap — staged at the sitting's first RETURN to the
// table, never the first seat — and that sitting's later landings
// with none. The standing sitting law (sessionStorage, the tab's
// lifetime) is the one clock of "new": a new sitting is greeted
// exactly once more. Read-only tales, completed tales, and unplayed
// tales are NEVER recapped.
//
// Two browser contexts on live keys: context one walks the writable
// tale through two sittings (one-recap-then-none, then once more);
// context two walks the borrowed book — a played, read-only demo
// tale re-seated across landings and sittings, never greeted. The
// completed and unplayed never-gates hold their keyless courts in
// evals/sequencing.test.mjs (a finished book opens to keepsakes; a
// fresh tale and ticks alone stay silent); recapFor is the single
// door all three classes pass, and the sitting choreography walked
// here is identical for every class — the live court seats the class
// the road can stage honestly.
//
// The court raises its OWN keyed house (the rig's app server stays
// keyless as ever) and puts it out when it rests. Evidence lands in
// test-results/return-court.json.
// ------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { raiseKeyedServer, type KeyedServer } from './lib/keyedServer';

const PORT = 5195;
const API_PORT = 5194;

let house: KeyedServer | null = null;

test.beforeAll(async () => {
  // The raise may climb the preflight ladder (three asks, cool-downs
  // between) — the hook needs its own budget past the 240s default.
  test.setTimeout(480_000);
  house = await raiseKeyedServer({ port: PORT, apiPort: API_PORT, court: 'G26' });
});

test.afterAll(async () => {
  await house?.close();
});

const HEARTH = 'nav button[aria-label="Close the book and return to the shelf"]';
const SPINE = '.book-row .book-spine:not(.new-spine)';
const RECAP = '.recap-card';

async function newSittingPage(context: any): Promise<Page> {
  const page = await context.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('mdq:arrived', '1'); } catch { /* private mode */ } });
  return page;
}

// Leave the table for the shelf through the patron's own door.
async function toShelf(page: Page) {
  await expect(page.locator(HEARTH)).toBeEnabled({ timeout: 120_000 });
  await page.click(HEARTH);
  await page.waitForSelector('.book-wall', { timeout: 15_000 });
}

// Open the one tale on the wall and wait for the table to seat.
async function openTale(page: Page) {
  await page.locator(SPINE).first().click();
  await page.waitForSelector('main.adventure-log .turn-entry', { timeout: 30_000 });
}

// A sealed book opens to its keepsakes; the court returns to the table
// the way a patron would, through the ceremony's own close.
async function closeKeepsakes(page: Page) {
  const close = page.locator('.ceremony-close');
  if (await close.count()) await close.click();
}

// The recap stages synchronously with the landing; a short settle keeps
// the absence assertion honest without waiting on nothing.
async function expectNoRecap(page: Page, word: string) {
  await page.waitForTimeout(1_500);
  await expect(page.locator(RECAP), word).toHaveCount(0);
}

function keepEvidence(patch: Record<string, unknown>) {
  const out = path.join(process.cwd(), 'test-results', 'return-court.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let held: Record<string, unknown> = {};
  try { held = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* first court writes fresh */ }
  fs.writeFileSync(out, JSON.stringify({ ...held, ...patch, at: new Date().toISOString() }, null, 2));
}

test('G26a: a played writable tale — one recap at the sitting\u2019s return, then none, and a new sitting is greeted once more', async ({ browser }) => {
  test.setTimeout(600_000);
  const context = await browser.newContext();
  const page = await newSittingPage(context);

  // SITTING ONE, first seat — forge and pour the tale live. The recap
  // greets a RETURN, never the first seat: no card may stand here.
  await page.goto(house!.base + '/', { waitUntil: 'domcontentloaded' });
  await page.click('.new-spine', { timeout: 30_000 });
  await page.waitForSelector('.spark-card', { timeout: 30_000 });
  await page.locator('.spark-card').nth(1).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 60_000 });
  await page.locator('.audition-chip').first().click();
  await page.click('button:has-text("Begin the chronicle")');
  await page.waitForFunction(() => {
    const entries = document.querySelectorAll('main.adventure-log .turn-entry');
    for (const entry of entries) {
      if (((entry.textContent || '').trim()).length >= 40) return true;
    }
    return false;
  }, undefined, { timeout: 120_000 });
  await expectNoRecap(page, 'the first seat of a sitting is never greeted');

  // SITTING ONE, first return — exactly one recap, from sealed material.
  await toShelf(page);
  await openTale(page);
  await expect(page.locator(RECAP), 'the sitting\u2019s first return is greeted exactly once').toHaveCount(1, { timeout: 15_000 });
  const mast = (await page.locator('.recap-mast').textContent() || '').trim();
  expect(mast.length, 'the recap wears its mast — arc, act, chapter').toBeGreaterThan(0);
  await page.locator(`${RECAP} button.text-button`).click();
  await expect(page.locator(RECAP)).toHaveCount(0);

  // SITTING ONE, later landings — none.
  await toShelf(page);
  await openTale(page);
  await expectNoRecap(page, 'the sitting\u2019s later landings are greeted with none');

  // SITTING TWO — the sessionStorage clock turns; the tale greets once more.
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.book-wall', { timeout: 30_000 });
  await openTale(page);
  await expectNoRecap(page, 'the new sitting\u2019s first seat is still never greeted');
  await toShelf(page);
  await openTale(page);
  await expect(page.locator(RECAP), 'a NEW sitting is greeted exactly once more (§VI.4\u2019s one clock of new)').toHaveCount(1, { timeout: 15_000 });

  keepEvidence({
    court: 'G26',
    provider: house!.provider,
    G26a: {
      sittingOne: { firstSeat: 'no recap', firstReturn: 'one recap, dismissed', laterLanding: 'no recap' },
      sittingTwo: { firstSeat: 'no recap', firstReturn: 'one recap' },
      law: '§VI.4 — one recap per sitting for a played writable tale; sessionStorage is the one clock of new',
    },
  });
  await context.close();
});

test('G26b: the borrowed book — a played read-only tale is never recapped, on any landing, in any sitting', async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext();
  const page = await newSittingPage(context);

  // Draw the house's own telling — sealed, read-only, chain-verified.
  await page.goto(house!.base + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.demo-shelf .demo-spine', { timeout: 30_000 });
  await page.locator('.demo-shelf .demo-spine').first().click();
  await page.waitForSelector('main.adventure-log .turn-entry', { timeout: 60_000 });
  await closeKeepsakes(page);
  await expectNoRecap(page, 'the borrowed book\u2019s first seat is silent');

  // The return landing — where a writable tale WOULD be greeted.
  await toShelf(page);
  await openTale(page);
  await closeKeepsakes(page);
  await expectNoRecap(page, 'the borrowed book\u2019s return is never greeted (§VI.4)');

  // A new sitting changes nothing for a read-only spine.
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.book-wall', { timeout: 30_000 });
  await openTale(page);
  await closeKeepsakes(page);
  await expectNoRecap(page, 'a new sitting\u2019s first seat: silent');
  await toShelf(page);
  await openTale(page);
  await closeKeepsakes(page);
  await expectNoRecap(page, 'a new sitting\u2019s return: still never greeted');

  keepEvidence({
    G26b: {
      class: 'read-only (the borrowed book), played and sealed',
      landings: 'first seat, return, new-sitting seat, new-sitting return — no recap on any',
      keylessCourts: 'completed and unplayed never-gates: evals/sequencing.test.mjs (finished book; fresh tale and ticks alone)',
      law: '§VI.4 — read-only, completed, and unplayed tales are never recapped',
    },
  });
  await context.close();
});
