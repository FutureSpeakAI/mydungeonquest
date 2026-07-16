import { expect, test } from '@playwright/test';
import { act, closeModal, extractFeed, openCodex, readCampaign, rollIfAsked, seedFixture, turnCount } from './lib/harness';
import { checkFeedOrder } from './lib/feedOrder';

// G14 FEED AND TIME PRESENTATION ORDER — deterministic DOM order checks
// against the seeded fixture, by element order, never by visual guesswork.

test('G14 the order law holds across the sealed fixture feed', async ({ page }) => {
  const campaignId = await seedFixture(page, { sealed: true });
  const campaign = await readCampaign(page, campaignId);
  const { rows } = await extractFeed(page);

  // Stamp DOM turn rows by mapping them, in order, onto the unredacted
  // sealed record; the struck turn renders as its marker row instead.
  // (iteration-3 logged edit) Tick and span rows joined campaign.logs when
  // the seed learned the living-world fold; the mapping is one DOM turn
  // group per unredacted sealed TURN, indexed in fixture-turn numbering.
  const unredacted = campaign.logs.filter((log: any) => !log.kind).map((log: any, index: number) => ({ log, index })).filter(({ log }: any) => !log.redacted);
  const turnRows = rows.filter((row: any) => row.kind === 'turn');
  expect(turnRows.length, 'one DOM turn group per unredacted sealed turn').toBe(unredacted.length);
  // (iteration-2 logged edit) The checker reads TurnParts under row.turn —
  // wrap the flat extracted row instead of stamping a bare number over it.
  turnRows.forEach((row: any, position: number) => { row.turn = { turn: unredacted[position].index, order: row.order, speakers: row.speakers }; });

  const introducedBy: Record<string, number> = {};
  // (iteration-5 logged edit) checkFeedOrder normalizes every DOM speaker
  // with trim().toLowerCase() before looking them up; the map must be keyed
  // the same way or every cast soul reads as "no introduction card at all".
  // Same normalization, same cards, no assertion changed.
  for (const soul of campaign.codex?.cast || []) introducedBy[String(soul.name).trim().toLowerCase()] = soul.introduced_turn ?? 0;

  const violations = checkFeedOrder({ rows: rows as any, introducedBy, heroName: campaign.hero?.name || '' });
  expect(violations, `feed order violations:\n${violations.join('\n')}`).toEqual([]);

  // Chronicle pages, when bound, cite ascending turn ranges.
  const cites = rows
    .filter((row: any) => row.kind === 'page')
    .map((row: any) => /turns?\s+(\d+)\s*[–—-]\s*(\d+)/i.exec(row.footer || ''))
    .filter(Boolean)
    .map((match: any) => [Number(match[1]), Number(match[2])]);
  for (const [from, to] of cites) expect(from).toBeLessThanOrEqual(to);
  for (let i = 1; i < cites.length; i += 1) {
    expect(cites[i][0], `page cite ranges ascend: ${JSON.stringify(cites)}`).toBeGreaterThan(cites[i - 1][1]);
  }
});

test('G14f the Day chip never decreases across a live advance', async ({ page }) => {
  test.setTimeout(300_000);
  await seedFixture(page); // unsealed — the composer still lives

  await openCodex(page);
  await expect(page.locator('.day-chip').first()).toHaveText(/Day 3/);
  await closeModal(page);

  const before = await turnCount(page);
  await act(page, 'I walk the vale road at dusk.');
  await page.waitForFunction(
    (count) => document.querySelectorAll('main.adventure-log .turn-entry').length > count,
    before,
    { timeout: 120_000 }
  );
  await rollIfAsked(page);

  await openCodex(page);
  const text = (await page.locator('.day-chip').first().textContent()) || '';
  const day = Number(/\d+/.exec(text)?.[0] || 0);
  expect(day, `Day chip after the advance reads "${text}"`).toBeGreaterThanOrEqual(3);
});
