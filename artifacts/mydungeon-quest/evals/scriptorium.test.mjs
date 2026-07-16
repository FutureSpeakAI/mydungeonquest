// ------------------------------------------------------------
// THE SCRIPTORIUM GATE (game) — the room plans, the door speaks
// (Directive VI, Scriptorium Law groundwork).
//
// The keyless mock room convenes over the record: four scribes,
// one domain each, planning in scratchpad and directives — never
// prose. The court refuses any plan that tries to speak, whole.
// A sealed tale convenes nothing. Only a silent plan's directives
// ride the pack, additively. Zero keys, deterministic.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { SCRIBES } = await import('fatescript/scriptorium');
const { roomForTurn, courtRoom } = await import('../src/lib/scriptorium.js');

const CAMPAIGN = {
  id: 'c1', completed: false, logs: [],
  codex: {
    beatIndex: 1,
    spine: { label: 'The Long Road', revealIdx: 5, beats: [{ title: 'The village', act: 1 }, { title: 'The road', act: 1 }, { title: 'The keep', act: 2 }], deadlines: [] },
    arc: { title: 'The Hollow Crown', evil_plot: 'unspoken' },
    cast: [
      { name: 'Mira', role: 'ally', status: 'active', goal: 'find her brother', bond: 2, introduced_turn: 0 },
      { name: 'Tam', role: 'friend', status: 'active', goal: 'keep the inn', bond: 1, introduced_turn: 3 },
      { name: 'Brannoc', role: 'villain', status: 'active', goal: 'drown the valley', bond: 0, introduced_turn: 1 }
    ],
    regions: [{ name: 'Harrow Ford', state: 'poisoned' }],
    notes: [], memoir: ''
  }
};

// 1. THE ROOM CONVENES — four scribes, one domain each; the starved
//    soul, the pressed ground, and the opposition are named; the plan
//    is the same every time it is asked for.
{
  const plan = roomForTurn(CAMPAIGN);
  assert.ok(plan, 'the keyless room convenes for free');
  assert.deepEqual(Object.keys(plan.scratchpad), SCRIBES, 'four scribes, in their seats');
  assert.equal(plan.directives.length, 4, 'one directive per scribe');
  assert.ok(plan.directives.every((line) => typeof line === 'string' && line.length <= 200), 'plans, never prose');
  assert.ok(plan.scratchpad.character.includes('Mira'), 'the least-fed soul is owed attention');
  assert.ok(plan.scratchpad.conflict.includes('Brannoc'), 'the opposition advances by name');
  assert.ok(plan.scratchpad.setting.includes('Harrow Ford') && plan.scratchpad.setting.includes('poisoned'), 'the pressed ground presses');
  assert.equal(JSON.stringify(roomForTurn(CAMPAIGN)), JSON.stringify(plan), 'the same record, the same plan');
}

// 2. THE COURT — a plan that tries to speak is refused whole: prose
//    machinery by key, smuggled paragraphs by length, and nothing
//    that is not a plain string.
{
  const speaking = courtRoom({ directives: [], narration_blocks: [] });
  assert.equal(speaking.ok, false, 'the room tried to speak');
  assert.ok(speaking.errors.some((line) => line.includes('the door speaks alone')));
  const nested = courtRoom({ directives: ['x'], ops: { dialogue_cue: 'psst' } });
  assert.equal(nested.ok, false, 'prose machinery is found at any depth');
  const smuggled = courtRoom({ directives: ['y'.repeat(201)] });
  assert.equal(smuggled.ok, false);
  assert.ok(smuggled.errors.some((line) => line.includes('smuggled prose')));
  assert.equal(courtRoom({ directives: [4] }).ok, false, 'a directive is a plain string or nothing');
  assert.equal(courtRoom({ directives: ['advance the beat'], scratchpad: { plot: 'keep a thread open' } }).ok, true, 'a silent plan passes the door');
}

// 3. A SEALED TALE CONVENES NOTHING — and a campaign without a codex
//    convenes nothing either.
{
  assert.equal(roomForTurn({ ...CAMPAIGN, completed: true }), null, 'the told tale needs no plan');
  assert.equal(roomForTurn({ id: 'x' }), null);
}

// 4. THE REDACTION LAW AT THE SEAM — a struck row marks no soul
//    active: the room plans from the unstruck record only. The same
//    row unstruck moves the plan, so the fixture has teeth.
{
  const castAdd = { dm: { story: { cast_add: [{ name: 'Mira', role: 'ally', goal: 'find her brother', visual: 'grey-cloaked' }] }, narration_blocks: [] }, redacted: false };
  const speaks = { turn: 9, dm: { narration_blocks: [{ speaker: 'Mira', text: 'I am here.' }] }, redacted: true };
  const base = { ...CAMPAIGN, logs: [castAdd] };
  const struck = { ...CAMPAIGN, logs: [castAdd, speaks] };
  const unstruck = { ...CAMPAIGN, logs: [castAdd, { ...speaks, redacted: false }] };
  assert.equal(JSON.stringify(roomForTurn(struck)), JSON.stringify(roomForTurn(base)), 'a struck row steers nothing');
  assert.ok(roomForTurn(struck).scratchpad.character.includes('Mira'), 'the starved soul stands unmoved by struck speech');
  assert.ok(roomForTurn(unstruck).scratchpad.character.includes('Tam'), 'the same row unstruck moves the plan — the fixture has teeth');
}

// 5. THE WIRING — the room convenes at the pack seam and rides the
//    directives additively; the codex shows the patron the plan; the
//    engine's room is the only room.
{
  const app = read('src/App.jsx');
  assert.ok(app.includes('roomForTurn(base)'), 'the room convenes over the record at the table');
  assert.ok(app.includes('...room.directives'), 'only directives ride the pack, additively');
  const overlays = read('src/components/Overlays.jsx');
  assert.ok(overlays.includes('The scriptorium — the room plans, the door speaks'), 'the room is visible to the patron');
  const lib = read('src/lib/scriptorium.js');
  assert.ok(lib.includes('fatescript/scriptorium') && lib.includes('mockRoom') && lib.includes('assertRoomSilent'), 'the engine\u2019s room, the engine\u2019s court');
}

console.log('PASS \u2014 the scriptorium gate (game): the keyless mock room convenes over the record with four scribes planning one domain each in scratchpad and directives never prose, the court refuses a speaking plan whole \u2014 prose machinery by key at any depth, smuggled paragraphs by length, non-strings outright \u2014 a sealed tale convenes nothing, a struck row marks no soul active and steers no directive at this seam, and only a silent plan\u2019s directives ride the pack additively while the codex shows the patron the room\u2019s standing plan.');
