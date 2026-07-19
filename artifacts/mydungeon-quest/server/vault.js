/**
 * THE VAULT — cloud backup and cross-device restore for chronicles.
 *
 * Custody doctrine: the device is the root of trust. The vault stores and
 * CHAIN-VERIFIES, it never signs — campaign signing keys never leave the
 * player's device. The vault is opt-in twice over: it stands only when the
 * door (Clerk) is open and the ledger (Postgres) is reachable; the blob
 * shelf additionally needs App Storage (PRIVATE_OBJECT_DIR). Anything less
 * and the vault answers honestly ({ live:false }) — a keyless fork keeps
 * every tale exactly where it always lived: on the device.
 *
 * Laws of the vault:
 * - Fail CLOSED: every room requires a named patron (401 for guests). The
 *   doorkeeper's fail-open-to-guest is for the table, never for custody.
 * - The chain is the law: a push is accepted only as a linear extension of
 *   the stored head. Every record's canonical hash is recomputed on ingest;
 *   one broken link refuses the whole push (422). A push that would rewrite
 *   history is refused with the server's head (409) — the device forks into
 *   two spines; a silent merge is forbidden by construction.
 * - Blobs are content-addressed: an asset lives at vault/<sha256> and is
 *   deduplicated across pushes; a body whose hash does not match its name
 *   is refused at the door (the strict media door, again).
 * - The vault holds tales for their OWNER only: every row is keyed by the
 *   ledger's user id, and a blob is served only to a patron who owns a
 *   reference to it.
 */
import express from 'express';
import { canonicalize, sha256 } from 'fatescript/canonical';
import { doorOpen, runQuery } from './patrons.js';

export const vaultOpen = () => doorOpen() && Boolean(process.env.DATABASE_URL);
export const blobShelfOpen = () => Boolean(process.env.PRIVATE_OBJECT_DIR);

const SHA256_HEX = /^[a-f0-9]{64}$/;
const MAX_PUSH_RECORDS = 500;

// ------------------------------------------------------------- the shelves
// The vault's whole schema — self-bootstrapping, like every server table.
const VAULT_DDL = [
  `CREATE TABLE IF NOT EXISTS vault_campaigns (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    head_hash TEXT,
    turn_count INT NOT NULL DEFAULT 0,
    signature_status TEXT,
    public_key_jwk JSONB,
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, campaign_id)
  )`,
  `CREATE TABLE IF NOT EXISTS vault_journal (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL,
    i INT NOT NULL,
    record_hash TEXT NOT NULL,
    prev_hash TEXT,
    record JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, campaign_id, i)
  )`,
  `CREATE TABLE IF NOT EXISTS vault_media (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_hash TEXT NOT NULL,
    mime TEXT,
    byte_length INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, asset_hash)
  )`,
];

let vaultBound = null;
export function ensureVault(query = runQuery) {
  if (!vaultBound) {
    vaultBound = Promise.resolve()
      .then(async () => { for (const ddl of VAULT_DDL) await query(ddl); })
      .catch((error) => {
        vaultBound = null;
        console.error(`[vault] the shelves could not be raised: ${error.message}`);
        throw error;
      });
  }
  return vaultBound;
}
export function __resetVaultForEval() { vaultBound = null; }

// ------------------------------------------------------ the chain, judged
// Recompute every canonical hash and follow every link. `base` is the
// stored head the first record must extend. Pure — the eval bench judges
// this exact function.
export async function judgeChain(records, base = { headHash: null, turnCount: 0 }) {
  if (!Array.isArray(records)) return { ok: false, reason: 'no records' };
  let prev = base.headHash || null;
  let i = base.turnCount || 0;
  for (const record of records) {
    if (!record || typeof record !== 'object') return { ok: false, reason: 'malformed record' };
    if (record.i !== i) return { ok: false, reason: `record index ${record.i} where ${i} was owed` };
    if ((record.prevHash || null) !== prev) return { ok: false, reason: `broken link at #${i}` };
    const expected = await sha256(canonicalize({ type: record.type, i: record.i, prevHash: record.prevHash ?? null, payload: record.payload, ts: record.ts }));
    if (expected !== record.recordHash) return { ok: false, reason: `record #${i} does not answer for its hash` };
    prev = record.recordHash;
    i += 1;
  }
  return { ok: true, headHash: prev, turnCount: i };
}

// -------------------------------------------------------------- blob store
// The default blob shelf is App Storage via the Replit sidecar; the eval
// bench hands in a Map-backed stand-in through the same seam.
const REPLIT_SIDECAR_ENDPOINT = 'http://127.0.0.1:1106';
let gcs = null;
async function bucketFile(hash) {
  if (!gcs) {
    const { Storage } = await import('@google-cloud/storage');
    gcs = new Storage({
      credentials: {
        audience: 'replit', subject_token_type: 'access_token',
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`, type: 'external_account',
        credential_source: { url: `${REPLIT_SIDECAR_ENDPOINT}/credential`, format: { type: 'json', subject_token_field_name: 'access_token' } },
        universe_domain: 'googleapis.com',
      },
      projectId: '',
    });
  }
  let dir = process.env.PRIVATE_OBJECT_DIR || '';
  if (!dir.startsWith('/')) dir = `/${dir}`;
  const [, bucketName, ...rest] = dir.split('/');
  return gcs.bucket(bucketName).file(`${rest.join('/')}/vault/${hash}`);
}
const gcsBlobs = {
  async has(hash) { const [exists] = await (await bucketFile(hash)).exists(); return exists; },
  async put(hash, bytes, mime) { await (await bucketFile(hash)).save(bytes, { contentType: mime || 'application/octet-stream', resumable: false }); },
  async get(hash) {
    const file = await bucketFile(hash);
    const [bytes] = await file.download();
    const [meta] = await file.getMetadata();
    return { bytes, mime: meta.contentType || 'application/octet-stream' };
  },
};

// ------------------------------------------------------------- the routes
// `deps` is the eval bench's seam: { query, blobs }. Live callers take the
// defaults. Every handler assumes the doorkeeper already walked the request.
export function vaultRoutes(deps = {}) {
  const query = deps.query || runQuery;
  const blobs = deps.blobs || gcsBlobs;
  const router = express.Router();

  // Custody at the door: dormant vaults answer honestly, guests are refused.
  router.use('/vault', (req, res, next) => {
    if (!vaultOpen() && !deps.query) {
      if (req.path === '/status') return res.json({ live: false, media: false });
      return res.status(503).json({ error: 'The vault stands only behind an open door.' });
    }
    if (req.path === '/status') return next();
    if (!req.patron) return res.status(401).json({ error: 'The vault opens to named patrons only.' });
    next();
  });

  router.get('/vault/status', (req, res) => {
    res.json({ live: Boolean(deps.query) || vaultOpen(), media: Boolean(deps.blobs) || blobShelfOpen(), patron: Boolean(req.patron) });
  });

  // The vaulted shelf — spines only, never blobs.
  router.get('/vault/shelf', async (req, res) => {
    try {
      await ensureVault(query);
      const { rows } = await query(
        `SELECT campaign_id, head_hash, turn_count, signature_status, public_key_jwk, meta, updated_at
         FROM vault_campaigns WHERE user_id = $1 ORDER BY updated_at DESC`, [req.patron.id]);
      res.json({
        shelf: rows.map((row) => ({
          campaignId: row.campaign_id, headHash: row.head_hash, turnCount: row.turn_count,
          signatureStatus: row.signature_status, publicKeyJwk: row.public_key_jwk,
          title: row.meta?.title || 'A chronicle', hero: row.meta?.hero?.name || null,
          sigil: row.meta?.hero?.sigil || null, completed: Boolean(row.meta?.completed),
          sealedAt: row.meta?.sealedAt || null, updatedAt: row.updated_at,
        })),
      });
    } catch (error) { console.error(`[vault] shelf: ${error.message}`); res.status(500).json({ error: 'The vault could not be read.' }); }
  });

  router.get('/vault/campaign/:id', async (req, res) => {
    try {
      await ensureVault(query);
      const { rows } = await query(
        `SELECT head_hash, turn_count, signature_status, public_key_jwk, meta FROM vault_campaigns
         WHERE user_id = $1 AND campaign_id = $2`, [req.patron.id, req.params.id]);
      if (!rows.length) return res.status(404).json({ error: 'No such spine in this vault.' });
      const row = rows[0];
      res.json({ campaignId: req.params.id, headHash: row.head_hash, turnCount: row.turn_count, signatureStatus: row.signature_status, publicKeyJwk: row.public_key_jwk, meta: row.meta });
    } catch (error) { console.error(`[vault] campaign: ${error.message}`); res.status(500).json({ error: 'The vault could not be read.' }); }
  });

  // BURN — the owner's right to let a tale go: spine and journal together,
  // this patron's shelf only. vault_media reference rows stay where they
  // are: blobs are content-addressed and may be cited by other spines, and
  // a reference row without its campaign is unreachable from any shelf.
  router.delete('/vault/campaign/:id', async (req, res) => {
    try {
      await ensureVault(query);
      await query(`DELETE FROM vault_journal WHERE user_id = $1 AND campaign_id = $2`, [req.patron.id, req.params.id]);
      const gone = await query(`DELETE FROM vault_campaigns WHERE user_id = $1 AND campaign_id = $2`, [req.patron.id, req.params.id]);
      res.json({ ok: true, burned: Boolean(gone?.rowCount) });
    } catch (error) { console.error(`[vault] burn: ${error.message}`); res.status(500).json({ error: 'The vault would not let go.' }); }
  });

  // Incremental by journal index: ?from=N returns records i >= N, in order.
  router.get('/vault/campaign/:id/journal', async (req, res) => {
    try {
      await ensureVault(query);
      const from = Math.max(0, Number(req.query.from) || 0);
      const { rows } = await query(
        `SELECT record FROM vault_journal WHERE user_id = $1 AND campaign_id = $2 AND i >= $3 ORDER BY i ASC`,
        [req.patron.id, req.params.id, from]);
      res.json({ records: rows.map((row) => row.record) });
    } catch (error) { console.error(`[vault] journal: ${error.message}`); res.status(500).json({ error: 'The vault could not be read.' }); }
  });

  // PUSH — the only door tales enter by. Records must extend the stored
  // head linearly; meta rides along (chain fields in meta are ignored —
  // the verified chain is the only truth the vault keeps for the head).
  router.post('/vault/push', async (req, res) => {
    const { campaignId, records = [], meta = null, publicKeyJwk = null, signatureStatus = null } = req.body || {};
    if (!campaignId || typeof campaignId !== 'string' || campaignId.length > 100) return res.status(400).json({ error: 'A push must name its chronicle.' });
    if (!Array.isArray(records) || records.length > MAX_PUSH_RECORDS) return res.status(400).json({ error: 'The vault refuses a push that large — push in pages.' });
    try {
      await ensureVault(query);
      const { rows } = await query(
        `SELECT head_hash, turn_count FROM vault_campaigns WHERE user_id = $1 AND campaign_id = $2`,
        [req.patron.id, campaignId]);
      const base = rows.length ? { headHash: rows[0].head_hash, turnCount: rows[0].turn_count } : { headHash: null, turnCount: 0 };

      if (records.length) {
        const first = records[0];
        if (first.i !== base.turnCount || (first.prevHash || null) !== base.headHash) {
          // History may only grow. The device that diverged forks its spine.
          return res.status(409).json({ diverged: true, serverHead: base.headHash, serverTurnCount: base.turnCount, error: 'The vault already holds a different telling — fork this spine.' });
        }
        const verdict = await judgeChain(records, base);
        if (!verdict.ok) return res.status(422).json({ error: `The chain does not hold: ${verdict.reason}` });
        for (const record of records) {
          await query(
            `INSERT INTO vault_journal (user_id, campaign_id, i, record_hash, prev_hash, record)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id, campaign_id, i) DO NOTHING`,
            [req.patron.id, campaignId, record.i, record.recordHash, record.prevHash || null, JSON.stringify(record)]);
        }
        base.headHash = verdict.headHash; base.turnCount = verdict.turnCount;
      } else if (rows.length && meta) {
        // A meta-only push (shelf presentation moved without a new seal) must
        // still answer for the head it believes in.
        if ((req.body.headHash || null) !== base.headHash) {
          return res.status(409).json({ diverged: true, serverHead: base.headHash, serverTurnCount: base.turnCount, error: 'This device is behind the vault — pull before pushing.' });
        }
      }

      await query(
        `INSERT INTO vault_campaigns (user_id, campaign_id, head_hash, turn_count, signature_status, public_key_jwk, meta, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'{}'::jsonb),now())
         ON CONFLICT (user_id, campaign_id) DO UPDATE SET
           head_hash = EXCLUDED.head_hash, turn_count = EXCLUDED.turn_count,
           signature_status = COALESCE(EXCLUDED.signature_status, vault_campaigns.signature_status),
           public_key_jwk = COALESCE(EXCLUDED.public_key_jwk, vault_campaigns.public_key_jwk),
           meta = CASE WHEN $7 IS NULL THEN vault_campaigns.meta ELSE EXCLUDED.meta END,
           updated_at = now()`,
        [req.patron.id, campaignId, base.headHash, base.turnCount, signatureStatus, publicKeyJwk ? JSON.stringify(publicKeyJwk) : null, meta ? JSON.stringify(meta) : null]);
      res.json({ ok: true, headHash: base.headHash, turnCount: base.turnCount });
    } catch (error) { console.error(`[vault] push: ${error.message}`); res.status(500).json({ error: 'The vault could not take the push.' }); }
  });

  // Which of these assets does the vault still lack for this patron?
  // (Named `media-missing`, not `media/:hash`, so the blob door's raw-body
  // parser can never swallow this JSON question.)
  router.post('/vault/media-missing', async (req, res) => {
    const hashes = Array.isArray(req.body?.hashes) ? req.body.hashes.filter((h) => SHA256_HEX.test(String(h))) : [];
    if (hashes.length > 500) return res.status(400).json({ error: 'Ask in pages.' });
    try {
      await ensureVault(query);
      const { rows } = await query(
        `SELECT asset_hash FROM vault_media WHERE user_id = $1 AND asset_hash = ANY($2)`,
        [req.patron.id, hashes]);
      const held = new Set(rows.map((row) => row.asset_hash));
      res.json({ missing: hashes.filter((hash) => !held.has(hash)) });
    } catch (error) { console.error(`[vault] missing: ${error.message}`); res.status(500).json({ error: 'The vault could not be read.' }); }
  });

  // Content-addressed ingest: the body must answer for the name it claims.
  router.post('/vault/media/:hash', async (req, res) => {
    const hash = String(req.params.hash);
    if (!SHA256_HEX.test(hash)) return res.status(400).json({ error: 'An asset is named by its sha256, nothing else.' });
    if (!(Boolean(deps.blobs) || blobShelfOpen())) return res.status(503).json({ error: 'The blob shelf is not raised — journal sync stands, media stays on the device.' });
    const bytes = req.body;
    if (!Buffer.isBuffer(bytes) || !bytes.length) return res.status(400).json({ error: 'The vault takes raw bytes.' });
    try {
      const actual = await sha256(new Uint8Array(bytes));
      if (actual !== hash) return res.status(422).json({ error: 'These bytes do not answer for their name.' });
      await ensureVault(query);
      if (!(await blobs.has(hash))) await blobs.put(hash, bytes, req.get('content-type'));
      await query(
        `INSERT INTO vault_media (user_id, asset_hash, mime, byte_length) VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, asset_hash) DO NOTHING`,
        [req.patron.id, hash, req.get('content-type') || null, bytes.length]);
      res.json({ ok: true, assetHash: hash });
    } catch (error) { console.error(`[vault] media put: ${error.message}`); res.status(500).json({ error: 'The blob could not be shelved.' }); }
  });

  // A blob is served only to a patron who owns a reference to it.
  router.get('/vault/media/:hash', async (req, res) => {
    const hash = String(req.params.hash);
    if (!SHA256_HEX.test(hash)) return res.status(400).json({ error: 'An asset is named by its sha256, nothing else.' });
    try {
      await ensureVault(query);
      const { rows } = await query(
        `SELECT mime FROM vault_media WHERE user_id = $1 AND asset_hash = $2`, [req.patron.id, hash]);
      if (!rows.length) return res.status(404).json({ error: 'No such asset in this vault.' });
      const { bytes, mime } = await blobs.get(hash);
      res.setHeader('Content-Type', rows[0].mime || mime || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
      res.send(Buffer.from(bytes));
    } catch (error) { console.error(`[vault] media get: ${error.message}`); res.status(500).json({ error: 'The blob could not be fetched.' }); }
  });

  return router;
}
