import { expect, test } from '@playwright/test';

// ------------------------------------------------------------
// H4 — LAYOUT GEOMETRY COURTS (Rule 26 upgrade: CSS source → real geometry)
//
// The Node suite proves CSS source text. This court proves rendered
// geometry in a real browser at mobile widths, where overflow, clipping,
// and minimum tap-target violations are invisible in source.
//
// Three viewports chosen to cover the most common mobile breakpoints:
//   360 — the minimum modern Android target
//   390 — iPhone 14 Pro (most common iOS at beta)
//   430 — iPhone 14 Plus / max practical width
//
// H5 extends this court with the specific Stage 1–2 regression geometry
// (T6 chip-rail vs narration, T7 avatar, T10 region banner clipping).
// ------------------------------------------------------------

const WIDTHS = [360, 390, 430];
const VIEWPORT_HEIGHT = 844; // common mobile height

for (const width of WIDTHS) {
  test(`layout at ${width}px: title screen has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', (err) => errors.push(String(err)));

    await page.goto('/');
    // Wait for any of the known title-screen elements
    await page.waitForSelector('.title-page, .book-wall, .book-spine', { timeout: 45_000 });

    // The viewport must not overflow horizontally — the most common
    // mobile layout bug (content wider than viewport causes horizontal scroll).
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflowX, `horizontal overflow at ${width}px viewport`).toBe(false);

    // The page body must not be wider than the viewport.
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth, `body width (${bodyWidth}) must not exceed viewport width (${width})`).toBeLessThanOrEqual(width + 2); // +2 for sub-pixel rounding

    // Zero console errors at render
    expect(errors, `console errors at ${width}px:\n${errors.join('\n')}`).toEqual([]);
  });

  test(`layout at ${width}px: interactive elements meet 44px tap-target floor`, async ({ page }) => {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
    await page.goto('/');
    await page.waitForSelector('.title-page, .book-wall, .book-spine', { timeout: 45_000 });

    // Tap-target law: every interactive element a player is expected to
    // tap must be at least 44×44 CSS pixels (Apple HIG / WCAG 2.5.8).
    // We check the primary action buttons on the title screen.
    const tapTargetMinPx = 44;
    const buttons = page.locator('button:visible, [role="button"]:visible');
    const count = await buttons.count();
    if (count === 0) {
      // No buttons visible yet (e.g., wall veil) — tap to reveal.
      await page.mouse.click(width / 2, VIEWPORT_HEIGHT / 2);
      await page.waitForTimeout(2000);
    }

    const visibleButtons = await buttons.all();
    for (const btn of visibleButtons.slice(0, 5)) { // check first 5 to keep test fast
      const box = await btn.boundingBox();
      if (!box) continue; // off-screen or detached
      // Primary action buttons (with text content) must meet the floor.
      // Icon-only decorative elements may be smaller.
      const text = (await btn.textContent() || '').trim();
      if (text.length < 2) continue; // icon-only, skip
      expect(
        Math.min(box.width, box.height),
        `button "${text.slice(0, 20)}" at ${width}px has min dimension ${Math.min(box.width, box.height).toFixed(1)} — must be ≥ ${tapTargetMinPx}px`,
      ).toBeGreaterThanOrEqual(tapTargetMinPx);
    }
  });
}

test('layout at 360px: main content is visible (not clipped by safe-area rules)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: VIEWPORT_HEIGHT });
  await page.goto('/');
  await page.waitForSelector('.title-page, .book-wall, .book-spine', { timeout: 45_000 });

  // The primary visible region must start within the viewport.
  // A large positive margin-top from incorrect safe-area application
  // can push content entirely off screen.
  const topContentY = await page.evaluate(() => {
    // Find the first visible child of document.body
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const style = window.getComputedStyle(el as HTMLElement);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const box = (el as HTMLElement).getBoundingClientRect();
      if (box.width > 0 && box.height > 0 && box.top >= 0) return box.top;
    }
    return -1;
  });
  expect(topContentY, 'first visible content must be within the viewport (not pushed below by safe-area margin)').toBeGreaterThanOrEqual(0);
  expect(topContentY, 'first visible content must be within the visible area (top half)').toBeLessThan(VIEWPORT_HEIGHT / 2);
});
