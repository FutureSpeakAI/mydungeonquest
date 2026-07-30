// BUDGET GIVE-UP PATH (Work Order Jul 2026, Part 2)
// When every trim stage runs and the protected floor alone exceeds the budget,
// the function must:
//  1. Terminate (not spin) — the while loop drains its candidate set to empty
//  2. Serve the result anyway (refusing to run the game is worse)
//  3. Record the overage loudly in _trimLog.overBudget per Rule 27
//     — overage: how many chars over
//     — protectedFloor: the scene-present soul names that held the floor
//  4. NOT emit overBudget when trimming succeeds (Rule 27 is for genuine floors)

import { strict as assert } from 'assert';
import { buildContextPack, PACK_BUDGET } from 'fatescript/graph';
import { buildTargetCampaign } from './fixtures/headroomCampaign.mjs';

// ① — tiny budget that the scene floor certainly overflows.
// buildTargetCampaign(10): 25 souls, 19 scene-present (fixed by the fixture's
// scene block). Each scene-present soul carries a full canonical ~200-400 chars.
// 19 × 200 chars minimum ≈ 3,800 chars — well above the 1,000-char budget.
// The while-loop's droppable() predicate excludes scene-present souls (inScene)
// so the loop drains to an empty candidate set immediately.
const TIGHT_BUDGET = 1_000;
const campaign = buildTargetCampaign(10);
const pack = buildContextPack(campaign, { budget: TIGHT_BUDGET });

// ① — loop terminates: function returned without throwing
assert.ok(pack && typeof pack === 'object', 'pack was returned (loop terminated, did not spin)');

// ② — result is served over budget (unavoidable)
const size = JSON.stringify(pack).length;
assert.ok(size > TIGHT_BUDGET, `pack (${size} chars) exceeds tight budget of ${TIGHT_BUDGET} — correctly served over budget`);

// ③ — _trimLog.overBudget is a structured record
const log = pack._trimLog;
assert.ok(log && typeof log === 'object', '_trimLog is set');
assert.ok(Object.prototype.hasOwnProperty.call(log, 'overBudget'), '_trimLog.overBudget is present');

const { overBudget } = log;
assert.ok(typeof overBudget === 'object' && overBudget !== null, 'overBudget is an object');
assert.ok(typeof overBudget.overage === 'number' && overBudget.overage > 0, `overBudget.overage is positive (${overBudget.overage})`);
assert.ok(Array.isArray(overBudget.protectedFloor) && overBudget.protectedFloor.length > 0, 'overBudget.protectedFloor is a non-empty array of scene-present names');

// ③ — overage arithmetic is correct
assert.strictEqual(overBudget.overage, size - TIGHT_BUDGET, 'overBudget.overage = actual size − budget');

// ③ — protectedFloor names are strings
for (const name of overBudget.protectedFloor) {
  assert.strictEqual(typeof name, 'string', `protectedFloor entry is a string: ${name}`);
}

// ③ — _trimLog itself is non-enumerable (must not appear in JSON.stringify)
const json = JSON.stringify(pack);
assert.ok(!json.includes('_trimLog'), '_trimLog is non-enumerable — absent from JSON');

// ③ — overBudget is also not visible in JSON (it rides inside the non-enumerable _trimLog)
assert.ok(!json.includes('"overBudget"'), 'overBudget is absent from JSON (non-enumerable container)');

// ④ — overBudget is NOT set when trimming can reach the budget
//    Use the production PACK_BUDGET which the fixture comfortably fits
const packFits = buildContextPack(campaign, { budget: PACK_BUDGET });
const sizeFits = JSON.stringify(packFits).length;
assert.ok(sizeFits <= PACK_BUDGET, `pack fits within PACK_BUDGET (${sizeFits} ≤ ${PACK_BUDGET})`);
const logFits = packFits._trimLog;
assert.ok(!logFits || !logFits.overBudget, 'overBudget is absent when trimming succeeds — no false alarm');

console.log('budgetGiveUp: PASS');
console.log(`  Tight fixture: pack=${size} chars, budget=${TIGHT_BUDGET}, overage=${overBudget.overage}, protectedFloor=${overBudget.protectedFloor.length} souls`);
console.log(`  Production fixture: pack=${sizeFits} chars ≤ PACK_BUDGET=${PACK_BUDGET} — no overBudget`);
