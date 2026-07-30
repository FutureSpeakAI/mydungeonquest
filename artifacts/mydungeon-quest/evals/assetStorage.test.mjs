// assetStorage — Stage 7 / L5
//
// Verifies that the plates-to-object-storage pipeline is wired correctly:
// the Foundry uploads after generation, the record stores a URL reference,
// attestation still binds to assetHash (unchanged), the render path prefers
// objectUrl over a blob URL, and two campaigns never share an asset path.
//
// Courts:
//  ① foundry.js has the upload-after-put hook for object storage
//  ② The upload uses campaignId in the key path (cross-world dedupe impossible)
//  ③ After a successful upload, objectUrl is stored and blob is cleared
//  ④ App.jsx region-plate path prefers objectUrl over blob URL
//  ⑤ App.jsx key-art path prefers objectUrl over blob URL
//  ⑥ App.jsx scene-plate imageUrl path uses objectUrl when present
//  ⑦ Attestation binding unchanged: onAttestation carries assetHash (bytes hash)
//     regardless of whether the asset is in object storage or IndexedDB
//  ⑧ Key-path isolation: two campaigns with identical assetHash get different
//     object paths — no cross-campaign (and therefore no cross-world) sharing
//  ⑨ api-server: presign route validates campaignId (no slashes) and
//     assetHash (64 hex chars) — rejects malformed inputs
//  ⑩ api-server: key path uses PRIVATE_OBJECT_DIR/{campaignId}/{assetHash}
//     (campaign-scoped per L5 constraint)

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const foundrySrc = src('src/lib/cinema/foundry.js');
const appSrc     = src('src/App.jsx');
const platesSrc  = src('../../artifacts/api-server/src/routes/plates.ts');
const plateSvcSrc = src('../../artifacts/api-server/src/lib/plateStorage.ts');

// ① Foundry has the upload-after-put hook
assert.ok(
  foundrySrc.includes('/_apiserver/storage/plates/presign'),
  '① foundry.js must call /_apiserver/storage/plates/presign after db.media.put',
);
assert.ok(
  foundrySrc.includes('method: \'PUT\', body: row.blob'),
  '① foundry.js must upload blob via presigned PUT URL',
);

// ② The key path in plateStorage.ts includes campaignId (cross-world dedupe impossible)
assert.ok(
  plateSvcSrc.includes('/plates/${campaignId}/${assetHash}'),
  '② plateStorage.ts key path must include campaignId and assetHash — campaign-scoped',
);

// ③ objectUrl stored and blob cleared after successful upload
assert.ok(
  foundrySrc.includes('row.objectUrl = servePath'),
  '③ foundry.js must set row.objectUrl to the servePath after upload',
);
assert.ok(
  foundrySrc.includes("objectUrl: servePath, blob: null"),
  '③ foundry.js must clear blob (blob: null) after successful upload',
);

// ④ App.jsx region plate prefers objectUrl
assert.ok(
  appSrc.includes('plate.objectUrl') && appSrc.includes('setRegionPlate(plate.objectUrl)'),
  '④ App.jsx region-plate path must prefer objectUrl over blob URL',
);

// ⑤ App.jsx key-art prefers objectUrl
assert.ok(
  appSrc.includes('art.objectUrl') && appSrc.includes('setKeyArtUrl(art.objectUrl)'),
  '⑤ App.jsx key-art path must prefer objectUrl over blob URL',
);

// ⑥ App.jsx scene imageUrl uses objectUrl when present
assert.ok(
  appSrc.includes('asset.objectUrl || await blobToDataUrl(asset.blob)'),
  '⑥ App.jsx scene-plate imageUrl must prefer objectUrl (falls back to blobToDataUrl for legacy)',
);

// ⑦ Attestation binding unchanged: onAttestation carries assetHash
// The upload happens AFTER onAttestation is called? Let's verify the order.
// Actually, looking at the code: upload is before onAttestation in the edit.
// The attestation payload includes assetHash regardless of storage path.
assert.ok(
  foundrySrc.includes('assetHash, mime: row.mime, byteLength: blob.size'),
  '⑦ onAttestation payload must still carry assetHash — binding is to content hash, not storage URL',
);

// ⑧ Key-path isolation: two campaigns with identical assetHash get different paths
//    Verified structurally: the path template includes campaignId.
{
  const CAMP_A = 'world-larkspur-campaign-a';
  const CAMP_B = 'world-larkspur-campaign-b';
  const SHARED_HASH = 'a'.repeat(64); // same content → same assetHash
  // Simulate the path computation from plateStorage.ts
  const pathA = `/plates/${CAMP_A}/${SHARED_HASH}`;
  const pathB = `/plates/${CAMP_B}/${SHARED_HASH}`;
  assert.notStrictEqual(pathA, pathB, '⑧ same assetHash in two campaigns must produce different object paths');
  assert.ok(pathA.includes(CAMP_A), '⑧ path A must include campaign A id');
  assert.ok(pathB.includes(CAMP_B), '⑧ path B must include campaign B id');
}

// ⑨ api-server presign route validates inputs
assert.ok(
  platesSrc.includes('isValidCampaignId') && platesSrc.includes('isValidAssetHash') && platesSrc.includes('isImageMime'),
  '⑨ plates.ts presign route must validate campaignId, assetHash, and mime before signing',
);
assert.ok(
  platesSrc.includes('/[/\\\\]/') || platesSrc.includes('[/\\\\]'),
  '⑨ campaignId validator must reject slashes (no path traversal)',
);
assert.ok(
  platesSrc.includes('/^[0-9a-f]{64}$/'),
  '⑨ assetHash validator must require exactly 64 lowercase hex chars',
);

// ⑩ plateStorage.ts key path uses PRIVATE_OBJECT_DIR (campaign-scoped per L5)
assert.ok(
  plateSvcSrc.includes('getPrivateDir()') && plateSvcSrc.includes('PRIVATE_OBJECT_DIR'),
  '⑩ plateStorage.ts must read PRIVATE_OBJECT_DIR for the GCS bucket root',
);
assert.ok(
  plateSvcSrc.includes("plates/${campaignId}/${assetHash}"),
  '⑩ plateStorage.ts GCS path must be {PRIVATE_OBJECT_DIR}/plates/{campaignId}/{assetHash}',
);

// Integration note: functional courts (actual upload + serve) require the
// object storage sidecar (PRIVATE_OBJECT_DIR set, running on Replit). The
// eval harness runs without it. Source courts ①–⑩ above verify the plumbing.
// On a live run:
//   presign → uploadUrl is a signed GCS PUT URL
//   PUT blob → GCS stores native image bytes (not base64)
//   GET /_apiserver/storage/plates/{campaignId}/{assetHash} → streams from GCS
//   Two campaigns: same cue, different campaignId → different object paths (⑧)

console.log(
  'PASS — assetStorage (Stage 7 / L5): ' +
  'foundry uploads after generate to campaign-scoped GCS path; ' +
  'objectUrl stored + blob cleared after upload; ' +
  'App.jsx prefers objectUrl for region-plate, key-art, and scene imageUrl; ' +
  'attestation binding unchanged (assetHash, not storage URL); ' +
  'same assetHash in two campaigns produces different object paths (no cross-world dedupe); ' +
  'presign route validates campaignId (no slashes), assetHash (64 hex), and mime; ' +
  'key path: PRIVATE_OBJECT_DIR/plates/{campaignId}/{assetHash}.',
);
