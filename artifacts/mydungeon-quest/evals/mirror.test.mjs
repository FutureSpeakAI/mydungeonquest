// THE MIRROR & THE COMMONS, judged (Directive XV §VI, gate 1 of 3) —
// the vault as a true mirror and the publish desk on the bench:
//   1. Keyless dormancy — no door, no seam, no commons; and the staging
//      seam NEVER stands while the real door is built.
//   2. The staging seam — with the door unbuilt and the seam named, the
//      real doorkeeper seats a staged patron (server-side, one sanctioned
//      lane); with the seam unset, guests stay guests and owner rooms
//      refuse them 401, fail CLOSED.
//   3. Crash-retry convergence — a push that died mid-write re-lands
//      idempotently: exactly one copy of every record, byte-for-byte.
//   4. Append-only — a divergent tail is a 409, never a merge.
//   5. Restore fidelity — pulled records re-verify at the desk and
//      canonicalize byte-equal to what was pushed; the head answers.
//   6. The publish desk — unsealed refused by the wax's name; a tampered
//      chain refused by the desk; unshelved plates refused with the
//      missing list; a lawful sealed record lands.
//   7. One living page per tale — the second publish is a 409 naming the
//      first.
//   8. Public doors serve GUESTS — no name asked: meta, record (VERBATIM
//      bytes), plates (with the modest public cache), and the commons
//      walk honor the unlisted default.
//   9. Revocation is a tombstone — 410 at every public door, idempotent,
//      and a revoked page takes no listing.
// (The stand-in ledger below is adapted from evals/vault.test.mjs — the
// bench pattern lives there first; this file extends it with the
// publish verses. Cross-noted in both files' spirit: one pattern, two
// benches, each judging its own routes.)
import assert from 'node:assert/strict';
import express from 'express';

delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;
delete process.env.VAULT_STAGE_PATRON;

const { canonicalize, sha256 } = await import('fatescript/canonical');
const { verifyJournal } = await import('fatescript/desk');
const { vaultOpen, vaultRoutes, __resetVaultForEval } = await import('../server/vault.js');
const { publishOpen, publishRoutes, __resetPublishForEval } = await import('../server/publish.js');
const { stageSeamOpen, doorkeeper, inscribe, __resetDoorForEval } = await import('../server/patrons.js');

// ------------------------------------------------ 1. keyless dormancy
assert.equal(vaultOpen(), false, 'scrubbed keys and no seam must read as a dormant vault');
assert.equal(publishOpen(), false, 'scrubbed keys and no seam must read as dormant commons');
assert.equal(stageSeamOpen(), false, 'no seam named, no seam open');
process.env.CLERK_SECRET_KEY = 'sk_test_pretend-the-door-is-built';
process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_pretend-the-door-is-built';
process.env.VAULT_STAGE_PATRON = 'bench-seam';
assert.equal(stageSeamOpen(), false, 'the seam NEVER stands while the real door is built — production cannot be staged');
delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;
assert.equal(stageSeamOpen(), true, 'door unbuilt + seam named = the seam stands');
delete process.env.VAULT_STAGE_PATRON;
console.log('ok — dormancy honest, the seam yields to the real door');

// ---------------------------------------------------------- the stand-ins
// (adapted from evals/vault.test.mjs — extended with the publish verses)
function memLedger() {
  const campaigns = new Map(); // `${user}:${campaign}` -> row
  const journal = new Map();   // `${user}:${campaign}` -> [record]
  const media = new Map();     // `${user}:${hash}` -> { mime, byte_length }
  const pages = new Map();     // publishId -> row
  const assets = [];           // { publish_id, asset_hash, mime }
  return {
    campaigns, journal, media, pages, assets,
    async query(text, params = []) {
      if (/CREATE TABLE|CREATE UNIQUE INDEX/.test(text)) return { rows: [] };
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
      if (/SELECT asset_hash FROM vault_media WHERE user_id = \$1 AND asset_hash = ANY/.test(text)) {
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
      if (/DELETE FROM vault_journal/.test(text)) { journal.delete(`${params[0]}:${params[1]}`); return { rows: [] }; }
      if (/DELETE FROM vault_campaigns/.test(text)) {
        const had = campaigns.delete(`${params[0]}:${params[1]}`);
        return { rows: [], rowCount: had ? 1 : 0 };
      }
      // ------------------------------------------------ the publish verses
      if (/SELECT publish_id FROM publish_pages WHERE user_id = \$1 AND campaign_id = \$2 AND revoked_at IS NULL/.test(text)) {
        const standing = [...pages.values()].find((p) => p.user_id === params[0] && p.campaign_id === params[1] && !p.revoked_at);
        return { rows: standing ? [{ publish_id: standing.publish_id }] : [] };
      }
      if (/INSERT INTO publish_pages/.test(text)) {
        const living = [...pages.values()].find((p) => p.user_id === params[1] && p.campaign_id === params[2] && !p.revoked_at);
        if (living) { const clash = new Error('duplicate key'); clash.code = '23505'; throw clash; }
        pages.set(params[0], {
          publish_id: params[0], user_id: params[1], campaign_id: params[2], title: params[3],
          record: params[4], head_hash: params[5], turn_count: params[6],
          listed: false, published_at: new Date().toISOString(), revoked_at: null,
        });
        return { rows: [] };
      }
      if (/INSERT INTO publish_assets/.test(text)) {
        if (!assets.some((a) => a.publish_id === params[0] && a.asset_hash === params[1])) {
          assets.push({ publish_id: params[0], asset_hash: params[1], mime: params[2] });
        }
        return { rows: [] };
      }
      if (/UPDATE publish_pages SET revoked_at = now\(\) WHERE publish_id = \$1 AND user_id = \$2 AND revoked_at IS NULL/.test(text)) {
        const page = pages.get(params[0]);
        if (page && page.user_id === params[1] && !page.revoked_at) { page.revoked_at = new Date().toISOString(); return { rows: [], rowCount: 1 }; }
        return { rows: [], rowCount: 0 };
      }
      if (/SELECT revoked_at FROM publish_pages WHERE publish_id = \$1 AND user_id = \$2/.test(text)) {
        const page = pages.get(params[0]);
        return { rows: page && page.user_id === params[1] ? [{ revoked_at: page.revoked_at }] : [] };
      }
      if (/UPDATE publish_pages SET listed = \$3 WHERE publish_id = \$1 AND user_id = \$2 AND revoked_at IS NULL/.test(text)) {
        const page = pages.get(params[0]);
        if (page && page.user_id === params[1] && !page.revoked_at) { page.listed = params[2]; return { rows: [], rowCount: 1 }; }
        return { rows: [], rowCount: 0 };
      }
      if (/SELECT publish_id, campaign_id, title, listed, head_hash, turn_count, published_at, revoked_at FROM publish_pages WHERE user_id = \$1/.test(text)) {
        return { rows: [...pages.values()].filter((p) => p.user_id === params[0]) };
      }
      if (/SELECT publish_id, title, turn_count, published_at FROM publish_pages WHERE listed = TRUE AND revoked_at IS NULL/.test(text)) {
        return { rows: [...pages.values()].filter((p) => p.listed === true && !p.revoked_at) };
      }
      if (/SELECT \* FROM publish_pages WHERE publish_id = \$1/.test(text)) {
        const page = pages.get(params[0]);
        return { rows: page ? [page] : [] };
      }
      if (/SELECT mime FROM publish_assets WHERE publish_id = \$1 AND asset_hash = \$2/.test(text)) {
        const row = assets.find((a) => a.publish_id === params[0] && a.asset_hash === params[1]);
        return { rows: row ? [{ mime: row.mime }] : [] };
      }
      throw new Error(`the stand-in ledger does not know this verse: ${text.slice(0, 80)}`);
    },
  };
}
function memBlobs() {
  const shelf = new Map();
  return {
    shelf,
    async has(hash) { return shelf.has(hash); },
    async put(hash, bytes, mime) { shelf.set(hash, { bytes: Buffer.from(bytes), mime }); },
    async get(hash) { const it = shelf.get(hash); if (!it) throw new Error('no such blob'); return { bytes: it.bytes, mime: it.mime }; },
  };
}

// The bench's own scribe: a lawful chain of sealed records.
async function makeRecord({ type = 'turn', i, prevHash, payload, ts = 1770000000000 + i }) {
  const unsigned = { type, i, prevHash, payload, ts };
  return { ...unsigned, recordHash: await sha256(canonicalize(unsigned)) };
}
async function makeChain(n, { sealedTail = false } = {}) {
  const records = [];
  let prev = null;
  for (let i = 0; i < n; i += 1) {
    const type = sealedTail && i === n - 1 ? 'sealing' : 'turn';
    const payload = type === 'sealing' ? { turns: n - 1 } : { player: `deed ${i}`, dm: { narration_blocks: [{ speaker: null, text: `verse ${i}` }] } };
    const record = await makeRecord({ type, i, prevHash: prev, payload });
    records.push(record);
    prev = record.recordHash;
  }
  return records;
}

const ledger = memLedger();
const blobs = memBlobs();
__resetVaultForEval?.();
__resetPublishForEval?.();

// The bench app: the stub door names a patron per request (the vault
// bench's own pattern); guests simply send no name.
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/api/publish', express.text({ type: 'text/plain', limit: '15mb' }));
app.use((req, _res, next) => {
  const name = req.get('X-Patron');
  req.patron = name ? { id: name, name } : null;
  next();
});
app.use('/api', vaultRoutes({ query: ledger.query.bind(ledger), blobs }));
app.use('/api', publishRoutes({ query: ledger.query.bind(ledger), blobs }));
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const asPatron = (path, opts = {}) => fetch(`${base}${path}`, { ...opts, headers: { ...(opts.headers || {}), 'X-Patron': 'user-mirror' } });
const asGuest = (path, opts = {}) => fetch(`${base}${path}`, opts);

// ------------------------------------------------ 2. the seam's own door
// The whole seam (doorkeeper → stagePatron → inscribe → the REAL ledger)
// is walked live by the G29 court, where a real house stands on a real
// ledger. The bench judges the seam in keyless PARTS — the inscription
// lane through an injected ledger, and the doorless doorkeeper's two
// honest answers (guest when the seam is unset; a LOUD stumble that
// passes as guest when the seam names a patron no ledger can seat).
{
  // 2a. The inscription lane: a staged patron signs the visitors' book
  // under the `stage:` name with the staging face — the exact deps shape
  // stagePatron passes.
  const spoken = [];
  const bookStub = async (text, params = []) => {
    spoken.push(text);
    if (/CREATE TABLE|CREATE UNIQUE INDEX/.test(text)) return { rows: [] };
    if (/INSERT INTO users/.test(text)) {
      return { rows: [{ id: 'u-staged', clerk_user_id: params[0], display_name: params[1], created_at: 'bound' }] };
    }
    if (/UPDATE users SET plan/.test(text)) return { rows: [] };
    throw new Error(`the visitors' book does not know this verse: ${text.slice(0, 60)}`);
  };
  const staged = await inscribe('stage:bench-seam', {
    query: bookStub,
    fetchPatron: async () => ({ displayName: 'Staging — bench-seam', email: null }),
  });
  assert.equal(staged.clerk_user_id, 'stage:bench-seam', 'the staged patron signs under the stage: name — no Clerk subject can ever collide');
  assert.equal(staged.display_name, 'Staging — bench-seam', 'the staged patron wears the staging face aloud — never a real one');
  assert.equal(spoken.some((text) => /INSERT INTO users/.test(text)), true, 'the seam walks the SAME visitors\u2019 book as the real door');

  // 2b. The doorless doorkeeper: guests stay guests, and a seam that
  // cannot reach any ledger stumbles LOUDLY into guesthood — never a
  // crash, never a phantom patron. The pool is provably unreachable:
  // every Postgres coordinate is scrubbed before the first knock.
  for (const key of ['DATABASE_URL', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE', 'HOUSE_SEATS']) delete process.env[key];
  const seamApp = express();
  seamApp.use((req, res, next) => doorkeeper()(req, res, next)); // rebuilt per knock — the door is chosen at call time
  seamApp.get('/whoami-bench', (req, res) => res.json({ patron: req.patron || null }));
  const seamServer = seamApp.listen(0);
  const seamBase = `http://127.0.0.1:${seamServer.address().port}`;
  __resetDoorForEval?.();
  const guest = await (await fetch(`${seamBase}/whoami-bench`)).json();
  assert.equal(guest.patron, null, 'seam unset — a doorless house seats only guests');
  process.env.VAULT_STAGE_PATRON = 'bench-seam';
  __resetDoorForEval?.();
  const stumbled = await (await fetch(`${seamBase}/whoami-bench`)).json();
  assert.equal(stumbled.patron, null, 'a seam with no ledger stumbles into guesthood — loud, closed, and standing');
  delete process.env.VAULT_STAGE_PATRON;
  __resetDoorForEval?.();
  seamServer.close();
  console.log('ok — the seam is one sanctioned lane: staged name, staged face, and a stumble that never forges a seat');
}

// -------------------------------- 3. crash-retry convergence (the mirror)
const chain = await makeChain(5);
const push = (body) => asPatron('/api/vault/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: 'mirror-me', meta: { title: 'The Mirror' }, publicKeyJwk: null, signatureStatus: 'hash-only', ...body }) });
// A crashed push landed rows 0-2 in the journal and died BEFORE the
// campaign row — the server's head still reads empty. The retry pushes
// the whole chain from the base the server names; ON CONFLICT leaves
// the crash's rows standing once, not twice.
ledger.journal.set('user-mirror:mirror-me', chain.slice(0, 3).map((r) => ({ ...r })));
const retry = await push({ records: chain });
assert.equal(retry.status, 200, `the retry lands (${retry.status})`);
const stored = ledger.journal.get('user-mirror:mirror-me');
assert.equal(stored.length, 5, 'exactly one copy of every record — the crash left no doubles');
for (let i = 0; i < 5; i += 1) {
  assert.equal(canonicalize(stored[i]), canonicalize(chain[i]), `record ${i} is byte-for-byte the record that was pushed`);
}
console.log('ok — a crashed push re-lands to exact convergence');

// --------------------------------------------------- 4. append-only, 409
const forked = await makeRecord({ i: 4, prevHash: chain[3].recordHash, payload: { player: 'a different deed 4' } });
const divergent = await push({ records: [forked] });
assert.equal(divergent.status, 409, 'a device behind the head may not rewrite the tip — never a merge');
assert.equal((await divergent.json()).diverged, true, 'the refusal names the divergence so the device can fork its spine');
const settled = await push({ records: [], headHash: chain[4].recordHash });
assert.equal(settled.status, 200, 'an empty push naming the landed head settles idempotently');
assert.equal((await settled.json()).turnCount, 5, 'the vault still counts five — nothing doubled, nothing lost');
const stale = await push({ records: [], headHash: chain[2].recordHash });
assert.equal(stale.status, 409, 'an empty push naming a STALE head is told to pull first — meta may not outrun history');
console.log('ok — history is append-only');

// ------------------------------------------------- 5. restore fidelity
const pulled = await (await asPatron('/api/vault/campaign/mirror-me/journal?from=0')).json();
assert.equal(pulled.records.length, 5, 'the vault hands back the whole journal');
const verdicts = await verifyJournal(pulled.records);
assert.equal(verdicts.every((v) => v.ok), true, 'every pulled record re-verifies at the desk');
for (let i = 0; i < 5; i += 1) {
  assert.equal(canonicalize(pulled.records[i]), canonicalize(chain[i]), `restored record ${i} canonicalizes byte-equal to the push`);
}
console.log('ok — restore is byte-faithful and desk-verified');

// ------------------------------------------------- 6. the publish desk
const PLATE = Buffer.from('89504e470d0a1a0a-bench-plate-bytes', 'utf8');
const plateHash = await sha256(PLATE);
await blobs.put(plateHash, PLATE, 'image/png');

const sealedChain = await makeChain(6, { sealedTail: true });
const record = {
  header: { format: 'mydungeon.chronicle', version: 1, campaignId: 'bell-bench', title: 'The Bench Tale', headHash: sealedChain[sealedChain.length - 1].recordHash, publicKeyJwk: null, signatureStatus: 'hash-only' },
  campaign: { id: 'bell-bench', title: 'The Bench Tale', logs: [] },
  journal: sealedChain,
  media: [{ assetHash: plateHash, cacheKey: 'bench:plate', kind: 'scene', mime: 'image/png', originTurnHash: sealedChain[1].recordHash }],
};
const postPublish = (body) => asPatron('/api/publish', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body });

const unsealed = { ...record, journal: sealedChain.slice(0, 5), header: { ...record.header, headHash: sealedChain[4].recordHash } };
const noWax = await postPublish(JSON.stringify(unsealed));
assert.equal(noWax.status, 422, 'unsealed is refused');
assert.match((await noWax.json()).error, /sealed|wax/i, 'the refusal names the wax');

const tampered = JSON.parse(JSON.stringify(record));
tampered.journal[2].payload.player = 'a forged deed';
const forged = await postPublish(JSON.stringify(tampered));
assert.equal(forged.status, 422, 'a tampered chain is refused by the desk');

const unshelved = await postPublish(JSON.stringify(record));
assert.equal(unshelved.status, 422, 'plates that never reached the shelf refuse the publish');
assert.deepEqual((await unshelved.json()).missing, [plateHash], 'the refusal names the missing plates');

ledger.media.set(`user-mirror:${plateHash}`, { mime: 'image/png', byte_length: PLATE.length });
// The raw bytes carry a deliberate oddity (double space) — storage must
// preserve them VERBATIM, for the reader's desk sits on these bytes.
const rawBytes = JSON.stringify(record).replace('"journal":', '"journal":  ');
const landed = await postPublish(rawBytes);
assert.equal(landed.status, 200, `a lawful sealed record lands (${landed.status})`);
const page = await landed.json();
assert.equal(page.listed, false, 'unlisted is the default — link-only until chosen');
assert.equal(page.url, `/t/${page.publishId}`, 'the page lives at /t/<id>');
console.log('ok — the publish desk refuses by name and lands the lawful record');

// ------------------------------------------------- 7. one living page
const second = await postPublish(rawBytes);
assert.equal(second.status, 409, 'a second living page is refused');
assert.equal((await second.json()).publishId, page.publishId, 'the refusal names the standing page');
console.log('ok — one living page per tale');

// ------------------------------------------ 8. the public doors, as guest
const meta = await asGuest(`/api/public/tale/${page.publishId}`);
assert.equal(meta.status, 200, 'the meta door opens to a guest');
assert.equal(meta.headers.get('cache-control'), 'no-store', 'meta is never cached — revocation must reach readers');
const metaBody = await meta.json();
assert.equal(metaBody.title, 'The Bench Tale');
assert.match(JSON.stringify(metaBody), /fatescript/, 'the meta names its engine — attribution is part of the law');

const rawBack = await asGuest(`/api/public/tale/${page.publishId}/record`);
assert.equal(rawBack.status, 200);
assert.equal(await rawBack.text(), rawBytes, 'the record door serves the EXACT bytes that were published — verbatim, oddities and all');

const plate = await asGuest(`/api/public/tale/${page.publishId}/asset/${plateHash}`);
assert.equal(plate.status, 200, 'a named plate serves to a guest');
assert.equal(plate.headers.get('cache-control'), 'public, max-age=3600', 'plates wear the modest public cache — never immutable, so a revocation reaches new readers within the hour');
assert.equal(Buffer.compare(Buffer.from(await plate.arrayBuffer()), PLATE), 0, 'the plate bytes answer for their name');

const badName = await asGuest(`/api/public/tale/${page.publishId}/asset/not-a-hash`);
assert.equal(badName.status, 400, 'a plate name that is not a name is refused at the boundary');
const strangerPlate = await asGuest(`/api/public/tale/${page.publishId}/asset/${'a'.repeat(64)}`);
assert.equal(strangerPlate.status, 404, 'a plate the page never named does not serve');

let commons = await (await asGuest('/api/public/commons')).json();
assert.equal(commons.tales.length, 0, 'the commons walk honors the unlisted default');
const list = await asPatron(`/api/publish/${page.publishId}/listing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listed: true }) });
assert.equal(list.status, 200);
commons = await (await asGuest('/api/public/commons')).json();
assert.equal(commons.tales.length, 1, 'a chosen listing walks the commons');
assert.equal(commons.tales[0].publishId, page.publishId);
console.log('ok — the public doors serve guests, verbatim and unlisted by default');

// ---------------------------------------------- 9. owner rooms fail closed
const guestPublish = await asGuest('/api/publish', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: rawBytes });
assert.equal(guestPublish.status, 401, 'the publish room refuses guests — 401, fail closed, never a silent name');
const guestMine = await asGuest('/api/publish/mine');
assert.equal(guestMine.status, 401, 'the shelf room refuses guests');
console.log('ok — owner rooms fail closed');

// ------------------------------------------------- 10. the tombstone law
const revoke = await asPatron(`/api/publish/${page.publishId}/revoke`, { method: 'POST' });
assert.equal(revoke.status, 200, 'the owner may take the page down');
for (const door of [`/api/public/tale/${page.publishId}`, `/api/public/tale/${page.publishId}/record`, `/api/public/tale/${page.publishId}/asset/${plateHash}`]) {
  const answer = await asGuest(door);
  assert.equal(answer.status, 410, `${door} answers 410 after revocation`);
  assert.equal((await answer.json()).revoked, true, 'the tombstone says so plainly');
}
const again = await asPatron(`/api/publish/${page.publishId}/revoke`, { method: 'POST' });
assert.equal(again.status, 200, 'revoking twice is idempotent — the page is just as down');
const relist = await asPatron(`/api/publish/${page.publishId}/listing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listed: true }) });
assert.equal(relist.status, 404, 'a revoked page takes no listing');
commons = await (await asGuest('/api/public/commons')).json();
assert.equal(commons.tales.length, 0, 'the tombstone walks nowhere');
const mine = await (await asPatron('/api/publish/mine')).json();
assert.equal(Boolean(mine.pages[0].revokedAt), true, 'the owner\u2019s shelf shows the tombstone honestly');
console.log('ok — revocation is a 410 tombstone at every public door');

server.close();
console.log('PASS mirror.test.mjs — the mirror converges byte-faithful, the seam yields to the real door, and the commons serve sealed truth or nothing');
