// THE PYRE AND THE PARCEL, judged — the owner's two standing rights on
// the bench (Task 65, Phase 11; Directive XX, Law XII).
//
// A keyless table (Clerk env scrubbed), no network, no Postgres, no GCS:
// a Map-backed ledger that speaks both the vault's verses and the rights'
// verses, a Map-backed blob shelf with a poisonable torch, a stub patron
// at the door, and TWO seeded owners — because every burn court is also
// a survival court for the other name.
//
// Laws proven here:
//   1. THE STRONG TOOTH — the table roll derives from the schema's own
//      DDL; a planted table without a rights clause reds by name, and a
//      clause naming no table reds too. Fail closed against tomorrow.
//   2. THE WIRING — both doors stand in index.js's own namedOnly array,
//      and the rights router mounts AFTER that gate (the court reads the
//      source, not a mirror of it).
//   3. THE PARCEL — byte-complete across every table under one name and
//      zero rows of any other; journal envelopes ride WHOLE (a rider
//      field the house never heard of arrives intact); public key halves
//      only; deterministic byte-for-byte on repeat; media by short-lived
//      signed fetch that serves the owner and refuses tampered, lapsed,
//      and foreign tokens.
//   4. THE PYRE — the phrase must be spoken back whole (mismatch refused
//      by name, nothing touched); a guttering blob aborts BEFORE any row
//      burns and answers retryable; the true burn takes blobs first
//      (keeping every hash the living still cite), then every table in
//      ONE transaction with honest counts, the owner's name last, the
//      Clerk step named; the other owner survives untouched; a second
//      match finds only ash, never an error.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import express from 'express';

delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;

const { canonicalize, sha256 } = await import('fatescript/canonical');
const { vaultRoutes, __resetVaultForEval } = await import('../server/vault.js');
const { namedOnly } = await import('../server/patrons.js');
const {
  rightsRoutes, tableRoll, assertRollCovered, RIGHTS_ROLL, HOUSE_DDL, BURN_ORDER, PYRE_PHRASE,
} = await import('../server/rights.js');

const FIXED_NOW = 1770000000000;
const BENCH_SECRET = 'bench-secret';
const hex = (bytes) => createHash('sha256').update(bytes).digest('hex');
const token = (owner, hash, exp) => createHmac('sha256', BENCH_SECRET).update(`${owner}\n${hash}\n${exp}`).digest('hex');

// ------------------------------------------------- 1. THE STRONG TOOTH
{
  const roll = tableRoll();
  assert.deepEqual(roll, [
    'publish_assets', 'publish_pages', 'rate_windows', 'spend_days',
    'usage_events', 'users', 'vault_campaigns', 'vault_journal', 'vault_media',
  ], 'the roll reads every shelf out of the DDL itself');
  assert.equal(assertRollCovered(), true, 'every shelf on the roll carries a rights clause');
  assert.equal(BURN_ORDER[BURN_ORDER.length - 1], 'users', 'the owner\'s own name burns last');
  assert.throws(
    () => assertRollCovered(tableRoll([...HOUSE_DDL, 'CREATE TABLE IF NOT EXISTS strangers_ledger (id TEXT PRIMARY KEY)']), RIGHTS_ROLL),
    /strangers_ledger/,
    'a shelf born tomorrow without a clause reds the gate the day it is born',
  );
  // The tooth reads EVERY spelling a Postgres shelf can wear — and a
  // name it cannot read is a thrown hole, never a silent pass.
  for (const spelling of [
    'CREATE TABLE strangers_ledger (id TEXT PRIMARY KEY)',
    'CREATE TABLE "strangers_ledger" (id TEXT PRIMARY KEY)',
    'CREATE TABLE app."strangers_ledger" (id TEXT PRIMARY KEY)',
    'create table if not exists strangers_ledger (id TEXT PRIMARY KEY)',
  ]) {
    assert.throws(
      () => assertRollCovered(tableRoll([...HOUSE_DDL, spelling]), RIGHTS_ROLL),
      /strangers_ledger/,
      `the tooth reads the spelling whole: ${spelling.slice(0, 44)}`,
    );
  }
  assert.throws(
    () => tableRoll([...HOUSE_DDL, 'CREATE TABLE "1st-shelf" (id TEXT PRIMARY KEY)']),
    /hides its name/,
    'a shelf the reader cannot name throws — fail closed, never a silent slip',
  );
  assert.throws(
    () => assertRollCovered(tableRoll(), { ...RIGHTS_ROLL, ghost_shelf: { exempt: 'never raised' } }),
    /ghost_shelf/,
    'a clause naming no shelf reds too — the ledger cannot rot in either direction',
  );
  assert.equal(typeof PYRE_PHRASE, 'string');
  assert.ok(PYRE_PHRASE.length > 20, 'the phrase is a sentence, not a nod');
  console.log('ok — the strong tooth: a planted table reds by name, both directions');
}

// ------------------------------------------------------- 2. THE WIRING
{
  const source = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8');
  const doorList = (source.match(/app\.use\(\s*\[([\s\S]*?)\]\s*,\s*namedOnly\(\)/) || [])[1] || '';
  assert.ok(doorList.includes("'/api/vault/parcel'"), 'the parcel stands in the named-only array itself');
  assert.ok(doorList.includes("'/api/account/pyre'"), 'the pyre stands in the named-only array itself');
  const gateAt = source.indexOf('namedOnly(),');
  const rightsAt = source.indexOf("app.use('/api', rightsRoutes())");
  assert.ok(gateAt > 0 && rightsAt > gateAt, 'the rights router mounts AFTER the named gate — the array truly stands in its path');
  console.log('ok — the wiring: both doors seated in the named-only array, rights mounted behind it');
}

// ---------------------------------------------------------- the stand-ins
// THE BINDING — the rights' own verses are matched WHOLE (normalized
// whitespace, nothing else), never by fragment: a predicate drifting in
// server/rights.js — an owner filter flipped, a revoked fence dropped —
// makes the verse a stranger here, and the stand-in refuses strangers
// (500 at the door, red at the court). A lawful change to a verse must
// re-seat its twin here on purpose. The vault's lifted verses further
// down stay fragment-matched: they serve seeding only, and the vault's
// own gate binds them.
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const VERSE = Object.fromEntries(Object.entries({
  usersParcel: 'SELECT id, clerk_user_id, display_name, plan, stripe_customer_id, created_at, updated_at FROM users WHERE id = $1',
  usageParcel: 'SELECT kind, provider, campaign_id, turn, created_at FROM usage_events WHERE user_id = $1 ORDER BY created_at, kind, campaign_id, turn',
  campaignsParcel: 'SELECT campaign_id, head_hash, turn_count, signature_status, public_key_jwk, meta, updated_at FROM vault_campaigns WHERE user_id = $1 ORDER BY campaign_id',
  journalParcel: 'SELECT campaign_id, i, record_hash, prev_hash, record FROM vault_journal WHERE user_id = $1 ORDER BY campaign_id, i',
  mediaParcel: 'SELECT asset_hash, mime, byte_length, created_at FROM vault_media WHERE user_id = $1 ORDER BY asset_hash',
  pagesParcel: 'SELECT publish_id, campaign_id, title, record, head_hash, turn_count, listed, published_at, revoked_at FROM publish_pages WHERE user_id = $1 ORDER BY publish_id',
  passetsParcel: 'SELECT pa.publish_id, pa.asset_hash, pa.mime FROM publish_assets pa JOIN publish_pages pp ON pp.publish_id = pa.publish_id WHERE pp.user_id = $1 ORDER BY pa.publish_id, pa.asset_hash',
  windowsParcel: 'SELECT * FROM rate_windows WHERE key LIKE $1 ORDER BY key',
  mine: 'SELECT asset_hash FROM vault_media WHERE user_id = $1 ORDER BY asset_hash',
  livingVault: 'SELECT DISTINCT asset_hash FROM vault_media WHERE user_id <> $1',
  livingPages: 'SELECT DISTINCT pa.asset_hash FROM publish_assets pa JOIN publish_pages pp ON pp.publish_id = pa.publish_id WHERE pp.user_id <> $1 AND pp.revoked_at IS NULL',
  blobHeld: 'SELECT 1 FROM vault_media WHERE user_id = $1 AND asset_hash = $2',
  burnUsage: 'DELETE FROM usage_events WHERE user_id = $1',
  burnJournal: 'DELETE FROM vault_journal WHERE user_id = $1',
  burnMedia: 'DELETE FROM vault_media WHERE user_id = $1',
  burnCampaigns: 'DELETE FROM vault_campaigns WHERE user_id = $1',
  burnPassets: 'DELETE FROM publish_assets WHERE publish_id IN (SELECT publish_id FROM publish_pages WHERE user_id = $1)',
  burnPages: 'DELETE FROM publish_pages WHERE user_id = $1',
  burnWindows: 'DELETE FROM rate_windows WHERE key LIKE $1',
  burnUsers: 'DELETE FROM users WHERE id = $1',
}).map(([key, verse]) => [key, norm(verse)]));
const is = (t, key) => {
  if (!(key in VERSE)) throw new Error(`the bench names no verse called ${key}`);
  return norm(t) === VERSE[key];
};

function memLedger() {
  const users = new Map();     // id -> row
  const usage = [];            // { user_id, kind, provider, campaign_id, turn, created_at }
  const campaigns = new Map(); // `${user}:${camp}` -> row
  const journal = new Map();   // `${user}:${camp}` -> [record]
  const media = new Map();     // `${user}:${hash}` -> { mime, byte_length, created_at }
  const pages = new Map();     // publish_id -> row
  const passets = [];          // { publish_id, asset_hash, mime }
  const windows = new Map();   // key -> { key, window_start, count }
  const deletes = [];          // { verse, inTx } — the transaction court's audit
  const byUser = (map, id) => [...map.entries()].filter(([k]) => k.startsWith(`${id}:`));
  return {
    users, usage, campaigns, journal, media, pages, passets, windows, deletes,
    async query(text, params = [], opts = {}) {
      const t = String(text);
      if (/^\s*(CREATE|ALTER|DO)\b/i.test(t.trim())) return { rows: [], rowCount: 0 };
      if (/^\s*DELETE/i.test(t.trim())) deletes.push({ verse: t.replace(/\s+/g, ' ').trim(), inTx: Boolean(opts.inTx) });

      // ---- the rights' own verses — matched WHOLE, strangers refused
      if (is(t, 'usersParcel')) {
        const row = users.get(params[0]);
        return { rows: row ? [{ ...row }] : [] };
      }
      if (is(t, 'usageParcel')) {
        const rows = usage.filter((u) => u.user_id === params[0])
          .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.kind.localeCompare(b.kind))
          .map(({ user_id, ...rest }) => ({ ...rest }));
        return { rows };
      }
      if (is(t, 'campaignsParcel')) {
        const rows = byUser(campaigns, params[0])
          .map(([k, v]) => ({ campaign_id: k.slice(params[0].length + 1), head_hash: v.head_hash, turn_count: v.turn_count, signature_status: v.signature_status ?? null, public_key_jwk: v.public_key_jwk ?? null, meta: v.meta ?? {}, updated_at: v.updated_at }))
          .sort((a, b) => a.campaign_id.localeCompare(b.campaign_id));
        return { rows };
      }
      if (is(t, 'journalParcel')) {
        const rows = byUser(journal, params[0])
          .flatMap(([k, list]) => list.map((record) => ({ campaign_id: k.slice(params[0].length + 1), i: record.i, record_hash: record.recordHash, prev_hash: record.prevHash, record })))
          .sort((a, b) => a.campaign_id.localeCompare(b.campaign_id) || a.i - b.i);
        return { rows };
      }
      if (is(t, 'mediaParcel')) {
        const rows = byUser(media, params[0])
          .map(([k, v]) => ({ asset_hash: k.slice(params[0].length + 1), ...v }))
          .sort((a, b) => a.asset_hash.localeCompare(b.asset_hash));
        return { rows };
      }
      if (is(t, 'pagesParcel')) {
        const rows = [...pages.values()].filter((p) => p.user_id === params[0])
          .map(({ user_id, ...rest }) => ({ ...rest }))
          .sort((a, b) => a.publish_id.localeCompare(b.publish_id));
        return { rows };
      }
      if (is(t, 'passetsParcel')) {
        const own = new Set([...pages.values()].filter((p) => p.user_id === params[0]).map((p) => p.publish_id));
        const rows = passets.filter((a) => own.has(a.publish_id)).map((a) => ({ ...a }))
          .sort((a, b) => a.publish_id.localeCompare(b.publish_id) || a.asset_hash.localeCompare(b.asset_hash));
        return { rows };
      }
      if (is(t, 'windowsParcel')) {
        const prefix = String(params[0]).replace(/%$/, '');
        const rows = [...windows.values()].filter((w) => w.key.startsWith(prefix)).map((w) => ({ ...w }))
          .sort((a, b) => a.key.localeCompare(b.key));
        return { rows };
      }
      if (is(t, 'mine')) {
        return { rows: byUser(media, params[0]).map(([k]) => ({ asset_hash: k.slice(params[0].length + 1) })).sort((a, b) => a.asset_hash.localeCompare(b.asset_hash)) };
      }
      if (is(t, 'livingVault')) {
        const others = new Set([...media.keys()].filter((k) => !k.startsWith(`${params[0]}:`)).map((k) => k.split(':')[1]));
        return { rows: [...others].map((h) => ({ asset_hash: h })) };
      }
      if (is(t, 'livingPages')) {
        const living = new Set([...pages.values()].filter((p) => p.user_id !== params[0] && !p.revoked_at).map((p) => p.publish_id));
        return { rows: [...new Set(passets.filter((a) => living.has(a.publish_id)).map((a) => a.asset_hash))].map((h) => ({ asset_hash: h })) };
      }
      if (is(t, 'blobHeld')) {
        return { rows: media.has(`${params[0]}:${params[1]}`) ? [{ '?column?': 1 }] : [] };
      }

      // ---- the rights' burns — matched WHOLE (the vault's camp-scoped stay regex, seeding only)
      if (is(t, 'burnUsage')) {
        const before = usage.length;
        for (let i = usage.length - 1; i >= 0; i -= 1) if (usage[i].user_id === params[0]) usage.splice(i, 1);
        return { rows: [], rowCount: before - usage.length };
      }
      if (/DELETE FROM vault_journal WHERE user_id = \$1 AND campaign_id/.test(t)) {
        journal.delete(`${params[0]}:${params[1]}`);
        return { rows: [], rowCount: 0 };
      }
      if (is(t, 'burnJournal')) {
        let n = 0;
        for (const [k, list] of byUser(journal, params[0])) { n += list.length; journal.delete(k); }
        return { rows: [], rowCount: n };
      }
      if (is(t, 'burnMedia')) {
        let n = 0;
        for (const [k] of byUser(media, params[0])) { media.delete(k); n += 1; }
        return { rows: [], rowCount: n };
      }
      if (/DELETE FROM vault_campaigns WHERE user_id = \$1 AND campaign_id/.test(t)) {
        const had = campaigns.delete(`${params[0]}:${params[1]}`);
        return { rows: [], rowCount: had ? 1 : 0 };
      }
      if (is(t, 'burnCampaigns')) {
        let n = 0;
        for (const [k] of byUser(campaigns, params[0])) { campaigns.delete(k); n += 1; }
        return { rows: [], rowCount: n };
      }
      if (is(t, 'burnPassets')) {
        const own = new Set([...pages.values()].filter((p) => p.user_id === params[0]).map((p) => p.publish_id));
        const before = passets.length;
        for (let i = passets.length - 1; i >= 0; i -= 1) if (own.has(passets[i].publish_id)) passets.splice(i, 1);
        return { rows: [], rowCount: before - passets.length };
      }
      if (is(t, 'burnPages')) {
        let n = 0;
        for (const [id, p] of [...pages.entries()]) if (p.user_id === params[0]) { pages.delete(id); n += 1; }
        return { rows: [], rowCount: n };
      }
      if (is(t, 'burnWindows')) {
        const prefix = String(params[0]).replace(/%$/, '');
        let n = 0;
        for (const k of [...windows.keys()]) if (k.startsWith(prefix)) { windows.delete(k); n += 1; }
        return { rows: [], rowCount: n };
      }
      if (is(t, 'burnUsers')) {
        const had = users.delete(params[0]);
        return { rows: [], rowCount: had ? 1 : 0 };
      }

      // ---- the vault's own verses (lifted from its bench, for seeding)
      if (/SELECT head_hash, turn_count FROM vault_campaigns/.test(t)) {
        const row = campaigns.get(`${params[0]}:${params[1]}`);
        return { rows: row ? [{ head_hash: row.head_hash, turn_count: row.turn_count }] : [] };
      }
      if (/SELECT head_hash, turn_count, signature_status, public_key_jwk, meta FROM vault_campaigns/.test(t)) {
        const row = campaigns.get(`${params[0]}:${params[1]}`);
        return { rows: row ? [row] : [] };
      }
      if (/SELECT campaign_id, head_hash/.test(t)) {
        return { rows: byUser(campaigns, params[0]).map(([k, v]) => ({ campaign_id: k.split(':')[1], ...v })) };
      }
      if (/SELECT record FROM vault_journal/.test(t)) {
        const list = journal.get(`${params[0]}:${params[1]}`) || [];
        return { rows: list.filter((r) => r.i >= params[2]).sort((a, b) => a.i - b.i).map((record) => ({ record })) };
      }
      if (/INSERT INTO vault_journal/.test(t)) {
        const key = `${params[0]}:${params[1]}`;
        const list = journal.get(key) || [];
        if (!list.some((r) => r.i === params[2])) list.push(JSON.parse(params[5]));
        journal.set(key, list);
        return { rows: [] };
      }
      if (/INSERT INTO vault_campaigns/.test(t)) {
        const key = `${params[0]}:${params[1]}`;
        const prev = campaigns.get(key) || {};
        campaigns.set(key, {
          head_hash: params[2], turn_count: params[3],
          signature_status: params[4] ?? prev.signature_status ?? null,
          public_key_jwk: params[5] ? JSON.parse(params[5]) : prev.public_key_jwk ?? null,
          meta: params[6] ? JSON.parse(params[6]) : prev.meta ?? {},
          updated_at: '2026-07-20T12:00:00.000Z',
        });
        return { rows: [] };
      }
      if (/SELECT asset_hash FROM vault_media/.test(t)) {
        return { rows: (params[1] || []).filter((h) => media.has(`${params[0]}:${h}`)).map((h) => ({ asset_hash: h })) };
      }
      if (/INSERT INTO vault_media/.test(t)) {
        const key = `${params[0]}:${params[1]}`;
        if (!media.has(key)) media.set(key, { mime: params[2], byte_length: params[3], created_at: '2026-07-20T12:00:00.000Z' });
        return { rows: [] };
      }
      if (/SELECT mime FROM vault_media/.test(t)) {
        const row = media.get(`${params[0]}:${params[1]}`);
        return { rows: row ? [row] : [] };
      }
      throw new Error(`the stand-in ledger does not know this verse: ${t.slice(0, 70)}`);
    },
  };
}
function memBlobs() {
  const shelf = new Map();
  let poison = null;
  return {
    shelf,
    setPoison(hash) { poison = hash; },
    async has(hash) { return shelf.has(hash); },
    async put(hash, bytes, mime) { shelf.set(hash, { bytes: Buffer.from(bytes), mime }); },
    async get(hash) { const it = shelf.get(hash); if (!it) throw new Error('no such blob on the shelf'); return { bytes: it.bytes, mime: it.mime }; },
    async delete(hash) { if (poison === hash) throw new Error('the shelf refused the torch (bench poison)'); shelf.delete(hash); },
  };
}
async function makeRecord({ type = 'turn', i, prevHash, payload, ts = FIXED_NOW + i }) {
  const unsigned = { type, i, prevHash, payload, ts };
  return { ...unsigned, recordHash: await sha256(canonicalize(unsigned)) };
}
async function makeChain(n, { startAt = 0, prevHash = null, salt = '' } = {}) {
  const records = [];
  let prev = prevHash;
  for (let i = startAt; i < startAt + n; i += 1) {
    const record = await makeRecord({ i, prevHash: prev, payload: { player: `deed ${i}${salt}` } });
    records.push(record); prev = record.recordHash;
  }
  return records;
}

// ------------------------------------------------------- the bench rises
__resetVaultForEval();
const ledger = memLedger();
const blobs = memBlobs();
let txOpen = false;
const transact = async (work) => {
  if (txOpen) throw new Error('the bench allows one transaction at a time');
  txOpen = true;
  try { return await work((text, params) => ledger.query(text, params, { inTx: true })); }
  finally { txOpen = false; }
};
const app = express();
// The stub door, then the exact live order: vault, the named gate, rights.
app.use((req, _res, next) => { const id = req.get('x-patron'); req.patron = id ? { id } : null; next(); });
app.post('/api/vault/media/:hash', express.raw({ type: () => true, limit: '25mb' }));
app.use(express.json({ limit: '25mb' }));
app.use('/api', vaultRoutes({ query: ledger.query, blobs }));
app.use(['/api/vault/parcel', '/api/account/pyre'], namedOnly()); // scrubbed env: pass-through, seated to mirror the live order
app.use('/api', rightsRoutes({ query: ledger.query, blobs, transact, now: () => FIXED_NOW, secret: BENCH_SECRET }));
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const as = (patron) => (patron ? { 'X-Patron': patron } : {});
const post = (path, body, patron) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...as(patron) }, body: JSON.stringify(body) });
const putBlob = async (owner, bytes, mime) => {
  const hash = hex(bytes);
  const answer = await fetch(`${base}/api/vault/media/${hash}`, { method: 'POST', headers: { 'Content-Type': mime, ...as(owner) }, body: bytes });
  assert.ok([200, 201].includes(answer.status), `the shelf takes lawful bytes (${answer.status})`);
  return hash;
};

// ------------------------------------------------------------ the seeding
ledger.users.set('user-ash', { id: 'user-ash', clerk_user_id: 'clerk_ash', display_name: 'Ash', plan: 'weekly', stripe_customer_id: 'cus_ash', created_at: '2026-07-01T00:00:00.000Z', updated_at: '2026-07-02T00:00:00.000Z' });
ledger.users.set('user-elm', { id: 'user-elm', clerk_user_id: 'clerk_elm', display_name: 'Elm', plan: 'yearly', stripe_customer_id: 'cus_elm', created_at: '2026-07-03T00:00:00.000Z', updated_at: '2026-07-04T00:00:00.000Z' });
ledger.usage.push(
  { user_id: 'user-ash', kind: 'dm', provider: 'anthropic', campaign_id: 'camp-A1', turn: 3, created_at: '2026-07-10T10:00:00.000Z' },
  { user_id: 'user-ash', kind: 'paint', provider: 'gemini', campaign_id: 'camp-A1', turn: 4, created_at: '2026-07-10T11:00:00.000Z' },
  { user_id: 'user-elm', kind: 'dm', provider: 'anthropic', campaign_id: 'camp-B1', turn: 1, created_at: '2026-07-11T09:00:00.000Z' },
);
const chainA1 = await makeChain(5, { salt: ' of ash' });
const chainA2 = await makeChain(2, { salt: ' of the second spine' });
const chainB1 = await makeChain(3, { salt: ' of elm' });
assert.equal((await post('/api/vault/push', { campaignId: 'camp-A1', records: chainA1, meta: { title: 'The Ash March', hero: { name: 'Ashlin' }, logs: [] } }, 'user-ash')).status, 200);
assert.equal((await post('/api/vault/push', { campaignId: 'camp-A2', records: chainA2, meta: { title: 'The Second Spine', hero: { name: 'Ashlin' }, logs: [] } }, 'user-ash')).status, 200);
assert.equal((await post('/api/vault/push', { campaignId: 'camp-B1', records: chainB1, meta: { title: 'The Elm Court', hero: { name: 'Elmori' }, logs: [] } }, 'user-elm')).status, 200);
// Plant what the door cannot carry: a private key half on ash's spine (the
// parcel must strip it), a public half on elm's (a parcel must KEEP those),
// and a rider field inside a stored envelope that no schema ever named —
// the parcel must hand it back byte-identical, or the whole-row law is lost.
ledger.campaigns.get('user-ash:camp-A1').public_key_jwk = { kty: 'OKP', crv: 'Ed25519', x: 'pub-x-ash-a1', d: 'PRIVATE-HALF-MUST-NEVER-BOARD' };
ledger.campaigns.get('user-elm:camp-B1').public_key_jwk = { kty: 'OKP', crv: 'Ed25519', x: 'pub-x-elm-b1' };
ledger.journal.get('user-ash:camp-A1')[2].futureRider = { law: 'envelopes ride whole', n: 7 };
const ashOnly = await putBlob('user-ash', 'ash-only-plate', 'image/png');
const ashOnly2 = await putBlob('user-ash', 'ash-only-plate-two', 'image/png');
const shared = await putBlob('user-ash', 'the-shared-plate', 'image/png');
assert.equal(await putBlob('user-elm', 'the-shared-plate', 'image/png'), shared, 'one shelf, one seat — elm cites the same hash');
const pubShared = await putBlob('user-ash', 'the-commons-plate', 'image/png');
const elmOnly = await putBlob('user-elm', 'elm-only-plate', 'image/png');
ledger.pages.set('pg-ash-1', { publish_id: 'pg-ash-1', user_id: 'user-ash', campaign_id: 'camp-A1', title: 'The Ash March, told', record: 'SEALED-PAGE-ASH', head_hash: chainA1[4].recordHash, turn_count: 5, listed: true, published_at: '2026-07-12T00:00:00.000Z', revoked_at: null });
ledger.pages.set('pg-elm-1', { publish_id: 'pg-elm-1', user_id: 'user-elm', campaign_id: 'camp-B1', title: 'The Elm Court, told', record: 'SEALED-PAGE-ELM', head_hash: chainB1[2].recordHash, turn_count: 3, listed: false, published_at: '2026-07-13T00:00:00.000Z', revoked_at: null });
ledger.pages.set('pg-elm-dead', { publish_id: 'pg-elm-dead', user_id: 'user-elm', campaign_id: 'camp-B1', title: 'A revoked telling', record: 'SEALED-PAGE-ELM-DEAD', head_hash: chainB1[2].recordHash, turn_count: 3, listed: false, published_at: '2026-07-14T00:00:00.000Z', revoked_at: '2026-07-15T00:00:00.000Z' });
ledger.passets.push(
  { publish_id: 'pg-ash-1', asset_hash: pubShared, mime: 'image/png' },
  { publish_id: 'pg-ash-1', asset_hash: ashOnly, mime: 'image/png' },
  { publish_id: 'pg-elm-1', asset_hash: pubShared, mime: 'image/png' },   // the LIVING other page — pubShared must survive
  { publish_id: 'pg-elm-dead', asset_hash: ashOnly2, mime: 'image/png' }, // a REVOKED page holds nothing — ashOnly2 still burns
);
ledger.windows.set('user-ash:/api/dm', { key: 'user-ash:/api/dm', window_start: '2026-07-20T00:00:00.000Z', count: 4 });
ledger.windows.set('user-elm:/api/dm', { key: 'user-elm:/api/dm', window_start: '2026-07-20T00:00:00.000Z', count: 2 });
ledger.windows.set('9.9.9.9:/api/dm', { key: '9.9.9.9:/api/dm', window_start: '2026-07-20T00:00:00.000Z', count: 1 });

// -------------------------------------------- 3. the doors ask the name
{
  assert.equal((await fetch(`${base}/api/vault/parcel`)).status, 401, 'a nameless parcel request is refused at the door');
  assert.equal((await post('/api/account/pyre', { phrase: PYRE_PHRASE })).status, 401, 'a nameless pyre request is refused at the door');
  console.log('ok — nameless requests find both doors locked (fail closed)');
}

// ------------------------------------------------------- 4. THE PARCEL
let parcelText;
{
  const answer = await fetch(`${base}/api/vault/parcel`, { headers: as('user-ash') });
  parcelText = await answer.text();
  assert.equal(answer.status, 200, `the named owner is handed the parcel — it said: ${parcelText.slice(0, 220)}`);
  assert.ok(String(answer.headers.get('content-disposition') || '').includes('mydungeon-account-parcel.json'));
  const parcel = JSON.parse(parcelText);
  const t = parcel.tables;
  assert.equal(t.users.clerk_user_id, 'clerk_ash');
  assert.equal(t.users.plan, 'weekly');
  assert.equal(t.users.stripe_customer_id, 'cus_ash', 'the owner\'s record is byte-complete, stripe seat included');
  assert.equal(t.usage_events.length, 2, 'every usage row under the name');
  assert.deepEqual(t.usage_events.map((u) => u.kind), ['dm', 'paint'], 'deterministic order');
  assert.deepEqual(t.vault_campaigns.map((c) => c.campaign_id), ['camp-A1', 'camp-A2']);
  assert.deepEqual(t.vault_campaigns[0].public_key_jwk, { kty: 'OKP', crv: 'Ed25519', x: 'pub-x-ash-a1' }, 'the public half boards; the private half was stripped at the door');
  assert.equal(t.vault_journal.length, 7, 'every journal row across both spines');
  const carried = t.vault_journal.find((r) => r.campaign_id === 'camp-A1' && r.i === 2);
  assert.deepEqual(carried.record, ledger.journal.get('user-ash:camp-A1')[2], 'the envelope rides WHOLE — the rider the schema never named arrives intact');
  assert.deepEqual(carried.record.futureRider, { law: 'envelopes ride whole', n: 7 });
  assert.deepEqual(t.vault_media.map((m) => m.asset_hash), [ashOnly, ashOnly2, shared, pubShared].sort(), 'the media manifest, by hash');
  for (const entry of t.vault_media) {
    assert.equal(entry.mime, 'image/png');
    assert.ok(entry.byte_length > 0);
    assert.equal(entry.fetch.path, `/api/account/parcel/blob/${entry.asset_hash}`);
    assert.equal(entry.fetch.expiresAt, FIXED_NOW + 15 * 60 * 1000, 'the fetch is short-lived by the bench\'s own clock');
    assert.ok(/st=[a-f0-9]{64}/.test(entry.fetch.query), 'the fetch is signed');
  }
  assert.deepEqual(t.publish_pages.map((p) => p.publish_id), ['pg-ash-1']);
  assert.equal(t.publish_pages[0].record, 'SEALED-PAGE-ASH', 'the sealed page rides whole');
  assert.equal(t.publish_assets.length, 2);
  assert.deepEqual(t.rate_windows.map((w) => w.key), ['user-ash:/api/dm']);
  assert.ok(/house telemetry/.test(t.spend_days.omitted), 'the one exempt shelf is named, with its reason');
  for (const stranger of ['user-elm', 'clerk_elm', 'Elm', 'camp-B1', 'pub-x-elm-b1', 'pg-elm', elmOnly]) {
    assert.ok(!parcelText.includes(stranger), `not one row of the other name boards (${stranger.slice(0, 12)}…)`);
  }
  assert.ok(!parcelText.includes('PRIVATE-HALF-MUST-NEVER-BOARD'), 'the private key half never boards');
  const again = await (await fetch(`${base}/api/vault/parcel`, { headers: as('user-ash') })).text();
  assert.equal(again, parcelText, 'two walks over the same rows bale byte-identical parcels');
  console.log('ok — the parcel: byte-complete, envelopes whole, public halves only, zero of the other name, deterministic');
}

// ------------------------------------------------- 5. the signed fetch
{
  const parcel = JSON.parse(parcelText);
  const entry = parcel.tables.vault_media.find((m) => m.asset_hash === ashOnly);
  const served = await fetch(`${base}${entry.fetch.path}?${entry.fetch.query}`);
  assert.equal(served.status, 200, 'the signed fetch serves the owner\'s blob to the token holder');
  assert.equal(Buffer.from(await served.arrayBuffer()).toString(), 'ash-only-plate', 'the bytes are the bytes');
  const exp = FIXED_NOW + 15 * 60 * 1000;
  const tampered = await fetch(`${base}${entry.fetch.path}?su=user-ash&se=${exp}&st=${'0'.repeat(64)}`);
  assert.equal(tampered.status, 403, 'a tampered signature is nobody\'s');
  const lapsed = await fetch(`${base}${entry.fetch.path}?su=user-ash&se=${FIXED_NOW - 1}&st=${token('user-ash', ashOnly, FIXED_NOW - 1)}`);
  assert.equal(lapsed.status, 403, 'a lapsed token is refused');
  const foreign = await fetch(`${base}/api/account/parcel/blob/${elmOnly}?su=user-ash&se=${exp}&st=${token('user-ash', elmOnly, exp)}`);
  assert.equal(foreign.status, 404, 'a lawful signature over a holding the name never had finds no shelf');
  const crooked = await fetch(`${base}/api/account/parcel/blob/not-a-hash?su=user-ash&se=${exp}&st=${token('user-ash', 'not-a-hash', exp)}`);
  assert.equal(crooked.status, 400, 'the shelf answers to bare content hashes alone');
  console.log('ok — the signed fetch: serves the holder, refuses tampered, lapsed, foreign, and crooked asks');
}

// --------------------------------------- 6. the phrase, spoken back whole
{
  const refused = await post('/api/account/pyre', { phrase: 'burn it all, I suppose' }, 'user-ash');
  assert.equal(refused.status, 412, 'a phrase not spoken back whole is refused');
  const body = await refused.json();
  assert.equal(body.refused, 'phrase-mismatch', 'refused by name');
  assert.ok(body.error.includes(PYRE_PHRASE), 'the refusal teaches the true phrase');
  assert.ok(ledger.users.has('user-ash'), 'nothing burned');
  assert.equal(blobs.shelf.size, 5, 'not one blob touched');
  assert.equal(ledger.deletes.length, 0, 'not one row touched');
  console.log('ok — the pyre refuses the unspoken phrase by name, and nothing moves');
}

// ------------------------------- 7. a guttering blob aborts before rows
{
  blobs.setPoison(ashOnly2);
  const guttered = await post('/api/account/pyre', { phrase: PYRE_PHRASE }, 'user-ash');
  assert.equal(guttered.status, 502, 'the gutter is an honest failure');
  const body = await guttered.json();
  assert.deepEqual({ ok: body.ok, retryable: body.retryable, phase: body.phase }, { ok: false, retryable: true, phase: 'blobs' });
  assert.equal(body.blobs.owed, 2, 'two blobs owed to the fire (the living\'s are not)');
  assert.ok(body.blobs.burned < body.blobs.owed, 'the walk stopped at the gutter');
  assert.equal(ledger.deletes.length, 0, 'NOT ONE ROW burned before the shelf was clean');
  assert.ok(ledger.users.has('user-ash') && ledger.journal.has('user-ash:camp-A1') && ledger.pages.has('pg-ash-1'), 'every row still stands');
  assert.ok(blobs.shelf.has(ashOnly2), 'the poisoned blob still stands on the shelf');
  console.log('ok — a guttering blob aborts the pyre before any row burns, and answers retryable');
}

// ----------------------------------------------------- 8. the true burn
{
  blobs.setPoison(null);
  const lit = await post('/api/account/pyre', { phrase: PYRE_PHRASE }, 'user-ash');
  assert.equal(lit.status, 200, 'the retry finds the shelf willing');
  const body = await lit.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.rows, {
    usage_events: 2, vault_journal: 7, vault_media: 4, vault_campaigns: 2,
    publish_assets: 2, publish_pages: 1, rate_windows: 1, users: 1,
  }, 'honest per-table counts, the name last');
  assert.deepEqual({ burned: body.blobs.burned, kept: body.blobs.kept }, { burned: 2, kept: 2 }, 'two burned, two kept for the living');
  assert.ok(/living/.test(body.blobs.keptWord || ''), 'the kept blobs are explained, not hidden');
  assert.ok(/house telemetry/.test(body.exempt.spend_days), 'the exempt shelf is named in the answer');
  assert.ok(/Clerk/.test(body.clerk), 'the Clerk identity is named as the owner\'s own remaining step');
  for (const [table, gone] of [
    ['users', !ledger.users.has('user-ash')],
    ['usage_events', ledger.usage.every((u) => u.user_id !== 'user-ash')],
    ['vault_campaigns', ![...ledger.campaigns.keys()].some((k) => k.startsWith('user-ash:'))],
    ['vault_journal', ![...ledger.journal.keys()].some((k) => k.startsWith('user-ash:'))],
    ['vault_media', ![...ledger.media.keys()].some((k) => k.startsWith('user-ash:'))],
    ['publish_pages', ![...ledger.pages.values()].some((p) => p.user_id === 'user-ash')],
    ['publish_assets', !ledger.passets.some((a) => a.publish_id.startsWith('pg-ash'))],
    ['rate_windows', ![...ledger.windows.keys()].some((k) => k.startsWith('user-ash:'))],
  ]) assert.ok(gone, `${table}: burned to zero under the owner's name`);
  assert.ok(!blobs.shelf.has(ashOnly) && !blobs.shelf.has(ashOnly2), 'the owner\'s exclusive blobs are ash');
  assert.ok(blobs.shelf.has(shared), 'a hash the other name\'s vault still cites is kept');
  assert.ok(blobs.shelf.has(pubShared), 'a hash the other name\'s LIVING page still cites is kept');
  assert.ok(blobs.shelf.has(elmOnly), 'the other name\'s own holding never entered the fire');
  const burns = ledger.deletes;
  assert.equal(burns.length, 8, 'eight shelves, eight burns');
  assert.ok(burns.every((d) => d.inTx), 'every row burn rode the ONE transaction');
  assert.ok(burns[burns.length - 1].verse.includes('FROM users'), 'the owner\'s own name burned last');
  // The other owner, untouched — and still served whole.
  assert.ok(ledger.users.has('user-elm') && ledger.campaigns.has('user-elm:camp-B1') && ledger.pages.has('pg-elm-1'));
  assert.equal(ledger.windows.has('9.9.9.9:/api/dm'), true, 'the nameless window keyed to an address is not the owner\'s to burn');
  const elmParcel = JSON.parse(await (await fetch(`${base}/api/vault/parcel`, { headers: as('user-elm') })).text());
  assert.deepEqual(elmParcel.tables.vault_campaigns.map((c) => c.campaign_id), ['camp-B1'], 'the other owner\'s parcel still bales whole after the fire');
  assert.equal(elmParcel.tables.vault_campaigns[0].public_key_jwk.x, 'pub-x-elm-b1');
  // A second match finds only ash — never an error.
  const again = await post('/api/account/pyre', { phrase: PYRE_PHRASE }, 'user-ash');
  assert.equal(again.status, 200);
  const cold = await again.json();
  assert.equal(Object.values(cold.rows).reduce((a, b) => a + b, 0), 0, 'a second match finds only ash');
  assert.equal(cold.blobs.burned, 0);
  console.log('ok — the pyre: blobs first (the living\'s kept), one transaction, honest counts, the other name untouched, idempotent');
}

server.close();
console.log('PASS pyreParcel — the parcel bales all nine shelves byte-deterministic (envelopes whole, public halves only, zero of the other name, signed fetch lawful), and the pyre refused the unspoken phrase, aborted whole at a guttering shelf, then burned 20 rows across 8 tables and 2 blobs in one transaction — 2 kept for the living, spend_days exempt by name, the Clerk step named, the other owner untouched, the strong tooth set against tomorrow.');
