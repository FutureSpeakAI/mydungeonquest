import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { HARVEST_DIR, preflightManifest, rolePlate, topBytes } from './lib/harvestManifest';
import { closeModal, doomFixture, openCodex, openSheet, readCampaign, seedFixture } from './lib/harness';
import { BATTLE_PROTOCOL, PINNED_BATTLE_QUESTIONS_SHA256, battleCard, battleQuestionsDigest, speciesVerdict } from './lib/battleLaw';
import { safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';

// ============================================================
// G23 — THE BATTLE CUT (EXPERIENCE-DIRECTIVE-X, Task 57, Section 3).
// Five courts over the doom fixture: the tracker that never reshuffles
// (a), the one-action bench (b), the companion die under its owner's
// name (c), the whole doom road (d), and the species court over the
// harvest's battle plate (e). The fixture is sealed bytes; the courts
// read the record back and prove the stage against it — never the
// other way around.
//
// Dice disclosure (ledgered in LOOP_LOG): companionRoll is seedless by
// law (Math.random at the fold), so the walking courts pin the table's
// dice through addInitScript BEFORE boot — G23c pins 0.5 (a d20 face of
// 11), G23d pins 0.25 (a face of 6, every save a failure). The pin is
// the harness's dice tray, not a change to any shipped fold. G23a stays
// unpinned: it proves render == sealed record, not values.
// ============================================================

const DOOM_TITLE = 'The Doom Proving';

async function resolutions(page: Page, campaignId: string): Promise<any[]> {
  return page.evaluate(async (id) => {
    const { db } = await import('/src/lib/db.js');
    const rows = await db.journal.where('campaignId').equals(id).toArray();
    return rows.filter((row: any) => row.type === 'resolution').map((row: any) => row.payload);
  }, campaignId);
}

test('G23 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g23-battle');
});

test('G23a the tracker renders the sealed order and a reload never reshuffles it', async ({ page }) => {
  test.setTimeout(300_000);
  await seedFixture(page, { source: doomFixture() });
  const id = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.js');
    const rows = await db.campaigns.toArray();
    return rows[0].id;
  });
  const campaign = await readCampaign(page, id);
  const order = campaign.combat?.order || [];
  expect(order.length, 'the fixture seals a six-seat order: hero, two companions, three instances').toBe(6);

  const spans = page.locator('.combat-banner .initiative > span');
  await expect(spans).toHaveCount(order.length);
  const before = await spans.allInnerTexts();
  order.forEach((row: any, i: number) => {
    expect(before[i], `seat ${i} renders the sealed row, in the sealed order`).toBe(`${row.name} ${row.total}`);
  });

  // The downed and the fled keep greyed seats; the living keep bright ones.
  for (let i = 0; i < order.length; i += 1) {
    const cls = (await spans.nth(i).getAttribute('class')) || '';
    const row: any = order[i];
    if (row.name === 'Marsh Howler A' || row.name === 'Marsh Howler B') expect(cls, `${row.name} keeps a greyed seat`).toContain('out');
    if (row.name === 'Marsh Howler C') expect(cls, 'the living instance keeps a bright seat').not.toContain('out');
    if (row.hero) expect(cls, 'the hero seat wears its mark').toContain('hero');
  }

  // The record behind the chairs: A downed in place (never removed), B
  // removed by flight (yet still seated in the order), C standing.
  const foes = (campaign.combat?.enemies || []).map((e: any) => `${e.name}:${e.hp}`).sort();
  expect(foes, 'the enemy record holds the downed and the living, not the fled').toEqual(['Marsh Howler A:0', 'Marsh Howler C:9']);
  await expect(page.locator('.combat-banner .enemy-bars > span')).toHaveCount(2);

  // The reload court: back through the title door, the same chairs.
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await page.locator('.book-spine', { hasText: DOOM_TITLE }).click();
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });
  await expect(spans).toHaveCount(order.length);
  expect(await spans.allInnerTexts(), 'the reload reads the seats, never re-rolls them').toEqual(before);
});

test('G23b the one-action court refuses the doctored second action by name and lets the yield pass', async () => {
  // Node-side bench, the doctored-payload pattern of the standing courts:
  // the context seats the combatants the way the table seats them, and a
  // SECOND action by a LIVING actor in one turn must fall by name.
  const base = safeFallbackTurn('', 1);
  const bench = (actions: any[]) => validateDmTurn(
    { ...base, combat: { round_delta: 0, enemy_add: [], enemy_update: [], enemy_remove: [], npc_actions: actions } },
    [],
    { combatants: [{ id: 'marsh-howler-c', name: 'Marsh Howler C', hp: 9 }, { id: 'marsh-howler-a', name: 'Marsh Howler A', hp: 0 }] }
  ).errors;

  const doctored = bench([
    { actor: 'Marsh Howler C', action: 'Lunges for the sledge-line.' },
    { actor: 'Marsh Howler C', action: 'Lunges again in the same breath.' },
  ]);
  expect(doctored.join('\n'), 'the second action falls by name').toContain(
    'a second action in one turn is refused by name: Marsh Howler C has already acted'
  );

  const yielded = bench([{ actor: 'Marsh Howler C', action: 'Circles wide, hackles raised, and yields the breath.' }]);
  expect(
    yielded.filter((line: string) => line.includes('npc_actions') || line.includes('acted')),
    'one action in the turn passes the court clean'
  ).toEqual([]);
});

test("G23c the companion die falls under the owner's name and carries the sheet's own modifiers", async ({ page }) => {
  test.setTimeout(300_000);
  // Disclosed pin: 0.5 → every d20 face is 11. Sela's sheet does the rest.
  await page.addInitScript(() => { Math.random = () => 0.5; });
  const id = await seedFixture(page, {
    source: doomFixture(),
    mutate: (fx: any) => {
      const last = fx.turns[fx.turns.length - 1];
      delete last.wound; // Brannoc stays on his feet — no doom door in this court
      fx.pendingRoll = {
        id: 'fx-sela-slip', label: 'Slip the noose', kind: 'check', die: 'd20',
        ability: 'DEX', skill: null, proficient: true, dc: 12, advantage: 'normal',
        extra_mod: 0, action_id: null, actor_id: 'Sela', target_id: null,
      };
      return fx;
    },
  });

  const button = page.locator('.roll-button');
  await expect(button).toBeVisible();
  await expect(button.locator('small'), "the ask wears the owner's name and sigil").toHaveText('Sela ➤ · check · DC 12');
  await expect(button, 'the ask keeps its label').toContainText('Slip the noose');

  // The sheet's own numbers, read back from the sealed record — never hardcoded.
  const campaign = await readCampaign(page, id);
  const sela = (campaign.codex?.party || []).find((m: any) => m?.name === 'Sela');
  expect(sela?.sheet, 'Sela stands sheeted in the sealed record').toBeTruthy();
  const dexMod = Math.floor((sela.sheet.abilities.DEX - 10) / 2);
  const proficiency = 2; // level 3 sits in the 1–4 band of THE ROLE TABLE the keyless gate proves

  await button.click();
  const overlay = page.locator('.dice-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.die span'), 'the pinned die lands its face on stage').toHaveText('11');
  await expect(overlay.locator('.dice-math strong'), "the staged total is the sheet's own arithmetic").toHaveText(String(11 + dexMod + proficiency));

  await expect.poll(async () => (await resolutions(page, id)).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  const rows = await resolutions(page, id);
  const sealed = rows[rows.length - 1];
  expect(sealed.actorId, 'the resolution seals under the owner, not the hero').toBe('Sela');
  expect(sealed.selectedDie, 'the sealed die is the staged die').toBe(11);
  expect(sealed.total - sealed.selectedDie, "the sealed margin is the sheet's DEX and proficiency — nothing else").toBe(dexMod + proficiency);
  expect(sealed.outcome, '11 + the sheet beats DC 12').toBe('success');
});

test('G23d the doom walk: dying at zero, three saves on stage, the seal, the memorial, the fall note', async ({ page }) => {
  test.setTimeout(300_000);
  // Disclosed pin: 0.25 → every d20 face is 6 — three failures, the seal.
  await page.addInitScript(() => { Math.random = () => 0.25; });
  const id = await seedFixture(page, { source: doomFixture() });

  const button = page.locator('.roll-button');
  const overlay = page.locator('.dice-overlay');
  for (let save = 1; save <= 3; save += 1) {
    await expect(button, `the doom door stands open for save ${save}`).toBeVisible({ timeout: 15_000 });
    await expect(button.locator('small'), "the door wears the dying companion's name").toHaveText('Brannoc ➤ · death_save · DC 10');
    await expect(button, 'the door names the ritual').toContainText('Death save — Brannoc');
    await button.click();
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('.die span'), 'the pinned die lands ash').toHaveText('6');
    await expect(overlay.locator('.dice-math em'), 'the outcome speaks plainly').toContainText('failure');
    await expect(overlay).toBeHidden({ timeout: 15_000 });
  }

  // The chain: three sealed resolutions, failures mounting, the third a verdict.
  await expect.poll(async () => (await resolutions(page, id)).length, { timeout: 30_000 }).toBe(3);
  const rows = await resolutions(page, id);
  expect(rows.every((r: any) => r.actorId === 'Brannoc'), 'every save seals under the dying companion').toBe(true);
  expect(rows.map((r: any) => r.deathSaves?.failures), 'the failures mount one by one').toEqual([1, 2, 3]);
  expect(rows.map((r: any) => r.verdict), 'two pending breaths, then the seal').toEqual(['pending', 'pending', 'dead']);

  // The memorial and the fall note — permanent surfaces, immune to whatever
  // prose the post-fall turn brings, so no race with the table's scribe.
  await openCodex(page);
  await expect(page.locator('.soul-card.memorial', { hasText: 'Brannoc' }), 'the memorial card stands').toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.thread-fall', { hasText: 'Brannoc fell holding this.' }), 'the held thread carries the fall note').toBeVisible();
  const codexSeal = await page.locator('.sheet-line', { hasText: 'fallen — the seal is permanent' }).count();
  await closeModal(page);
  let sealLines = codexSeal;
  if (sealLines === 0) {
    await openSheet(page);
    sealLines = await page.locator('.sheet-line', { hasText: 'fallen — the seal is permanent' }).count();
    await closeModal(page);
  }
  expect(sealLines, "the sheet wears the permanent seal in the house's own words").toBeGreaterThanOrEqual(1);
});

test('G23e the species court: the painted instance answers the sealed card, and the brief carried the rider', async ({ page }) => {
  test.setTimeout(600_000);
  const m = preflightManifest('g23-battle');
  expect(battleQuestionsDigest(), 'the battle questions are sealed by their pin').toBe(PINNED_BATTLE_QUESTIONS_SHA256);
  expect(BATTLE_PROTOCOL, 'the battle protocol tag').toBe('b1');
  const card = battleCard();

  // The brief: the app's OWN scenePrompt carried THE BESTIARY RIDER byte-for-byte.
  const session = JSON.parse(fs.readFileSync(path.join(HARVEST_DIR, 'fixture', 'session.json'), 'utf8'));
  const brief = (session.prompts || {})['battle-species'];
  expect(typeof brief, 'the battle brief stands in the prompts ledger').toBe('string');
  expect(brief, 'the rider rode the brief, byte for byte').toContain(`Bestiary canon, sealed each: ${card.species} — ${card.visual}.`);

  // The journal tie: the doom fixture seals the SAME canon the court judges —
  // one source, sha-pinned, no fork between the stage and the bench.
  await seedFixture(page, { source: doomFixture() });
  const id = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.js');
    const rows = await db.campaigns.toArray();
    return rows[0].id;
  });
  const campaign = await readCampaign(page, id);
  const sealedCard = (campaign.codex?.bestiary || [])[0] || null;
  expect(sealedCard, 'the doom fixture seals the species card').not.toBeNull();
  expect(sealedCard.species, 'one species, one canon').toBe(card.species);
  expect(sealedCard.visual, 'one visual truth').toBe(card.visual);
  expect(sealedCard.nature, 'one nature').toBe(card.nature);
  expect(sealedCard.threat, 'one threat rating').toBe(card.threat);

  // The plate against the sealed canon.
  const plate = rolePlate(m, 'battle-species');
  const verdict = await speciesVerdict({
    bytes: topBytes(plate), visual: card.visual,
    idSeed: `g23e-species-${String(plate.sha256 || '').slice(0, 12)}`, criterion: 'g23e-species-canon',
  });
  expect(verdict.species_match, `the painted instance answers the sealed card: ${JSON.stringify(verdict)}`).toBe(true);
});
