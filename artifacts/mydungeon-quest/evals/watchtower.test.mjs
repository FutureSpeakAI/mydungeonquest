// ---- THE WATCHTOWER (production hardening — durable limits, caps, spend) ----
//
// Judged headless, stub-benched, keyless. Laws under judgment:
//   1. Burst limits: the in-memory window still guards a ledgerless fork;
//      with a ledger, the count comes from Postgres (stubbed) so a restart
//      cannot reset a hot window; a mislaid ledger degrades to the memory
//      window — never a 500, never unguarded.
//   2. Abuse caps: an oversized prompt/ask is refused 413 in the house's
//      own words, before any artisan is woken; lawful asks pass untouched.
//   3. Spend ceilings: real work marks the day's tally; a spent day bars the
//      artisan (spendAllowed=false) so chains degrade instead of draining
//      the budget; mock/fallback/house are never marked; ceiling env vars
//      are honored per provider; a keyless fork tallies in memory alone.
//   4. Structured logs: JSON lines under LOG_JSON=1 carry t/level/evt and
//      never throw on odd fields.

import assert from 'node:assert/strict';

// Scrub before judging: this bench sits at a keyless, ledgerless table.
delete process.env.DATABASE_URL;
delete process.env.SPEND_CEILING_DEFAULT;
delete process.env.SPEND_CEILING_OPENAI;
delete process.env.RATE_LIMIT_WINDOW_MS;
delete process.env.ALERT_WEBHOOK_URL;

const {
  rateLimit, abuseCaps, logLine,
  recordSpend, spendAllowed, spentToday, ceilingFor,
  notifyOwner, ringAlarm, alarmReport, testHerald, heraldReport, watchReport,
  __resetWatchtowerForEval,
} = await import('../server/watchtower.js');

const req = (over = {}) => ({ ip: '9.9.9.9', path: '/api/dm', patron: null, body: {}, ...over });
const res = () => {
  const r = { code: null, body: null };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
};
const run = (mw, rq) => new Promise((resolve) => {
  const rs = res();
  mw(rq, rs, () => resolve({ passed: true, rs }));
  // middlewares here answer synchronously or via the returned promise
  setTimeout(() => resolve({ passed: false, rs }), 50);
});

// ---- 1. burst limits -------------------------------------------------------
{
  __resetWatchtowerForEval();
  const mw = rateLimit(2, { durable: () => false });
  assert.equal((await run(mw, req())).passed, true, 'first knock passes');
  assert.equal((await run(mw, req())).passed, true, 'second knock passes');
  const third = await run(mw, req());
  assert.equal(third.passed, false, 'third knock is refused');
  assert.equal(third.rs.code, 429, 'refusal is 429');
  assert.match(third.rs.body.error, /breath/, 'refusal speaks the house tongue');
  // another patron is another window
  assert.equal((await run(mw, req({ patron: { id: 'p2' } }))).passed, true, 'a named patron has their own pace');
}
{
  // durable path: the count is Postgres's word, not the process's
  __resetWatchtowerForEval();
  let calls = 0;
  const query = async (text) => {
    if (/CREATE TABLE/.test(text)) return { rows: [] };
    if (/DELETE FROM rate_windows/.test(text)) return { rows: [] };
    calls += 1;
    return { rows: [{ count: calls + 8 }] }; // a restart-survived hot window
  };
  const mw = rateLimit(8, { durable: () => true, query });
  const first = await run(mw, req());
  assert.equal(first.passed, false, 'the durable count survives a restart and refuses');
  assert.equal(first.rs.code, 429);
}
{
  // a mislaid ledger degrades to the memory window — never a 500
  __resetWatchtowerForEval();
  const query = async () => { throw new Error('ledger mislaid'); };
  const mw = rateLimit(1, { durable: () => true, query });
  assert.equal((await run(mw, req())).passed, true, 'mislaid ledger falls back, first passes');
  const second = await run(mw, req());
  assert.equal(second.rs.code, 429, 'the memory belt still holds');
}

// ---- 2. abuse caps ---------------------------------------------------------
{
  const paint = abuseCaps('paint');
  const big = await run(paint, req({ path: '/api/paint', body: { prompt: 'x'.repeat(5000) } }));
  assert.equal(big.rs.code, 413, 'an oversized paint ask is refused 413');
  assert.match(big.rs.body.error, /house/, 'refusal in the house tongue');
  const wide = await run(paint, req({ path: '/api/paint', body: { prompt: 'a plate', width: 99999 } }));
  assert.equal(wide.rs.code, 413, 'a plate too wide will not fit the press');
  assert.equal((await run(paint, req({ path: '/api/paint', body: { prompt: 'a modest plate', width: 1024 } }))).passed, true, 'lawful asks pass');

  const dm = abuseCaps('dm');
  const bloat = await run(dm, req({ body: { player: 'x'.repeat(500000) } }));
  assert.equal(bloat.rs.code, 413, 'a bloated turn body is refused');
  assert.equal((await run(dm, req({ body: { player: 'I open the door.' } }))).passed, true, 'a lawful turn passes');
}

// ---- 3. spend ceilings -----------------------------------------------------
{
  __resetWatchtowerForEval();
  const noDb = { durable: () => false };
  for (const standIn of ['mock', 'fallback', 'house', null]) await recordSpend(standIn, noDb);
  assert.equal(await spentToday('mock', noDb), 0, 'stand-ins are never marked');
  await recordSpend('openai', noDb);
  await recordSpend('openai', noDb);
  assert.equal(await spentToday('openai', noDb), 2, 'real work marks the day');
  process.env.SPEND_CEILING_OPENAI = '2';
  assert.equal(await spendAllowed('openai', noDb), false, 'a spent day bars the artisan');
  assert.equal(await spendAllowed('elevenlabs', noDb), true, 'other artisans still pour');
  assert.equal(await spendAllowed('mock', noDb), true, 'the floor is never barred');
  process.env.SPEND_CEILING_OPENAI = '';
  assert.equal(ceilingFor('openai'), 2000, 'unset falls to the default ceiling');
  process.env.SPEND_CEILING_DEFAULT = '0';
  assert.equal(await spendAllowed('gemini', noDb), false, 'default 0 is a hard mock-only switch');
  delete process.env.SPEND_CEILING_DEFAULT;
  delete process.env.SPEND_CEILING_OPENAI;
}
{
  // durable tally: the higher of ledger and memory wins — never looser
  __resetWatchtowerForEval();
  const query = async (text) => /SELECT n FROM spend_days/.test(text) ? { rows: [{ n: 5 }] } : { rows: [] };
  const deps = { durable: () => true, query };
  process.env.SPEND_CEILING_ELEVENLABS = '5';
  assert.equal(await spentToday('elevenlabs', deps), 5, 'the ledger count is read');
  assert.equal(await spendAllowed('elevenlabs', deps), false, 'the durable count bars the day');
  delete process.env.SPEND_CEILING_ELEVENLABS;
}

// ---- 4. the DM's provider plan under spend ceilings ------------------------
// Each artisan is judged against its OWN ceiling: a barred provider is
// struck from the plan individually and is never called.
{
  const { dmPlan, getDmTurn } = await import('../server/dm.js');
  const { makeEntropy } = await import('../src/lib/protocol.js');
  const { createHero } = await import('../src/lib/rules.js');
  delete process.env.DM_PROVIDER;
  delete process.env.DM_FALLBACK;

  // keyless table: the floor is the whole plan
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  assert.deepEqual(dmPlan({}), ['mock'], 'keyless plan is the floor alone');

  // both keys chalked (fake — nothing here may reach a wire)
  process.env.ANTHROPIC_API_KEY = 'sk-ant-eval-fake';
  process.env.OPENAI_API_KEY = 'sk-eval-fake';
  assert.deepEqual(dmPlan({}), ['anthropic', 'openai', 'mock'], 'a full purse tries both artisans');
  assert.deepEqual(dmPlan({ anthropic: true }), ['openai', 'mock'], 'a spent Anthropic day degrades to OpenAI, never calls Anthropic');
  assert.deepEqual(dmPlan({ openai: true }), ['anthropic', 'mock'], 'a spent OpenAI day leaves Anthropic alone');
  assert.deepEqual(dmPlan({ anthropic: true, openai: true }), ['mock'], 'both spent → the floor tells the turn');

  // Anthropic alone, barred: with a key present but the day spent, the turn
  // is told by mock WITHOUT any network attempt (a wire call with this fake
  // key would fail and return provider 'fallback', not 'mock').
  delete process.env.OPENAI_API_KEY;
  const told = await getDmTurn({
    campaign: { title: 'Ceiling Trial', homeRegion: 'Larkspur Vale' }, hero: createHero({ name: 'Warden' }),
    story: { beat: { title: 'x' }, regions: [] }, state: {}, memory: [], history: [],
    entropy: makeEntropy(() => .5), player: 'I open the door.', resolution: null, turn: 1
  }, { barred: { anthropic: true } });
  assert.equal(told.provider, 'mock', 'a barred Anthropic is never called — the floor answers');
  delete process.env.ANTHROPIC_API_KEY;
}

// ---- 5. structured logs ----------------------------------------------------
{
  process.env.LOG_JSON = '1';
  const lines = [];
  const real = console.log;
  console.log = (l) => lines.push(l);
  try { logLine('info', 'req', { method: 'POST', path: '/api/dm', status: 200, ms: 12 }); }
  finally { console.log = real; }
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.evt, 'req');
  assert.equal(parsed.level, 'info');
  assert.ok(parsed.t, 'every line carries its hour');
  assert.equal(parsed.status, 200);
  delete process.env.LOG_JSON;
}

// ---- 6. the herald ---------------------------------------------------------
// An unconfigured fork sends nothing and logs nothing new; a chalked webhook
// rings once per key per window; a stumbling herald is noted, never fatal.
{
  __resetWatchtowerForEval();

  // unconfigured: mute, no fetch, no new log lines
  const errs = [];
  const realErr = console.error;
  console.error = (l) => errs.push(l);
  try {
    assert.equal(await notifyOwner('alarm:test', 3600000, 'hello'), 'mute', 'no webhook → mute');
    ringAlarm('eval_test_alarm', { message: 'bench' });
  } finally { console.error = realErr; }
  assert.equal(errs.length, 1, 'only the alert log line itself — the mute herald logs nothing new');
  assert.equal(alarmReport().count, 1, 'the alarm still tallies');

  // configured: one send per key per window, throttled after
  __resetWatchtowerForEval();
  const sent = [];
  const fakeFetch = async (url, opts) => { sent.push({ url, body: JSON.parse(opts.body) }); return { ok: true }; };
  const deps = { url: 'https://hooks.example/eval', fetch: fakeFetch };
  assert.equal(await notifyOwner('alarm:crash', 3600000, 'the house shook', deps), 'sent', 'a chalked herald rings');
  assert.equal(await notifyOwner('alarm:crash', 3600000, 'the house shook again', deps), 'throttled', 'same kind within the hour is throttled');
  assert.equal(await notifyOwner('alarm:other', 3600000, 'a different bell', deps), 'sent', 'another kind rings on its own');
  assert.equal(sent.length, 2, 'two messages, never a flood');
  assert.equal(sent[0].body.text, 'the house shook', 'Slack reads text');
  assert.equal(sent[0].body.content, 'the house shook', 'Discord reads content');

  // ceiling strike rides spendAllowed once per provider per day
  __resetWatchtowerForEval();
  sent.length = 0;
  process.env.SPEND_CEILING_OPENAI = '1';
  const noDb = { durable: () => false, url: 'https://hooks.example/eval', fetch: fakeFetch };
  await recordSpend('openai', noDb);
  assert.equal(await spendAllowed('openai', noDb), false, 'the day is spent');
  assert.equal(await spendAllowed('openai', noDb), false, 'still spent');
  await new Promise((r) => setTimeout(r, 10)); // let fire-and-forget sends land
  assert.equal(sent.length, 1, 'one ceiling message per provider per day');
  assert.match(sent[0].body.text, /openai.*ceiling/i, 'the message names the provider and the ceiling');
  delete process.env.SPEND_CEILING_OPENAI;

  // a stumbling herald is noted, never thrown
  __resetWatchtowerForEval();
  const stumble = { url: 'https://hooks.example/eval', fetch: async () => ({ ok: false, status: 500 }) };
  const errs2 = [];
  console.error = (l) => errs2.push(l);
  try {
    assert.equal(await notifyOwner('alarm:crash', 3600000, 'x', stumble), 'undelivered', 'a refused webhook is undelivered, not fatal');
  } finally { console.error = realErr; }
  assert.equal(errs2.length, 1, 'the stumble is one log line');

  // the test ping: skips the throttle, records the outcome for /api/health
  __resetWatchtowerForEval();
  assert.deepEqual(heraldReport(), { configured: false, last: null }, 'an unhired herald reports honestly');
  assert.equal(await testHerald(), 'mute', 'no webhook → the test ping is mute, forks unchanged');
  assert.equal(heraldReport().last, null, 'a mute ping records nothing');
  const pings = [];
  const pingDeps = { url: 'https://hooks.example/eval', fetch: async (url, opts) => { pings.push(JSON.parse(opts.body)); return { ok: true }; } };
  assert.equal(await testHerald(pingDeps), 'sent', 'a chalked herald delivers the test ping');
  assert.equal(await testHerald(pingDeps), 'sent', 'the test ping is never throttled');
  assert.equal(pings.length, 2, 'each ask rings');
  assert.match(pings[0].text, /test ping/i, 'the message says it is a test');
  assert.equal(heraldReport().last.status, 'sent', 'the delivery is recorded');
  const stumblePing = { url: 'https://hooks.example/eval', fetch: async () => ({ ok: false, status: 404 }) };
  console.error = () => {};
  try { assert.equal(await testHerald(stumblePing), 'undelivered', 'a mislaid URL is reported, not thrown'); }
  finally { console.error = realErr; }
  assert.equal(heraldReport().last.status, 'undelivered', 'the stumble is recorded for health');
  const report = await watchReport({ durable: () => false });
  assert.equal(report.herald.last.status, 'undelivered', 'watchReport carries the herald record to /api/health');
}

// ---- 7. the owner's bell-pull ---------------------------------------------
// POST /api/herald/test: no ADMIN_TOKEN → the room does not exist (forks
// unchanged); wrong bearer → refused; the rightful hand rings testHerald()
// and the outcome lands in heraldReport() for /api/health.
{
  __resetWatchtowerForEval();
  const { ownersBell } = await import('../server/watchtower.js');
  const call = async (handler, authorization) => {
    let code = 200; let body = null;
    const res = { status(c) { code = c; return this; }, json(b) { body = b; return this; } };
    await handler({ get: (h) => (h.toLowerCase() === 'authorization' ? authorization : undefined) }, res);
    return { code, body };
  };

  // no token chalked → 404, no ping, forks unchanged
  const rang = [];
  const bellFetch = async (url, opts) => { rang.push(JSON.parse(opts.body)); return { ok: true }; };
  let out = await call(ownersBell({ url: 'https://hooks.example/eval', fetch: bellFetch }), 'Bearer anything');
  assert.equal(out.code, 404, 'without a token the room does not exist');
  assert.equal(rang.length, 0, 'no ping rides out');

  // wrong or missing bearer → 401, no ping
  const guarded = ownersBell({ token: 'shhh-secret', url: 'https://hooks.example/eval', fetch: bellFetch });
  out = await call(guarded, 'Bearer wrong');
  assert.equal(out.code, 401, 'a wrong hand is refused');
  out = await call(guarded, undefined);
  assert.equal(out.code, 401, 'a missing hand is refused');
  assert.equal(rang.length, 0, 'refusals never ring');

  // the rightful hand rings and the outcome is recorded for health
  out = await call(guarded, 'Bearer shhh-secret');
  assert.equal(out.code, 200);
  assert.equal(out.body.status, 'sent', 'the rightful pull delivers the test ping');
  assert.match(rang[0].text, /test ping/i, 'the message says it is a test');
  assert.equal(out.body.herald.last.status, 'sent', 'the response carries the herald record');
  assert.equal(heraldReport().last.status, 'sent', 'the record stands for /api/health');

  // a rightful pull with no webhook chalked is honestly mute
  __resetWatchtowerForEval();
  out = await call(ownersBell({ token: 'shhh-secret' }), 'Bearer shhh-secret');
  assert.equal(out.code, 200);
  assert.equal(out.body.status, 'mute', 'no webhook → an honest mute, never an error');
}

__resetWatchtowerForEval();
console.log('watchtower.test: all laws hold — durable limits, abuse caps, spend ceilings, structured lines, the herald.');
