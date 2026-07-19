import Dexie from 'dexie';
// THE DESK (Task 60 §2): the seal's pure half — the pen and the eye —
// lives at the engine's desk seat now; this door re-speaks it and keeps
// only the database half (key custody, transactions, import, fork).
import { makeEnvelope, verifyJournal, verifyChronicle } from 'fatescript/desk';
import { db } from './db.js';

export { makeEnvelope, verifyJournal, verifyChronicle };

// The 'cinema' media tier was retired with film generation (July 2026). The
// funnel law moved home with the parity cut — the engine's canonical seat
// owns it now; this door stays open for the table's own callers.
import { canonicalTier } from 'fatescript/canonical';
export { canonicalTier };

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
  // THE DOOR VERIFIES BEFORE IT OPENS (fail-closed, the Vault's own law) —
  // and it verifies at the engine's desk, one seat: chain law, head seal,
  // the signature court, and the downgrade door. The architect's sitting
  // caught the laundering path this door alone once allowed: tamper,
  // re-hash the chain, re-crown the head, then claim the tale was never
  // signed. The desk refuses the claim while the envelope carries the
  // evidence — a public key in the header or ink on any record.
  const verdict = await verifyChronicle(data);
  if (!verdict.ok) throw new Error(verdict.reason);
  const id = crypto.randomUUID();
  const imported = {
    ...data.campaign, id, title: `${data.campaign.title} — restored`, readOnly: true,
    mediaTier: canonicalTier(data.campaign.mediaTier),
    forkOf: { campaignId: data.header.campaignId, headHash: data.header.headHash },
    headHash: data.header.headHash, turnCount: data.journal.length, signatureStatus: data.header.signatureStatus,
    createdAt: Date.now(), updatedAt: Date.now()
  };
  await db.transaction('rw', db.campaigns, db.journal, db.media, db.keys, async () => {
    await db.campaigns.put(imported);
    // The restored spine keeps its provenance: the PUBLIC key rides forward
    // (never the pen), so a later re-export still carries the seal's
    // evidence and verifies whole at any desk. Continuations stay hash-only
    // by the Vault's own law — signed:false means this seat can never sign.
    await db.keys.put({ campaignId: id, algorithm: data.header.publicKeyJwk ? 'Ed25519' : 'SHA-256', signed: false, publicJwk: data.header.publicKeyJwk || null });
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
