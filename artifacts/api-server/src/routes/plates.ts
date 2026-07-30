// ---------------------------------------------------------------------------
// PLATE ROUTES — Stage 7 / L5
//
// POST /_apiserver/storage/plates/presign
//   Accepts { campaignId, assetHash, mime } — returns { uploadUrl, servePath }
//   The client uploads the image bytes directly to GCS via the presigned PUT URL.
//
// GET  /_apiserver/storage/plates/:campaignId/:assetHash
//   Streams the plate from GCS back to the requester.
//
// Both paths keep campaignId in the key so dedupe across campaigns (and
// therefore across worlds) is structurally impossible (L5 constraint).
// ---------------------------------------------------------------------------

import { Router, type IRouter, type Request, type Response } from 'express';
import { PlateNotFoundError, downloadPlate, getPlateMetadata, presignPlateUpload } from '../lib/plateStorage';

const router: IRouter = Router();

/** Validate an assetHash: exactly 64 lowercase hex chars. */
function isValidAssetHash(h: string): boolean {
  return /^[0-9a-f]{64}$/.test(h);
}

/** Validate a campaignId: non-empty, no slashes, printable ASCII. */
function isValidCampaignId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && !/[/\\]/.test(id);
}

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
  const { campaignId, assetHash, mime } = req.body ?? {};

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
    const result = await presignPlateUpload(campaignId, assetHash, mime);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, 'presignPlateUpload failed');
    res.status(503).json({ error: 'Object storage unavailable' });
  }
});

/**
 * GET /_apiserver/storage/plates/:campaignId/:assetHash
 *
 * Streams the plate from GCS. Returns 404 if absent.
 * Future: gate by auth once accounts exist (Stage 8).
 */
router.get('/storage/plates/:campaignId/:assetHash', async (req: Request, res: Response) => {
  const { campaignId, assetHash } = req.params;

  if (!isValidCampaignId(campaignId) || !isValidAssetHash(assetHash)) {
    res.status(400).json({ error: 'Invalid path parameters' });
    return;
  }

  try {
    const [stream, meta] = await Promise.all([
      downloadPlate(campaignId, assetHash),
      getPlateMetadata(campaignId, assetHash).catch(() => ({ contentType: 'image/png' })),
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
