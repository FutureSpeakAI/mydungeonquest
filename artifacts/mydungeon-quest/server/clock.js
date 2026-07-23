// ------------------------------------------------------------
// THE PEN'S CLOCK — Experience Directive XX, Law II.
//
// The easel's clock reaches the pen: every model call the writer's
// room makes (the Director's sitting, each Anthropic and OpenAI DM
// attempt, the Editor's judged pass, and the redraft's attempts) is
// wall-clock bounded exactly as paint, speech, music, and sfx already
// are through PROVIDER_BUDGET_MS (server/index.js). A timeout is that
// attempt's PLAIN FAILURE — the standing catch advances the plan at
// once toward the mock floor. Degrade at once, never crawl, at every
// seat alike.
//
// The clock rides ONLY the transport — the race around the awaiting
// of an attempt, the same promise-race pattern the media chains
// already ride — and never the shaped request: buildSystemPrompt,
// shapeMessages, dynamicBlocks, shapeRequest, the cache_control
// breakpoints, the model seats, and max_tokens are protected law and
// not one byte of them moves (the promptCache gate stands witness).
// The SSE heartbeat at the /api/dm door is untouched; the mock seats
// need no clock; the empty-tank cooldown law is untouched.
// ------------------------------------------------------------

// The stated defaults: 75s for every ordinary room call, 120s for the
// genesis turn's DM attempts — Session Zero is the single most
// demanding structural turn (THE GENESIS SEAT, server/dm.js), so its
// candle burns longer before the floor.
export const DM_TIMEOUT_DEFAULT_MS = 75000;
export const DM_TIMEOUT_GENESIS_DEFAULT_MS = 120000;

// Read at call time, like the easel's own budgets — the court sets
// tiny budgets through the env, and a live table retunes without a
// restart.
export function dmBudgetMs(genesis = false) {
  return genesis
    ? Number(process.env.DM_TIMEOUT_GENESIS_MS || DM_TIMEOUT_GENESIS_DEFAULT_MS)
    : Number(process.env.DM_TIMEOUT_MS || DM_TIMEOUT_DEFAULT_MS);
}

// The race itself — the same shape the media chains ride
// (server/index.js#withTimeout): it bounds the AWAITING of an attempt,
// so even a transport that never settles cannot stall the room past
// the budget. The timer is always cleared. The loser's late word is
// noted nowhere: a raced-out attempt that rejects afterward must not
// raise an unhandled-rejection alarm — the race already ruled.
export function withClock(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); });
  Promise.resolve(promise).catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// THE CEILING OF SEATS — the room's worst case, stated as arithmetic
// so the summed budgets bound the whole room: ONE Director sitting
// (at most two provider attempts), at most FOUR DM attempts (two
// Anthropic, two OpenAI), ONE judged Editor pass (at most two
// provider attempts), and at most FOUR redraft attempts — a revise
// verdict buys exactly one redraft, never more. The pensClock gate
// asserts these numbers against the walked door itself.
export const PEN_CEILING = Object.freeze({
  directorSittings: 1,
  directorProviderAttempts: 2,
  dmAttempts: 4,
  judgedPasses: 1,
  editorProviderAttempts: 2,
  redraftAttempts: 4
});
