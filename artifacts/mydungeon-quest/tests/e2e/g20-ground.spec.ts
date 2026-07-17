import { expect, test } from '@playwright/test';
import { closeModal, openCodex, readCampaign, seedFixture } from './lib/harness';
// The engine source is imported by relative path, not through the
// package door: Playwright transforms first-party files it can see, but
// a bare specifier would walk into node_modules untransformed ESM.
import { validateDmTurn } from '../../../../packages/engine/src/protocol.js';
import { presenceOf, visitorsOf } from '../../../../packages/engine/src/presence.js';

// G20 THE GROUND (Directive VII) — the presence law at the table. Two
// courts, no judge, no new teeth. The protocol court proves the door
// refuses free teleportation and unrecorded stages BY NAME, and that the
// codex fold and the pure presence replay agree on the sealed record the
// DB hands back — REGION ONLY: codex.scene.sinceTurn is a turn-number
// stamp and replay cites are journal ROW indices; the two clocks are never
// cross-asserted (VII.9). The DOM court proves the Codex speaks the same
// record: who stands here and who has stood here, each with a journal
// cite, and the soul page's last-known-ground line. No exact late index is
// pinned anywhere — tick rows may shift the journal.

test('G20a: the ground protocol — the door refuses by name, and the fold and the replay agree', async ({ page }) => {
  test.setTimeout(240_000);

  // The door, seated as the landing seats it: record attested pre-turn.
  const seated = { cast: [], regions: [{ name: 'Larkspur Vale' }, { name: 'The Duchy' }], scene: { region: 'Larkspur Vale' } };
  const errorsOf = (payload: any) => ((validateDmTurn(payload, [], seated) as any).errors || []);
  const freeTeleport = errorsOf({ story: { scene_set: { region: 'The Duchy' } }, time_advance: null });
  expect(freeTeleport.some((e: string) => e.includes('travel costs time')), 'a change of ground without time_advance is refused by name').toBeTruthy();
  const paidTravel = errorsOf({ story: { scene_set: { region: 'The Duchy' } }, time_advance: { unit: 'days', n: 1 } });
  expect(paidTravel.filter((e: string) => e.includes('scene_set') || e.includes('travel costs time')), 'travel paid in time raises no scene error').toEqual([]);
  const unknownStage = errorsOf({ story: { scene_set: { region: 'The Sunken Court' } }, time_advance: { unit: 'days', n: 1 } });
  expect(unknownStage.some((e: string) => e.includes('does not hold')), 'an unrecorded stage is refused by name').toBeTruthy();

  // The sealed record: the fold and the replay agree on the standing region.
  const campaignId = await seedFixture(page);
  const campaign = await readCampaign(page, campaignId);
  expect(campaign, 'the seeded campaign must read back').toBeTruthy();
  expect(campaign.codex?.scene?.region, 'the fold stands in the Duchy after the sealed travel').toBe('The Duchy');

  const duchy = visitorsOf(campaign, 'The Duchy');
  expect(duchy.standing.map((soul: any) => soul.name), 'the travelers stand on the new ground').toEqual(['Corin Voss', 'Maren']);
  expect(duchy.former, 'nobody has yet left the Duchy').toEqual([]);

  const vale = visitorsOf(campaign, 'Larkspur Vale');
  expect(vale.standing.map((soul: any) => soul.name), 'the ones who stayed still stand in the Vale').toEqual(['Vessarine', 'Edda']);
  expect(vale.former.map((soul: any) => soul.name), 'the travelers are remembered where they stood').toEqual(['Corin Voss', 'Maren']);

  // Cites are journal row indices. The walk-on soul cites the opening row
  // (the one exact index that can never shift); every other cite is judged
  // by law, not by number: integers, and the Duchy after the Vale.
  const vessarine = vale.standing.find((soul: any) => soul.name === 'Vessarine');
  expect(vessarine?.cite, 'the walk-on cites the opening row').toBe(0);
  for (const entry of [...duchy.standing, ...vale.standing, ...vale.former]) {
    expect(Number.isInteger(entry.cite) && entry.cite >= 0, `${entry.name} cites a journal row`).toBeTruthy();
  }
  for (const traveler of ['Corin Voss', 'Maren']) {
    const now = duchy.standing.find((soul: any) => soul.name === traveler);
    const then = vale.former.find((soul: any) => soul.name === traveler);
    expect(now!.cite, `${traveler} reached the Duchy after standing in the Vale`).toBeGreaterThan(then!.cite);
  }

  // The full ledger knows every sighted soul.
  const ground = presenceOf(campaign);
  for (const name of ['Maren', 'Edda', 'Corin Voss', 'Vessarine']) {
    expect(ground.some((soul: any) => soul.name === name), `${name} is sighted in the record`).toBeTruthy();
  }
});

test('G20b: the ground page — who stands here with cites, who has stood here, and the soul page names the ground', async ({ page }) => {
  test.setTimeout(240_000);
  await seedFixture(page);
  await openCodex(page);

  // The Duchy: the travelers STAND here, each cited to a journal row.
  await page.locator('.region-gallery article').nth(1).click();
  const placePage = page.locator('.place-page');
  await expect(placePage).toBeVisible();
  await expect(placePage.locator('h4').first()).toHaveText('The Duchy');
  await expect(placePage).toContainText('Standing here');
  const duchyStanding = placePage.locator('.presence-list').first().locator('li');
  await expect(duchyStanding).toHaveCount(2);
  await expect(duchyStanding.nth(0)).toContainText('Corin Voss');
  await expect(duchyStanding.nth(0)).toContainText(/turn \d+/);
  await expect(duchyStanding.nth(1)).toContainText('Maren');
  await expect(duchyStanding.nth(1)).toContainText(/turn \d+/);
  await expect(placePage, 'nobody has yet left the Duchy — the former section is honestly absent').not.toContainText('Have stood here');
  await placePage.locator('header button', { hasText: 'close' }).click();

  // The Vale: the stayers stand; the travelers HAVE STOOD, with cites.
  await page.locator('.region-gallery article').nth(0).click();
  await expect(placePage).toBeVisible();
  await expect(placePage.locator('h4').first()).toHaveText('Larkspur Vale');
  await expect(placePage).toContainText('Standing here');
  await expect(placePage).toContainText('Have stood here');
  const lists = placePage.locator('.presence-list');
  await expect(lists).toHaveCount(2);
  await expect(lists.nth(0)).toContainText('Vessarine');
  await expect(lists.nth(0)).toContainText('Edda');
  const former = lists.nth(1).locator('li');
  await expect(former.nth(0)).toContainText('Corin Voss');
  await expect(former.nth(0)).toContainText(/turn \d+/);
  await expect(former.nth(1)).toContainText('Maren');
  await placePage.locator('header button', { hasText: 'close' }).click();

  // The soul page: the last known ground, said plainly with its cite.
  await page.locator('.soul-card', { hasText: 'Edda' }).first().click();
  const soulPage = page.locator('.soul-page');
  await expect(soulPage).toBeVisible();
  await expect(soulPage.locator('.ground-line')).toContainText('Last seen standing in Larkspur Vale');
  await expect(soulPage.locator('.ground-line')).toContainText(/turn \d+/);

  await closeModal(page);
});
