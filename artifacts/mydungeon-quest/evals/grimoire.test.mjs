// THE GRIMOIRE GATE (Experience Directive XVIII, Article IV) — the spell
// library is DATA with an SRD shape: ≥40 rows, cantrips through the third
// circle, every effect spoken ONLY through standing op families; the LEARN
// ceilings are literal anchors; the picking door refuses whole; the
// companion shelves are fixed lists; the caster's line is the dynamic
// evidence; and the DM bench mirrors the one seat (lockstep law). Keyless.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CASTING_ABILITY, SPELL_TABLE, casterLineOf, companionSpellsFor,
  knownCountsFor, maxSpellLevelFor, spellRowFor, spellSaveDc, validateSpellPicks
} from 'fatescript/grimoire';
import { CONDITIONS } from 'fatescript/rules';

const at = (p) => new URL(p, import.meta.url);

// --- 1. The library floor: ≥40 rows, every row SRD-shaped ---
const keys = Object.keys(SPELL_TABLE);
assert.ok(keys.length >= 40, `the grimoire holds forty spells or more (saw ${keys.length})`);
const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const conditionKeys = new Set(Array.isArray(CONDITIONS) ? CONDITIONS : Object.keys(CONDITIONS));
for (const [key, row] of Object.entries(SPELL_TABLE)) {
  assert.equal(key, key.toLowerCase(), `${key} is a lowercase key`);
  assert.ok(Number.isInteger(row.level) && row.level >= 0 && row.level <= 3, `${key} level is 0–3`);
  assert.ok(typeof row.school === 'string' && row.school.trim(), `${key} names a school`);
  assert.ok(Array.isArray(row.archetypes) && row.archetypes.length >= 1 && row.archetypes.every((a) => ['full', 'half'].includes(a)), `${key} archetypes lawful`);
  assert.ok(['attack', 'save', 'auto'].includes(row.resolution), `${key} resolution lawful`);
  if (row.resolution === 'save') assert.ok(ABILITIES.includes(row.save), `${key} save names an ability`);
  else assert.equal(row.save, null, `${key} carries no save unless it resolves by one`);
  assert.ok(row.effect && typeof row.effect === 'object' && !Array.isArray(row.effect), `${key} effect is an object`);
  for (const [op, value] of Object.entries(row.effect)) {
    assert.ok(['damage', 'heal', 'condition'].includes(op), `${key} effect speaks only standing op families (saw ${op})`);
    if (op === 'damage' || op === 'heal') assert.match(String(value), /^\d+d\d+(\+\d+)?$/, `${key} ${op} is a table die`);
    if (op === 'condition') assert.ok(conditionKeys.has(value), `${key} condition is an SRD condition key`);
  }
  assert.equal(typeof row.concentration, 'boolean', `${key} concentration is a flag`);
  assert.ok(typeof row.visual === 'string' && row.visual.trim(), `${key} carries a visual clause`);
}
assert.ok(keys.some((k) => SPELL_TABLE[k].level === 0) && keys.some((k) => SPELL_TABLE[k].level === 3), 'cantrips and the third circle both present');
assert.ok(keys.some((k) => SPELL_TABLE[k].concentration), 'the one-thread law has spells to bind');
assert.ok(SPELL_TABLE['hunter\u2019s mark'], 'hunter\u2019s mark rides the curly apostrophe');
assert.equal(SPELL_TABLE["hunter's mark"], undefined, 'the straight-apostrophe twin does not exist');

// --- 2. spellRowFor: tolerant at the lip, canonical underneath ---
assert.equal(spellRowFor('Fire Bolt ').key, 'fire bolt', 'lookup trims and lowercases');
assert.equal(spellRowFor('no-such-craft'), null, 'an unknown key resolves null, never throws');

// --- 3. The LEARN ceilings are literal anchors ---
assert.deepEqual(knownCountsFor('full', 1), { cantrips: 3, spells: 4 }, 'full L1');
assert.deepEqual(knownCountsFor('full', 5), { cantrips: 4, spells: 8 }, 'full L5');
assert.deepEqual(knownCountsFor('half', 1), { cantrips: 0, spells: 0 }, 'half owes nothing at first level');
assert.deepEqual(knownCountsFor('half', 2), { cantrips: 0, spells: 2 }, 'half L2');
assert.deepEqual(knownCountsFor('half', 5), { cantrips: 0, spells: 5 }, 'half L5');
for (let level = 1; level <= 5; level++) assert.deepEqual(knownCountsFor('energy', level), knownCountsFor('full', level), `energy learns on the full table (L${level})`);
assert.deepEqual(knownCountsFor('none', 3), { cantrips: 0, spells: 0 }, 'a non-caster owes nothing');
assert.deepEqual(knownCountsFor('full', 0), knownCountsFor('full', 1), 'levels clamp at the floor');
assert.deepEqual(knownCountsFor('full', 9), knownCountsFor('full', 5), 'levels clamp at the ceiling');
const counts = knownCountsFor('full', 1); counts.cantrips = 99;
assert.equal(knownCountsFor('full', 1).cantrips, 3, 'the table hands out copies, never its own rows');

// --- 4. The reachable circle reads off the slot tables ---
assert.equal(maxSpellLevelFor('full', 1), 1); assert.equal(maxSpellLevelFor('full', 3), 2); assert.equal(maxSpellLevelFor('full', 5), 3);
assert.equal(maxSpellLevelFor('half', 1), 0); assert.equal(maxSpellLevelFor('half', 2), 1); assert.equal(maxSpellLevelFor('half', 5), 2);
assert.equal(maxSpellLevelFor('energy', 5), maxSpellLevelFor('full', 5), 'the energy tank unlocks by the full table');
assert.equal(maxSpellLevelFor('none', 5), 0, 'a non-caster reaches no circle');

// --- 5. The picking door refuses whole ---
const fullRows = keys.filter((k) => SPELL_TABLE[k].archetypes.includes('full'));
const lawfulCantrips = fullRows.filter((k) => SPELL_TABLE[k].level === 0).slice(0, 3);
const lawfulFirsts = fullRows.filter((k) => SPELL_TABLE[k].level === 1).slice(0, 4);
assert.equal(validateSpellPicks({ archetype: 'full', level: 1, known: [], picks: [...lawfulCantrips, ...lawfulFirsts] }).ok, true, 'a lawful first-level book passes');
assert.equal(validateSpellPicks({ archetype: 'full', level: 1, known: [], picks: [] }).ok, false, 'an empty batch is refused');
assert.equal(validateSpellPicks({ archetype: 'full', level: 1, known: [], picks: ['no-such-craft'] }).ok, false, 'an unknown key is refused');
assert.equal(validateSpellPicks({ archetype: 'full', level: 1, known: [], picks: [lawfulCantrips[0], lawfulCantrips[0]] }).ok, false, 'a duplicate within the batch is refused');
assert.equal(validateSpellPicks({ archetype: 'full', level: 1, known: [lawfulCantrips[0]], picks: [lawfulCantrips[0]] }).ok, false, 'an already-learned key is refused');
const fullOnly = fullRows.find((k) => !SPELL_TABLE[k].archetypes.includes('half') && SPELL_TABLE[k].level === 1);
assert.equal(validateSpellPicks({ archetype: 'half', level: 2, known: [], picks: [fullOnly] }).ok, false, 'a row the archetype is not taught is refused');
const thirdCircle = keys.find((k) => SPELL_TABLE[k].level === 3 && SPELL_TABLE[k].archetypes.includes('full'));
assert.equal(validateSpellPicks({ archetype: 'full', level: 1, known: [], picks: [thirdCircle] }).ok, false, 'a circle above reach is refused');
const tooMany = fullRows.filter((k) => SPELL_TABLE[k].level === 1).slice(0, 5);
assert.equal(validateSpellPicks({ archetype: 'full', level: 1, known: [], picks: tooMany }).ok, false, 'a ceiling breach is refused');
assert.equal(validateSpellPicks({ archetype: 'energy', level: 1, known: [], picks: [...lawfulCantrips, ...lawfulFirsts] }).ok, true, 'the energy tank picks on the full table');

// --- 6. The companion shelves: fixed, lawful, sliced by the same ceilings ---
const menderBook = companionSpellsFor('mender', 2, 'full');
const c2 = knownCountsFor('full', 2);
assert.ok(menderBook.length <= c2.cantrips + c2.spells, 'the shelf never exceeds the ceilings');
assert.ok(menderBook.includes('sacred flame') && menderBook.includes('cure wounds'), 'the mender\u2019s craft is the healing craft');
for (const k of [...companionSpellsFor('mender', 5, 'full')]) assert.ok(SPELL_TABLE[k]?.archetypes.includes('full'), `mender shelf row ${k} is taught to the full archetype`);
for (const k of [...companionSpellsFor('trickster', 5, 'half')]) assert.ok(SPELL_TABLE[k]?.archetypes.includes('half'), `trickster shelf row ${k} is taught to the half archetype`);
assert.deepEqual(companionSpellsFor('guardian', 5, 'none'), [], 'a none-column calling has no shelf');
assert.deepEqual(companionSpellsFor('mender', 5, 'none'), [], 'no casting, no shelf');
assert.deepEqual(companionSpellsFor('unheard-of', 5, 'full'), [], 'an unknown calling has no shelf');

// --- 7. The save DC derives from the tables ---
assert.equal(spellSaveDc({ className: 'cleric', level: 1, abilities: { WIS: 14 } }), 12, '8 + prof 2 + WIS 2');
assert.equal(spellSaveDc({ role: 'mender', level: 1, abilities: { WIS: 14 } }), 12, 'the sheet bench derives the same way');
assert.equal(CASTING_ABILITY.warlock, 'CHA', 'the energy tank casts by charisma');

// --- 8. The caster's line: honest, small, a copy ---
assert.equal(casterLineOf({ caster: 'none' }), null, 'a non-caster rides null');
assert.equal(casterLineOf(null), null, 'no hero, no line');
const line = casterLineOf({ caster: 'full', spells: ['fire bolt'], spellSlots: { 1: { current: 2, max: 2 } }, concentration: null });
assert.deepEqual(line, { archetype: 'full', spells: ['fire bolt'], slots: { 1: '2/2' }, concentration: null }, 'the line speaks slots as current/max');
const heroSeat = { caster: 'energy', spells: [], spellSlots: {}, spellEnergy: { current: 3, max: 3 }, concentration: null };
assert.equal(casterLineOf(heroSeat).energy, '3/3', 'the energy tank speaks as a charge line');
casterLineOf(heroSeat).spells.push('stolen');
assert.equal(heroSeat.spells.length, 0, 'the line is a copy, never the hero\u2019s own list');

// --- 9. Lockstep: the DM bench mirrors the one seat ---
const dmSource = readFileSync(at('../server/dm.js'), 'utf8');
assert.ok(dmSource.includes("from 'fatescript/grimoire'") || dmSource.includes('fatescript/grimoire'), 'the DM bench imports the one grimoire seat');
assert.ok((dmSource.match(/Object\.keys\(SPELL_TABLE\)/g) || []).length >= 2, 'both schema enums (cast_spell.spell, creature_add.spells) read the table, never a hand list');
assert.ok(!dmSource.includes("'fire bolt'"), 'no spell key is inlined at the DM bench — the enum has one seat');
const promptSource = readFileSync(at('../src/lib/systemPrompt.js'), 'utf8');
for (const header of ['48. THE GRIMOIRE', '49. THE CASTING', '50. THE TABLE RULE']) assert.ok(promptSource.includes(header), `the law speaks in the prompt: ${header}`);

console.log('PASS: the grimoire law holds — the library SRD-shaped with effects in standing op families, ceilings anchored, the picking door whole, shelves fixed, the caster\u2019s line honest, the DM bench in lockstep');
