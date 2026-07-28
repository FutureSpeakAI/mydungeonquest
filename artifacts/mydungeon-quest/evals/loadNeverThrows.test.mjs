// G1 — loadNeverThrows (Rules 24 and 25)
//
// Rule 24: the record survives the code — db.js must expose a raw-read
// path that works even when the campaign shape has drifted and normal
// replay would throw.
//
// Rule 25: export always works — exportRawJournal returns a stable
// envelope for any input: missing campaign, real campaign, malformed
// rows.
//
// Three courts:
//   1. Missing campaign — exportRawJournal returns an empty envelope,
//      does not throw, heroName / worldTitle are null.
//   2. Real campaign with journal rows — envelope carries rows and
//      campaignSnapshot; rowCount matches.
//   3. Malformed journal row — exportRawJournal does not throw even when
//      required fields are null / undefined.
//
// Node + fake-indexeddb — no browser, no keys.

import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

// Dynamic import so fake-indexeddb auto-installs before Dexie opens.
const { db, exportRawJournal } = await import('../src/lib/db.js');

// ── 1. Missing campaign ──────────────────────────────────────────────────
const result1 = await exportRawJournal('campaign-that-never-existed');
assert.equal(result1.campaignId, 'campaign-that-never-existed', 'campaignId is echoed back');
assert.ok(Array.isArray(result1.rows), 'rows is an array even for a missing campaign');
assert.equal(result1.rowCount, 0, 'rowCount is 0 for a missing campaign');
assert.equal(result1.heroName, null, 'heroName is null for a missing campaign');
assert.equal(result1.worldTitle, null, 'worldTitle is null for a missing campaign');
assert.ok(typeof result1.exportedAt === 'string', 'exportedAt is an ISO string');
assert.ok(result1.note && result1.note.includes('recovery'), 'note mentions recovery use');
console.log('PASS court 1 — exportRawJournal on missing campaign: stable empty envelope');

// ── 2. Real campaign with seeded journal rows ───────────────────────────
await db.campaigns.put({
  id: 'camp-g1-load',
  title: 'The Shattered Shore',
  hero: { name: 'Aelindra' },
  updatedAt: Date.now(),
});
await db.journal.put({ campaignId: 'camp-g1-load', i: 0, type: 'dm', kind: 'dm', ts: Date.now(), recordHash: 'hash-0', turn: 1 });
await db.journal.put({ campaignId: 'camp-g1-load', i: 1, type: 'dm', kind: 'dm', ts: Date.now(), recordHash: 'hash-1', turn: 2 });
await db.journal.put({ campaignId: 'camp-g1-load', i: 2, type: 'player', kind: 'player', ts: Date.now(), recordHash: 'hash-2', turn: 2 });

const result2 = await exportRawJournal('camp-g1-load');
assert.equal(result2.campaignId, 'camp-g1-load');
assert.equal(result2.rowCount, 3, 'rowCount matches seeded rows');
assert.equal(result2.heroName, 'Aelindra', 'heroName from campaign snapshot');
assert.equal(result2.worldTitle, 'The Shattered Shore', 'worldTitle from campaign snapshot');
assert.ok(result2.campaignSnapshot && result2.campaignSnapshot.id === 'camp-g1-load', 'campaignSnapshot present');
assert.ok(Array.isArray(result2.rows) && result2.rows.length === 3, 'rows array has correct length');
// Rows come back sorted by i; verify order
assert.equal(result2.rows[0].i, 0, 'rows sorted by i (ascending)');
assert.equal(result2.rows[2].i, 2, 'rows sorted by i (ascending)');
console.log('PASS court 2 — exportRawJournal on real campaign: envelope carries rows, snapshot, correct count');

// ── 3. Malformed row — must not throw ──────────────────────────────────
await db.journal.put({
  campaignId: 'camp-g1-load',
  i: 99,
  type: null,
  kind: undefined,
  ts: null,
  recordHash: null,
  turn: undefined,
});
let threw = false;
let result3;
try { result3 = await exportRawJournal('camp-g1-load'); }
catch { threw = true; }
assert.equal(threw, false, 'exportRawJournal must not throw even with a malformed row');
assert.equal(result3.rowCount, 4, 'malformed row is included in the count (raw = no filtering)');
console.log('PASS court 3 — exportRawJournal does not throw on malformed rows; malformed row included raw');

console.log(
  'PASS — G1 loadNeverThrows: exportRawJournal is present, stable, and returns a ' +
  'complete envelope for missing, valid, and malformed campaigns (Rules 24 and 25).',
);
