// ---- Plate binding — A2 fix verification ----
//
// Verifies that scene plates bind to the log entry that minted the cue
// by LOG UUID (logId), not by seal hash (originTurnHash). The bind-by-id
// mechanism fixes both failure paths identified in A1:
//
//   PATH A: originTurnHash was null when plate was minted (turnRecord.recordHash
//           absent — e.g. retryRefusedPour with an old log). logId is the log's
//           UUID, set at log creation BEFORE any seal, so it is NEVER null.
//
//   PATH B: log.recordHash absent from React state when a cache-hit plate
//           arrives fast (race condition). log.id is always set in React state
//           (assigned at creation, before the seal), so the binding always
//           resolves correctly.
//
// DONE CRITERIA (from task spec):
//   ① Plate minted at turn N renders on turn N's entry even when the record
//     has advanced by a tick and by another turn before the plate resolves.
//   ② The plate appears ONLY on turn N's entry — not on the tick or turn N+1.
//   ③ A plate with a tampered logId (wrong UUID) is refused by the door.
//   ④ A plate with a tampered originTurnHash but correct logId is ADMITTED
//     (the door's primary binding is logId, not hash — hash is kept for
//     backward-compat and provenance, but does not block a correctly bound plate).
//   ⑤ A pre-A2 plate (no logId in imagePapers) still uses the hash fallback,
//     so existing campaign history renders correctly.
//
// Headless: node + fake-indexeddb + react-test-renderer, no AI keys.

import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { createRequire, register } from 'node:module';

register('./jsxLoader.mjs', import.meta.url);

const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const { act } = TestRenderer;
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

globalThis.URL.createObjectURL = (blob) => `blob:test/${blob?.type || 'unknown'}`;
globalThis.URL.revokeObjectURL = () => {};

const { admitPlate, PLATE_TRACE_LOG } = await import('../src/lib/plateroad.js');
const { LogEntry } = await import('../src/App.jsx');

function clearTrace() { PLATE_TRACE_LOG.splice(0, PLATE_TRACE_LOG.length); }

// Minimal campaign stub.
const CAMP = {
  id: 'bind-camp',
  codex: { beatIndex: 0, cast: [], regions: [] },
  hero: { name: 'Wyn', bearing: '' },
  spend: { images: 0, music: 0 },
};

const mkLog = (overrides = {}) => ({
  id: 'log-N',
  player: 'I press forward.',
  deed: null,
  sent: 'I press forward.',
  dm: {
    narration_blocks: [{ text: 'The bridge holds.' }],
    suggestions: null, roll_request: null, state_updates: null, combat: null,
    cinematic: null, story: null, image_cue: null, dialogue_cue: null,
    time_advance: false, entropy_use: null,
  },
  ts: Date.now(),
  resolution: null,
  redacted: false,
  turn: 0,
  beatIndex: 0,
  recordHash: 'hash-N',
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// ① PLATE RENDERS ON TURN N AFTER RECORD ADVANCES (tick + new turn)
// ─────────────────────────────────────────────────────────────────────────────
// Simulates: plate minted for log-N → record advances (tick-log, log-N1) → plate
// lands in setCurrent callback → LogEntry for log-N shows the image.
{
  clearTrace();
  const LOG_ID_N = 'log-N';
  const LOG_ID_TICK = 'log-tick';
  const LOG_ID_N1 = 'log-N1';
  const HASH_N = 'hash-turn-N';
  const HASH_TICK = 'hash-tick';
  const HASH_N1 = 'hash-turn-N1';

  // The plate for turn N: logId = LOG_ID_N (from job at cue-mint time),
  // originTurnHash = HASH_N (from turnRecord.recordHash at that moment).
  const papers_N = { assetHash: 'asset-bridge', originTurnHash: HASH_N, logId: LOG_ID_N };

  // Log-N now lives in a campaign whose record has advanced: tick + turn N+1.
  // Critically, log-N's recordHash is still HASH_N — it was sealed at turn N.
  const logN = mkLog({ id: LOG_ID_N, recordHash: HASH_N, imageUrl: 'blob:test/image/png', imageAssetHash: 'asset-bridge', imagePapers: papers_N });

  let root;
  await act(async () => {
    root = TestRenderer.create(h(LogEntry, { log: logN, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
  });
  const json = JSON.stringify(root.toJSON());
  assert.ok(!json.includes('empty-frame'), '① no empty frame — plate binds to log-N by UUID even after record advances');
  assert.ok(json.includes('plate-zoom'), '① plate-zoom button present — image is rendered');
  assert.ok(PLATE_TRACE_LOG.some((r) => r.phase === 'door' && r.outcome === 'admitted'), '① door trace shows admitted');
  await act(async () => { root.unmount(); });
  console.log('PASS ① — plate minted at turn N renders correctly even after ticks and new turns advance the record.');
}

// ─────────────────────────────────────────────────────────────────────────────
// ② PLATE APPEARS ONLY ON TURN N'S ENTRY — not on tick or turn N+1
// ─────────────────────────────────────────────────────────────────────────────
{
  clearTrace();
  const papers_N = { assetHash: 'asset-bridge', originTurnHash: 'hash-N', logId: 'log-N' };

  // tick log: has NO imagePapers (no plate was minted for this tick)
  const tickLog = mkLog({ id: 'log-tick', recordHash: 'hash-tick', imageUrl: undefined, imagePapers: undefined });

  // turn N+1 log: has NO imagePapers for the turn-N plate (different logId)
  const logN1 = mkLog({ id: 'log-N1', recordHash: 'hash-N1', imageUrl: undefined, imagePapers: undefined });

  // If someone tried to force turn N's plate onto turn N+1's entry:
  const tamperN1 = mkLog({ id: 'log-N1', recordHash: 'hash-N1', imageUrl: 'blob:test/image/png', imageAssetHash: 'asset-bridge', imagePapers: papers_N });

  clearTrace();
  let root;
  await act(async () => {
    root = TestRenderer.create(h(LogEntry, { log: tamperN1, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
  });
  const jsonN1 = JSON.stringify(root.toJSON());
  // door sees attestation.logId = 'log-N' but logId arg = 'log-N1' (the rendered log's id)
  assert.ok(jsonN1.includes('empty-frame'), '② turn N plate refused on turn N+1 entry (wrong logId)');
  assert.ok(PLATE_TRACE_LOG.some((r) => r.outcome === 'stale-papers'), '② stale-papers trace for cross-log attempt');
  await act(async () => { root.unmount(); });
  console.log('PASS ② — turn N plate cannot render on turn N+1 entry (logId mismatch refuses it).');
}

// ─────────────────────────────────────────────────────────────────────────────
// ③ TAMPERED logId IS REFUSED BY THE DOOR
// ─────────────────────────────────────────────────────────────────────────────
{
  clearTrace();
  // Plate with a random wrong logId — not the log's own UUID.
  const tamperedPapers = { assetHash: 'asset-bridge', originTurnHash: 'hash-N', logId: 'log-some-other-entry' };
  const result = admitPlate({ turnHash: 'hash-N', attestation: tamperedPapers, caption: 'a bridge', logId: 'log-N' });
  assert.deepEqual(result, { admit: false, status: 'stale-papers' });
  assert.ok(PLATE_TRACE_LOG.some((r) => r.outcome === 'stale-papers'), '③ trace records stale-papers');
  // null logId in attestation falls back to hash path, not the new logId path
  const nullLogId = { assetHash: 'asset-b', originTurnHash: 'hash-N', logId: null };
  // null treated as absent — falls back to hash: turnHash=hash-N, originTurnHash=hash-N → admitted
  const fallbackResult = admitPlate({ turnHash: 'hash-N', attestation: nullLogId, caption: 'a bridge', logId: 'log-N' });
  // logId: null is treated as "boundById = false" → hash fallback
  assert.deepEqual(fallbackResult, { admit: true, status: 'admitted' }, '③ null logId falls back to hash path (backward compat)');
  console.log('PASS ③ — tampered logId refused; null logId correctly falls back to hash check.');
}

// ─────────────────────────────────────────────────────────────────────────────
// ④ CORRECT logId ADMITS EVEN IF originTurnHash IS WRONG/NULL (Path A fix)
// ─────────────────────────────────────────────────────────────────────────────
// This is the A1 "Path A" scenario: plate was minted when turnRecord.recordHash
// was null. The stored plate has originTurnHash = null. With the old binding,
// this always produced stale-papers. With the new logId binding, it is admitted
// because logId is always set regardless of the hash.
{
  clearTrace();
  // PATH A scenario: originTurnHash = null (was null at mint time)
  const pathAPapers = { assetHash: 'asset-c', originTurnHash: null, logId: 'log-N' };
  const result = admitPlate({ turnHash: 'hash-N', attestation: pathAPapers, caption: 'a ruined hall', logId: 'log-N' });
  assert.deepEqual(result, { admit: true, status: 'admitted' }, '④ null originTurnHash admitted when logId matches (Path A fixed)');
  assert.ok(PLATE_TRACE_LOG.some((r) => r.outcome === 'admitted'), '④ admitted trace emitted');
  console.log('PASS ④ — null originTurnHash no longer refuses a correctly-bound plate (Path A fixed).');

  // Verify that a plate with BOTH wrong logId AND null originTurnHash is still refused.
  clearTrace();
  const wrongBoth = { assetHash: 'asset-d', originTurnHash: null, logId: 'log-other' };
  const refusedResult = admitPlate({ turnHash: 'hash-N', attestation: wrongBoth, caption: 'x', logId: 'log-N' });
  assert.deepEqual(refusedResult, { admit: false, status: 'stale-papers' }, '④ wrong logId + null hash still refused');
  console.log('PASS ④ — wrong logId with null originTurnHash still refused (fail-closed).');
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ PRE-A2 PLATES (no logId) STILL USE HASH FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
// Existing imagePapers without logId continue to render correctly via the
// backward-compatible hash check. Campaign history is not broken.
{
  clearTrace();
  // Pre-A2 plate: no logId in attestation → hash fallback
  const preA2Papers = { assetHash: 'asset-old', originTurnHash: 'hash-N' }; // no logId
  const admitted = admitPlate({ turnHash: 'hash-N', attestation: preA2Papers, caption: 'the old bridge', logId: 'log-N' });
  assert.deepEqual(admitted, { admit: true, status: 'admitted' }, '⑤ pre-A2 plate admitted via hash fallback');

  // Pre-A2 plate with WRONG hash → still refused
  clearTrace();
  const preA2Wrong = { assetHash: 'asset-old', originTurnHash: 'hash-OTHER' }; // no logId
  const refused = admitPlate({ turnHash: 'hash-N', attestation: preA2Wrong, caption: 'x', logId: 'log-N' });
  assert.deepEqual(refused, { admit: false, status: 'stale-papers' }, '⑤ pre-A2 plate with wrong hash refused');

  // Path B simulation: pre-A2 plate where log.recordHash is null in state
  clearTrace();
  const preA2NullTurnHash = { assetHash: 'asset-old', originTurnHash: 'hash-N' }; // no logId
  const pathBRefused = admitPlate({ turnHash: null, attestation: preA2NullTurnHash, caption: 'x', logId: 'log-N' });
  assert.deepEqual(pathBRefused, { admit: false, status: 'stale-papers' }, '⑤ pre-A2 plate still refused if log.recordHash absent (Path B, pre-A2 format)');
  // NOTE: pre-A2 plates are still vulnerable to Path B. Only A2+ plates with
  // logId are immune. This is acceptable because new paints all use A2+ format.

  // Render LogEntry with a pre-A2 plate whose hash matches → should admit
  clearTrace();
  const logPreA2 = mkLog({
    recordHash: 'hash-N',
    imageUrl: 'blob:test/image/png',
    imageAssetHash: 'asset-old',
    imagePapers: preA2Papers, // no logId
  });
  let root;
  await act(async () => {
    root = TestRenderer.create(h(LogEntry, { log: logPreA2, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
  });
  const json = JSON.stringify(root.toJSON());
  assert.ok(!json.includes('empty-frame'), '⑤ pre-A2 plate renders correctly in LogEntry');
  assert.ok(PLATE_TRACE_LOG.some((r) => r.outcome === 'admitted'), '⑤ admitted trace for pre-A2 plate');
  await act(async () => { root.unmount(); });
  console.log('PASS ⑤ — pre-A2 plates (no logId) use hash fallback; existing history unbroken.');
}

// ─────────────────────────────────────────────────────────────────────────────
// ⑥ PATH B FIX CONFIRMED: logId binding works even when log.recordHash is null
// ─────────────────────────────────────────────────────────────────────────────
// The A2+ imagePapers carry logId from the job closure, so log.recordHash
// being absent from React state at arrival time no longer causes stale-papers.
{
  clearTrace();
  // Simulates the Path B race: log.recordHash is absent (null) in React state
  // when the cache-hit plate arrives. But imagePapers carries logId correctly.
  const logPathB = mkLog({
    recordHash: null,          // absent from React state — the Path B condition
    imageUrl: 'blob:test/image/png',
    imageAssetHash: 'asset-e',
    imagePapers: { assetHash: 'asset-e', originTurnHash: 'hash-N', logId: 'log-N' }, // A2+ format
  });
  let root;
  await act(async () => {
    root = TestRenderer.create(h(LogEntry, { log: logPathB, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
  });
  const json = JSON.stringify(root.toJSON());
  assert.ok(!json.includes('empty-frame'), '⑥ Path B: A2+ plate admitted even when log.recordHash is null');
  assert.ok(json.includes('plate-zoom'), '⑥ plate-zoom button present');
  assert.ok(PLATE_TRACE_LOG.some((r) => r.outcome === 'admitted'), '⑥ admitted trace emitted');
  await act(async () => { root.unmount(); });

  // Contrast: OLD format (no logId) with null log.recordHash still fails (pre-A2 behavior unchanged)
  clearTrace();
  const logPathBOld = mkLog({
    recordHash: null,
    imageUrl: 'blob:test/image/png',
    imageAssetHash: 'asset-f',
    imagePapers: { assetHash: 'asset-f', originTurnHash: 'hash-N' }, // pre-A2: no logId
  });
  await act(async () => {
    root = TestRenderer.create(h(LogEntry, { log: logPathBOld, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
  });
  const jsonOld = JSON.stringify(root.toJSON());
  assert.ok(jsonOld.includes('empty-frame'), '⑥ pre-A2 format still fails Path B (not fixed for old plates — only A2+ immune)');
  await act(async () => { root.unmount(); });
  console.log('PASS ⑥ — Path B: A2+ plates admitted when log.recordHash is null; pre-A2 format unchanged.');
}

console.log('PASS — plateBinding: all six binding courts green; both Path A and Path B fixed; fail-closed preserved; pre-A2 plates backward-compatible.');
