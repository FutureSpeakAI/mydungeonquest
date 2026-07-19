// THE COMMONS — sealed tales published as public pages (Directive XV §III).
//
// Laws of this room:
//   • Sealed-only: the desk verifies the WHOLE record server-side
//     (fail-closed), and the journal must carry its `sealing` block —
//     an unsealed tale is refused by name.
//   • Byte-preservation: the record arrives as raw text, is stored as
//     raw text, and leaves as the same bytes — the reader's browser
//     re-runs the desk on exactly what the author sealed. No parser
//     ever re-shapes the stored copy (the bench-parsed copy is a
//     throwaway used only to judge admission).
//   • Assets must pre-exist: a record naming plates the patron's vault
//     shelf does not hold is refused — the commons never mints bytes,
//     it only opens doors onto the one content-addressed shelf.
//   • One living page per tale per patron: publishing over a standing
//     page is a 409 that names it; revoke first, then publish anew.
//   • Public doors ask nobody's name: meta, record, assets, and the
//     listed commons need no account, and answer 410 — not 404 — once
//     the author revokes (a tombstone, never a shrug).
//   • Unlisted by default; listing is the author's explicit choice.
//
// Owner rooms fail CLOSED with their own patron check (never namedOnly —
// in the staging house the Clerk door is closed and namedOnly would wave
// guests through; custody law wants a hard 401 instead).
import express from 'express';
import crypto from 'node:crypto';
import { verifyChronicle } from 'fatescript/desk';
import { doorOpen, stageSeamOpen, runQuery } from './patrons.js';
import { ensureVault, vaultBlobShelf } from './vault.js';

export const publishOpen = () => (doorOpen() || stageSeamOpen()) && Boolean(process.env.DATABASE_URL);
// The public doors gate on the ledger alone — a visitor needs no door at
// all, only a shelf that exists to be read from.
export const publicShelfOpen = () => Boolean(process.env.DATABASE_URL);

const SHA256_HEX = /^[a-f0-9]{64}$/;
const mintPublishId = () => crypto.randomBytes(16).toString('base64url');

// ------------------------------------------------------------ the ledger
const PUBLISH_DDL = `
  CREATE TABLE IF NOT EXISTS publish_pages (
    publish_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    record TEXT NOT NULL,
    head_hash TEXT,
    turn_count INTEGER NOT NULL DEFAULT 0,
    listed BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
  );
  CREATE UNIQUE INDEX IF NOT EXISTS publish_one_living
    ON publish_pages (user_id, campaign_id) WHERE revoked_at IS NULL;
  CREATE TABLE IF NOT EXISTS publish_assets (
    publish_id TEXT NOT NULL,
    asset_hash TEXT NOT NULL,
    mime TEXT,
    PRIMARY KEY (publish_id, asset_hash)
  );
`;
let publishBound = null;
export function ensurePublish(query = runQuery) {
  if (!publishBound) {
    publishBound = query(PUBLISH_DDL).catch((error) => {
      publishBound = null; // a failed founding may be retried
      throw error;
    });
  }
  return publishBound;
}
export function __resetPublishForEval() { publishBound = null; }

// --------------------------------------------------------------- the room
export function publishRoutes(deps = {}) {
  const query = deps.query || runQuery;
  const blobs = deps.blobs || vaultBlobShelf();
  const router = express.Router();

  // Owner rooms: fail closed. Dormant houses answer 503; guests 401.
  router.use('/publish', (req, res, next) => {
    if (!publishOpen() && !deps.query) return res.status(503).json({ error: 'The commons are dormant on this table.' });
    if (req.path === '/status') return next();
    if (!req.patron) return res.status(401).json({ error: 'The commons take work from named patrons only.' });
    return next();
  });

  router.get('/publish/status', (req, res) => {
    res.json({ live: Boolean(deps.query) || publishOpen(), patron: Boolean(req.patron) });
  });

  // PUBLISH — the record arrives as raw text (see the text-door mount in
  // index.js) and is judged on a parsed THROWAWAY; the stored copy is the
  // author's bytes, untouched.
  router.post('/publish', async (req, res) => {
    try {
      const raw = typeof req.body === 'string' ? req.body : null;
      if (!raw || !raw.trim()) {
        return res.status(400).json({ error: 'The commons take the sealed record as text/plain — raw bytes, no envelope.' });
      }
      let record;
      try { record = JSON.parse(raw); }
      catch { return res.status(400).json({ error: 'The record is not readable JSON.' }); }

      // The desk sits at this door — the same court the reader's browser
      // will convene. Fail closed on any verdict short of true.
      let verdict;
      try { verdict = await verifyChronicle(record); }
      catch (error) { return res.status(422).json({ error: `The desk could not read this record (${error.message}).` }); }
      if (!verdict?.ok) {
        return res.status(422).json({ error: `The desk refuses this record: ${verdict?.reason || 'it does not verify'}.` });
      }
      const journal = Array.isArray(record.journal) ? record.journal : [];
      if (!journal.some((row) => row && row.type === 'sealing')) {
        return res.status(422).json({ error: 'Only sealed tales enter the commons — press the wax first.' });
      }

      const campaignId = typeof record.header?.campaignId === 'string' ? record.header.campaignId.slice(0, 120) : '';
      if (!campaignId) return res.status(422).json({ error: 'The record names no campaign.' });
      const title = String(record.campaign?.title || record.header?.title || 'An untitled tale').slice(0, 200);
      const headHash = typeof record.header?.headHash === 'string' ? record.header.headHash : null;

      // The asset law: every plate the record names must already stand on
      // this patron's shelf, and every name must BE a name (the strict
      // media door — these hashes become URLs on the public page).
      const index = Array.isArray(record.media) ? record.media : [];
      const named = index.filter((row) => row && row.assetHash != null);
      if (named.some((row) => !SHA256_HEX.test(String(row.assetHash)))) {
        return res.status(422).json({ error: 'A named plate does not answer to a lawful hash.' });
      }
      const hashes = [...new Set(named.map((row) => String(row.assetHash)))];
      await ensureVault(query);
      await ensurePublish(query);
      if (hashes.length) {
        const { rows } = await query(
          'SELECT asset_hash FROM vault_media WHERE user_id = $1 AND asset_hash = ANY($2)',
          [req.patron.id, hashes],
        );
        const held = new Set(rows.map((row) => row.asset_hash));
        const missing = hashes.filter((hash) => !held.has(hash));
        if (missing.length) {
          return res.status(422).json({ error: 'The record names plates that have not reached the shelf — sync first, then publish.', missing });
        }
      }

      // One living page per tale per patron — the refusal names the page
      // standing in the way so the author can revoke it deliberately.
      const standing = await query(
        'SELECT publish_id FROM publish_pages WHERE user_id = $1 AND campaign_id = $2 AND revoked_at IS NULL',
        [req.patron.id, campaignId],
      );
      if (standing.rows.length) {
        return res.status(409).json({ error: 'This tale already has a living page — revoke it before publishing anew.', publishId: standing.rows[0].publish_id });
      }

      const publishId = mintPublishId();
      try {
        await query(
          'INSERT INTO publish_pages (publish_id, user_id, campaign_id, title, record, head_hash, turn_count) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [publishId, req.patron.id, campaignId, title, raw, headHash, journal.length],
        );
      } catch (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'This tale already has a living page — revoke it before publishing anew.' });
        }
        throw error;
      }
      const mimeOf = new Map(named.map((row) => [String(row.assetHash), typeof row.mime === 'string' ? row.mime.slice(0, 100) : null]));
      for (const hash of hashes) {
        await query(
          'INSERT INTO publish_assets (publish_id, asset_hash, mime) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [publishId, hash, mimeOf.get(hash) || null],
        );
      }
      return res.json({ ok: true, publishId, url: `/t/${publishId}`, listed: false });
    } catch (error) {
      console.error(`[publish] the press jammed: ${error.message}`);
      return res.status(500).json({ error: 'The commons stumbled — nothing was published.' });
    }
  });

  // REVOKE — the tombstone law: the page dies at every public door (410),
  // the record row stays (revoked_at is the stone), the vault is untouched.
  router.post('/publish/:id/revoke', async (req, res) => {
    try {
      await ensurePublish(query);
      const done = await query(
        'UPDATE publish_pages SET revoked_at = now() WHERE publish_id = $1 AND user_id = $2 AND revoked_at IS NULL',
        [req.params.id, req.patron.id],
      );
      if (done.rowCount) return res.json({ ok: true, revoked: true });
      const { rows } = await query('SELECT revoked_at FROM publish_pages WHERE publish_id = $1 AND user_id = $2', [req.params.id, req.patron.id]);
      if (!rows.length) return res.status(404).json({ error: 'No such page stands under your name.' });
      return res.json({ ok: true, revoked: true, already: true });
    } catch (error) {
      console.error(`[publish] the revoke stumbled: ${error.message}`);
      return res.status(500).json({ error: 'The commons stumbled — the page still stands.' });
    }
  });

  // LISTING — unlisted is the default posture; listing is a deliberate act,
  // and a revoked page may not be re-lit through this side door.
  router.post('/publish/:id/listing', async (req, res) => {
    try {
      await ensurePublish(query);
      const listed = req.body?.listed === true;
      const done = await query(
        'UPDATE publish_pages SET listed = $3 WHERE publish_id = $1 AND user_id = $2 AND revoked_at IS NULL',
        [req.params.id, req.patron.id, listed],
      );
      if (!done.rowCount) return res.status(404).json({ error: 'No living page stands under your name by that id.' });
      return res.json({ ok: true, listed });
    } catch (error) {
      console.error(`[publish] the listing stumbled: ${error.message}`);
      return res.status(500).json({ error: 'The commons stumbled — the listing is unchanged.' });
    }
  });

  router.get('/publish/mine', async (req, res) => {
    try {
      await ensurePublish(query);
      const { rows } = await query(
        'SELECT publish_id, campaign_id, title, listed, head_hash, turn_count, published_at, revoked_at FROM publish_pages WHERE user_id = $1 ORDER BY published_at DESC',
        [req.patron.id],
      );
      return res.json({
        pages: rows.map((row) => ({
          publishId: row.publish_id, campaignId: row.campaign_id, title: row.title,
          listed: row.listed, headHash: row.head_hash, turnCount: row.turn_count,
          publishedAt: row.published_at, revokedAt: row.revoked_at,
        })),
      });
    } catch (error) {
      console.error(`[publish] the shelf-walk stumbled: ${error.message}`);
      return res.status(500).json({ error: 'The commons stumbled.' });
    }
  });

  // ---------------------------------------------------- the public doors
  router.use('/public', (_req, res, next) => {
    if (!publicShelfOpen() && !deps.query) return res.status(503).json({ error: 'The commons are dormant on this table.' });
    return next();
  });

  async function pageById(id) {
    await ensurePublish(query);
    const { rows } = await query('SELECT * FROM publish_pages WHERE publish_id = $1', [id]);
    return rows[0] || null;
  }
  const gone = (res) => res.status(410).json({ revoked: true, error: 'The author has taken this tale down.' });

  router.get('/public/tale/:id', async (req, res) => {
    try {
      const page = await pageById(req.params.id);
      if (!page) return res.status(404).json({ error: 'No tale stands at this address.' });
      if (page.revoked_at) return gone(res);
      res.set('Cache-Control', 'no-store');
      return res.json({
        publishId: page.publish_id, title: page.title, headHash: page.head_hash,
        turnCount: page.turn_count, listed: page.listed, publishedAt: page.published_at,
        engine: 'fatescript 1.0.0', source: 'https://github.com/futurespeakai/mydungeonquest',
      });
    } catch (error) {
      console.error(`[publish] the meta door stumbled: ${error.message}`);
      return res.status(500).json({ error: 'The commons stumbled.' });
    }
  });

  // The record leaves as the SAME BYTES it arrived as — the reader's desk
  // sits on the author's own text, never a re-serialization.
  router.get('/public/tale/:id/record', async (req, res) => {
    try {
      const page = await pageById(req.params.id);
      if (!page) return res.status(404).json({ error: 'No tale stands at this address.' });
      if (page.revoked_at) return gone(res);
      res.set('Cache-Control', 'no-store');
      res.set('Content-Type', 'application/json; charset=utf-8');
      return res.send(page.record);
    } catch (error) {
      console.error(`[publish] the record door stumbled: ${error.message}`);
      return res.status(500).json({ error: 'The commons stumbled.' });
    }
  });

  // Plates: served only through a page that names them, from the one
  // content-addressed shelf. A modest public cache (not immutable) so a
  // revocation's 410 reaches new readers within the hour.
  router.get('/public/tale/:id/asset/:hash', async (req, res) => {
    try {
      const hash = String(req.params.hash);
      if (!SHA256_HEX.test(hash)) return res.status(400).json({ error: 'That is not a plate\u2019s name.' });
      const page = await pageById(req.params.id);
      if (!page) return res.status(404).json({ error: 'No tale stands at this address.' });
      if (page.revoked_at) return gone(res);
      const { rows } = await query('SELECT mime FROM publish_assets WHERE publish_id = $1 AND asset_hash = $2', [page.publish_id, hash]);
      if (!rows.length) return res.status(404).json({ error: 'This tale names no such plate.' });
      const blob = await blobs.get(hash).catch(() => null);
      if (!blob) return res.status(404).json({ error: 'The shelf could not produce this plate.' });
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('Content-Type', rows[0].mime || blob.mime || 'application/octet-stream');
      return res.send(Buffer.from(blob.bytes));
    } catch (error) {
      console.error(`[publish] the plate door stumbled: ${error.message}`);
      return res.status(500).json({ error: 'The commons stumbled.' });
    }
  });

  router.get('/public/commons', async (_req, res) => {
    try {
      await ensurePublish(query);
      const { rows } = await query(
        'SELECT publish_id, title, turn_count, published_at FROM publish_pages WHERE listed = TRUE AND revoked_at IS NULL ORDER BY published_at DESC LIMIT 60',
      );
      res.set('Cache-Control', 'no-store');
      return res.json({ tales: rows.map((row) => ({ publishId: row.publish_id, title: row.title, turnCount: row.turn_count, publishedAt: row.published_at })) });
    } catch (error) {
      console.error(`[publish] the commons walk stumbled: ${error.message}`);
      return res.status(500).json({ error: 'The commons stumbled.' });
    }
  });

  return router;
}
