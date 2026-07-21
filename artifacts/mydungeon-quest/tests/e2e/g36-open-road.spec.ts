import { test, expect, type Page } from '@playwright/test';
import { boot, readCampaign, act, turnCount, waitForTurn, rollIfAsked, openChapter } from './lib/harness';

// ------------------------------------------------------------
// G36 — THE OPEN ROAD COURT (Directive XIX, Articles IV–VII).
// The player's goals are first-class record: declared at the table and
// sealed VERBATIM the same turn; the next beat_intent names them; a clock
// opens, ticks with cited reasons, fills, and resolves honestly; a
// standing shifts and renders with its citation; a rumor stands at the
// chart's edge and opens into a cited thread; and a sealed spine
// amendment renders its reason in the Book. KEYLESS on the rig — the
// mock tier is sovereign, and the mock teller's open-road walk fires
// only on a bespoke-minted world whose horizon carries rumors.
// ------------------------------------------------------------

const DECLARED = 'I will make the ford safe for the guild boats';
const CLOCK = 'The reckoning at the ford';
const SHIFT_REASON = 'You held the ford when it counted';
const BEND_REASON = 'The table made the ford its own war and the ending must answer for it';

/** Forges a NEW bespoke world (the spine die mints spine + horizon through
 * the mock smith, keyless) and walks five player steps. The mock teller's
 * fixed turns do the rest: t2 clock+standing, t3 ticks (and our armed
 * declaration seals), t5 ticks to the fill, t6 the honest resolve and the
 * cited thread, t8 the spine bend. Rolls are pressed when asked. */
async function walkOpenRoad(page: Page): Promise<string> {
  await boot(page);
  await page.locator('.book-spine.new-spine').click();
  // The bespoke die lives behind the Deep Forge door.
  await page.getByRole('tab', { name: /Deep Forge/ }).click();
  const die = page.locator('button[aria-label="Forge a bespoke arc"]');
  await die.waitFor({ timeout: 20_000 });
  await die.click();
  await expect(page.locator('label:has(button[aria-label="Forge a bespoke arc"]) select'), 'the bespoke arc seats at the forge').toHaveValue('__bespoke', { timeout: 20_000 });
  await page.locator('button', { hasText: 'Forge the hero' }).click();
  await page.locator('.audition-chip').first().waitFor({ timeout: 20_000 });
  await page.locator('.audition-chip').first().click();
  await page.click('button:has-text("Begin the chronicle")');
  await page.waitForSelector('main.adventure-log', { timeout: 90_000 });
  // toArray() rides primary-key (uuid) order — the FORGED row is the one
  // with the youngest birth, never "the last in the array".
  const id = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.js');
    const all = await db.campaigns.toArray();
    return all.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0))[all.length - 1].id;
  });

  const step = async (text: string, arm = false) => {
    await rollIfAsked(page);
    await page.waitForSelector('.composer textarea:not([disabled])', { timeout: 120_000 });
    if (arm) {
      await page.locator('.composer .declare-toggle').click();
      await expect(page.locator('.composer .declare-toggle'), 'the flag arms — a held intention').toHaveClass(/armed/);
    }
    const before = await turnCount(page);
    await act(page, text);
    await waitForTurn(page, before);
    await rollIfAsked(page);
  };
  await step('We hold the ford line');               // t1 (+roll → t2: the clock opens, the standing shifts)
  await step(DECLARED, true);                        // t3: the declaration seals; the clock ticks 2/4
  await step('Press the guild captain for terms');   // t4 (+roll → t5: the clock fills 4/4)
  await step('Ask after the whisper at the ford');   // t6: the honest resolve; the thread cites the horizon
  await step('March on the last ridge');             // t7 (+roll → t8: the spine bends)
  return id as string;
}

test('G36a the open road at the table: the declaration seals verbatim, the Director serves it, the clock lives honestly, the standing and the horizon cite their turns, the spine bends once', async ({ page }) => {
  test.setTimeout(300_000);
  const id = await walkOpenRoad(page);
  const campaign = await readCampaign(page, id);

  // THE PREMISE — a bespoke world with a minted horizon (Article VII).
  // (The mint speaks its source through its ATTESTATION — sealSpineMint's
  // own shape; there is no top-level source key.)
  expect(campaign.spineMint?.attestation?.source, 'the bespoke arc came through the mock smith — the keyless floor').toBe('mock');
  expect((campaign.codex?.rumorPool || []).length, 'the horizon minted its six').toBe(6);

  // THE DECLARATION (Article IV) — sealed VERBATIM the turn it was spoken.
  const ambition = (campaign.codex?.ambitions || [])[0];
  expect(ambition?.text, 'the ambition seals the player\u2019s own words byte-for-byte').toBe(DECLARED);
  expect(ambition.status, 'and stands open').toBe('open');
  expect(ambition.declared_turn, 'cited to the very turn it was spoken').toBe(3);

  // THE OBLIGED DIRECTOR (Article IV) — the standing intent names it.
  expect(campaign.roomIntent?.ambitions_served, 'the beat_intent serves the declared ambition by name').toContain(DECLARED);
  expect(Number.isInteger(campaign.roomIntent?.beat_index), 'the intent stands for a real beat').toBe(true);

  // THE CLOCK (Article V) — opened, ticked with cited reasons, filled, resolved honestly.
  const clock = (campaign.codex?.clocks || []).find((row: any) => row.label === CLOCK);
  expect(clock, 'the clock stands in the fold').toBeTruthy();
  expect(clock.segments).toBe(4);
  expect(clock.ticks.length, 'every segment was earned').toBe(4);
  for (const tick of clock.ticks) {
    expect(Number.isInteger(tick.turn), 'each tick cites its turn').toBe(true);
    expect(typeof tick.reason === 'string' && tick.reason.length >= 3, 'and carries its reason whole').toBe(true);
  }
  expect(clock.status, 'the filled clock did not stand silent').toBe('resolved');
  expect(clock.outcome, 'it resolved honestly').toBe('lapsed');
  expect(clock.resolved_turn, 'the very turn the briefing showed it filled').toBe(6);

  // THE STANDING (Article VI) — one sealed shift, cited.
  const shift = (campaign.codex?.standings || []).find((row: any) => row.faction === 'The River Guild');
  expect(shift, 'the shift stands as its own sealed row').toBeTruthy();
  expect(shift.delta).toBe(2);
  expect(shift.reason, 'with its stated reason').toBe(SHIFT_REASON);
  expect(Number.isInteger(shift.turn), 'cited to its turn').toBe(true);

  // THE HORIZON (Article VII) — the rumor opened into a cited thread; the pool rotated.
  const pool = campaign.codex.rumorPool;
  const thread = (campaign.codex?.threads || []).find((row: any) => row.label === 'The whisper at the ford');
  expect(thread, 'the thread stands').toBeTruthy();
  expect(thread.rumor, 'carrying the horizon\u2019s exact words').toBe(pool[0].text);
  expect(pool[0].status, 'the cited rumor left the horizon').toBe('opened');
  expect(pool[0].opened_turn, 'cited to the turn it opened').toBe(6);
  expect(pool.filter((row: any) => row.status === 'unopened').length, 'the rest of the pool holds').toBe(5);

  // THE BEND (Article IV) — sealed once, reasoned, landed on the named beat.
  const bends = campaign.codex?.spineAmendments || [];
  expect(bends.length, 'exactly one amendment sealed').toBe(1);
  expect(bends[0].reason, 'with the played road\u2019s own reason').toBe(BEND_REASON);
  expect(Number.isInteger(bends[0].turn), 'cited to its turn').toBe(true);
  const bent = (campaign.codex?.spine?.beats || []).find((beat: any) => beat.title === bends[0].beat);
  expect(bent?.goal, 'the named beat carries the reshaped goal').toBe('The road bends through the ford the table bloodied');
  console.log(`[g36a] declared t3 sealed verbatim; intent serves it (beat ${campaign.roomIntent.beat_index}); clock 4/4 → lapsed t6; standing +2 cited; rumor → thread t6; spine bent: "${bends[0].beat}"`);
});

test('G36b the open road renders: the Debts panels cite every row, the bend speaks its reason in the Book, and the chart edge rotates as rumor only', async ({ page }) => {
  test.setTimeout(300_000);
  const id = await walkOpenRoad(page);

  // THE DEBTS PAGE — ambitions, clocks, standings, and the bend, cited.
  await openChapter(page, 'debts');
  await expect(page.locator('.ambition-row', { hasText: DECLARED }).first(), 'the ambition stands in the Book in the player\u2019s own words').toBeVisible({ timeout: 15_000 });
  const clockRow = page.locator('.clock-row', { hasText: CLOCK }).first();
  await expect(clockRow, 'the clock row stands').toBeVisible();
  await expect(clockRow.locator('.clock-tick', { hasText: 'The horns sound down the valley' }).first(), 'each tick renders its cited reason').toBeVisible();
  const standingRow = page.locator('.standing-row', { hasText: 'The River Guild' }).first();
  await expect(standingRow, 'the standing renders').toBeVisible();
  await expect(standingRow.locator('.standing-shift', { hasText: SHIFT_REASON }).first(), 'with its citation').toBeVisible();
  await expect(page.locator('.amend-row .amend-reason', { hasText: 'the ending must answer for it' }).first(), 'the bend renders its reason in the Book').toBeVisible();

  // THE CHART EDGE — rumor only, rotated past the opened whisper.
  await openChapter(page, 'places');
  const edge = page.locator('.edge-rumor');
  await expect(edge.first(), 'the edge carries rumors').toBeVisible({ timeout: 15_000 });
  const campaign = await readCampaign(page, id);
  const opened = campaign.codex.rumorPool.find((row: any) => row.status === 'opened');
  const edgeTexts = await edge.allTextContents();
  expect(edgeTexts.length, 'the edge stays bounded to three').toBe(3);
  expect(edgeTexts.join(' '), 'the opened rumor no longer rides the edge — the pool rotated').not.toContain(opened.text);
  await expect(page.locator('.chart-edge-rumors', { hasText: 'never geography' }).first(), 'and the edge speaks its own law').toBeVisible();
  console.log(`[g36b] Debts cites all four panels; the bend speaks its reason; the edge rides 3 rumors, rotated past "${String(opened.text).slice(0, 40)}…"`);
});
