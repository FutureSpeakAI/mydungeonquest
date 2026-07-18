import { expect, test } from '@playwright/test';
import { closeModal, doomFixture, openChapter, openCodex, readCampaign, seedFixture } from './lib/harness';

// ---- G28 — THE OPEN BOOK (Task 58C, Directive XIV) ----
//
// The codex becomes the Book: six chapters behind one nav door, a
// ribbon the TABLE holds across close and reopen; the Traveler's
// Chart drawn only from sealed crossings and cited to sealed turns;
// per-bearer packs one tap from provenance; and the table itself
// stripped to EXACTLY four chips — the tracker seated only while a
// battle stands, stillness honored end to end.

test.describe('G28 — the open book', () => {
  test('G28a — the traveler\'s chart: sealed roads only, costed by the calendar, cited, and doored', async ({ page }) => {
    test.setTimeout(240_000);
    await seedFixture(page);
    await openChapter(page, 'places');
    const chart = page.locator('.travelers-chart');
    await expect(chart).toBeVisible();

    // Two medallions — the record's own regions, plated when the harvest
    // hung art, honestly plateless when it did not. Never a third.
    await expect(chart.locator('g.chart-medallion')).toHaveCount(2);
    for (const name of ['Larkspur Vale', 'The Duchy']) {
      const medallion = chart.locator(`g.chart-medallion[data-region="${name}"]`);
      await expect(medallion).toHaveCount(1);
      expect(await medallion.locator('image').count() + await medallion.locator('.medallion-plateless').count()).toBeGreaterThan(0);
    }

    // One road between the pair; both sealed crossings cost a day, and
    // identical costs are spoken once.
    await expect(chart.locator('.chart-road')).toHaveCount(1);
    await expect(chart.locator('.chart-road-label')).toHaveText('1 day');

    // The current ground wears the mark: the homecoming stands in the Vale.
    const current = chart.locator('g.chart-medallion[data-current="true"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute('data-region', 'Larkspur Vale');

    // The played route, cited to its sealed TURNS — tick rows shift
    // indexes, never citations.
    const route = page.locator('.chart-route');
    await expect(route).toContainText('Larkspur Vale');
    await expect(route).toContainText('The Duchy');
    await expect(route).toContainText('(turn 5)');
    await expect(route).toContainText('(turn 7)');

    // Beyond the known regions the vellum stays blank — and says why.
    await expect(page.locator('.chart-vellum-note')).toBeVisible();

    // A medallion is a door to its place page, citations intact.
    await chart.locator('g.chart-medallion[data-region="The Duchy"]').click();
    // (58C.3 court repair — G28 ledger) The place page carries eyebrow h4s
    // beside the name; the name sits alone in the page header.
    await expect(page.locator('.place-page header h4')).toHaveText('The Duchy');
    await expect(page.locator('.place-page')).toContainText('Entered the tale on turn 1');
  });

  test('G28b — six chapters behind one door; the ribbon is the table\'s and survives close and reopen', async ({ page }) => {
    test.setTimeout(240_000);
    await seedFixture(page);
    await openCodex(page);

    // The closed set, in the directive's order.
    const tabs = page.locator('.book-chapters button[data-chapter]');
    await expect(tabs).toHaveCount(6);
    expect(await tabs.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-chapter'))))
      .toEqual(['tale', 'people', 'places', 'things', 'debts', 'party']);

    // Every chapter wears the head and the same sealed clock.
    for (const chapter of ['tale', 'people', 'places', 'things', 'debts', 'party']) {
      await openChapter(page, chapter);
      await expect(page.locator('.modal .codex-head')).toBeVisible();
      await expect(page.locator('.modal .day-chip')).toContainText('Day 5');
    }

    // The ribbon: close on Things, reopen on Things — the table held it.
    await openChapter(page, 'things');
    await closeModal(page);
    await openCodex(page);
    await expect(page.locator('.book-page[data-page="things"]')).toBeVisible();

    // Deeper still: a soul page held whole across the door.
    await openChapter(page, 'people');
    await page.locator('.soul-card', { hasText: 'Corin Voss' }).first().click();
    await expect(page.locator('.soul-page')).toBeVisible();
    await closeModal(page);
    await openCodex(page);
    await expect(page.locator('.soul-page')).toBeVisible();
    await expect(page.locator('.soul-page')).toContainText('Corin Voss');
  });

  test('G28c — the packs: per-bearer views of the sealed trove, provenance one tap deep, the echo doors through', async ({ page }) => {
    test.setTimeout(240_000);
    const id = await seedFixture(page);
    const campaign = await readCampaign(page, id);
    await openChapter(page, 'things');

    // Hero first, then the companion — each pack a filtered trove view.
    const packs = page.locator('article.pack');
    await expect(packs).toHaveCount(2);
    expect(await packs.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-pack'))))
      .toEqual([campaign.hero.name, 'Edda']);

    // Packs rest closed; the law is spoken only on an open page.
    await expect(page.locator('.pack-body')).toHaveCount(0);
    await page.locator('article.pack[data-pack="Edda"] .pack-head').click();
    const body = page.locator('article.pack[data-pack="Edda"] .pack-body');
    await expect(body).toBeVisible();
    await expect(body.locator('.pack-law')).toHaveText('This pack is the sealed trove, filtered to one bearer.');

    // Provenance one tap deep: the ferry ledger's chain of hands, cited.
    await body.locator('.pack-holding button', { hasText: /ferry ledger/i }).first().click();
    await expect(body.locator('.trove-chain')).toBeVisible();
    await expect(body.locator('.trove-chain')).toContainText(new RegExp(`${campaign.hero.name} \\(turn \\d+\\) → Edda \\(turn \\d+\\)`));

    // The echo on the party page counts — and doors through to the pack,
    // already open, because the table carried the nav.
    await openChapter(page, 'party');
    const echo = page.locator('.pack-echo');
    await expect(echo).toHaveCount(1);
    await expect(echo).toContainText(/\d+ coin · \d+ held — open the pack/);
    await echo.click();
    await expect(page.locator('.book-page[data-page="things"]')).toBeVisible();
    await expect(page.locator('article.pack[data-pack="Edda"] .pack-body')).toBeVisible();
  });

  test('G28d — the table law: four chips exactly, the tracker bound to the battle flag, stillness honored', async ({ page }) => {
    test.setTimeout(240_000);
    const id = await seedFixture(page);
    const campaign = await readCampaign(page, id);

    // EXACTLY four chips on the whole surface — a fifth requires amending
    // the directive.
    const chips = page.locator('[data-chip]');
    await expect(chips).toHaveCount(4);
    expect(new Set(await chips.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-chip')))))
      .toEqual(new Set(['calendar', 'ground', 'party', 'health']));

    // The chips speak the sealed record's words.
    await expect(page.locator('[data-chip="calendar"]')).toContainText('Day 5 · deep night');
    await expect(page.locator('[data-chip="ground"]')).toContainText('Larkspur Vale');
    // (58C.3 court repair — G28 ledger) The party chip wears faces, not
    // prose: each member rides as a .party-face named by its title
    // (initials when unpainted). The court asks for Edda's face by name.
    await expect(page.locator('[data-chip="party"] .party-face[title="Edda"]')).toBeVisible();
    await expect(page.locator('[data-chip="health"]')).toContainText(`${campaign.hero.hp}/${campaign.hero.maxHp}`);

    // AC, gold, XP, and blight prose have left the table for the book.
    await expect(page.locator('.header-chips')).not.toContainText(/gold|\bXP\b/i);
    await expect(page.locator('[data-chip="ground"]')).not.toContainText(/blight/i);

    // No battle stands in the proving record: no tracker.
    await expect(page.locator('.combat-banner')).toHaveCount(0);

    // A sealed battle seats the tracker — and the chips stay four.
    await seedFixture(page, { source: doomFixture() });
    await expect(page.locator('.combat-banner')).toBeVisible();
    await expect(page.locator('[data-chip]')).toHaveCount(4);

    // Stillness: under reduced motion the table and the book both wear the
    // attribute, and the sweep law silences their animations.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await seedFixture(page);
    await expect(page.locator('.header-chips[data-stillness="true"]')).toBeVisible();
    await openCodex(page);
    await expect(page.locator('.book-body[data-stillness="true"]')).toBeVisible();
  });
});
