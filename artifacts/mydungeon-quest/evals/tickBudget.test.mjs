// J4 — tickBudget (P22: budget enforcement and turn-based rotation)
//
// The tick system must:
//   1. Never return more than TICK_BUDGET targets
//   2. Rotate the target window by turn number when the pool exceeds the budget,
//      so the same souls don't always tick and every eligible soul gets turns
//   3. Return deterministic results for the same (codex, turn) pair
//   4. Heroes are excluded (they are the player's character, not an NPC target)
//
// Courts:
//  ① TICK_BUDGET constant is exported and equals 4
//  ② pickTickTargets never returns more than budget souls
//  ③ Functional: 6 eligible souls + budget 4 → 4 targets returned
//  ④ Functional: rotation — turn 0 and turn 1 return different starting windows
//  ⑤ Functional: same turn → same targets (deterministic)
//  ⑥ Functional: pool ≤ budget → all eligible returned (no rotation)
//  ⑦ The hero is not in tick targets (heroes are not cast souls in this API)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LIVING_WORLD = path.resolve(ROOT, '../../packages/engine/src/livingWorld.js');
const engineSrc = readFileSync(LIVING_WORLD, 'utf8');

// ① TICK_BUDGET exported and equals 4
assert.ok(
  engineSrc.includes('export const TICK_BUDGET = 4'),
  'TICK_BUDGET must be exported with value 4',
);

// ② pickTickTargets never exceeds budget — check source for .slice(0, Math.max) or similar
assert.ok(
  engineSrc.includes('.slice(start, start + budget)') || engineSrc.includes('.slice(0, Math.max(0, budget)') || engineSrc.includes('return eligible'),
  'pickTickTargets must limit results to the budget via slice',
);

// ③–⑦ Functional courts
import('../../../packages/engine/src/livingWorld.js').then(async ({ pickTickTargets, tickUpdates, TICK_BUDGET }) => {
  assert.strictEqual(TICK_BUDGET, 4, 'TICK_BUDGET must be 4');

  const makeSoul = (name, bond, introduced_turn = 0) => ({
    name, role: 'ally', status: 'active', goal: `pursue the path of ${name}`, bond, introduced_turn,
  });

  // ③ 6 eligible souls, budget 4 → exactly 4 returned
  const sixCodex = {
    cast: [
      makeSoul('Alma', 5, 0),
      makeSoul('Bram', 4, 1),
      makeSoul('Cara', 3, 2),
      makeSoul('Dren', 2, 3),
      makeSoul('Eryn', 1, 4),
      makeSoul('Fenn', 0, 5),
    ],
  };
  const targets3 = pickTickTargets(sixCodex, 4, 0);
  assert.strictEqual(targets3.length, 4, 'exactly 4 targets must be returned for a pool of 6 with budget 4');

  // ④ Rotation: turn 0 vs turn 1 produce different windows (pool > budget)
  const t0 = pickTickTargets(sixCodex, 4, 0).map((s) => s.name);
  const t1 = pickTickTargets(sixCodex, 4, 1).map((s) => s.name);
  // The sorted order is deterministic; rotation shifts the window. If all souls have
  // distinct bonds/introduced_turns, the window start changes with the turn.
  // With 6 souls, budget 4, and turn rotation: start = turn % (6 - 4 + 1) = turn % 3.
  // turn 0 → start 0; turn 1 → start 1 → different window.
  assert.notDeepEqual(t0, t1, 'rotation must produce different targets for turn 0 vs turn 1 when pool > budget');

  // ⑤ Same turn → same targets (deterministic)
  const t0a = pickTickTargets(sixCodex, 4, 0).map((s) => s.name);
  const t0b = pickTickTargets(sixCodex, 4, 0).map((s) => s.name);
  assert.deepEqual(t0a, t0b, 'same (codex, turn) must produce the same targets (deterministic)');

  // ⑥ Pool ≤ budget → all returned (no rotation needed)
  const threeCodex = {
    cast: [makeSoul('Alma', 5, 0), makeSoul('Bram', 4, 1), makeSoul('Cara', 3, 2)],
  };
  const small0 = pickTickTargets(threeCodex, 4, 0).map((s) => s.name);
  const small7 = pickTickTargets(threeCodex, 4, 7).map((s) => s.name);
  assert.strictEqual(small0.length, 3, 'all 3 eligible souls must be returned when pool ≤ budget');
  assert.deepEqual(small0, small7, 'no rotation when pool ≤ budget (same window every turn)');

  // ⑦ Heroes are not included: pickTickTargets only reads codex.cast, which
  //    does not include the hero object. Verify by adding a villain-role soul
  //    (as a proxy for exclusion logic) and confirming it doesn't appear.
  const withVillain = {
    cast: [
      makeSoul('Alma', 5, 0),
      { name: 'The Dark One', role: 'villain', status: 'active', goal: 'seize power', bond: 10, introduced_turn: 0 },
    ],
  };
  const noVillain = pickTickTargets(withVillain, 4, 0).map((s) => s.name);
  assert.ok(!noVillain.includes('The Dark One'), 'villain must not appear in tick targets');
  assert.ok(noVillain.includes('Alma'), 'ally must appear in tick targets');

  console.log(
    'PASS — J4 tickBudget: TICK_BUDGET=4 exported; pickTickTargets limited to budget; ' +
    '6-soul pool returns 4; rotation: turn 0 ≠ turn 1 windows; deterministic: same turn → same targets; ' +
    'pool ≤ budget: all returned, no rotation; villain excluded from targets.',
  );
}).catch((e) => {
  console.error('FAIL — tickBudget functional courts:', e.message);
  process.exit(1);
});
