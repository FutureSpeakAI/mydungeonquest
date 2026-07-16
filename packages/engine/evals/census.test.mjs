// THE CENSUS GATE — the court against op decay holds or this file turns the build red.
import assert from 'node:assert/strict';
import { unrecordedSouls, censusNote, assertCensus } from '../src/census.js';
import { HERO, fixtureCodex } from './fixtures.mjs';

const cast = fixtureCodex().cast;
const dm = (blocks, story = null) => ({
  narration_blocks: blocks, suggestions: [], roll_request: null, state_updates: null,
  combat: null, cinematic: null, story, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: []
});

// The counted may speak: cast, hero, and the narrator's empty chair.
assert.deepEqual(unrecordedSouls(dm([{ speaker: 'Mira', text: 'The well remembers.' }]), cast, { hero: HERO }), []);
assert.deepEqual(unrecordedSouls(dm([{ speaker: 'Aldric', text: 'I remember too.' }]), cast, { hero: HERO }), []);
assert.deepEqual(unrecordedSouls(dm([{ text: 'Rain on the ford.' }, { speaker: 'Narrator', text: 'Night fell.' }]), cast, { hero: HERO }), []);
assert.deepEqual(unrecordedSouls(dm([{ speaker: 'MIRA', text: 'Case is not identity.' }]), cast, { hero: HERO }), [], 'the census reads names, not capitals');

// The uncounted may not: a prose-born stranger is caught by name.
const strangers = unrecordedSouls(dm([
  { speaker: 'Wren', text: 'You should not be here.' },
  { speaker: 'Moth', text: 'Nor you.' },
  { speaker: 'wren', text: 'Then we agree.' }
]), cast, { hero: HERO });
assert.deepEqual(strangers, ['Wren', 'Moth'], 'order preserved, duplicates collapsed');
const verdict = assertCensus(dm([{ speaker: 'Wren', text: 'Still here.' }]), cast, { hero: HERO });
assert.equal(verdict.ok, false);
assert.ok(verdict.note.includes('Wren') && verdict.note.includes('voice_card') && verdict.note.includes('ops declare'));
assert.ok(censusNote(['Wren', 'Moth']).includes('Wren, Moth'));

// A soul added THIS turn may speak this turn — the census counts the
// turn's own ops before it counts anyone missing.
const arriving = dm(
  [{ speaker: 'Wren', text: 'I am Wren of the reeds.' }],
  { cast_add: [{ name: 'Wren', role: 'fisher', visual: 'A reed-thin fisher', voice: 'A reedy voice', voice_card: { gender: 'feminine', age: 'young', timbre: 'reedy' } }] }
);
assert.deepEqual(unrecordedSouls(arriving, cast, { hero: HERO }), [], 'arrival and first words share a turn lawfully');

// The dead are COUNTED — whether Edda may speak is the snapshot
// court's business, not the census's. One court, one job.
assert.deepEqual(unrecordedSouls(dm([{ speaker: 'Edda', text: '...' }]), cast, { hero: HERO }), []);

// An empty turn counts nobody and accuses nobody.
assert.deepEqual(unrecordedSouls(dm([]), cast, { hero: HERO }), []);
assert.ok(assertCensus(dm([]), [], {}).ok);
assert.equal(JSON.stringify(unrecordedSouls(dm([{ speaker: 'Wren', text: 'x' }]), cast, { hero: HERO })),
             JSON.stringify(unrecordedSouls(dm([{ speaker: 'Wren', text: 'x' }]), cast, { hero: HERO })), 'the same turn counts the same souls');

console.log('PASS \u2014 the census gate: cast, hero, and narrator speak freely, a prose-born stranger is caught by name with a repair note that demands the op, arrival and first words lawfully share a turn, the dead are counted (their speech is another court\u2019s business), and the count is deterministic.');
