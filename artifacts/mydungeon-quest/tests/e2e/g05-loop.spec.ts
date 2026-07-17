import { expect, test } from '@playwright/test';
import { act, boot, openSheet, rollIfAsked, seedFixture, turnCount } from './lib/harness';

// G5 THE TABLE LOOP — narration streams, suggestions offer roads, a custom
// action lands, the roll shows its die and its deed, the sheet knows the
// blood. G6 — ticks with phrases, at most four whispers, one recap per
// sitting, stillness for those who ask.

test('G5 the prologue streams and the loop turns', async ({ page }) => {
  test.setTimeout(300_000);
  await boot(page);
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
  await page.locator('.spark-card').nth(0).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });
  await page.locator('.audition-chip').first().click();
  await page.click('button:has-text("Begin the chronicle")');

  // THE STREAM — sample from the Begin tap itself (iteration-1 logged edit:
  // the old window opened only after the first narration PAINTED, mid-stream,
  // and a fast mock could show <3 rises inside it). The criterion is
  // unchanged — at least three observed rises — the window now simply covers
  // the whole stream, 0 → first chunk included.
  const samples: number[] = [];
  for (let i = 0; i < 120; i += 1) {
    const length = await page.evaluate(() => {
      const nodes = document.querySelectorAll('main.adventure-log .turn-entry .narration');
      let total = 0;
      nodes.forEach((node) => { total += (node.textContent || '').length; });
      return total;
    });
    samples.push(length);
    // The stream has settled: narration exists and hasn't grown for 12 samples.
    if (length > 0 && samples.length >= 12 && samples[samples.length - 12] === length) break;
    await page.waitForTimeout(250);
  }
  await page.waitForSelector('main.adventure-log .turn-entry .narration', { timeout: 60_000 });
  // (54B §5) The 54.6 stall — twelve all-zero samples — could not say
  // WHICH half died: transport (no first byte) or growth (a stream that
  // starts and freezes). The assertion is SPLIT so a red names its phase.
  // The bound is the window the criterion always owned (120 × 250ms);
  // neither half is softer than the old law — together they imply it.
  const firstByteIndex = samples.findIndex((length) => length > 0);
  console.log(`[g05] first narration byte at sample ${firstByteIndex} (~${firstByteIndex * 250}ms of ${samples.length * 250}ms sampled)`);
  expect(firstByteIndex, `§5 first byte: narration must begin inside the sampling window (head=${samples.slice(0, 12).join(',')})`).toBeGreaterThanOrEqual(0);
  let rises = 0;
  for (let i = 1; i < samples.length; i += 1) if (samples[i] > samples[i - 1]) rises += 1;
  expect(rises, `§5 growth: narration length rose across samples (saw ${rises} rises; head=${samples.slice(0, 12).join(',')})`).toBeGreaterThanOrEqual(3);

  // Suggestions — at least three roads offered.
  await page.waitForSelector('.suggestions button', { timeout: 120_000 });
  expect(await page.locator('.suggestions button').count()).toBeGreaterThanOrEqual(3);

  // A custom action echoes as the player's line.
  const before = await turnCount(page);
  await act(page, 'I study the gold-thread mark on the door.');
  await page.waitForFunction(
    (count) => document.querySelectorAll('main.adventure-log .turn-entry').length > count,
    before,
    { timeout: 120_000 }
  );
  await expect(page.locator('.player-line', { hasText: 'gold-thread mark' }).first()).toBeVisible();

  // The roll — die, total, and the deed stamp within honest bounds.
  const rolled = await rollIfAsked(page);
  if (rolled) {
    const stamp = (await page.locator('.roll-stamp').last().textContent()) || '';
    const match = stamp.match(/(\d+)/g);
    expect(match, `roll stamp shows numbers: "${stamp}"`).toBeTruthy();
    const deed = page.locator('.player-line.deed').last();
    if (await deed.isVisible().catch(() => false)) {
      expect(((await deed.textContent()) || '').trim().length).toBeGreaterThan(0);
    }
  }

  // The sheet knows the blood.
  await openSheet(page);
  await expect(page.locator('.stat-ribbon').first()).toContainText(/\d+\s*\/\s*\d+\s*HP/);
});

test('G6 ticks carry phrases, whispers stay under four, no empty rows', async ({ page }) => {
  await seedFixture(page);
  const dividers = page.locator('main.adventure-log .time-divider');
  expect(await dividers.count(), 'the fixture advanced time twice').toBeGreaterThanOrEqual(2);
  for (let i = 0; i < await dividers.count(); i += 1) {
    const phrase = ((await dividers.nth(i).locator('em').first().textContent().catch(() => '')) || (await dividers.nth(i).textContent()) || '').trim();
    expect(phrase.length, `tick ${i} carries a phrase`).toBeGreaterThan(0);
    expect(await dividers.nth(i).locator('.whispers span').count(), `tick ${i} whispers`).toBeLessThanOrEqual(4);
  }
  const emptyParagraphs = await page.locator('main.adventure-log .narration p').evaluateAll(
    (nodes) => nodes.filter((node) => !(node.textContent || '').trim()).length
  );
  expect(emptyParagraphs, 'no empty narration paragraphs').toBe(0);
});

test('G6 the recap appears once per sitting and not twice', async ({ page }) => {
  await seedFixture(page);
  // Leave for the hearth, come back: the recap greets the return… once.
  await page.click('nav button:has-text("Hearth")');
  await page.waitForSelector('.title-page', { timeout: 20_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  expect(await page.locator('.recap-card').count(), 'one recap on return').toBe(1);

  await page.click('nav button:has-text("Hearth")');
  await page.waitForSelector('.title-page', { timeout: 20_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  expect(await page.locator('.recap-card').count(), 'no second recap this sitting').toBe(0);
});

test('G6 reduced motion: chips carry no animation classes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedFixture(page);
  const animated = await page.locator('.suggestions button').evaluateAll(
    (nodes) => nodes.filter((node) => /chip-enter|animate|slide|fade/i.test(node.className)).map((node) => node.className)
  );
  expect(animated, `no animation classes under reduced motion: ${animated.join(' | ')}`).toEqual([]);
});
