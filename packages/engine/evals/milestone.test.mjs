// THE MILESTONE GATE (engine twin, the pure fraction) — the road makes
// you larger, and only the road. Levels 1..5 derive from the spine's
// standing beat alone: four thresholds by name (first beat of Act II, the
// Revelation, first beat of Act III, the final beat), the fold monotone
// and clamped, the arithmetic exact, the party in lockstep, and a doom
// never lifted by a milestone. Experience points stay a ledger of deeds
// and move nothing. Keyless, deterministic, no browser.
import assert from 'node:assert/strict';
import { SPINES, getSpine } from '../src/spines.js';
import {
  applyMilestone, applyStateUpdates, createHero, heroRoll,
  milestoneLevel, milestoneThresholds, proficiency, sheetFor
} from '../src/rules.js';
import { applyPartyMilestone, applyStoryUpdates, initCodex } from '../src/story.js';

let courts = 0;
const court = (name, fn) => { fn(); courts += 1; console.log(`  ✓ ${name}`); };

// ---------------------------------------------------------------
// I. THE TABLE OF NUMBERS (§I.3) — nine spines, four thresholds each,
// pinned at ratification. The stair is walked beat by beat: the level at
// every index is exactly one plus the thresholds already crossed.
// ---------------------------------------------------------------
const TABLE = [
  // [id, beats, L2, L3 (reveal), L4, L5 (final)]
  ['classic-epic', 15, 5, 8, 10, 14],
  ['mystery', 13, 4, 9, 10, 12],
  ['heist', 12, 4, 8, 9, 11],
  ['horror-survival', 14, 4, 9, 10, 13],
  ['redemption-road', 14, 4, 8, 10, 13],
  ['siege-of-home', 13, 4, 7, 9, 12],
  ['long-voyage', 14, 4, 9, 10, 13],
  ['crown-intrigue', 13, 4, 8, 9, 12],
  ['pilgrim-lie', 12, 4, 7, 9, 11]
];

court('the closed set: nine spines, the table\u2019s ids exactly', () => {
  assert.equal(SPINES.length, 9, 'nine spines, a closed set');
  assert.deepEqual(new Set(SPINES.map((s) => s.id)), new Set(TABLE.map((r) => r[0])));
});

court('the table of numbers holds for all nine', () => {
  for (const [id, beatCount, l2, l3, l4, l5] of TABLE) {
    const spine = getSpine(id);
    assert.equal(spine.id, id, `${id} answers by name`);
    assert.equal(spine.beats.length, beatCount, `${id} holds ${beatCount} beats`);
    assert.deepEqual(milestoneThresholds(spine), { act2: l2, reveal: l3, act3: l4, final: l5 }, `${id} thresholds`);
  }
});

court('the stair: every beat index folds to exactly one plus the thresholds crossed', () => {
  for (const [id, beatCount, l2, l3, l4, l5] of TABLE) {
    const spine = getSpine(id);
    for (let i = 0; i < beatCount; i += 1) {
      const expected = 1 + (i >= l2 ? 1 : 0) + (i >= l3 ? 1 : 0) + (i >= l4 ? 1 : 0) + (i >= l5 ? 1 : 0);
      assert.equal(milestoneLevel(spine, i), expected, `${id} beat ${i}`);
    }
    assert.equal(milestoneLevel(spine, beatCount - 1), 5, `${id} ends at 5`);
    assert.equal(milestoneLevel(spine, 999), 5, `${id} clamps high`);
    assert.equal(milestoneLevel(spine, -3), 1, `${id} clamps low`);
  }
});

court('the fold fails closed, never inventing a level', () => {
  assert.equal(milestoneThresholds({}), null, 'no beats, no table');
  assert.equal(milestoneThresholds(null), null);
  assert.equal(milestoneLevel({}, 4), 1, 'a spine with no beats grants nothing');
  assert.equal(milestoneLevel(getSpine('classic-epic'), NaN), 1, 'a broken index folds to 1');
  assert.equal(milestoneLevel(getSpine('classic-epic'), '7'), 1, 'a string index proves nothing');
});

// ---------------------------------------------------------------
// II. WHAT A RISE GIVES (§I.4) — floor(hitDie/2) + 1 + CON modifier to
// max AND current hit points, never less than 1 per rise; proficiency by
// the standing formula; slots re-derived carrying their spent count.
// ---------------------------------------------------------------
court('the hit-point arithmetic, exact, wounds carried', () => {
  const hero = createHero({ className: 'Fighter', hitDie: 10, abilities: { STR: 16, DEX: 12, CON: 15, INT: 10, WIS: 12, CHA: 8 } });
  assert.equal(hero.maxHp, 12, 'the base: hitDie + CON modifier');
  const at2 = applyMilestone(hero, 2); // one rise: floor(10/2)+1+2 = 8
  assert.equal(at2.level, 2);
  assert.equal(at2.maxHp, 20);
  assert.equal(at2.hp, 20, 'current rises with maximum');
  const wounded = structuredClone(hero); wounded.hp = 5;
  const woundedAt3 = applyMilestone(wounded, 3); // two rises of 8
  assert.equal(woundedAt3.maxHp, 28);
  assert.equal(woundedAt3.hp, 21, 'the wound is carried, not healed: 5 + 16');
  const at5 = applyMilestone(hero, 5); // four rises
  assert.equal(at5.maxHp, 44);
  assert.equal(at5.level, 5);
});

court('the rise is never less than 1, whatever the constitution', () => {
  const frail = createHero({ className: 'Wizard', hitDie: 6, abilities: { STR: 8, DEX: 10, CON: 3, INT: 16, WIS: 12, CHA: 10 } });
  assert.equal(frail.maxHp, 2, 'the base floors at max(1, 6 - 4)');
  const at3 = applyMilestone(frail, 3); // raw per-rise 3+1-4 = 0, floored to 1
  assert.equal(at3.maxHp, 4, 'two rises of the floor');
  assert.equal(at3.hp, 4);
});

court('proficiency keeps the standing formula and reaches +3 at level 5', () => {
  assert.equal(proficiency(1), 2);
  assert.equal(proficiency(4), 2);
  assert.equal(proficiency(5), 3, '+3 at level 5');
  const hero = applyMilestone(createHero({ className: 'Fighter', hitDie: 10, abilities: { STR: 16, DEX: 12, CON: 15, INT: 10, WIS: 12, CHA: 8 } }), 5);
  const roll = heroRoll(hero, { id: 'r-prof', kind: 'check', ability: 'STR', proficient: true, dc: 10 }, () => 0.5);
  const prof = roll.modifiers.find((m) => m.source === 'Proficiency');
  assert.ok(prof, 'the die carries the proficiency line');
  assert.equal(prof.value, 3, 'the die speaks +3 at level 5');
});

court('spell slots re-derive at the new level, carrying the spent count', () => {
  const mage = createHero({ className: 'Wizard', hitDie: 6, abilities: { STR: 8, DEX: 12, CON: 12, INT: 16, WIS: 12, CHA: 10 } });
  assert.deepEqual(mage.spellSlots, { 1: { max: 2, current: 2 } }, 'level 1 slots');
  const spent = structuredClone(mage); spent.spellSlots[1].current = 1; // one spent
  const at3 = applyMilestone(spent, 3);
  assert.deepEqual(at3.spellSlots, { 1: { max: 4, current: 3 }, 2: { max: 2, current: 2 } },
    'fresh table at 3, the spent first-level slot still spent');
});

// ---------------------------------------------------------------
// III. THE MONOTONE FOLD — a level never falls, and the model may not
// grant one. XP remains a kept ledger that moves nothing.
// ---------------------------------------------------------------
court('the fold refuses a lower or equal level, identity untouched', () => {
  const hero = createHero({ className: 'Fighter', hitDie: 10, abilities: { STR: 16, DEX: 12, CON: 15, INT: 10, WIS: 12, CHA: 8 } });
  const at5 = applyMilestone(hero, 5);
  assert.equal(applyMilestone(at5, 3), at5, 'a lower level moves nothing — the very object returns');
  assert.equal(applyMilestone(at5, 5), at5, 'an equal level moves nothing');
  assert.equal(applyMilestone(hero, 'rot'), hero, 'a rotten target moves nothing');
  assert.equal(applyMilestone(hero, 99).level, 5, 'the ceiling holds at 5');
});

court('experience points move nothing — the lantern is not the road', () => {
  const hero = createHero({ className: 'Fighter', hitDie: 10, abilities: { STR: 16, DEX: 12, CON: 15, INT: 10, WIS: 12, CHA: 8 } });
  const rich = applyStateUpdates(hero, { xp_gain: 999999 });
  assert.equal(rich.level, 1, 'no level derives from XP');
  assert.equal(rich.xp, 999999, 'the ledger of deeds is kept');
  assert.equal(rich.maxHp, hero.maxHp, 'no number rises with it');
});

// ---------------------------------------------------------------
// IV. THE PARTY RISES IN LOCKSTEP (§I.6) — re-seated through THE ROLE
// TABLE's own arithmetic, damage carried absolute, a doom never lifted.
// ---------------------------------------------------------------
court('a granted sheet enters play at the hero\u2019s standing level, whatever rode the op', () => {
  let codex = initCodex('classic-epic');
  codex = applyStoryUpdates(codex, {
    cast_add: [{ name: 'Brannoc', role: 'ally', visual: 'a stocky ferryman', voice: 'blunt river tenor', goal: 'get home', secret: 'he ran once' }],
    party_join: { name: 'Brannoc' }
  }, { turn: 1, heroName: 'Wren', heroLevel: 2 });
  codex = applyStoryUpdates(codex, {
    sheet_grant: { name: 'Brannoc', role: 'guardian', level: 5 }
  }, { turn: 2, heroName: 'Wren', heroLevel: 2 });
  const row = (codex.party || []).find((member) => member?.name === 'Brannoc');
  assert.ok(row?.sheet, 'the sheet is granted');
  assert.equal(row.sheet.level, 2, 'the grant seats at the hero\u2019s standing level, not the op\u2019s 5');
});

court('the milestone re-seats every sheet through the role table, wounds carried absolute', () => {
  const codex = initCodex('crown-intrigue');
  const guardian = { ...sheetFor('guardian', 1), conditions: ['poisoned'] };
  const damage = 3;
  guardian.hp = guardian.maxHp - damage;
  const fallen = { ...sheetFor('skirmisher', 1), conditions: [] };
  fallen.hp = 0;
  codex.party = [
    { name: 'Brannoc', sheet: guardian },
    { name: 'Karsa', sheet: fallen },
    { name: 'Old Tam' } // walks unsheeted; the milestone passes them by
  ];
  const risen = applyPartyMilestone(codex, 3);
  const brannoc = risen.party.find((m) => m.name === 'Brannoc').sheet;
  const table3 = sheetFor('guardian', 3);
  assert.equal(brannoc.level, 3, 'lockstep to the hero\u2019s level');
  assert.equal(brannoc.maxHp, table3.maxHp, 'new maximum from THE ROLE TABLE itself');
  assert.equal(brannoc.hp, table3.maxHp - damage, 'damage carried absolute across the rise');
  assert.deepEqual(brannoc.conditions, ['poisoned'], 'the condition lane rides the re-seat');
  const karsa = risen.party.find((m) => m.name === 'Karsa').sheet;
  assert.equal(karsa.level, 3, 'the fallen rise in rank all the same');
  assert.equal(karsa.hp, 0, 'THE DOOM HOLD: a sheet standing at zero stays at zero');
  assert.ok(karsa.maxHp > 0, 'the maximum rises; the doom does not lift');
  assert.equal(risen.party.find((m) => m.name === 'Old Tam').sheet, undefined, 'no sheet is invented');
});

court('a party already standing at the level moves nothing — the very codex returns', () => {
  const codex = initCodex('heist');
  codex.party = [{ name: 'Brannoc', sheet: { ...sheetFor('mender', 4), conditions: [] } }];
  assert.equal(applyPartyMilestone(codex, 3), codex, 'no sheet below target: identity');
  assert.equal(applyPartyMilestone(codex, 4), codex, 'at target: identity');
});

console.log(`PASS — the milestone gate (engine twin, pure fraction): ${courts} courts sat, all green. The road makes you larger, and only the road.`);
