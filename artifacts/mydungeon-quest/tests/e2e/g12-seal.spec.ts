import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { boot, openStorybook, seedFixture } from './lib/harness';
import { GAME_ROOT } from './lib/vision';

// G12 SEAL AND VERIFY — the ceremony renders the verified state, the book
// quotes first words with citations, the export leaves as bytes, a flipped
// byte is refused at the door, and the untouched record returns home.

const EXPORT_DIR = path.join(GAME_ROOT, 'test-results', 'export');

test('G12 seal, storybook citations, export, verify, and the tamper gate', async ({ page, browser }) => {
  test.setTimeout(420_000);
  await seedFixture(page, { sealed: true });

  // The keepsakes door on a completed tale → the ceremony's verify wax.
  await page.locator('button', { hasText: /keepsake/i }).first().click();
  await expect(page.locator('.verify-wax').first()).toContainText(/This tale is true/i, { timeout: 60_000 });
  await expect(page.locator('.verify-wax').first()).toContainText(/\d+ turns/i);

  // The export keepsake — real bytes to disk.
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    page.locator('button', { hasText: /export/i }).first().click()
  ]);
  const exportPath = path.join(EXPORT_DIR, 'chronicle.json');
  await download.saveAs(exportPath);
  const exported = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  expect(Array.isArray(exported.journal), 'the export carries its journal').toBe(true);

  // The storybook keepsake — through the ceremony's own door (iteration-2
  // logged edit: the keepsakes overlay is still open here and swallows a nav
  // tap; the rig now walks the app's designed path, criterion unchanged).
  await page.locator('button:has-text("Open the storybook")').first().click();
  await page.waitForSelector('iframe.book-frame', { timeout: 120_000 });
  const frame = page.frameLocator('iframe.book-frame');
  await frame.locator('.leaf').first().waitFor({ timeout: 60_000 });
  const words = frame.locator('.words');
  expect(await words.count()).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < await words.count(); i += 1) {
    const line = (await words.nth(i).textContent()) || '';
    expect(line, `dramatis line ${i} wears quotes`).toMatch(/[“"][^”"]+[”"]/);
    expect(line, `dramatis line ${i} cites its turn`).toMatch(/\(turn \d+\)/);
  }
  const bookText = await frame.locator('body').innerText();
  expect(bookText).toMatch(/Edda[\s\S]{0,400}?\(turn 1\)/);
  expect(bookText).toMatch(/Corin Voss[\s\S]{0,400}?\(turn 3\)/);

  // THE TAMPER GATE — flip one byte inside a sealed turn's narration.
  const tampered = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const turnRow = (tampered.journal || []).find((row: any) => row?.type === 'turn' && row?.payload?.dm?.narration_blocks?.length);
  expect(turnRow, 'a sealed turn to tamper with').toBeTruthy();
  const text: string = turnRow.payload.dm.narration_blocks[0].text;
  turnRow.payload.dm.narration_blocks[0].text = `${text.slice(0, 1) === 'A' ? 'B' : 'A'}${text.slice(1)}`;
  const tamperedPath = path.join(EXPORT_DIR, 'chronicle-tampered.json');
  fs.writeFileSync(tamperedPath, JSON.stringify(tampered, null, 2));

  // A clean hearth: fresh context, empty shelf.
  const cleanContext = await browser.newContext({ baseURL: (test.info().project.use as any).baseURL });
  const desk = await cleanContext.newPage();
  await boot(desk, { proving: false });

  const spinesBefore = await desk.locator('.book-spine:not(.new-spine)').count();
  expect(spinesBefore, 'the clean shelf starts empty').toBe(0);

  // The desk refuses the flipped byte…
  await desk.locator('input[type="file"]').setInputFiles(tamperedPath);
  await expect(desk.locator('body')).toContainText(/Restore failed/i, { timeout: 30_000 });
  expect(await desk.locator('.book-spine:not(.new-spine)').count(), 'the tampered tale never reaches the shelf').toBe(0);
  expect(await desk.locator('main.adventure-log').count(), 'no table seats a tampered tale').toBe(0);

  // …and welcomes the true record home.
  await desk.locator('input[type="file"]').setInputFiles(exportPath);
  await desk.waitForSelector('main.adventure-log', { timeout: 60_000 });
  await desk.locator('button', { hasText: /keepsake/i }).first().click();
  await expect(desk.locator('.verify-wax').first()).toContainText(/This tale is true/i, { timeout: 60_000 });
  await cleanContext.close();
});
