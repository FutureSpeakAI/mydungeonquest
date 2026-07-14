import Dexie from 'dexie';

export const db = new Dexie('mydungeon-cinematic');
db.version(1).stores({
  campaigns: 'id, updatedAt, completed',
  journal: '[campaignId+i], campaignId, recordHash, type, ts',
  media: 'assetHash, cacheKey, campaignId, kind, originTurnHash, createdAt',
  keys: 'campaignId',
  memories: '++id, campaignId, turn, ts',
  settings: 'key'
});
// v2 — THE SEEN LEDGER: which painted plates and covers were actually shown
// at this table, per adventure (kind: 'plate' | 'card'). A device-local
// observation, outside the sealed chain and outside chronicle exports; the
// card ladder and downstream retellings consult it. See lib/reveals.js.
db.version(2).stores({
  reveals: '[campaignId+kind+assetHash], campaignId'
});

export async function listCampaigns() {
  return db.campaigns.orderBy('updatedAt').reverse().toArray();
}

// headHash / turnCount / signatureStatus form the seal ledger head and are
// owned EXCLUSIVELY by the seal wrapper (App.jsx). A campaign snapshot in React
// state lags the db whenever media attestations have advanced the head, so a
// blind put here would roll the head back and let the next seal reuse a journal
// index (PK [campaignId+i]) — corrupting the chain. We preserve those fields
// from the authoritative db row inside the same rw lock the seal transaction
// takes, so the two can never interleave.
const CHAIN_FIELDS = ['headHash', 'turnCount', 'signatureStatus'];

// THE PYRE REGISTRY — the burn law, sibling to the vault's fork law: once a
// spine is burned, every late writer still holding the old name (an in-flight
// paint landing, a debounced save) writes to ash, never back to the shelf.
// In-memory on purpose: it guards this sitting's stragglers; a fresh page
// has no stragglers to guard against.
const burnedSpines = new Set();
export const spineBurned = (id) => burnedSpines.has(id);
// A deliberate restore (drawn from the vault by the player's own hand) is
// the one voice that may recall a name from the ashes.
export const unburnSpine = (id) => { burnedSpines.delete(id); };
// The match is struck BEFORE the vault is asked to let go: from that moment
// no freshly-queued sync may push the spine back, while syncs already in the
// lane finish ahead of the vault's own burning. Refusal unstrikes it.
export const markPyre = (id) => { burnedSpines.add(id); };

export async function saveCampaign(campaign) {
  // A forked spine redirects late writers: a stale in-memory campaign can
  // never quietly recreate a spine the vault's fork law deleted.
  let id = campaign.id;
  try { const { redirectSpine } = await import('./vault.js'); id = redirectSpine(id); } catch { /* the vault is optional; the shelf is not */ }
  // A burned spine takes no ink — the write is dropped, not errored, so a
  // straggling media job settles quietly instead of resurrecting the book.
  if (burnedSpines.has(id)) return { ...campaign, id };
  const value = { ...campaign, id, updatedAt: Date.now() };
  await db.transaction('rw', db.campaigns, async () => {
    const existing = await db.campaigns.get(id);
    if (existing) for (const field of CHAIN_FIELDS) value[field] = existing[field];
    await db.campaigns.put(value);
  });
  // Every save nudges the vault (a debounced whisper — signed-out players
  // and keyless forks never even knock). Lazy import keeps this module
  // dependency-light for the node harness.
  import('./vault.js').then(({ nudgeVault }) => nudgeVault(campaign.id)).catch(() => {});
  return value;
}

export async function deleteCampaign(id) {
  await db.transaction('rw', db.campaigns, db.journal, db.media, db.memories, db.keys, db.reveals, async () => {
    await db.campaigns.delete(id);
    await db.journal.where('campaignId').equals(id).delete();
    await db.media.where('campaignId').equals(id).delete();
    await db.memories.where('campaignId').equals(id).delete();
    await db.keys.delete(id);
    // Ash keeps no pages — the seen ledger burns with the tale it observed.
    await db.reveals.where('campaignId').equals(id).delete();
  });
}

// BURN — the local rite: register the name in the pyre first (so no
// straggler writes during or after the wipe), then take every shelf at once.
export async function burnCampaign(id) {
  burnedSpines.add(id);
  await deleteCampaign(id);
}

export async function campaignJournal(campaignId) {
  return db.journal.where('campaignId').equals(campaignId).sortBy('i');
}
