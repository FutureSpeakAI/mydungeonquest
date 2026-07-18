import { expect, test } from '@playwright/test';
import { closeModal, openChapter, openCodex, readCampaign, seedFixture } from './lib/harness';
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
  // (56B logged edit) The Duchy → Larkspur Vale: the appended t7 rides the
  // party home, and t8 pins the departed envoy at the Duchy — the fold now
  // stands home again, and both grounds carry the richer record.
  expect(campaign.codex?.scene?.region, 'the fold stands home in the Vale after the sealed return').toBe('Larkspur Vale');

  const duchy = visitorsOf(campaign, 'The Duchy');
  expect(duchy.standing.map((soul: any) => soul.name), 'the departed envoy remains where the leave pinned him').toEqual(['Corin Voss']);
  expect(duchy.former.map((soul: any) => soul.name), 'the hero has stood in the Duchy and ridden home').toEqual(['Maren']);

  const vale = visitorsOf(campaign, 'Larkspur Vale');
  expect(vale.standing.map((soul: any) => soul.name), 'the home ground holds the stayer, the new companion, and the hero').toEqual(['Vessarine', 'Edda', 'Maren']);
  expect(vale.former.map((soul: any) => soul.name), 'the pinned envoy is remembered where he stood').toEqual(['Corin Voss']);

  // Cites are journal row indices. The walk-on soul cites the opening row
  // (the one exact index that can never shift); every other cite is judged
  // by law, not by number: integers, and the Duchy after the Vale.
  const vessarine = vale.standing.find((soul: any) => soul.name === 'Vessarine');
  expect(vessarine?.cite, 'the walk-on cites the opening row').toBe(0);
  for (const entry of [...duchy.standing, ...vale.standing, ...vale.former]) {
    expect(Number.isInteger(entry.cite) && entry.cite >= 0, `${entry.name} cites a journal row`).toBeTruthy();
  }
  // (56B logged edit) The travel loop re-aimed to the return ride: each
  // soul's FINAL ground cites a later row than the ground it left — the
  // envoy's pin outranks his Vale ride, the hero's homecoming outranks
  // her Duchy crossing. Strictly greater: the two clocks never tie.
  const corinNow = duchy.standing.find((soul: any) => soul.name === 'Corin Voss');
  const corinThen = vale.former.find((soul: any) => soul.name === 'Corin Voss');
  expect(corinNow!.cite, 'the pinned envoy reached the Duchy after riding the Vale').toBeGreaterThan(corinThen!.cite);
  const marenNow = vale.standing.find((soul: any) => soul.name === 'Maren');
  const marenThen = duchy.former.find((soul: any) => soul.name === 'Maren');
  expect(marenNow!.cite, 'the hero came home after standing in the Duchy').toBeGreaterThan(marenThen!.cite);

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
  // (58C logged edit — Directive XIV) The region gallery lives in Places.
  await openChapter(page, 'places');

  // (56B logged edit) The Duchy page re-aimed to the return ride: the
  // pinned envoy STANDS here alone now, and the hero HAS STOOD here —
  // the former section earned its place, so the old honest-absence
  // assert is re-aimed to an honest presence, one soul per list.
  await page.locator('.region-gallery article').nth(1).click();
  const placePage = page.locator('.place-page');
  await expect(placePage).toBeVisible();
  await expect(placePage.locator('h4').first()).toHaveText('The Duchy');
  await expect(placePage).toContainText('Standing here');
  await expect(placePage).toContainText('Have stood here');
  const duchyLists = placePage.locator('.presence-list');
  const duchyStanding = duchyLists.nth(0).locator('li');
  await expect(duchyStanding).toHaveCount(1);
  await expect(duchyStanding.nth(0)).toContainText('Corin Voss');
  await expect(duchyStanding.nth(0)).toContainText(/turn \d+/);
  const duchyFormer = duchyLists.nth(1).locator('li');
  await expect(duchyFormer.nth(0)).toContainText('Maren');
  await expect(duchyFormer.nth(0)).toContainText(/turn \d+/);
  await placePage.locator('header button', { hasText: 'close' }).click();

  // The Vale: the stayers stand; the travelers HAVE STOOD, with cites.
  await page.locator('.region-gallery article').nth(0).click();
  await expect(placePage).toBeVisible();
  await expect(placePage.locator('h4').first()).toHaveText('Larkspur Vale');
  await expect(placePage).toContainText('Standing here');
  await expect(placePage).toContainText('Have stood here');
  // (56B logged edit) The Vale re-aimed to the homecoming: three now
  // stand here (the stayer, the new companion, the hero) and only the
  // pinned envoy has stood and gone — former count tightened to exactly
  // one, the Maren-former assert re-aimed into vale STANDING above.
  const lists = placePage.locator('.presence-list');
  await expect(lists.nth(0)).toContainText('Vessarine');
  await expect(lists.nth(0)).toContainText('Edda');
  await expect(lists.nth(0)).toContainText('Maren');
  const former = lists.nth(1).locator('li');
  await expect(former).toHaveCount(1);
  await expect(former.nth(0)).toContainText('Corin Voss');
  await expect(former.nth(0)).toContainText(/turn \d+/);
  await placePage.locator('header button', { hasText: 'close' }).click();

  // The soul page: the last known ground, said plainly with its cite.
  // (58C.2 logged edit — Directive XIV) Souls stand in the People chapter
  // now — the court turns the page before pressing Edda's card.
  await openChapter(page, 'people');
  await page.locator('.soul-card', { hasText: 'Edda' }).first().click();
  const soulPage = page.locator('.soul-page');
  await expect(soulPage).toBeVisible();
  await expect(soulPage.locator('.ground-line')).toContainText('Last seen standing in Larkspur Vale');
  await expect(soulPage.locator('.ground-line')).toContainText(/turn \d+/);

  await closeModal(page);
});
