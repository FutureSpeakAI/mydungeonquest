import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { act, boot, closeModal, doomFixture, openSheet, readCampaign, readJournal, seedFixture, turnCount, waitForTurn, rollIfAsked } from './lib/harness';
import { derivedAc, equippedRows, governAttackRoll } from 'fatescript/armory';
import { CLASSES } from 'fatescript/forgeRolls';
import { SPELL_TABLE, companionSpellsFor, knownCountsFor, spellClauseFor, spellRowFor } from 'fatescript/grimoire';
import { applyCast, applyStateUpdates, createHero, slotsForArchetype } from 'fatescript/rules';
import { fieldEntry } from 'fatescript/smith';
import { safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';

// ============================================================
// G34 — THE ARMORY AND THE ART (EXPERIENCE-DIRECTIVE-XVIII, Task 63,
// Section 3). One court over the armory fixture (the doom session
// grown eight lawful turns): the derived AC that moves on equip (a),
// the attack fold governed end-to-end from the read-back sheet (b),
// the atelier picking sealed through Begin (c), the companion's pour
// and the release note that lives in the ledger and never on the
// table (d), the companion spell save under the owner's own name (e),
// the enemy bound to its card's pool (f), and the signature-spell
// plate whose recorded brief carries the visual clause byte-bound (g).
//
// Dice disclosure (ledgered in LOOP_LOG): the walking courts b and e
// pin the table's dice through addInitScript BEFORE boot — 0.5, a d20
// face of 11 — the harness's dice tray, never a change to a shipped
// fold (G23c's own law). Every expectation is derived from the
// read-back record through the app's OWN law modules (armory,
// grimoire, rules), never hardcoded beside them (mirrors-one-seat;
// store seat-binding).
// ============================================================

// --- The fixture's spell canon, derived from the one library ------
const FULL_ROWS = Object.entries(SPELL_TABLE).filter(([, row]: any) => (row.archetypes || []).includes('full'));
const WIZARD_SPELLS: string[] = [
  ...FULL_ROWS.filter(([, row]: any) => row.level === 0).slice(0, 1),
  ...FULL_ROWS.filter(([, row]: any) => row.level >= 1).slice(0, 2),
].map(([key]) => key);
if (WIZARD_SPELLS.length !== 3) throw new Error('G34 fixture: the library owes the wizard one cantrip and two spells');

const MENDER_KNOWNS: string[] = companionSpellsFor('mender', 3, 'full') || [];
// First-circle concentration only: every staged pour spends exactly one
// L1 slot, so the record's arithmetic below is deterministic (a cantrip
// pour — guidance — would spend nothing and lie to the count).
const MENDER_CONC = MENDER_KNOWNS.filter((key) => { const row: any = spellRowFor(key); return Boolean(row?.concentration) && row.level === 1; });
if (MENDER_CONC.length === 0) throw new Error('G34 fixture: the mender knows no first-circle concentration spell — the release walk cannot be staged');
const MENDER_CASTS: [string, string] = [MENDER_CONC[0], MENDER_CONC[1] || MENDER_CONC[0]];

const SIGNATURE_SPELL = FULL_ROWS.find(([, row]: any) => row.level === 0 && row.visual)?.[0] || 'fire bolt';
const SIGNATURE_CLAUSE = spellClauseFor({ cast_spell: { caster: 'Vessarine Olt', spell: SIGNATURE_SPELL } });
if (!SIGNATURE_CLAUSE) throw new Error(`G34 fixture: spellClauseFor stays silent for ${SIGNATURE_SPELL}`);

// A fresh soul of the armory turns' own casting: the doom record's
// Vessarine Olt has FALLEN by its third turn, and the dead do not
// travel — party_join lawfully refuses her (proved on the node bench).
const MENDER = 'Yolande Marr';

const armoryTurn = (text: string, story: any) => ({
  player: 'We see to the gear before the road.',
  dm: { narration_blocks: [{ speaker: null, text }], story },
});

/** The doom session grown eight lawful turns: the steel enters the
 * trove, each hand readies its own class, the mender joins, sheets,
 * pours, and releases. The hero is reborn a full caster — same
 * abilities, the doom walk never read his calling. */
function armoryFixture(): any {
  const fx = doomFixture();
  delete fx.turns[fx.turns.length - 1].wound; // Brannoc stays on his feet — no doom door before the courts
  const name = fx.hero.name;
  fx.hero = { ...fx.hero, className: 'wizard', caster: 'full', spells: WIZARD_SPELLS };
  fx.turns = [
    ...fx.turns,
    armoryTurn('The quartermaster lays the steel on the bench.', {
      item_add: [
        { name: 'chain mail', kind: 'armor', holder: name },
        { name: 'shield', kind: 'armor', holder: name },
        { name: 'spear', kind: 'weapon', holder: name, enchant: 'keen' },
      ],
    }),
    armoryTurn('The mail settles over the shoulders.', { item_equip: { name: 'chain mail', holder: name } }),
    armoryTurn('The shield rides the off arm.', { item_equip: { name: 'shield', holder: name } }),
    armoryTurn('The spear takes the ready hand.', { item_equip: { name: 'spear', holder: name } }),
    armoryTurn('A field-surgeon answers the lantern call.', {
      cast_add: [{ name: MENDER, role: 'healer', visual: 'A calm field-surgeon in a wax-cloth coat, silver hair braided tight, hands stained with tincture.', voice: 'Low and certain, every word measured twice.' }],
    }),
    armoryTurn('She falls in with the shield-line.', { party_join: { name: MENDER } }),
    armoryTurn('Her craft is counted and sworn.', { sheet_grant: { name: MENDER, role: 'mender', level: 3 } }),
    armoryTurn('Her first ward rises over the line.', { cast_spell: { caster: MENDER, spell: MENDER_CASTS[0] } }),
    armoryTurn('The ward turns — the first thread falls.', { cast_spell: { caster: MENDER, spell: MENDER_CASTS[1], release: true } }),
  ];
  return fx;
}

async function resolutions(page: Page, campaignId: string): Promise<any[]> {
  return page.evaluate(async (id) => {
    const { db } = await import('/src/lib/db.js');
    const rows = await db.journal.where('campaignId').equals(id).toArray();
    return rows.filter((row: any) => row.type === 'resolution').map((row: any) => row.payload);
  }, campaignId);
}

async function sheetAc(page: Page): Promise<number> {
  const text = await page.locator('.stat-ribbon span', { hasText: 'AC' }).locator('b').innerText();
  return Number(text);
}

test('G34a: the born grimoire renders whole and the derived AC moves on equip', async ({ page }) => {
  test.setTimeout(300_000);
  const id = await seedFixture(page, { source: armoryFixture() });
  const before = await readCampaign(page, id);
  const hero = before.hero;

  // The sheet, pre-settle: the record's worn rows have not crossed the
  // funnel yet, so the number is the BORN derivation — unarmored.
  await openSheet(page);
  const acBefore = await sheetAc(page);
  expect(acBefore, 'the born AC is the unarmored derivation — ten and DEX alone').toBe(derivedAc(hero.abilities, []));

  // The pips and the chips: projections of the hero record, counted
  // against the one slot table.
  const slots = slotsForArchetype('full', 1);
  const slotSpans = page.locator('.slot-row').first().locator('> span');
  await expect(slotSpans, 'one span per slot level').toHaveCount(Object.keys(slots).length);
  for (const [level, seat] of Object.entries(slots) as any) {
    const span = page.locator('.slot-row').first().locator('> span', { hasText: `L${level}` });
    await expect(span.locator('i'), `L${level} renders every pip`).toHaveCount(seat.max);
    await expect(span.locator('i.full'), `L${level} born full`).toHaveCount(seat.current);
  }
  const chips = page.locator('.spell-list .spell-known');
  await expect(chips, 'one chip per known spell').toHaveCount(WIZARD_SPELLS.length);
  const chipText = (await chips.allTextContents()).map((t) => t.trim().toLowerCase()).sort();
  expect(chipText, 'the chips speak the sealed list').toEqual([...WIZARD_SPELLS].sort());
  await closeModal(page);

  // One live turn — the funnel settles the worn law into the number.
  const turnsBefore = await turnCount(page);
  await act(page, 'I press on down the ridge road.');
  await waitForTurn(page, turnsBefore);
  await rollIfAsked(page);

  const after = await readCampaign(page, id);
  const worn = equippedRows(after.codex?.trove || [], hero.name);
  expect(worn.length, 'the record holds the readied steel: suit, shield, spear').toBe(3);
  const expected = derivedAc(hero.abilities, worn);
  expect(after.hero.ac, 'the settled record carries the worn derivation').toBe(expected);
  await openSheet(page);
  const acAfter = await sheetAc(page);
  expect(acAfter, 'the sheet speaks the settled number').toBe(expected);
  expect(acAfter, 'the equip MOVED the derived AC').not.toBe(acBefore);
});

test('G34b: the attack fold governs ability, proficiency, the rune, and the defender armor end-to-end', async ({ page }) => {
  test.setTimeout(300_000);
  // Disclosed pin: 0.5 → every d20 face is 11.
  await page.addInitScript(() => { Math.random = () => 0.5; });
  const id = await seedFixture(page, {
    source: armoryFixture(),
    mutate: (fx: any) => {
      fx.pendingRoll = {
        id: 'fx-armory-attack', label: 'Spear thrust', kind: 'attack', die: 'd20',
        // Deliberate lies the table must overrule from its own record:
        ability: 'CHA', skill: null, proficient: false, dc: 5, advantage: 'normal',
        extra_mod: 0, action_id: null, actor_id: 'hero', target_id: 'Marsh Howler C',
      };
      return fx;
    },
  });

  const campaign = await readCampaign(page, id);
  const trove = campaign.codex?.trove || [];
  expect(equippedRows(trove, campaign.hero.name).some((row: any) => row.weapon), 'the spear stands ready in the record').toBe(true);

  // The law's own governing, fed the read-back record — the ONE seat.
  const governed: any = governAttackRoll(campaign.pendingRoll, {
    abilities: campaign.hero.abilities, trove, holder: campaign.hero.name, enemies: campaign.combat?.enemies || [],
  });
  expect(governed.ability, 'an engaged, non-finesse spear fights from STR — the spoken CHA falls').toBe('STR');
  expect(governed.proficient, 'the ready weapon is a proficient weapon — the spoken false falls').toBe(true);
  const abilityMod = Math.floor(((campaign.hero.abilities as any)[governed.ability] - 10) / 2);
  const proficiency = 2; // level 1 sits in the 1–4 band of THE ROLE TABLE the keyless gate proves
  const margin = abilityMod + proficiency + (Number(governed.extra_mod) || 0);

  const button = page.locator('.roll-button');
  await expect(button).toBeVisible();
  await expect(button, 'the ask keeps its label').toContainText('Spear thrust');
  await button.click();
  const overlay = page.locator('.dice-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.die span'), 'the pinned die lands its face').toHaveText('11');
  await expect(overlay.locator('.dice-math strong'), 'the staged total is the governed arithmetic').toHaveText(String(11 + margin));

  await expect.poll(async () => (await resolutions(page, id)).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  const rows = await resolutions(page, id);
  const sealed = rows[rows.length - 1];
  expect(sealed.selectedDie, 'the sealed die is the staged die').toBe(11);
  expect(sealed.total - sealed.selectedDie, 'the sealed margin is the sheet and the table — ability, proficiency, the rune').toBe(margin);
  expect(sealed.dcOrAc, 'the sealed bar is the governed bar — the defender record outranks the spoken dc').toBe(governed.dc);
  expect(sealed.outcome, 'the outcome answers the governed bar').toBe(11 + margin >= governed.dc ? 'success' : 'failure');
});

test('G34c: the atelier picking is sealed through Begin — the grimoire door writes the hero record', async ({ page }) => {
  test.setTimeout(300_000);
  await boot(page);
  await page.click('.new-spine');
  await page.waitForSelector('.spark-card');
  await page.locator('.spark-card').nth(1).click();
  await page.click('button:has-text("Forge the hero")');
  await page.waitForSelector('.audition-chip', { timeout: 20_000 });

  // The calling: a full-caster class chosen through the forge's own
  // select, found behind whichever door holds it.
  const fullClass = (CLASSES as any[]).find((row) => row.caster === 'full');
  expect(fullClass, 'the forge offers a full-caster calling').toBeTruthy();
  const callingAsk = fieldEntry('hero', 'className')?.ask;
  expect(typeof callingAsk, 'the field guide holds the calling ask').toBe('string');
  const select = page.locator(`label:has-text("${callingAsk}") select`);
  for (let tab = 0; tab < 3 && !(await select.isVisible().catch(() => false)); tab += 1) {
    await page.locator('.door-tab').nth(tab).click();
  }
  await expect(select, 'the calling select stands at its door').toBeVisible();
  await select.selectOption(fullClass.className);

  // The grimoire opens with the table's own counts, and the walk picks
  // exactly what is owed — keys drawn from the same filtered library
  // the panel itself reads.
  const owed = knownCountsFor('full', 1);
  const panel = page.locator('.grimoire-picks');
  for (let tab = 0; tab < 3 && !(await panel.isVisible().catch(() => false)); tab += 1) {
    await page.locator('.door-tab').nth(tab).click();
  }
  await expect(panel).toBeVisible();
  await expect(panel.locator('h3'), 'the door speaks the owed counts').toContainText(`${owed.cantrips} cantrips`);
  await expect(panel.locator('h3')).toContainText(`${owed.spells} first-circle`);
  const cantrips = FULL_ROWS.filter(([, row]: any) => row.level === 0).map(([key]) => key);
  const firsts = FULL_ROWS.filter(([, row]: any) => row.level === 1).map(([key]) => key);
  const dealtCantrips = cantrips.slice(0, owed.cantrips);
  const dealtFirsts = firsts.slice(0, owed.spells);
  const pickAt = (key: string) => panel.locator(`label.spell-pick:has(span:text-is("${key}"))`);

  // The deal stands pre-checked (THE GRIMOIRE DEAL rides the calling —
  // the one-tap law keeps Begin open), and sovereign ink may repick.
  for (const key of [...dealtCantrips, ...dealtFirsts]) {
    await expect(pickAt(key).locator('input'), `the deal stands checked: ${key}`).toBeChecked();
  }

  // Sovereign repicking: swap one cantrip and one first for the
  // library's next rows — the seal must carry the SWAPPED set.
  const spareCantrip = cantrips[owed.cantrips];
  const spareFirst = firsts[owed.spells];
  expect(spareCantrip, 'the library holds a spare cantrip to swap').toBeTruthy();
  expect(spareFirst, 'the library holds a spare first-circle row to swap').toBeTruthy();
  await pickAt(dealtCantrips[0]).click();
  await expect(pickAt(dealtCantrips[0]).locator('input'), 'the unpicked cantrip falls').not.toBeChecked();
  await pickAt(spareCantrip).click();
  await expect(pickAt(spareCantrip).locator('input'), 'the spare cantrip seats').toBeChecked();
  await pickAt(dealtFirsts[0]).click();
  await expect(pickAt(dealtFirsts[0]).locator('input'), 'the unpicked first falls').not.toBeChecked();
  await pickAt(spareFirst).click();
  await expect(pickAt(spareFirst).locator('input'), 'the spare first seats').toBeChecked();
  const picks = [...dealtCantrips.slice(1), spareCantrip, ...dealtFirsts.slice(1), spareFirst];

  // The hand door: a name for the record, then the blessing and Begin.
  const nameAsk = fieldEntry('hero', 'name')?.ask;
  await page.locator('.door-tab').nth(2).click();
  await page.locator(`label:has-text("${nameAsk}") input`).fill('Quillon Ashe');
  await page.locator('.audition-chip').first().click();
  await page.click('button:has-text("Begin the chronicle")');
  await page.waitForSelector('main.adventure-log', { timeout: 90_000 });

  const campaignId = await page.evaluate(async () => {
    const { db } = await import('/src/lib/db.js');
    const rows = await db.campaigns.toArray();
    return rows[rows.length - 1].id;
  });
  const campaign = await readCampaign(page, campaignId);
  expect(campaign.hero.caster, 'the calling seats the full table').toBe('full');
  expect([...(campaign.hero.spells || [])].sort(), 'the picked craft is sealed on the hero, whole').toEqual([...picks].sort());
  expect(campaign.hero.spellSlots, 'the born slots are the table\u2019s own').toEqual(slotsForArchetype('full', 1));
});

test('G34d: a companion cast spends her own slot, the release notes the ledger only, and a long rest restores', async ({ page }) => {
  test.setTimeout(300_000);
  const id = await seedFixture(page, { source: armoryFixture() });
  const campaign = await readCampaign(page, id);

  // The pour, read back from the sealed record: two casts, two slots.
  const mender = (campaign.codex?.party || []).find((member: any) => member?.name === MENDER);
  expect(mender?.sheet, 'the mender stands sheeted in the record').toBeTruthy();
  const seat = mender.sheet.spellSlots?.[1];
  expect(seat, 'a level-3 mender keeps first-circle slots').toBeTruthy();
  expect(seat.current, 'two pours spent exactly two slots — her own, no one else\u2019s').toBe(seat.max - 2);
  expect(mender.sheet.concentration, 'the second thread stands; the first fell').toBe(MENDER_CASTS[1]);

  // The note seals in the ledger…
  const note = `Concentration released: ${MENDER} lets ${MENDER_CASTS[0]} fall.`;
  expect((campaign.codex?.notes || []).some((row: string) => row.includes(note)), 'the release sealed its note in the ledger').toBe(true);
  // …and never on the table.
  const tableText = await page.locator('main.adventure-log').innerText();
  expect(tableText.includes('Concentration released'), 'the table never speaks the ledger\u2019s note').toBe(false);

  // The rest law, benched through the app's own folds: a spent slot,
  // then the long rest restores the table's full count.
  const bench = createHero({ name: 'Bench Mage', className: 'wizard', abilities: { STR: 8, DEX: 12, CON: 14, INT: 15, WIS: 10, CHA: 10 }, spells: WIZARD_SPELLS });
  const spendKey = WIZARD_SPELLS.find((key) => (spellRowFor(key)?.level ?? 0) >= 1);
  expect(spendKey, 'the bench hero knows a slotted spell').toBeTruthy();
  const spent = applyCast(bench, spellRowFor(spendKey as string));
  expect(spent.spellSlots[1].current, 'the cast spends exactly one').toBe(bench.spellSlots[1].max - 1);
  const rested = applyStateUpdates(spent, { rest: 'long' });
  expect(rested.spellSlots[1].current, 'the long rest restores the full count').toBe(bench.spellSlots[1].max);
});

test('G34e: the companion spell save falls on the device under the owner\u2019s own name', async ({ page }) => {
  test.setTimeout(300_000);
  // Disclosed pin: 0.5 → a d20 face of 11.
  await page.addInitScript(() => { Math.random = () => 0.5; });
  const id = await seedFixture(page, {
    source: armoryFixture(),
    mutate: (fx: any) => {
      fx.pendingRoll = {
        id: 'fx-mender-save', label: 'Hold the ward', kind: 'save', die: 'd20',
        ability: 'CON', skill: null, proficient: false, dc: 13, advantage: 'normal',
        extra_mod: 0, action_id: null, actor_id: MENDER, target_id: null,
      };
      return fx;
    },
  });

  const button = page.locator('.roll-button');
  await expect(button).toBeVisible();
  const small = button.locator('small');
  await expect(small, 'the ask wears the owner\u2019s own name').toContainText(MENDER);
  await expect(small, 'the ask names its kind').toContainText('save');
  await expect(small, 'the ask speaks the bar').toContainText('DC 13');
  await expect(button, 'the ask keeps its label').toContainText('Hold the ward');

  const campaign = await readCampaign(page, id);
  const mender = (campaign.codex?.party || []).find((member: any) => member?.name === MENDER);
  expect(mender?.sheet, 'the mender stands sheeted in the sealed record').toBeTruthy();
  const conMod = Math.floor((mender.sheet.abilities.CON - 10) / 2);

  await button.click();
  const overlay = page.locator('.dice-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.die span'), 'the pinned die lands its face on stage').toHaveText('11');
  await expect(overlay.locator('.dice-math strong'), 'the staged total is her own sheet\u2019s arithmetic').toHaveText(String(11 + conMod));

  await expect.poll(async () => (await resolutions(page, id)).length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  const rows = await resolutions(page, id);
  const sealed = rows[rows.length - 1];
  expect(sealed.actorId, 'the resolution seals under the owner, not the hero').toBe(MENDER);
  expect(sealed.selectedDie, 'the sealed die is the staged die').toBe(11);
  expect(sealed.total - sealed.selectedDie, 'the sealed margin is her CON and nothing else').toBe(conMod);
  expect(sealed.outcome, '11 + her CON against DC 13').toBe(11 + conMod >= 13 ? 'success' : 'failure');
});

test('G34f: the enemy casts only from its card\u2019s pool — cardless craft falls by name', async () => {
  // Node-side bench, the doctored-payload pattern of the standing
  // courts (G23b): the enemy's craft is bound to the sealed species
  // card — the pool the record grants, nothing else.
  const base = safeFallbackTurn('', 3);
  // The context mirrors the keyless gate's own bench byte-for-byte
  // (evals/casting.test.mjs baseContext) — one proven seat, no fork.
  const context = {
    hero: 'Elaria', heroCaster: 'full',
    heroSpells: ['fire bolt', 'cure wounds', 'moonbeam', 'bless'],
    casterSlots: { 1: { current: 2, max: 2 }, 2: { current: 1, max: 1 } },
    concentration: null,
    sheets: ['Rell Marrow'], sheetCasters: [],
    cast: [{ name: 'Old Maren', status: 'dead' }, { name: 'Rell Marrow', status: 'alive' }],
    combatants: [{ id: 'gnoll-1', name: 'the gnoll', species: 'gnoll', hp: 7 }],
    bestiary: [{ species: 'gnoll', spells: ['poison spray'] }],
  };
  // Exact mirror of the gate's castTurn: the story block is REPLACED
  // whole — the cast and its riders, nothing inherited.
  const bench = (op: any, extraStory: any = {}, ctx: any = context) => validateDmTurn(
    { ...base, story: { cast_spell: op, ...extraStory } },
    [],
    ctx
  ).errors;

  const carded = bench({ caster: 'the gnoll', spell: 'poison spray' });
  expect(
    carded.filter((line: string) => line.includes('cast') || line.includes('spell')),
    'the card\u2019s own craft passes the court clean'
  ).toEqual([]);

  const cardless = bench({ caster: 'the gnoll', spell: 'fire bolt' });
  expect(cardless.join('\n'), 'craft beyond the card falls by name').toContain('the gnoll card carries no such spell: fire bolt');

  // A card sealed this same breath teaches the standing combatant —
  // the pool grows only by the record's own door.
  // The gate's own move: the bestiary is EMPTIED first — a standing
  // card would otherwise outrank the same-breath card.
  const taught = bench(
    { caster: 'the gnoll', spell: 'fire bolt' },
    { creature_add: { species: 'gnoll', visual: 'a rangy hyena-thing in rusted mail', nature: 'Pack skirmisher, cackling and craven.', threat: 2, spells: ['fire bolt'] } },
    { ...context, bestiary: [] }
  );
  expect(
    taught.filter((line: string) => line.includes('cast') || line.includes('spell')),
    'a same-turn creature_add card seats the craft'
  ).toEqual([]);
});

test('G34g: the signature-spell plate\u2019s recorded brief carries the visual clause, byte-bound', async ({ page }) => {
  test.setTimeout(300_000);
  const id = await seedFixture(page, { source: armoryFixture() });
  const visual = spellRowFor(SIGNATURE_SPELL)?.visual;
  expect(typeof visual, 'the signature spell carries a sealed visual').toBe('string');
  expect(SIGNATURE_CLAUSE, 'the clause carries the visual byte-for-byte').toContain(visual as string);

  // One mint through the app's OWN easel: the same scenePrompt, the
  // same generationSpec, the same attestation door the table uses —
  // the clause must ride the recorded brief, and the recorded hash
  // must bind those exact bytes.
  const minted = await page.evaluate(async ({ id, clause }) => {
    const { db } = await import('/src/lib/db.js');
    const { appendEvent } = await import('/src/lib/seal.js');
    const { Foundry } = await import('/src/lib/cinema/foundry.js');
    const { scenePrompt, generationSpec } = await import('/src/lib/cinema/prompts.js');
    const campaign = await db.campaigns.get(id);
    if (!campaign) throw new Error('armory campaign missing');
    const region = (campaign.codex.regions || [])[0]?.name || campaign.homeRegion;
    const cue = { kind: 'scene', region, subjects: [], mood: 'the bolt crosses the ford at dusk', crowd: 'none' };
    const moment = { prose: 'The bolt leaps from her hand and crosses the dark water.', seed: 'g34g-signature', speaker: null, spellClause: clause };
    const prompt = scenePrompt(campaign, cue, moment);
    const bare = scenePrompt(campaign, cue, { ...moment, spellClause: undefined });
    const spec = await generationSpec('paint', prompt, { kind: 'scene' });
    const bareSpec = await generationSpec('paint', bare, { kind: 'scene' });
    const foundry = new Foundry({
      campaignId: id, tier: campaign.mediaTier, spend: campaign.spend,
      onAttestation: async (payload: any) => appendEvent(id, 'media_attestation', payload),
    });
    const cacheKey = `proving-scene:${id}:g34-signature`;
    // THE MINT LAW (owner's ruling, effective 57.5): the same job bytes
    // under the same key, at most three complete ladders, capped asks
    // named aloud — never a silent fall.
    let asset: any = null;
    for (let ladder = 1; ladder <= 3; ladder += 1) {
      if (!foundry.allowed('paint')) throw new Error('MINT-HALTED — g34-signature: the image cap is spent (THE MINT LAW)');
      asset = await foundry.enqueue({ kind: 'paint', prompt, options: { kind: 'scene' }, priority: 5, originTurnHash: null, cacheKey });
      if (asset && asset.cacheKey === cacheKey) break;
    }
    return { prompt, specHash: spec.hash, bareHash: bareSpec.hash, cacheKey, assetKey: asset?.cacheKey ?? null };
  }, { id, clause: SIGNATURE_CLAUSE });

  expect(minted.prompt, 'the brief carries the rider and the clause byte-for-byte').toContain(`The spell made visible, exactly this: ${SIGNATURE_CLAUSE}`);
  expect(minted.specHash, 'the clause is load-bearing: with and without hash apart').not.toBe(minted.bareHash);
  expect(minted.assetKey, 'the mint lands under the ask\u2019s own key').toBe(minted.cacheKey);

  // The recorded brief: the attestation sealed at the app's own door
  // carries the binding hash of the clause-bearing bytes.
  const journal = await readJournal(page, id);
  const attestations = journal.filter((row: any) => row.type === 'media_attestation').map((row: any) => JSON.stringify(row.payload || {}));
  const ours = attestations.filter((bytes: string) => bytes.includes(minted.cacheKey) || bytes.includes(minted.specHash));
  expect(ours.length, 'the mint attested through the app\u2019s own door').toBeGreaterThanOrEqual(1);
  expect(ours.some((bytes: string) => bytes.includes(minted.specHash)), 'the recorded brief binds the clause-bearing bytes by hash').toBe(true);
});
