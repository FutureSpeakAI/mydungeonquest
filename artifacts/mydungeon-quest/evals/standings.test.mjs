// THE STANDING GATE — Directive XIX, Article VI. Factions remember, as a
// ledger of sealed shift rows: a named faction, a delta from {-2,-1,+1,+2},
// a stated reason, at most two a turn. No score crosses the door — the
// score exists only as the fold's own sum, cited shift by shift, and the
// briefing carries the strongest four while famine takes the standings
// before the stated allegiances and never touches the player's own word.
import assert from 'node:assert/strict';
import { safeFallbackTurn, validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, standingsOf } from '../src/lib/story.js';
import { buildBriefing } from 'fatescript/graph';

const turn = (story) => ({ ...safeFallbackTurn('', 3), story });
const base = { cast: [], threads: [] };

// --- 1. The door: bounds by name, shape only ---
assert.equal(validateDmTurn(turn({ standing_shift: [{ faction: 'The Harvest Court', delta: 1, reason: 'You returned the tithe wagon' }] }), [], base).ok, true);
const zeroStep = validateDmTurn(turn({ standing_shift: [{ faction: 'The Harvest Court', delta: 0, reason: 'nothing moved' }] }), [], base);
assert.equal(zeroStep.ok, false, 'a zero delta is refused');
assert.ok(zeroStep.errors.some((error) => error.includes('standing_shift.delta must be -2, -1, +1, or +2')), 'and named');
assert.equal(validateDmTurn(turn({ standing_shift: [{ faction: 'The Harvest Court', delta: 3, reason: 'too big a step' }] }), [], base).ok, false, 'a stride outside the set is refused');
assert.equal(validateDmTurn(turn({ standing_shift: [{ faction: 'ab', delta: 1, reason: 'name too short' }] }), [], base).ok, false, 'the faction fence holds');
assert.equal(validateDmTurn(turn({ standing_shift: [{ faction: 'The Harvest Court', delta: 1, reason: '' }] }), [], base).ok, false, 'a shift without its reason is refused');
assert.equal(validateDmTurn(turn({ standing_shift: [{ faction: 'The Harvest Court', delta: 1, reason: 'lawful', score: 5 }] }), [], base).ok, false, 'no score crosses the door');
assert.ok(validateDmTurn(turn({ standing_shift: [{ faction: 'A', delta: 1, reason: 'one' }, { faction: 'B', delta: 1, reason: 'two' }, { faction: 'C', delta: 1, reason: 'three' }] }), [], base).errors.some((error) => error.includes('standing_shift must be an array of at most 2')), 'at most two shifts a turn, by name');

// --- 2. The fold: the score is provably the sum of its cited shifts ---
let codex = initCodex('classic-epic');
codex = applyStoryUpdates(codex, { standing_shift: [{ faction: 'The Harvest Court', delta: 2, reason: 'You broke the blight siege' }] }, { turn: 3 });
codex = applyStoryUpdates(codex, { standing_shift: [{ faction: 'The Harvest Court', delta: -1, reason: 'You sheltered their runaway' }, { faction: 'The River Guild', delta: 1, reason: 'Passage fees paid in full' }] }, { turn: 5 });
assert.equal(codex.standings.length, 3, 'every shift is its own sealed row');
const seats = standingsOf(codex);
const court = seats.find((seat) => seat.faction === 'The Harvest Court');
assert.equal(court.score, 1, 'the score is the sum of its shifts — 2 - 1 = 1');
assert.deepEqual(court.shifts.map((shift) => shift.turn), [3, 5], 'each shift cites its turn');
assert.equal(court.shifts[1].reason, 'You sheltered their runaway', 'and carries its reason whole');
assert.equal(seats.reduce((sum, seat) => sum + seat.shifts.length, 0), codex.standings.length, 'no shift is orphaned from the panel contract');

// --- 3. The sort: strongest first by absolute score, then name ---
let ranked = initCodex('classic-epic');
ranked = applyStoryUpdates(ranked, { standing_shift: [{ faction: 'Quiet Friends', delta: 1, reason: 'small kindness' }, { faction: 'Loud Enemies', delta: -2, reason: 'open defiance' }] }, { turn: 1 });
ranked = applyStoryUpdates(ranked, { standing_shift: [{ faction: 'Loud Enemies', delta: -2, reason: 'a burned granary' }] }, { turn: 2 });
const order = standingsOf(ranked);
assert.deepEqual(order.map((seat) => seat.faction), ['Loud Enemies', 'Quiet Friends'], 'absolute score ranks first');
assert.equal(order[0].score, -4);

// --- 4. The briefing seat: bounded four, famine order, the word never falls ---
let crowded = initCodex('classic-epic');
crowded = applyStoryUpdates(crowded, { ambition_add: [{ text: 'I will see the river run clean again' }] }, { turn: 1 });
const factions = ['The Harvest Court', 'The River Guild', 'The Ashen Choir', 'The Border Wardens', 'The Silent Market'];
factions.forEach((faction, i) => {
  crowded = applyStoryUpdates(crowded, { standing_shift: [{ faction, delta: (i % 2 ? -1 : 1), reason: 'the ledger grows' }] }, { turn: 2 + i });
});
const campaign = { codex: crowded, logs: [], hero: { name: 'Maren' } };
const fed = buildBriefing(campaign, { budget: 9000 });
assert.equal(fed.standings.length, 4, 'the seat is bounded to four');
assert.ok(fed.standings.every((line) => typeof line === 'string' && / — [+-]\d/.test(line)), 'each seat carries its faction and signed sum');
assert.deepEqual(fed.open_ambitions, ['I will see the river run clean again'], 'the ambition rides beside them');
const fullLength = JSON.stringify(fed).length;
let sawStandingsFall = false;
for (let budget = fullLength - 1; budget > fullLength - 400 && budget > 500; budget -= 40) {
  const lean = buildBriefing(campaign, { budget });
  const standingsGone = !lean.standings;
  const allegiancesShrunk = (lean.stated_allegiances || []).length < (fed.stated_allegiances || []).length;
  if (standingsGone) sawStandingsFall = true;
  if (allegiancesShrunk) assert.ok(standingsGone, 'famine order holds — the allegiances never shrink while standings still ride');
  assert.deepEqual(lean.open_ambitions, fed.open_ambitions, "famine never takes the player's own word");
}
assert.ok(sawStandingsFall, 'under famine the standings do fall — the tier is real');
const again = buildBriefing(campaign, { budget: 9000 });
assert.equal(JSON.stringify(again.standings), JSON.stringify(fed.standings), 'the seat is byte-stable');

console.log('PASS — the standing gate: bounds refused by name, the score provably its cited sum, strongest-four seating, and famine that spares the declared word.');
