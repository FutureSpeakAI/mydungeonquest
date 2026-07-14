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
export async function saveCampaign(campaign) {
  // A forked spine redirects late writers: a stale in-memory campaign can
  // never quietly recreate a spine the vault's fork law deleted.
  let id = campaign.id;
  try { const { redirectSpine } = await import('./vault.js'); id = redirectSpine(id); } catch { /* the vault is optional; the shelf is not */ }
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
  await db.transaction('rw', db.campaigns, db.journal, db.media, db.memories, db.keys, async () => {
    await db.campaigns.delete(id);
    await db.journal.where('campaignId').equals(id).delete();
    await db.media.where('campaignId').equals(id).delete();
    await db.memories.where('campaignId').equals(id).delete();
    await db.keys.delete(id);
  });
}

export async function campaignJournal(campaignId) {
  return db.journal.where('campaignId').equals(campaignId).sortBy('i');
}
