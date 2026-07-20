/**
 * THE WATCHTOWER — the house's eyes after dark.
 *
 * Four duties, all opt-in like everything else in this house:
 *
 * - STRUCTURED LOGS: one JSON line per event in production (or when
 *   LOG_JSON=1), a plain human line otherwise. Nothing here ever logs a
 *   prompt, a tale, or a secret — events carry names and numbers only.
 * - DURABLE LIMITS: the burst rate limiter counts in Postgres when a ledger
 *   stands (restarts don't reset a hot window); without one it falls back to
 *   the old in-process window, byte-for-byte. Fail open for the table: a
 *   mislaid ledger degrades to the in-memory count, loudly, never a 500.
 * - ABUSE CAPS: hard ceilings on prompt size and media asks, judged before
 *   any provider is woken. A cap refusal is a 413 in the house's own words.
 * - SPEND CEILINGS: a per-provider daily tally (Postgres + an in-process
 *   mirror; the higher count wins). When a provider's day is spent the chain
 *   simply skips it — the table degrades to the next artisan (ultimately the
 *   silent mock floor) instead of draining the budget or crashing the night.
 *
 * Every function takes an optional `deps.query` seam so the eval bench can
 * judge the laws without a database, same as the toll-house.
 */
import { timingSafeEqual } from 'node:crypto';
import { runQuery } from './patrons.js';

// ------------------------------------------------------------------- logs
const jsonLogs = () =>
  process.env.LOG_JSON != null ? process.env.LOG_JSON === '1' : process.env.NODE_ENV === 'production';

export function logLine(level, evt, fields = {}) {
  const sink = level === 'error' || level === 'alert' ? console.error : console.log;
  if (jsonLogs()) {
    sink(JSON.stringify({ t: new Date().toISOString(), level, evt, ...fields }));
  } else {
    const extra = Object.entries(fields)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' ');
    sink(`[${evt}] ${extra}`.trim());
  }
}

// ---------------------------------------------------------------- herald
// THE HERALD: when the owner has chalked a webhook (ALERT_WEBHOOK_URL —
// Slack, Discord, or anything that takes a JSON POST), alarms and first
// ceiling-strikes ring out as a message, not just a log line. Opt-in like
// everything else: an unconfigured fork sends nothing and logs nothing new.
// Throttled so an incident is a ping, never a flood: one message per alarm
// kind per hour, one per provider-ceiling per UTC day.
const heraldUrl = () => String(process.env.ALERT_WEBHOOK_URL || '').trim();
const heraldSent = new Map(); // dedupe key → last-sent epoch ms
// The herald's own record: was the last message delivered? Health reads this,
// so the owner learns of a mislaid webhook before a real incident does.
let heraldLast = null; // { status: 'sent'|'undelivered', key, at }
export const heraldReport = () => ({ configured: Boolean(heraldUrl()), last: heraldLast ? { ...heraldLast } : null });
function heraldDue(key, ttlMs) {
  const last = heraldSent.get(key) || 0;
  if (Date.now() - last < ttlMs) return false;
  heraldSent.set(key, Date.now());
  if (heraldSent.size > 1000) heraldSent.clear();
  return true;
}
export function notifyOwner(key, ttlMs, text, deps = {}) {
  const url = deps.url ?? heraldUrl();
  if (!url) return Promise.resolve('mute'); // no herald was ever hired here
  if (!heraldDue(key, ttlMs)) return Promise.resolve('throttled');
  const doFetch = deps.fetch || fetch;
  // `text` serves Slack; `content` serves Discord; anything else reads either.
  return doFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, content: text }),
  })
    .then((r) => {
      if (!r.ok) throw new Error(`webhook answered ${r.status}`);
      heraldLast = { status: 'sent', key, at: new Date().toISOString() };
      return 'sent';
    })
    .catch((error) => {
      // A herald who stumbles is noted, never fatal — and never re-throws
      // into the very alarm path that hired him.
      heraldLast = { status: 'undelivered', key, at: new Date().toISOString() };
      logLine('error', 'herald_undelivered', { key, message: String(error?.message || error).slice(0, 200) });
      return 'undelivered';
    });
}

/**
 * The test ping — proof the chalked webhook actually delivers. Skips the
 * throttle (a fresh key each call) so the owner can ring it at will; the
 * outcome lands in heraldReport() and on /api/health. Mute when no herald
 * was ever hired, so keyless/unconfigured forks are unchanged.
 */
export function testHerald(deps = {}) {
  return notifyOwner(
    `test:${Date.now()}`,
    0,
    `🔔 MyDungeon.Quest herald test ping — if you can read this, alarm and spend-ceiling notifications will reach you here.`,
    deps,
  );
}

// THE OWNER'S BELL-PULL — POST /api/herald/test, the on-demand re-test of a
// chalked webhook, no restart needed. Guarded by a shared admin token
// (ADMIN_TOKEN): with no token chalked the room simply does not exist (404 —
// keyless/unconfigured forks are byte-for-byte unchanged); a wrong or missing
// bearer is refused 401 before any ping rides out. A rightful pull rings
// testHerald() and returns the outcome plus the herald's record — the same
// record /api/health reads as watch.herald.
export function ownersBell(deps = {}) {
  return async (req, res) => {
    const token = String((deps.token ?? process.env.ADMIN_TOKEN) || '').trim();
    if (!token) return res.status(404).json({ error: 'No such room stands in this house.' });
    const given = String(req.get?.('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const a = Buffer.from(given);
    const b = Buffer.from(token);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return res.status(401).json({ error: "The bell-pull answers only the owner's hand." });
    }
    const status = await testHerald(deps);
    logLine(status === 'sent' ? 'info' : 'error', 'herald_test_ping', { status, via: 'api' });
    return res.json({ status, herald: heraldReport() });
  };
}

// The alarm bell: alerts are errors the owner should hear about. They ring
// as `level:alert` lines (any log-based alerting hooks on that), are
// tallied for the health surface, and — when a herald stands — go out as a
// notification, one per alarm kind per hour.
const alarms = { count: 0, last: null };
export function ringAlarm(evt, fields = {}) {
  alarms.count += 1;
  alarms.last = { evt, at: new Date().toISOString() };
  logLine('alert', evt, fields);
  notifyOwner(`alarm:${evt}`, 3600000, `🚨 MyDungeon.Quest alarm: ${evt}${fields.message ? ` — ${fields.message}` : ''}`);
}
export const alarmReport = () => ({ ...alarms });

/** Process-level tripwires — a crash is never silent. */
export function installAlarms() {
  process.on('unhandledRejection', (reason) => {
    ringAlarm('unhandled_rejection', { message: String(reason?.message || reason).slice(0, 300) });
  });
  process.on('uncaughtException', (error) => {
    ringAlarm('uncaught_exception', { message: String(error?.message || error).slice(0, 300) });
    // Let the supervisor restart a wounded process rather than limp on.
    setTimeout(() => process.exit(1), 250).unref?.();
  });
}

/** One line per /api request: method, room, status, ms, standing. Never bodies. */
export function requestLog() {
  return (req, res, next) => {
    const t0 = Date.now();
    res.on('finish', () => {
      logLine(res.statusCode >= 500 ? 'error' : 'info', 'req', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - t0,
        plan: req.grant?.plan,
        named: Boolean(req.patron),
      });
    });
    next();
  };
}

// --------------------------------------------------- the watchtower ledger
const WATCH_DDL = [
  `CREATE TABLE IF NOT EXISTS rate_windows (
    key TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    count INT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS spend_days (
    day DATE NOT NULL,
    provider TEXT NOT NULL,
    n INT NOT NULL,
    PRIMARY KEY (day, provider)
  )`,
];
let watchBound = null;
function ensureWatch(query) {
  if (!watchBound) {
    watchBound = (async () => { for (const ddl of WATCH_DDL) await query(ddl); })().catch((error) => {
      watchBound = null;
      throw error;
    });
  }
  return watchBound;
}
const ledgerStands = () => Boolean(process.env.DATABASE_URL);

// ------------------------------------------------------------ burst limits
// The in-process window is both the keyless path and the belt when the
// ledger stumbles — the house is never unguarded.
const memoryWindows = new Map();
function memoryTally(key, windowMs) {
  const now = Date.now();
  if (memoryWindows.size > 5000) memoryWindows.clear();
  const item = memoryWindows.get(key) || { start: now, count: 0 };
  if (now - item.start > windowMs) { item.start = now; item.count = 0; }
  item.count += 1;
  memoryWindows.set(key, item);
  return item.count;
}

async function durableTally(key, windowMs, query) {
  await ensureWatch(query);
  const { rows } = await query(
    `INSERT INTO rate_windows (key, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_windows.window_start < now() - ($2 * interval '1 millisecond') THEN 1 ELSE rate_windows.count + 1 END,
       window_start = CASE WHEN rate_windows.window_start < now() - ($2 * interval '1 millisecond') THEN now() ELSE rate_windows.window_start END
     RETURNING count`,
    [key, windowMs],
  );
  // Sweep yesterday's windows now and then — a tidy book, never a hot path.
  if (Math.random() < 0.01) {
    query(`DELETE FROM rate_windows WHERE window_start < now() - interval '1 day'`).catch(() => {});
  }
  return rows[0].count;
}

/**
 * The burst limiter, now durable: counts survive a restart when the ledger
 * stands. Keyed to the patron's name when one was given at the door, else
 * the address — a patron's pace follows them across devices.
 */
export function rateLimit(max, deps = {}) {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
  const query = deps.query || runQuery;
  const durable = deps.durable ?? ledgerStands;
  return async (req, res, next) => {
    const key = `${req.patron?.id || req.ip}:${req.path}`;
    let count;
    if (durable()) {
      try {
        count = await durableTally(key, windowMs, query);
      } catch (error) {
        logLine('error', 'rate_ledger_mislaid', { message: String(error.message).slice(0, 200) });
        count = memoryTally(key, windowMs);
      }
    } else {
      count = memoryTally(key, windowMs);
    }
    if (count > max) return res.status(429).json({ error: 'The foundry needs a breath. Try again shortly.' });
    next();
  };
}

// -------------------------------------------------------------- abuse caps
// Hard ceilings on what a single ask may carry. The body-size parsers stand
// outside; these judge the SHAPE of the ask before any artisan is woken.
const CAPS = {
  dm: { body: Number(process.env.MAX_PROMPT_BYTES || 400000) },
  retell: { body: Number(process.env.MAX_PROMPT_BYTES || 400000) },
  // The paint prompt ceiling guards against abuse, not against the house's
  // own hand: a lawful scene prompt (style bible + region canon + souls +
  // the 480-char moment clause + framing and mark law) runs ~4–6k chars,
  // and the old 4000 ceiling turned away the foundry's own scene asks —
  // a 413 at this door starves the scene shelf for the whole session.
  // 12000 is double the worst lawful prompt and still no abuse vector.
  paint: { text: Number(process.env.MAX_PAINT_PROMPT_CHARS || 12000), dim: Number(process.env.MAX_PAINT_DIM || 2048) },
  speak: { text: Number(process.env.MAX_SPEAK_CHARS || 10000) },
  music: { text: Number(process.env.MAX_MUSIC_PROMPT_CHARS || 2000) },
  sfx: { text: Number(process.env.MAX_SFX_PROMPT_CHARS || 2000) },
};
const tooBig = (res, word) => res.status(413).json({ error: `The ask is larger than the house serves — ${word}.` });

export function abuseCaps(kind) {
  const caps = CAPS[kind] || {};
  return (req, res, next) => {
    const body = req.body || {};
    if (caps.body) {
      let size = 0;
      try { size = JSON.stringify(body).length; } catch { size = Infinity; }
      if (size > caps.body) return tooBig(res, 'trim the tale before the next telling');
    }
    if (caps.text) {
      const text = body.prompt ?? body.text ?? '';
      if (typeof text === 'string' && text.length > caps.text) return tooBig(res, 'shorten the ask');
    }
    if (caps.dim) {
      for (const side of ['width', 'height']) {
        const v = body[side];
        if (v != null && !(Number(v) > 0 && Number(v) <= caps.dim)) return tooBig(res, 'a plate that size will not fit the press');
      }
    }
    next();
  };
}

// ---------------------------------------------------------- spend ceilings
// One tally per provider per UTC day. The Postgres row is the durable truth;
// the in-process mirror is the belt (and the whole tally on a keyless fork).
// The HIGHER of the two counts is judged, so a mislaid ledger can only ever
// be stricter, never looser.
const utcDay = () => new Date().toISOString().slice(0, 10);
let memorySpend = { day: utcDay(), byProvider: {} };
function memorySpendFor(provider) {
  if (memorySpend.day !== utcDay()) memorySpend = { day: utcDay(), byProvider: {} };
  return memorySpend.byProvider[provider] || 0;
}

// Ceiling of 0 = that artisan is barred today; unset = the default ceiling.
// SPEND_CEILING_DEFAULT=0 turns the guard into a hard "mock only" switch.
export function ceilingFor(provider) {
  const specific = process.env[`SPEND_CEILING_${String(provider).toUpperCase()}`];
  if (specific != null && specific !== '') return Number(specific);
  return Number(process.env.SPEND_CEILING_DEFAULT || 2000);
}

const NEVER_BILLED = new Set(['mock', 'fallback', 'house', '', null, undefined]);

/** One mark on the day's tally — after real work, mirrors debit's law. */
export function recordSpend(provider, deps = {}) {
  if (NEVER_BILLED.has(provider)) return Promise.resolve('unmarked');
  if (memorySpend.day !== utcDay()) memorySpend = { day: utcDay(), byProvider: {} };
  memorySpend.byProvider[provider] = (memorySpend.byProvider[provider] || 0) + 1;
  const durable = deps.durable ?? ledgerStands;
  if (!durable()) return Promise.resolve('marked');
  const query = deps.query || runQuery;
  return ensureWatch(query)
    .then(() => query(
      `INSERT INTO spend_days (day, provider, n) VALUES (CURRENT_DATE, $1, 1)
       ON CONFLICT (day, provider) DO UPDATE SET n = spend_days.n + 1`,
      [provider],
    ))
    .then(() => 'marked')
    .catch((error) => {
      logLine('error', 'spend_ledger_mislaid', { message: String(error.message).slice(0, 200) });
      return 'slipped';
    });
}

// The durable count rides a short candle so the hot path costs one read
// per provider per ~15s, not one per request.
const spendCache = new Map(); // provider → { at, n }
export async function spentToday(provider, deps = {}) {
  const memory = memorySpendFor(provider);
  const durable = deps.durable ?? ledgerStands;
  if (!durable()) return memory;
  const ttl = Number(process.env.SPEND_CACHE_MS || 15000);
  const hit = spendCache.get(provider);
  if (hit && Date.now() - hit.at < ttl) return Math.max(memory, hit.n);
  try {
    const query = deps.query || runQuery;
    await ensureWatch(query);
    const { rows } = await query(`SELECT n FROM spend_days WHERE day = CURRENT_DATE AND provider = $1`, [provider]);
    const n = rows[0]?.n || 0;
    spendCache.set(provider, { at: Date.now(), n });
    return Math.max(memory, n);
  } catch {
    return memory; // the mirror still stands watch
  }
}

/** May this artisan be woken today? A spent day degrades, never crashes. */
export async function spendAllowed(provider, deps = {}) {
  if (NEVER_BILLED.has(provider)) return true;
  const ceiling = ceilingFor(provider);
  if (!Number.isFinite(ceiling)) return true;
  const spent = await spentToday(provider, deps);
  if (spent >= ceiling) {
    logLine('warn', 'spend_ceiling', { provider, spent, ceiling });
    // First strike of the day rings the herald; the day-stamped key means
    // one message per provider per UTC day however often the guard fires.
    notifyOwner(
      `ceiling:${provider}:${utcDay()}`,
      86400000,
      `💸 MyDungeon.Quest: ${provider} hit its daily spend ceiling (${spent}/${ceiling}). Degrading to the next provider for the rest of the UTC day.`,
      deps,
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------- token telemetry
// Task 54 §1 — the usage block from every real DM call (repairs included)
// tallies here per provider per UTC day, beside the request-count spend
// ledger. In-memory + one structured log line per call; DISPLAY ONLY —
// the ceiling above stays request-count based, and a telemetry stumble
// never touches the turn.
//
// USD per million tokens, by model family. Cache writes bill at 1.25×
// input, cache reads at 0.1× — the whole point of the anchored window.
const TOKEN_RATES = [
  { match: /haiku/i, in: 1, out: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  { match: /opus/i, in: 15, out: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  { match: /sonnet|claude/i, in: 3, out: 15, cacheWrite: 3.75, cacheRead: 0.3 },
];
const rateFor = (model) => TOKEN_RATES.find((r) => r.match.test(String(model || ''))) || TOKEN_RATES[2];

let memoryTokens = { day: utcDay(), byProvider: {} };
const tokenRowFor = (provider) => {
  if (memoryTokens.day !== utcDay()) memoryTokens = { day: utcDay(), byProvider: {} };
  if (!memoryTokens.byProvider[provider]) {
    memoryTokens.byProvider[provider] = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, estUsd: 0 };
  }
  return memoryTokens.byProvider[provider];
};

/** One call's usage block joins the day's token tally. Never throws. */
export function recordTokens(provider, model, usage) {
  if (!provider || !usage || typeof usage !== 'object') return null;
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const input = n(usage.input_tokens);
  const output = n(usage.output_tokens);
  const cacheRead = n(usage.cache_read_input_tokens);
  const cacheWrite = n(usage.cache_creation_input_tokens);
  const rate = rateFor(model);
  const usd = (input * rate.in + output * rate.out + cacheWrite * rate.cacheWrite + cacheRead * rate.cacheRead) / 1e6;
  const row = tokenRowFor(provider);
  row.calls += 1;
  row.input += input;
  row.output += output;
  row.cacheRead += cacheRead;
  row.cacheWrite += cacheWrite;
  row.estUsd = Math.round((row.estUsd + usd) * 1e6) / 1e6;
  logLine('info', 'dm_tokens', { provider, model: String(model || ''), input, output, cacheRead, cacheWrite, estUsd: Math.round(usd * 1e6) / 1e6 });
  return row;
}

/** The day's token tallies, per provider, for the owner's watch report. */
export function tokenReport() {
  if (memoryTokens.day !== utcDay()) memoryTokens = { day: utcDay(), byProvider: {} };
  const out = {};
  for (const [provider, row] of Object.entries(memoryTokens.byProvider)) out[provider] = { ...row };
  return { day: memoryTokens.day, byProvider: out };
}

// ----------------------------------------------------------------- health
// The uptime surface: fast, honest, and 200 while the table itself lives —
// a mislaid ledger is reported, not fatal (the tale never dies of it).
let ledgerPulse = { at: 0, ok: null };
export async function ledgerHealthy(deps = {}) {
  const durable = deps.durable ?? ledgerStands;
  if (!durable()) return null; // no ledger was ever bound here
  if (Date.now() - ledgerPulse.at < 10000) return ledgerPulse.ok;
  const query = deps.query || runQuery;
  try {
    await Promise.race([
      query('SELECT 1'),
      new Promise((_, reject) => { const t = setTimeout(() => reject(new Error('pulse timeout')), 1500); t.unref?.(); }),
    ]);
    ledgerPulse = { at: Date.now(), ok: true };
  } catch {
    ledgerPulse = { at: Date.now(), ok: false };
  }
  return ledgerPulse.ok;
}

export async function watchReport(deps = {}) {
  const providers = ['anthropic', 'openai', 'gemini', 'elevenlabs'];
  const spend = {};
  for (const p of providers) spend[p] = { spent: await spentToday(p, deps), ceiling: ceilingFor(p) };
  return {
    uptimeSec: Math.floor(process.uptime()),
    ledger: await ledgerHealthy(deps),
    alarms: alarmReport(),
    herald: heraldReport(),
    spend,
    // Task 54 — the day's DM token tallies (cache reads/writes included)
    // with an estimated dollar figure. Display only; ceilings stay
    // request-count based.
    tokens: tokenReport(),
  };
}

// Eval-only seam: strike the process memory so stubbed scenarios start clean.
export function __resetWatchtowerForEval() {
  watchBound = null;
  memoryWindows.clear();
  memorySpend = { day: utcDay(), byProvider: {} };
  memoryTokens = { day: utcDay(), byProvider: {} };
  spendCache.clear();
  ledgerPulse = { at: 0, ok: null };
  alarms.count = 0;
  alarms.last = null;
  heraldSent.clear();
  heraldLast = null;
}
