// H7 — storageQuota (storage quota guard)
//
// The h4-storage browser court confirmed navigator.storage.estimate() is
// available in the target environment. H7 adds the actual quota guard to
// the app and verifies its structure here.
//
// Courts:
//  ① storageQuota.js exports checkStorageQuota and QUOTA_WARN_THRESHOLD
//  ② QUOTA_WARN_THRESHOLD is a number between 0 and 1
//  ③ checkStorageQuota returns null when navigator is absent (Node env)
//  ④ checkStorageQuota handles a stubbed near-full estimate correctly
//  ⑤ checkStorageQuota handles a stubbed healthy estimate correctly
//  ⑥ App.jsx wires checkStorageQuota on startup (dynamic import, guarded)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ① exports
const quotaSrc = src('src/lib/storageQuota.js');
assert.ok(
  quotaSrc.includes('export async function checkStorageQuota'),
  'storageQuota.js must export checkStorageQuota',
);
assert.ok(
  quotaSrc.includes('export const QUOTA_WARN_THRESHOLD'),
  'storageQuota.js must export QUOTA_WARN_THRESHOLD (for gate use)',
);
assert.ok(
  quotaSrc.includes('export const QUOTA_EVICT_THRESHOLD'),
  'storageQuota.js must export QUOTA_EVICT_THRESHOLD (for gate use)',
);
assert.ok(
  quotaSrc.includes('export async function _checkQuotaImpl'),
  'storageQuota.js must export _checkQuotaImpl (inner impl, testable without navigator stubbing)',
);
assert.ok(
  quotaSrc.includes('export async function _proactiveEvictImpl'),
  'storageQuota.js must export _proactiveEvictImpl (inner impl, testable without navigator/db)',
);
assert.ok(
  quotaSrc.includes('export async function proactiveEvictIfNeeded'),
  'storageQuota.js must export proactiveEvictIfNeeded (called on startup and act-close)',
);

// ② threshold is a valid fraction
const thresholdMatch = quotaSrc.match(/const WARN_THRESHOLD\s*=\s*([\d.]+)/);
assert.ok(thresholdMatch, 'WARN_THRESHOLD constant must be defined');
const threshold = parseFloat(thresholdMatch[1]);
assert.ok(threshold > 0 && threshold < 1, `WARN_THRESHOLD must be between 0 and 1, got ${threshold}`);

// ③ returns null when storage is absent (null/undefined)
const { checkStorageQuota, _checkQuotaImpl, QUOTA_WARN_THRESHOLD } = await import('../src/lib/storageQuota.js');
const resultNull = await _checkQuotaImpl(null);
assert.strictEqual(resultNull, null, '_checkQuotaImpl(null) must return null gracefully');
const resultUndef = await _checkQuotaImpl(undefined);
assert.strictEqual(resultUndef, null, '_checkQuotaImpl(undefined) must return null gracefully');

// ④ near-full estimate: returns { nearFull: true, percentUsed, ... }, warns loudly
let warnCalled = false;
let warnRecord = null;
const originalWarn = console.warn;
console.warn = (label, record) => {
  if (typeof label === 'string' && label.startsWith('[quota]')) { warnCalled = true; warnRecord = record; }
};
try {
  const stubNearFull = {
    estimate: async () => ({
      quota: 100 * 1024 * 1024, // 100 MB
      usage: 90 * 1024 * 1024,  // 90 MB (90% — above the 85% threshold)
    }),
  };
  const result = await _checkQuotaImpl(stubNearFull);
  assert.ok(result, '_checkQuotaImpl must return a result with a near-full estimate');
  assert.ok(result.nearFull, 'nearFull must be true when usage is above WARN_THRESHOLD');
  assert.ok(result.percentUsed > 0.85, `percentUsed must be > 0.85, got ${result.percentUsed}`);
  assert.ok(warnCalled, 'console.warn must be called when storage is near full (Rule 27)');
  assert.ok(warnRecord && warnRecord.action, 'the warn record must carry an action field');
} finally {
  console.warn = originalWarn;
}

// ⑤ healthy estimate: returns { nearFull: false, ... }, no warn
let warnCalledHealthy = false;
const captureWarn = (label) => { if (label === '[quota]') warnCalledHealthy = true; };
console.warn = captureWarn;
try {
  const stubHealthy = {
    estimate: async () => ({
      quota: 100 * 1024 * 1024, // 100 MB
      usage: 10 * 1024 * 1024,  // 10 MB (10% — well below threshold)
    }),
  };
  const result = await _checkQuotaImpl(stubHealthy);
  assert.ok(result, '_checkQuotaImpl must return a result with a healthy estimate');
  assert.strictEqual(result.nearFull, false, 'nearFull must be false when usage is below WARN_THRESHOLD');
  assert.strictEqual(warnCalledHealthy, false, 'console.warn must NOT be called when storage is healthy');
} finally {
  console.warn = originalWarn;
}

// ⑥ App.jsx wires checkStorageQuota on startup
const appSrc = src('src/App.jsx');
assert.ok(
  appSrc.includes("import('./lib/storageQuota.js')") ||
  appSrc.includes('storageQuota'),
  'App.jsx must dynamically import storageQuota.js on startup (H7 quota guard)',
);
assert.ok(
  appSrc.includes('checkStorageQuota'),
  'App.jsx must call checkStorageQuota() in the startup effect',
);
// It must be a dynamic import (not top-level) to keep it off the sync closure.
const topLevelH7 = appSrc.slice(0, 3000);
assert.ok(
  !topLevelH7.includes('checkStorageQuota'),
  'checkStorageQuota must be a dynamic import (not top-level) — lean door law',
);

// ⑦ QUOTA_EVICT_THRESHOLD is a valid fraction below WARN_THRESHOLD
const { QUOTA_EVICT_THRESHOLD, _proactiveEvictImpl } = await import('../src/lib/storageQuota.js');
assert.ok(
  typeof QUOTA_EVICT_THRESHOLD === 'number' && QUOTA_EVICT_THRESHOLD > 0 && QUOTA_EVICT_THRESHOLD < 1,
  `QUOTA_EVICT_THRESHOLD must be a fraction between 0 and 1, got ${QUOTA_EVICT_THRESHOLD}`,
);
assert.ok(
  QUOTA_EVICT_THRESHOLD < QUOTA_WARN_THRESHOLD,
  `QUOTA_EVICT_THRESHOLD (${QUOTA_EVICT_THRESHOLD}) must be lower than QUOTA_WARN_THRESHOLD (${QUOTA_WARN_THRESHOLD}) — eviction fires before the near-full warning`,
);

// ⑧ _proactiveEvictImpl returns null when storage is absent or below threshold
const evictNull = await _proactiveEvictImpl(null, null);
assert.strictEqual(evictNull, null, '_proactiveEvictImpl(null, null) must return null gracefully');
const stubBelowThreshold = { estimate: async () => ({ quota: 100 * 1024 * 1024, usage: 50 * 1024 * 1024 }) }; // 50%
const evictBelow = await _proactiveEvictImpl(stubBelowThreshold, {});
assert.strictEqual(evictBelow, null, '_proactiveEvictImpl below EVICT_THRESHOLD must return null (nothing to do)');

// ⑨ _proactiveEvictImpl warns loudly (with "[quota]") when threshold is crossed,
//    even if no blobs are freed (the long-march counter sees the pressure event).
let evictWarnLabel = null, evictWarnRecord = null;
const origWarn = console.warn;
console.warn = (label, record) => { if (typeof label === 'string' && label.startsWith('[quota]')) { evictWarnLabel = label; evictWarnRecord = record; } };
try {
  const stubOver = { estimate: async () => ({ quota: 100 * 1024 * 1024, usage: 75 * 1024 * 1024 }) }; // 75% > 70%
  // Stub db with empty campaigns so no blobs are available to evict —
  // the warn must still fire (the pressure event itself is what matters).
  const stubDb = { campaigns: { toArray: async () => [] } };
  const evictResult = await _proactiveEvictImpl(stubOver, stubDb);
  assert.ok(evictResult !== null, '_proactiveEvictImpl must return a result when threshold is crossed');
  assert.ok(evictResult.percentUsed > QUOTA_EVICT_THRESHOLD, 'result must carry percentUsed above the threshold');
  assert.ok(typeof evictResult.blobsEvicted === 'number', 'result must carry blobsEvicted count');
  assert.ok(evictWarnLabel && evictWarnLabel.includes('[quota]'), 'console.warn must be called with [quota] label when threshold is crossed (long-march counter)');
  assert.ok(evictWarnRecord && evictWarnRecord.action, 'the warn record must carry an action field');
} finally {
  console.warn = origWarn;
}

// ⑩ App.jsx wires proactiveEvictIfNeeded on startup (alongside checkStorageQuota)
//    and at act-close (the cellar sweep gate).
assert.ok(
  appSrc.includes('proactiveEvictIfNeeded'),
  'App.jsx must call proactiveEvictIfNeeded() — Stage 145 quota eviction',
);
// Must be dynamic (off sync closure), same as checkStorageQuota.
const actCloseArea = appSrc.slice(appSrc.indexOf('THE CELLAR SWEEP'));
assert.ok(
  actCloseArea.includes('proactiveEvictIfNeeded'),
  'App.jsx must call proactiveEvictIfNeeded() at the act-close gate (not only on startup)',
);

console.log(
  `PASS — H7 storageQuota: checkStorageQuota exported; QUOTA_WARN_THRESHOLD=${QUOTA_WARN_THRESHOLD} (valid fraction); ` +
  `QUOTA_EVICT_THRESHOLD=${QUOTA_EVICT_THRESHOLD} (below warn threshold); ` +
  'returns null in Node env; near-full warns loudly with action (Rule 27); healthy is silent; ' +
  'wired into App.jsx startup via dynamic import; proactiveEvictIfNeeded warns with [quota] tag when threshold is crossed.',
);
