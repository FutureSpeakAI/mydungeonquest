import { db } from './db.js';

// THE SEEN LEDGER — a quiet, device-local record of which painted assets were
// actually SHOWN to the player (plates in the transcript, covers on chapter
// cards), per adventure. It sits outside the sealed chain and outside
// chronicle exports on purpose: it is an observation of this table, not canon.
// Downstream retellings restrict themselves to it; the card ladder consults it
// so no image is ever presented twice as a new reveal. Never load-bearing:
// every reader tolerates an empty or unavailable ledger.

export async function markRevealed(campaignId, kind, assetHash, context = {}) {
  if (!campaignId || !kind || !assetHash) return;
  try {
    // add(), not put(): the FIRST showing's timestamp is the record — a
    // re-show of the same asset is not a new reveal and must not rewrite
    // when it was truly first seen.
    await db.reveals.add({ campaignId, kind, assetHash, context, ts: Date.now() });
  } catch { /* already recorded, or the ledger is unavailable — never throws */ }
}

// The set of asset hashes already revealed for a campaign, optionally
// narrowed to one kind ('plate' | 'card').
export async function revealSet(campaignId, kind = null) {
  try {
    const rows = await db.reveals.where('campaignId').equals(campaignId).toArray();
    return new Set(rows.filter((row) => !kind || row.kind === kind).map((row) => row.assetHash));
  } catch { return new Set(); }
}

// Every reveal for a campaign in the order the player actually saw them —
// the raw material for retellings that promise "as actually seen".
export async function listReveals(campaignId) {
  try { return await db.reveals.where('campaignId').equals(campaignId).sortBy('ts'); }
  catch { return []; }
}
