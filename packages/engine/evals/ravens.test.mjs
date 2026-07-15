// THE RAVENS GATE — the Raven Law holds or this file turns the build red.
import assert from 'node:assert/strict';
import { ABSENCE_BATCH_CAP, absenceDays, absenceBatches, composeRecap } from '../src/ravens.js';
import { fixtureCodex } from './fixtures.mjs';

const DAY = 24 * 60 * 60 * 1000;
const codex = fixtureCodex();
const now = Date.UTC(2026, 6, 15);

// Days are counted honestly; nonsense counts as nothing.
assert.equal(absenceDays(now - 3 * DAY, now), 3);
assert.equal(absenceDays(now + DAY, now), 0, 'the future is not an absence');
assert.equal(absenceDays(null, now), 0);

// Thirty days away yields the cap, not thirty — souls walk, they do not sprint.
const batchesA = absenceBatches({ codex, lastSealTs: now - 30 * DAY, now, startTurn: 12 });
const batchesB = absenceBatches({ codex, lastSealTs: now - 30 * DAY, now, startTurn: 12 });
assert.equal(ABSENCE_BATCH_CAP, 6);
assert.equal(batchesA.length, ABSENCE_BATCH_CAP);
const opsOf = (entries) => JSON.stringify(entries.map((entry) => entry.dm.story));
assert.equal(opsOf(batchesA), opsOf(batchesB), 'the same absence over the same codex ticks the same way');
for (const entry of batchesA) {
  assert.equal(entry.kind, 'tick');
  assert.ok(entry.absence, 'absence rows are marked');
  assert.ok(entry.turn >= 2_000_000, 'synthetic turns collide with nothing');
  for (const op of entry.dm.story.cast_update || []) {
    assert.ok(op.fact_add.startsWith('Offscreen \u2014 '));
    assert.notEqual(op.name, 'Brannoc', 'the villain does not walk on the ravens\u2019 wings');
  }
}

// A short absence is a short account.
assert.equal(absenceBatches({ codex, lastSealTs: now - 2 * DAY, now }).length, 2);

// What the ravens bring traces, line for line, to sealed ops — the
// freshest word per soul winning.
const recap = composeRecap({ tickEntries: batchesA, annal: 'Act 1 \u2014 the ford held.' });
assert.ok(recap.lines.length >= 1);
const sealedFacts = new Set();
for (const entry of batchesA) {
  for (const op of entry.dm.story.cast_update || []) {
    sealedFacts.add(`${op.name} ${op.fact_add.replace(/^Offscreen \u2014 /, '')}`);
  }
}
for (const line of recap.lines) {
  assert.ok(sealedFacts.has(line), `a recap line must be a sealed fact: ${line}`);
}
assert.ok(recap.text.startsWith('While you were away \u2014'));
assert.ok(recap.text.includes('Last the record tells: Act 1 \u2014 the ford held.'));

// Zero absence is zero noise: no ticks, no recap, no ravens.
assert.equal(absenceBatches({ codex, lastSealTs: now, now }).length, 0);
const silence = composeRecap({ tickEntries: [] });
assert.equal(silence.lines.length, 0);
assert.equal(silence.text, '');

console.log('PASS \u2014 the ravens gate: absence is counted honestly and capped, batches are deterministic and ops-only, every recap line traces to a sealed fact, and zero absence is zero noise.');
