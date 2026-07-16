import { expect, test } from '@playwright/test';
import { boot } from './lib/harness';

// G4 THE HERO'S TENOR — presentation, pronouns, and the mark are the
// player's to declare; three voices audition; a blessing survives a full
// reload; and on the live tier the portrait is a real painting.

async function walkToHeroForge(page: any, sparkIndex = 0) {
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
  await page.locator('.spark-card').nth(sparkIndex).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });
}

test('G4 tenor controls, three auditions, and a blessing that survives reload', async ({ page }) => {
  await boot(page);
  await walkToHeroForge(page);

  await page.locator('.door-tab').nth(2).click(); // the hand door

  await expect(page.locator('label:has-text("Presentation") select').first()).toBeVisible();
  await expect(page.locator('label:has-text("Pronouns") input').first()).toBeVisible();
  await expect(page.locator('label:has-text("Distinguishing mark") input').first()).toBeVisible();

  const chips = page.locator('.audition-chip');
  await expect(chips).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) {
    await expect(chips.nth(i), `audition ${i} offers itself`).toBeEnabled();
    expect(((await chips.nth(i).textContent()) || '').trim().length, `audition ${i} names its voice`).toBeGreaterThan(0);
  }

  await chips.nth(1).click();
  await expect(chips.nth(1)).toHaveClass(/selected/);

  // The blessing must survive a FULL reload. The player walks back through
  // the same doors; the blessed chip is still marked.
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await walkToHeroForge(page);
  await page.locator('.door-tab').nth(2).click();
  await expect(page.locator('.audition-chip.selected'), 'the blessing survived the reload').toBeVisible({ timeout: 10_000 });
  const selectedIndex = await page.locator('.audition-chip').evaluateAll(
    (nodes) => nodes.findIndex((node) => node.classList.contains('selected'))
  );
  expect(selectedIndex, 'the SAME voice is still blessed').toBe(1);
});

test('G4 live tier: the hero portrait preview is a real painted image', async ({ page }) => {
  test.setTimeout(300_000);
  await boot(page);
  await walkToHeroForge(page);

  // The bones door deals a full hero; the preview paints from the canon.
  await page.locator('.door-tab').nth(0).click();

  await page.waitForFunction(() => {
    const img = document.querySelector('.hero-portrait img') as HTMLImageElement | null;
    return !!img && img.naturalWidth > 0 && (img.src.startsWith('blob:') || img.src.startsWith('data:image/'));
  }, undefined, { timeout: 240_000 });

  const src = await page.locator('.hero-portrait img').first().getAttribute('src');
  expect(src, 'portrait src is a real blob/data image').toMatch(/^(blob:|data:image\/)/);
  expect(src || '', 'portrait is not the mock SVG').not.toContain('svg');
});
