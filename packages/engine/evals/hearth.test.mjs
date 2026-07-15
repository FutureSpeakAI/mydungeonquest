// THE HEARTH GATE — the Hearth Law holds or this file turns the build red.
import assert from 'node:assert/strict';
import { createMemoryVault, createHearthClient } from '../src/hearth.js';

const vault = createMemoryVault();
const chairA = createHearthClient({ vault, campaignId: 'tale-1' });
const chairB = createHearthClient({ vault, campaignId: 'tale-1' });
const row = (i, prev, salt, deed) => ({ i, prev, hash: `h${i}-${salt}`, payload: { deed } });

// Chair A seals two turns by the fire.
assert.equal(chairA.push(row(0, null, 'a', 'cross the ford')).ok, true);
assert.equal(chairA.push(row(1, 'h0-a', 'a', 'ask Mira')).ok, true);

// The same sealed row lands once, answers twice — idempotent by content.
const again = chairA.push(row(1, 'h0-a', 'a', 'ask Mira'));
assert.equal(again.ok, true);
assert.equal(again.deduped, true);
assert.equal(vault.pull('tale-1').length, 2, 'the dedup added nothing');

// Chair B wrote offline against an old head — the hearth's head wins.
const stale = chairB.push(row(1, 'h0-a', 'b', 'walk away'));
assert.equal(stale.ok, false);
assert.equal(stale.reason, 'stale-head');
assert.equal(stale.head.i, 1, 'the refusal names the true head');

// Right index, wrong link — refused as a broken chain.
const broken = chairB.push(row(2, 'h1-WRONG', 'b', 'forged link'));
assert.equal(broken.ok, false);
assert.equal(broken.reason, 'broken-chain');

// Malformed rows never enter the house.
assert.equal(vault.append('tale-1', { i: 3 }).ok, false);

// Sync reports honestly: known, merged, refused — and the losing deed
// comes home unsent, never lost.
const report = chairB.sync([
  row(1, 'h0-a', 'a', 'ask Mira'),      // already known
  row(1, 'h0-a', 'b', 'walk away'),     // the fork — refused
  row(2, 'h1-a', 'b', 'press on')       // lawful continuation — merged
]);
assert.equal(report.known.length, 1);
assert.equal(report.refused.length, 1);
assert.equal(report.refused[0].reason, 'stale-head');
assert.equal(report.refused[0].row.payload.deed, 'walk away', 'the unsent deed survives for its device');
assert.equal(report.merged.length, 1);

// Two chairs, one fire: byte-identical resume on either device.
assert.equal(JSON.stringify(chairA.resume()), JSON.stringify(chairB.resume()));
assert.equal(vault.head('tale-1').i, 2);

// Tales do not share a chimney.
assert.equal(vault.pull('tale-2').length, 0);
assert.throws(() => createHearthClient({}), /hearth/);

console.log('PASS \u2014 the hearth gate: two chairs share one fire, rows land once by hash, stale heads and broken chains are refused, and the losing deed comes home unsent.');
