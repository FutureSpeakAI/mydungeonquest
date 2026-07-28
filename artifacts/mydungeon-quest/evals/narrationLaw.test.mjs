// E5 — narrationLaw
//
// ── ROOT CAUSE DIAGNOSIS ────────────────────────────────────────────────────
//
// The standing law (stated in the README and enforced in all three places)
// read: "1–8 blocks, 20–180 words total."
//
// NARRATION_FLOOR.byMeasure.rich.minWords = 200.
// 200 > 180 is unsatisfiable: a rich-measure turn that satisfies the floor
// breaks the ceiling, and a turn that satisfies the ceiling breaks the floor.
// There is no legal rich turn in that window.
//
// This is E5 Correction 2 from the master directive. The hardcoded 20-180
// legacy fallback in validateDmTurn was retired and replaced with
// NARRATION_FLOOR.byMeasure.none (60-160) for the no-beatMeasure path,
// bringing the validator into lockstep with the system prompt.
//
// safeFallbackTurn was extended to ≥ 60 words so it satisfies the 'none' floor
// in every context where no beat measure is set.
//
// THREE-WAY LOCKSTEP (E5):
//   1. Validator (packages/engine/src/protocol.js): legacy 20-180 → 'none' band
//   2. System prompt (src/lib/systemPrompt.js): already reads NARRATION_FLOOR
//      dynamically — no change needed
//   3. Tool schema (server/dm.js): narration_blocks text maxLength:1200 ×8 blocks
//      already accommodates 360 words; comment updated
// ────────────────────────────────────────────────────────────────────────────

import assert from 'node:assert/strict';
import { validateDmTurn, safeFallbackTurn, NARRATION_FLOOR } from '../src/lib/protocol.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function turn(wordCount, blocks = 1) {
  // Produce a valid-structure turn with the given total word count spread across
  // the given number of blocks. 'repeat' fills words uniformly; the exact split
  // doesn't matter for the word-count law.
  const wordsEach = Math.floor(wordCount / blocks);
  const remainder = wordCount - wordsEach * blocks;
  const narration_blocks = Array.from({ length: blocks }, (_, i) => ({
    text: 'word '.repeat(i === 0 ? wordsEach + remainder : wordsEach).trim(),
    speaker: null,
  }));
  return {
    narration_blocks,
    suggestions: ['Look around', 'Ask a question', 'Step outside'],
    roll_request: null, state_updates: null, combat: null,
    cinematic: null, story: null, image_cue: null, dialogue_cue: null,
    time_advance: null, entropy_use: [],
  };
}

const baseCtx = { cast: [], hero: { name: 'Aelin', location: 'present', status: 'alive' } };
const richCtx = { ...baseCtx, beatMeasure: 'rich' };
const noneCtx = { ...baseCtx }; // no beatMeasure

// ── 1. The unsatisfiable conflict is gone ─────────────────────────────────
// BEFORE E5: rich minWords=200, legacy ceiling=180 → 200>180, unsatisfiable.
// AFTER E5: no-beatMeasure path uses NARRATION_FLOOR.none (60-160). Rich uses
//           its own band (200-360). No conflict.

// A 200-word rich turn must pass (was impossible before E5 because it exceeded
// the legacy 180-word ceiling).
const richTurn200 = turn(200, 6); // rich requires minBlocks:6
const v200rich = validateDmTurn(richTurn200, [], richCtx);
assert.equal(v200rich.ok, true,
  `200-word rich turn must pass validation; errors: ${v200rich.errors?.join('; ')}`
);

// A 180-word rich turn must FAIL (below rich's 200-word floor).
const richTurn180 = turn(180, 6);
const v180rich = validateDmTurn(richTurn180, [], richCtx);
assert.equal(v180rich.ok, false, '180-word rich turn must fail the 200-word rich floor');
const richFloorError = v180rich.errors.join('; ');
assert.ok(
  richFloorError.includes('too few words') && richFloorError.includes('200'),
  `rich floor error must mention 200-word floor; got: ${richFloorError}`
);

// ── 2. No-beatMeasure path uses NARRATION_FLOOR.none (60-160) ────────────────
const { minWords: noneMin, maxWords: noneMax } = NARRATION_FLOOR.byMeasure.none;

// 60-word unmetered turn must pass.
const none60 = turn(noneMin, 2); // none requires minBlocks:2
const v60 = validateDmTurn(none60, [], noneCtx);
assert.equal(v60.ok, true,
  `${noneMin}-word unmetered turn must pass; errors: ${v60.errors?.join('; ')}`
);

// 160-word unmetered turn must pass.
const none160 = turn(noneMax, 2);
const v160 = validateDmTurn(none160, [], noneCtx);
assert.equal(v160.ok, true,
  `${noneMax}-word unmetered turn must pass; errors: ${v160.errors?.join('; ')}`
);

// 59-word unmetered turn must FAIL (below none floor).
const none59 = turn(noneMin - 1, 2);
const v59 = validateDmTurn(none59, [], noneCtx);
assert.equal(v59.ok, false, `${noneMin - 1}-word unmetered turn must fail the none floor`);
assert.ok(v59.errors.join('; ').includes('too few words'), 'floor breach message must mention too few words');

// 161-word unmetered turn must FAIL (above none ceiling).
const none161 = turn(noneMax + 1, 2);
const v161 = validateDmTurn(none161, [], noneCtx);
assert.equal(v161.ok, false, `${noneMax + 1}-word unmetered turn must fail the none ceiling`);
assert.ok(v161.errors.join('; ').includes('too many words'), 'ceiling breach message must mention too many words');

// ── 3. The old hardcoded 20-180 legacy fallback is gone ─────────────────────
// A 190-word turn with no beatMeasure must FAIL (> none ceiling of 160).
// Before E5 it would PASS (< legacy ceiling of 180… wait, 190 > 180 so it
// would fail the old check too). Test a 170-word turn instead: 170 < 180
// (passes old check) and > 160 (fails new none ceiling).
const none170 = turn(170, 2);
const v170 = validateDmTurn(none170, [], noneCtx);
assert.equal(v170.ok, false,
  '170-word unmetered turn must fail the none ceiling of 160 (regression: old 180-word legacy ceiling would have passed it)'
);

// ── 4. safeFallbackTurn satisfies the none floor ───────────────────────────
const fbWithPlayer = safeFallbackTurn('I look for another way', 1);
const fbWithoutPlayer = safeFallbackTurn('', 1);

function countWords(turn) {
  return (turn.narration_blocks || []).reduce((n, b) => n + String(b.text || '').trim().split(/\s+/).filter(Boolean).length, 0);
}

const wordsWithPlayer = countWords(fbWithPlayer);
const wordsWithoutPlayer = countWords(fbWithoutPlayer);

assert.ok(
  wordsWithPlayer >= NARRATION_FLOOR.byMeasure.none.minWords,
  `safeFallbackTurn (with playerText) must have >= ${NARRATION_FLOOR.byMeasure.none.minWords} words; got ${wordsWithPlayer}`
);
assert.ok(
  wordsWithPlayer <= NARRATION_FLOOR.byMeasure.none.maxWords,
  `safeFallbackTurn (with playerText) must have <= ${NARRATION_FLOOR.byMeasure.none.maxWords} words; got ${wordsWithPlayer}`
);
assert.ok(
  wordsWithoutPlayer >= NARRATION_FLOOR.byMeasure.none.minWords,
  `safeFallbackTurn (empty playerText) must have >= ${NARRATION_FLOOR.byMeasure.none.minWords} words; got ${wordsWithoutPlayer}`
);

// safeFallbackTurn must pass validateDmTurn with no beatMeasure context.
const fbValidation = validateDmTurn(fbWithPlayer, [], noneCtx);
assert.equal(fbValidation.ok, true,
  `safeFallbackTurn must pass validateDmTurn with no beatMeasure; errors: ${fbValidation.errors?.join('; ')}`
);
const fbValidation2 = validateDmTurn(fbWithoutPlayer, [], noneCtx);
assert.equal(fbValidation2.ok, true,
  `safeFallbackTurn (empty) must pass validateDmTurn with no beatMeasure; errors: ${fbValidation2.errors?.join('; ')}`
);

// ── 5. Absolute floor (NARRATION_FLOOR.minWords = 40) still holds ───────────
// The absolute floor is for the fallback's own design constraint. Under the E5
// law the 'none' band is enforced for all unmetered turns, so the 60-word none
// floor IS the effective absolute floor for validator calls without a beatMeasure.
assert.ok(
  NARRATION_FLOOR.minWords <= NARRATION_FLOOR.byMeasure.none.minWords,
  'absolute minWords must be <= none.minWords (none floor is the effective unmetered floor)'
);

// ── 6. All measure bands are internally consistent (floor ≤ ceiling) ────────
for (const [measure, band] of Object.entries(NARRATION_FLOOR.byMeasure)) {
  assert.ok(
    band.minWords < band.maxWords,
    `NARRATION_FLOOR.byMeasure.${measure}: minWords (${band.minWords}) must be < maxWords (${band.maxWords})`
  );
  assert.ok(
    band.minBlocks <= band.maxBlocks,
    `NARRATION_FLOOR.byMeasure.${measure}: minBlocks (${band.minBlocks}) must be <= maxBlocks (${band.maxBlocks})`
  );
}

// ── 7. Measure bands are satisfiable (floor and ceiling don't cross any other
//       standing law ceiling) ────────────────────────────────────────────────
// With the legacy 20-180 check retired, the validator never imposes a 180-word
// ceiling on a rich turn. Verify this by confirming a 200-word turn with
// beatMeasure='rich' validates correctly (the test in §1 already confirms this,
// but explicitly label it as the "no-longer-unsatisfiable" proof).
assert.equal(v200rich.ok, true, 'E5 proof: 200-word rich turn is no longer unsatisfiable');

console.log(`PASS narrationLaw — E5: the hardcoded 20-180 legacy fallback is retired; no-beatMeasure path now enforces NARRATION_FLOOR.byMeasure.none (${noneMin}–${noneMax} words) matching the system prompt; rich-measure turns (200+ words) no longer conflict with any ceiling; safeFallbackTurn produces ${wordsWithPlayer}/${wordsWithoutPlayer} words (both >= ${noneMin}) and passes validateDmTurn; all measure bands are internally consistent and satisfiable.`);
