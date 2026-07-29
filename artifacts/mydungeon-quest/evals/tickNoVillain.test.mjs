// J4 — tickNoVillain (P21/P22: villains excluded from tick targets and visible surfaces)
//
// The living-world tick system must never surface a villain in a tick log
// entry (the design clock governs them). This gate proves both the filter
// in pickTickTargets and the absence from the tick log entry structure.
//
// Courts:
//  ① villain role excluded in pickTickTargets source code
//  ② tickLogEntry carries no player-visible narration (narration_blocks is empty)
//  ③ Functional: a codex with a villain + an active soul returns only the active soul
//  ④ Functional: a codex with ONLY a villain returns null from tickUpdates
//  ⑤ Functional: villain with a goal is still excluded (goal does not grant a tick)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LIVING_WORLD = path.resolve(ROOT, '../../packages/engine/src/livingWorld.js');
const engineSrc = readFileSync(LIVING_WORLD, 'utf8');

// ① villain role excluded in pickTickTargets
assert.ok(
  engineSrc.includes("soul.role !== 'villain'"),
  "pickTickTargets must filter out villain-role souls",
);

// ② tickLogEntry narration_blocks is always empty (villain cannot speak through a tick)
assert.ok(
  engineSrc.includes("narration_blocks: []"),
  "tickLogEntry must carry empty narration_blocks — tick entries are silent",
);

// ③–⑤ Functional courts
import('../../../packages/engine/src/livingWorld.js').then(async ({ pickTickTargets, tickUpdates }) => {
  const baseCodex = {
    cast: [
      { name: 'Vera the Villain', role: 'villain', status: 'active', goal: 'Seize the throne.', bond: 5, introduced_turn: 0 },
      { name: 'Holt the Ally', role: 'ally', status: 'active', goal: 'Protect the village.', bond: 3, introduced_turn: 1 },
    ],
  };

  // ③ Villain excluded; ally included
  const targets = pickTickTargets(baseCodex);
  assert.strictEqual(targets.length, 1, 'pickTickTargets must return exactly one target (the ally)');
  assert.strictEqual(targets[0].name, 'Holt the Ally', 'the villain must be excluded, only the ally ticks');

  // ④ Codex with ONLY a villain → tickUpdates returns null
  const villainOnlyCodex = {
    cast: [{ name: 'Vera the Villain', role: 'villain', status: 'active', goal: 'Seize the throne.', bond: 5, introduced_turn: 0 }],
  };
  const result = tickUpdates(villainOnlyCodex, 1);
  assert.strictEqual(result, null, 'tickUpdates must return null when only a villain is in the codex');

  // ⑤ Villain WITH a goal is still excluded
  const goaledVillain = pickTickTargets({ cast: [{ name: 'Lord Malachar', role: 'villain', status: 'active', goal: 'Destroy the world.', bond: 10, introduced_turn: 0 }] });
  assert.strictEqual(goaledVillain.length, 0, 'even a villain with a goal must never tick');

  console.log(
    'PASS — J4 tickNoVillain: villain role excluded in pickTickTargets source; ' +
    'tickLogEntry carries empty narration_blocks; villain excluded from targets (1 ally returned); ' +
    'villain-only codex returns null from tickUpdates; villain with goal still excluded.',
  );
}).catch((e) => {
  console.error('FAIL — tickNoVillain functional courts:', e.message);
  process.exit(1);
});
