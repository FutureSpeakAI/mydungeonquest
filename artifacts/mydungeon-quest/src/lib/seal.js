import Dexie from 'dexie';
import { canonicalize, sha256, bytesToBase64 } from 'fatescript/canonical';
import { db } from './db.js';

// The 'cinema' media tier was retired with film generation (July 2026). Legacy
// rows and chronicle files may still carry it; every data boundary funnels
// through this so neither IndexedDB nor an exported file keeps the old tier.
export const canonicalTier = (tier) => (tier === 'cinema' ? 'illuminated' : tier);

async function signerFor(campaignId) {
  const existing = await db.keys.get(campaignId);
  if (existing) return existing;
  try {
    const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
    let publicJwk = null;
    try { publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey); } catch { /* browser-specific */ }
    const record = { campaignId, algorithm: 'Ed25519', privateKey: pair.privateKey, publicKey: pair.publicKey, publicJwk, signed: true };
    await db.keys.put(record);
    return record;
  } catch {
    const record = { campaignId, algorithm: 'SHA-256', signed: false, publicJwk: null };
    await db.keys.put(record);
    return record;
  }
}

export async function makeEnvelope({ type, i, prevHash = null, payload, ts = Date.now(), signer = null }) {
  const unsigned = { type, i, prevHash, payload, ts };
  const recordHash = await sha256(canonicalize(unsigned));
  let signature = null;
  if (signer?.signed && signer.privateKey) {
    const sig = await crypto.subtle.sign({ name: 'Ed25519' }, signer.privateKey, new TextEncoder().encode(recordHash));
    signature = bytesToBase64(new Uint8Array(sig));
  }
  return { ...unsigned, recordHash, signature };
}

export async function appendEvent(campaignId, type, payload, opts = {}) {
  // The signer is resolved BEFORE the transaction: minting a key pair awaits
  // crypto.subtle, and awaiting crypto inside a live Dexie transaction commits
  // it early — the chain write then dies with PrematureCommitError. Key minting
  // is a get-then-put on its own; the chain's atomicity lives below.
  const signer = await signerFor(campaignId);
  return db.transaction('rw', db.campaigns, db.journal, async () => {
    const campaign = await db.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');
    // THE ONCE DOOR (§IV.5): some records may stand only once per spine.
    // The standing-record check lives INSIDE the chain's own transaction —
    // two hands sealing in parallel serialize here, the second meets the
    // first's record and takes no ink. Exactly-once by construction,
    // never by luck; the refused hand is answered with null, not a throw.
    if (opts.once) {
      const standing = await db.journal.where('campaignId').equals(campaignId).filter((row) => row.type === type).count();
      if (standing > 0) return null;
    }
    const i = campaign.turnCount || 0;
    // Dexie.waitFor keeps the transaction alive across the envelope's hashing
    // and signing — foreign promises with no IndexedDB work inside.
    const record = await Dexie.waitFor(makeEnvelope({ type, i, prevHash: campaign.headHash || null, payload, signer }));
    await db.journal.put({ campaignId, ...record });
    await db.campaigns.update(campaignId, { headHash: record.recordHash, turnCount: i + 1, signatureStatus: signer.signed ? 'signed' : 'hash-only', updatedAt: Date.now() });
    return record;
  });
}

export async function exportChronicle(campaignId) {
  const campaign = await db.campaigns.get(campaignId);
  const key = await db.keys.get(campaignId);
  const journal = await db.journal.where('campaignId').equals(campaignId).sortBy('i');
  const mediaRows = await db.media.where('campaignId').equals(campaignId).toArray();
  return {
    header: {
      format: 'mydungeon.chronicle', version: 1, campaignId, title: campaign.title,
      exportedAt: Date.now(), headHash: campaign.headHash || null, publicKeyJwk: key?.publicJwk || null,
      signatureStatus: campaign.signatureStatus || 'hash-only', forkOf: campaign.forkOf || null
    },
    // The journal is what the seal covers; campaign fields are presentation
    // state, so exports always canonicalize the retired tier.
    campaign: { ...campaign, mediaTier: canonicalTier(campaign.mediaTier), screen: 'table' },
    journal,
    media: await Promise.all(mediaRows.map(async (row) => ({
      ...row, blob: row.blob ? await blobToDataUrl(row.blob) : null
    })))
  };
}

export async function importChronicle(data) {
  if (data?.header?.format !== 'mydungeon.chronicle' || !Array.isArray(data.journal)) throw new Error('Invalid chronicle format');
  // THE DOOR VERIFIES BEFORE IT OPENS (fail-closed, the Vault's own law):
  // every record is re-hashed byte for byte against its seal and its link;
  // one flipped byte anywhere in the chain and the whole tale is refused.
  // Presentation state rides the campaign row, but truth lives here.
  const verdicts = await verifyJournal(data.journal);
  const broken = verdicts.find((verdict) => !verdict.ok);
  if (broken) throw new Error(`the seal is broken at record ${broken.i} — this chronicle has been altered`);
  const trueHead = data.journal.length ? data.journal[data.journal.length - 1].recordHash : null;
  if ((data.header.headHash || null) !== trueHead) throw new Error('the head seal does not match the journal — this chronicle has been altered');
  const id = crypto.randomUUID();
  const imported = {
    ...data.campaign, id, title: `${data.campaign.title} — restored`, readOnly: true,
    mediaTier: canonicalTier(data.campaign.mediaTier),
    forkOf: { campaignId: data.header.campaignId, headHash: data.header.headHash },
    headHash: data.header.headHash, turnCount: data.journal.length, signatureStatus: data.header.signatureStatus,
    createdAt: Date.now(), updatedAt: Date.now()
  };
  await db.transaction('rw', db.campaigns, db.journal, db.media, async () => {
    await db.campaigns.put(imported);
    for (const row of data.journal) await db.journal.put({ ...row, campaignId: id });
    for (const row of data.media || []) {
      const { blob, ...meta } = row;
      await db.media.put({ ...meta, campaignId: id, blob: blob ? dataUrlToBlob(blob) : null });
    }
  });
  return imported;
}

export async function forkChronicle(campaign) {
  const id = crypto.randomUUID();
  const fork = {
    ...structuredClone(campaign), id, title: `${campaign.title} — continuation`, readOnly: false,
    mediaTier: canonicalTier(campaign.mediaTier),
    forkOf: { campaignId: campaign.id, headHash: campaign.headHash }, headHash: null, turnCount: 0,
    createdAt: Date.now(), updatedAt: Date.now(), signatureStatus: 'pending'
  };
  await db.campaigns.put(fork);
  await appendEvent(id, 'fork', fork.forkOf);
  return await db.campaigns.get(id);
}

export async function verifyJournal(journal) {
  const results = [];
  let previous = null;
  for (const record of journal) {
    const hash = await sha256(canonicalize({ type: record.type, i: record.i, prevHash: record.prevHash, payload: record.payload, ts: record.ts }));
    const ok = hash === record.recordHash && record.prevHash === previous;
    results.push({ i: record.i, ok, expected: hash, actual: record.recordHash });
    previous = record.recordHash;
  }
  return results;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function dataUrlToBlob(url) {
  const [meta, base64] = url.split(',');
  const mime = meta.match(/data:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  return new Blob([Uint8Array.from(binary, (char) => char.charCodeAt(0))], { type: mime });
}
