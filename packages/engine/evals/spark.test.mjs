// THE SPARK GATE (engine twin, pure fraction) — onboarding as law. Three
// ready worlds are dealt deterministically from the forge's own pools,
// each distinct and whole; and the quickstart route is three choices. The
// spark row (one tappable card per world) is React and is judged at the
// table's own gate — the engine has no window to render.
// The game addresses this law by old in-game seats: '../src/lib/
// onboarding.js' (a shim re-exporting 'fatescript/onboarding') and
// '../src/lib/forgeRolls.js' (a shim re-exporting the pools from
// 'fatescript/forgeRolls'); here we import the engine's true seats.
import assert from 'node:assert/strict';
import { sparks, quickstartPlan } from '../src/onboarding.js';
import { TITLES, COVENANTS, TONES } from '../src/forgeRolls.js';

const deal = sparks(7);
assert.equal(deal.length, 3);
assert.equal(JSON.stringify(deal), JSON.stringify(sparks(7)), 'same seed, same deal');
assert.notEqual(JSON.stringify(deal), JSON.stringify(sparks(8)), 'a new seed deals a new hand');
assert.equal(new Set(deal.map((s) => s.title)).size, 3, 'three distinct titles');
assert.equal(new Set(deal.map((s) => s.covenant)).size, 3, 'three distinct covenants');
for (const spark of deal) {
  assert.ok(TITLES.includes(spark.title) && COVENANTS.includes(spark.covenant) && TONES.includes(spark.tone), 'every spark comes from the pools');
  assert.ok(/[.!]$/.test(spark.covenant.trim()), 'a covenant is a complete sentence');
}
const plan = quickstartPlan();
assert.ok(plan.taps <= 3, 'three choices or fewer to the table');
assert.equal(plan.steps.length, plan.taps);

console.log('PASS — the spark gate (engine twin, pure fraction): three distinct ready worlds dealt from the pools, deterministic by seed, complete sentences all, three taps to the table; the tappable spark row is judged at the table\u2019s own gate.');
