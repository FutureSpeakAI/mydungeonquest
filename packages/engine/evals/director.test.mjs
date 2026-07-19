// ------------------------------------------------------------
// THE DIRECTOR'S SEAT — Directive XI, Laws IV & V (engine twin, pure
// fraction). One seat, one word, once per beat. This gate proves,
// keylessly, the two laws the engine itself holds:
//   1. beat_intent faces a strict court — exact keys, lengths, the
//      measure enum, and threads that must name real ledger threads
//      (a court with no ledger evidence stays out of session);
//   2. the measure walks its law across a whole spine — arrivals,
//      act turns, and the final beat run rich, the connective stride
//      runs lean, most beats run standard — and the rhythm holds:
//      no two rich beats touch except across an act turn.
//
// STRIPPED (judged at the table's own gate): the room-convene fraction
// — a fresh beat seating the Director once, the intent cache (hit vs.
// stale vs. unlawful re-sit), determinism across sittings, and the
// Voice writing INTO the Director's measure band — all ride
// server/room.js's convene, which lives only at the table (it seats
// providers and reads dm.js/artDirector/systemPrompt); the engine has
// no convene. beatIndexOf's contribution to that fraction is exercised
// here directly on a briefing.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import {
  validateBeatIntent, measureForBeat, mockDirector, beatIndexOf, MEASURE_BANDS
} from '../src/room.js';

const spine = {
  label: 'The Salt Road',
  beats: [
    { title: 'Arrival at Brinehollow', goal: 'Seat the hero at the strange table', act: 1 },
    { title: 'The Empty Net', goal: 'Show the debt working', act: 1 },
    { title: 'A Quiet Mile', goal: 'Let the road breathe', act: 1 },
    { title: 'The Toll Turns', goal: 'Break the first certainty', act: 2 },
    { title: 'Names in the Ledger', goal: 'Put a face on the debt', act: 2 },
    { title: 'A Second Quiet Mile', goal: 'Let dread settle', act: 2 },
    { title: 'The Salt Court', goal: 'Turn the last act', act: 3 },
    { title: 'What the Tide Returns', goal: 'Pay every debt out', act: 3 }
  ]
};

const storyAt = (beatIndex, intent = null, { indexless = false } = {}) => ({
  beat: indexless ? { ...spine.beats[beatIndex] } : { index: beatIndex, ...spine.beats[beatIndex] },
  open_threads: [{ name: 'The Salt Debt' }, { name: 'A Lantern Unlit' }],
  ...(intent ? { beat_intent: intent } : {})
});

const inputAt = (beatIndex, { intent = null, indexless = false } = {}) => ({
  campaign: { title: 'Trial of the Room', homeRegion: 'Brinehollow' },
  hero: { name: 'Wren' },
  spine,
  story: storyAt(beatIndex, intent, { indexless }),
  state: {}, memory: [], history: [],
  player: 'I press on.', resolution: null, turn: 2, genesis: false
});

// 1 — the intent court.
const lawful = mockDirector(inputAt(1), 1);
assert.ok(validateBeatIntent(lawful, { threads: ['The Salt Debt', 'A Lantern Unlit'] }).ok, 'the mock Director must speak lawfully');
assert.ok(!validateBeatIntent({ ...lawful, measure: 'epic' }).ok, 'an unknown measure is refused');
assert.ok(!validateBeatIntent({ ...lawful, intent: 'Too short.' }).ok, 'a stunted intent is refused');
assert.ok(!validateBeatIntent({ ...lawful, mood: 'grim' }).ok, 'an unlawful key is refused');
assert.ok(!validateBeatIntent({ ...lawful, beat_index: undefined }).ok, 'an unseated intent is refused');
const foreign = { ...lawful, threads_to_touch: ['A Thread Nobody Holds'] };
assert.ok(!validateBeatIntent(foreign, { threads: ['The Salt Debt'] }).ok, 'a thread outside the ledger is refused when the ledger is in evidence');
assert.ok(validateBeatIntent(foreign, { threads: null }).ok, 'with no ledger in evidence the thread court stays out of session');

// 2 — the measure walks its law; the rhythm holds.
const walked = spine.beats.map((_, i) => measureForBeat(spine.beats, i));
assert.deepEqual(
  walked,
  ['rich', 'standard', 'lean', 'rich', 'standard', 'lean', 'rich', 'standard'],
  'the measure must walk exactly its law across the spine'
);
for (let i = 1; i < walked.length; i += 1) {
  const actTurn = (spine.beats[i].act || 1) !== (spine.beats[i - 1].act || 1);
  assert.ok(!(walked[i] === 'rich' && walked[i - 1] === 'rich' && !actTurn), 'two rich beats may touch only across an act turn');
}

// 3 — the standing beat index the convene reads from the briefing.
assert.equal(beatIndexOf(inputAt(0)), 0, 'a seated briefing names its standing index');
assert.equal(beatIndexOf(inputAt(3)), 3, 'the index is read straight from the briefing beat');
assert.equal(beatIndexOf(inputAt(0, { indexless: true })), null, 'a briefing without a beat index yields no standing index');

// 4 — the arrival beat runs rich, and the mock Director seats it into its band.
const arrival = mockDirector(inputAt(0), 0);
assert.equal(arrival.measure, 'rich', 'the arrival beat runs rich');
assert.ok(validateBeatIntent(arrival, { threads: ['The Salt Debt', 'A Lantern Unlit'] }).ok);
assert.equal(arrival.beat_index, 0, 'the mock Director seats its word at the standing beat');
assert.deepEqual(MEASURE_BANDS.rich, [6, 8], 'the rich band the Voice writes into is pinned');
assert.deepEqual(MEASURE_BANDS.lean, [1, 2], 'the lean band is pinned');
assert.deepEqual(MEASURE_BANDS.standard, [3, 5], 'the standard band is pinned');

console.log('PASS — the Director gate (engine twin, pure fraction): the intent court is strict, the measure walks its law across the spine and the rhythm holds, and the standing index reads honestly from the briefing; the room-convene (fresh seat, cache, determinism, the Voice writing into the band) is judged at the table\u2019s own gate.');
