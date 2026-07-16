// ------------------------------------------------------------
// THE RAVENS GATE (game) — Directive V, Phase 4, the Raven Law.
//
// Proves the SEAT, not the arithmetic (the engine gates its own):
// absence measured from the last sealed record, one sealed batch per
// elapsed day capped by the engine, each batch sealed by the tick
// pattern with its hash on the log row and `absence` on the payload,
// the recap composed from the very rows just sealed (tracing by
// construction), zero absence is zero noise, and a completed tale
// keeps its rest. Zero keys, deterministic throughout.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { db } = await import('../src/lib/db.js');
const { makeEnvelope } = await import('../src/lib/seal.js');
const { greetReturning, latestAnnalOf } = await import('../src/lib/ravens.js');
const { ABSENCE_BATCH_CAP } = await import('fatescript/ravens');
const { fixtureCodex, HERO } = await import('../../../packages/engine/evals/fixtures.mjs');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 16);

const freshTale = (id, extraLogs = []) => ({
  id, title: 'The Ford', hero: { ...HERO }, codex: fixtureCodex(), logs: [...extraLogs],
  turnNumber: 12, completed: false, readOnly: false, headHash: null, turnCount: 0, signatureStatus: 'hash-only'
});

// Injected hands — the bench sealer (hash-only, crypto outside any tx).
const handsFor = (campaignId) => {
  let prevHash = null; let i = 0;
  return {
    seal: async (cid, type, payload) => {
      const envelope = await makeEnvelope({ type, i, prevHash, payload, ts: 1700000200000 + i });
      prevHash = envelope.recordHash; i += 1;
      await db.journal.put({ campaignId: cid, ...envelope });
      await db.campaigns.update(cid, { headHash: envelope.recordHash, turnCount: i, signatureStatus: 'hash-only' });
      return envelope;
    },
    save: async (next) => { await db.campaigns.put(next); },
    reload: async (cid) => db.campaigns.get(cid)
  };
};

// 1. ZERO ABSENCE IS ZERO NOISE — nothing sealed, nothing said.
{
  const tale = freshTale('raven-zero');
  await db.campaigns.put(tale);
  const { campaign, recap } = await greetReturning(tale, NOW - 2 * 60 * 60 * 1000, { now: NOW, ...handsFor('raven-zero') });
  assert.equal(recap, null, 'hours are not days');
  assert.equal(campaign.logs.length, 0, 'no rows appended');
  assert.equal(await db.journal.where('campaignId').equals('raven-zero').count(), 0, 'nothing sealed');
}

// 2. A COMPLETED TALE KEEPS ITS REST — the world of a sealed book does not move.
{
  const tale = { ...freshTale('raven-rest'), completed: true };
  await db.campaigns.put(tale);
  const { recap } = await greetReturning(tale, NOW - 5 * DAY, { now: NOW, ...handsFor('raven-rest') });
  assert.equal(recap, null, 'the ravens do not trouble a finished book');
  assert.equal(await db.journal.where('campaignId').equals('raven-rest').count(), 0);
}

// 3. THREE DAYS AWAY — three batches, sealed by the tick pattern,
//    recap tracing to the very rows just sealed.
{
  const annalRow = { id: 'a1', kind: 'annal', annal: 'Act 1. The ford held.', redacted: false, ts: 1, beatIndex: 0, dm: { narration_blocks: [] } };
  const tale = freshTale('raven-three', [annalRow]);
  await db.campaigns.put(tale);
  const { campaign, recap } = await greetReturning(tale, NOW - 3 * DAY, { now: NOW, ...handsFor('raven-three') });
  const rows = await db.journal.where('campaignId').equals('raven-three').toArray();
  assert.equal(rows.length, 3, 'one sealed batch per elapsed day');
  for (const row of rows) {
    assert.equal(row.type, 'tick', 'absence walks as ordinary ticks');
    assert.equal(row.payload.absence, true, 'marked as the ravens\u2019 walk');
  }
  const tickRows = campaign.logs.filter((log) => log.kind === 'tick' && log.absence);
  assert.equal(tickRows.length, 3, 'the book carries the walk');
  for (const log of tickRows) assert.ok(log.recordHash, 'each row carries its seal');
  assert.equal(campaign.headHash, rows[rows.length - 1].recordHash, 'the head settled onto the campaign');
  // The codex moved: offscreen facts landed on walking souls.
  const factCount = (codex) => (codex.cast || []).reduce((n, soul) => n + (soul.known_facts || []).length, 0);
  assert.ok(factCount(campaign.codex) > factCount(tale.codex), 'the world moved while the player was away');
  // The recap: every line traces to a sealed op, by construction.
  assert.ok(recap && recap.lines.length >= 1, 'the ravens brought word');
  const sealedFacts = rows.flatMap((row) => (row.payload.story?.cast_update || [])).map((op) => `${op.name} ${String(op.fact_add).replace(/^Offscreen \u2014 /, '')}`);
  for (const line of recap.lines) assert.ok(sealedFacts.includes(line), `a recap line is a sealed fact, verbatim: ${line}`);
  assert.ok(recap.text.includes('While you were away —'), 'the recap opens honestly');
  assert.ok(recap.text.includes('Last the record tells: Act 1. The ford held.'), 'the freshest annal rides the tail');
  assert.equal(latestAnnalOf(campaign.logs), 'Act 1. The ford held.');
  // No spoken turns were forged: narration stays empty on every walked row.
  for (const log of tickRows) assert.equal((log.dm.narration_blocks || []).length, 0, 'the ravens never speak in the DM\u2019s voice');
}

// 4. A MONTH AWAY MEETS THE CAP — souls walk, they do not sprint.
{
  const tale = freshTale('raven-month');
  await db.campaigns.put(tale);
  const { recap } = await greetReturning(tale, NOW - 30 * DAY, { now: NOW, ...handsFor('raven-month') });
  assert.equal(await db.journal.where('campaignId').equals('raven-month').count(), ABSENCE_BATCH_CAP, 'thirty days seal as the cap, not thirty');
  assert.ok(recap.lines.length >= 1);
  assert.ok(!recap.text.includes('Last the record tells:'), 'no annal, no tail — nothing invented');
}

// 5. DETERMINISM — the same absence over the same world says the same words.
{
  const a = await greetReturning(freshTale('raven-det-a'), NOW - 4 * DAY, { now: NOW, ...handsFor('raven-det-a') });
  const b = await greetReturning(freshTale('raven-det-b'), NOW - 4 * DAY, { now: NOW, ...handsFor('raven-det-b') });
  assert.equal(a.recap.text, b.recap.text, 'deterministic in (codex, absence)');
}

// 6. THE WIRING — the seat is real: the engine's law under the lib,
//    the hook on campaign open, the notice at the table.
{
  const lib = read('src/lib/ravens.js');
  assert.ok(lib.includes('fatescript/ravens'), 'the engine\u2019s law is the only raven law');
  const app = read('src/App.jsx');
  assert.ok(app.includes('greetReturning('), 'the open path greets the returning tale');
  assert.ok(app.includes('<RavenNotice'), 'the notice stands at the table');
  const notice = read('src/components/RavenNotice.jsx');
  assert.ok(notice.includes('What the Ravens Bring'), 'the return opens with the ravens\u2019 word');
}

console.log('PASS \u2014 the ravens gate (game): absence is measured from the last sealed record and walked one sealed batch per day under the engine\u2019s cap, each batch seals by the tick pattern with absence on the payload and its hash on the log row, the recap traces line-for-line to the rows just sealed with the freshest annal as its tail, zero absence is zero noise, a finished book keeps its rest, and the same absence says the same words.');
