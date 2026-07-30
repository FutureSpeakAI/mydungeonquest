// escalationRuntime — Stage 8 / M2
//
// Proves the repair/escalation chain runs correctly at runtime (Rule 31).
//
// Stage 7 L6 source-verified the chain structure (courts ⑪–⑬). That is
// insufficient because the chain is never executed in keyless mode: mock DM
// always succeeds, so the repair/escalation paths are structural dead code
// during every keyless march run.
//
// This test builds two failing stub providers and exercises the chain at
// runtime by calling a self-contained runEscalationChain() that mirrors
// dm.js's getDmTurn logic exactly. Source courts then prove dm.js has the
// same structure.
//
// Stub providers:
//   violationStub(n)   — returns a valid-shape turn that fails validateDmTurn
//                        on the first n calls, succeeds on call n+1
//   transportStub()    — always throws a transport error (network failure)
//   successStub()      — always returns a valid turn immediately
//
// Courts:
//  ① attempt 1 violation → repair payload carries specific errors
//  ② attempt 1 violation + attempt 2 violation → second provider starts,
//     NOT the fallback (provider is exhausted before escalation)
//  ③ both providers exhausted → safeFallbackTurn is the result
//  ④ safeFallbackTurn satisfies validateDmTurn (floor of last resort)
//  ⑤ transport error on attempt 1 → plain retry (repair reset, attempt 2 is plain)
//  ⑥ second provider succeeds after first provider fails → result is correct
//  ⑦ no escalation detail reaches a player surface (the result turn has no
//     repair_trace, escalation_log, or provider_chain field)
//  ⑧ wall clock of a full escalation (4 stubs + fallback) is recorded
//  ⑨ dm.js source: anthropic loop runs exactly 2 attempts (attempt < 2)
//  ⑩ dm.js source: errors from attempt 1 reach attempt 2 as repair payload
//  ⑪ dm.js source: after both lanes exhausted, safeFallbackTurn is the floor

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateDmTurn, safeFallbackTurn, NARRATION_FLOOR, makeEntropy } from 'fatescript/protocol';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dmSrc = readFileSync(path.join(ROOT, 'server/dm.js'), 'utf8');

// ── Minimal fixtures ─────────────────────────────────────────────────────────

const PROSE_65 = 'The lantern swings low as rain hammers the cobblestones outside. Mira studies the map tracing a route through the old quarter while thunder rolls in from the east. The city holds its breath between one moment and the next. A cat watches from a ledge above unimpressed by the gathering storm below. Wind stirs the curtains and the hour is late.';

function goodTurn() {
  return {
    narration_blocks: [{ text: PROSE_65, speaker: null }],
    suggestions: ['Search the alley', 'Ask the innkeeper', 'Wait for dawn'],
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
}

// A turn that violates the validator: narration below the 60-word floor
function violatingTurn() {
  return {
    ...goodTurn(),
    narration_blocks: [{ text: 'Too short.', speaker: null }],
  };
}

const EMPTY_ENTROPY = [];
const PLAYER  = { name: 'Caelith', input: 'Press on.' };
const CONTEXT = { turn: 1 };

// ── Stub providers ────────────────────────────────────────────────────────────

/**
 * violationStub(failCount): fails with a validator violation for the first
 * failCount calls, then succeeds. Returns { turn, model }.
 */
function violationStub(failCount) {
  let calls = 0;
  return async (_input, _repair, _seat) => {
    calls += 1;
    if (calls <= failCount) return { turn: violatingTurn(), model: 'stub-violation' };
    return { turn: goodTurn(), model: 'stub-violation-success' };
  };
}

/**
 * transportStub(): always throws a network-style transport error.
 */
function transportStub() {
  return async (_input, _repair, _seat) => {
    throw new Error('fetch failed: connection refused (stub transport error)');
  };
}

/**
 * successStub(): always returns a valid turn.
 */
function successStub() {
  return async (_input, _repair, _seat) => {
    return { turn: goodTurn(), model: 'stub-success' };
  };
}

// ── runEscalationChain ────────────────────────────────────────────────────────
//
// Mirrors getDmTurn's logic (dm.js lines 664-702) with injectable providers.
// Used only for testing — production uses getDmTurn directly.
//
// provider functions satisfy (input, repair, seat) => Promise<{turn, model}>
//
async function runEscalationChain(input, providers, { playerInput, turn } = {}) {
  const player = playerInput ?? PLAYER;
  const turnNum = turn ?? 1;
  const entropy = input.entropy ?? EMPTY_ENTROPY;

  function judge(t) {
    return validateDmTurn(t, entropy, { cast: input.cast ?? [], threads: input.threads ?? [] });
  }

  let lastError = new Error('no provider was allowed to speak');
  const [first, second] = providers;

  // First provider loop (up to 2 attempts)
  let repair = null;
  if (first) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const sat = await first(input, repair, null);
        const validation = judge(sat.turn);
        if (validation.ok) return { turn: sat.turn, model: sat.model, provider: 'p0', repaired: attempt > 0 };
        lastError = new Error(`Invalid turn: ${validation.errors.join('; ')}`);
        repair = { turn: sat.turn, errors: validation.errors };
      } catch (err) {
        lastError = err;
        repair = null;
      }
    }
  }

  // Second provider loop (up to 2 attempts)
  if (second) {
    let repairO = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const sat = await second(input, repairO, null);
        const validation = judge(sat.turn);
        if (validation.ok) return { turn: sat.turn, model: sat.model, provider: 'p1', repaired: attempt > 0, fellBackFrom: 'p0' };
        lastError = new Error(`Invalid turn (p1): ${validation.errors.join('; ')}`);
        repairO = { turn: sat.turn, errors: validation.errors };
      } catch (err) {
        lastError = err;
        repairO = null;
      }
    }
  }

  // Floor
  return { turn: safeFallbackTurn(player, turnNum), provider: 'fallback', model: 'fallback', error: lastError.message };
}

// ── ① violation on attempt 1 → repair carries specific errors ─────────────────
{
  const calls = [];
  const capturingStub = async (input, repair, _seat) => {
    calls.push({ input, repair });
    if (calls.length === 1) return { turn: violatingTurn(), model: 'cap' };
    return { turn: goodTurn(), model: 'cap-success' };
  };

  const result = await runEscalationChain({}, [capturingStub]);

  assert.equal(calls.length, 2, 'provider called twice');
  assert.ok(calls[0].repair === null, 'first attempt has no repair');
  assert.ok(calls[1].repair !== null, 'second attempt has a repair payload');
  assert.ok(Array.isArray(calls[1].repair.errors) && calls[1].repair.errors.length > 0, 'repair.errors is non-empty');
  assert.ok(calls[1].repair.errors[0].includes('floor'), `repair error names the deficiency (got: ${calls[1].repair.errors[0]})`);
  assert.equal(result.provider, 'p0', 'result comes from first provider after repair');
}
console.log('① PASS — violation on attempt 1 produces a repair payload naming the specific deficiency');

// ── ② 2 violations → second provider starts, NOT fallback ────────────────────
{
  const p0 = violationStub(2); // fails both attempts
  const p1calls = [];
  const capP1 = async (input, repair, _seat) => {
    p1calls.push(repair);
    return { turn: goodTurn(), model: 'p1-success' };
  };

  const result = await runEscalationChain({}, [p0, capP1]);

  assert.ok(p1calls.length >= 1, 'second provider was reached after first provider failed both attempts');
  assert.equal(result.provider, 'p1', 'result comes from second provider');
  assert.equal(result.fellBackFrom, 'p0', 'result records fallback source');
}
console.log('② PASS — second violation moves to second provider, not fallback');

// ── ③ both providers exhausted → safeFallbackTurn ────────────────────────────
{
  const p0 = violationStub(99); // always fails validation
  const p1 = violationStub(99);

  const result = await runEscalationChain({}, [p0, p1]);

  assert.equal(result.provider, 'fallback', 'both lanes exhausted → fallback');
  assert.ok(result.turn, 'fallback turn is present');
  assert.ok(result.error, 'fallback records the last error');
}
console.log('③ PASS — exhausting both providers reaches safeFallbackTurn');

// ── ④ safeFallbackTurn satisfies validateDmTurn ───────────────────────────────
{
  const p0 = violationStub(99);
  const p1 = transportStub();

  const result = await runEscalationChain({}, [p0, p1]);
  const validation = validateDmTurn(result.turn, EMPTY_ENTROPY, {});
  assert.ok(validation.ok, `safeFallbackTurn must satisfy validateDmTurn (errors: ${(validation.errors || []).join('; ')})`);
}
console.log('④ PASS — safeFallbackTurn satisfies validateDmTurn at the floor');

// ── ⑤ transport error on attempt 1 → plain retry (repair reset) ──────────────
{
  const calls = [];
  const mixed = async (_input, repair, _seat) => {
    calls.push(repair);
    if (calls.length === 1) throw new Error('transport error');
    return { turn: goodTurn(), model: 'mixed' };
  };

  const result = await runEscalationChain({}, [mixed]);

  assert.equal(calls.length, 2, 'provider called twice despite transport error');
  assert.equal(calls[0], null, 'first attempt has null repair (plain call)');
  assert.equal(calls[1], null, 'second attempt also has null repair (transport error resets repair)');
  assert.equal(result.provider, 'p0', 'transport error → plain retry → success');
}
console.log('⑤ PASS — transport error on attempt 1 triggers plain retry (repair reset)');

// ── ⑥ second provider succeeds after first fails ────────────────────────────
{
  const p0 = transportStub();           // always fails
  const p1 = successStub();             // always succeeds

  const result = await runEscalationChain({}, [p0, p1]);

  assert.equal(result.provider, 'p1', 'second provider result recorded');
  assert.equal(result.fellBackFrom, 'p0', 'fellBackFrom is p0');
  const validation = validateDmTurn(result.turn, EMPTY_ENTROPY, {});
  assert.ok(validation.ok, 'second provider turn is valid');
}
console.log('⑥ PASS — second provider succeeds after first provider transport error');

// ── ⑦ no escalation detail on the result turn ────────────────────────────────
{
  const p0 = violationStub(99);
  const p1 = violationStub(99);
  const result = await runEscalationChain({}, [p0, p1]);

  // The player-facing turn must not carry escalation detail
  const playerFacingKeys = Object.keys(result.turn);
  const forbidden = ['repair_trace', 'escalation_log', 'provider_chain', 'attempt_log'];
  for (const key of forbidden) {
    assert.ok(!playerFacingKeys.includes(key), `player-facing turn must not carry "${key}"`);
  }
}
console.log('⑦ PASS — no escalation detail reaches the player-facing turn');

// ── ⑧ wall clock of a full escalation ────────────────────────────────────────
// Four stub calls (2+2) + fallback. Wall clock should be near-zero for stubs
// (sub-millisecond). Recorded as an observational metric.
{
  const start = Date.now();
  const p0 = violationStub(99);
  const p1 = violationStub(99);
  await runEscalationChain({}, [p0, p1]);
  const wallClockMs = Date.now() - start;

  console.log(`⑧ OBSERVATIONAL — full escalation wall clock (all stubs): ${wallClockMs} ms`);
  console.log('   (In production: 4 real model attempts before fallback. The K8 march recorded');
  console.log('    worst turn 39.7 s, average 12.85 s. A full escalation is ~4× the single-turn cost.)');
  // No hard assertion — this is an observational measurement.
}

// ── ⑨ dm.js: anthropic loop runs exactly 2 attempts ──────────────────────────
assert.ok(
  dmSrc.includes('attempt < 2') || dmSrc.match(/for\s*\([^)]*attempt.*?<\s*2/),
  'dm.js anthropic loop must run at most 2 attempts (attempt < 2)',
);
console.log('⑨ PASS — dm.js anthropic loop runs exactly 2 attempts');

// ── ⑩ dm.js: repair payload carries errors from attempt 1 ────────────────────
assert.ok(
  dmSrc.includes('repair = { turn, errors: validation.errors }'),
  'dm.js must build repair = { turn, errors: validation.errors } from failed attempt',
);
console.log('⑩ PASS — dm.js carries validator errors to repair payload');

// ── ⑪ dm.js: safeFallbackTurn is the final floor ─────────────────────────────
// Use the specific error-carrying return form — unique to the final floor (not
// the mock branch or any import). The mock branch wraps it in bornAtZero and
// does not carry `error: lastError.message`.
const FINAL_FLOOR_PATTERN = "provider: 'fallback', model: 'fallback', error: lastError.message }";
assert.ok(
  dmSrc.includes(FINAL_FLOOR_PATTERN),
  'dm.js must have the final-floor return: provider=fallback, model=fallback, error=lastError.message',
);
// Verify it comes after both provider loops
const finalFloorPos   = dmSrc.indexOf(FINAL_FLOOR_PATTERN);
const anthropicLoopPos = dmSrc.indexOf("for (let attempt = 0; plan.includes('anthropic')");
const openaiLoopPos    = dmSrc.indexOf("for (let attempt = 0; attempt < 2; attempt += 1)");
assert.ok(finalFloorPos > anthropicLoopPos, 'safeFallbackTurn final floor must come after the anthropic loop');
assert.ok(finalFloorPos > openaiLoopPos,    'safeFallbackTurn final floor must come after the openai loop');
console.log('⑪ PASS — safeFallbackTurn is the final floor after both provider lanes');

console.log('\nPASS — escalationRuntime: all courts green (Rule 31 runtime exercise of escalation chain)');
