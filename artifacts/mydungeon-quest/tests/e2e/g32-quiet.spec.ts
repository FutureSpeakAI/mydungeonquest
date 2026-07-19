import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_ROOT } from './lib/vision';
import { act, boot, seedFixture, waitForTurn } from './lib/harness';
// THE ONE ROAD's own words — the court reads the law's bytes, never a
// mirror (mirrors-one-seat): the refusal strings it bans from the render
// surface are imported from the modules that own them.
import { DASH_REASON } from '../../src/lib/voice.js';
import { dmToolSchema } from '../../server/dm.js';
import { safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';

// ============================================================
// G32 — THE QUIET TABLE (60B §4). Two sittings.
//
// G32a — THE SCHEMA COURT: the tool schema the live smith is handed
// must MIRROR the strict validator (the toolschema-validation lesson:
// a schema that omits an enum the validator enforces makes the model
// emit valid-but-rejected turns that silently fall back). The court
// asserts the sheet-condition enum stands in the schema verbatim, the
// equip door declares its exact two keys, the mock floor still ships,
// and the validator's refusal speaks its pinned court language — the
// same language G32b then proves never reaches a player's eyes.
//
// G32b — THE DOM QUIET SWEEP: court-internal language (validator
// refusals, editor flags, papers vocabulary) is ledger-only. The
// player-facing surfaces — the seeded table and a freshly poured mock
// turn — must never render it. The needles are the laws' own strings,
// read from their one seat above; player-lawful lines (the honest
// empty frame, the purse's "Refused at t.N") are deliberately NOT on
// this list — honesty in plain speech is the house's promise, not a
// leak.
// ============================================================

// The eight SRD condition names Directive XII §II pins — the law's list,
// asserted verbatim against the schema the smith actually sees.
const SRD_CONDITIONS = ['poisoned', 'frightened', 'restrained', 'stunned', 'paralyzed', 'unconscious', 'blinded', 'prone'];

/** Walks any JSON shape and returns every node holding the named key. */
function findDeep(node: any, key: string, hits: any[] = []): any[] {
  if (!node || typeof node !== 'object') return hits;
  if (Object.prototype.hasOwnProperty.call(node, key)) hits.push(node[key]);
  for (const value of Array.isArray(node) ? node : Object.values(node)) findDeep(value, key, hits);
  return hits;
}

test('G32a: the tool schema mirrors the strict validator, and the refusal keeps court language', async () => {
  // 1. THE CONDITION ENUM — every add/remove enum under sheet_condition
  // must carry the eight SRD names exactly (a schema the model cannot
  // see is a trap; an enum it cannot see is the same trap).
  const sheetNodes = findDeep(dmToolSchema, 'sheet_condition');
  expect(sheetNodes.length, 'the schema declares the sheet_condition door').toBeGreaterThanOrEqual(1);
  const enums = [...findDeep(sheetNodes, 'add'), ...findDeep(sheetNodes, 'remove')]
    .flatMap((node) => findDeep(node, 'enum'));
  expect(enums.length, 'the condition arrays declare their enum to the model').toBeGreaterThanOrEqual(2);
  for (const list of enums) {
    expect([...list].sort(), 'the schema enum is the validator\u2019s exact SRD list').toEqual([...SRD_CONDITIONS].sort());
  }

  // 2. THE EQUIP DOOR — exactly { name, holder }, declared closed.
  const equipNodes = findDeep(dmToolSchema, 'item_equip').filter((n) => n && typeof n === 'object');
  expect(equipNodes.length, 'the schema declares the item_equip door').toBeGreaterThanOrEqual(1);
  const equipRequired = findDeep(equipNodes, 'required').find((r) => Array.isArray(r) && r.includes('holder'));
  expect(equipRequired, 'item_equip requires name and holder — the validator\u2019s exact shape').toEqual(['name', 'holder']);

  // 3. THE MOCK FLOOR — the fallback turn the keyless house serves must
  // walk the strict validator untouched (bare context keeps shape law).
  const floor = validateDmTurn(safeFallbackTurn('', 1), [], {});
  expect(floor.ok, `the safe fallback turn passes the strict validator: ${JSON.stringify(floor.errors || [])}`).toBe(true);

  // 4. THE REFUSAL SPEAKS COURT LANGUAGE — an equip naming a thing no
  // record holds, with the trove court seated, draws the pinned refusal
  // G32b bans from every player surface.
  const liar = { ...safeFallbackTurn('', 1), story: { item_equip: { name: 'the ghost blade', holder: 'Maren' } } };
  const refused = validateDmTurn(liar, [], { trove: [] });
  expect(refused.ok, 'the equip lie is refused').toBe(false);
  const named = (refused.errors || []).some((line: string) => line.includes('the record does not hold'));
  expect(named, `the refusal names the missing record in court language: ${JSON.stringify(refused.errors || [])}`).toBe(true);
});

test('G32b: no court language ever renders on the table', async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  await seedFixture(page, { boot: true });
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });

  // The banned lexicon — every needle is a verified court-internal
  // literal from the laws' own seats. Case-folded sweep; 'mandatory
  // revise' is banned in any case the addendum could shout it in.
  const banned = [
    'names a thing the record does not hold',
    'does not stand among the subjects',
    'the pinned ceiling is',
    'image_cue.subjects',
    'narration_blocks',
    'originTurnHash',
    'assetHash',
    'stale-papers',
    'flagged:',
    'mandatory revise',
    DASH_REASON,
  ];

  const sweep = async (moment: string) => {
    const text = String(await page.evaluate(() => document.body.innerText || ''));
    const folded = text.toLowerCase();
    for (const needle of banned) {
      expect(folded.includes(needle.toLowerCase()), `${moment}: court language "${needle}" must never render`).toBe(false);
    }
  };

  await sweep('the seeded table');

  // One fresh pour through the mock smith on a LIVE table — the seeded
  // book is sealed replay (its composer never opens), so the pour walks
  // a fresh forge to a breathing page; every surface it touches must
  // stay as quiet as the seeded ones.
  await page.reload();
  await page.waitForSelector('.title-page', { timeout: 45_000 });
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
  await page.locator('.spark-card').nth(1).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });
  await page.locator('.audition-chip').first().click();
  await page.click('button:has-text("Begin the chronicle")');
  await page.waitForSelector('main.adventure-log', { timeout: 90_000 });
  await waitForTurn(page, 0);
  await sweep('the fresh table, first word poured');
  await act(page, 'I study the road ahead and keep my own counsel.');
  await waitForTurn(page, 1);
  await sweep('the fresh mock pour');
});
