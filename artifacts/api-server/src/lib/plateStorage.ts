// ---------------------------------------------------------------------------
// PLATE STORAGE — Stage 7 / L5 / updated Stage 8 / M4.2
//
// World-and-campaign-scoped object storage for AI-generated media assets.
// Key path:
//
//   {PRIVATE_OBJECT_DIR}/plates/{worldId}/{campaignId}/{assetHash}
//
// M4.2 rationale: persistent worlds are coming (Stage 9). Adding worldId
// now costs one path segment and saves a full migration over every asset
// ever stored. With one world per campaign today, worldId = campaignId —
// the shape is right; the expansion is trivial.
//
// Law:
//   - Every key path carries both worldId and campaignId — cross-world AND
//     cross-campaign dedupe are both structurally impossible.
//   - Uploads are presigned (browser uploads directly to GCS; server never
//     receives image bytes).
//   - Serving goes through the api-server so access can be gated later.
// ---------------------------------------------------------------------------

import { Storage } from '@google-cloud/storage';

const SIDECAR = 'http://127.0.0.1:1106';

const gcs = new Storage({
  credentials: {
    audience: 'replit',
    subject_token_type: 'access_token',
    token_url: `${SIDECAR}/token`,
    type: 'external_account',
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: 'json', subject_token_field_name: 'access_token' },
    },
    universe_domain: 'googleapis.com',
  },
  projectId: '',
});

export class PlateNotFoundError extends Error {
  constructor() {
    super('Plate not found');
    this.name = 'PlateNotFoundError';
    Object.setPrototypeOf(this, PlateNotFoundError.prototype);
  }
}

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || '';
  if (!dir) throw new Error('PRIVATE_OBJECT_DIR not set — provision object storage first');
  return dir.endsWith('/') ? dir.slice(0, -1) : dir;
}

function parsePath(path: string): { bucketName: string; objectName: string } {
  const p = path.startsWith('/') ? path : `/${path}`;
  const parts = p.split('/');
  if (parts.length < 3) throw new Error('Invalid GCS path');
  return { bucketName: parts[1], objectName: parts.slice(2).join('/') };
}

async function signUrl({
  bucketName, objectName, method, ttlSec,
}: {
  bucketName: string; objectName: string;
  method: 'GET' | 'PUT'; ttlSec: number;
}): Promise<string> {
  const res = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Sidecar sign failed: ${res.status}`);
  const { signed_url: signedUrl } = await res.json();
  return signedUrl;
}

/** Request a presigned PUT URL for a plate.
 *  Returns { uploadUrl, servePath } where servePath is the api-server
 *  path that serves the object back.
 *
 *  M4.2: key path is now world-AND-campaign-scoped:
 *    plates/{worldId}/{campaignId}/{assetHash}
 *  Today worldId === campaignId (one world per campaign). The extra segment
 *  costs nothing and avoids a full-table migration when persistent worlds land.
 */
export async function presignPlateUpload(
  worldId: string,
  campaignId: string,
  assetHash: string,
  mime: string,
): Promise<{ uploadUrl: string; servePath: string }> {
  const privateDir = getPrivateDir();
  const objectPath = `${privateDir}/plates/${worldId}/${campaignId}/${assetHash}`;
  const { bucketName, objectName } = parsePath(objectPath);
  const uploadUrl = await signUrl({ bucketName, objectName, method: 'PUT', ttlSec: 900 });
  const servePath = `/_apiserver/storage/plates/${worldId}/${campaignId}/${assetHash}`;
  return { uploadUrl, servePath };
}

/** Stream a plate from object storage. Throws PlateNotFoundError if absent. */
export async function downloadPlate(worldId: string, campaignId: string, assetHash: string): Promise<import('node:stream').Readable> {
  const privateDir = getPrivateDir();
  const objectPath = `${privateDir}/plates/${worldId}/${campaignId}/${assetHash}`;
  const { bucketName, objectName } = parsePath(objectPath);
  const bucket = gcs.bucket(bucketName);
  const file = bucket.file(objectName);
  const [exists] = await file.exists();
  if (!exists) throw new PlateNotFoundError();
  return file.createReadStream();
}

/** Retrieve metadata for a plate (for Content-Type header). */
export async function getPlateMetadata(worldId: string, campaignId: string, assetHash: string): Promise<{ contentType: string }> {
  const privateDir = getPrivateDir();
  const objectPath = `${privateDir}/plates/${worldId}/${campaignId}/${assetHash}`;
  const { bucketName, objectName } = parsePath(objectPath);
  const bucket = gcs.bucket(bucketName);
  const file = bucket.file(objectName);
  const [meta] = await file.getMetadata();
  return { contentType: (meta.contentType as string) || 'application/octet-stream' };
}
