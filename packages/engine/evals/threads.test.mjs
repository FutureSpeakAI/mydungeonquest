// THE THREAD GATE (engine twin, pure fraction) — the narrative debt
// economy. Promises, debts, mysteries, and sworn goals are sealed
// operations: the validator rejects malformed or duplicate ledger writes,
// the reducer guards canon with notes, the story block tells the DM what
// the tale owes, and the pure replay cites the exact turn every promise
// was made. This gate is wholly pure; nothing is stripped.
import assert from 'node:assert/strict';
import { safeFallbackTurn, validateDmTurn } from '../src/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/story.js';
import { threadsOf, openThreadsOf } from '../src/threads.js';

const turn = (story) => ({ ...safeFallbackTurn('', 3), story });
const context = { cast: [], threads: [{ label: 'The ferry debt', status: 'open' }, { label: 'The old oath', status: 'kept' }] };

// --- 1. The validator's court ---
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'Find the sunken bell', kind: 'mystery', holder: 'Maren' }] }), [], context).ok, true);
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'the ferry debt' }] }), [], context).ok, false, 'a duplicate open label is rejected');
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'A' }] }), [], context).ok, false, 'a two-letter label is rejected');
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'One thing' }, { label: 'one thing' }] }), [], context).ok, false, 'a within-turn repeat is rejected');
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'Lawful', kind: 'grudge' }] }), [], context).ok, false, 'an unknown kind is rejected');
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'Lawful', secret: true }] }), [], context).ok, false, 'unknown keys are rejected');
assert.equal(validateDmTurn(turn({ thread_add: [{ label: 'a' }, { label: 'b' }, { label: 'c' }] }), [], context).ok, false, 'more than two adds are rejected');
assert.equal(validateDmTurn(turn({ thread_resolve: [{ label: 'The ferry debt', outcome: 'kept' }] }), [], context).ok, true);
assert.equal(validateDmTurn(turn({ thread_resolve: [{ label: 'The old oath', outcome: 'kept' }] }), [], context).ok, false, 'a closed thread cannot close again');
assert.equal(validateDmTurn(turn({ thread_resolve: [{ label: 'Never made', outcome: 'kept' }] }), [], context).ok, false, 'resolving nothing is rejected');
assert.equal(validateDmTurn(turn({ thread_resolve: [{ label: 'The ferry debt', outcome: 'forgotten' }] }), [], context).ok, false, 'an unlawful outcome is rejected');
assert.equal(validateDmTurn(turn(null), [], context).ok, true, 'a turn with no story stays lawful');

// --- 2. The reducer's canon guard ---
let codex = initCodex('classic-epic');
assert.deepEqual(codex.threads, [], 'the ledger opens empty');
codex = applyStoryUpdates(codex, { thread_add: [{ label: 'Find the sunken bell', kind: 'mystery' }, { label: 'The ferry debt', kind: 'debt', holder: 'Edda' }] });
assert.equal(codex.threads.length, 2);
codex = applyStoryUpdates(codex, { thread_add: [{ label: 'FIND THE SUNKEN BELL' }] });
assert.equal(codex.threads.length, 2, 'a duplicate open label is blocked');
assert.ok(codex.notes.some((note) => note.includes('Duplicate open thread')), 'and the block leaves a note');
codex = applyStoryUpdates(codex, { thread_resolve: [{ label: 'the ferry debt', outcome: 'kept' }] });
assert.equal(codex.threads.find((t) => t.label === 'The ferry debt').status, 'kept');
codex = applyStoryUpdates(codex, { thread_resolve: [{ label: 'the ferry debt', outcome: 'broken' }] });
assert.ok(codex.notes.some((note) => note.includes('Unlawful thread resolve')), 'a closed thread cannot close again');
codex = applyStoryUpdates(codex, { thread_add: [{ label: 'The ferry debt', kind: 'debt' }] });
assert.equal(codex.threads.filter((t) => t.label === 'The ferry debt').length, 2, 'a settled label may be sworn anew');

// --- 3. The block tells the DM what the tale owes ---
const block = storyBlock(codex);
assert.ok(block.open_threads.some((line) => line.includes('Find the sunken bell (mystery)')));
assert.ok(!block.open_threads.some((line) => line.includes('kept')), 'closed threads leave the open list');
assert.ok(block.threads_state.some((t) => t.label === 'The old oath' || t.status), 'the machine state rides for the validator');
assert.ok(block.threads_state.every((t) => Object.keys(t).length === 2), 'threads_state carries label and status only');

// --- 4. The replay cites the turn the promise was made ---
const campaign = { logs: [
  { player: 'I swear to find the bell.', dm: { story: { thread_add: [{ label: 'Find the sunken bell', kind: 'goal', holder: 'Maren' }] } } },
  { redacted: true, player: 'struck', dm: { story: { thread_add: [{ label: 'A struck vow' }] } } },
  { player: null, deed: 'Paid in full', dm: { story: { thread_resolve: [{ label: 'find the sunken bell', outcome: 'kept' }] } } }
] };
const ledger = threadsOf(campaign);
assert.equal(ledger.length, 1, 'a struck turn seals nothing');
assert.equal(ledger[0].openedTurn, 0); assert.ok(ledger[0].gloss.includes('swear'));
assert.equal(ledger[0].closedTurn, 2); assert.equal(ledger[0].outcome, 'kept');
assert.equal(openThreadsOf(campaign).length, 0);
console.log('PASS — the thread gate (engine twin, pure fraction): the ledger is sealed operations, duplicates and false closings are refused at two layers, the DM is told what the tale owes, and every promise cites its turn.');
