// G3 — plateBindingLive (Rule 21: campaigns are isolated)
// Updated H3 — key now uses scenePlateKey(campaign.id, logId), no conditional.
//
// Proves that the scene plate job's cacheKey is ALWAYS campaign-scoped
// and never falls back to `undefined`. Before G3 the key was conditional:
// `turnRecord.recordHash ? \`scene:...\` : undefined`. An undefined cacheKey
// causes the Foundry to use spec.hash — shared across campaigns — and trips
// the E3 boundary assertion at foundry.js.
//
// H3 closes the P16 trap in the G3 fix: `|| logId` also produced different
// keys at mint (recordHash absent → logId) vs lookup (recordHash present →
// recordHash). The key now uses scenePlateKey(campaign.id, logId) — logId
// is a stable UUID that never changes across the seal boundary.
//
// Source-level court — no browser, no build, no AI keys.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');

// Locate the scene plate job line by its unique signature:
// kind:'paint', priority:1, logId, cacheKey all on the same line.
const scenePlateLine = src.split('\n').find((line) =>
  line.includes("kind: 'paint'") &&
  line.includes('priority: 1') &&
  line.includes('logId') &&
  line.includes('cacheKey'),
);

assert.ok(
  scenePlateLine,
  'The scene plate job line must exist in App.jsx',
);

// The old pattern: `cacheKey: turnRecord.recordHash ? ... : undefined`
// The ternary with `: undefined` must not appear.
assert.ok(
  !scenePlateLine.includes(': undefined'),
  'Scene plate cacheKey must never fall back to undefined — an undefined key causes the Foundry to use spec.hash, which is cross-campaign and trips the E3 boundary assertion',
);

// The key must always contain campaign.id so it is scoped.
assert.ok(
  scenePlateLine.includes('campaign.id'),
  'Scene plate cacheKey must embed campaign.id for campaign isolation (Rule 21)',
);

// H3: the key uses scenePlateKey(campaign.id, logId) — no conditional,
// no recordHash fallback. logId is always stable across the seal boundary.
assert.ok(
  scenePlateLine.includes('scenePlateKey('),
  'Scene plate cacheKey must use the shared scenePlateKey() function (H3) — no recordHash conditional allowed',
);
assert.ok(
  !scenePlateLine.includes('recordHash'),
  'Scene plate cacheKey must not reference recordHash — it is absent at mint time and would produce a different key at lookup (P16 trap)',
);

// Also verify the Foundry's campaignIsolation eval still covers the E3 path.
const isolationEval = readFileSync(path.join(ROOT, 'evals/campaignIsolation.test.mjs'), 'utf8');
assert.ok(
  isolationEval.includes('E3') && isolationEval.includes('boundary assertion'),
  'campaignIsolation.test.mjs must hold the E3 boundary assertion (belt-and-suspenders with this structural check)',
);

console.log(
  'PASS — G3/H3 plateBindingLive: the scene plate cacheKey is always campaign-scoped ' +
  'via scenePlateKey(campaign.id, logId); no recordHash conditional; no `:undefined` path; ' +
  'E3 boundary assertion guard confirmed present in campaignIsolation.test.mjs.',
);
