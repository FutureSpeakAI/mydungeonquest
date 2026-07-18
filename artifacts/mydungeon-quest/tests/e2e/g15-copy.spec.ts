import { expect, test } from '@playwright/test';
import { boot, closeModal, doomFixture, openChapter, openCodex, openSheet, openStorybook, seedFixture } from './lib/harness';

// G15 COPY AND CAPTION MECHANICS — no leaked values, no clipped headings,
// no blind images, no stuttered paragraphs, no prompt language on stage.
// The verify desk is exempt (it displays raw hashes and JSON by design).

const BAD_VALUES: [RegExp, string][] = [
  [/\bundefined\b/, 'undefined'],
  [/\bnull\b/, 'null'],
  [/\bNaN\b/, 'NaN'],
  [/\[object /, '[object'],
  [/\{\{[^}]*\}\}/, 'template braces']
];
// The letter's phrases, matched the way prompts actually leak.
const LEAK_PHRASES = ['appearance canon', 'style bible', 'Rendered as', 'No text', '16:9'];

function sweepValues(text: string, surface: string): string[] {
  const hits: string[] = [];
  for (const [pattern, name] of BAD_VALUES) {
    const match = pattern.exec(text);
    if (match) {
      const at = Math.max(0, match.index - 60);
      hits.push(`${surface}: "${name}" near "…${text.slice(at, match.index + 60).replace(/\s+/g, ' ')}…"`);
    }
  }
  return hits;
}

async function sweepDomMechanics(page: any, surface: string): Promise<string[]> {
  return page.evaluate((label: string) => {
    const problems: string[] = [];
    const headings = document.querySelectorAll('h1, h2, h3, h4, figcaption, .day-chip, .cite, .campaign-mast span');
    headings.forEach((node) => {
      const el = node as HTMLElement;
      if (el.offsetParent !== null && el.scrollWidth > el.clientWidth) {
        problems.push(`${label}: clipped "${(el.textContent || '').trim().slice(0, 60)}" (${el.scrollWidth}>${el.clientWidth})`);
      }
    });
    document.querySelectorAll('img').forEach((img) => {
      const el = img as HTMLImageElement;
      if (el.offsetParent === null) return;
      if (!(el.naturalWidth > 0)) problems.push(`${label}: blind img src=${el.src.slice(0, 60)}`);
      const alt = (el.alt || '').trim();
      if (!alt || alt.toLowerCase() === 'image') problems.push(`${label}: img alt="${alt}" src=${el.src.slice(0, 60)}`);
    });
    const narrations = Array.from(document.querySelectorAll('.narration'));
    for (const block of narrations) {
      const paragraphs = Array.from(block.querySelectorAll('p')).map((p) => (p.textContent || '').trim());
      for (let i = 1; i < paragraphs.length; i += 1) {
        if (paragraphs[i] && paragraphs[i] === paragraphs[i - 1]) problems.push(`${label}: consecutive identical paragraphs "${paragraphs[i].slice(0, 60)}"`);
      }
    }
    return problems;
  }, surface);
}

async function sweepLeaks(page: any, surface: string): Promise<string[]> {
  return page.evaluate(({ label, phrases }: { label: string; phrases: string[] }) => {
    const problems: string[] = [];
    const stages = document.querySelectorAll('.narration p, figcaption, .page-prose, .beat-line, .recap-card, .whispers span, .time-divider em');
    stages.forEach((node) => {
      const text = node.textContent || '';
      for (const phrase of phrases) {
        const hit = phrase === 'appearance canon' || phrase === 'style bible'
          ? text.toLowerCase().includes(phrase)
          : text.includes(phrase);
        if (hit) problems.push(`${label}: prompt leak "${phrase}" in "${text.trim().slice(0, 80)}"`);
      }
    });
    return problems;
  }, { label: surface, phrases: LEAK_PHRASES });
}

test('G15 copy law across title, forge, feed, codex, and sheet', async ({ page }) => {
  test.setTimeout(300_000);
  const problems: string[] = [];

  await boot(page);
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'title'));

  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'forge:world'));
  problems.push(...await sweepDomMechanics(page, 'forge:world'));
  await page.locator('.door-tab').nth(2).click(); // deep door copy too
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'forge:deep'));
  await page.locator('.door-tab').nth(0).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'forge:hero'));
  problems.push(...await sweepDomMechanics(page, 'forge:hero'));

  // The seeded fixture table — feed, codex, sheet.
  await seedFixture(page, { boot: false });
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'feed'));
  problems.push(...await sweepDomMechanics(page, 'feed'));
  problems.push(...await sweepLeaks(page, 'feed'));

  await openCodex(page);
  // (58C logged edit — Directive XIV) The codex is the Book: the sweep
  // walks all six chapters, every pack body, and the Traveler's Chart —
  // new player-reachable copy joins the law, nothing leaves it.
  for (const chapter of ['tale', 'people', 'places', 'things', 'debts', 'party']) {
    await openChapter(page, chapter);
    problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), `codex:${chapter}`));
    problems.push(...await sweepDomMechanics(page, `codex:${chapter}`));
  }
  await openChapter(page, 'things');
  for (const head of await page.locator('.pack-head').all()) {
    await head.click();
    problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'codex:pack'));
  }
  await openChapter(page, 'places');
  // (56.1 logged edit — Directive VII.12) The copy law now walks one place
  // page and one soul page: the presence sections and the last-known-ground
  // line are player-reachable copy, so the sweeps must reach them too.
  await page.locator('.region-gallery article').first().click();
  await page.waitForSelector('.place-page');
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'codex:place'));
  problems.push(...await sweepDomMechanics(page, 'codex:place'));
  // (58C.2 logged edit — Directive XIV) Souls stand in the People chapter
  // now: the sweep turns there before pressing a soul card — the same soul
  // page, reached through its own chapter door.
  await openChapter(page, 'people');
  await page.locator('.soul-card').first().click();
  await page.waitForSelector('.soul-page');
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'codex:soul'));
  problems.push(...await sweepDomMechanics(page, 'codex:soul'));
  await closeModal(page);

  await openSheet(page);
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'sheet'));
  await closeModal(page);

  expect(problems, `copy law violations:\n${problems.join('\n')}`).toEqual([]);
});

test('G15 copy law across the storybook', async ({ page }) => {
  test.setTimeout(300_000);
  await seedFixture(page, { sealed: true });
  const frame = await openStorybook(page);
  const problems: string[] = [];

  const bookText = await frame.locator('body').innerText();
  problems.push(...sweepValues(bookText, 'storybook'));
  for (const phrase of LEAK_PHRASES) {
    const proseHit = await frame.locator('.folio-prose, figcaption').evaluateAll((nodes, needle) => {
      return nodes.some((node) => {
        const text = node.textContent || '';
        return needle === 'appearance canon' || needle === 'style bible'
          ? text.toLowerCase().includes(needle)
          : text.includes(needle);
      });
    }, phrase);
    if (proseHit) problems.push(`storybook: prompt leak "${phrase}" in retelling prose`);
  }
  const imgProblems = await frame.locator('img').evaluateAll((nodes) => nodes
    .filter((node) => !((node as HTMLImageElement).naturalWidth > 0) || !((node as HTMLImageElement).alt || '').trim() || ((node as HTMLImageElement).alt || '').trim().toLowerCase() === 'image')
    .map((node) => `storybook: img alt="${(node as HTMLImageElement).alt}" natural=${(node as HTMLImageElement).naturalWidth}`));
  problems.push(...imgProblems);

  expect(problems, `storybook copy violations:\n${problems.join('\n')}`).toEqual([]);
});

// (Task 57) G15 grows over the battle surfaces: the tracker banner, the
// companion sheet lines, the memorial cards, and the fall note on a held
// thread — all standing in the doom fixture BEFORE any dice walk, so the
// sweep is deterministic. Fail-closed: each surface must exist before it
// is swept, so an absent surface can never pass silently.
test('G15 copy law across the battle surfaces', async ({ page }) => {
  test.setTimeout(300_000);
  await seedFixture(page, { source: doomFixture() });
  const problems: string[] = [];

  await expect(page.locator('.combat-banner')).toBeVisible();
  problems.push(...sweepValues(await page.locator('.combat-banner').innerText(), 'combat banner'));
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'battle feed'));
  problems.push(...await sweepDomMechanics(page, 'battle feed'));
  problems.push(...await sweepLeaks(page, 'battle feed'));

  await openCodex(page);
  // (58C logged edit — Directive XIV) The grave stands in People, the
  // fall note in Debts — same assertions, each on its own page now.
  await openChapter(page, 'people');
  expect(await page.locator('.soul-card.memorial').count(), 'the pre-sealed grave stands for the sweep').toBeGreaterThanOrEqual(1);
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'battle codex:people'));
  problems.push(...await sweepDomMechanics(page, 'battle codex:people'));
  // (58C.2 logged edit — Directive XIV) The companion sheet-lines ride the
  // party strip now — the count reads the Party page, and the sweep walks
  // that page too, so the strip's copy joins the law.
  await openChapter(page, 'party');
  const codexSheetLines = await page.locator('.sheet-line').count();
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'battle codex:party'));
  problems.push(...await sweepDomMechanics(page, 'battle codex:party'));
  await openChapter(page, 'debts');
  expect(await page.locator('.thread-fall').count(), 'the fall note stands on the held thread for the sweep').toBeGreaterThanOrEqual(1);
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'battle codex:debts'));
  problems.push(...await sweepDomMechanics(page, 'battle codex:debts'));
  await closeModal(page);

  await openSheet(page);
  const sheetSheetLines = await page.locator('.sheet-line').count();
  expect(codexSheetLines + sheetSheetLines, 'the companion sheet lines stand for the sweep').toBeGreaterThanOrEqual(2);
  problems.push(...sweepValues(await page.evaluate(() => document.body.innerText), 'battle sheet'));
  problems.push(...await sweepDomMechanics(page, 'battle sheet'));
  await closeModal(page);

  expect(problems, `battle-surface copy violations:\n${problems.join('\n')}`).toEqual([]);
});
