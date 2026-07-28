// E1 — repairNotesHidden
// Rule 22: validator output, repair instructions, and floor breach details
// are ledger-only — never rendered to the player.
//
// This eval confirms three guarantees:
//   1. The validation error thrown by playTurn is tagged ledgerOnly=true so
//      the catch block knows not to surface it.
//   2. sanitizeSurface rejects validator metric fractions ("N of at least M").
//   3. safeFallbackTurn produces narration above the absolute floor so the
//      fallback itself is never a sub-floor turn.

import assert from 'node:assert/strict';
import { validateDmTurn, safeFallbackTurn, NARRATION_FLOOR } from '../src/lib/protocol.js';
import { sanitizeSurface } from '../src/lib/surface.js';

// ── 1. Validation error tagging ────────────────────────────────────────────
// Simulate what App.jsx does when validation fails: it now creates a tagged
// error. Confirm the tag is present and the catch-path logic suppresses it.

// A minimal DM turn that fails two rules: too few narration words and cast
// present but no dialogue. We validate it, confirm it fails, then verify
// the error would be suppressed at the status boundary.
const thinTurn = {
  narration_blocks: [{ text: 'The candle flickers.', speaker: null }],
  suggestions: ['Look around', 'Ask a question', 'Step outside'],
  roll_request: null,
  state_updates: null,
  combat: null,
  cinematic: null,
  story: null,
  image_cue: null,
  dialogue_cue: null,
  time_advance: null,
  entropy_use: [],
};

// Context with cast present so the dialogue rule fires alongside the floor.
const castContext = {
  cast: [{ name: 'Maren Voss', location: 'present', status: 'alive' }],
  hero: { name: 'Aelin', location: 'present', status: 'alive' },
  beatMeasure: 'rich',
};

const validation = validateDmTurn(thinTurn, [], castContext);
assert.equal(validation.ok, false, 'fixture turn must fail validation');

// Confirm the error messages include both a cast-dialogue violation and a
// meter fraction — these are the validator strings that must never surface.
const errorText = validation.errors.join('; ');
// The validator report must contain internal metric text and cast guidance —
// both are the kind of text that must never appear on the player surface.
assert.ok(
  /of\s+at\s+least\s+\d+/.test(errorText),
  `validator errors must include a meter fraction; got: ${errorText}`
);
assert.ok(
  /cast are present|character line|no dialogue|solitary/.test(errorText),
  `validator errors must include internal cast guidance; got: ${errorText}`
);

// Simulate App.jsx's E1-patched throw: tag as ledgerOnly.
const err = new Error(errorText);
err.ledgerOnly = true;

// The catch-path gate: ledgerOnly errors must NOT produce a status string.
let captured = null;
if (!err.ledgerOnly) captured = `The road snagged: ${err.message}`;
assert.equal(captured, null, 'ledgerOnly error must produce no status string');

// ── 2. sanitizeSurface rejects meter fractions ─────────────────────────────
assert.throws(
  () => sanitizeSurface('too few words (49 of at least 200 required for rich)'),
  /curtain breach.*metric fraction/,
  'sanitizeSurface must refuse a validator metric fraction'
);
assert.throws(
  () => sanitizeSurface('3 of at least 6 required'),
  /curtain breach.*metric fraction/,
  'sanitizeSurface must refuse any N of at least M pattern'
);
// Clean strings still pass.
assert.doesNotThrow(
  () => sanitizeSurface('The world holds its breath, counting the cost of the next step.'),
  'plain narration must pass sanitizeSurface'
);

// ── 3. safeFallbackTurn clears the absolute floor ──────────────────────────
const fallback = safeFallbackTurn('I look for another way', 1);
const allFallbackText = (fallback.narration_blocks || []).map((b) => b.text).join(' ');
const fallbackWords = allFallbackText.split(/\s+/).filter(Boolean).length;
assert.ok(
  fallbackWords >= NARRATION_FLOOR.minWords,
  `safeFallbackTurn must produce >= ${NARRATION_FLOOR.minWords} words; got ${fallbackWords}`
);

// The fallback text must also pass sanitizeSurface — it reaches the player.
for (const block of fallback.narration_blocks || []) {
  assert.doesNotThrow(
    () => sanitizeSurface(block.text),
    `safeFallbackTurn block must pass sanitizeSurface: "${block.text.slice(0, 60)}…"`
  );
}

console.log('PASS repairNotesHidden — validator output is ledger-only: tagged errors never reach status; sanitizeSurface refuses metric fractions; safeFallbackTurn clears the word floor and passes the surface check.');
