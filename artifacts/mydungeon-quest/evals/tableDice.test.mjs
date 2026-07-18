// THE TABLE'S-DICE GATE (Directive X, Law V) — the table rolls only for
// the hero and the sheeted: with the sheet ledger seated, actor_id is
// 'hero' or a sheeted companion's name, refused by name otherwise; bare
// context keeps shape law. ONE roll engine, two lawful actors — the
// companion's die folds through the companion's own sheet and carries its
// owner's name; a death save is the plain d20 against 10. The enemy pool
// stays accounted, and the no-invented-numbers rule stands byte-stable in
// the prompt. Keyless, deterministic.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeEntropy, validateDmTurn } from '../src/lib/protocol.js';
import { companionRoll, heroRoll } from 'fatescript/rules';

// ---------------------------------------------------------------
// I. THE ACTOR COURT — seated by the sheet ledger, refused by name.
// ---------------------------------------------------------------
const seatedSheets = { cast: [], party: ['Mara Vey', 'Silla the Fletcher'], sheets: ['Mara Vey'] };
const errorsOf = (payload, context) => (validateDmTurn(payload, [], context).errors || []);
const actorErrors = (payload, context) => errorsOf(payload, context).filter((e) => e.includes('actor_id'));
const roll = (patch = {}) => ({ roll_request: { id: 'r1', label: 'Steady the line', kind: 'check', die: 'd20', ability: 'DEX', skill: null, proficient: false, dc: 12, advantage: 'normal', extra_mod: 0, action_id: null, actor_id: 'hero', target_id: null, ...patch } });

assert.deepEqual(actorErrors(roll(), seatedSheets), [], 'the hero is always a lawful actor');
assert.deepEqual(actorErrors(roll({ actor_id: 'mara VEY' }), seatedSheets), [], 'a sheeted companion is lawful by canon name, case-blind');
assert.ok(actorErrors(roll({ actor_id: 'Gorlan the Uninvited' }), seatedSheets)
  .some((e) => e.includes('roll_request.actor_id names an unsheeted actor: Gorlan the Uninvited — the table rolls only for the hero and the sheeted')),
  'an unsheeted stranger is refused by name');
assert.ok(actorErrors(roll({ actor_id: 'Silla the Fletcher' }), seatedSheets)
  .some((e) => e.includes('names an unsheeted actor: Silla the Fletcher')),
  'party membership alone is not enough — the sheet is the license');
assert.deepEqual(actorErrors(roll({ actor_id: 'Anyone At All' }), { cast: [] }), [],
  'bare context: the actor court stays out of session; shape law holds alone');

// ---------------------------------------------------------------
// II. THE SIBLING FOLD — one engine, the owner's name on the result.
// ---------------------------------------------------------------
const sheet = { role: 'skirmisher', level: 3, sigil: '➤', abilities: { STR: 12, DEX: 15, CON: 12, INT: 10, WIS: 13, CHA: 10 }, hp: 19, maxHp: 19, deathSaves: { successes: 0, failures: 0 } };
const check = { id: 'r2', label: 'Slip the noose', kind: 'check', die: 'd20', ability: 'DEX', skill: null, proficient: true, dc: 12, advantage: 'normal', extra_mod: 0, action_id: null, actor_id: 'Mara Vey', target_id: null };
{
  const result = companionRoll('Mara Vey', sheet, check, () => 0.5);
  assert.equal(result.actorId, 'Mara Vey', 'the owner\u2019s name rides the result — never a bare hero stamp');
  assert.equal(result.selectedDie, 11, 'the seeded die is deterministic');
  assert.deepEqual(result.modifiers, [{ source: 'DEX', value: 2 }, { source: 'Proficiency', value: 2 }],
    'the companion\u2019s own sheet folds: DEX 15 gives +2, level 3 gives +2 proficiency');
  assert.equal(result.total, 15, '11 + 2 + 2 — arithmetic, never model numbers');
  assert.equal(result.outcome, 'success', '15 against DC 12 succeeds');
  assert.deepEqual(result, companionRoll('Mara Vey', sheet, check, () => 0.5), 'same seed, same fold — one engine');
}
{
  const hero = { abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 }, level: 3, conditions: [] };
  const heroResult = heroRoll(hero, { ...check, actor_id: 'hero' }, () => 0.5);
  assert.equal(heroResult.actorId, 'hero', 'the hero\u2019s own fold is unchanged — the sibling took nothing');
  assert.equal(heroResult.total, 15, 'the same law folds both actors');
}

// ---------------------------------------------------------------
// III. THE PLAIN DIE — a death save carries no sheet arithmetic.
// ---------------------------------------------------------------
const saveReq = { id: 'r3', label: 'Death save', kind: 'death_save', die: 'd20', ability: null, skill: null, proficient: true, dc: null, advantage: 'normal', extra_mod: 4, action_id: null, actor_id: 'hero', target_id: null };
{
  const hero = { abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 }, level: 3, conditions: [] };
  const plain = heroRoll(hero, saveReq, () => 0.5);
  assert.deepEqual(plain.modifiers, [], 'no ability, no proficiency, no extras — the plain die alone');
  assert.equal(plain.dcOrAc, 10, 'the dark keeps score at 10 when no DC is named');
  assert.equal(plain.total, 11, 'the die stands alone: 11');
  assert.equal(plain.outcome, 'success', '11 against 10 holds the line');
  const companion = companionRoll('Mara Vey', sheet, { ...saveReq, actor_id: 'Mara Vey' }, () => 0.3);
  assert.deepEqual(companion.modifiers, [], 'the companion\u2019s save is the same plain die');
  assert.equal(companion.total, 7, 'a 7 stands alone');
  assert.equal(companion.outcome, 'failure', '7 against 10 fails — one step toward the dark');
}

// ---------------------------------------------------------------
// IV. THE POOL STILL RULES — enemy draws stay accounted, sheets seated.
// ---------------------------------------------------------------
const pool = makeEntropy(() => .42);
const opening = {
  combat: {
    op: 'start', round_delta: 0, enemy_add: [], enemy_update: [], enemy_remove: [], npc_actions: [],
    spawn: { species: 'Marsh Howler', count: 2, names: null, zone: 'near' },
    initiative: { device: ['Maren', 'Mara Vey'], entropy: [{ group: 'Marsh Howler', index: 5 }] }
  },
  entropy_use: []
};
assert.ok((validateDmTurn(opening, pool, { ...seatedSheets, bestiary: [{ species: 'Marsh Howler', threat: 2 }] }).errors || [])
  .some((e) => e.includes('must cite a d20 entropy_use entry by index')),
  'a sheeted table loosens nothing — the enemy draw still cites the pool or is refused');

// ---------------------------------------------------------------
// V. THE PROMPT PIN & THE SCHEMA MIRROR — the law the model reads.
// ---------------------------------------------------------------
const promptSource = readFileSync(new URL('../src/lib/systemPrompt.js', import.meta.url), 'utf8');
assert.ok(promptSource.includes(`37. THE TABLE'S DICE: every player-side number falls on the player's own device through roll_request — the hero's dice and every sheeted companion's alike (set actor_id to the sheeted companion's exact name; the owner's name rides the roll). Never assert a player-side die result in prose or state_updates — an invented number is outlaw; request the roll and wait for its resolution.`),
  'the no-invented-numbers rule stands in the prompt byte-stable');
const dmSource = readFileSync(new URL('../server/dm.js', import.meta.url), 'utf8');
assert.ok(dmSource.includes('the table rolls only for the hero and the sheeted'),
  'the tool schema tells the model the actor law it is judged by');

console.log('PASS — the table\u2019s dice: the actor court, the sibling fold, the plain die, the accounted pool, and the prompt pin hold.');
