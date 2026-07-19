// THE DOOM GATE (engine twin, pure fraction) — the sheet door (a standing
// party member, a ROLE TABLE role, level 1-5, sealed once), the arithmetic
// cited row by row, the reducer's fold with sheet_state on the block; then
// the walk: zero is DYING not dead, three-and-three under seeded dice, a
// fourth save refused, the grave law holding (memorial fact, no
// resurrection retcon), and the fall notes riding held threads by name.
// Keyless, deterministic. The game's compat seats '../src/lib/protocol.js'
// and '../src/lib/story.js' are shims over 'fatescript/protocol' and
// 'fatescript/story'; the engine reads its true homes '../src/protocol.js'
// and '../src/story.js'. The prompt pin & schema mirror (game §VI, reading
// '../src/lib/systemPrompt.js' and '../server/dm.js') are game-only law —
// the engine has no system prompt or tool schema — and are judged at the
// table's own gate.
import assert from 'node:assert/strict';
import { validateDmTurn } from '../src/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/story.js';
import { ROLE_TABLE, applyStateUpdates, foldDeathSave, heroRoll, sheetFor } from '../src/rules.js';

// ---------------------------------------------------------------
// I. THE SHEET DOOR — shape, role, level; membership and the seal.
// ---------------------------------------------------------------
const seated = { cast: [], party: ['Mara Vey'], sheets: ['Rell Marrow'] };
const errorsOf = (payload, context) => (validateDmTurn(payload, [], context).errors || []);
const grantErrors = (payload, context) => errorsOf(payload, context).filter((e) => e.includes('sheet_grant'));
const grant = (patch = {}) => ({ story: { sheet_grant: { name: 'Mara Vey', role: 'skirmisher', level: 3, ...patch } } });

assert.deepEqual(grantErrors(grant(), seated), [], 'a lawful grant passes: a standing member, a table role, a lawful level');
assert.ok(errorsOf({ story: { sheet_grant: [grant().story.sheet_grant] } }, seated).some((e) => e.includes('sheet_grant must be an object with exactly name, role, and level')),
  'an array is refused — the grant is a single object');
assert.ok(errorsOf({ story: { sheet_grant: { ...grant().story.sheet_grant, hp: 99 } } }, seated).some((e) => e.includes('exactly name, role, and level')),
  'a smuggled hp key is refused — hit points are arithmetic, never granted');
assert.ok(grantErrors(grant({ name: 'X' }), seated).some((e) => e.includes('sheet_grant.name must be 2-60 chars')), 'a one-byte name is refused');
assert.ok(grantErrors(grant({ role: 'bard' }), seated).some((e) => e.includes('sheet_grant.role must be one of guardian, skirmisher, mender, trickster')),
  'a role outside the table is refused');
for (const level of [0, 6, 2.5, '3', null]) {
  assert.ok(grantErrors(grant({ level }), seated).some((e) => e.includes('sheet_grant.level must be an integer between 1 and 5')),
    `level ${JSON.stringify(level)} is refused`);
}
assert.ok(grantErrors(grant({ name: 'Gorlan the Uninvited' }), seated).some((e) => e.includes('sheet_grant names a soul outside the standing party: Gorlan the Uninvited')),
  'a soul outside the party is refused by name');
assert.deepEqual(grantErrors({ story: { party_join: { name: 'Silla the Fletcher' }, sheet_grant: { name: 'Silla the Fletcher', role: 'mender', level: 1 } } }, seated), [],
  'a soul joining this same breath may take a sheet in the same turn');
assert.ok(grantErrors(grant({ name: 'rell MARROW' }), seated).some((e) => e.includes('sheet_grant duplicates a standing sheet: rell MARROW')),
  'a duplicate sheet is refused by canon name, case-blind — sheets seal once');
assert.deepEqual(grantErrors(grant({ name: 'Gorlan the Uninvited' }), { cast: [] }), [],
  'bare context: shape law alone; membership and the seal stay out of session');

// ---------------------------------------------------------------
// II. THE ROLE TABLE — fixed law, and the arithmetic cited row by row.
// ---------------------------------------------------------------
assert.deepEqual(ROLE_TABLE, {
  guardian:   { spread: { STR: 15, DEX: 12, CON: 14, INT: 8,  WIS: 12, CHA: 10 }, bandHp: 12, perLevel: 7, sigil: '▲' },
  skirmisher: { spread: { STR: 12, DEX: 15, CON: 12, INT: 10, WIS: 13, CHA: 10 }, bandHp: 9,  perLevel: 5, sigil: '➤' },
  mender:     { spread: { STR: 10, DEX: 12, CON: 13, INT: 12, WIS: 15, CHA: 10 }, bandHp: 8,  perLevel: 4, sigil: '✚' },
  trickster:  { spread: { STR: 10, DEX: 15, CON: 12, INT: 13, WIS: 10, CHA: 14 }, bandHp: 8,  perLevel: 5, sigil: '◆' }
}, 'the role table is fixed law — four roles, spread and growth in code');
const HP_LAW = [
  ['guardian', 1, 12], ['guardian', 3, 26], ['guardian', 5, 40],
  ['skirmisher', 1, 9], ['skirmisher', 3, 19], ['skirmisher', 5, 29],
  ['mender', 1, 8], ['mender', 3, 16], ['mender', 5, 24],
  ['trickster', 1, 8], ['trickster', 3, 18], ['trickster', 5, 28]
];
for (const [role, level, hp] of HP_LAW) {
  const sheet = sheetFor(role, level);
  assert.equal(sheet.hp, hp, `${role} level ${level}: hp = band + (level - 1) x growth = ${hp}`);
  assert.equal(sheet.maxHp, hp, `${role} level ${level} maxHp matches`);
  assert.deepEqual(sheet.abilities, ROLE_TABLE[role].spread, `${role} carries the table's own spread`);
  assert.deepEqual(sheet.deathSaves, { successes: 0, failures: 0 }, 'every sheet is born with a clean bed');
}
assert.equal(sheetFor('GUARDIAN', 2).role, 'guardian', 'the role folds case-blind');
for (const [role, level] of [['bard', 2], ['guardian', 0], ['guardian', 6], ['guardian', 2.5], [null, 1]]) {
  assert.equal(sheetFor(role, level), null, `no honest sheet for ${JSON.stringify(role)} at ${JSON.stringify(level)} — fail closed`);
}

// ---------------------------------------------------------------
// III. THE FOLD — seal once with a note; the block carries the sheet.
// ---------------------------------------------------------------
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { cast_add: [{ name: 'Rell Marrow', role: 'sellsword', visual: 'Scar-knuckled woman in oiled leather.', voice: 'low gravel', goal: 'Die owing nothing', secret: 'Owes everything' }] }, { turn: 1 });
codex = applyStoryUpdates(codex, { party_join: { name: 'Rell Marrow' } }, { turn: 2 });
codex = applyStoryUpdates(codex, { sheet_grant: { name: 'Rell Marrow', role: 'guardian', level: 2 } }, { turn: 3, tick: true });
assert.ok(codex.notes.some((n) => n.includes('The offscreen world may not arm the party: sheet_grant refused on a tick.')),
  'the offscreen tick may not arm the party');
codex = applyStoryUpdates(codex, { sheet_grant: { name: 'Rell Marrow', role: 'bard', level: 2 } }, { turn: 3 });
assert.ok(codex.notes.some((n) => n.includes('Unlawful sheet_grant blocked: no honest role or level for Rell Marrow.')),
  'a lawless role seals nothing — fail closed with a note');
codex = applyStoryUpdates(codex, { sheet_grant: { name: 'Gorlan the Uninvited', role: 'guardian', level: 1 } }, { turn: 3 });
assert.ok(codex.notes.some((n) => n.includes('Unlawful sheet_grant blocked: Gorlan the Uninvited does not stand in the party.')),
  'a grant outside the party is a note, never a seat');
codex = applyStoryUpdates(codex, { sheet_grant: { name: 'rell marrow', role: 'guardian', level: 2 } }, { turn: 3 });
const rell = codex.party.find((member) => member.name === 'Rell Marrow');
assert.deepEqual(rell.sheet, { role: 'guardian', level: 2, sigil: '▲', abilities: { STR: 15, DEX: 12, CON: 14, INT: 8, WIS: 12, CHA: 10 }, hp: 19, maxHp: 19, deathSaves: { successes: 0, failures: 0 }, conditions: [] },
  'the sheet seals from the table, canon name case-blind: guardian 2 stands at 19');
codex = applyStoryUpdates(codex, { sheet_grant: { name: 'RELL marrow', role: 'mender', level: 5 } }, { turn: 4 });
assert.ok(codex.notes.some((n) => n.includes('Sheet canon sealed once: Rell Marrow already holds a sheet.')),
  'the second grant is refused with a note');
assert.equal(codex.party.find((member) => member.name === 'Rell Marrow').sheet.role, 'guardian', 'the first truth stands');
assert.deepEqual(storyBlock(codex).sheet_state, [{ name: 'Rell Marrow', role: 'guardian', level: 2, hp: 19, conditions: [] }],
  'sheet_state rides the block — name, role, level, hit points, and the condition lane (Directive XII §II.4)');

// ---------------------------------------------------------------
// IV. THE WALK — three-and-three under seeded dice; the fourth refused.
// ---------------------------------------------------------------
{
  let bed = foldDeathSave({ successes: 0, failures: 0 }, 'success');
  assert.deepEqual(bed, { deathSaves: { successes: 1, failures: 0 }, verdict: 'pending' }, 'one success, still dying');
  bed = foldDeathSave(bed.deathSaves, 'critical_success');
  assert.equal(bed.verdict, 'pending', 'a crit counts one step — no invented mercies');
  bed = foldDeathSave(bed.deathSaves, 'success');
  assert.deepEqual(bed, { deathSaves: { successes: 3, failures: 0 }, verdict: 'stable' }, 'three successes: stable at zero');
  assert.deepEqual(foldDeathSave(bed.deathSaves, 'failure'), { deathSaves: { successes: 3, failures: 0 }, verdict: 'stable' },
    'a fourth save is refused — the stable bed stays sealed');
}
{
  let bed = foldDeathSave({ successes: 1, failures: 1 }, 'failure');
  assert.equal(bed.verdict, 'pending', 'two failures, the walk goes on');
  bed = foldDeathSave(bed.deathSaves, 'critical_failure');
  assert.deepEqual(bed, { deathSaves: { successes: 1, failures: 3 }, verdict: 'dead' }, 'three failures: the seal is permanent');
  assert.deepEqual(foldDeathSave(bed.deathSaves, 'critical_success'), { deathSaves: { successes: 1, failures: 3 }, verdict: 'dead' },
    'no save reopens a sealed grave');
}
{
  const hero = { abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 }, level: 2, conditions: [] };
  const saveReq = { id: 'ds1', label: 'Death save', kind: 'death_save', die: 'd20', ability: null, skill: null, proficient: false, dc: null, advantage: 'normal', extra_mod: 0, action_id: null, actor_id: 'hero', target_id: null };
  let bed = { successes: 0, failures: 0 }; let verdict = 'pending';
  for (let i = 0; i < 3; i++) { const folded = foldDeathSave(bed, heroRoll(hero, saveReq, () => 0.3).outcome); bed = folded.deathSaves; verdict = folded.verdict; }
  assert.deepEqual({ bed, verdict }, { bed: { successes: 0, failures: 3 }, verdict: 'dead' },
    'seeded 7s walk the whole road down: three failures, death');
  bed = { successes: 0, failures: 0 };
  for (let i = 0; i < 3; i++) { const folded = foldDeathSave(bed, heroRoll(hero, saveReq, () => 0.6).outcome); bed = folded.deathSaves; verdict = folded.verdict; }
  assert.deepEqual({ bed, verdict }, { bed: { successes: 3, failures: 0 }, verdict: 'stable' },
    'seeded 13s walk it back up: three successes, stable at zero');
}
{
  const dying = applyStateUpdates({ hp: 3, maxHp: 20, xp: 0, level: 2, gold: 0, conditions: [], inventory: [], deathSaves: { successes: 0, failures: 0 } }, { hp_delta: -9 });
  assert.equal(dying.hp, 0, 'zero is the floor — DYING, not dead; no negative ledgers');
  const mended = applyStateUpdates({ hp: 0, maxHp: 20, xp: 0, level: 2, gold: 0, conditions: [], inventory: [], deathSaves: { successes: 2, failures: 1 }, stableAtZero: true }, { hp_delta: 5 });
  assert.equal(mended.hp, 5, 'breath returns');
  assert.deepEqual(mended.deathSaves, { successes: 0, failures: 0 }, 'above zero the bed resets');
  assert.equal(mended.stableAtZero, false, 'the stable-at-zero mark lifts with the breath');
}

// ---------------------------------------------------------------
// V. THE GRAVE — memorial fact, fall notes on held threads, no retcons.
// ---------------------------------------------------------------
codex = applyStoryUpdates(codex, { thread_add: [{ label: 'Bring the ledger home', kind: 'promise', holder: 'Rell Marrow' }, { label: 'Find the caldera door', kind: 'mystery', holder: null }] }, { turn: 5 });
codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Rell Marrow', status: 'dead', last_seen: 'The third failure sealed it' }] }, { turn: 6 });
const fallen = codex.cast.find((soul) => soul.name === 'Rell Marrow');
assert.equal(fallen.status, 'dead', 'the seal flips once');
assert.ok(fallen.known_facts.some((fact) => fact.includes('Fell on turn 6 — The third failure sealed it')), 'the memorial fact is written');
const held = codex.threads.find((thread) => thread.label === 'Bring the ledger home');
assert.equal(held.fallNote, 'Rell Marrow fell holding this.', 'the held thread carries its fall note by name');
assert.equal(held.status, 'open', 'the thread stays open — grief is not an outcome');
assert.equal(codex.threads.find((thread) => thread.label === 'Find the caldera door').fallNote, undefined,
  'an unheld thread carries no fall note — nothing invented');
assert.ok(codex.notes.some((n) => n.includes('The thread "Bring the ledger home" lost its holder: Rell Marrow has fallen.')),
  'the fall is noted in the journal\u2019s own hand');
codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Rell Marrow', status: 'active' }] }, { turn: 7 });
assert.equal(codex.cast.find((soul) => soul.name === 'Rell Marrow').status, 'dead', 'dead remains dead');
assert.ok(codex.notes.some((n) => n.includes('Resurrection retcon blocked: Rell Marrow is dead and remains so.')),
  'the retcon is refused with a note');

console.log('PASS — the doom law (engine twin, pure fraction): the sheet door, the role table, the sealed fold, the three-and-three walk, the grave, and the fall notes hold; the prompt pin and schema mirror are judged at the table\u2019s own gate.');
