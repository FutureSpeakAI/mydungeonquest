import { expect, test } from '@playwright/test';
import { closeModal, openCodex, readCampaign, seedFixture } from './lib/harness';
// The engine source is imported by relative path, not through the
// package door: Playwright transforms first-party files it can see, but
// a bare specifier would walk into node_modules untransformed ESM.
import { troveOf, purseOf } from '../../../../packages/engine/src/trove.js';

// G19 THE TROVE (Directive VI) — the possessions law at the table. Two
// courts, no judge, no new teeth: the protocol court proves the codex
// fold and the pure journal replay agree on the sealed record the DB
// hands back; the DOM court proves the Codex speaks that record — the
// coin figure with its reasons and turn cites, and a transferred thing
// showing every hand it passed through. The fixture's struck turn rides
// along, so the strike law is standing in the room.

test('G19a: the trove protocol — the codex fold and the journal replay agree on the sealed record', async ({ page }) => {
  test.setTimeout(240_000);
  const campaignId = await seedFixture(page);
  const campaign = await readCampaign(page, campaignId);
  expect(campaign, 'the seeded campaign must read back').toBeTruthy();

  // The journal replay, run on the exact record the shelf returned.
  const items = troveOf(campaign);
  const ledger = items.find((item) => item.name === 'The ferry ledger');
  expect(ledger, 'the ferry ledger must replay from the journal').toBeTruthy();
  expect(ledger.status).toBe('held');
  expect(ledger.holder).toBe('Edda');
  expect(ledger.kind).toBe('document');
  expect(ledger.note).toContain('Every crossing the Vale still owes');
  expect(ledger.chain.map((hand: any) => hand.holder), 'the chain remembers both hands in order').toEqual(['Maren', 'Edda']);
  expect(ledger.chain[0].since, 'the first hand cites the opening row').toBe(0);
  expect(ledger.chain[1].since, 'the passage cites a later row').toBeGreaterThan(0);

  // The fold the table kept as working memory agrees with the replay.
  const folded = (campaign.codex?.trove || []).find((item: any) => item.name === 'The ferry ledger');
  expect(folded, 'the codex fold must hold the same thing').toBeTruthy();
  expect(folded.holder, 'fold and replay agree on the hand').toBe('Edda');
  expect(folded.status).toBe('held');

  // The purse: same figure from the journal and from the fold.
  const purse = purseOf(campaign, 'Maren');
  expect(purse.coin, 'thirty in, twelve out — eighteen stands').toBe(18);
  expect(purse.entries.map((entry: any) => entry.delta)).toEqual([30, -12]);
  expect(purse.entries.map((entry: any) => entry.clamped)).toEqual([false, false]);
  expect(purse.entries[0].reason).toContain('back pay');
  expect(purse.entries[1].reason).toContain('road toll');
  const foldedPurse = (campaign.codex?.purses || []).find((entry: any) => entry.holder === 'Maren');
  expect(foldedPurse?.coin, 'fold and replay agree on the coin').toBe(18);

  // The state the DM is judged against speaks the same record.
  expect(campaign.codex?.trove?.every((item: any) => item.status === 'held' ? item.holder : true)).toBeTruthy();
});

test('G19b: the trove page — coin with reasons and cites, and the passage shows both hands', async ({ page }) => {
  test.setTimeout(240_000);
  await seedFixture(page);
  await openCodex(page);

  await expect(page.locator('h3:has-text("The Trove")')).toBeVisible();
  await expect(page.locator('.purse-line b')).toHaveText('18');

  // Every coin movement stands with its reason and its turn cite.
  const purseRows = page.locator('.purse-row');
  await expect(purseRows).toHaveCount(2);
  await expect(purseRows.nth(0).locator('.purse-delta')).toHaveText('+30');
  await expect(purseRows.nth(0)).toContainText('back pay');
  await expect(purseRows.nth(0)).toContainText(/turn \d+/);
  await expect(purseRows.nth(1).locator('.purse-delta')).toHaveText('-12');
  await expect(purseRows.nth(1)).toContainText('road toll');
  await expect(purseRows.nth(1)).toContainText(/turn \d+/);

  // The transferred thing shows both hands, each with its cite.
  const ledgerRow = page.locator('.trove-row', { hasText: 'The ferry ledger' });
  await expect(ledgerRow).toHaveCount(1);
  await expect(ledgerRow.locator('.thread-kind')).toHaveText('document');
  const chain = ledgerRow.locator('.trove-chain');
  await expect(chain).toContainText(/Maren \(turn \d+\)/);
  await expect(chain).toContainText(/Edda \(turn \d+\)/);
  const chainText = (await chain.textContent()) || '';
  expect(chainText.indexOf('Maren'), 'the first hand is spoken first').toBeLessThan(chainText.indexOf('Edda'));
  await expect(ledgerRow).toContainText('Every crossing the Vale still owes');

  await closeModal(page);
});
