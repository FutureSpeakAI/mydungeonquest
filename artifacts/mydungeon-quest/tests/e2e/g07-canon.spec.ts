import { expect, test } from '@playwright/test';
import { bodyText, closeModal, openCodex, openStorybook, seedFixture } from './lib/harness';

// G7 THE X-CARD LAW — the struck sentence appears NOWHERE: not the feed,
// not the Codex, not any recap, not any retelling surface. Only the marker
// remains. G8 — the Codex remembers days, debts, places, and souls, with
// citations for everything.

const STRUCK = 'THE STRUCK SENTENCE';

test('G7 the struck turn leaves only its marker', async ({ page }) => {
  await seedFixture(page);

  const marker = page.locator('.redacted-line').first();
  await expect(marker).toBeVisible();
  await expect(marker).toContainText(/removed from active canon/i);

  expect(await bodyText(page), 'feed carries no struck sentence').not.toContain(STRUCK);

  await openCodex(page);
  expect(await bodyText(page), 'codex carries no struck sentence').not.toContain(STRUCK);
  await closeModal(page);

  // The retelling surface — the book itself.
  const frame = await openStorybook(page);
  const bookText = await frame.locator('body').innerText();
  expect(bookText, 'the storybook carries no struck sentence').not.toContain(STRUCK);
  await page.locator('.modal header button[aria-label="Close"], .overlay-close, button:has-text("Close")').first().click().catch(() => {});

  // The recap surface — leave and return.
  await page.click('nav button:has-text("Hearth")');
  await page.waitForSelector('.title-page', { timeout: 20_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  expect(await bodyText(page), 'the recap carries no struck sentence').not.toContain(STRUCK);
});

test('G8 codex: Day 3, threads with citations, tappable atlas, souls with ties', async ({ page }) => {
  await seedFixture(page);
  await openCodex(page);

  // The day chip.
  await expect(page.locator('.day-chip').first()).toHaveText(/Day 3/);

  // The open debt — kind badge, holder, sworn-turn citation.
  const debtRow = page.locator('.thread-row', { hasText: 'Corin owes Edda restitution' }).first();
  await expect(debtRow).toBeVisible();
  await expect(debtRow.locator('.thread-kind')).toContainText(/debt/i);
  await expect(debtRow.locator('small')).toContainText(/held by Corin Voss/i);
  await expect(debtRow.locator('small')).toContainText(/turn 0/);

  // The resolved oath — struck through, outcome cited.
  const oathRow = page.locator('.thread-row', { hasText: 'The lantern oath' }).first();
  await expect(oathRow).toBeVisible();
  const struckThrough = await oathRow.evaluate((node) => {
    if (node.classList.contains('settled')) return true;
    const probe = (el: Element) => getComputedStyle(el).textDecorationLine.includes('line-through');
    return probe(node) || Array.from(node.querySelectorAll('*')).some(probe);
  });
  expect(struckThrough, 'the settled thread is struck through').toBe(true);
  await expect(oathRow.locator('.outcome')).toContainText(/kept/i);

  // The atlas — Larkspur Vale's place page.
  const vale = page.locator('.region-gallery article.tappable', { hasText: 'Larkspur Vale' }).first();
  await expect(vale).toBeVisible();
  await vale.click();
  const place = page.locator('.place-page').first();
  await expect(place).toBeVisible();
  await expect(place.locator('h4')).toContainText('Larkspur Vale');
  expect(((await place.locator('.place-state').first().textContent()) || '').trim().length, 'state badge').toBeGreaterThan(0);
  // (iteration-2 logged edit) The plate IS the .region-plate img element —
  // the old selector looked for an img nested inside it and matched nothing.
  const hasPlate = await place.locator('img.region-plate').isVisible().catch(() => false);
  if (!hasPlate) {
    const prose = (await place.textContent()) || '';
    // (iteration-2 logged edit) The fixture's Vale visual reads "…ruined
    // watchtower…", not "lantern" — the spec quoted a draft fixture. Same
    // criterion: the canon prose stands in for the unpainted plate.
    expect(prose, 'canon text stands in for the unpainted plate').toContain('watchtower');
  }
  await expect(place.locator('.cite')).toContainText(/turn 0/);

  // The Duchy's sworn chip walks to Corin's soul page.
  await closeModal(page);
  await openCodex(page);
  const duchy = page.locator('.region-gallery article.tappable', { hasText: 'The Duchy' }).first();
  await expect(duchy).toBeVisible();
  await duchy.click();
  const sworn = page.locator('.sworn-chips button, .sworn-chips .tie-chip', { hasText: 'Corin Voss' }).first();
  await expect(sworn, 'Corin Voss sworn of the Duchy').toBeVisible();
  await sworn.click();

  const soul = page.locator('.soul-page').first();
  await expect(soul).toBeVisible();
  await expect(soul).toContainText('Corin Voss');
  await expect(soul.locator('.voice-italic')).toContainText(/First words/i);
  await expect(soul.locator('.voice-italic')).toContainText(/\(turn 3\)/);

  // Ties navigate both directions: Corin ↔ Edda.
  const tieToEdda = soul.locator('.tie-chips .tie-chip', { hasText: 'Edda' }).first();
  await expect(tieToEdda, 'Corin remembers Edda beside him').toBeVisible();
  await tieToEdda.click();
  const eddaPage = page.locator('.soul-page').first();
  await expect(eddaPage).toContainText('Edda');
  await expect(eddaPage.locator('.voice-italic')).toContainText(/\(turn 1\)/);
  await expect(eddaPage.locator('.tie-chips .tie-chip', { hasText: 'Corin Voss' }).first(), 'and Edda remembers Corin').toBeVisible();
});
