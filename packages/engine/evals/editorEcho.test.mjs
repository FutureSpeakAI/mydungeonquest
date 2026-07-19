// ------------------------------------------------------------
// THE EDITOR'S EAR, PART ONE — Directive XI, Law VI (engine twin,
// pure fraction).
//
// The echo court: fold case and punctuation; ONE 8-word run shared
// verbatim with any of the last 20 sealed pages flags — the 21st page
// back is beyond the window and proves nothing. The docket keeps
// exactly the last twenty sealed pages however fat the history rides.
// The measure court reads the band in the same corpus: out of band is
// `measure`, thin against rich is named `under-measure`. The pre-pass
// composes flags in their pinned order and the deterministic Editor
// answers a verdict.
//
// STRIPPED (judged at the table's own gate):
//   - the client-furnishing audit of src/App.jsx (the app must slice
//     twenty rows to the room) — the table's own React source.
//   - THE HOUSE WALK: twenty-one pages driven through server/room.js's
//     convene must ship clean — convene lives only at the table (it
//     seats providers, dm.js, artDirector); the engine has no convene.
//     Its ingredients — echoCheck, measureCheck, editorPrePass,
//     mockEditor, editorEvidence — are each judged here directly.
// The pre-pass here uses the engine's default (empty) lexicon; the
// table binds its pinned cliche fixture at the door and judges that
// binding at its own gate. These cases exercise only echo/measure, so
// the verdict is identical under either lexicon.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import {
  echoCheck, measureCheck, editorPrePass, mockEditor, editorEvidence
} from '../src/room.js';

// 1 — the echo court hears one shared run.
const pageA = 'The lantern swings over the harbor wall and the tide counts its slow return beneath the pier.';
const shared8 = 'At dusk the tide counts its slow return beneath the stones of the old quay.';
assert.ok(echoCheck(shared8, [pageA]), 'an 8-word run shared verbatim must flag');
assert.ok(echoCheck(shared8.toUpperCase().replace(/ /g, '  '), [pageA]), 'the fold law: case and spacing cannot hide an echo');
assert.ok(echoCheck('At dusk — the tide, counts its slow return... beneath the stones!', [pageA]), 'punctuation cannot hide an echo');
const shared7 = 'A gull turns. The tide counts its slow return beneath cold water tonight.';
assert.ok(!echoCheck(shared7, [pageA]), 'seven shared words are not an echo — the threshold is pinned at eight');
assert.ok(!echoCheck(shared8, []), 'no priors, no echo — the court needs evidence');
assert.ok(!echoCheck('Short words only here.', [pageA]), 'a draft under eight words cannot echo');

// 2 — the window is twenty pages, pinned.
const filler = Array.from({ length: 20 }, (_, i) =>
  `Filler page number ${i} speaks of nothing borrowed, a ${i}-stone marker standing alone in field ${i}.`);
assert.ok(!echoCheck(shared8, [pageA, ...filler]), 'the 21st page back is beyond the window and proves nothing');
assert.ok(echoCheck(shared8, [...filler.slice(0, 19), pageA]), 'the 20th page back still convicts');

// 2b — the docket window: the room keeps exactly the last TWENTY sealed
// pages, however fat the history rides.
const fatHistory = [];
for (let i = 0; i < 26; i += 1) {
  fatHistory.push({ role: 'user', content: `step ${i}` });
  fatHistory.push({ role: 'assistant', content: `Sealed page number ${i} rests in the ledger with its own words.` });
}
const docket = editorEvidence({ history: fatHistory, story: {} });
assert.equal(docket.priorPages.length, 20, 'the docket holds exactly the last twenty sealed pages');
assert.ok(docket.priorPages[0].includes('number 6'), 'the window slid: the oldest seat is page six of twenty-six');

// 3 — the measure court reads the band.
assert.equal(measureCheck(1, 'lean'), null);
assert.equal(measureCheck(2, 'lean'), null);
assert.equal(measureCheck(3, 'lean'), 'measure', 'a fat lean page lands outside its band');
assert.equal(measureCheck(3, 'standard'), null);
assert.equal(measureCheck(6, 'standard'), 'measure');
assert.equal(measureCheck(6, 'rich'), null);
assert.equal(measureCheck(8, 'rich'), null);
assert.equal(measureCheck(4, 'rich'), 'under-measure', 'thin prose on a rich beat is named under-measure');
assert.equal(measureCheck(9, 'rich'), 'measure', 'an overstuffed rich page is plain measure');
assert.equal(measureCheck(3, 'epic'), null, 'an unknown measure leaves the court out of session');

// 4 — the pre-pass composes; the deterministic Editor answers flags.
const thinDraft = {
  narration_blocks: [{ text: shared8, speaker: null }, { text: 'A second paragraph stands alone.', speaker: null }],
  suggestions: ['Walk the quay', 'Ask the keeper', 'Wait for the tide']
};
const flags = editorPrePass(thinDraft, { intent: { measure: 'rich' }, priorPages: [pageA] });
assert.deepEqual(flags, ['echo', 'under-measure'], 'flag order is pinned: echo, cliche, sameness, measure');
assert.equal(mockEditor(flags).verdict, 'revise');
assert.equal(mockEditor(flags).reasons.length, 2, 'each flag names its own reason');
assert.equal(mockEditor([]).verdict, 'ship');

console.log('PASS — the editorEcho gate (engine twin, pure fraction): the echo court hears one shared run, the docket holds exactly twenty, the measure court reads the band, and the pre-pass composes flags in pinned order for the deterministic Editor; the client furnishing and the twenty-one-page house walk (convene) are judged at the table\u2019s own gate.');
