// THE PYRE AND THE PARCEL — the owner's two standing rights (Task 65,
// Phase 11; Directive XX, Law XII).
//
// Two doors, both behind the named gate, and neither accepts any owner
// parameter at all — each right reads the name from the door
// (req.patron.id) and nothing else, so a cross-owner request is not
// refused, it is unexpressible.
//
//   GET  /api/vault/parcel   — the owner-complete archive: every row the
//        house keeps under the owner's name, in deterministic order;
//        journal envelopes ride WHOLE (never rebuilt field by field);
//        the media manifest carries hash, mime, byte length, and a
//        short-lived signed fetch; key halves are public only — the
//        private half never boards.
//   POST /api/account/pyre   — the account-wide burn: blobs first (only
//        those no other name still cites), each verified gone, and if
//        one gutters the pyre ABORTS before any row burns and says so
//        as retryable; then every table's rows in ONE transaction, the
//        owner's users row last; honest per-table and per-blob counts;
//        the Clerk identity is named in the answer as the owner's own
//        remaining step. The phrase must be spoken back whole — a
//        mismatch is refused by name.
//
// THE STRONG TOOTH — the table roll is DERIVED from the schema's own DDL
// (every module exports its verses; tableRoll() reads CREATE TABLE names
// out of them) and assertRollCovered() demands a rights clause for every
// table on the roll. A future shelf without a parcel verse and a pyre
// verse (or a named exemption) reds both doors and the gate the day it
// is born — deletion rights cannot silently rot.

import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { runQuery, ledgerPool, LEDGER_DDL } from './patrons.js';
import { TOLL_DDL } from './toll.js';
import { VAULT_DDL, vaultBlobShelf } from './vault.js';
import { WATCH_DDL, logLine } from './watchtower.js';
import { PUBLISH_DDL } from './publish.js';
import { PYRE_PHRASE } from '../src/lib/rights.js';

export { PYRE_PHRASE };

// Every DDL verse the house owns, flattened to one roll.
export const HOUSE_DDL = [LEDGER_DDL, TOLL_DDL, VAULT_DDL, WATCH_DDL, PUBLISH_DDL].flat();

// The roll of tables, read from the DDL itself — never hand-kept. Every
// spelling a Postgres shelf can wear is read: with or without IF NOT
// EXISTS, quoted or bare, schema-qualified or not. And the reader fails
// CLOSED: a CREATE TABLE whose name it cannot read is a hole in the
// tooth, not a pass — it throws rather than let a shelf slip the roll.
export function tableRoll(ddl = HOUSE_DDL) {
  const names = new Set();
  for (const verse of ddl) {
    const text = String(verse);
    for (const at of text.matchAll(/CREATE\s+TABLE/gi)) {
      const nameAt = /\s*(?:IF\s+NOT\s+EXISTS\s+)?(?:"?[A-Za-z_][A-Za-z0-9_]*"?\s*\.\s*)?"?([A-Za-z_][A-Za-z0-9_]*)"?/iy;
      nameAt.lastIndex = at.index + at[0].length;
      const named = nameAt.exec(text);
      if (!named) throw new Error('THE STRONG TOOTH: a CREATE TABLE verse hides its name from the roll — broaden the reader before raising the shelf.');
      names.add(named[1].toLowerCase());
    }
  }
  return [...names].sort();
}

// One clause per table: how the parcel reads it and how the pyre burns
// it — or a named exemption where the shelf holds no owner rows at all.
// Parcel verses are owner-scoped and deterministically ordered; pyre
// verses are owner-scoped deletes. $1 is always the patron's own id
// (rate_windows keys by `${id}:` prefix — the watchtower's own format).
export const RIGHTS_ROLL = Object.freeze({
  users: {
    parcel: { verse: 'SELECT id, clerk_user_id, display_name, plan, plan_source, stripe_customer_id, created_at, updated_at FROM users WHERE id = $1', shape: 'row' },
    pyre: { verse: 'DELETE FROM users WHERE id = $1' },
  },
  usage_events: {
    parcel: { verse: 'SELECT kind, provider, campaign_id, turn, created_at FROM usage_events WHERE user_id = $1 ORDER BY created_at, kind, campaign_id, turn' },
    pyre: { verse: 'DELETE FROM usage_events WHERE user_id = $1' },
  },
  vault_campaigns: {
    parcel: { verse: 'SELECT campaign_id, head_hash, turn_count, signature_status, public_key_jwk, meta, updated_at FROM vault_campaigns WHERE user_id = $1 ORDER BY campaign_id' },
    pyre: { verse: 'DELETE FROM vault_campaigns WHERE user_id = $1' },
  },
  vault_journal: {
    parcel: { verse: 'SELECT campaign_id, i, record_hash, prev_hash, record FROM vault_journal WHERE user_id = $1 ORDER BY campaign_id, i' },
    pyre: { verse: 'DELETE FROM vault_journal WHERE user_id = $1' },
  },
  vault_media: {
    parcel: { verse: 'SELECT asset_hash, mime, byte_length, created_at FROM vault_media WHERE user_id = $1 ORDER BY asset_hash' },
    pyre: { verse: 'DELETE FROM vault_media WHERE user_id = $1' },
  },
  publish_pages: {
    parcel: { verse: 'SELECT publish_id, campaign_id, title, record, head_hash, turn_count, listed, published_at, revoked_at FROM publish_pages WHERE user_id = $1 ORDER BY publish_id' },
    pyre: { verse: 'DELETE FROM publish_pages WHERE user_id = $1' },
  },
  publish_assets: {
    parcel: { verse: 'SELECT pa.publish_id, pa.asset_hash, pa.mime FROM publish_assets pa JOIN publish_pages pp ON pp.publish_id = pa.publish_id WHERE pp.user_id = $1 ORDER BY pa.publish_id, pa.asset_hash' },
    pyre: { verse: 'DELETE FROM publish_assets WHERE publish_id IN (SELECT publish_id FROM publish_pages WHERE user_id = $1)' },
  },
  rate_windows: {
    parcel: { verse: 'SELECT * FROM rate_windows WHERE key LIKE $1 ORDER BY key', args: (id) => [`${id}:%`] },
    pyre: { verse: 'DELETE FROM rate_windows WHERE key LIKE $1', args: (id) => [`${id}:%`] },
  },
  spend_days: {
    exempt: 'house telemetry — one row per provider per day, no owner rows',
  },
});

// The burn walks children before parents so every count is true, and the
// owner's own name burns last.
export const BURN_ORDER = Object.freeze([
  'usage_events', 'vault_journal', 'vault_media', 'vault_campaigns',
  'publish_assets', 'publish_pages', 'rate_windows', 'users',
]);

// THE STRONG TOOTH. Called at both doors on every walk, and courted by
// the gate with a planted table: a shelf on the roll without a clause —
// or a clause naming no shelf, or a burnable shelf missing from the burn
// order — throws by name. Fail closed against tomorrow.
export function assertRollCovered(roll = tableRoll(), ledger = RIGHTS_ROLL) {
  const missing = roll.filter((table) => !ledger[table]);
  if (missing.length) throw new Error(`THE STRONG TOOTH: table(s) on the schema roll without a rights clause: ${missing.join(', ')} — a new shelf must declare its parcel and its pyre the day it is born.`);
  const phantom = Object.keys(ledger).filter((table) => !roll.includes(table));
  if (phantom.length) throw new Error(`THE STRONG TOOTH: rights clause(s) naming no table on the schema roll: ${phantom.join(', ')}.`);
  for (const table of roll) {
    const clause = ledger[table];
    if (clause.exempt) continue;
    if (!clause.parcel?.verse || !clause.pyre?.verse) throw new Error(`THE STRONG TOOTH: ${table} carries no whole clause — parcel and pyre verses are both owed.`);
    if (!BURN_ORDER.includes(table)) throw new Error(`THE STRONG TOOTH: ${table} stands on the roll but not in the burn order.`);
  }
  if (BURN_ORDER[BURN_ORDER.length - 1] !== 'users') throw new Error('THE STRONG TOOTH: the owner\'s own name must burn last.');
  return true;
}

// Public key halves only: the stored JWK should already be public, but
// the parcel strips the private fields regardless — defense at the door.
const PRIVATE_JWK_FIELDS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'k', 'oth'];
function publicHalf(jwk) {
  if (!jwk || typeof jwk !== 'object') return jwk ?? null;
  const pub = {};
  for (const [field, value] of Object.entries(jwk)) if (!PRIVATE_JWK_FIELDS.includes(field)) pub[field] = value;
  return pub;
}

// The signed fetch: HMAC over `${owner}\n${hash}\n${expiry}` under the
// session secret. The owner's name rides inside the signature — tamper
// with any part and the token is nobody's.
const PARCEL_FETCH_TTL_MS = 15 * 60 * 1000;
const fetchToken = (secret, owner, hash, exp) =>
  createHmac('sha256', String(secret)).update(`${owner}\n${hash}\n${exp}`).digest('hex');

// The default transaction: one client, BEGIN to COMMIT, every row burn
// inside; any stumble rolls the whole walk back.
async function runTransaction(work) {
  const client = await ledgerPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work((text, params) => client.query(text, params));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* the walk is already lost */ }
    throw error;
  } finally {
    client.release();
  }
}

export function rightsRoutes(deps = {}) {
  const q = deps.query || runQuery;
  const blobs = deps.blobs || vaultBlobShelf();
  const transact = deps.transact || runTransaction;
  const now = deps.now || Date.now;
  const secret = deps.secret ?? process.env.SESSION_SECRET ?? null;
  const ready = () => Boolean(deps.query || process.env.DATABASE_URL);

  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));

  // Both rights fail closed on their own: no name, no door; no ledger,
  // no door. (The parcel also crosses the vault's own custody first —
  // belt and braces, both 401 the nameless.)
  const guarded = (req, res, next) => {
    if (!req.patron?.id) return res.status(401).json({ error: 'The parcel and the pyre answer only to a named patron.' });
    if (!ready()) return res.status(503).json({ error: 'The owner\'s rights stand only over a standing ledger.' });
    next();
  };

  const raiseShelves = async () => { for (const verse of HOUSE_DDL) await q(verse); };

  // THE PARCEL — everything, in deterministic order, and nothing of
  // anyone else. Determinism is a court: two walks over the same rows
  // must serialize byte-for-byte (the fetch expiry rides deps.now).
  router.get('/vault/parcel', guarded, async (req, res) => {
    try {
      assertRollCovered();
      await raiseShelves();
      const owner = req.patron.id;
      const argsFor = (clause) => (clause.args ? clause.args(owner) : [owner]);
      const read = async (table) => (await q(RIGHTS_ROLL[table].parcel.verse, argsFor(RIGHTS_ROLL[table].parcel))).rows;

      const usersRows = await read('users');
      const exp = now() + PARCEL_FETCH_TTL_MS;
      const tables = {
        users: usersRows[0] || null,
        usage_events: await read('usage_events'),
        vault_campaigns: (await read('vault_campaigns')).map((row) => ({ ...row, public_key_jwk: publicHalf(row.public_key_jwk) })),
        // The envelope rides WHOLE: row.record passes by reference —
        // fields the house never heard of arrive exactly as they left.
        vault_journal: (await read('vault_journal')).map((row) => ({ campaign_id: row.campaign_id, i: row.i, record_hash: row.record_hash, prev_hash: row.prev_hash, record: row.record })),
        vault_media: (await read('vault_media')).map((row) => ({
          ...row,
          fetch: secret ? {
            path: `/api/account/parcel/blob/${row.asset_hash}`,
            query: `su=${encodeURIComponent(owner)}&se=${exp}&st=${fetchToken(secret, owner, row.asset_hash, exp)}`,
            expiresAt: exp,
          } : null,
        })),
        publish_pages: await read('publish_pages'),
        publish_assets: await read('publish_assets'),
        rate_windows: await read('rate_windows'),
        spend_days: { omitted: RIGHTS_ROLL.spend_days.exempt },
      };
      const parcel = {
        parcel: 'mydungeon.account-parcel',
        version: 1,
        law: 'Directive XX, Law XII — the owner-complete archive: every row under your name, journal envelopes whole, media by hash with a short-lived signed fetch, key halves public only.',
        fetchLaw: secret
          ? `Each media entry carries a signed fetch good for ${PARCEL_FETCH_TTL_MS / 60000} minutes from the moment this parcel was baled.`
          : 'The house holds no session secret, so no signed fetch was baled — the signed-in vault door at /api/vault/media/<hash> serves each blob meanwhile.',
        tables,
      };
      res.setHeader('Content-Disposition', 'attachment; filename="mydungeon-account-parcel.json"');
      res.type('application/json').send(JSON.stringify(parcel, null, 2));
    } catch (error) {
      res.status(500).json({ error: `The parcel could not be baled whole, so it was not baled at all: ${error?.message || error}` });
    }
  });

  // The signed fetch door: nameless by design — the signature IS the
  // name. Strict at the boundary: the hash must be a bare sha256 hex.
  router.get('/account/parcel/blob/:hash', async (req, res) => {
    try {
      if (!secret) return res.status(503).json({ error: 'The signed fetch stands only where the house holds a session secret.' });
      if (!ready()) return res.status(503).json({ error: 'The owner\'s rights stand only over a standing ledger.' });
      const hash = String(req.params.hash || '');
      if (!/^[a-f0-9]{64}$/.test(hash)) return res.status(400).json({ error: 'The shelf answers to bare content hashes alone.' });
      const owner = String(req.query.su || '');
      const exp = Number(req.query.se);
      const given = String(req.query.st || '');
      if (!owner || !given || !Number.isFinite(exp)) return res.status(403).json({ error: 'The token is not whole.' });
      if (exp < now()) return res.status(403).json({ error: 'The token has lapsed — bale a fresh parcel.' });
      const expected = fetchToken(secret, owner, hash, exp);
      if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
        return res.status(403).json({ error: 'The token is not the house\'s.' });
      }
      const held = await q('SELECT 1 FROM vault_media WHERE user_id = $1 AND asset_hash = $2', [owner, hash]);
      if (!held.rows.length) return res.status(404).json({ error: 'No such holding under that name.' });
      const { bytes, mime } = await blobs.get(hash);
      res.setHeader('Cache-Control', 'private, no-store');
      res.type(mime || 'application/octet-stream').send(Buffer.from(bytes));
    } catch (error) {
      res.status(500).json({ error: `The shelf stumbled: ${error?.message || error}` });
    }
  });

  // THE PYRE — the account-wide burn. Blobs first, under the owner's
  // holdings only and only those no other name still cites; verified
  // gone; a single gutter aborts BEFORE any row burns, honestly and
  // retryably. Then every table in one transaction, the name last.
  router.post('/account/pyre', guarded, async (req, res) => {
    try {
      assertRollCovered();
      const spoken = typeof req.body?.phrase === 'string' ? req.body.phrase : '';
      if (spoken !== PYRE_PHRASE) {
        return res.status(412).json({ refused: 'phrase-mismatch', error: `The pyre lights only for its phrase spoken back whole. Write it exactly: “${PYRE_PHRASE}”.` });
      }
      await raiseShelves();
      const owner = req.patron.id;

      // THE ASH — the owner's blobs, minus every hash the living still
      // cite (another name's vault shelf, or another name's un-revoked
      // published page). Content-addressed shelves are one shelf.
      const mine = (await q('SELECT asset_hash FROM vault_media WHERE user_id = $1 ORDER BY asset_hash', [owner])).rows.map((row) => row.asset_hash);
      const living = new Set([
        ...(await q('SELECT DISTINCT asset_hash FROM vault_media WHERE user_id <> $1', [owner])).rows.map((row) => row.asset_hash),
        ...(await q('SELECT DISTINCT pa.asset_hash FROM publish_assets pa JOIN publish_pages pp ON pp.publish_id = pa.publish_id WHERE pp.user_id <> $1 AND pp.revoked_at IS NULL', [owner])).rows.map((row) => row.asset_hash),
      ]);
      const toBurn = mine.filter((hash) => !living.has(hash));
      const kept = mine.length - toBurn.length;
      const burned = [];
      let gutter = null;
      for (const hash of toBurn) {
        try {
          await blobs.delete(hash);
          if (await blobs.has(hash)) throw new Error('the shelf still answers for it');
          burned.push(hash);
        } catch (error) {
          gutter = { hash, word: String(error?.message || error) };
          break;
        }
      }
      if (gutter) {
        logLine('warn', 'account_pyre_gutter', { patron: owner, owed: toBurn.length, burned: burned.length, at: gutter.hash, word: gutter.word });
        return res.status(502).json({
          ok: false, retryable: true, phase: 'blobs',
          error: `The pyre guttered at the shelf — ${burned.length} of ${toBurn.length} blobs burned, and not one row was touched. Strike the match again: what burned stays burned, the rest still stands.`,
          blobs: { owed: toBurn.length, burned: burned.length, kept },
        });
      }

      // THE ROWS — one transaction, every shelf on the roll, honest
      // counts, the owner's own name last.
      const rows = await transact(async (tx) => {
        const counts = {};
        for (const table of BURN_ORDER) {
          const clause = RIGHTS_ROLL[table].pyre;
          const args = clause.args ? clause.args(owner) : [owner];
          counts[table] = (await tx(clause.verse, args)).rowCount || 0;
        }
        return counts;
      });

      const rowsBurned = Object.values(rows).reduce((sum, count) => sum + count, 0);
      logLine('info', 'account_pyre', { patron: owner, rows: rowsBurned, blobsBurned: burned.length, blobsKept: kept });
      res.json({
        ok: true,
        pyre: 'account',
        rows,
        exempt: { spend_days: RIGHTS_ROLL.spend_days.exempt },
        blobs: { burned: burned.length, kept, ...(kept ? { keptWord: 'kept for the living — other names still cite them on the one shelf' } : {}) },
        clerk: 'One step remains and it is yours: your sign-in identity at the Clerk door still stands. Remove it there, or keep it — signing in again founds a new, empty account. The house keeps nothing else of yours.',
      });
    } catch (error) {
      logLine('error', 'account_pyre_failed', { patron: req.patron?.id, word: String(error?.message || error) });
      res.status(500).json({ ok: false, retryable: true, phase: 'rows', error: `The pyre failed at the rows and rolled back whole — the blobs already burned stay burned, every row still stands. Strike the match again: ${error?.message || error}` });
    }
  });

  return router;
}
