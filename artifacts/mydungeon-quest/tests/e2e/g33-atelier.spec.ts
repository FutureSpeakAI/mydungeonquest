import { expect, test } from '@playwright/test';
import { boot, mediaBase64, mediaIndex, openStorybook, readCampaign, seedFixture } from './lib/harness';
import { attirePairVerdict, sheetIdentityVerdict, sheetSoulClause } from './lib/frameLaw';
// The laws' own seats aim the walks (mirrors-one-seat): the atelier's six
// strokes and the threshold's five stages are read from the app's bytes.
import { ATELIER_FIELDS } from '../../src/lib/atelier.js';
import { RITE_STAGES } from '../../src/lib/threshold.js';

// ============================================================
// G33 — ATELIER & THRESHOLD (60B §4). Five sittings on the LIVE
// forge: the strokes land visibly on portrait and sheet (a), the
// ten-voice deal and the blessing that survives a reload (b), the
// threshold rite's stages in walked order (c), the unmet villain
// held out of the Book until the record introduces them (d), and
// the 44px polish floors across the glass matrix (e). The rig's
// smith is the mock; the easel keeps its live keys — so the paint
// is real while the story stays deterministic.
// ============================================================

const HERO = {
  name: 'Brann Copperquill',
  mark: 'a copper-stained left hand',
  attire: 'patched sky-blue longcoat with bone toggles',
  accessory: 'copper spyglass on a neck cord',
};

async function walkToHeroForge(page: any): Promise<void> {
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
  await page.locator('.spark-card').nth(1).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });
}

async function fillByAsk(page: any, ask: string, value: string): Promise<void> {
  await page.locator(`label:has-text("${ask.replace(/"/g, '\\"')}") input`).first().fill(value);
}

function atelierAsk(key: string): string {
  const entry = (ATELIER_FIELDS as any[]).find((f) => f.key === key);
  if (!entry?.ask) throw new Error(`the atelier holds no stroke named "${key}" — the walk cannot aim`);
  return String(entry.ask);
}

test('G33a: the atelier strokes land visibly on the portrait and the sheet', async ({ page }) => {
  test.setTimeout(600_000);
  await boot(page);
  await walkToHeroForge(page);
  await page.locator('.door-tab').nth(2).click(); // the hand door
  const { fieldEntry } = await import('fatescript/smith');
  await fillByAsk(page, String(fieldEntry('hero', 'name')?.ask), HERO.name);
  await fillByAsk(page, String(fieldEntry('hero', 'mark')?.ask), HERO.mark);
  await fillByAsk(page, atelierAsk('attire'), HERO.attire);
  await fillByAsk(page, atelierAsk('accessory'), HERO.accessory);
  await page.locator('.audition-chip').first().click();
  await page.click('button:has-text("Begin the chronicle")');
  await page.waitForSelector('main.adventure-log', { timeout: 90_000 });

  const bornId = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.js');
    const all = await db.campaigns.toArray();
    return all[all.length - 1]?.id ?? null;
  });
  expect(bornId, 'the forged chronicle stands on the shelf').toBeTruthy();
  const campaign = await readCampaign(page, bornId);
  const card = campaign?.hero;
  expect(String(card?.signature ?? ''), 'the sealed signature carries the attire stroke').toContain('sky-blue longcoat');
  expect(String(card?.signature ?? ''), 'the sealed signature carries the accessory stroke').toContain('spyglass');

  // The easel works while the story runs — poll the media index for the
  // sealed bust and the derived sheet (live paint; generous patience).
  const deadline = Date.now() + 180_000;
  let bust: any = null; let sheet: any = null;
  while (Date.now() < deadline && (!bust || !sheet)) {
    const rows = (await mediaIndex(page, campaign.id)) as any[];
    bust = rows.find((r) => r.variant === 'bust' && r.label === HERO.name) ?? bust;
    sheet = rows.find((r) => r.variant === 'sheet' && r.label === HERO.name) ?? sheet;
    if (!bust || !sheet) await page.waitForTimeout(3_000);
  }
  if (!bust || !sheet) throw new Error(`the easel never sealed ${!bust ? 'the bust' : 'the sheet'} for ${HERO.name} — a named refusal, never a silent skip`);

  const bustBytes = Buffer.from(await mediaBase64(page, campaign.id, bust.assetHash), 'base64');
  const sheetBytes = Buffer.from(await mediaBase64(page, campaign.id, sheet.assetHash), 'base64');
  const pair = await attirePairVerdict({ aBytes: bustBytes, bBytes: sheetBytes, attire: String(card.signature), idSeed: 'g33a-attire-pair', criterion: 'g33a-attire' });
  console.log(`[G33a] attire pair: ${JSON.stringify(pair)}`);
  expect(pair.attire_consistent, `the longcoat and the spyglass ride both paintings (contradiction: ${pair.contradiction ?? 'none'})`).toBe(true);
  const identity = await sheetIdentityVerdict({ bytes: sheetBytes, clause: sheetSoulClause(card), idSeed: 'g33a-sheet-identity', criterion: 'g33a-identity' });
  console.log(`[G33a] sheet identity: ${JSON.stringify(identity)}`);
  expect(identity.subject_matches === true && identity.cells_agree === true,
    `the sheet depicts the forged soul in every cell (mismatch: ${identity.mismatch ?? 'none'})`).toBe(true);
});

test('G33b: ten voices audition and one blessing survives a full reload', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  await walkToHeroForge(page);
  await page.locator('.door-tab').nth(2).click();
  const chips = page.locator('.audition-chip');
  await expect(chips, 'the ten-voice deal stands whole').toHaveCount(10);
  const labels = await chips.evaluateAll((nodes) => nodes.map((node) => (node.textContent || '').trim()));
  expect(new Set(labels).size, 'every audition is its own voice — no chip dealt twice').toBe(10);
  await chips.nth(7).click(); // bless DEEP in the deal — the grown row is real
  await expect(chips.nth(7)).toHaveClass(/selected/);

  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await walkToHeroForge(page);
  await page.locator('.door-tab').nth(2).click();
  await expect(page.locator('.audition-chip.selected'), 'the blessing survived the reload').toBeVisible({ timeout: 10_000 });
  const selectedIndex = await page.locator('.audition-chip').evaluateAll(
    (nodes) => nodes.findIndex((node) => node.classList.contains('selected'))
  );
  expect(selectedIndex, 'the SAME deep-dealt voice is still blessed').toBe(7);
});

test('G33c: the threshold rite walks its stages in order and bows out on the open', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  await walkToHeroForge(page);
  await page.locator('.door-tab').nth(2).click();
  const { fieldEntry } = await import('fatescript/smith');
  await fillByAsk(page, String(fieldEntry('hero', 'name')?.ask), 'Rite Walker');
  await page.locator('.audition-chip').first().click();

  // The observer arms BEFORE the door opens — the rite's words are
  // transient and the court may never blink.
  await page.evaluate(() => {
    const w = window as any;
    w.__riteLog = [];
    const observer = new MutationObserver(() => {
      const el = document.querySelector('.rite-word');
      const word = el && el.textContent ? el.textContent.trim() : '';
      if (word && w.__riteLog[w.__riteLog.length - 1] !== word) w.__riteLog.push(word);
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  });
  await page.click('button:has-text("Begin the chronicle")');
  await page.waitForSelector('main.adventure-log', { timeout: 90_000 });
  const openWord = RITE_STAGES[RITE_STAGES.length - 1].word;
  await page.waitForFunction((expected: string) => {
    const log = (window as any).__riteLog || [];
    return log.includes(expected);
  }, openWord, { timeout: 120_000 });

  const walked: string[] = await page.evaluate(() => (window as any).__riteLog || []);
  console.log(`[G33c] rite walked: ${JSON.stringify(walked)}`);
  const canon = RITE_STAGES.map((stage: any) => stage.word);
  const indexes = walked.map((word) => canon.indexOf(word));
  expect(indexes.every((i) => i >= 0), 'the rite speaks only its five pinned words — never a spinner, never a percentage').toBe(true);
  for (let i = 1; i < indexes.length; i += 1) {
    expect(indexes[i] > indexes[i - 1], `the rite never walks backwards (${walked[i - 1]} → ${walked[i]})`).toBe(true);
  }
  expect(walked.length, 'the rite truly walked (three stages seen at least)').toBeGreaterThanOrEqual(3);
  expect(walked[walked.length - 1], 'the rite ends on the open').toBe(openWord);
});

test('G33d: an unmet villain never reaches the Book until the record introduces them', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  await seedFixture(page, { boot: true });
  const UNMET = 'Sable-Knife';
  await page.evaluate(async (name: string) => {
    const { db } = await import('/src/lib/db.js');
    const campaigns = await db.campaigns.toArray();
    const c = campaigns[campaigns.length - 1];
    c.codex = c.codex || {};
    c.codex.cast = Array.isArray(c.codex.cast) ? c.codex.cast : [];
    // An unmet soul BY CONSTRUCTION: no introduced_turn, no status, no
    // last_seen, no bond, no facts — the record has only heard the name.
    c.codex.cast.push({ name, role: 'a hired blade', visual: 'a lean figure in oiled leathers with a knife of blackened steel' });
    await db.campaigns.put(c);
  }, UNMET);
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });

  const closedBook = await openStorybook(page);
  const closedText = await closedBook.locator('body').innerText();
  expect(closedText.includes(UNMET), 'the Book keeps the unmet soul off its pages').toBe(false);

  // The record introduces them — the Book must now speak the name.
  await page.evaluate(async (name: string) => {
    const { db } = await import('/src/lib/db.js');
    const campaigns = await db.campaigns.toArray();
    const c = campaigns[campaigns.length - 1];
    const row = (c.codex?.cast ?? []).find((soul: any) => soul?.name === name);
    if (row) { row.introduced_turn = 2; row.last_seen = 'the toll road at dusk'; }
    await db.campaigns.put(c);
  }, UNMET);
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await page.locator('.book-spine:not(.new-spine)').first().click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  const openBook = await openStorybook(page);
  const openText = await openBook.locator('body').innerText();
  expect(openText.includes(UNMET), 'once introduced, the soul takes their seat in the Book').toBe(true);
});

test('G33e: the 44px polish floors hold across the glass matrix', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  await walkToHeroForge(page);
  await page.locator('.door-tab').nth(2).click();
  for (const [w, h] of [[360, 780], [768, 1024], [1280, 900]] as const) {
    await page.setViewportSize({ width: w, height: h });
    const seats: Array<[string, ReturnType<typeof page.locator>]> = [
      ['door tab', page.locator('.door-tab').first()],
      ['audition chip', page.locator('.audition-chip').first()],
      ['deep audition chip', page.locator('.audition-chip').nth(9)],
      ['repaint button', page.locator('.repaint-button').first()],
      ['begin door', page.locator('button:has-text("Begin the chronicle")').first()],
    ];
    for (const [name, seat] of seats) {
      await seat.scrollIntoViewIfNeeded();
      const box = await seat.boundingBox();
      expect(box, `${w}x${h}: ${name} stands on the glass`).toBeTruthy();
      expect(box!.height >= 43.5, `${w}x${h}: ${name} keeps the 44px floor (height ${box!.height.toFixed(1)})`).toBe(true);
      expect(box!.width >= 43.5, `${w}x${h}: ${name} keeps the 44px floor (width ${box!.width.toFixed(1)})`).toBe(true);
    }
  }
});
