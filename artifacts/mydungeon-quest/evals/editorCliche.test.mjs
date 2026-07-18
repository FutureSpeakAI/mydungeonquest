// ------------------------------------------------------------
// THE EDITOR'S EAR, PART TWO — Directive XI, Laws VI–VIII (stage-two
// gate). The cliche density court against the pinned lexicon fixture;
// the suggestion-sameness court at its 0.80 Jaccard threshold; and
// THE JUDGED WALK — a planted echo forces the full Law VII/VIII
// sequence on the mock tier: flag → judged pass → revise → ONE
// redraft → the twice-refused page SHIPS with flags and verdict
// attested, the table never stalled, the budget proven by the ledger.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  clicheCheck, jaccard, samenessCheck, editorPrePass, mockEditor, EDITOR_RUBRIC, convene
} from '../server/room.js';

// 1 — the lexicon is fixture data, pinned and loaded.
const lexicon = JSON.parse(readFileSync(new URL('../server/cliche-lexicon.json', import.meta.url), 'utf8'));
assert.ok(Array.isArray(lexicon.phrases) && lexicon.phrases.length >= 20, 'the lexicon holds its pinned phrases');
assert.ok(typeof EDITOR_RUBRIC === 'string' && EDITOR_RUBRIC.includes('Verdict ship only when all four hold'), 'the rubric is pinned byte-stable');

// 2 — the density court: more than 2 hits per 1,000 characters flags.
const pad = 'The road runs on beneath honest weather and the miles pass without borrowed language of any kind. ';
const base1000 = pad.repeat(11).slice(0, 970);
const dense = `${base1000} Her blood ran cold. His eyes widened. Time seemed to slow.`; // 3 hits, ~1029 chars → 3 > 2.06 flags
const denseCourt = clicheCheck(dense);
assert.equal(denseCourt.hits, 3);
assert.ok(denseCourt.flagged, 'three stock phrases against a thousand characters is past the ceiling');
const two = `${base1000} Her blood ran cold. His eyes widened.`; // 2 hits, ~1008 chars → 2 > 2.02 is false
assert.ok(!clicheCheck(two).flagged, 'two hits against a thousand characters sits at the ceiling and passes');
assert.ok(!clicheCheck(base1000).flagged, 'a clean page raises nothing');
assert.equal(clicheCheck('').hits, 0);
assert.equal(clicheCheck('The foreyes widened banner hung still.').hits, 0, 'the court matches whole words, never word-tails');
assert.equal(clicheCheck('EYES WIDENED — eyes, widened!').hits, 2, 'the fold law finds both');

// 3 — the sameness court at its pinned threshold.
assert.ok(jaccard('cross the old stone bridge', 'cross the old stone') >= 0.8, 'four shared tokens of five is 0.80 exactly');
assert.ok(jaccard('cross the old stone bridge', 'walk the old stone') < 0.8);
assert.ok(samenessCheck(['Cross the old stone bridge', 'Cross the old stone', 'Ask the ferryman'], []), 'two near-identical roads within one draft flag');
assert.ok(samenessCheck(['Cross the old stone bridge'], ['cross the old stone']), 'a road repeating the prior turn flags');
assert.ok(!samenessCheck(['Cross the bridge', 'Question the keeper', 'Wait for dark'], ['Follow the river home']), 'distinct roads pass');
assert.ok(!samenessCheck([], []), 'no roads, no court');

// 4 — the pre-pass seats cliche and sameness in their pinned order.
const stockDraft = {
  narration_blocks: [{ text: dense, speaker: null }],
  suggestions: ['Cross the old stone bridge', 'Cross the old stone', 'Run']
};
assert.deepEqual(editorPrePass(stockDraft, {}), ['cliche', 'sameness']);

// 5 — THE JUDGED WALK (Laws VII & VIII on the mock tier).
const inputAt = (turn) => ({
  campaign: { title: 'Trial of the Ear', homeRegion: 'Larkspur Vale' },
  hero: { name: 'Wren', skills: ['Investigation'] },
  spine: { label: 'The Trial', beats: [{ title: 'The Ordinary Flame', goal: 'Open the road', act: 1 }] },
  story: { beat: { index: 0, title: 'The Ordinary Flame' }, regions: [{ name: 'Larkspur Vale' }] },
  state: {}, memory: [], history: [],
  player: 'I press on.', resolution: null, turn, genesis: false
});

// A clean unsampled page: the Editor never sits.
const quiet = await convene(inputAt(3), {});
assert.deepEqual(quiet.room_ledger.flags, []);
assert.equal(quiet.room_ledger.editor_calls, 0, 'no flag, no sampling — the judged pass never sits');
assert.equal(quiet.room_ledger.editor_verdict, null);
assert.equal(quiet.room_ledger.revisions, 0);

// The sampling law: every 7th turn is judged even when clean.
const sampled = await convene(inputAt(7), {});
assert.deepEqual(sampled.room_ledger.flags, []);
assert.equal(sampled.room_ledger.editor_calls, 1, 'the 7th turn is judged by the sampling law');
assert.equal(sampled.room_ledger.editor_verdict, 'ship');
assert.equal(sampled.room_ledger.revisions, 0);

// The planted echo: the room's own prior page fed back as history.
const probe = await convene(inputAt(3), {});
const planted = await convene({
  ...inputAt(3),
  history: [
    { role: 'user', content: 'I press on.' },
    { role: 'assistant', content: probe.turn.narration_blocks.map((block) => block.text).join('\n\n') }
  ]
}, {});
assert.ok(planted.room_ledger.flags.includes('echo'), 'the planted echo is caught');
assert.equal(planted.room_ledger.editor_verdict, 'revise', 'the judged pass refuses the echoing draft');
assert.equal(planted.room_ledger.editor_calls, 2, 'one judged pass, one revision draft — the budget spent whole');
assert.equal(planted.room_ledger.revisions, 1, 'exactly one redraft was bought');
assert.ok(Array.isArray(planted.turn.narration_blocks) && planted.turn.narration_blocks.length, 'the twice-refused page still SHIPS — the table is never stalled');
assert.ok(planted.room_ledger.flags.length, 'the shipped page wears its flags honestly');

// The sameness cross-plant: the prior turn's roads fed back beside it.
const sameRoads = await convene({
  ...inputAt(3),
  story: { ...inputAt(3).story, prior_suggestions: probe.turn.suggestions }
}, {});
assert.ok(sameRoads.room_ledger.flags.includes('sameness'), 'roads repeating the prior turn are caught');
assert.equal(sameRoads.room_ledger.editor_verdict, 'revise');
assert.ok(sameRoads.room_ledger.editor_calls <= 2 && sameRoads.room_ledger.revisions <= 1, 'the budget law holds at its worst');

// Determinism: the judged walk is byte-stable across sittings.
const plantedAgain = await convene({
  ...inputAt(3),
  history: [
    { role: 'user', content: 'I press on.' },
    { role: 'assistant', content: probe.turn.narration_blocks.map((block) => block.text).join('\n\n') }
  ]
}, {});
assert.equal(JSON.stringify(plantedAgain.turn), JSON.stringify(planted.turn), 'the mock room judges deterministically');
assert.equal(JSON.stringify(plantedAgain.room_ledger), JSON.stringify(planted.room_ledger));

console.log('PASS — the cliche density court, the sameness court, the judged pass, and the one-revision law hold; a twice-refused page ships attested.');
