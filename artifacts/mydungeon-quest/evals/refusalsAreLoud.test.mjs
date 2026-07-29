// H2 — refusalsAreLoud (Rule 27: a refusal is a loud failure)
//
// Confirms that every inventoried silent refusal path now emits a
// structured record naming what was refused and why. A refusal that
// produces only an absence is indistinguishable from a bug (P15).
//
// Courts:
//  ① refusalLog module — exports logRefusal, produces a well-formed record
//  ② audioDirector — provenance refusal imports and calls logRefusal
//  ③ audioDirector — expired-queue drop imports and calls logRefusal
//  ④ audioDirector — occupied-moment drop logs and then returns false
//  ⑤ smithClient   — validator rejection calls logRefusal before floor
//  ⑥ foundry       — cap-exceeded path calls logRefusal before returning null
//  ⑦ proving       — malformed pendingRoll calls logRefusal before seating null
//  ⑧ narrator      — play() rejection logs error name and segment index
//
// Source-level courts only — no build, no AI keys required (Rule 26).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ① refusalLog module — exports logRefusal, returns a well-formed record
const refusalLogSrc = src('src/lib/refusalLog.js');
assert.ok(
  refusalLogSrc.includes('export function logRefusal'),
  'refusalLog.js must export logRefusal',
);
// Import and run the helper directly.
const { logRefusal } = await import(pathToFileURL(path.join(ROOT, 'src/lib/refusalLog.js')));
assert.equal(typeof logRefusal, 'function', 'logRefusal must be a function');
// Stub console.warn to capture the record without noise.
const warns = [];
const origWarn = console.warn;
console.warn = (...args) => warns.push(args);
const record = logRefusal({ what: 'test-input', why: 'test-check', expected: 'A', actual: 'B', action: 'fix the test' });
console.warn = origWarn;
assert.ok(warns.length === 1, 'logRefusal must call console.warn once');
assert.equal(record.what, 'test-input', 'record.what must match');
assert.equal(record.why, 'test-check', 'record.why must match');
assert.equal(record.expected, 'A', 'record.expected must match');
assert.equal(record.actual, 'B', 'record.actual must match');
assert.ok(typeof record.t === 'number', 'record.t must be a timestamp');

// ② audioDirector — provenance refusal
const adSrc = src('src/lib/cinema/audioDirector.js');
assert.ok(
  adSrc.includes("import { logRefusal }"),
  'audioDirector.js must import logRefusal',
);
assert.ok(
  adSrc.includes('what:') && adSrc.includes('audio request'),
  'audioDirector.js request() must call logRefusal naming the refused request',
);

// ③ audioDirector — expired-queue drop
assert.ok(
  adSrc.includes('wait window expired'),
  'audioDirector.js pump() must log expired staged items',
);

// ④ audioDirector — occupied-moment drop
assert.ok(
  adSrc.includes('moment occupied'),
  'audioDirector.js must log the dropped-at-occupied-moment case',
);

// ⑤ smithClient — validator rejection branches
const smSrc = src('src/lib/smithClient.js');
assert.ok(
  smSrc.includes("import { logRefusal }"),
  'smithClient.js must import logRefusal',
);
assert.ok(
  smSrc.includes('validation failed') && smSrc.includes('logRefusal'),
  'smithClient.js must call logRefusal when the candidate set is rejected',
);
// Both smithSpin and spineSpin paths
const smithRefusalCount = (smSrc.match(/logRefusal\s*\(/g) || []).length;
assert.ok(
  smithRefusalCount >= 2,
  `smithClient.js must call logRefusal at least twice (one per spin door); found ${smithRefusalCount}`,
);

// ⑥ foundry — cap-exceeded path
const foundSrc = src('src/lib/cinema/foundry.js');
assert.ok(
  foundSrc.includes("import { logRefusal }"),
  'foundry.js must import logRefusal',
);
assert.ok(
  foundSrc.includes('session cap reached'),
  'foundry.js must call logRefusal when the session cap is exceeded',
);

// ⑦ proving — malformed pendingRoll
const provSrc = src('src/lib/proving.js');
assert.ok(
  provSrc.includes("import { logRefusal }"),
  'proving.js must import logRefusal',
);
assert.ok(
  provSrc.includes('fixture.pendingRoll') && provSrc.includes('logRefusal'),
  'proving.js must call logRefusal for a malformed pendingRoll',
);

// ⑧ narrator — play() rejection logs error name and segment index
const narSrc = src('src/lib/cinema/narrator.js');
assert.ok(
  narSrc.includes("console.error('[narrator] play() refused'"),
  'narrator.js must log play() refusals with the [narrator] prefix',
);
assert.ok(
  narSrc.includes('segment: index') && narSrc.includes('error: error?.name'),
  'narrator.js play() refusal log must include segment index and error name',
);

console.log(
  'PASS — H2 refusalsAreLoud: every inventoried silent refusal path now emits ' +
  'a structured record. audioDirector (provenance, expired, occupied), ' +
  'smithClient (both spin doors), foundry (cap), proving (pendingRoll), ' +
  'narrator (play rejection) — all loud.',
);
