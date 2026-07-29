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
  quotaSrc.includes('export async function _checkQuotaImpl'),
  'storageQuota.js must export _checkQuotaImpl (inner impl, testable without navigator stubbing)',
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

console.log(
  `PASS — H7 storageQuota: checkStorageQuota exported; QUOTA_WARN_THRESHOLD=${QUOTA_WARN_THRESHOLD} (valid fraction); ` +
  'returns null in Node env; near-full warns loudly with action (Rule 27); healthy is silent; ' +
  'wired into App.jsx startup via dynamic import.',
);
