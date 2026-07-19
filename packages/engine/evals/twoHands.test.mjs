// THE TWO HANDS GATE (Directive XIII, Law II) — chance and intention as
// equals (twin of the table's gate, the pure fraction). The mock floor
// itself is deterministic, conditioned, and lock-blind: same seed and
// lock deal the same hand, a changed lock re-conditions the deal, a
// locked key never rides in a candidate, a field respin touches its
// field alone, and the calling moves as one body with its riders
// agreeing.
//
// The sovereign-pen law — the pen's ink standing byte-for-byte through
// whole spins, a neighbour's die never crossing it, the field's OWN die
// as the one consent that lifts it, the sovereign ledger read back from
// the draft the forge writes, and every fast question wearing both
// hands on the rendered door — is React/component source (and the
// draft the forge writes) and is judged at the table's own gate; the
// engine has no forge to render.
import assert from 'node:assert/strict';
import { mockSmith, WORLD_KEYS, HERO_KEYS, CALLING_RIDERS, fastFields } from '../src/smith.js';
import { CLASSES } from '../src/forgeRolls.js';

// —— The floor itself: deterministic, conditioned, and lock-blind. ——
const a = mockSmith({ scope: 'world', locked: { covenant: 'X' }, seed: 11 });
assert.deepEqual(a, mockSmith({ scope: 'world', locked: { covenant: 'X' }, seed: 11 }), 'same seed, same lock, same hand');
assert.notDeepEqual(a.candidates, mockSmith({ scope: 'world', locked: { covenant: 'Y' }, seed: 11 }).candidates, 'a changed lock re-conditions the deal');
for (const scope of ['world', 'hero']) {
  const keys = scope === 'world' ? WORLD_KEYS : HERO_KEYS;
  for (const lockKey of keys) {
    const out = mockSmith({ scope, locked: { [lockKey]: 'held' }, seed: 3 });
    for (const candidate of out.candidates) assert.ok(!(lockKey in candidate), `${scope}: a candidate never carries the locked key ${lockKey}`);
  }
}
const nameOnly = mockSmith({ scope: 'field', field: 'name', locked: { ancestry: 'Held' }, seed: 5 });
for (const candidate of nameOnly.candidates) assert.deepEqual(Object.keys(candidate), ['name'], 'a field respin touches its field alone');
const calling = mockSmith({ scope: 'field', field: 'className', locked: {}, seed: 5 });
for (const candidate of calling.candidates) {
  assert.deepEqual(Object.keys(candidate).sort(), ['className', ...CALLING_RIDERS].sort(), 'the calling moves as one body');
  const cls = CLASSES.find((c) => c.className === candidate.className);
  assert.deepEqual(candidate.skills, cls.skills, 'the riders agree with the calling');
}
const heldRider = mockSmith({ scope: 'field', field: 'className', locked: { bearing: 'my own bearing' }, seed: 5 });
for (const candidate of heldRider.candidates) assert.ok(!('bearing' in candidate), 'a sovereign rider is dropped from the body');

// —— Both hands are named for every fast question. ——
// The die's presence beside each pen is a rendered-door law (judged at
// the table's own gate); here the engine pins only the count of fast
// questions that each owe both hands.
assert.equal(fastFields('hero').length, 8, 'eight questions, eight surfaces');

console.log('PASS — the two hands gate (engine twin, pure fraction): the mock smith deterministic and lock-blind with a changed lock re-conditioning the deal, a locked key never riding a candidate, a field respin touching its field alone, and the calling moving as one body with its riders agreeing; the sovereign pen and both hands on the rendered door are judged at the table\u2019s own gate.');
