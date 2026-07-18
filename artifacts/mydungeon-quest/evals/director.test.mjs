// ------------------------------------------------------------
// THE DIRECTOR'S SEAT — Directive XI, Laws IV & V (stage-one gate).
//
// One seat, one word, once per beat. This gate proves, keylessly:
//   1. beat_intent faces a strict court — exact keys, lengths, the
//      measure enum, and threads that must name real ledger threads
//      (a court with no ledger evidence stays out of session);
//   2. the measure walks its law across a whole spine — arrivals,
//      act turns, and the final beat run rich, the connective stride
//      runs lean, most beats run standard — and the rhythm holds:
//      no two rich beats touch except across an act turn;
//   3. the room convenes deterministically on the mock tier: a fresh
//      beat seats the Director exactly once (ledger says so), a
//      carried intent seats no one (a cache hit costs nothing), a
//      stale or unlawful carried intent is refused and re-sat;
//   4. the Voice writes INTO the Director's band — the sealed page's
//      narration_blocks land inside the measure's walls.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import {
  validateBeatIntent, measureForBeat, mockDirector, convene, beatIndexOf, MEASURE_BANDS
} from '../server/room.js';

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

// 3 — the room convenes: fresh seat, cache hit, stale refusal, determinism.
const first = await convene(inputAt(0), {});
assert.equal(first.provider, 'mock');
assert.equal(first.room_ledger.director_calls, 1, 'a fresh beat seats the Director exactly once');
assert.equal(first.room_ledger.beat_index, 0);
assert.equal(first.beat_intent.measure, 'rich', 'the arrival beat runs rich');
assert.ok(validateBeatIntent(first.beat_intent, { threads: ['The Salt Debt', 'A Lantern Unlit'] }).ok);
assert.deepEqual(
  ['beat_index', 'director_calls', 'editor_calls', 'art_director_calls', 'revisions', 'flags', 'editor_verdict'].sort(),
  Object.keys(first.room_ledger).sort(),
  'the room ledger carries exactly its lawful counters'
);

const again = await convene(inputAt(0), {});
assert.equal(JSON.stringify(again.turn), JSON.stringify(first.turn), 'the mock room is byte-deterministic across sittings');
assert.equal(JSON.stringify(again.beat_intent), JSON.stringify(first.beat_intent));

const carried = await convene(inputAt(0, { intent: first.beat_intent }), {});
assert.equal(carried.room_ledger.director_calls, 0, 'a carried intent seats no Director — the cache costs nothing');
assert.deepEqual(carried.beat_intent, first.beat_intent, 'the carried word rides unaltered');
assert.equal(JSON.stringify(carried.turn), JSON.stringify(first.turn), 'a cache hit tells the same page');

const stale = await convene(inputAt(3, { intent: first.beat_intent }), {});
assert.equal(stale.room_ledger.director_calls, 1, 'a stale intent (wrong beat) forces a fresh sitting');
assert.equal(stale.beat_intent.beat_index, 3);
assert.equal(stale.beat_intent.measure, 'rich', 'the act turn runs rich');

const unlawfulCarried = await convene(inputAt(0, { intent: { ...first.beat_intent, mood: 'grim' } }), {});
assert.equal(unlawfulCarried.room_ledger.director_calls, 1, 'an unlawful carried intent is refused and re-sat');

const blind = await convene(inputAt(0, { indexless: true }), {});
assert.equal(beatIndexOf(inputAt(0, { indexless: true })), null, 'a briefing without a beat index yields no standing index');
assert.equal(blind.room_ledger.director_calls, 1, 'without a standing index the Director sits fresh, honestly counted');

// 4 — the Voice writes into the band.
const bandOf = (measure) => MEASURE_BANDS[measure];
for (const [beatIndex, expected] of [[0, 'rich'], [2, 'lean'], [1, 'standard']]) {
  const sat = await convene(inputAt(beatIndex), {});
  assert.equal(sat.beat_intent.measure, expected);
  const [floor, ceiling] = bandOf(expected);
  const blocks = sat.turn.narration_blocks.length;
  assert.ok(blocks >= floor && blocks <= ceiling, `a ${expected} page must land ${floor}-${ceiling} blocks, not ${blocks}`);
}

console.log('PASS — the Director sits once per beat, the measure walks its law, and the mock room is deterministic.');
