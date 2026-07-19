// ------------------------------------------------------------
// THE EDITOR'S EAR, PART TWO — Directive XI, Laws VI–VIII (engine
// twin, pure fraction). The cliche density court against a pinned
// lexicon fixture; the suggestion-sameness court at its 0.80 Jaccard
// threshold; the pre-pass composing cliche and sameness in pinned
// order; and the rubric, pinned byte-stable.
//
// THE LEXICON: the engine carries no list of its own — the cliche
// lexicon is instrument matter (fixture data), handed in at the door.
// At the table it is loaded from server/cliche-lexicon.json and bound
// as the default; the engine's clicheCheck/editorPrePass take it as an
// argument. This gate inlines the phrases its cases exercise as a
// local fixture, folded through the engine's own fold, and hands them
// to the courts explicitly — the same way the table hands its file.
// The lexicon FILE itself (its byte contents and its ≥20-phrase floor)
// is judged at the table's own gate.
//
// STRIPPED (judged at the table's own gate): THE JUDGED WALK — the
// planted-echo Law VII/VIII sequence (flag → judged pass → revise →
// one redraft → the twice-refused page ships attested) and the
// sameness cross-plant both ride server/room.js's convene, which lives
// only at the table; the engine has no convene. Its ingredients —
// clicheCheck, jaccard, samenessCheck, editorPrePass, mockEditor,
// EDITOR_RUBRIC — are each judged here directly.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import {
  clicheCheck as lawClicheCheck, jaccard, samenessCheck,
  editorPrePass as lawEditorPrePass, mockEditor, EDITOR_RUBRIC, foldProse
} from '../src/room.js';

// 1 — the lexicon fixture, folded and bound (the table's own file is
// judged at the table's gate; here we pin the phrases the cases need).
const LEXICON = Object.freeze(
  ['time seemed to slow', 'eyes widened', 'blood ran cold'].map((phrase) => foldProse(phrase)).filter(Boolean)
);
const clicheCheck = (text) => lawClicheCheck(text, LEXICON);
const editorPrePass = (turn, opts = {}) => lawEditorPrePass(turn, { lexicon: LEXICON, ...opts });
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
assert.equal(mockEditor(['cliche', 'sameness']).verdict, 'revise', 'flags earn a revise verdict');
assert.equal(mockEditor([]).verdict, 'ship', 'a clean draft ships');

console.log('PASS — the editorCliche gate (engine twin, pure fraction): the cliche density court, the sameness court at 0.80, the pre-pass order (cliche, sameness), and the pinned rubric hold; the lexicon file and the judged walk (convene) are judged at the table\u2019s own gate.');
