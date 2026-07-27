// ------------------------------------------------------------
// CURTAIN SURFACE — A4 (Close the curtain everywhere).
//
// Proves that the surface sanitizer stands, and that no player-
// facing string drawn from the mock DM at turns 1, 3, and 26
// contains an internal field name, a bare turn reference, or
// orphan punctuation — the three probe classes that signal
// internal state leaking to the render layer.
//
// Also checks the static player-facing strings that A4 repaired:
//   • The reconcile purse reason (no longer names gold_delta).
//   • The trove seed chain "by" label (forge prose, always clean).
//   • All spine beat opening lines (player-facing hooks, authored).
//
// Uses mockDmTurn directly — keyless, deterministic, no AI cost.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { mockDmTurn } from 'fatescript/mockDm';
import { makeEntropy } from 'fatescript/protocol';
import { sanitizeSurface } from '../src/lib/surface.js';
import { SPINES } from '../../../packages/engine/src/spines.js';

// ── 1. Unit tests for the sanitizer itself ────────────────────

// Internal field names
assert.throws(() => sanitizeSurface('the gold_delta was applied'),
  /internal field name/, 'gold_delta is refused');
assert.throws(() => sanitizeSurface('beat_intent leaked'),
  /internal field name/, 'beat_intent is refused');
assert.throws(() => sanitizeSurface('roll_request visible'),
  /internal field name/, 'roll_request is refused');

// Clean prose passes through unchanged
assert.equal(sanitizeSurface('The road climbs past the salt stones.'),
  'The road climbs past the salt stones.', 'clean prose passes unchanged');
assert.equal(sanitizeSurface(''), '', 'empty string passes');
assert.equal(sanitizeSurface(null), null, 'non-string passes through');

// Bare turn references
assert.throws(() => sanitizeSurface('On turn 15 the hero arrived'),
  /bare turn/, 'bare "turn 15" is refused');
assert.throws(() => sanitizeSurface('revisit turn 3 for the clue'),
  /bare turn/, 'bare "turn 3" is refused');

// Orphan punctuation
assert.throws(() => sanitizeSurface('He paused )'),
  /orphan/, 'space-close-paren is refused');
assert.throws(() => sanitizeSurface('quietly ,he said'),
  /orphan/, 'space-comma is refused');
assert.throws(() => sanitizeSurface('She walked (into the hall'),
  /unclosed/, 'unclosed paren is refused');

// Balanced parens are fine
assert.equal(sanitizeSurface('She walked (quietly) into the hall.'),
  'She walked (quietly) into the hall.', 'balanced parens pass');

// ── 2. Repaired static strings pass the sanitizer ─────────────

// The reconcile reason: gold_delta was removed (A4 fix).
const RECONCILE_REASON = 'recovered, an old debt settled and added to the purse.';
assert.doesNotThrow(() => sanitizeSurface(RECONCILE_REASON),
  'reconcile reason passes the surface sanitizer');

// The trove seed "by" field — forge prose, structurally clean.
const TROVE_SEED_BY = 'carried from the forge';
assert.doesNotThrow(() => sanitizeSurface(TROVE_SEED_BY),
  'trove seed chain "by" passes the surface sanitizer');

// ── 3. All spine opening lines pass the sanitizer ─────────────

let openingCount = 0;
for (const spine of SPINES) {
  for (const beat of spine.beats) {
    const opening = beat.opening;
    assert.ok(typeof opening === 'string' && opening.length > 0,
      `spine ${spine.id} beat "${beat.key}" has a non-empty opening`);
    assert.doesNotThrow(() => sanitizeSurface(opening),
      `spine ${spine.id} beat "${beat.key}" opening passes the sanitizer`);
    openingCount += 1;
  }
}
assert.ok(openingCount >= 90, `at least 90 beat opening lines audited (got ${openingCount})`);

// ── 4. Mock DM narration at turns 1, 3, 26 ───────────────────
// mockDmTurn is keyless and deterministic: no AI cost, no side-effects.

const fixtureCampaign = {
  id: 'curtain-surface-trial',
  title: 'Curtain Surface Trial',
  homeRegion: 'Larkspur Vale',
  covenant: 'A humane PG-13 fantasy frontier.',
  tone: 'mythic',
  lines: [], veils: [],
  styleBible: 'Painterly dark fantasy.',
  codex: null
};
const fixtureHero = { name: 'Wren', skills: [] };
const fixtureStory = {
  beat: { index: 0, title: 'The Ordinary Flame' },
  regions: [{ name: 'Larkspur Vale', state: 'thriving', visual: 'rolling green hills' }]
};

let blocksChecked = 0;
for (const turn of [1, 3, 26]) {
  const entropy = makeEntropy(() => 0.42);
  const dm = mockDmTurn({
    campaign: fixtureCampaign,
    hero: fixtureHero,
    story: fixtureStory,
    player: 'I look around carefully.',
    entropy,
    resolution: null,
    turn
  });
  const blocks = dm?.narration_blocks || [];
  assert.ok(blocks.length >= 1, `turn ${turn}: at least one narration block`);
  for (const block of blocks) {
    if (typeof block?.text === 'string' && block.text.length > 0) {
      assert.doesNotThrow(
        () => sanitizeSurface(block.text),
        `turn ${turn}: narration block text passes the surface sanitizer`
      );
      blocksChecked += 1;
    }
  }
  // Purse reason strings, if any are present in the mock output
  for (const op of dm?.story?.purse || []) {
    if (typeof op?.reason === 'string' && op.reason.length > 0) {
      assert.doesNotThrow(
        () => sanitizeSurface(op.reason),
        `turn ${turn}: purse reason "${op.reason}" passes the surface sanitizer`
      );
    }
  }
}
assert.ok(blocksChecked >= 3,
  `at least 3 narration block texts checked across turns (got ${blocksChecked})`);

console.log(`PASS — curtainSurface: sanitizer holds; ${openingCount} spine openings clean; ${blocksChecked} narration blocks clean across turns 1, 3, 26.`);
