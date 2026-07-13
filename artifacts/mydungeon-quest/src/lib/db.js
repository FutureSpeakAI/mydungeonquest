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

export async function saveCampaign(campaign) {
  const value = { ...campaign, updatedAt: Date.now() };
  await db.campaigns.put(value);
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
