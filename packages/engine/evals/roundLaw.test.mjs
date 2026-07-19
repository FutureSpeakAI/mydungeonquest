// THE ROUND-LAW GATE (engine twin, pure fraction) — combat opens by
// sealing initiative as an operation: the device side named whole, one
// accounted d20 pool draw per enemy species group, at most three; one
// action per living combatant per turn, a second refused BY NAME; the
// sealed order never reshuffles — ties break toward the player, then
// alphabetically; the downed and the fled keep their seats. Keyless,
// deterministic. The game's compat seat '../src/lib/protocol.js' is a
// shim over 'fatescript/protocol'; the engine reads its true home
// '../src/protocol.js' directly.
import assert from 'node:assert/strict';
import { makeEntropy, validateDmTurn } from '../src/protocol.js';
import { sealInitiative } from '../src/rules.js';

const pool = makeEntropy(() => .42);
const seatedFull = {
  cast: [], hero: 'Maren', party: ['Mara Vey'],
  bestiary: [{ species: 'Marsh Howler', threat: 2 }],
  combatants: [
    { id: 'marsh-howler-a', name: 'Marsh Howler A', hp: 9 },
    { id: 'marsh-howler-b', name: 'Marsh Howler B', hp: 0 }
  ]
};
const errorsOf = (payload, context) => (validateDmTurn(payload, pool, context).errors || []);
const battleErrs = (payload, context) => errorsOf(payload, context).filter((e) => /spawn|initiative|acted|fallen|npc_actions|combatant/.test(e));

// ---------------------------------------------------------------
// I. THE OPENING — initiative is required, and rides only op start.
// ---------------------------------------------------------------
const open = (patch = {}) => ({
  combat: {
    op: 'start', round_delta: 0, enemy_add: [], enemy_update: [], enemy_remove: [], npc_actions: [],
    spawn: { species: 'Marsh Howler', count: 2, names: null, zone: 'near' },
    initiative: { device: ['Maren', 'Mara Vey'], entropy: [{ group: 'Marsh Howler', index: 0 }] },
    ...patch
  },
  entropy_use: [{ index: 0, die: 'd20', purpose: 'Initiative — the pack draws its speed' }]
});

assert.deepEqual(battleErrs(open(), seatedFull), [], 'a lawful opening seals: spawn, device side, one accounted draw');
{
  const noInit = open(); delete noInit.combat.initiative; noInit.entropy_use = [];
  assert.ok(errorsOf(noInit, seatedFull).some((e) => e.includes('combat.op start requires initiative — the order is sealed as an operation')),
    'a start without initiative is refused');
}
{
  const late = { combat: { op: 'update', round_delta: 0, enemy_add: [], enemy_update: [], enemy_remove: [], npc_actions: [], initiative: { device: ['Maren'], entropy: [{ group: 'Marsh Howler', index: 0 }] } }, entropy_use: [{ index: 0, die: 'd20', purpose: 'x' }] };
  assert.ok(errorsOf(late, seatedFull).some((e) => e.includes('initiative rides only the opening operation')), 'initiative on an update is refused — sealed once');
}
{
  const lateSpawn = { combat: { op: 'update', round_delta: 0, enemy_add: [], enemy_update: [], enemy_remove: [], npc_actions: [], spawn: { species: 'Marsh Howler', count: 1, names: null, zone: 'near' } } };
  assert.ok(errorsOf(lateSpawn, seatedFull).some((e) => e.includes('spawn rides only the opening operation')), 'spawn on an update is refused — instances enter when battle opens');
}
assert.ok(errorsOf(open({ initiative: { device: ['Maren', 'Mara Vey'], entropy: [{ group: 'Marsh Howler', index: 0 }], extra: 1 } }), seatedFull)
  .some((e) => e.includes('initiative must be an object with exactly device and entropy')), 'an unknown initiative key is refused');

// ---------------------------------------------------------------
// II. THE DEVICE SIDE — named whole, nobody missing, nobody invented.
// ---------------------------------------------------------------
assert.ok(errorsOf(open({ initiative: { device: [], entropy: [{ group: 'Marsh Howler', index: 0 }] } }), seatedFull)
  .some((e) => e.includes('device must name the player side')), 'an empty device side is refused');
assert.ok(errorsOf(open({ initiative: { device: ['Maren'], entropy: [{ group: 'Marsh Howler', index: 0 }] } }), seatedFull)
  .some((e) => e.includes('missing: Mara Vey')), 'a companion left off the device list is refused by name');
assert.ok(errorsOf(open({ initiative: { device: ['Maren', 'Mara Vey', 'Gorlan the Uninvited'], entropy: [{ group: 'Marsh Howler', index: 0 }] } }), seatedFull)
  .some((e) => e.includes('names a soul outside the player side: Gorlan the Uninvited')), 'a stranger on the device list is refused by name');
assert.deepEqual(battleErrs({ story: { party_join: { name: 'Silla the Fletcher' } }, ...open({ initiative: { device: ['Maren', 'Mara Vey', 'Silla the Fletcher'], entropy: [{ group: 'Marsh Howler', index: 0 }] } }) }, seatedFull), [],
  'a soul joined this same breath may lawfully draw on the device');
assert.deepEqual(battleErrs(open({ initiative: { device: ['Anyone At All'], entropy: [{ group: 'Marsh Howler', index: 0 }] } }), { cast: [] }), [],
  'bare context: the device coverage court stays out of session');

// ---------------------------------------------------------------
// III. THE ACCOUNTED DRAWS — 1-3 groups, d20-cited, deduped, covering.
// ---------------------------------------------------------------
assert.ok(errorsOf(open({ initiative: { device: ['Maren', 'Mara Vey'], entropy: [{ group: 'A1', index: 0 }, { group: 'B2', index: 0 }, { group: 'C3', index: 0 }, { group: 'D4', index: 0 }] } }), seatedFull)
  .some((e) => e.includes('must hold 1-3 group draws — the pool holds three d20s')), 'a fourth group draw is refused');
assert.ok(errorsOf(open({ initiative: { device: ['Maren', 'Mara Vey'], entropy: [{ group: 'Marsh Howler', index: 5 }] } }), seatedFull)
  .some((e) => e.includes('must cite a d20 entropy_use entry by index')), 'a draw citing nothing is refused');
{
  const wrongDie = open();
  wrongDie.entropy_use = [{ index: 3, die: 'd6', purpose: 'not a d20' }];
  assert.ok(errorsOf(wrongDie, seatedFull).some((e) => e.includes('must cite a d20 entropy_use entry')), 'a non-d20 citation is refused');
}
{
  const doubled = open({ initiative: { device: ['Maren', 'Mara Vey'], entropy: [{ group: 'Marsh Howler', index: 0 }, { group: 'marsh HOWLER', index: 1 }] } });
  doubled.entropy_use = [{ index: 0, die: 'd20', purpose: 'first draw' }, { index: 1, die: 'd20', purpose: 'second draw' }];
  assert.ok(errorsOf(doubled, seatedFull).some((e) => e.includes('initiative draws twice for the same group')), 'a doubled group is refused, case-blind');
}
assert.ok(errorsOf(open({ initiative: { device: ['Maren', 'Mara Vey'], entropy: [{ group: 'Bog Idol', index: 0 }] } }), seatedFull)
  .some((e) => e.includes('must account a draw for the spawned species: Marsh Howler')), 'a spawn without its draw is refused');
{
  const withCrow = open({ enemy_add: [{ id: 'gore-crow-1', name: 'Gore Crow', hp: 4, maxHp: 4, ac: 10, zone: 'far' }] });
  assert.ok(errorsOf(withCrow, seatedFull).some((e) => e.includes('must account a draw for the added enemy: Gore Crow')),
    'an added enemy without its draw is refused');
  const covered = open({
    enemy_add: [{ id: 'gore-crow-1', name: 'Gore Crow', hp: 4, maxHp: 4, ac: 10, zone: 'far' }],
    initiative: { device: ['Maren', 'Mara Vey'], entropy: [{ group: 'Marsh Howler', index: 0 }, { group: 'Gore Crow', index: 1 }] }
  });
  covered.entropy_use = [{ index: 0, die: 'd20', purpose: 'pack draw' }, { index: 1, die: 'd20', purpose: 'crow draw' }];
  assert.deepEqual(battleErrs(covered, seatedFull), [], 'every group drawn once — the opening stands');
}

// ---------------------------------------------------------------
// IV. THE ONE-ACTION COURT — shape always; standing when seated.
// ---------------------------------------------------------------
const press = (actions) => ({ combat: { op: 'update', round_delta: 1, enemy_add: [], enemy_update: [], enemy_remove: [], npc_actions: actions } });
assert.deepEqual(battleErrs(press([{ actor: 'Marsh Howler A', action: 'Circles wide to the blind side' }]), seatedFull), [],
  'one living combatant, one action — lawful');
assert.deepEqual(battleErrs(press([]), seatedFull), [], 'holding is lawful — an empty round breaks no law');
assert.ok(errorsOf(press([{ actor: 'Marsh Howler A' }]), seatedFull).some((e) => e.includes('must be an object with exactly actor and action')),
  'a missing action key is refused');
assert.ok(errorsOf(press([{ actor: 'Marsh Howler A', action: 'Bites hard', taunt: 'grr' }]), seatedFull).some((e) => e.includes('exactly actor and action')),
  'an unknown key is refused');
assert.ok(errorsOf(press([{ actor: 'Marsh Howler A', action: 'Xy' }]), seatedFull).some((e) => e.includes('action must be 3-120')), 'a two-byte action is refused');
assert.ok(errorsOf(press([{ actor: 'X', action: 'Bites hard' }]), seatedFull).some((e) => e.includes('actor must be 2-80')), 'a one-byte actor is refused');
assert.ok(errorsOf(press([{ actor: 'Marsh Howler A', action: 'Feints left' }, { actor: 'marsh howler a', action: 'Bites again' }]), seatedFull)
  .some((e) => e.includes('a second action in one turn is refused by name: marsh howler a has already acted')),
  'the second action is refused BY NAME, case-blind');
assert.ok(errorsOf(press([{ actor: 'Marsh Howler B', action: 'Rises from the wet grass' }]), seatedFull)
  .some((e) => e.includes('the fallen do not act: Marsh Howler B is down')), 'the downed do not act');
assert.ok(errorsOf(press([{ actor: 'The Uninvited', action: 'Strikes from nowhere' }]), seatedFull)
  .some((e) => e.includes('moves a combatant the record does not stand: The Uninvited')), 'a stranger combatant is refused by name');
assert.deepEqual(battleErrs(press([{ actor: 'Anybody', action: 'Moves unseen' }]), { cast: [] }), [],
  'bare context: the standing court stays out of session; shape law holds alone');
{
  const sameBreath = open({ npc_actions: [{ actor: 'marsh-howler-a', action: 'Slides in to test your ground' }] });
  const ctx = { ...seatedFull, combatants: [{ id: 'old-guard', name: 'Old Guard', hp: 5 }] };
  assert.deepEqual(battleErrs(sameBreath, ctx), [], 'an instance spawned this same breath may act — the court expands the spawn itself');
}

// ---------------------------------------------------------------
// V. THE SEALED ORDER — deterministic, tie to the player, fail-closed.
// ---------------------------------------------------------------
const hero = { id: 'hero', name: 'Aveline', abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 } };
const packRows = [
  { id: 'marsh-howler-a', name: 'Marsh Howler A', species: 'Marsh Howler' },
  { id: 'marsh-howler-b', name: 'Marsh Howler B', species: 'Marsh Howler' }
];
{
  const seq = [0.99, 0.10]; let at = 0;
  const order = sealInitiative({ hero, party: ['Mara Vey'], enemies: packRows, draws: [{ group: 'Marsh Howler', value: 20 }], random: () => seq[at++ % seq.length] });
  assert.deepEqual(order.map((row) => row.id), ['hero', 'marsh-howler-a', 'marsh-howler-b', 'party-mara-vey'],
    'hero 22 leads; the pack shares its one draw; instances stand alphabetical; the plain companion trails');
  assert.ok(order[0].hero && order[0].side === 'player', 'the hero row is marked');
  assert.equal(order[1].total, 20); assert.equal(order[2].total, 20);
}
{
  const heroPlain = { id: 'hero', name: 'Aveline', abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } };
  const order = sealInitiative({ hero: heroPlain, party: [], enemies: packRows, draws: [{ group: 'Marsh Howler', value: 20 }], random: () => 0.99 });
  assert.equal(order[0].id, 'hero', 'a tied total seats the player first');
}
{
  const a = sealInitiative({ hero, party: [], enemies: packRows, draws: [], random: () => 0.5 });
  const b = sealInitiative({ hero, party: [], enemies: packRows, draws: [], random: () => 0.5 });
  assert.deepEqual(a, b, 'the seal is deterministic — same inputs, same seats');
  assert.ok(a.filter((row) => row.side === 'enemy').every((row) => row.total === 0), 'an unaccounted group fails closed to zero, never invents');
}

console.log('PASS — the round-law gate (engine twin, pure fraction): the sealed opening, the accounted draws, the device side, the one-action court, and the tie law hold.');
