// K12 — keylessParity (differential keyless vs. keyed)
//
// Stage 6 K12: The keyless floor is load-bearing — mock tier, CI chain, and
// proof the game runs without money. But no test asserts that key presence
// changes only QUALITY, not STRUCTURE.
//
// Design:
//   Run the same scripted campaign through mockDmTurn twice with the same
//   seed/input, and assert:
//     (a) Both runs produce byte-for-byte identical output (determinism).
//     (b) Five turns in sequence produce identical state transitions in both runs.
//     (c) The structural keys present in the output do not change when the
//         same input is repeated — no non-deterministic key generation.
//
// This is a STRUCTURAL parity check at the engine layer. Full end-to-end
// keyless vs. keyed comparison requires a live AI environment and is outside
// the scope of the eval chain.
//
// Courts:
//  ① mockDmTurn is deterministic: same input → same output (5 repeated calls)
//  ② Structural shape is stable: same keys in output across 5 turns
//  ③ State transitions are deterministic: applying applyStoryUpdates to both
//     runs produces identical codex state after 5 turns
//  ④ Mock mock turns produce a lawful dm_turn: validateDmTurn passes
//  ⑤ openingShapeOf is deterministic for a given campaign seed

import assert from 'node:assert/strict';
import { mockDmTurn, openingShapeOf } from '../../../packages/engine/src/mockDm.js';
import { validateDmTurn } from '../../../packages/engine/src/protocol.js';
import { applyStoryUpdates, initCodex } from '../../../packages/engine/src/story.js';

// Minimal campaign and briefing for determinism tests.
// NOTE: mockDmTurn reads `story.beat.title` on turn 0 (for the cinematic
// chapter card). The mock briefing must carry a stub beat with a title.
const STUB_BEAT = Object.freeze({ title: 'The Unwritten Road', measure: 'standard', index: 0 });
const BASE_CAMPAIGN = Object.freeze({
  id: 'parity-test-001',
  title: 'Parity Test Campaign',
  hero: Object.freeze({
    name: 'Tara', mark: 'human', presentation: 'neutral', voiceId: 'nova',
    hp: 10, maxHp: 10, level: 1,
    abilities: { STR: 10, DEX: 12, CON: 11, INT: 13, WIS: 14, CHA: 15 },
    skills: ['Stealth', 'Persuasion', 'Arcana'],
  }),
  codex: Object.freeze({ ...initCodex('classic-epic') }),
  logs: Object.freeze([]),
  turnNumber: 0,
});

// Minimal briefing input for mockDmTurn.
// story.beat carries the current beat so the mock chapter card can fire.
function makeBriefing(turn, playerText, codex = BASE_CAMPAIGN.codex) {
  return {
    campaignId: BASE_CAMPAIGN.id,
    turnNumber: turn,
    playerText: playerText || `I take action on turn ${turn}.`,
    hero: BASE_CAMPAIGN.hero,
    campaign: { title: BASE_CAMPAIGN.title },
    cast: codex.cast || [],
    story: {
      scene: (codex.story || {}).scene || null,
      purse: codex.purse || [],
      clocks_state: [],
      trove: codex.trove || [],
      beat: (codex.beats || [])[0] || STUB_BEAT,
      regions: [],
    },
    spine: { beats: codex.beats || [STUB_BEAT] },
    beats: codex.beats || [STUB_BEAT],
    beatMeasure: null,
    recentLog: [],
  };
}

// ① mockDmTurn is deterministic: same input → same output
const briefing0 = makeBriefing(0, 'I look around carefully.');
const run1a = mockDmTurn(briefing0);
const run1b = mockDmTurn(briefing0);
assert.deepStrictEqual(
  run1a, run1b,
  'K12 ①: mockDmTurn must be deterministic — same input produces identical output',
);

// Run 5 turns sequentially, both times, and assert identical outputs
const PLAYER_ACTIONS = [
  'I look around.',
  'I move north.',
  'I speak to the innkeeper.',
  'I examine the door.',
  'I rest briefly.',
];

const runsA = [];
const runsB = [];
for (let t = 0; t < 5; t++) {
  const briefing = makeBriefing(t, PLAYER_ACTIONS[t]);
  runsA.push(mockDmTurn(briefing));
  runsB.push(mockDmTurn(briefing));
}

for (let t = 0; t < 5; t++) {
  assert.deepStrictEqual(
    runsA[t], runsB[t],
    `K12 ①: turn ${t + 1} — mockDmTurn determinism failed (runs A and B diverged)`,
  );
}

// ② Structural shape is stable: same top-level keys across 5 turns
const REQUIRED_KEYS = ['narration_blocks', 'suggestions'];
for (let t = 0; t < 5; t++) {
  const turn = runsA[t];
  for (const key of REQUIRED_KEYS) {
    assert.ok(
      key in turn,
      `K12 ②: turn ${t + 1} must have top-level key '${key}' — structural shape drifted`,
    );
  }
  assert.ok(
    Array.isArray(turn.narration_blocks) && turn.narration_blocks.length >= 1,
    `K12 ②: turn ${t + 1} narration_blocks must be a non-empty array`,
  );
  assert.ok(
    Array.isArray(turn.suggestions) && turn.suggestions.length >= 1,
    `K12 ②: turn ${t + 1} suggestions must be a non-empty array`,
  );
}

// ③ State transitions are deterministic: applying applyStoryUpdates to
//    both runs produces structurally identical codex state after 5 turns.
//    UUID-style ids (soul-*, region-*) are stripped before comparison since
//    they are generated with crypto.randomUUID() and differ across calls by
//    design — the identity law is that the NAME is stable, not the id.
//    Everything else (notes, trove, purses, scene, spineAmendments, etc.)
//    must be byte-identical.
function stripUuids(value) {
  if (typeof value === 'string' && /^(soul|region|item)-[0-9a-f-]{32,}$/.test(value)) return '<uuid>';
  if (Array.isArray(value)) return value.map(stripUuids);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = k === 'id' ? (typeof v === 'string' && /^(soul|region|item)-/.test(v) ? '<uuid>' : v) : stripUuids(v);
    return out;
  }
  return value;
}

let codexA = { ...BASE_CAMPAIGN.codex };
let codexB = { ...BASE_CAMPAIGN.codex };
for (let t = 0; t < 5; t++) {
  const storyA = runsA[t].story;
  const storyB = runsB[t].story;
  if (storyA) codexA = applyStoryUpdates(codexA, storyA, {});
  if (storyB) codexB = applyStoryUpdates(codexB, storyB, {});
}
assert.deepStrictEqual(
  stripUuids(codexA), stripUuids(codexB),
  'K12 ③: codex state after 5 turns must be structurally identical in both runs (deterministic transitions; UUIDs stripped for comparison)',
);

// ④ Mock DM turns produce a lawful dm_turn: validateDmTurn must pass
//    (all 5 turns from run A must pass validation)
for (let t = 0; t < 5; t++) {
  const errors = [];
  // validateDmTurn(payload, context, errors)
  validateDmTurn(runsA[t], { hero: BASE_CAMPAIGN.hero, cast: [], beatMeasure: null }, errors);
  assert.strictEqual(
    errors.length, 0,
    `K12 ④: turn ${t + 1} produced by mockDmTurn must pass validateDmTurn (errors: ${errors.join(', ')})`,
  );
}

// ⑤ openingShapeOf is deterministic for a given campaign
const shapeA = openingShapeOf(BASE_CAMPAIGN);
const shapeB = openingShapeOf(BASE_CAMPAIGN);
assert.deepStrictEqual(
  shapeA, shapeB,
  'K12 ⑤: openingShapeOf must be deterministic — same campaign produces identical opening shape',
);

console.log(
  'PASS — K12 keylessParity: mockDmTurn is deterministic (5 turns, both runs identical); ' +
  'structural keys stable across all 5 turns (narration_blocks, suggestions); ' +
  'applyStoryUpdates produces identical codex state in both runs; ' +
  'all 5 mock turns pass validateDmTurn; openingShapeOf is deterministic.',
);
