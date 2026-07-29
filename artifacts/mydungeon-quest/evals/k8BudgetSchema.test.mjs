// K8 — Budget schema integrity (Stage 6.5)
//
// Verifies that k8-budget.json carries the two-class structure the long-march
// spec depends on. These courts are the STRUCTURAL contracts; the spec enforces
// the NUMERIC contracts at run time.
//
// Courts:
//  ① throughput._direction === 'floor'
//  ② failure._direction === 'ceiling'
//  ③ No key appears in BOTH throughput and failure (exclusive classes)
//  ④ All failure values are finite numbers ≥ 0 (never null — hand-set before run)
//  ⑤ All throughput values are either null or finite numbers ≥ 0
//  ⑥ throughput has no key that also appears in failure (belt-and-suspenders of ③)
//  ⑦ Every key in budget.failure matches a key the spec knows about (no phantom metrics)
//  ⑧ The budget file does not carry a 'baseline' or 'floor' root key (old flat schema gone)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BUDGET_PATH = path.join(ROOT, 'tests/e2e/k8-budget.json');

const budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8'));

// ① throughput._direction
assert.strictEqual(
  budget.throughput?._direction,
  'floor',
  'k8-budget.json throughput must declare _direction: "floor"',
);

// ② failure._direction
assert.strictEqual(
  budget.failure?._direction,
  'ceiling',
  'k8-budget.json failure must declare _direction: "ceiling"',
);

// ③ No key appears in both classes (exclusive — prevents direction confusion)
const throughputKeys = new Set(Object.keys(budget.throughput).filter((k) => k !== '_direction'));
const failureKeys    = new Set(Object.keys(budget.failure).filter((k) => k !== '_direction'));
for (const k of throughputKeys) {
  assert.ok(
    !failureKeys.has(k),
    `Key "${k}" must not appear in BOTH throughput and failure — direction would be ambiguous`,
  );
}

// ④ All failure values are finite numbers ≥ 0 (hand-set, never null)
for (const [k, v] of Object.entries(budget.failure)) {
  if (k === '_direction') continue;
  assert.ok(
    typeof v === 'number' && Number.isFinite(v) && v >= 0,
    `failure.${k} must be a finite number ≥ 0 (hand-set before the run); got ${JSON.stringify(v)}`,
  );
}

// ⑤ All throughput values are null or finite numbers ≥ 0
for (const [k, v] of Object.entries(budget.throughput)) {
  if (k === '_direction') continue;
  assert.ok(
    v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0),
    `throughput.${k} must be null (pre-first-run) or a finite number ≥ 0; got ${JSON.stringify(v)}`,
  );
}

// ⑥ Throughput has no key shared with failure (structural mirror of ③, explicit error)
for (const k of failureKeys) {
  assert.ok(
    !throughputKeys.has(k),
    `Failure key "${k}" must not also appear in throughput — use one class per metric`,
  );
}

// ⑦ Every failure key is one the spec knows about (no phantom metrics added to JSON only)
// This is the canonical list as defined in k8-longmarch.spec.ts FailureClass.
const KNOWN_FAILURE_KEYS = new Set([
  'playRejections',
  'platesRefusedByRenderDoor',
  'boundaryAssertionThrows',
  'unknownPageErrors',
  'unresolvedReferences',
  'quotaWarnings',
  'narrationFloorBreaches',
  'safeFallbackTurnInvocations',
  'understudyInvocations',
  'validatorRepairTurns',
  'maxTicksInOneTurn',
]);
for (const k of failureKeys) {
  assert.ok(
    KNOWN_FAILURE_KEYS.has(k),
    `failure.${k} is not a recognized metric key — add it to both the spec FailureClass and KNOWN_FAILURE_KEYS`,
  );
}

// ⑧ Old flat schema keys are gone (the auto-launder schema no longer exists)
assert.ok(
  !Object.hasOwn(budget, 'baseline'),
  'k8-budget.json must not carry a "baseline" root key — that is the old flat schema',
);
assert.ok(
  !Object.hasOwn(budget, 'floor'),
  'k8-budget.json must not carry a "floor" root key — that is the old flat schema',
);

console.log(
  `PASS — K8 budgetSchema: throughput._direction='floor', failure._direction='ceiling'; ` +
  `${throughputKeys.size} throughput keys (all null or ≥0), ` +
  `${failureKeys.size} failure keys (all finite ≥0, hand-set); ` +
  `no shared keys; no phantom failure metrics; old flat schema absent.`,
);
