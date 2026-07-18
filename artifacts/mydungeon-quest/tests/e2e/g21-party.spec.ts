import { expect, test } from '@playwright/test';
import { closeModal, openChapter, openCodex, readCampaign, seedFixture } from './lib/harness';
// The engine source is imported by relative path, not through the
// package door: Playwright transforms first-party files it can see, but
// a bare specifier would walk into node_modules untransformed ESM.
import { validateDmTurn } from '../../../../packages/engine/src/protocol.js';
import { partyOf, elsewhereOf } from '../../../../packages/engine/src/presence.js';
import { buildBriefing } from '../../../../packages/engine/src/graph.js';

// G21 THE PARTY (Directive VIII) — who travels with the hero, and the
// nobody-teleports law. The protocol court proves the door refuses
// joins from the elsewhere BY NAME AND GROUND, holds the hero as the
// party's permanent root, and rejects a line given to a soul the record
// holds elsewhere — then proves the fold, the pure replay, and the
// briefing agree on the sealed record the DB hands back. The DOM court
// proves the Codex speaks the same roster and the same sealed fixture.
// joinedTurn/since are TURN indices and replay cites are journal ROW
// indices — two clocks, never cross-asserted (VII.9); no exact late row
// index is pinned anywhere, tick rows may shift the journal.

test('G21a: the party protocol — the door refuses by name and ground, and the fold, replay, and briefing agree', async ({ page }) => {
  test.setTimeout(240_000);

  // The door, seated as the landing seats it: record attested pre-turn.
  const seated = {
    cast: [
      { name: 'Corin Voss', status: 'active' },
      { name: 'Vessarine', status: 'active' },
      { name: 'Old Bran', status: 'dead' }
    ],
    regions: [{ name: 'Larkspur Vale' }, { name: 'The Duchy' }],
    scene: { region: 'The Duchy' },
    presence: [
      { name: 'Corin Voss', ground: 'The Duchy' },
      { name: 'Vessarine', ground: 'Larkspur Vale' },
      { name: 'Old Bran', ground: 'The Duchy' }
    ],
    party: [],
    hero: 'Maren'
  };
  const errorsOf = (payload: any, context: any = seated) => ((validateDmTurn(payload, [], context) as any).errors || []);

  const elsewhereJoin = errorsOf({ story: { party_join: { name: 'Vessarine' } } });
  expect(elsewhereJoin.some((e: string) => e.includes('Vessarine last stood in Larkspur Vale')),
    'a join from the elsewhere is refused naming the soul and its actual ground').toBeTruthy();
  const heroJoin = errorsOf({ story: { party_join: { name: 'Maren' } } });
  expect(heroJoin.some((e: string) => e.includes("party's permanent root")), 'the hero is never joined — the root is not a member').toBeTruthy();
  const deadJoin = errorsOf({ story: { party_join: { name: 'Old Bran' } } });
  expect(deadJoin.some((e: string) => e.includes('dead and cannot travel')), 'the dead are refused by name').toBeTruthy();
  const lawfulJoin = errorsOf({ story: { party_join: { name: 'Corin Voss' } } });
  expect(lawfulJoin.filter((e: string) => e.includes('party_join')), 'a soul standing at the scene joins lawfully').toEqual([]);

  const teleportLine = errorsOf({ narration_blocks: [{ speaker: 'Vessarine', text: 'Pay what you owe.' }], story: null });
  expect(teleportLine.some((e: string) => e.includes('the elsewhere does not speak — Vessarine last stood in Larkspur Vale, not The Duchy')),
    'a line given to a soul held elsewhere is rejected naming soul, ground, and scene').toBeTruthy();
  const memberLine = errorsOf({ narration_blocks: [{ speaker: 'Vessarine', text: 'Pay.' }], story: null }, { ...seated, party: ['Vessarine'] });
  expect(memberLine.filter((e: string) => e.includes('elsewhere does not speak')), 'a party member speaks wherever the party stands').toEqual([]);
  const walkOnLine = errorsOf({ narration_blocks: [{ speaker: 'Sella Ru', text: 'A word.' }], story: { cast_add: [{ name: 'Sella Ru' }] } });
  expect(walkOnLine.filter((e: string) => e.includes('elsewhere does not speak')), 'a same-turn walk-on speaks without a prior sighting').toEqual([]);
  const bare = errorsOf({ narration_blocks: [{ speaker: 'Vessarine', text: 'Pay.' }], story: null }, { cast: seated.cast, regions: seated.regions, scene: seated.scene });
  expect(bare.filter((e: string) => e.includes('elsewhere does not speak')), 'without presence AND party arrays the court never seats').toEqual([]);

  // The sealed record: the fold, the replay, and the briefing agree.
  const campaignId = await seedFixture(page);
  const campaign = await readCampaign(page, campaignId);
  expect(campaign, 'the seeded campaign must read back').toBeTruthy();
  expect(campaign.codex?.party, 'the fold seats the hearth-keeper with her joining turn').toEqual([{ name: 'Edda', joinedTurn: 8 }]);
  expect(campaign.codex?.fixtures, 'the fixture sealed once with its sealing turn').toEqual([
    { place: 'The Duchy', name: 'The Brass Toll-Scale', visual: 'A man-high brass toll-scale bolted to the gate arch, its twin pans polished to mirrors by a century of counted crossings.', since: 6 }
  ]);

  const roster = partyOf(campaign);
  expect(roster.map((member: any) => member.name), 'the replay proves the same roster').toEqual(['Edda']);
  expect(Number.isInteger(roster[0].cite) && roster[0].cite >= 0, 'the member cites her joining row').toBeTruthy();

  const elsewhere = elsewhereOf(campaign);
  expect(elsewhere.map((entry: any) => `${entry.name}@${entry.ground}`), 'the elsewhere holds exactly the pinned envoy').toEqual(['Corin Voss@The Duchy']);
  expect(Number.isInteger(elsewhere[0].cite) && elsewhere[0].cite >= 0, 'the pin cites its journal row').toBeTruthy();

  const briefing = buildBriefing(campaign) as any;
  expect(briefing.traveling_with, 'the briefing speaks the same roster, joining turn worn').toEqual(['Edda — joined turn 8']);
  expect(Array.isArray(briefing.elsewhere) && briefing.elsewhere.length === 1, 'the briefing names one absent soul').toBeTruthy();
  expect(briefing.elsewhere[0].startsWith('Corin Voss — in The Duchy'),
    `the elsewhere line names the envoy and his ground (saw "${briefing.elsewhere[0]}")`).toBeTruthy();
  expect(briefing.calendar, 'the calendar wears the watch: four sealed days, zero hours').toBe('It is Day 5 of the tale, in the deep night watch.');
});

test('G21b: the party page — the roster with its joining turn, and the sealed fixture on its ground', async ({ page }) => {
  test.setTimeout(240_000);
  await seedFixture(page);
  await openCodex(page);
  // (58C logged edit — Directive XIV) The party strip lives in Party now.
  await openChapter(page, 'party');

  // The party strip: one companion, cited to her joining turn.
  // (56B.2 logged edit) '.codex-modal' was an invented selector — the
  // house's one modal wrapper is '.modal' (openCodex waits on
  // '.modal .codex-head'); re-aimed, nothing weakened.
  await expect(page.locator('.modal')).toContainText('The party — who rides with the hero');
  const strip = page.locator('.party-strip li');
  await expect(strip).toHaveCount(1);
  await expect(strip.nth(0)).toContainText('Edda');
  await expect(strip.nth(0)).toContainText(/joined turn 8/);

  // The day chip wears the record's day.
  await expect(page.locator('.day-chip').first()).toHaveText(/Day 5/);

  // The Duchy page: the pinned envoy stands, and the sealed fixture
  // shows with its sealing turn.
  // (58C logged edit — Directive XIV) The gallery lives in Places now.
  await openChapter(page, 'places');
  await page.locator('.region-gallery article').nth(1).click();
  const placePage = page.locator('.place-page');
  await expect(placePage).toBeVisible();
  await expect(placePage.locator('h4').first()).toHaveText('The Duchy');
  await expect(placePage).toContainText('Standing here');
  await expect(placePage.locator('.presence-list').first()).toContainText('Corin Voss');
  await expect(placePage).toContainText('Fixtures');
  const fixtures = placePage.locator('.fixture-list li');
  await expect(fixtures).toHaveCount(1);
  await expect(fixtures.nth(0)).toContainText('The Brass Toll-Scale');
  await expect(fixtures.nth(0)).toContainText(/sealed turn 6/);
  await placePage.locator('header button', { hasText: 'close' }).click();

  await closeModal(page);
});
