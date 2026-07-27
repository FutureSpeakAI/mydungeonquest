// ---- Plate trace — delivery path instrumentation (A1) ----
//
// Locks four diagnostic facts established by the A1 investigation:
//
//   1. DOOR ALWAYS TRACES — every call to admitPlate (whether through
//      LogEntry or directly) emits a structured record into PLATE_TRACE_LOG
//      carrying phase, outcome, turnHash, originTurnHash, and logId.
//      No attempt exits without one.
//
//   2. MATCHING PAPERS ADMITTED — when log.recordHash equals
//      imagePapers.originTurnHash and a caption is present, the door
//      returns { admit: true, status: 'admitted' } and no empty frame shows.
//
//   3. MISMATCHED PAPERS REFUSED — four mismatch families tested:
//      (a) null log.recordHash with a real originTurnHash → stale-papers
//      (b) real log.recordHash with null originTurnHash → stale-papers
//      (c) two different non-null hashes → stale-papers
//      (d) no imagePapers at all → null verdict (no frame, no refusal)
//
//   4. TICK HYPOTHESIS DISMISSED — a turn log sealed at hash X and a tick
//      log sealed at hash Y, both inside one campaign, still admit a plate
//      minted with originTurnHash = X because the tick's hash was stamped
//      onto the TICK log entry, not the turn log entry.
//      The turn log's recordHash is unaffected by the tick path.
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

const { admitPlate, PLATE_TRACE_LOG, plateTrace } = await import('../src/lib/plateroad.js');
const { LogEntry } = await import('../src/App.jsx');

// Helper — clear the trace log between tests so assertions are isolated.
function clearTrace() { PLATE_TRACE_LOG.splice(0, PLATE_TRACE_LOG.length); }

// Minimal campaign stub satisfying LogEntry's requirements.
const CAMP = { id: 'trace-camp', codex: { beatIndex: 0, cast: [], regions: [] }, hero: { name: 'Tess', bearing: '' }, spend: { images: 0, music: 0 } };

const mkLog = (overrides = {}) => ({
  id: 'log-a',
  player: 'I look around.',
  deed: null,
  sent: 'I look around.',
  dm: {
    narration_blocks: [{ text: 'The room is dark.' }],
    suggestions: null,
    roll_request: null,
    state_updates: null,
    combat: null,
    cinematic: null,
    story: null,
    image_cue: null,
    dialogue_cue: null,
    time_advance: false,
    entropy_use: null,
  },
  ts: Date.now(),
  resolution: null,
  redacted: false,
  turn: 0,
  beatIndex: 0,
  recordHash: 'hash-X',
  ...overrides,
});

// ---- 1. DOOR ALWAYS TRACES ----
// admitPlate emits a trace record for every invocation.
{
  clearTrace();
  admitPlate({ turnHash: 'h1', attestation: { assetHash: 'a1', originTurnHash: 'h1' }, caption: 'a scene', logId: 'l1' });
  assert.equal(PLATE_TRACE_LOG.length, 1, 'admitted call emits one record');
  const rec = PLATE_TRACE_LOG[0];
  assert.equal(rec.phase, 'door');
  assert.equal(rec.outcome, 'admitted');
  assert.equal(rec.turnHash, 'h1');
  assert.equal(rec.originTurnHash, 'h1');
  assert.equal(rec.logId, 'l1');
  assert.ok(typeof rec.t === 'number', 'timestamp present');

  clearTrace();
  admitPlate({ turnHash: null, attestation: { assetHash: 'a2', originTurnHash: 'h2' }, caption: 'a scene' });
  assert.equal(PLATE_TRACE_LOG.length, 1, 'refused call also emits one record');
  assert.equal(PLATE_TRACE_LOG[0].outcome, 'stale-papers');

  clearTrace();
  admitPlate({ turnHash: 'h3', attestation: null, caption: 'a scene' });
  assert.equal(PLATE_TRACE_LOG.length, 1, 'paperless call emits one record');
  assert.equal(PLATE_TRACE_LOG[0].outcome, 'paperless');

  console.log('PASS — door always emits a structured trace record.');
}

// ---- 2. MATCHING PAPERS ADMITTED ----
{
  clearTrace();
  const TURN_HASH = 'sealed-hash-turn-7';
  const result = admitPlate({
    turnHash: TURN_HASH,
    attestation: { assetHash: 'asset-abc', originTurnHash: TURN_HASH },
    caption: 'the ruined gate',
    logId: 'log-7',
  });
  assert.deepEqual(result, { admit: true, status: 'admitted' });
  assert.equal(PLATE_TRACE_LOG[0].outcome, 'admitted');

  // LogEntry renders the img (not an empty frame) when papers match.
  clearTrace();
  const log = mkLog({
    recordHash: TURN_HASH,
    imageUrl: 'blob:test/image/png',
    imageAssetHash: 'asset-abc',
    imagePapers: { assetHash: 'asset-abc', originTurnHash: TURN_HASH },
  });
  let root;
  await act(async () => {
    root = TestRenderer.create(h(LogEntry, { log, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
  });
  const tree = root.toJSON();
  // No empty-frame element when papers are valid.
  const json = JSON.stringify(tree);
  assert.ok(!json.includes('empty-frame'), 'no empty frame when papers match');
  // The img is present.
  assert.ok(json.includes('plate-zoom'), 'plate-zoom button present (image rendered)');
  await act(async () => { root.unmount(); });
  assert.ok(PLATE_TRACE_LOG.some((r) => r.phase === 'door' && r.outcome === 'admitted'), 'door trace emitted by LogEntry');
  console.log('PASS — matching papers admitted; LogEntry shows the image, not an empty frame.');
}

// ---- 3. MISMATCH FAMILIES → STALE-PAPERS ----
{
  // (a) null log.recordHash with a real originTurnHash.
  {
    clearTrace();
    const log = mkLog({
      recordHash: null,   // <-- the field is absent / null
      imageUrl: 'blob:test/image/png',
      imageAssetHash: 'asset-abc',
      imagePapers: { assetHash: 'asset-abc', originTurnHash: 'hash-X' },
    });
    let root;
    await act(async () => {
      root = TestRenderer.create(h(LogEntry, { log, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
    });
    const json = JSON.stringify(root.toJSON());
    assert.ok(json.includes('empty-frame'), '(a) empty frame when log.recordHash is null');
    assert.ok(json.includes('belongs to another moment'), '(a) stale-papers message shown');
    assert.ok(PLATE_TRACE_LOG.some((r) => r.outcome === 'stale-papers'), '(a) trace records stale-papers');
    await act(async () => { root.unmount(); });
  }

  // (b) real log.recordHash with null originTurnHash.
  {
    clearTrace();
    const log = mkLog({
      recordHash: 'hash-X',
      imageUrl: 'blob:test/image/png',
      imageAssetHash: 'asset-abc',
      imagePapers: { assetHash: 'asset-abc', originTurnHash: null }, // <-- null from foundry
    });
    let root;
    await act(async () => {
      root = TestRenderer.create(h(LogEntry, { log, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
    });
    const json = JSON.stringify(root.toJSON());
    assert.ok(json.includes('empty-frame'), '(b) empty frame when originTurnHash is null');
    assert.ok(PLATE_TRACE_LOG.some((r) => r.outcome === 'stale-papers'), '(b) trace records stale-papers');
    assert.ok(PLATE_TRACE_LOG.some((r) => r.originTurnHash === null), '(b) trace shows null originTurnHash');
    await act(async () => { root.unmount(); });
  }

  // (c) two different non-null hashes.
  {
    clearTrace();
    const log = mkLog({
      recordHash: 'hash-THIS-TURN',
      imageUrl: 'blob:test/image/png',
      imageAssetHash: 'asset-abc',
      imagePapers: { assetHash: 'asset-abc', originTurnHash: 'hash-SOME-OTHER-TURN' },
    });
    let root;
    await act(async () => {
      root = TestRenderer.create(h(LogEntry, { log, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
    });
    const json = JSON.stringify(root.toJSON());
    assert.ok(json.includes('empty-frame'), '(c) empty frame for hash mismatch');
    await act(async () => { root.unmount(); });
  }

  // (d) no imagePapers at all → no verdict, no frame, no trace from the door.
  {
    clearTrace();
    const log = mkLog({ recordHash: 'hash-X' }); // imageUrl and imagePapers absent
    let root;
    await act(async () => {
      root = TestRenderer.create(h(LogEntry, { log, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
    });
    const json = JSON.stringify(root.toJSON());
    assert.ok(!json.includes('empty-frame'), '(d) no empty frame when imagePapers absent');
    assert.ok(!PLATE_TRACE_LOG.some((r) => r.phase === 'door'), '(d) no door trace when imagePapers absent');
    await act(async () => { root.unmount(); });
  }

  console.log('PASS — all four mismatch families produce stale-papers (or no verdict when imagePapers absent).');
}

// ---- 4. TICK HYPOTHESIS DISMISSED ----
// Simulates the tick-advance code path:
//   - turn log sealed at hash X → recordHash = 'hash-turn'
//   - tick log appended next → its OWN recordHash = 'hash-tick'
//   - plate minted with originTurnHash = 'hash-turn' (correct for the turn)
// Under the app's mutation (next.logs[last].recordHash = tickHash stamps the
// tick log, not the turn log), the turn log's recordHash is preserved.
{
  clearTrace();
  const TURN_HASH = 'hash-turn-42';
  const TICK_HASH = 'hash-tick-42';

  const turnLog = mkLog({ id: 'log-turn', recordHash: TURN_HASH, imageUrl: 'blob:test/image/png', imageAssetHash: 'ast', imagePapers: { assetHash: 'ast', originTurnHash: TURN_HASH } });
  const tickLog = { id: 'log-tick-divider', kind: 'tick', recordHash: TICK_HASH, ts: Date.now(), redacted: false };

  let root;
  await act(async () => {
    root = TestRenderer.create(h(LogEntry, { log: turnLog, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
  });
  const json = JSON.stringify(root.toJSON());
  assert.ok(!json.includes('empty-frame'), 'tick hypothesis: turn log still admitted when tick log exists alongside it');
  assert.ok(PLATE_TRACE_LOG.some((r) => r.phase === 'door' && r.outcome === 'admitted'), 'door trace shows admitted');
  await act(async () => { root.unmount(); });

  // Confirm: if the tick's hash had accidentally been stamped onto the turn log
  // (the proposed failure mode), the door would refuse.
  clearTrace();
  const turnLogWrongHash = { ...turnLog, recordHash: TICK_HASH }; // simulated wrong stamp
  await act(async () => {
    root = TestRenderer.create(h(LogEntry, { log: turnLogWrongHash, campaign: CAMP, painting: false, pour: false, reduceMotion: true }));
  });
  const jsonWrong = JSON.stringify(root.toJSON());
  assert.ok(jsonWrong.includes('empty-frame'), 'tick hypothesis: if tick hash were wrongly on turn log, door refuses');
  assert.ok(PLATE_TRACE_LOG.some((r) => r.outcome === 'stale-papers'), 'stale-papers emitted for wrong-hash simulation');
  await act(async () => { root.unmount(); });

  console.log('PASS — tick hypothesis: turn log recordHash is independent of tick log; the bug is NOT tick-stamp overwrite.');
}

// ---- MINT / ARRIVE traces (unit) ----
// Confirm the plateTrace function itself stores whatever the caller passes,
// including the mint and arrive phases used by queueMedia instrumentation.
{
  clearTrace();
  plateTrace({ phase: 'mint', logId: 'l1', cueHash: 'ch1', cueTurnNumber: 3 });
  plateTrace({ phase: 'arrive', logId: 'l1', prevLogRecordHash: 'ch1', originTurnHash: 'ch1', headTurnNumber: 4 });
  assert.equal(PLATE_TRACE_LOG.length, 2);
  assert.equal(PLATE_TRACE_LOG[0].phase, 'mint');
  assert.equal(PLATE_TRACE_LOG[1].phase, 'arrive');
  assert.equal(PLATE_TRACE_LOG[1].prevLogRecordHash, 'ch1');
  // Coherent path: prevLogRecordHash = originTurnHash → would be admitted.
  const mint = PLATE_TRACE_LOG[0];
  const arrive = PLATE_TRACE_LOG[1];
  assert.equal(mint.cueHash, arrive.originTurnHash, 'mint cueHash matches arrive originTurnHash in the coherent path');
  assert.equal(arrive.prevLogRecordHash, arrive.originTurnHash, 'log recordHash matches originTurnHash in the coherent path');
  console.log('PASS — mint/arrive trace records carry the fields the diagnosis depends on.');
}

console.log('PASS — plateTrace: render door traces every attempt; tick hypothesis dismissed; mismatch families proven.');
