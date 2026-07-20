// THE ARMORY GATE (Experience Directive XVIII, Article I) — the tables
// fixed and SRD-shaped, the kind enum proven one-seat at every bench,
// AC derived from worn rows alone, the attack fold governed from sheet
// bytes with the margin provable from the sealed record. Keyless, pure.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARMOR_TABLE, ENCHANT_TABLE, WEAPON_TABLE, armorRowFor, derivedAc, governAttackRoll, settleAc, weaponRowFor } from 'fatescript/armory';
import { ITEM_KINDS, THREAT_TABLE, safeFallbackTurn, validateDmTurn } from 'fatescript/protocol';
import { applyStoryUpdates, initCodex, storyBlock } from 'fatescript/story';
import { createHero, heroRoll } from 'fatescript/rules';
import { buildSystemPrompt } from '../src/lib/systemPrompt.js';

// --- 1. The tables are fixed and SRD-shaped ---
assert.deepEqual(Object.keys(WEAPON_TABLE).sort(), ['battleaxe', 'dagger', 'greatsword', 'handaxe', 'longbow', 'longsword', 'mace', 'quarterstaff', 'shortbow', 'shortsword', 'spear', 'warhammer'], 'twelve weapon rows exactly');
for (const [key, row] of Object.entries(WEAPON_TABLE)) {
  assert.match(row.damage, /^\d+d\d+$/, `${key} damage is a table die`);
  assert.ok(['piercing', 'slashing', 'bludgeoning'].includes(row.type), `${key} type lawful`);
  assert.ok(['one', 'two', 'versatile'].includes(row.hands), `${key} hands lawful`);
  assert.ok(['engaged', 'near', 'far'].includes(row.band), `${key} band is a table zone`);
  assert.equal(typeof row.finesse, 'boolean', `${key} finesse is a flag`);
  assert.equal(typeof row.thrown, 'boolean', `${key} thrown is a flag`);
}
assert.deepEqual(Object.keys(ARMOR_TABLE).sort(), ['chain mail', 'chain shirt', 'leather', 'plate', 'scale mail', 'shield', 'studded leather'], 'six suits and the shield');
for (const [key, row] of Object.entries(ARMOR_TABLE)) {
  if (row.kind === 'shield') assert.equal(row.bonus, 2, 'the shield is +2, by the table');
  else {
    assert.ok(Number.isInteger(row.base) && row.base >= 11 && row.base <= 18, `${key} base is the SRD number`);
    assert.ok([null, 0, 2].includes(row.dexCap), `${key} dex cap is null, 0, or 2`);
    assert.ok(['light', 'medium', 'heavy'].includes(row.kind), `${key} kind lawful`);
  }
}
// The seating law: longest key at word boundaries; no row = flavor.
assert.equal(armorRowFor('an old studded leather cloak')?.key, 'studded leather', 'the longest key wins the seat');
assert.equal(weaponRowFor('the Longsword of Dawn')?.key, 'longsword', 'seating is case- and punctuation-blind');
assert.equal(weaponRowFor('a whisper of regret'), null, 'a name with no row governs nothing');

// --- 2. Enum lockstep: validator, reducer, schema, prompt — one seat ---
assert.ok(ITEM_KINDS.has('armor') && ITEM_KINDS.size === 6, 'armor joined the kind enum additively');
const dmSource = readFileSync(new URL('../server/dm.js', import.meta.url), 'utf8');
assert.ok(dmSource.includes('enum: [...ITEM_KINDS]'), 'the tool schema imports the kind enum from the one seat, never a mirror');
assert.ok(dmSource.includes('Object.keys(ENCHANT_TABLE)'), 'the tool schema imports the rune keys from the one seat');
const storySource = readFileSync(new URL('../../../packages/engine/src/story.js', import.meta.url), 'utf8');
assert.ok(!storySource.includes('const ITEM_KINDS = ['), 'the reducer keeps no local mirror of the kind enum');
const prompt = buildSystemPrompt({ campaign: {}, hero: createHero({ name: 'Probe' }), spine: null });
assert.ok(prompt.includes('45. THE ARMORY'), 'the armory law rides the prompt');
assert.ok(prompt.includes('ac_set lane is retired'), 'the retirement sentence rides the prompt');
assert.ok(!/"ac":/.test(prompt), 'the static hero sheet no longer bakes an AC opinion into the cached prefix');

// --- 3. Derived AC exact across the directive's cases ---
const A = (STR, DEX) => ({ STR, DEX, CON: 10, INT: 10, WIS: 10, CHA: 10 });
const worn = (specs) => specs.map(([name, enchant]) => ({
  item: { name, kind: 'armor', holder: 'x', status: 'held', equipped: true, ...(enchant ? { enchant } : {}) },
  weapon: null,
  armor: armorRowFor(name)
}));
assert.equal(derivedAc(A(10, 16), []), 13, 'unarmored is 10 + dex, uncapped');
assert.equal(derivedAc(A(10, 16), worn([['worn leather coat']])), 14, 'light armor takes the whole dex');
assert.equal(derivedAc(A(10, 16), worn([['a chain shirt']])), 15, 'medium caps dex at +2');
assert.equal(derivedAc(A(10, 8), worn([['scale mail']])), 13, 'medium takes a NEGATIVE dex whole');
assert.equal(derivedAc(A(10, 16), worn([['a chain mail hauberk']])), 16, 'heavy takes no dex at all');
assert.equal(derivedAc(A(10, 8), worn([['plate harness']])), 18, 'heavy ignores even a poor dex');
assert.equal(derivedAc(A(10, 12), worn([['an oak shield']])), 13, 'the shield is lawful alone');
assert.equal(derivedAc(A(10, 16), worn([['studded leather'], ['an oak shield', 'warded']])), 18, 'suit + shield + warded rune stack by the rows: 12 + 3 dex + 2 shield + 1 rune');
const hero = createHero({ name: 'Probe', abilities: A(10, 16) });
assert.equal(hero.ac, 13, 'the forge derives the unarmored law');
assert.equal(createHero({ name: 'P2', ac: 99, abilities: A(10, 10) }).ac, 10, 'a stated input.ac is opinion and dies at the forge');

// --- 4. The attack fold: governance from sheet bytes alone ---
const trove = [
  { name: 'a longbow of yew', kind: 'weapon', holder: 'Probe', status: 'held', equipped: true, enchant: 'keen' },
  { name: 'worn leather coat', kind: 'armor', holder: 'Probe', status: 'held', equipped: true }
];
const req = { id: 'r1', kind: 'attack', die: 'd20', ability: 'CHA', proficient: false, dc: 11, advantage: 'normal', extra_mod: 0, action_id: 'a1', actor_id: 'hero', target_id: 'Marsh Howler 1' };
const enemies = [{ id: 'marsh-howler-1', name: 'Marsh Howler 1', hp: 9, ac: 12 }];
const governed = governAttackRoll(req, { abilities: A(18, 14), trove, holder: 'Probe', enemies });
assert.equal(governed.ability, 'DEX', 'a far-band weapon governs DEX over the spoken ability');
assert.equal(governed.proficient, true, 'the ready weapon is a proficient weapon');
assert.equal(governed.extra_mod, 1, 'the keen rune rides as +1 to hit');
assert.equal(governed.dc, 12, "the defender's TABLE armor overrides the spoken dc");
const finesse = governAttackRoll({ ...req, target_id: null }, { abilities: A(18, 14), trove: [{ name: 'a dagger', kind: 'weapon', holder: 'P', status: 'held', equipped: true }], holder: 'P', enemies: [] });
assert.equal(finesse.ability, 'STR', 'finesse takes the better of STR/DEX by modifier');
assert.equal(finesse.dc, 11, 'no table target leaves the spoken dc standing');
const mace = governAttackRoll({ ...req, target_id: null }, { abilities: A(8, 18), trove: [{ name: 'a mace', kind: 'weapon', holder: 'P', status: 'held', equipped: true }], holder: 'P', enemies: [] });
assert.equal(mace.ability, 'STR', 'a plain melee weapon is STR even for the nimble');
const bare = governAttackRoll({ ...req }, { abilities: A(10, 10), trove: [], holder: 'P', enemies: [] });
assert.equal(bare.ability, 'CHA', 'an empty hand leaves the request as declared');
assert.equal(bare.proficient, false, 'no weapon, no granted proficiency');
const check = governAttackRoll({ ...req, kind: 'check' }, { abilities: A(10, 10), trove, holder: 'Probe', enemies });
assert.ok(check.ability === 'CHA' && !('governed' in check), 'a non-attack passes through untouched, byte for byte');
// The margin is provable from the sealed bytes alone.
const rolled = heroRoll({ ...hero, abilities: A(18, 14) }, governed, () => 0.5);
assert.equal(rolled.dcOrAc, 12, 'the sealed resolution carries the table armor');
assert.equal(rolled.total, rolled.selectedDie + rolled.modifiers.reduce((sum, mod) => sum + mod.value, 0), 'the margin recomputes from the sealed bytes');
assert.ok(rolled.modifiers.some((mod) => mod.source === 'the keen rune' && mod.value === 1), 'the rune is a NAMED modifier, never a mute +1');

// --- 5. The worn law at the reducer: classes swap apart ---
let codex = initCodex();
codex = applyStoryUpdates(codex, { item_add: [
  { name: 'worn leather coat', kind: 'armor', holder: 'Probe' },
  { name: 'an oak shield', kind: 'armor', holder: 'Probe' },
  { name: 'a longsword', kind: 'weapon', holder: 'Probe' }
] }, { turn: 1 });
codex = applyStoryUpdates(codex, { item_equip: { name: 'worn leather coat', holder: 'Probe' } }, { turn: 2 });
codex = applyStoryUpdates(codex, { item_equip: { name: 'an oak shield', holder: 'Probe' } }, { turn: 3 });
codex = applyStoryUpdates(codex, { item_equip: { name: 'a longsword', holder: 'Probe' } }, { turn: 4 });
assert.deepEqual(codex.trove.filter((t) => t.equipped).map((t) => t.name).sort(), ['a longsword', 'an oak shield', 'worn leather coat'], 'suit, shield, and blade stand together — three classes, no quarrel');
codex = applyStoryUpdates(codex, { item_add: [{ name: 'plate harness', kind: 'armor', holder: 'Probe' }] }, { turn: 5 });
codex = applyStoryUpdates(codex, { item_equip: { name: 'plate harness', holder: 'Probe' } }, { turn: 6 });
assert.deepEqual(codex.trove.filter((t) => t.equipped).map((t) => t.name).sort(), ['a longsword', 'an oak shield', 'plate harness'], 'a new suit unseats ONLY the standing suit');
const settled = settleAc({ ...hero, name: 'Probe', abilities: A(10, 16) }, codex.trove);
assert.equal(settled.ac, 20, 'plate 18 + shield 2, dex silenced by the heavy row');
codex.bestiary = [{ species: 'Marsh Howler', threat: 2 }];
const block = storyBlock(codex);
assert.equal(block.bestiary_state[0].ac, THREAT_TABLE[2].ac, 'the briefing speaks the species table armor');
assert.ok(block.sheet_state.every((row) => !('ac' in row) || Number.isInteger(row.ac)), 'sheet armor, where spoken, is a derived integer');

// --- 6. The door: armor equips pass, the unequippable still dies ---
const doorCtx = { cast: [], trove: [{ name: 'worn leather coat', kind: 'armor', holder: 'Probe' }, { name: 'a love letter', kind: 'document', holder: 'Probe' }] };
const turnWith = (story) => ({ ...safeFallbackTurn('', 3), story });
assert.equal(validateDmTurn(turnWith({ item_equip: { name: 'worn leather coat', holder: 'Probe' } }), [], doorCtx).ok, true, 'armor now passes the equip door');
assert.equal(validateDmTurn(turnWith({ item_equip: { name: 'a love letter', holder: 'Probe' } }), [], doorCtx).ok, false, 'a document still cannot stand at the ready');

console.log('PASS: the armory law holds — tables fixed, enums one-seat, AC derived from worn rows, the attack fold governed from sealed bytes');
