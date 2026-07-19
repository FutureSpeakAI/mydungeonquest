// ------------------------------------------------------------
// THE CURTAIN — Directive XI, Law I (engine twin, pure fraction).
//
// The door's whole vocabulary is the sealed turn; the pour that
// replaced the pre-seal theater is pure presentation over finished
// bytes. This gate proves the engine's half of that law: the pour
// plan is deterministic and strictly growing — every view a strict
// prefix of the next — ending byte-exact at the sealed page, its
// cadence clamped humanely; and a multi-paragraph pour crosses block
// boundaries without ever rewriting a paragraph or its speaker.
//
// STRIPPED (judged at the table's own gate):
//   - the door's byte audit (server/index.js speaks one 'event: turn',
//     no 'event: narration'/'event: retract') — the table's own source.
//   - the retired stream plumbing audit of server/dm.js
//     (anthropicTurnStream, extractNarration, mockWithNarration,
//     onNarration, onRetract) — the table's own source.
//   - the client audit of src/App.jsx (no pre-seal narration event,
//     no retract, no reconsidering line, no setWeaving) — React/DOM law.
//   - the mock room's whole/sealed/deterministic answer via
//     server/dm.js getDmTurn — the provider seat lives at the table.
// The pour law reaches the engine through the game's compat seat
// src/lib/pour.js (export * from 'fatescript/pour'); this gate imports
// the true engine seat directly.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { pourPlan, pourInterval } from '../src/pour.js';

// The pour over a sealed page: pure, deterministic, strictly growing,
// ending at the seal. (At the table this page arrives from the mock
// room; here we pour a fixed sealed narration to judge the law itself.)
const blocks = [
  { text: 'Black water folds around your boots as the ford takes the last of the light.', speaker: null },
  { text: 'The well remembers who poisoned it.', speaker: 'Mira' }
];
const planA = pourPlan(blocks);
const planB = pourPlan(blocks);
assert.deepEqual(planA, planB, 'the pour plan is deterministic');
const joined = (view) => view.map((row) => row.text).join('\n\n');
for (let i = 1; i < planA.length; i += 1) {
  assert.ok(
    joined(planA[i]).startsWith(joined(planA[i - 1])) && joined(planA[i]).length > joined(planA[i - 1]).length,
    'the pour only ever grows — every view a strict prefix of the next'
  );
}
assert.equal(joined(planA[planA.length - 1]), joined(blocks), 'the pour ends byte-exact at the sealed page');
const tick = pourInterval(planA.length);
assert.ok(tick >= 24 && tick <= 80, 'the cadence stays within its humane clamp');

// A multi-paragraph pour crosses block boundaries without rewriting one.
const fixture = [
  { text: 'The road climbs past the salt stones and turns north.', speaker: null },
  { text: 'A lantern answers from the far bank.', speaker: 'Mara' },
  { text: 'Go.', speaker: null }
];
const crossing = pourPlan(fixture);
for (let i = 1; i < crossing.length; i += 1) {
  const prev = crossing[i - 1];
  for (let b = 0; b < prev.length - 1; b += 1) {
    assert.equal(prev[b].text, fixture[b].text, 'once a paragraph lands whole it is never touched again');
    assert.equal(prev[b].speaker, fixture[b].speaker, 'speakers ride their paragraph from its first word');
  }
}
assert.deepEqual(crossing[crossing.length - 1], fixture, 'the final view IS the sealed narration');

console.log('PASS — the curtain gate (engine twin, pure fraction): the pour is deterministic, strictly growing, ends byte-exact at the sealed page within a humane cadence, and crosses block boundaries without rewriting a paragraph or its speaker; the door\u2019s byte audit and the mock room are judged at the table\u2019s own gate.');
