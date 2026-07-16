import { expect, test } from '@playwright/test';

// G1 THE COLD OPEN — the title page rises from nothing with a console
// clean of errors, and the shelf offers a new legend.

test('G1 cold open: title page, new-spine, zero console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto('/');
  await page.waitForSelector('.title-page', { timeout: 45_000 });

  // The arrival may hold the wall behind a first-touch veil; a pointer tap
  // is the player's own gesture.
  const wall = page.locator('.book-wall');
  if (!(await wall.isVisible().catch(() => false))) {
    await page.mouse.click(20, 20);
  }
  await expect(wall).toBeVisible({ timeout: 30_000 });

  const title = page.locator('.title-page h1').first();
  await expect(title).toBeVisible();
  expect((await title.textContent())?.trim().length, 'the title hero text').toBeGreaterThan(0);

  const newSpine = page.locator('.book-spine.new-spine');
  await expect(newSpine).toBeVisible();

  await page.waitForTimeout(3000); // let late async errors surface
  expect(errors, `console errors at cold open:\n${errors.join('\n')}`).toEqual([]);
});
