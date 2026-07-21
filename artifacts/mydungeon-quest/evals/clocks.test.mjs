// THE CLOCK GATE — Directive XIX, Article V. One universal primitive for
// any long undertaking: segments from {4, 6, 8}, sealed ticks carrying
// reasons, at most two clock operations a turn across all kinds, no tick
// past full, and a FILLED clock that must resolve the very turn it stands
// filled in the briefing's evidence — refused by name when left silent.
import assert from 'node:assert/strict';
import { safeFallbackTurn, validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/lib/story.js';
import { buildBriefing } from 'fatescript/graph';

const turn = (story) => ({ ...safeFallbackTurn('', 3), story });
const base = { cast: [], threads: [] };

// --- 1. The door: shape, the segment set, the shared budget ---
assert.equal(validateDmTurn(turn({ clock_open: [{ label: 'The garrison marches', segments: 6 }] }), [], base).ok, true);
const badSegments = validateDmTurn(turn({ clock_open: [{ label: 'The garrison marches', segments: 5 }] }), [], base);
assert.equal(badSegments.ok, false, 'a segment count outside {4,6,8} is refused');
assert.ok(badSegments.errors.some((error) => error.includes('clock_open.segments must be 4, 6, or 8')), 'and named');
assert.equal(validateDmTurn(turn({ clock_open: [{ label: 'ab', segments: 4 }] }), [], base).ok, false, 'the label fence holds');
assert.equal(validateDmTurn(turn({ clock_tick: [{ label: 'The garrison marches', reason: '' }] }), [], base).ok, false, 'a tick without its reason is refused');
assert.equal(validateDmTurn(turn({ clock_open: [{ label: 'One', segments: 4 }, { label: 'Two', segments: 4 }], clock_tick: [{ label: 'One', reason: 'haste' }] }), [], base).ok, false, 'three clock operations in one turn are refused');
const overBudget = validateDmTurn(turn({ clock_open: [{ label: 'One clock', segments: 4 }], clock_tick: [{ label: 'A second', reason: 'haste presses' }, { label: 'A third', reason: 'and again' }] }), [], base);
assert.ok(overBudget.errors.some((error) => error.includes('at most two clock operations a turn (received 3)')), 'the shared budget is named');
assert.equal(validateDmTurn(turn({ clock_resolve: [{ label: 'The garrison marches', outcome: 'hurried' }] }), [], base).ok, false, 'an unlawful outcome is refused');

// --- 2. The door against the briefing's own evidence ---
const standing = { ...base, openClocks: [
  { label: 'The garrison marches', segments: 4, ticks: 3, status: 'open' },
  { label: 'The winter stores', segments: 6, ticks: 2, status: 'open' }
] };
assert.equal(validateDmTurn(turn({ clock_tick: [{ label: 'the garrison marches', reason: 'The scouts return with torches' }] }), [], standing).ok, true, 'a lawful tick against the record passes');
const dupOpen = validateDmTurn(turn({ clock_open: [{ label: 'The Garrison Marches', segments: 8 }] }), [], standing);
assert.equal(dupOpen.ok, false, 'an open label cannot open again');
assert.ok(dupOpen.errors.some((error) => error.includes('duplicates an open clock')), 'and is named');
assert.ok(validateDmTurn(turn({ clock_tick: [{ label: 'A clock never opened', reason: 'ghost work' }] }), [], standing).errors.some((error) => error.includes('targets no open clock')), 'a stranger tick is named');
const pastFull = validateDmTurn(turn({ clock_tick: [{ label: 'The garrison marches', reason: 'one too many' }, { label: 'The garrison marches', reason: 'two too many' }] }), [], standing);
assert.equal(pastFull.ok, false, 'the within-turn cumulative count refuses the overshoot');
assert.ok(pastFull.errors.some((error) => error.includes('past full refused')), 'past full is refused by name');
assert.ok(validateDmTurn(turn({ clock_resolve: [{ label: 'Never opened', outcome: 'struck' }] }), [], standing).errors.some((error) => error.includes('targets no open clock')), 'a stranger resolve is named');
const binding = { ...standing, openAmbitions: ['I will hold the pass at Harrowmere'] };
assert.equal(validateDmTurn(turn({ clock_open: [{ label: 'The pass defense', segments: 8, ambition: 'I will hold the pass at Harrowmere' }] }), [], binding).ok, true, 'a clock may bind an open ambition');
assert.ok(validateDmTurn(turn({ clock_open: [{ label: 'The pass defense', segments: 8, ambition: 'A goal nobody declared' }] }), [], binding).errors.some((error) => error.includes('names no open ambition')), 'binding a stranger ambition is named');

// --- 3. The filled clock must resolve — even against a null story ---
const filled = { ...base, openClocks: [{ label: 'The garrison marches', segments: 4, ticks: 4, status: 'open' }] };
const silent = validateDmTurn(turn(null), [], filled);
assert.equal(silent.ok, false, 'a filled clock left silent refuses the whole turn');
assert.ok(silent.errors.some((error) => error.includes('a filled clock stands silent')), 'and the silence is named');
assert.equal(validateDmTurn(turn({ clock_resolve: [{ label: 'The garrison marches', outcome: 'struck' }] }), [], filled).ok, true, 'resolving it pays the debt');

// --- 4. The fold: cited ticks, the budget belt, honest closes ---
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { clock_open: [{ label: 'The garrison marches', segments: 4 }] }, { turn: 2 });
assert.equal(codex.clocks.length, 1);
codex = applyStoryUpdates(codex, { clock_tick: [{ label: 'the garrison marches', reason: 'The beacons are lit' }] }, { turn: 3 });
codex = applyStoryUpdates(codex, { clock_tick: [{ label: 'The garrison marches', reason: 'The muster is called' }] }, { turn: 5 });
assert.deepEqual(codex.clocks[0].ticks.map((tick) => tick.turn), [3, 5], 'every tick cites its turn');
assert.equal(codex.clocks[0].ticks[0].reason, 'The beacons are lit', 'and carries its reason whole');
const blockMid = storyBlock(codex);
assert.deepEqual(blockMid.clocks_state, [{ label: 'The garrison marches', segments: 4, ticks: 2, status: 'open' }], 'the machine seat carries the count, not the rows');
const crowded = applyStoryUpdates(codex, { clock_open: [{ label: 'One more', segments: 4 }, { label: 'And another', segments: 6 }], clock_tick: [{ label: 'The garrison marches', reason: 'a third op' }] }, { turn: 6 });
assert.equal(crowded.clocks.length, 3, 'the fold belt holds the two-op budget — the two opens land and no more');
assert.equal(crowded.clocks.find((row) => row.label === 'The garrison marches').ticks.length, 2, 'the third operation folds away unapplied');
assert.ok(crowded.notes.some((note) => note.includes('The clock budget is spent')), 'with the spent budget named in a standing note');
codex = applyStoryUpdates(codex, { clock_resolve: [{ label: 'The garrison marches', outcome: 'averted' }] }, { turn: 7 });
assert.equal(codex.clocks[0].status, 'resolved', 'the close seals the row');
assert.equal(codex.clocks[0].outcome, 'averted', 'and carries its honest outcome');
assert.equal(codex.clocks[0].resolved_turn, 7, 'the close cites its turn');
assert.deepEqual(storyBlock(codex).clocks_state, [], 'a resolved clock leaves the open seat');

// --- 5. The briefing seat: bounded three, nearest-full first, stable ---
let busy = initCodex('classic-epic');
busy = applyStoryUpdates(busy, { clock_open: [{ label: 'Alpha work', segments: 8 }, { label: 'Beta march', segments: 4 }] }, { turn: 1 });
busy = applyStoryUpdates(busy, { clock_open: [{ label: 'Gamma siege', segments: 6 }, { label: 'Delta rot', segments: 6 }] }, { turn: 2 });
busy = applyStoryUpdates(busy, { clock_tick: [{ label: 'Beta march', reason: 'the road is short' }, { label: 'Beta march', reason: 'and shorter still' }] }, { turn: 3 });
busy = applyStoryUpdates(busy, { clock_tick: [{ label: 'Beta march', reason: 'the walls in sight' }, { label: 'Beta march', reason: 'at the gates' }] }, { turn: 4 });
const packOne = buildBriefing({ codex: busy, logs: [], hero: { name: 'Maren' } }, { budget: 9000 });
assert.equal(packOne.open_clocks.length, 3, 'the seat is bounded to three');
assert.ok(packOne.open_clocks[0].startsWith('Beta march — 4/4 — FILLED: resolve this turn'), 'nearest-full rides first and FILLED is marked');
const packTwo = buildBriefing({ codex: busy, logs: [], hero: { name: 'Maren' } }, { budget: 9000 });
assert.equal(JSON.stringify(packOne.open_clocks), JSON.stringify(packTwo.open_clocks), 'the seat is byte-stable');
let bound = initCodex('classic-epic');
bound = applyStoryUpdates(bound, { ambition_add: [{ text: 'I will hold the pass at Harrowmere' }] }, { turn: 1 });
bound = applyStoryUpdates(bound, { clock_open: [{ label: 'The pass defense', segments: 6, ambition: 'I will hold the pass at Harrowmere' }] }, { turn: 2 });
const boundPack = buildBriefing({ codex: bound, logs: [], hero: { name: 'Maren' } }, { budget: 9000 });
assert.ok(boundPack.open_clocks[0].includes('(bound to: I will hold the pass at Harrowmere)'), 'the binding rides the seat');

console.log('PASS — the clock gate: the segment set, the shared budget, cited ticks, past-full and filled-silent refused by name, and the bounded stable briefing seat.');
