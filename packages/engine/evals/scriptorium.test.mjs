// THE SCRIPTORIUM GATE — the Scriptorium Law holds or this file turns the build red.
// Agents' Room, taken in under house law: decomposition without authority.
import assert from 'node:assert/strict';
import { SCRIBES, scribeBrief, starvedSoul, mockRoom, assertRoomSilent } from '../src/scriptorium.js';
import { fixtureCodex } from './fixtures.mjs';

const codex = fixtureCodex();
assert.deepEqual(SCRIBES, ['plot', 'character', 'setting', 'conflict'], 'four scribes sit in this room');

// Each brief is scoped to its one domain, carries the room law, and is
// the same brief every time it is drawn.
const ctx = { codex, cards: {}, clock: { day: 1, hour: 8 } };
const briefs = Object.fromEntries(SCRIBES.map((scribe) => [scribe, scribeBrief(scribe, ctx)]));
assert.ok(briefs.plot.includes('THE PLOT SCRIBE'));
assert.ok(briefs.plot.includes('beat 0'));
assert.ok(briefs.plot.includes('must NOT resolve yet'), 'the plot scribe is charged with keeping loose ends');
assert.ok(briefs.character.includes('THE CHARACTER SCRIBE'));
assert.ok(briefs.character.includes('Mira'), 'the least-fed active soul is named');
assert.ok(briefs.setting.includes('Harrow Ford'));
assert.ok(briefs.setting.includes('poisoned'));
assert.ok(briefs.setting.includes('day 1'));
assert.ok(briefs.conflict.includes('Brannoc'));
assert.ok(briefs.conflict.includes('VARIANCE'), 'escalation must spike and lull, not glide');
for (const scribe of SCRIBES) {
  assert.ok(briefs[scribe].includes('You plan; you do not narrate'), 'the room law rides every brief');
  assert.equal(briefs[scribe], scribeBrief(scribe, ctx), 'the same room draws the same brief');
}
assert.throws(() => scribeBrief('editor', ctx), /no such scribe/);

// Who is owed attention is a fold, not an opinion — and the cards can
// prove a soul better fed than its introduction suggests.
assert.equal(starvedSoul(codex, {}).name, 'Mira');
assert.equal(starvedSoul(codex, { mira: { state: { lastActive: 10 } }, tam: { state: { lastActive: 2 } } }).name, 'Tam');

// The keyless room convenes for free and always says the same thing.
const plan = mockRoom(ctx);
assert.deepEqual(Object.keys(plan.scratchpad), ['plot', 'character', 'setting', 'conflict']);
assert.equal(plan.directives.length, 4);
assert.ok(plan.directives.every((line) => typeof line === 'string' && line.length <= 180));
assert.ok(plan.scratchpad.character.includes('Mira'));
assert.ok(plan.scratchpad.conflict.includes('Brannoc'));
assert.equal(JSON.stringify(mockRoom(ctx)), JSON.stringify(plan), 'the same record convenes the same room');

// THE ROOM PLANS; THE DOOR SPEAKS. Output carrying prose machinery is contraband.
assert.ok(assertRoomSilent(plan).ok);
const smuggler = assertRoomSilent({ ...plan, narration_blocks: [{ text: 'And so the tale...' }] });
assert.equal(smuggler.ok, false);
assert.ok(smuggler.errors[0].includes('the door speaks alone'));
const longWinded = assertRoomSilent({ scratchpad: {}, directives: ['x'.repeat(220)] });
assert.ok(longWinded.errors[0].includes('smuggled prose'));

console.log('PASS \u2014 the scriptorium gate: four scribes, each briefed to one domain and bound by the room law, a keyless room that convenes deterministically, and One Door held \u2014 the room plans, and only the door speaks.');
