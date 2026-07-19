// THE COIN-PURSE GATE (engine twin, Directive VI) — narrative coin as
// sealed movements. Every movement carries holder, signed whole delta,
// and honest reason; the overdraft is refused at the door (folding the
// turn's own movements in order) and clamped at the fold; the replay
// reaches the same figure from the journal alone; and the briefing
// speaks the hero's wealth in one deterministic line that trims only
// after the allegiances are gone. The lib compat door (src/lib/*.js)
// is the table's own concern — the engine seats these folds itself.
import assert from 'node:assert/strict';
import { safeFallbackTurn, validateDmTurn } from '../src/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/story.js';
import { purseOf } from '../src/trove.js';
import { buildBriefing } from '../src/graph.js';

const turn = (story) => ({ ...safeFallbackTurn('', 3), story });
const context = { cast: [], trove: [], purses: [{ holder: 'Maren', coin: 10 }] };

// --- 1. The validator's court ---
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: -10, reason: 'Paid the ferry toll in full' }] }), [], context).ok, true, 'spending to exactly zero is lawful');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: -11, reason: 'One coin too far' }] }), [], context).ok, false, 'the overdraft is refused');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 5, reason: 'A debt repaid at the door' }, { holder: 'Maren', delta: -14, reason: 'Provisions for the pass' }] }), [], context).ok, true, 'the second movement is judged against the first');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: -10, reason: 'Emptied the purse' }, { holder: 'Maren', delta: -1, reason: 'And one more' }] }), [], context).ok, false, 'a sequential overdraft is refused');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Edda', delta: 5, reason: 'First coin of a new purse' }] }), [], context).ok, true, 'an unknown holder begins at zero');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Edda', delta: -1, reason: 'Spending from an empty purse' }] }), [], context).ok, false);
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 0, reason: 'Nothing moved at all' }] }), [], context).ok, false, 'a zero delta is refused');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 1000, reason: 'A kingdom in one pour' }] }), [], context).ok, false, 'the bounds hold');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 3.5, reason: 'Half coins are not coin' }] }), [], context).ok, false, 'a fraction is refused');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: '12', reason: 'A written number is not a number' }] }), [], context).ok, false);
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 5 }] }), [], context).ok, false, 'a movement without a reason is refused');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 5, reason: 'ok' }] }), [], context).ok, false, 'a two-letter reason is refused');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 5, reason: 'A lawful reason', secret: true }] }), [], context).ok, false, 'unknown keys are rejected');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 1, reason: 'One of three' }, { holder: 'Maren', delta: 1, reason: 'Two of three' }, { holder: 'Maren', delta: 1, reason: 'Three of three' }] }), [], context).ok, false, 'more than two movements are rejected');
// The presence law: a bare context waives the overdraft court, never shape.
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: -900, reason: 'Judged blind at the shape court' }] }), [], { cast: [] }).ok, true, 'a bare context skips the overdraft court');
assert.equal(validateDmTurn(turn({ purse: [{ holder: 'Maren', delta: 0, reason: 'Still nothing moved' }] }), [], { cast: [] }).ok, false, 'shape law binds even bare');

// --- 2. The reducer's fold and clamp ---
let codex = initCodex('classic-epic');
assert.deepEqual(codex.purses, [], 'every purse opens empty');
codex = applyStoryUpdates(codex, { purse: [{ holder: 'Maren', delta: 30, reason: 'Back pay counted out' }] }, { turn: 0 });
codex = applyStoryUpdates(codex, { purse: [{ holder: 'Maren', delta: -12, reason: 'The road toll' }, { holder: 'Edda', delta: 7, reason: 'Bread sold at the hearth' }] }, { turn: 1 });
assert.equal(codex.purses.find((entry) => entry.holder === 'Maren').coin, 18);
assert.equal(codex.purses.find((entry) => entry.holder === 'Edda').coin, 7, 'holders fold independently');
codex = applyStoryUpdates(codex, { purse: [{ holder: 'Maren', delta: -40, reason: 'A bribe beyond her means' }] }, { turn: 2 });
assert.equal(codex.purses.find((entry) => entry.holder === 'Maren').coin, 0, 'the fold clamps at zero');
assert.ok(codex.notes.some((note) => note.includes('cannot fall below zero')), 'and the clamp leaves a note');
codex = applyStoryUpdates(codex, { purse: [{ holder: 'Maren', delta: 5 }] }, { turn: 3 });
assert.ok(codex.notes.some((note) => note.includes('Unlawful purse movement')), 'a reasonless movement is refused with a note');
assert.equal(codex.purses.find((entry) => entry.holder === 'Maren').coin, 0, 'and moves nothing');
const flooded = applyStoryUpdates(initCodex('classic-epic'), { purse: [
  { holder: 'Maren', delta: 1, reason: 'One of three' }, { holder: 'Maren', delta: 1, reason: 'Two of three' }, { holder: 'Maren', delta: 1, reason: 'Three of three' }
] }, { turn: 0 });
assert.equal(flooded.purses[0].coin, 2, 'the two-movement law holds at the fold');
const state = storyBlock(codex);
assert.ok(state.purse_state.every((entry) => Object.keys(entry).length === 2), 'purse_state carries holder and coin only');
assert.deepEqual(state.purse_state.find((entry) => entry.holder === 'Edda'), { holder: 'Edda', coin: 7 });

// --- 3. The replay reaches the same figure from the journal alone ---
const journal = { hero: { name: 'Maren' }, logs: [
  { player: 'I collect my back pay.', dm: { story: { purse: [{ holder: 'Maren', delta: 30, reason: 'Back pay counted out' }] } } },
  { redacted: true, player: 'struck', dm: { story: { purse: [{ holder: 'Maren', delta: 999, reason: 'A struck windfall' }] } } },
  { player: 'I pay the toll.', dm: { story: { purse: [{ holder: 'Maren', delta: -12, reason: 'The road toll' }] } } },
  { player: 'I try to buy the bridge.', dm: { story: { purse: [{ holder: 'Maren', delta: -40, reason: 'A bribe beyond her means' }] } } }
] };
const purse = purseOf(journal, 'maren');
assert.equal(purse.coin, 0, 'replay folds and clamps to the same figure, case-blind');
assert.deepEqual(purse.entries.map((entry) => entry.turn), [0, 2, 3], 'a struck turn moves no coin');
assert.deepEqual(purse.entries.map((entry) => entry.clamped), [false, false, true], 'the clamped movement says so');
assert.equal(purseOf(journal, 'Edda').entries.length, 0, 'purses never bleed between holders');

// --- 4. The briefing speaks the wealth in one honest line ---
let rich = initCodex('classic-epic');
rich = applyStoryUpdates(rich, { item_add: [{ name: 'The ferry ledger', kind: 'document', holder: 'Maren' }], purse: [{ holder: 'Maren', delta: 30, reason: 'Back pay counted out' }] }, { turn: 0 });
rich = applyStoryUpdates(rich, { item_add: [{ name: 'A silver whistle', kind: 'tool', holder: 'Maren' }], purse: [{ holder: 'Maren', delta: -12, reason: 'The road toll' }] }, { turn: 1 });
const briefing = buildBriefing({ hero: { name: 'Maren' }, codex: rich, logs: [] });
assert.equal(briefing.hero_wealth, 'Maren carries 18 coin. Holds: A silver whistle, The ferry ledger.', 'coin and holdings, most recently moved first');
const keys = Object.keys(briefing);
assert.equal(keys[0], 'calendar', 'the calendar stays first');
assert.equal(keys.indexOf('stated_allegiances'), keys.length - 1, 'the allegiances stay last');
assert.equal(keys.indexOf('hero_wealth'), keys.length - 2, 'the wealth line sits between the pack and the allegiances');
const bare = buildBriefing({ hero: { name: 'Maren' }, codex: initCodex('classic-epic'), logs: [] });
assert.equal(bare.hero_wealth, 'Maren carries 0 coin.', 'an empty purse is spoken, never omitted');
let heavy = initCodex('classic-epic');
for (let i = 0; i < 5; i += 1) heavy = applyStoryUpdates(heavy, { item_add: [{ name: `Keepsake number ${i + 1}`, kind: 'keepsake', holder: 'Maren' }] }, { turn: i });
const spoken = buildBriefing({ hero: { name: 'Maren' }, codex: heavy, logs: [] }).hero_wealth;
assert.ok(spoken.includes('Keepsake number 5') && !spoken.includes('Keepsake number 1'), 'only the four most recent holdings are spoken');
const tiny = buildBriefing({ hero: { name: 'Maren' }, codex: initCodex('classic-epic'), logs: [] }, { budget: 120 });
assert.equal(Object.keys(tiny)[0], 'calendar', 'the calendar stays first even starving');
assert.equal(tiny.hero_wealth, undefined, 'under famine the wealth line falls only after the allegiances are gone');
console.log('PASS — the coin-purse gate (engine twin): coin moves only by sealed reasons, the overdraft is refused at the door and clamped at the fold, every purse replays to the same figure, and the briefing speaks the standing wealth in one honest line; the lib compat door is judged at the table\u2019s own gate.');
