// THE LIVING WORLD GATE — ticks are ops-only, bounded, budgeted, lawful,
// deterministic, and visible to the cards while silent to the book.
import assert from 'node:assert/strict';
import { tickUpdates, tickLogEntry, pickTickTargets, TICK_BUDGET } from 'fatescript/livingWorld';
import { initCodex, applyStoryUpdates } from 'fatescript/story';
import { buildCards } from 'fatescript/cards';

let codex = initCodex('classic-epic');
const add = (name, role, goal, bond = 0) => ({ name, role, visual: 'painted', voice: '', goal, secret: '' });
codex = applyStoryUpdates(codex, { cast_add: [
  add('The Regent of Ash', 'villain', 'unmake the vale'),
  add('Mirabel', 'her mother', 'keep the mill turning'),
  add('Tomas', 'a ferryman', 'pay off the river-debt'),
  add('Ilse', 'a chandler', 'find her missing brother'),
  add('Bren', 'a stablehand', 'earn a knight\'s notice'),
  add('Odo', 'a beggar-saint', 'finish the shrine')
] }, { turn: 1 });
codex = applyStoryUpdates(codex, { cast_update: [{ name: 'Mirabel', bond_delta: 3, bond_reason: 'kin' }, { name: 'Odo', status: 'dead', last_seen: 'at the shrine' }] }, { turn: 2 });

const targets = pickTickTargets(codex);
assert.ok(targets.length <= TICK_BUDGET, 'the budget holds');
assert.ok(!targets.some((s) => s.role === 'villain'), 'the villain keeps his own clock');
assert.ok(!targets.some((s) => s.status === 'dead'), 'the dead do not move');
assert.equal(targets[0].name, 'Mirabel', 'the strongest bond moves first');

const updates = tickUpdates(codex, 7);
assert.deepEqual(updates, tickUpdates(codex, 7), 'the same world ticks the same way');
for (const patch of updates.cast_update) {
  assert.deepEqual(Object.keys(patch).sort(), ['fact_add', 'last_seen', 'name'], 'ops-only: nothing may widen');
  assert.ok(patch.fact_add.startsWith('Offscreen — '), 'a tick names itself honestly');
}
const before = codex.notes.length;
const ticked = applyStoryUpdates(codex, updates, { turn: 7 });
assert.equal(ticked.notes.length, before, 'the reducer blocks nothing — every tick op is lawful');
assert.ok(ticked.cast.every((s, i) => s.status === codex.cast[i].status && s.bond === codex.cast[i].bond), 'no status, no bond, no death');

const entry = tickLogEntry(updates, 7, 3);
assert.equal(entry.kind, 'tick');
assert.equal(entry.dm.narration_blocks.length, 0, 'silent in the book');
const { cards } = buildCards({ hero: { name: 'Sera Vale' }, entries: [
  { turn: 1, dm: { story: { cast_add: [add('Mirabel', 'her mother', 'keep the mill turning')] }, narration_blocks: [] } },
  entry
] });
assert.ok(cards['mirabel'].chronicle.some((c) => c.turn === 7 && c.gloss.startsWith('Offscreen')), 'the wiki inherits the tick, cited to its turn');
console.log('PASS — the living world gate: budgeted, ops-only, deterministic, lawful under the reducer, silent to the book, alive in the wiki.');
