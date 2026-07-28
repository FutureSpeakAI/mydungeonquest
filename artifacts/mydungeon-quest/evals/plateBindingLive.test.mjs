// G3 — plateBindingLive (Rule 21: campaigns are isolated)
//
// Proves that the scene plate job's cacheKey is ALWAYS campaign-scoped
// and never falls back to `undefined`. Before the G3 fix the key was
// conditional: `turnRecord.recordHash ? \`scene:...\` : undefined`.
// An undefined cacheKey causes the Foundry to use spec.hash instead —
// which is content-addressed and shared across campaigns. If any other
// campaign's media row carries that spec.hash, the E3 boundary assertion
// at foundry.js throws `[E3] campaign isolation violated` and the plate
// job fails silently.
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

// The logId fallback: when recordHash is null (turn not yet sealed at
// briefing time) the key must still be non-null via logId.
assert.ok(
  scenePlateLine.includes('|| logId') || scenePlateLine.includes('||logId'),
  'Scene plate cacheKey must use logId as fallback when recordHash is absent — logId is a stable turn UUID that is always defined at job-brief time',
);

// Also verify the Foundry's campaignIsolation eval still covers the E3 path.
const isolationEval = readFileSync(path.join(ROOT, 'evals/campaignIsolation.test.mjs'), 'utf8');
assert.ok(
  isolationEval.includes('E3') && isolationEval.includes('boundary assertion'),
  'campaignIsolation.test.mjs must hold the E3 boundary assertion (belt-and-suspenders with this structural check)',
);

console.log(
  'PASS — G3 plateBindingLive: the scene plate cacheKey is always campaign-scoped ' +
  '(campaign.id + recordHash, logId fallback); no `: undefined` path survives; ' +
  'E3 boundary assertion guard confirmed present in campaignIsolation.test.mjs.',
);
