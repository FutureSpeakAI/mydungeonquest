// Rule 27 — A refusal is a loud failure.
//
// Every code path that refuses, drops, skips, or discards an input calls
// this helper. It emits a structured record naming: what was refused
// (identity), why (the specific check that failed), the expected and actual
// values where both are known, and what the caller can do about it.
//
// Developer-facing only. Never reaches the player surface (Rule 22).

/**
 * Emit a structured refusal record to the developer console.
 *
 * @param {object} opts
 * @param {string} opts.what   - Identity of what was refused (not just type)
 * @param {string} opts.why    - The specific check that failed
 * @param {*}      [opts.expected] - Expected value or shape
 * @param {*}      [opts.actual]   - Actual value that triggered the refusal
 * @param {string} [opts.action]   - What the caller can do about it
 * @returns {object} The structured record (for test assertions)
 */
export function logRefusal({ what, why, expected = undefined, actual = undefined, action = undefined }) {
  const record = {
    what,
    why,
    ...(expected !== undefined ? { expected } : {}),
    ...(actual !== undefined ? { actual } : {}),
    ...(action !== undefined ? { action } : {}),
    t: Date.now(),
  };
  console.warn('[refusal]', record);
  return record;
}
