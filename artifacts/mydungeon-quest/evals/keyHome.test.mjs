// THE KEY STAYS HOME, judged (Directive XV §VI, gate 3 of 3) — the
// signing key's private half must never board ANY egress: not the export
// envelope, not the vault push, not the published record. The bench
// seeds the key row with a SENTINEL private scalar (a plain object, so
// the law is judged even where non-extractable CryptoKeys cannot be
// cloned), walks each real egress seat, and deep-scans every byte that
// would leave the device. An unscannable value is a FAILURE, not a
// shrug — what cannot be read cannot be trusted to be clean.
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';

delete process.env.CLERK_SECRET_KEY;
delete process.env.CLERK_PUBLISHABLE_KEY;
delete process.env.VAULT_STAGE_PATRON;

const { canonicalize, sha256 } = await import('fatescript/canonical');
const { db } = await import('../src/lib/db.js');
const { exportChronicle, appendEvent } = await import('../src/lib/seal.js');
const { publishRecordFrom } = await import('../src/lib/publish.js');

const SENTINEL = 'SENTINEL_PRIVATE_SCALAR_NEVER_EGRESS';

// ------------------------------------------------------------- the scanner
function deepScan(value, where, path = '$', seen = new Set()) {
  if (value === null || value === undefined) return;
  const kind = typeof value;
  if (kind === 'string') {
    assert.equal(value.includes(SENTINEL), false, `${where}: the private scalar itself rode out at ${path}`);
    return;
  }
  if (kind === 'number' || kind === 'boolean') return;
  if (kind === 'function' || kind === 'symbol' || kind === 'bigint') {
    assert.fail(`${where}: unscannable ${kind} at ${path} — what cannot be read cannot be trusted`);
  }
  if (seen.has(value)) return;
  seen.add(value);
  const ctor = value?.constructor?.name;
  if (ctor === 'CryptoKey' || (value.algorithm && typeof value.type === 'string' && 'extractable' in value)) {
    assert.fail(`${where}: a live CryptoKey rode out at ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, k) => deepScan(item, where, `${path}[${k}]`, seen));
    return;
  }
  for (const [key, inner] of Object.entries(value)) {
    assert.equal(key === 'd', false, `${where}: a JWK private scalar 'd' rode out at ${path}.${key}`);
    assert.equal(key === 'privateKey' || key === 'private_key', false, `${where}: a private key field rode out at ${path}.${key}`);
    deepScan(inner, where, `${path}.${key}`, seen);
  }
}

// ------------------------------------------- the specimen: a signed spine
async function makeRecord({ type = 'turn', i, prevHash, payload, ts = 1770000000000 + i }) {
  const unsigned = { type, i, prevHash, payload, ts };
  return { ...unsigned, recordHash: await sha256(canonicalize(unsigned)) };
}

const r0 = await makeRecord({ i: 0, prevHash: null, payload: { player: 'begin' } });
const r1 = await makeRecord({ i: 1, prevHash: r0.recordHash, payload: { player: 'carry on' } });
await db.campaigns.put({ id: 'key-home', title: 'The Key Stays Home', headHash: r1.recordHash, turnCount: 2, signatureStatus: 'signed', logs: [], updatedAt: 1 });
await db.journal.bulkPut([{ campaignId: 'key-home', ...r0 }, { campaignId: 'key-home', ...r1 }]);
await db.keys.put({
  campaignId: 'key-home', algorithm: 'Ed25519', signed: true,
  privateKey: { kty: 'OKP', crv: 'Ed25519', x: 'PUBLIC-COORDINATE', d: SENTINEL },
  publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'PUBLIC-COORDINATE' },
  publicJwk: { kty: 'OKP', crv: 'Ed25519', x: 'PUBLIC-COORDINATE' },
});

// --------------------------------------------- 1. the export envelope
const envelope = await exportChronicle('key-home');
deepScan(envelope, 'exportChronicle');
assert.equal(envelope.header.publicKeyJwk?.x, 'PUBLIC-COORDINATE', 'the PUBLIC half must ride — the wax needs it to verify elsewhere');
console.log('ok — the export envelope carries the public half and nothing warmer');

// --------------------------------------------- 2. the vault push body
const { vaultSessionChanged, syncCampaign } = await import('../src/lib/vault.js');
const pushBodies = [];
const capturedBodies = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const target = String(url);
  const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  if (target.includes('/api/whoami')) return respond({ patron: { id: 'key-home-user', name: 'Bench' } });
  if (target.includes('/api/vault/status')) return respond({ live: true, media: false });
  if (target.includes('/api/vault/shelf')) return respond({ campaigns: [] });
  if (target.includes('/api/vault/') && (opts.method || 'GET') === 'POST') {
    // EVERY outbound vault body is captured and scanned — the push door
    // (/vault/push) is the one that must prove the public half rides.
    const parsed = opts.body ? JSON.parse(opts.body) : {};
    capturedBodies.push(parsed);
    if (target.includes('/api/vault/push')) pushBodies.push(parsed);
    return respond({ ok: true, headHash: r1.recordHash, turnCount: 2, missing: [] });
  }
  if (target.includes('/api/vault/campaign/')) return respond({ error: 'nothing vaulted' }, 404);
  return respond({});
};
try {
  await vaultSessionChanged('key-home-user');
  await syncCampaign('key-home');
} finally {
  await vaultSessionChanged(null).catch(() => {});
  globalThis.fetch = realFetch;
}
assert.equal(pushBodies.length > 0, true, 'the bench must capture a real push — a silent no-op judges nothing');
for (const body of capturedBodies) deepScan(body, 'outbound vault body');
assert.equal(pushBodies[0].publicKeyJwk?.x, 'PUBLIC-COORDINATE', 'the push carries the public half for the vault to keep');
console.log('ok — the vault push carries the public half and nothing warmer');

// --------------------------------------------- 3. the published record
const record = publishRecordFrom(envelope);
deepScan(record, 'publishRecordFrom');
assert.equal(record.header.publicKeyJwk?.x, 'PUBLIC-COORDINATE', 'the published record keeps the public half — readers verify with it');
console.log('ok — the published record carries the public half and nothing warmer');

// --------------------------------------------- 4. the live signer's own row
// Sanity at the real seat: a fresh campaign mints its key through
// signerFor and the export STILL scans clean — whichever key family this
// bench's crypto grants.
await db.campaigns.put({ id: 'kh-live', title: 'Live Signer', headHash: null, turnCount: 0, signatureStatus: 'pending', logs: [], updatedAt: 1 });
const minted = await appendEvent('kh-live', 'turn', { player: 'first ink' });
assert.equal(typeof minted.recordHash, 'string', 'the live signer seals a lawful record');
deepScan(await exportChronicle('kh-live'), 'exportChronicle (live signer)');
console.log('ok — the live signer\u2019s export scans clean too');

console.log('PASS keyHome.test.mjs — the private key never boards: export, push, and publish all carry the public half only');
