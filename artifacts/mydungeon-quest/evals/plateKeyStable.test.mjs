// H3 — plateKeyStable (P16: recordHash fallback closes the plate bug)
//
// Confirms that the scene plate cache key is produced by a single shared
// function (scenePlateKey) that takes campaignId and logId, produces a
// stable, campaign-scoped key with no conditional on recordHash. A
// conditional that is absent at mint time but present at lookup would
// produce different keys and silently miss the cache on every post-seal
// request — re-opening the P13 plate bug through the fallback branch.
//
// Courts:
//  ① plateKey module exists and exports scenePlateKey
//  ② scenePlateKey produces the same key for identical inputs
//  ③ the key is campaign-scoped (contains both campaignId and logId)
//  ④ App.jsx scene plate job uses scenePlateKey, not a recordHash conditional
//  ⑤ App.jsx imports scenePlateKey from ./lib/cinema/plateKey.js
//  ⑥ the key expression has no || (conditional fallback) on the scene line
//
// Source-level / functional — no build, no AI keys required (Rule 26).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ① plateKey module exports scenePlateKey
const plateKeySrc = src('src/lib/cinema/plateKey.js');
assert.ok(
  plateKeySrc.includes('export const scenePlateKey'),
  'plateKey.js must export scenePlateKey',
);

// ② stable output — same inputs produce same key
const { scenePlateKey } = await import(
  pathToFileURL(path.join(ROOT, 'src/lib/cinema/plateKey.js'))
);
assert.equal(typeof scenePlateKey, 'function', 'scenePlateKey must be a function');
const campaignId = 'camp-abc';
const logId = 'log-xyz';
const keyA = scenePlateKey(campaignId, logId);
const keyB = scenePlateKey(campaignId, logId);
assert.equal(keyA, keyB, 'scenePlateKey must return the same key for the same inputs (mint === lookup)');

// ③ key is campaign-scoped and contains both identifiers
assert.ok(keyA.includes(campaignId), 'scenePlateKey output must contain campaignId');
assert.ok(keyA.includes(logId), 'scenePlateKey output must contain logId');
assert.ok(keyA.startsWith('scene:'), 'scenePlateKey output must start with "scene:"');

// ④ App.jsx scene plate job calls scenePlateKey
const appSrc = src('src/App.jsx');
const scenePlateLine = appSrc.split('\n').find((line) =>
  line.includes("kind: 'paint'") &&
  line.includes('priority: 1') &&
  line.includes('logId') &&
  line.includes('cacheKey'),
);
assert.ok(scenePlateLine, 'The scene plate job line must exist in App.jsx');
assert.ok(
  scenePlateLine.includes('scenePlateKey('),
  'Scene plate cacheKey must use the shared scenePlateKey() function — not an inline template literal',
);

// ⑤ App.jsx imports scenePlateKey from the correct module
assert.ok(
  appSrc.includes("from './lib/cinema/plateKey.js'") &&
  appSrc.includes('scenePlateKey'),
  "App.jsx must import scenePlateKey from './lib/cinema/plateKey.js'",
);

// ⑥ no recordHash conditional in the scene plate key expression
// The old pattern was `turnRecord.recordHash || logId` — the `||` was the trap.
// The new pattern is a direct scenePlateKey() call with no conditional.
assert.ok(
  !scenePlateLine.includes('recordHash'),
  'Scene plate cacheKey must not reference recordHash — recordHash is absent at mint time and would produce a different key at lookup',
);
assert.ok(
  !scenePlateLine.match(/cacheKey:.*\|\|.*logId/),
  'Scene plate cacheKey must not use the || logId fallback — the conditional is the P16 trap',
);

console.log(
  'PASS — H3 plateKeyStable: scene plate key is produced by scenePlateKey(campaignId, logId); ' +
  'stable across calls; campaign-scoped; no recordHash conditional; ' +
  'mint key === lookup key by construction.',
);
