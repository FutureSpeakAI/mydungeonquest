// ---------------------------------------------------------------------------
// PLATE ROUTES — Stage 7 / L5 / updated Stage 8 / M4.2
//
// POST /_apiserver/storage/plates/presign
//   Accepts { worldId, campaignId, assetHash, mime }
//   Returns { uploadUrl, servePath }
//   The client uploads image bytes directly to GCS via the presigned PUT URL.
//
// GET  /_apiserver/storage/plates/:worldId/:campaignId/:assetHash
//   Streams the plate from GCS back to the requester.
//
// M4.2: worldId added to key path (plates/{worldId}/{campaignId}/{assetHash}).
// Today worldId === campaignId. The slot is reserved so Stage 9 persistent
// worlds need no migration — they just populate a different worldId.
// Cross-world AND cross-campaign dedupe are structurally impossible.
// ---------------------------------------------------------------------------

import { Router, type IRouter, type Request, type Response } from 'express';
import { PlateNotFoundError, downloadPlate, getPlateMetadata, presignPlateUpload } from '../lib/plateStorage';

const router: IRouter = Router();

/** Validate an assetHash: exactly 64 lowercase hex chars. */
function isValidAssetHash(h: string): boolean {
  return /^[0-9a-f]{64}$/.test(h);
}

/** Validate a campaignId or worldId: non-empty, no slashes, printable ASCII. */
function isValidCampaignId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && !/[/\\]/.test(id);
}
const isValidWorldId = isValidCampaignId; // same shape today

/** Validate a MIME type: must be image/*. */
function isImageMime(mime: string): boolean {
  return typeof mime === 'string' && /^image\/[a-z0-9.+-]+$/.test(mime);
}

/**
 * POST /_apiserver/storage/plates/presign
 *
 * Returns a presigned PUT URL the client can use to upload the plate bytes
 * directly to GCS, and the api-server serve path for later retrieval.
 */
router.post('/storage/plates/presign', async (req: Request, res: Response) => {
  const { worldId, campaignId, assetHash, mime } = req.body ?? {};

  // worldId is optional for backwards-compat: if absent, default to campaignId
  // (old clients before M4.2 don't send it; they only have one world anyway).
  const resolvedWorldId = worldId ?? campaignId;

  if (!isValidWorldId(resolvedWorldId)) {
    res.status(400).json({ error: 'Invalid or missing worldId' });
    return;
  }
  if (!isValidCampaignId(campaignId)) {
    res.status(400).json({ error: 'Invalid or missing campaignId' });
    return;
  }
  if (!isValidAssetHash(assetHash)) {
    res.status(400).json({ error: 'Invalid or missing assetHash (must be 64 hex chars)' });
    return;
  }
  if (!isImageMime(mime)) {
    res.status(400).json({ error: 'Invalid or missing mime (must be image/*)' });
    return;
  }

  try {
    const result = await presignPlateUpload(resolvedWorldId, campaignId, assetHash, mime);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, 'presignPlateUpload failed');
    res.status(503).json({ error: 'Object storage unavailable' });
  }
});

/**
 * GET /_apiserver/storage/plates/:worldId/:campaignId/:assetHash
 *
 * Streams the plate from GCS. Returns 404 if absent.
 * Future: gate by auth once accounts exist (Stage 9).
 */
router.get('/storage/plates/:worldId/:campaignId/:assetHash', async (req: Request, res: Response) => {
  const { worldId, campaignId, assetHash } = req.params;

  if (!isValidWorldId(worldId) || !isValidCampaignId(campaignId) || !isValidAssetHash(assetHash)) {
    res.status(400).json({ error: 'Invalid path parameters' });
    return;
  }

  try {
    const [stream, meta] = await Promise.all([
      downloadPlate(worldId, campaignId, assetHash),
      getPlateMetadata(worldId, campaignId, assetHash).catch(() => ({ contentType: 'image/png' })),
    ]);
    res.setHeader('Content-Type', meta.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    stream.pipe(res);
  } catch (err) {
    if (err instanceof PlateNotFoundError) {
      res.status(404).json({ error: 'Plate not found' });
      return;
    }
    req.log.error({ err }, 'downloadPlate failed');
    res.status(503).json({ error: 'Object storage unavailable' });
  }
});

export default router;
