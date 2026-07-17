// THE TROVE GATE (Directive VI) — named possessions as sealed operations.
// The validator refuses malformed writes and movements from hands the
// record does not show; the reducer guards canon with notes under the
// three-operation law; the story block tells the DM what is held; and the
// pure replay cites every hand a thing has passed through, seed included.
import assert from 'node:assert/strict';
import { safeFallbackTurn, validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/lib/story.js';
import { troveOf, heldBy } from '../src/lib/trove.js';

const turn = (story) => ({ ...safeFallbackTurn('', 3), story });
const context = { cast: [], trove: [{ name: 'The ferry ledger', holder: 'Maren' }, { name: 'A broken oar', holder: 'Edda', status: 'gone' }], purses: [] };

// --- 1. The validator's court ---
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'A silver whistle', kind: 'tool', holder: 'Maren', note: 'Cold to the touch.' }] }), [], context).ok, true);
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'the ferry ledger', kind: 'document', holder: 'Edda' }] }), [], context).ok, false, 'a duplicate held name is rejected');
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'A broken oar', kind: 'tool', holder: 'Maren' }] }), [], context).ok, true, 'a gone name may be taken up again');
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'Ax', kind: 'weapon', holder: 'Maren' }] }), [], context).ok, false, 'a two-letter name is rejected');
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'A relic of the door', kind: 'relic', holder: 'Maren' }] }), [], context).ok, false, 'an unknown kind is rejected');
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'A nameless kind', holder: 'Maren' }] }), [], context).ok, false, 'a missing kind is rejected');
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'A secret thing', kind: 'tool', holder: 'Maren', secret: true }] }), [], context).ok, false, 'unknown keys are rejected');
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'One whistle', kind: 'tool', holder: 'Maren' }, { name: 'one whistle', kind: 'tool', holder: 'Edda' }] }), [], context).ok, false, 'a within-turn repeat is rejected');
assert.equal(validateDmTurn(turn({ item_transfer: [{ name: 'The ferry ledger', from: 'maren', to: 'Edda' }] }), [], context).ok, true, 'a lawful transfer passes, case-blind');
assert.equal(validateDmTurn(turn({ item_transfer: [{ name: 'The ferry ledger', from: 'Edda', to: 'Corin Voss' }] }), [], context).ok, false, 'a transfer from the wrong hand is rejected');
assert.equal(validateDmTurn(turn({ item_transfer: [{ name: 'A thing never sealed', from: 'Maren', to: 'Edda' }] }), [], context).ok, false, 'a transfer of an unrecorded thing is rejected');
assert.equal(validateDmTurn(turn({ item_transfer: [{ name: 'The ferry ledger', from: 'Maren', to: 'maren' }] }), [], context).ok, false, 'a hand cannot pass to itself');
assert.equal(validateDmTurn(turn({ item_remove: [{ name: 'The ferry ledger', holder: 'Maren', reason: 'Burned at the hearth' }] }), [], context).ok, true);
assert.equal(validateDmTurn(turn({ item_remove: [{ name: 'The ferry ledger', holder: 'Edda' }] }), [], context).ok, false, 'a remove from the wrong hand is rejected');
assert.equal(validateDmTurn(turn({
  item_add: [{ name: 'First thing', kind: 'tool', holder: 'Maren' }, { name: 'Second thing', kind: 'tool', holder: 'Maren' }],
  item_transfer: [{ name: 'The ferry ledger', from: 'Maren', to: 'Edda' }],
  item_remove: [{ name: 'The ferry ledger', holder: 'Maren' }]
}), [], context).ok, false, 'four item operations break the counting law');
assert.equal(validateDmTurn(turn({
  item_add: [{ name: 'First thing', kind: 'tool', holder: 'Maren' }, { name: 'Second thing', kind: 'tool', holder: 'Maren' }],
  item_transfer: [{ name: 'The ferry ledger', from: 'Maren', to: 'Edda' }]
}), [], context).ok, true, 'three item operations are the ceiling, not a breach');
// The presence law: a bare context (no trove key) waives legality, never shape.
assert.equal(validateDmTurn(turn({ item_transfer: [{ name: 'The ferry ledger', from: 'Edda', to: 'Corin Voss' }] }), [], { cast: [] }).ok, true, 'a bare context skips the holding court');
assert.equal(validateDmTurn(turn({ item_add: [{ name: 'Ax', kind: 'weapon', holder: 'Maren' }] }), [], { cast: [] }).ok, false, 'shape law binds even bare');
assert.equal(validateDmTurn(turn(null), [], context).ok, true, 'a turn with no story stays lawful');

// --- 2. The reducer's canon guard, seed included ---
assert.deepEqual(initCodex('classic-epic').trove, [], 'a hero without a keepsake begins empty-handed');
let codex = initCodex('classic-epic', { keepsake: { name: 'A key with no known door', holder: 'Maren' } });
assert.equal(codex.trove.length, 1);
assert.deepEqual({ kind: codex.trove[0].kind, holder: codex.trove[0].holder, since: codex.trove[0].since }, { kind: 'keepsake', holder: 'Maren', since: 0 }, 'the forge keepsake is seeded, cited to turn zero');
codex = applyStoryUpdates(codex, { item_add: [{ name: 'The ferry ledger', kind: 'document', holder: 'Maren' }] }, { turn: 1 });
assert.equal(codex.trove.length, 2);
codex = applyStoryUpdates(codex, { item_add: [{ name: 'THE FERRY LEDGER', kind: 'document', holder: 'Edda' }] }, { turn: 2 });
assert.equal(codex.trove.length, 2, 'a duplicate held name is blocked');
assert.ok(codex.notes.some((note) => note.includes('Duplicate held thing')), 'and the block leaves a note');
codex = applyStoryUpdates(codex, { item_transfer: [{ name: 'the ferry ledger', from: 'Edda', to: 'Corin Voss' }] }, { turn: 3 });
assert.ok(codex.notes.some((note) => note.includes('Unlawful transfer')), 'a transfer from the wrong hand is refused with a note');
codex = applyStoryUpdates(codex, { item_transfer: [{ name: 'the ferry ledger', from: 'Maren', to: 'Edda' }] }, { turn: 4 });
assert.equal(codex.trove[1].holder, 'Edda', 'a lawful transfer moves the hand');
assert.equal(codex.trove[1].moved, 4, 'and stamps the turn it moved');
codex = applyStoryUpdates(codex, { item_remove: [{ name: 'The ferry ledger', holder: 'Edda', reason: 'Handed to the hearth fire' }] }, { turn: 5 });
assert.equal(codex.trove[1].status, 'gone');
codex = applyStoryUpdates(codex, { item_add: [{ name: 'The ferry ledger', kind: 'document', holder: 'Corin Voss' }] }, { turn: 6 });
assert.equal(codex.trove.filter((item) => item.name === 'The ferry ledger').length, 2, 'a gone name may be sealed anew');
const flooded = applyStoryUpdates(initCodex('classic-epic'), { item_add: [
  { name: 'First of four', kind: 'tool', holder: 'Maren' }, { name: 'Second of four', kind: 'tool', holder: 'Maren' },
  { name: 'Third of four', kind: 'tool', holder: 'Maren' }, { name: 'Fourth of four', kind: 'tool', holder: 'Maren' }
] }, { turn: 1 });
assert.equal(flooded.trove.length, 3, 'the three-operation law holds at the fold');

// --- 3. The block tells the DM what is held ---
const block = storyBlock(codex);
assert.ok(block.trove_state.every((item) => Object.keys(item).length === 2), 'trove_state carries name and holder only');
assert.ok(block.trove_state.some((item) => item.name === 'A key with no known door' && item.holder === 'Maren'));
assert.ok(!block.trove_state.some((item) => item.holder === 'Edda'), 'gone things leave the held state');

// --- 4. The replay cites every hand, seed included ---
const campaign = { hero: { name: 'Maren', keepsake: 'A key with no known door' }, logs: [
  { player: 'I take the ledger from the waystation desk.', dm: { story: { item_add: [{ name: 'The ferry ledger', kind: 'document', holder: 'Maren', note: 'In a tight hand.' }] } } },
  { redacted: true, player: 'struck', dm: { story: { item_add: [{ name: 'A struck blade', kind: 'weapon', holder: 'Maren' }] } } },
  { player: null, deed: 'Given freely at the hearth', dm: { story: { item_transfer: [{ name: 'the ferry ledger', from: 'maren', to: 'Edda' }] } } }
] };
const items = troveOf(campaign);
assert.equal(items.length, 2, 'a struck turn seals nothing');
assert.deepEqual(items[0].chain, [{ holder: 'Maren', since: 0, by: 'carried from the forge' }], 'the seed cites the forge');
assert.deepEqual(items[1].chain.map((hand) => hand.holder), ['Maren', 'Edda'], 'the chain remembers both hands');
assert.deepEqual(items[1].chain.map((hand) => hand.since), [0, 2], 'and cites the journal row of each passage');
assert.ok(items[1].chain[1].by.includes('Given freely'), 'the passage keeps the words that moved it');
assert.equal(heldBy(campaign, 'Edda').length, 1);
assert.equal(heldBy(campaign, 'Maren').length, 1, 'the keepsake stays in the forge hand');
console.log('PASS — the trove gate: possessions are sealed operations, unlawful hands are refused at two layers, the DM is told what is held, and every thing cites every hand it passed through.');
