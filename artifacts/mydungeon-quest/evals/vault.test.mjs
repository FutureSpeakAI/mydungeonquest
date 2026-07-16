// THE VAULT, judged — custody-first cloud backup, on the bench.
//
// The bench sits at a keyless table (Clerk env scrubbed) and judges the
// vault through its injection seams: a Map-backed ledger stands in for
// Postgres, a Map-backed shelf for App Storage, and a stub patron walks in
// ahead of every request. No live Clerk, no live Postgres, no live GCS —
// keyless forks must stay green.
//
// Laws proven here:
//   1. Dormancy — a keyless table has no vault ({ live:false }), and a
//      live vault refuses guests (401, fail CLOSED).
//   2. The chain is the law — round-trip fidelity: pushed records verify,
//      pulled records re-verify link by link (the notary's own arithmetic).
//   3. Tamper rejection — a record that cannot answer for its hash, or a
//      broken link, refuses the WHOLE push (422).
//   4. No silent merge — a push that would rewrite history is a 409, and
//      the client's planner answers 'fork' for the same stance.
//   5. Blobs are content-addressed — bytes that don't answer for their
//      name are refused; dedupe holds; another patron's vault is a locked
//      drawer (404).
//   6. The redaction law crosses devices — a strike pulled from the vault
//      fells the same log by the same ordinal alignment.
import assert from 'node:assert/strict';
import express from 'express';

delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;

const { canonicalize, sha256 } = await import('fatescript/canonical');
const { vaultOpen, vaultRoutes, judgeChain, __resetVaultForEval } = await import('../server/vault.js');

assert.equal(vaultOpen(), false, 'scrubbed keys must read as a dormant vault');

// ---------------------------------------------------------- the stand-ins
function memLedger() {
  const campaigns = new Map(); // `${user}:${campaign}` -> row
  const journal = new Map();   // `${user}:${campaign}` -> [record]
  const media = new Map();     // `${user}:${hash}` -> { mime, byte_length }
  return {
    campaigns, journal, media,
    async query(text, params = []) {
      if (/CREATE TABLE/.test(text)) return { rows: [] };
      if (/SELECT head_hash, turn_count FROM vault_campaigns/.test(text)) {
        const row = campaigns.get(`${params[0]}:${params[1]}`);
        return { rows: row ? [{ head_hash: row.head_hash, turn_count: row.turn_count }] : [] };
      }
      if (/SELECT head_hash, turn_count, signature_status, public_key_jwk, meta FROM vault_campaigns/.test(text)) {
        const row = campaigns.get(`${params[0]}:${params[1]}`);
        return { rows: row ? [row] : [] };
      }
      if (/SELECT campaign_id, head_hash/.test(text)) {
        return { rows: [...campaigns.entries()].filter(([k]) => k.startsWith(`${params[0]}:`)).map(([k, v]) => ({ campaign_id: k.split(':')[1], ...v })) };
      }
      if (/SELECT record FROM vault_journal/.test(text)) {
        const list = journal.get(`${params[0]}:${params[1]}`) || [];
        return { rows: list.filter((r) => r.i >= params[2]).sort((a, b) => a.i - b.i).map((record) => ({ record })) };
      }
      if (/INSERT INTO vault_journal/.test(text)) {
        const key = `${params[0]}:${params[1]}`;
        const list = journal.get(key) || [];
        if (!list.some((r) => r.i === params[2])) list.push(JSON.parse(params[5]));
        journal.set(key, list);
        return { rows: [] };
      }
      if (/INSERT INTO vault_campaigns/.test(text)) {
        const key = `${params[0]}:${params[1]}`;
        const prev = campaigns.get(key) || {};
        campaigns.set(key, {
          head_hash: params[2], turn_count: params[3],
          signature_status: params[4] ?? prev.signature_status ?? null,
          public_key_jwk: params[5] ? JSON.parse(params[5]) : prev.public_key_jwk ?? null,
          meta: params[6] ? JSON.parse(params[6]) : prev.meta ?? {}, updated_at: new Date().toISOString(),
        });
        return { rows: [] };
      }
      if (/SELECT asset_hash FROM vault_media/.test(text)) {
        return { rows: params[1].filter((h) => media.has(`${params[0]}:${h}`)).map((h) => ({ asset_hash: h })) };
      }
      if (/INSERT INTO vault_media/.test(text)) {
        const key = `${params[0]}:${params[1]}`;
        if (!media.has(key)) media.set(key, { mime: params[2], byte_length: params[3] });
        return { rows: [] };
      }
      if (/SELECT mime FROM vault_media/.test(text)) {
        const row = media.get(`${params[0]}:${params[1]}`);
        return { rows: row ? [row] : [] };
      }
      if (/DELETE FROM vault_journal/.test(text)) {
        journal.delete(`${params[0]}:${params[1]}`);
        return { rows: [] };
      }
      if (/DELETE FROM vault_campaigns/.test(text)) {
        const had = campaigns.delete(`${params[0]}:${params[1]}`);
        return { rows: [], rowCount: had ? 1 : 0 };
      }
      throw new Error(`the stand-in ledger does not know this verse: ${text.slice(0, 60)}`);
    },
  };
}
function memBlobs() {
  const shelf = new Map();
  let puts = 0;
  return {
    shelf, count: () => puts,
    async has(hash) { return shelf.has(hash); },
    async put(hash, bytes, mime) { puts += 1; shelf.set(hash, { bytes: Buffer.from(bytes), mime }); },
    async get(hash) { const it = shelf.get(hash); return { bytes: it.bytes, mime: it.mime }; },
  };
}

// The bench's own scribe: a lawful chain of sealed records.
async function makeRecord({ type = 'turn', i, prevHash, payload, ts = 1770000000000 + i }) {
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

// ------------------------------------------------- 1. dormancy & the door
{
  const dormant = express();
  dormant.use((req, _res, next) => { req.patron = null; next(); });
  dormant.use('/api', vaultRoutes()); // no seams: reads the scrubbed env
  const server = dormant.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const status = await (await fetch(`${base}/api/vault/status`)).json();
  assert.deepEqual({ live: status.live, media: status.media }, { live: false, media: false }, 'a keyless table has no vault, honestly');
  assert.equal((await fetch(`${base}/api/vault/shelf`)).status, 503, 'a dormant vault refuses every other room');
  server.close();
}

__resetVaultForEval();
const ledger = memLedger();
const blobs = memBlobs();
const app = express();
// The stub door: the X-Patron header names the patron; absence is a guest.
app.use((req, _res, next) => { const id = req.get('x-patron'); req.patron = id ? { id } : null; next(); });
app.get('/api/whoami', (req, res) => res.json({ patron: req.patron }));
app.post('/api/vault/media/:hash', express.raw({ type: () => true, limit: '25mb' }));
app.use(express.json({ limit: '25mb' }));
app.use('/api', vaultRoutes({ query: ledger.query, blobs }));
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const as = (patron) => (patron ? { 'X-Patron': patron } : {});
const post = (path, body, patron) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...as(patron) }, body: JSON.stringify(body) });

assert.equal((await fetch(`${base}/api/vault/shelf`)).status, 401, 'a live vault refuses guests — fail CLOSED');

// ------------------------------------ 2. round-trip fidelity (the seal law)
const chain = await makeChain(4);
{
  const pushed = await post('/api/vault/push', { campaignId: 'camp-1', records: chain, meta: { title: 'The Drowned March', hero: { name: 'Alatar' }, logs: [] } }, 'user-a');
  assert.equal(pushed.status, 200, 'a lawful chain is taken whole');
  const { headHash, turnCount } = await pushed.json();
  assert.equal(turnCount, 4); assert.equal(headHash, chain[3].recordHash, 'the vault head is the chain head');

  const pulled = await (await fetch(`${base}/api/vault/campaign/camp-1/journal?from=0`, { headers: as('user-a') })).json();
  assert.equal(pulled.records.length, 4, 'the whole journal comes back');
  // The notary's own arithmetic, applied to what the vault returned.
  const verdict = await judgeChain(pulled.records, { headHash: null, turnCount: 0 });
  assert.equal(verdict.ok, true, 'a restored chronicle passes the standalone verifier exactly as a native one');
  assert.equal(verdict.headHash, chain[3].recordHash);

  const shelf = await (await fetch(`${base}/api/vault/shelf`, { headers: as('user-a') })).json();
  assert.equal(shelf.shelf.length, 1);
  assert.equal(shelf.shelf[0].title, 'The Drowned March', 'the vaulted shelf shows the spine');
  assert.equal(shelf.shelf[0].hero, 'Alatar');
}

// -------------------------------------------- 3. tamper rejection on ingest
{
  const tail = await makeChain(1, { startAt: 4, prevHash: chain[3].recordHash });
  const tampered = structuredClone(tail);
  tampered[0].payload.player = 'a deed that never happened';
  const refused = await post('/api/vault/push', { campaignId: 'camp-1', records: tampered }, 'user-a');
  assert.equal(refused.status, 422, 'a record that cannot answer for its hash refuses the push');

  const brokenLink = structuredClone(tail);
  brokenLink[0].prevHash = 'f'.repeat(64);
  // a foreign prevHash at the base reads as divergence (409), so break an inner link instead:
  const two = [...tail, await makeRecord({ i: 5, prevHash: 'a'.repeat(64), payload: { player: 'unmoored' } })];
  const refusedLink = await post('/api/vault/push', { campaignId: 'camp-1', records: two }, 'user-a');
  assert.equal(refusedLink.status, 422, 'one broken link refuses the whole push');
  assert.equal((ledger.journal.get('user-a:camp-1') || []).length, 4, 'nothing tampered reached the shelf');

  const lawful = await post('/api/vault/push', { campaignId: 'camp-1', records: tail }, 'user-a');
  assert.equal(lawful.status, 200, 'the lawful tail still lands — incremental by index');
}

// ------------------------------------------------- 4. no silent merge, ever
{
  const rival = await makeChain(1, { startAt: 4, prevHash: chain[3].recordHash, salt: ' (another device)' });
  const refused = await post('/api/vault/push', { campaignId: 'camp-1', records: rival }, 'user-a');
  assert.equal(refused.status, 409, 'history may only grow — a rewrite is refused');
  const body = await refused.json();
  assert.equal(body.diverged, true);
  assert.equal(body.serverTurnCount, 5, 'the refusal names the vault head so the device can fork');

  const staleMeta = await post('/api/vault/push', { campaignId: 'camp-1', records: [], headHash: chain[3].recordHash, meta: { title: 'stale' } }, 'user-a');
  assert.equal(staleMeta.status, 409, 'a meta-only push must answer for the head it believes in');
}

// ------------------------------- 5. blobs: content-addressed, owner-locked
{
  const bytes = Buffer.from('a painted plate, sworn to its hash');
  const hash = await sha256(new Uint8Array(bytes));
  const wrongName = await fetch(`${base}/api/vault/media/${'0'.repeat(64)}`, { method: 'POST', headers: { 'Content-Type': 'image/png', ...as('user-a') }, body: bytes });
  assert.equal(wrongName.status, 422, 'bytes that do not answer for their name are refused');

  const put = await fetch(`${base}/api/vault/media/${hash}`, { method: 'POST', headers: { 'Content-Type': 'image/png', ...as('user-a') }, body: bytes });
  assert.equal(put.status, 200, 'a truthful blob is shelved');
  await fetch(`${base}/api/vault/media/${hash}`, { method: 'POST', headers: { 'Content-Type': 'image/png', ...as('user-b') }, body: bytes });
  assert.equal(blobs.count(), 1, 'the second patron dedupes to the same shelf slot');

  const missing = await (await post('/api/vault/media-missing', { hashes: [hash, 'b'.repeat(64)] }, 'user-a')).json();
  assert.deepEqual(missing.missing, ['b'.repeat(64)], 'the vault answers exactly what it lacks');

  const got = await fetch(`${base}/api/vault/media/${hash}`, { headers: as('user-a') });
  assert.equal(got.status, 200);
  assert.equal(Buffer.compare(Buffer.from(await got.arrayBuffer()), bytes), 0, 'the same bytes come home');

  const stranger = await fetch(`${base}/api/vault/media/${hash}`, { headers: as('user-c') });
  assert.equal(stranger.status, 404, "another patron's drawer is locked even for shared bytes");
}

// --------------------------- 6. the redaction law & the planner, judged pure
{
  await import('fake-indexeddb/auto');
  const { applyStrikes, planSync } = await import('../src/lib/vault.js');

  const turnA = await makeRecord({ i: 0, prevHash: null, payload: { player: 'kept' } });
  const turnB = await makeRecord({ i: 1, prevHash: turnA.recordHash, payload: { player: 'struck on the other device' } });
  const strike = await makeRecord({ type: 'redaction', i: 2, prevHash: turnB.recordHash, payload: { targetRecordHash: turnB.recordHash, scope: 'active_canon' } });
  const logs = [{ id: 'l0', redacted: false }, { id: 'l1', redacted: false }];
  const felled = applyStrikes(logs, [turnA, turnB, strike]);
  assert.equal(felled[0].redacted, false, 'the bound turn stands');
  assert.equal(felled[1].redacted, true, 'a strike pulled from the vault fells the same log here');

  const local = { headHash: turnB.recordHash, turnCount: 2 };
  assert.equal(planSync(local, null, []).op, 'push', 'no vault copy → push all');
  assert.deepEqual(planSync(local, { headHash: turnA.recordHash, turnCount: 1 }, [turnA, turnB]), { op: 'push', from: 1 }, 'vault behind on our own chain → push the tail');
  assert.equal(planSync(local, { headHash: turnB.recordHash, turnCount: 2 }, [turnA, turnB]).op, 'meta', 'heads agree → nothing but presentation owed');
  assert.equal(planSync(local, { headHash: strike.recordHash, turnCount: 3 }, [turnA, turnB]).op, 'pull', 'vault ahead → pull the tail');
  assert.equal(planSync(local, { headHash: 'c'.repeat(64), turnCount: 1 }, [turnA, turnB]).op, 'fork', 'a different telling is never merged — fork into two spines');
  assert.equal(planSync(local, { headHash: 'c'.repeat(64), turnCount: 2 }, [turnA, turnB]).op, 'fork', 'equal length with two heads is still two tellings — fork, never pull');
}

// ------------------- 7. the fork keeps the session: no writes chase a ghost
{
  const { forkDivergedSpine, redirectSpine, onSpineForked } = await import('../src/lib/vault.js');
  const { db, saveCampaign } = await import('../src/lib/db.js');
  const turnA = await makeRecord({ i: 0, prevHash: null, payload: { player: 'first deed' } });
  const turnB = await makeRecord({ i: 1, prevHash: turnA.recordHash, payload: { player: 'second deed' } });
  await db.campaigns.put({ id: 'old-spine', title: 'The March', headHash: turnB.recordHash, turnCount: 2, updatedAt: 1, logs: [] });
  await db.journal.bulkPut([{ campaignId: 'old-spine', ...turnA }, { campaignId: 'old-spine', ...turnB }]);
  await db.keys.put({ campaignId: 'old-spine', algorithm: 'SHA-256', signed: false, publicJwk: null });

  let heard = null;
  const unsubscribe = onSpineForked((event) => { heard = event; });
  const newId = await forkDivergedSpine('old-spine');
  unsubscribe();

  assert.equal(await db.campaigns.get('old-spine'), undefined, 'the old name is gone from the shelf');
  // Lockstep with the Hearth Law: the fork notice now carries the deed
  // return. In this vaultless harness the court can prove no unaccepted
  // tail, so it honestly names none — the empty array IS the assertion.
  assert.deepEqual(heard, { from: 'old-spine', to: newId, unsentDeeds: [] }, 'the table is told the moment the spine forks, and the deed court answers even when it has nothing to hand back');
  assert.equal(redirectSpine('old-spine'), newId, 'late writers holding the old name are redirected');

  const forkedJournal = await db.journal.where('campaignId').equals(newId).sortBy('i');
  const verdict = await judgeChain(forkedJournal.map(({ campaignId: _c, ...r }) => r), { headHash: null, turnCount: 0 });
  assert.equal(verdict.ok, true, 'the forked spine carries the same intact chain');

  // A stale in-memory campaign object tries to save under the deleted name…
  await saveCampaign({ id: 'old-spine', title: 'The March', logs: [{ id: 'l0' }], headHash: 'stale', turnCount: 99 });
  assert.equal(await db.campaigns.get('old-spine'), undefined, 'the deleted spine is never quietly recreated');
  const followed = await db.campaigns.get(newId);
  assert.equal(followed.logs.length, 1, 'the write followed the fork instead');
  assert.equal(followed.headHash, turnB.recordHash, 'and the chain fields still belong to the seal, not the snapshot');
}

// -------- 8. the door awakens the vault: guest at load → sign in, no reload
{
  const { vaultSessionChanged, syncCampaign, subscribeVault, onVaultSession } = await import('../src/lib/vault.js');
  const { db } = await import('../src/lib/db.js');
  // The bench's browser: relative fetches land on the eval house, carrying
  // whoever the door currently vouches for.
  const realFetch = globalThis.fetch;
  let doorSays = null; // guest
  globalThis.fetch = (url, opts = {}) => realFetch(new URL(url, base), { ...opts, headers: { ...(opts.headers || {}), ...(doorSays ? { 'X-Patron': doorSays } : {}) } });

  const turn = await makeRecord({ i: 0, prevHash: null, payload: { player: 'a deed sworn before signing in' } });
  await db.campaigns.put({ id: 'wakes-later', title: 'The Late Riser', headHash: turn.recordHash, turnCount: 1, updatedAt: 1, logs: [{ id: 'l0' }] });
  await db.journal.put({ campaignId: 'wakes-later', ...turn });

  await syncCampaign('wakes-later');
  assert.equal(ledger.campaigns.has('user-z:wakes-later'), false, 'a guest table never pushes');
  let lastMarks = new Map();
  const unsubMarks = subscribeVault((m) => { lastMarks = m; });
  assert.equal(lastMarks.get('wakes-later')?.state, 'local', 'the guest spine wears the local mark');

  // …then the patron gives their name at the door — no page reload.
  let sessionHeard = null;
  const unsubSession = onVaultSession((patronId) => { sessionHeard = patronId; });
  doorSays = 'user-z';
  await vaultSessionChanged('user-z');
  assert.equal(sessionHeard, 'user-z', 'the table is told the session changed');
  assert.equal(ledger.campaigns.get('user-z:wakes-later')?.head_hash, turn.recordHash, 'sign-in awakens the vault: the shelf pushes without a reload');
  assert.equal(lastMarks.get('wakes-later')?.state, 'vaulted', 'the spine wears the vault mark');

  // …and departing returns every spine to quiet local custody.
  doorSays = null;
  await vaultSessionChanged(null);
  assert.equal(lastMarks.get('wakes-later')?.state, 'local', 'sign-out drops the cached patron — spines fall back to local');
  await syncCampaign('wakes-later');
  assert.equal(lastMarks.get('wakes-later')?.state, 'local', 'and later syncs stay guest-quiet, not stuck on a stale cache');
  unsubMarks(); unsubSession();
  globalThis.fetch = realFetch;
}

{
  // THE PYRE — burning is owner-scoped, idempotent, and never resurrected.
  const del = (path, patron) => fetch(`${base}${path}`, { method: 'DELETE', headers: as(patron) });

  // Two patrons, one campaign name: burning mine never touches yours.
  const mine = await makeChain(2);
  const yours = await makeChain(2);
  await post('/api/vault/push', { campaignId: 'shared-name', records: mine, meta: { title: 'Mine' } }, 'user-burn');
  await post('/api/vault/push', { campaignId: 'shared-name', records: yours, meta: { title: 'Yours' } }, 'user-else');
  ledger.media.set('user-burn:aa11', { mime: 'image/png', byte_length: 4 });

  const guest = await del('/api/vault/campaign/shared-name');
  assert.equal(guest.status, 401, 'the pyre lights for named patrons only');

  const burned = await del('/api/vault/campaign/shared-name', 'user-burn');
  assert.equal(burned.status, 200);
  assert.equal((await burned.json()).burned, true, 'the vault admits what it let go');
  assert.equal(ledger.campaigns.has('user-burn:shared-name'), false, 'the spine is gone');
  assert.equal((ledger.journal.get('user-burn:shared-name') || []).length, 0, 'the journal burned with it');
  assert.equal(ledger.campaigns.get('user-else:shared-name')?.meta?.title, 'Yours', 'another patron\'s tale never smells the smoke');
  assert.equal(ledger.media.has('user-burn:aa11'), true, 'content-addressed reference rows stay — blobs may serve other spines');

  const again = await del('/api/vault/campaign/shared-name', 'user-burn');
  assert.equal((await again.json()).burned, false, 'a second match finds only ash — idempotent, never an error');

  // The client's pyre registry: a burned spine takes no ink from stragglers.
  const { burnCampaign, saveCampaign, spineBurned, unburnSpine, db } = await import('../src/lib/db.js');
  await db.campaigns.put({ id: 'to-ash', title: 'Soon Ash', headHash: 'h1', turnCount: 1, updatedAt: 1 });
  await db.media.put({ assetHash: 'ff00', cacheKey: 'ck', campaignId: 'to-ash', kind: 'paint', createdAt: 1 });
  await burnCampaign('to-ash');
  assert.equal(await db.campaigns.get('to-ash'), undefined, 'the local spine burned');
  assert.equal((await db.media.where('campaignId').equals('to-ash').toArray()).length, 0, 'its plates burned with it');
  assert.equal(spineBurned('to-ash'), true);
  await saveCampaign({ id: 'to-ash', title: 'A Straggler Writes' });
  assert.equal(await db.campaigns.get('to-ash'), undefined, 'a straggling save lands in ash, never back on the shelf');
  unburnSpine('to-ash'); // the player's own restore outranks the pyre
  await saveCampaign({ id: 'to-ash', title: 'Recalled From Ash' });
  assert.equal((await db.campaigns.get('to-ash'))?.title, 'Recalled From Ash', 'a deliberate restore may recall the name');
  await db.campaigns.delete('to-ash');
}

{
  // THE PYRE vs THE LANE — a sync already queued when the match strikes
  // settles first, then the vault burns; and nothing queued later may push
  // the spine back. Order, not luck.
  const { vaultSessionChanged, syncCampaign, burnFromVault } = await import('../src/lib/vault.js');
  const { db, unburnSpine } = await import('../src/lib/db.js');
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, opts = {}) => realFetch(new URL(url, base), { ...opts, headers: { ...(opts.headers || {}), 'X-Patron': 'user-race' } });
  await vaultSessionChanged('user-race');

  const turn = await makeRecord({ i: 0, prevHash: null, payload: { player: 'a deed soon to burn' } });
  await db.campaigns.put({ id: 'race-me', title: 'The Race', headHash: turn.recordHash, turnCount: 1, updatedAt: 1, logs: [] });
  await db.journal.put({ campaignId: 'race-me', ...turn });

  const inflight = syncCampaign('race-me'); // queued before the match strikes
  const word = await burnFromVault('race-me'); // joins the same lane, burns after
  await inflight;
  assert.equal(word, 'burned');
  assert.equal(ledger.campaigns.has('user-race:race-me'), false, 'the in-flight push settles first, then the vault burns — no resurrection');

  await syncCampaign('race-me'); // queued after the match: finds only ash
  assert.equal(ledger.campaigns.has('user-race:race-me'), false, 'a later sync finds only ash and pushes nothing');

  unburnSpine('race-me');
  await db.campaigns.delete('race-me');
  await db.journal.where('campaignId').equals('race-me').delete();
  await vaultSessionChanged(null);
  globalThis.fetch = realFetch;
}

server.close();
console.log('vault.test: the vault holds — dormancy honest, chain law kept, tampering refused, no silent merges, blobs owner-locked, strikes cross devices, the pyre burns owner-scoped and stays burned. ✦');
