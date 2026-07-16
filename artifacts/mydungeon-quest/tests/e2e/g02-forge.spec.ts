import { expect, test } from '@playwright/test';
import { boot } from './lib/harness';
import { noteNear } from './lib/vision';

// G2 THE SPARK DEAL & THE FAST PATH — three cards, honest grammar, and a
// three-choice road to Chapter One in under twenty-five seconds.
// G3 THE DEEP FORGE — five fields, each with a die that changes the value,
// and an oracle that fills the card.

test('G2 sparks: three cards with title, covenant sentence, italic tone; the pick updates the spin card', async ({ page }) => {
  await boot(page);
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');

  const cards = page.locator('.spark-card');
  await expect(cards).toHaveCount(3);

  for (let i = 0; i < 3; i += 1) {
    const card = cards.nth(i);
    const title = (await card.locator('b').first().textContent())?.trim() || '';
    const covenant = (await card.locator('p').first().textContent())?.trim() || '';
    expect(title.length, `spark ${i} title`).toBeGreaterThan(2);
    expect(covenant, `spark ${i} covenant reads as a sentence`).toMatch(/[.!?]$/);
    const small = card.locator('small').first();
    const italic = await small.evaluate((el) => {
      const own = getComputedStyle(el).fontStyle === 'italic';
      const child = el.querySelector('i, em') !== null;
      return own || child;
    });
    expect(italic, `spark ${i} tone line is italic`).toBe(true);
  }

  const secondTitle = (await cards.nth(1).locator('b').first().textContent())?.trim() || '';
  await cards.nth(1).click();
  await expect(page.locator('.spin-card h3').first()).toHaveText(secondTitle);
  const meta = (await page.locator('.spin-meta').first().textContent()) || '';
  expect(meta.trim().length, 'spin meta carries the home line').toBeGreaterThan(0);
});

test('G2 the fast path: three choices to Chapter One in under 25 seconds', async ({ page }) => {
  await boot(page);
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');

  const started = Date.now();
  await page.locator('.spark-card').nth(1).click();          // choice one — the spark
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });
  await page.locator('.audition-chip').first().click();       // choice two — the voice
  await page.click('button:has-text("Begin the chronicle")'); // choice three — begin
  await page.waitForSelector('main.adventure-log .campaign-mast', { timeout: 30_000 });
  await expect(page.locator('.campaign-mast span').first()).toContainText(/Chapter I\b/, { timeout: 30_000 });
  const elapsed = Date.now() - started;

  const heading = (await page.locator('.campaign-mast h1').first().textContent())?.trim() || '';
  expect(heading.length, 'Chapter One heading present').toBeGreaterThan(0);
  await expect(page.locator('.turn-entry .narration').first()).toBeVisible({ timeout: 30_000 });

  expect(elapsed, `three-choice path took ${elapsed}ms`).toBeLessThan(25_000);
  noteNear('g02-fast-path-ms', elapsed, 25_000, 'max');
});

test('G3 deep forge: five fields whose dice change the values; the oracle fills the card', async ({ page }) => {
  await boot(page);
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');

  await page.locator('.door-tab').nth(2).click(); // the deep door

  // Labels are the forge's REAL copy (iteration-1 logged edit: the spec had
  // guessed "Covenant"; the field is titled "Your world"). Strength unchanged:
  // five fields, each present, editable, and moved by its die.
  const fields = [
    { label: 'Chronicle title' },
    { label: 'Your world' },
    { label: 'Tone' },
    { label: 'Home region' },
    { label: "The world's look" }
  ];
  for (const field of fields) {
    const row = page.locator(`label:has-text("${field.label}")`).first();
    await expect(row, `deep forge field "${field.label}" present`).toBeVisible();
    const control = row.locator('input, textarea').first();
    await expect(control, `deep forge field "${field.label}" editable`).toBeVisible();
    const die = row.locator('button').first();
    await expect(die, `deep forge field "${field.label}" carries a die`).toBeVisible();

    // The die must change the value. A random table may deal the same card
    // twice in a row, so the roll is proven across up to three throws —
    // the CONTROL is under test, not the odds. (Design note in LOOP_LOG.md.)
    const before = await control.inputValue();
    let changed = false;
    for (let attempt = 0; attempt < 3 && !changed; attempt += 1) {
      await die.click();
      await page.waitForTimeout(150);
      changed = (await control.inputValue()) !== before;
    }
    expect(changed, `die on "${field.label}" changes the value`).toBe(true);
  }

  // The oracle — three questions compose a filled card.
  await page.locator('.door-tab').nth(1).click();
  const selects = page.locator('.forge-panel select, section select');
  const count = await selects.count();
  expect(count, 'the oracle asks its questions').toBeGreaterThanOrEqual(3);
  for (let i = 0; i < Math.min(count, 3); i += 1) {
    await selects.nth(i).selectOption({ index: 1 });
  }
  const spinTitle = (await page.locator('.spin-card h3').first().textContent())?.trim() || '';
  const spinBody = (await page.locator('.spin-card p').first().textContent())?.trim() || '';
  expect(spinTitle.length, 'oracle fills the card title').toBeGreaterThan(0);
  expect(spinBody.length, 'oracle fills the covenant').toBeGreaterThan(0);
});
