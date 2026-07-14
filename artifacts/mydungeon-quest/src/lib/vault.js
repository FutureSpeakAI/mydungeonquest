// THE VAULT, from the device's side — quiet, incremental, custody-first.
//
// The device is the root of trust: signing keys never leave it; the vault
// gets records, meta, and content-addressed blobs, nothing more. Sync is
// incremental by journal index and serialized per campaign. Divergence is
// never merged: the local telling forks into its own spine (a new id, the
// same intact chain) and both spines live on. Signed-out players are never
// synced — the vault opens to named patrons only, and a keyless fork never
// even knocks.
import { db, campaignJournal } from './db.js';
import { canonicalTier } from './seal.js';

// ------------------------------------------------------------ quiet status
// One mark per campaign: 'local' (not vaulted / signed out), 'syncing',
// 'vaulted', 'diverged-forked', 'error'. Subscribers get the whole map.
const marks = new Map();
const listeners = new Set();
export function subscribeVault(listener) { listeners.add(listener); listener(new Map(marks)); return () => listeners.delete(listener); }
function mark(campaignId, state, detail = null) {
  marks.set(campaignId, { state, detail, at: Date.now() });
  for (const listener of listeners) listener(new Map(marks));
}

// ------------------------------------------------------------- the patron
let patronPromise = null;
export function vaultPatron(force = false) {
  if (!patronPromise || force) {
    patronPromise = fetch('/api/whoami')
      .then((r) => (r.ok ? r.json() : { patron: null }))
      .then((body) => body?.patron || null)
      .catch(() => null);
  }
  return patronPromise;
}
let statusPromise = null;
export function vaultStatus(force = false) {
  if (!statusPromise || force) {
    statusPromise = fetch('/api/vault/status')
      .then((r) => (r.ok ? r.json() : { live: false, media: false }))
      .catch(() => ({ live: false, media: false }));
  }
  return statusPromise;
}

async function vaultReady() {
  const [patron, status] = await Promise.all([vaultPatron(), vaultStatus()]);
  return Boolean(patron && status?.live) ? status : null;
}

// The door tells the vault who is standing at the table. Sign-in and
// sign-out drop every cached answer — a session that arrived as a guest
// must become a syncing patron WITHOUT a page reload, and a departed
// patron's spines fall quietly back to local custody.
let knownPatronId; // undefined = the door has not spoken yet
const sessionListeners = new Set();
export function onVaultSession(listener) { sessionListeners.add(listener); return () => sessionListeners.delete(listener); }
export function vaultSessionChanged(patronId = null) {
  if (knownPatronId === patronId) return Promise.resolve();
  const firstWord = knownPatronId === undefined;
  knownPatronId = patronId;
  patronPromise = null;
  statusPromise = null;
  if (firstWord && patronId === null) return Promise.resolve(); // the door's first word matches the default; nothing to redo
  let settled;
  if (patronId) {
    settled = syncShelf().catch(() => {});
  } else {
    for (const id of [...marks.keys()]) mark(id, 'local');
    settled = Promise.resolve();
  }
  return settled.then(() => { for (const listener of sessionListeners) { try { listener(patronId); } catch { /* a deaf listener is its own problem */ } } });
}

// ------------------------------------------------- pure laws (eval-judged)
// Strikes re-derive from the journal — the redaction law's belt AND braces:
// a strike pulled from another device falls the same logs here, by the same
// turn-record k ↔ logs[k] alignment every consumer uses.
export function applyStrikes(logs, journal) {
  const struckHashes = new Set((journal || []).filter((r) => r.type === 'redaction').map((r) => r.payload?.targetRecordHash).filter(Boolean));
  const turnRecords = (journal || []).filter((r) => r.type === 'turn');
  const struckOrdinals = new Set(turnRecords.map((r, k) => (struckHashes.has(r.recordHash) ? k : -1)).filter((k) => k >= 0));
  return (logs || []).map((log, k) => (struckOrdinals.has(k) && !log.redacted ? { ...log, redacted: true } : log));
}

// Given local and vault heads, what is owed? Pure, so the bench can judge
// every stance without a network.
export function planSync(local, server, localRecords) {
  if (!server || server.turnCount === 0) return { op: 'push', from: 0 };
  if (local.turnCount === server.turnCount) {
    // Equal length, one head: presentation only. Equal length, two heads:
    // two tellings — never a pull, never a merge.
    return (local.headHash || null) === (server.headHash || null) ? { op: 'meta' } : { op: 'fork' };
  }
  if (local.turnCount > server.turnCount) {
    const at = localRecords[server.turnCount - 1];
    if (server.turnCount === 0 || (at && at.recordHash === server.headHash)) return { op: 'push', from: server.turnCount };
    return { op: 'fork' };
  }
  // Server ahead: lawful only if our head sits inside its chain — the vault
  // hands us the tail and its first link must clasp our head.
  return { op: 'pull', from: local.turnCount };
}

// ----------------------------------------------------------- media travel
const b64ToBlob = (data, mime) => {
  const binary = atob(data);
  return new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], { type: mime || 'application/octet-stream' });
};

async function pushMedia(campaignId) {
  const rows = (await db.media.where('campaignId').equals(campaignId).toArray()).filter((row) => row.blob && row.assetHash);
  if (!rows.length) return;
  const status = await vaultStatus();
  if (!status?.media) return; // journal sync stands; media stays on the device, honestly
  const hashes = [...new Set(rows.map((row) => row.assetHash))];
  const asked = await fetch('/api/vault/media-missing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashes }) });
  if (!asked.ok) return;
  const { missing = [] } = await asked.json();
  const want = new Set(missing);
  for (const row of rows) {
    if (!want.has(row.assetHash)) continue;
    want.delete(row.assetHash); // dedupe within the batch too
    try {
      await fetch(`/api/vault/media/${row.assetHash}`, { method: 'POST', headers: { 'Content-Type': row.mime || row.blob.type || 'application/octet-stream' }, body: row.blob });
    } catch { /* a dropped parcel re-offers next sync */ }
  }
}

async function pullMedia(campaignId, mediaIndex) {
  const status = await vaultStatus();
  if (!status?.media || !Array.isArray(mediaIndex)) return;
  for (const meta of mediaIndex) {
    if (!meta?.assetHash) continue;
    const existing = await db.media.where('assetHash').equals(meta.assetHash).first();
    if (existing?.blob) {
      // Deduplicated re-hydration: same bytes, this chronicle's own row.
      const mine = await db.media.where('campaignId').equals(campaignId).and((r) => r.assetHash === meta.assetHash && r.cacheKey === meta.cacheKey).first();
      if (!mine) await db.media.put({ ...meta, campaignId, blob: existing.blob, createdAt: meta.createdAt || Date.now() });
      continue;
    }
    try {
      const response = await fetch(`/api/vault/media/${meta.assetHash}`);
      if (!response.ok) continue;
      const blob = await response.blob();
      await db.media.put({ ...meta, campaignId, blob, createdAt: meta.createdAt || Date.now() });
    } catch { /* the plate re-offers next sync */ }
  }
}

// The media index rides in campaign meta — rows without their blobs, so a
// restoring device knows what to re-hydrate and by which hash.
async function mediaIndexFor(campaignId) {
  const rows = await db.media.where('campaignId').equals(campaignId).toArray();
  return rows.filter((row) => row.assetHash).map(({ blob: _blob, campaignId: _c, ...meta }) => meta);
}

// Presentation meta only — the chain fields belong to the verified chain,
// and volatile object URLs never travel.
function scrubMeta(campaign, mediaIndex) {
  const { headHash: _h, turnCount: _t, ...meta } = structuredClone(campaign);
  meta.mediaTier = canonicalTier(meta.mediaTier);
  meta.screen = 'table';
  meta.logs = (meta.logs || []).map(({ imageUrl: _i, videoPosterUrl: _v, videoUrl: _u, ...log }) => log);
  meta.mediaIndex = mediaIndex;
  return meta;
}

// --------------------------------------------------------------- the sync
const chains = new Map(); // per-campaign serialization
function serialized(campaignId, work) {
  const prev = chains.get(campaignId) || Promise.resolve();
  const run = prev.then(work, work);
  chains.set(campaignId, run.then(() => {}, () => {}));
  return run;
}

export function syncCampaign(campaignId) {
  return serialized(campaignId, async () => {
    if (!(await vaultReady())) { mark(campaignId, 'local'); return; }
    const campaign = await db.campaigns.get(campaignId);
    if (!campaign) return;
    mark(campaignId, 'syncing');
    try {
      const local = { headHash: campaign.headHash || null, turnCount: campaign.turnCount || 0 };
      const head = await fetch(`/api/vault/campaign/${encodeURIComponent(campaignId)}`);
      const server = head.status === 404 ? null : head.ok ? await head.json() : (() => { throw new Error(`vault ${head.status}`); })();
      const records = await campaignJournal(campaignId);
      const plan = planSync(local, server, records);

      if (plan.op === 'fork') { await forkDivergedSpine(campaignId); return; }
      if (plan.op === 'pull') {
        // The tail must clasp our head — a tail that doesn't is divergence
        // wearing a longer coat, and divergence always forks.
        if ((await pullIntoLocal(campaignId, local, server)) === 'diverged') { await forkDivergedSpine(campaignId); return; }
        mark(campaignId, 'vaulted'); return;
      }

      const key = await db.keys.get(campaignId);
      const mediaIndex = await mediaIndexFor(campaignId);
      const body = {
        campaignId,
        records: plan.op === 'push' ? records.slice(plan.from).map(({ campaignId: _c, ...record }) => record) : [],
        headHash: local.headHash,
        meta: scrubMeta(campaign, mediaIndex),
        publicKeyJwk: key?.publicJwk || null,
        signatureStatus: campaign.signatureStatus || null,
      };
      const pushed = await fetch('/api/vault/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (pushed.status === 409) { await forkDivergedSpine(campaignId); return; }
      if (!pushed.ok) throw new Error(`vault push ${pushed.status}`);
      await pushMedia(campaignId);
      mark(campaignId, 'vaulted');
    } catch (error) {
      console.error(`[vault] ${campaignId}: ${error.message}`);
      mark(campaignId, 'error', error.message);
    }
  });
}

// Server ahead of us: take the tail, clasp it to our head, and let the
// journal be the law — strikes pulled here fall the same logs they felled
// on the device that struck them.
async function pullIntoLocal(campaignId, local, server) {
  const response = await fetch(`/api/vault/campaign/${encodeURIComponent(campaignId)}/journal?from=${local.turnCount}`);
  if (!response.ok) throw new Error(`vault pull ${response.status}`);
  const { records = [] } = await response.json();
  if (!records.length) return 'diverged'; // the vault claims more turns it cannot produce
  if ((records[0].prevHash || null) !== local.headHash) return 'diverged';
  const meta = server.meta || {};
  const full = [...(await campaignJournal(campaignId)), ...records];
  const logs = applyStrikes(meta.logs || [], full);
  await db.transaction('rw', db.campaigns, db.journal, async () => {
    for (const record of records) await db.journal.put({ campaignId, ...record });
    const existing = await db.campaigns.get(campaignId);
    await db.campaigns.put({
      ...existing, ...structuredClone({ ...meta, mediaIndex: undefined }), id: campaignId, logs,
      mediaTier: canonicalTier(meta.mediaTier || existing.mediaTier),
      headHash: server.headHash, turnCount: server.turnCount,
      signatureStatus: server.signatureStatus || existing.signatureStatus, updatedAt: Date.now(),
    });
  });
  await pullMedia(campaignId, meta.mediaIndex || []);
  return 'pulled';
}

// The fork registry: once a spine forks, every late writer holding the old
// name is redirected to the new one — a deleted spine can never be quietly
// recreated by a stale in-memory campaign object.
const forkedTo = new Map();
export function redirectSpine(campaignId) {
  let id = campaignId;
  while (forkedTo.has(id)) id = forkedTo.get(id);
  return id;
}
const forkListeners = new Set();
export function onSpineForked(listener) { forkListeners.add(listener); return () => forkListeners.delete(listener); }

// Two devices told two different futures. Neither is merged, neither is
// lost: this device's telling becomes its own spine — same intact chain,
// new name — and is vaulted as itself. The vault's telling stays restorable.
export async function forkDivergedSpine(campaignId) {
  const newId = crypto.randomUUID();
  await db.transaction('rw', db.campaigns, db.journal, db.media, db.memories, db.keys, async () => {
    const campaign = await db.campaigns.get(campaignId);
    if (!campaign) return;
    await db.campaigns.put({ ...campaign, id: newId, title: `${campaign.title} — this device's telling`, divergedFrom: campaignId, updatedAt: Date.now() });
    const journal = await db.journal.where('campaignId').equals(campaignId).toArray();
    for (const row of journal) await db.journal.put({ ...row, campaignId: newId });
    const media = await db.media.where('campaignId').equals(campaignId).toArray();
    for (const row of media) await db.media.put({ ...row, campaignId: newId });
    const memories = await db.memories.where('campaignId').equals(campaignId).toArray();
    for (const row of memories) { const { id: _id, ...rest } = row; await db.memories.put({ ...rest, campaignId: newId }); }
    const key = await db.keys.get(campaignId);
    if (key) await db.keys.put({ ...key, campaignId: newId });
    await db.campaigns.delete(campaignId);
    await db.journal.where('campaignId').equals(campaignId).delete();
    await db.media.where('campaignId').equals(campaignId).delete();
    await db.memories.where('campaignId').equals(campaignId).delete();
    await db.keys.delete(campaignId);
  });
  forkedTo.set(campaignId, newId);
  mark(campaignId, 'diverged-forked', newId);
  mark(newId, 'diverged-forked', campaignId);
  for (const listener of forkListeners) { try { listener({ from: campaignId, to: newId }); } catch { /* a deaf listener is its own problem */ } }
  await syncCampaign(newId);
  return newId;
}

// ------------------------------------------------------------ the restore
export async function listVaultShelf() {
  if (!(await vaultReady())) return [];
  try {
    const response = await fetch('/api/vault/shelf');
    if (!response.ok) return [];
    const { shelf = [] } = await response.json();
    return shelf;
  } catch { return []; }
}

// Sign in on a new device, draw a spine from the vault. Keys never travel:
// the restored chronicle keeps the ORIGINAL wax (its public key verifies
// every old signature) and continues under the hash chain — the standalone
// verifier reads it exactly as a native one.
export async function restoreFromVault(campaignId) {
  const head = await fetch(`/api/vault/campaign/${encodeURIComponent(campaignId)}`);
  if (!head.ok) throw new Error('That spine is not in the vault.');
  const server = await head.json();
  const response = await fetch(`/api/vault/campaign/${encodeURIComponent(campaignId)}/journal?from=0`);
  if (!response.ok) throw new Error('The vault could not hand over the journal.');
  const { records = [] } = await response.json();
  const meta = server.meta || {};
  const logs = applyStrikes(meta.logs || [], records);
  const campaign = {
    ...structuredClone({ ...meta, mediaIndex: undefined }), id: campaignId, logs,
    mediaTier: canonicalTier(meta.mediaTier), readOnly: false,
    headHash: server.headHash, turnCount: server.turnCount,
    signatureStatus: server.signatureStatus || 'hash-only', updatedAt: Date.now(),
  };
  await db.transaction('rw', db.campaigns, db.journal, db.keys, async () => {
    await db.campaigns.put(campaign);
    for (const record of records) await db.journal.put({ campaignId, ...record });
    // The original device keeps the pen; this one keeps the book. New turns
    // seal hash-only; the old wax still answers for every signed record.
    if (!(await db.keys.get(campaignId))) {
      await db.keys.put({ campaignId, algorithm: 'SHA-256', signed: false, publicJwk: server.publicKeyJwk || null, restoredFromVault: true });
    }
  });
  await pullMedia(campaignId, meta.mediaIndex || []);
  mark(campaignId, 'vaulted');
  return db.campaigns.get(campaignId);
}

// ------------------------------------------------------------- the nudges
const timers = new Map();
export function nudgeVault(campaignId) {
  if (typeof fetch !== 'function' || typeof window === 'undefined') return;
  clearTimeout(timers.get(campaignId));
  timers.set(campaignId, setTimeout(() => { timers.delete(campaignId); syncCampaign(campaignId).catch(() => {}); }, 2500));
}

export async function syncShelf() {
  if (!(await vaultReady())) return;
  const campaigns = await db.campaigns.toArray();
  for (const campaign of campaigns) await syncCampaign(campaign.id);
}
