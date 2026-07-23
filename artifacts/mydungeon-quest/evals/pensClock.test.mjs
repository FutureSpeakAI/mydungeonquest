// THE PEN'S CLOCK GATE — Task 65 Phase 1 (Experience Directive XX, Law II).
//
// The law: the easel's clock reaches the pen. Every model call the writer's
// room makes — the Director's sitting, each Anthropic and OpenAI DM attempt,
// the Editor's judged pass, the redraft's attempts — is wall-clock bounded
// through DM_TIMEOUT_MS (default 75s) and, for the genesis turn's DM attempts
// alone, DM_TIMEOUT_GENESIS_MS (default 120s), both read at call time. A
// timeout is that attempt's PLAIN FAILURE: the ladder advances at once toward
// the deterministic floor — mock intent, mock verdict, fallback turn — and
// the room never crawls. The clock rides ONLY the transport; the shaped
// request is protected law and the promptCache gate stands witness that not
// one byte of it moved.
//
// Keyless and network-free: stand-in keys seat the keyed plan, and the wire
// is a recording stand-in — stalled seats are promises that NEVER settle, so
// only the clock itself can bring the walk home. Budgets are tens of
// milliseconds through the env; no live wire is ever touched.

import assert from 'node:assert/strict';

// Stand-in keys seat the keyed plan (anthropic → openai → mock). The court
// then pins tiny budgets AFTER import to prove call-time reads.
process.env.ANTHROPIC_API_KEY = 'stand-in-key-never-used-on-a-wire';
process.env.OPENAI_API_KEY = 'stand-in-key-never-used-on-a-wire';
delete process.env.DM_PROVIDER;
delete process.env.DM_FALLBACK;
delete process.env.DM_TIMEOUT_MS;
delete process.env.DM_TIMEOUT_GENESIS_MS;

// Containment is part of the law: a raced-out loser that rejects late must
// not raise an unhandled-rejection alarm — the race already ruled.
const leaks = [];
process.on('unhandledRejection', (reason) => { leaks.push(String(reason)); });

const { dmBudgetMs, withClock, PEN_CEILING, DM_TIMEOUT_DEFAULT_MS, DM_TIMEOUT_GENESIS_DEFAULT_MS } = await import('../server/clock.js');
const { getDmTurn } = await import('../server/dm.js');
const { convene } = await import('../server/room.js');
const { mockDmTurn } = await import('fatescript/mockDm');
const { mockDirector } = await import('fatescript/room');
const { safeFallbackTurn } = await import('fatescript/protocol');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const never = () => new Promise(() => {});
// The door logs its floors honestly; the chain's transcript stays clean.
const quietly = async (fn) => {
  const orig = console.error;
  console.error = () => {};
  try { return await fn(); } finally { console.error = orig; }
};

// ---------------------------------------------------------------------------
// 1. The budget law: stated defaults, env-overridable, read at CALL time —
//    a live table retunes without a restart, and the court runs in tens of ms.
// ---------------------------------------------------------------------------
assert.equal(DM_TIMEOUT_DEFAULT_MS, 75000, 'the ordinary default is stated: 75s');
assert.equal(DM_TIMEOUT_GENESIS_DEFAULT_MS, 120000, 'the genesis default is stated: 120s');
assert.equal(dmBudgetMs(false), 75000, 'unset env reads the ordinary default');
assert.equal(dmBudgetMs(true), 120000, 'unset env reads the genesis default');
const ORDINARY = 25;
const GENESIS = 75;
process.env.DM_TIMEOUT_MS = String(ORDINARY);
process.env.DM_TIMEOUT_GENESIS_MS = String(GENESIS);
assert.equal(dmBudgetMs(false), ORDINARY, 'DM_TIMEOUT_MS is read at call time — no restart, no module reload');
assert.equal(dmBudgetMs(true), GENESIS, 'DM_TIMEOUT_GENESIS_MS is read at call time');

// withClock itself: a sound promise passes its value through; a rejection
// BEFORE the budget is the attempt's own word, not the clock's.
assert.equal(await withClock(Promise.resolve('sound'), 1000, 'never spoken'), 'sound');
await assert.rejects(() => withClock(Promise.reject(new Error('the wire refused')), 1000, 'never spoken'), /the wire refused/);
await assert.rejects(() => withClock(never(), 20, 'the clock ruled'), /the clock ruled/, 'a never-settling promise is bounded by the clock alone');

// ---------------------------------------------------------------------------
// The stand-in wire — records every ask by its tool seat, never settles or
// answers per the walk's own script. No request ever leaves the process.
// ---------------------------------------------------------------------------
const calls = { beat_intent: 0, dm_turn: 0, editor_verdict: 0, unknown: 0 };
const resetCalls = () => { calls.beat_intent = 0; calls.dm_turn = 0; calls.editor_verdict = 0; calls.unknown = 0; };
const toolOf = (body) => (body.includes('"name":"beat_intent"') ? 'beat_intent'
  : body.includes('"name":"editor_verdict"') ? 'editor_verdict'
  : body.includes('"name":"dm_turn"') ? 'dm_turn' : 'unknown');
let wire = () => never();
globalThis.fetch = async (url, options = {}) => {
  const tool = toolOf(String(options?.body || ''));
  calls[tool] += 1;
  return wire(String(url), tool);
};

const soundOpenAiTurn = (turn) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { tool_calls: [{ function: { name: 'dm_turn', arguments: JSON.stringify(turn) } }] } }] }),
  text: async () => ''
});

const baseInput = () => ({
  turn: 3,
  player: 'I press on through the pass.',
  player_input: 'I press on through the pass.',
  hero: { name: 'Bram', role: 'guardian', level: 2 },
  story: {}
});

// ---------------------------------------------------------------------------
// 2. The ladder advances: a never-settling Anthropic seat fails within budget
//    and the OpenAI seat answers — the turn arrives sound, bounded, unrepaired.
// ---------------------------------------------------------------------------
{
  resetCalls();
  const input = baseInput();
  wire = (url, tool) => {
    if (url.includes('api.anthropic.com')) return never();
    return soundOpenAiTurn(mockDmTurn(input));
  };
  const started = Date.now();
  const result = await getDmTurn(input, {});
  const elapsed = Date.now() - started;
  assert.equal(result.provider, 'openai', `the ladder reached the next seat — got ${result.provider} (${result.error || 'no error'})`);
  assert.equal(result.fellBackFrom, 'anthropic', 'the fall is attested');
  assert.equal(result.repaired, false, 'first sound answer, no repair sitting');
  assert.equal(calls.dm_turn, 3, `two stalled Anthropic attempts then one OpenAI — saw ${calls.dm_turn}`);
  assert.ok(elapsed < 2 * ORDINARY + 1500, `two stalls at ${ORDINARY}ms each come home within budget plus slack — took ${elapsed}ms`);
  assert.ok(result.turn && Array.isArray(result.turn.narration_blocks) && result.turn.narration_blocks.length, 'the turn is whole');
}

// ---------------------------------------------------------------------------
// 2b. A raced-out loser that rejects LATE raises no unhandled-rejection alarm
//     — the race already ruled; its late word is noted nowhere.
// ---------------------------------------------------------------------------
{
  resetCalls();
  const input = baseInput();
  wire = (url) => {
    if (url.includes('api.anthropic.com')) return sleep(90).then(() => { throw new Error('the wire broke long after the clock ruled'); });
    return soundOpenAiTurn(mockDmTurn(input));
  };
  const result = await getDmTurn(input, {});
  assert.equal(result.provider, 'openai', 'the ladder advanced past the doomed seat');
  await sleep(160); // let both late losers reject — the swallow law keeps the house quiet
}

// ---------------------------------------------------------------------------
// 3. Every seat stalled, ordinary turn: the door still returns a lawful
//    fallback turn, bounded, with the clock's own word in the error — and
//    exactly the DM-attempt ceiling on the wire, never more.
// ---------------------------------------------------------------------------
{
  resetCalls();
  wire = () => never();
  const started = Date.now();
  const result = await quietly(() => getDmTurn(baseInput(), {}));
  const elapsed = Date.now() - started;
  assert.equal(result.provider, 'fallback', 'all seats stalled — the floor answers');
  assert.ok(result.turn && result.turn.narration_blocks?.length && Array.isArray(result.turn.suggestions), 'the fallback turn is lawful and whole');
  assert.match(String(result.error), new RegExp(`timed out after ${ORDINARY}ms`), `the error carries the ordinary budget's own number — got: ${result.error}`);
  assert.equal(calls.dm_turn, PEN_CEILING.dmAttempts, `the DM attempt ceiling holds: ${PEN_CEILING.dmAttempts} attempts (two per seat), saw ${calls.dm_turn}`);
  assert.ok(elapsed < PEN_CEILING.dmAttempts * ORDINARY + 1500, `four stalls come home within summed budgets plus slack — took ${elapsed}ms`);
}

// ---------------------------------------------------------------------------
// 4. The genesis candle: DM attempts on a genesis input burn
//    DM_TIMEOUT_GENESIS_MS — and ONLY then; the ordinary walk above already
//    proved the short candle when input.genesis is absent.
// ---------------------------------------------------------------------------
{
  resetCalls();
  wire = () => never();
  const result = await quietly(() => getDmTurn({ ...baseInput(), genesis: true }, {}));
  assert.equal(result.provider, 'fallback');
  assert.match(String(result.error), new RegExp(`timed out after ${GENESIS}ms`), `genesis DM attempts burn the genesis budget — got: ${result.error}`);
  assert.ok(!new RegExp(`after ${ORDINARY}ms`).test(String(result.error)), 'the ordinary budget did not rule the genesis attempt');
  assert.equal(calls.dm_turn, PEN_CEILING.dmAttempts, 'the ceiling holds on the genesis walk too');
}

// ---------------------------------------------------------------------------
// 5. THE WHOLE ROOM, WORST CASE — every live seat stalling, an echo-flagged
//    draft forcing the mandatory judged pass and the one revise redraft. The
//    Director falls to the mock intent, the Editor to the mock verdict, the
//    turn is never thrown away, and the wire shows EXACTLY the ceiling of
//    seats: 2 director attempts + 4 DM attempts + 2 editor attempts + 4
//    redraft attempts — so the summed budgets bound the whole room. The
//    genesis input also proves the Director and Editor always ride the
//    ORDINARY budget: only the DM attempts burn the genesis candle.
// ---------------------------------------------------------------------------
{
  resetCalls();
  wire = () => never();
  // The floor's own prose, seeded as a prior page: the stalled walk's
  // fallback draft then shares an 8-word run verbatim → the echo flag is
  // certain, the judged pass mandatory, the mock verdict a revise.
  const echoBait = safeFallbackTurn('I press on through the pass.', 7).narration_blocks[0].text;
  const input = {
    ...baseInput(),
    turn: 7, // the sampling law's own seat too — 7 % 7 === 0
    genesis: true,
    story: { beat: { index: 0 } },
    history: [{ role: 'assistant', content: echoBait }]
  };
  const errLog = [];
  const origErr = console.error;
  console.error = (...args) => { errLog.push(args.map(String).join(' ')); };
  let sealed;
  const started = Date.now();
  try {
    sealed = await convene(input, {});
  } finally {
    console.error = origErr;
  }
  const elapsed = Date.now() - started;

  // The turn is never thrown away: a whole page ships, floors attested.
  assert.ok(sealed.turn && sealed.turn.narration_blocks?.length, 'the room ships a whole page though every live seat stalled');
  assert.equal(sealed.provider, 'fallback', 'the shipped draft is the honest floor');
  assert.deepEqual(sealed.beat_intent, mockDirector(input, 0), 'the stalled Director yields the mock Director\u2019s own intent, byte-stable');
  assert.equal(sealed.room_ledger.director_calls, PEN_CEILING.directorSittings, 'one Director sitting');
  assert.equal(sealed.room_ledger.editor_verdict, 'revise', 'the stalled Editor yields the mock verdict — flags in, revise out');
  assert.equal(sealed.room_ledger.revisions, 1, 'a revise buys exactly one redraft, never more');
  assert.ok(sealed.room_ledger.flags.includes('echo'), `the shipped page attests its standing flags — saw [${sealed.room_ledger.flags.join(', ')}]`);

  // The ceiling of seats, counted on the wire itself.
  assert.equal(calls.beat_intent, PEN_CEILING.directorProviderAttempts, `one sitting, at most two provider attempts — saw ${calls.beat_intent}`);
  assert.equal(calls.editor_verdict, PEN_CEILING.editorProviderAttempts, `one judged pass, at most two provider attempts — saw ${calls.editor_verdict}`);
  assert.equal(calls.dm_turn, PEN_CEILING.dmAttempts + PEN_CEILING.redraftAttempts, `four DM attempts and four redraft attempts — saw ${calls.dm_turn}`);
  assert.equal(calls.unknown, 0, 'no unaccounted seat touched the wire');
  assert.equal(PEN_CEILING.judgedPasses, 1, 'the stated ceiling: one judged pass per turn');
  assert.equal(PEN_CEILING.redraftAttempts, PEN_CEILING.dmAttempts, 'the redraft rides the same attempt ceiling');

  // The summed budgets bound the room: director and editor on the ordinary
  // candle even at genesis (their messages name it), DM on the genesis one.
  const directorMsgs = errLog.filter((row) => row.includes('The Director lost its voice'));
  assert.equal(directorMsgs.length, 2, 'both Director attempts fell to the clock');
  for (const row of directorMsgs) assert.match(row, new RegExp(`director sitting timed out after ${ORDINARY}ms`), `the Director always rides the ordinary budget — got: ${row}`);
  const editorMsgs = errLog.filter((row) => row.includes('The Editor lost its voice'));
  assert.equal(editorMsgs.length, 2, 'both Editor attempts fell to the clock');
  for (const row of editorMsgs) assert.match(row, new RegExp(`editor pass timed out after ${ORDINARY}ms`), `the Editor always rides the ordinary budget — got: ${row}`);
  const worstCase = (PEN_CEILING.directorProviderAttempts + PEN_CEILING.editorProviderAttempts) * ORDINARY
    + (PEN_CEILING.dmAttempts + PEN_CEILING.redraftAttempts) * GENESIS;
  assert.ok(elapsed < worstCase + 2500, `the whole room comes home within the summed budgets plus slack (${worstCase}ms + slack) — took ${elapsed}ms`);
}

await sleep(50);
assert.deepEqual(leaks, [], `no raced-out seat leaks an unhandled rejection: [${leaks.join(' | ')}]`);

console.log('PASS — the pen\u2019s clock: every writer\u2019s-room model call is wall-clock bounded (Director sitting, DM attempts, Editor pass, redraft), a timeout is that attempt\u2019s plain failure and the ladder advances to the deterministic floor, the genesis candle burns only for genesis DM attempts, both budgets read from the env at call time, and the worst-case room is a fixed ceiling of seats whose summed budgets bound it — the table never crawls.');
