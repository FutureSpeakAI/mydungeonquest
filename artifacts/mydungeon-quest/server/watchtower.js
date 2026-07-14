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

// The alarm bell: alerts are errors the owner should hear about. They ring
// as `level:alert` lines (any log-based alerting hooks on that) and are
// tallied for the health surface.
const alarms = { count: 0, last: null };
export function ringAlarm(evt, fields = {}) {
  alarms.count += 1;
  alarms.last = { evt, at: new Date().toISOString() };
  logLine('alert', evt, fields);
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
  paint: { text: Number(process.env.MAX_PAINT_PROMPT_CHARS || 4000), dim: Number(process.env.MAX_PAINT_DIM || 2048) },
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
    return false;
  }
  return true;
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
    spend,
  };
}

// Eval-only seam: strike the process memory so stubbed scenarios start clean.
export function __resetWatchtowerForEval() {
  watchBound = null;
  memoryWindows.clear();
  memorySpend = { day: utcDay(), byProvider: {} };
  spendCache.clear();
  ledgerPulse = { at: 0, ok: null };
  alarms.count = 0;
  alarms.last = null;
}
