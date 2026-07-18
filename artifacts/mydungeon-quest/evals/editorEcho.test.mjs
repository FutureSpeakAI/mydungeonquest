// ------------------------------------------------------------
// THE EDITOR'S EAR, PART ONE — Directive XI, Law VI (stage-two gate).
//
// The echo court: fold case and punctuation; ONE 8-word run shared
// verbatim with any of the last 20 sealed pages flags — the 21st page
// back is beyond the window and proves nothing. The measure court
// reads the band in the same corpus: out of band is `measure`, thin
// against rich is named `under-measure`.
//
// THE WALK IS CLEAN: the salted mock walk must pass the very courts
// it lives under — twenty-one pages driven exactly as the client
// drives them, rolling history and roads forward, every shipped page
// unflagged. The house may not revise its own house walk.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeEntropy } from 'fatescript/protocol';
import {
  echoCheck, measureCheck, editorPrePass, mockEditor, convene, editorEvidence
} from '../server/room.js';

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

// 2c — THE CLIENT FURNISHES WHAT THE COURT IS OWED (0.9.0 review round).
// The architect caught the app briefing fifteen rows against a twenty-page
// window — pages sixteen-to-twenty back could never convict. The
// furnishing law is pinned in source beside its Law VI comment, the same
// way the curtain pinned its retired plumbing.
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
assert.ok(
  /entry\.kind !== 'annal'\)\.slice\(-20\)/.test(appSource),
  'the client furnishes twenty rows to the room — the echo court\'s full window (Law VI)'
);

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

// 5 — THE WALK IS CLEAN: twenty-one pages of the house walk, driven
// as the client drives them, ship without a single flag.
const spine = { label: 'The Clean Walk', beats: [{ title: 'The Ordinary Flame', goal: 'Open the road', act: 1 }] };
let history = [];
let priorSuggestions = [];
let carriedIntent = null;
let prevAskedRoll = false;
for (let turn = 0; turn <= 20; turn += 1) {
  const input = {
    campaign: { title: 'Clean Walk', homeRegion: 'Larkspur Vale' },
    hero: { name: 'Wren', skills: ['Investigation'] },
    spine,
    story: {
      beat: { index: 0, title: 'The Ordinary Flame' },
      regions: [{ name: 'Larkspur Vale' }],
      prior_suggestions: priorSuggestions,
      ...(carriedIntent ? { beat_intent: carriedIntent } : {})
    },
    state: {}, memory: [], history,
    player: 'I press on.',
    // The real client always seats an entropy pool; turn 12's pinned
    // initiative die is validated against it, so the walk seats one too.
    entropy: makeEntropy(() => 0.42),
    resolution: prevAskedRoll ? { outcome: 'success — the die spoke', total: 15 } : null,
    turn, genesis: turn === 0
  };
  const sat = await convene(input, {});
  assert.equal(sat.provider, 'mock');
  assert.deepEqual(
    sat.room_ledger.flags, [],
    `turn ${turn} of the house walk must ship clean — saw [${sat.room_ledger.flags.join(', ')}]`
  );
  assert.ok(sat.room_ledger.editor_calls <= 2 && sat.room_ledger.revisions <= 1, 'the budget law holds on every page');
  history = [
    ...history,
    { role: 'user', content: 'I press on.' },
    { role: 'assistant', content: sat.turn.narration_blocks.map((block) => block.text).join('\n\n') }
  ].slice(-40);
  priorSuggestions = Array.isArray(sat.turn.suggestions) ? sat.turn.suggestions : [];
  prevAskedRoll = Boolean(sat.turn.roll_request);
  carriedIntent = sat.beat_intent;
}

console.log('PASS — the echo court hears one shared run, the docket holds twenty and the client furnishes them, the measure court reads the band, and the house walk ships clean for twenty-one pages.');
