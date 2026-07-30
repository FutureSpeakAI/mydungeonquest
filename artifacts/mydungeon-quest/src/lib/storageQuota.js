// THE STORAGE QUOTA GUARD (H7, Stage 4)
//
// Checks navigator.storage.estimate() on app startup and warns when the
// player's storage is near full. A near-full store risks failing the next
// DM turn's media write (the cellar sweep runs at act close, not proactively).
//
// Stage 145 adds PROACTIVE BLOB EVICTION: when estimated usage crosses
// EVICT_THRESHOLD (70%), the oldest evictable plate blobs are nulled —
// keeping their metadata rows intact (so assetHash, cacheKey, and vault
// references all survive) while freeing the raw pixel bytes. The UI already
// checks row.blob before creating object URLs, so a nulled blob falls
// gracefully to the cellar's own honest frame or the procedural stand-in.
//
// The guard is:
//  • best-effort (returns null on any error or in environments without the API)
//  • loud when quota pressure is detected (console.warn with structured record
//    — Rule 27; the "[quota]" tag is picked up by the long-march budget counter)
//  • fast for the common case (one Storage API call; DB reads only when needed)
//  • call-safe to invoke on every app startup and at every act close
//
// FUTURE: the result should surface in Settings & Care as a player-visible
// warning. H7 wires the check; the UI surface is H8 or a later phase.

const WARN_THRESHOLD = 0.85;   // warn when >85% of quota is used
const EVICT_THRESHOLD = 0.70;  // proactively evict blobs when >70% of quota is used

/**
 * Inner implementation — accepts any storage-like object so it can be
 * tested without relying on global navigator stubbing (not reliable in Node).
 * @param {{ estimate: () => Promise<{ quota: number, usage: number }> }} storage
 */
export async function _checkQuotaImpl(storage) {
  if (!storage?.estimate) return null;
  try {
    const { quota, usage } = await storage.estimate();
    if (typeof quota !== 'number' || typeof usage !== 'number') return null;
    if (quota === 0) return null; // sandboxed env with no quota
    const percentUsed = usage / quota;
    const usageMB = Math.round(usage / 1024 / 1024);
    const quotaMB = Math.round(quota / 1024 / 1024);
    const nearFull = percentUsed >= WARN_THRESHOLD;
    if (nearFull) {
      // Rule 27: a loud warning, not a silent drop.
      console.warn('[quota] storage near full', {
        percentUsed: Math.round(percentUsed * 100),
        usageMB,
        quotaMB,
        action: 'run the cellar sweep from Settings & Care, or burn a completed tale to free space',
      });
    }
    return { percentUsed, nearFull, usageMB, quotaMB };
  } catch {
    return null; // best-effort: a missing Storage API is not an app error
  }
}

/**
 * Queries navigator.storage.estimate() and warns loudly if near full.
 * Returns { percentUsed, nearFull, usageMB, quotaMB } or null on failure.
 */
export async function checkStorageQuota() {
  // typeof navigator check handles Node env; optional chaining handles older browsers.
  // eslint-disable-next-line no-undef
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  return _checkQuotaImpl(nav?.storage ?? null);
}

/** The near-full threshold (exported for gate use). */
export const QUOTA_WARN_THRESHOLD = WARN_THRESHOLD;

/** The proactive eviction threshold (exported for gate use). */
export const QUOTA_EVICT_THRESHOLD = EVICT_THRESHOLD;

/**
 * Inner implementation of proactive blob eviction — accepts any storage-like
 * object and a db-like object so it can be tested without a real browser or
 * IndexedDB. Separated from proactiveEvictIfNeeded for the same reason
 * _checkQuotaImpl is separated from checkStorageQuota.
 *
 * When usage >= EVICT_THRESHOLD (70%) the oldest evictable plate blobs are
 * removed (blob field nulled, row kept) across every local campaign. This
 * frees raw pixel bytes while leaving every metadata field intact so the
 * vault can still reference rows by their assetHash.
 *
 * A single "[quota]" console.warn fires whenever the threshold is crossed —
 * regardless of whether any blobs were actually freed — so the long-march
 * budget counter sees the pressure event.
 *
 * @param {{ estimate: () => Promise<{ quota: number, usage: number }> }} storage
 * @param {{ campaigns: any, media: any, journal: any }} dbi  Dexie-like db
 */
export async function _proactiveEvictImpl(storage, dbi) {
  if (!storage?.estimate || !dbi) return null;
  let estimate;
  try {
    estimate = await storage.estimate();
  } catch {
    return null; // best-effort
  }
  const { quota, usage } = estimate;
  if (typeof quota !== 'number' || typeof usage !== 'number' || quota === 0) return null;
  const percentUsed = usage / quota;
  if (percentUsed < EVICT_THRESHOLD) return null; // nothing to do

  const usageMB = Math.round(usage / 1024 / 1024);
  const quotaMB = Math.round(quota / 1024 / 1024);

  // Evict blobs from the oldest evictable plates across every local campaign.
  // We use horizon=1 (one act behind the standing act) so quota pressure
  // triggers a tighter sweep than the normal act-close sweep (horizon=2).
  const { sweepPlan, evictBlobsOnly } = await import('./cellar.js');
  let totalEvicted = 0;
  try {
    const campaigns = await dbi.campaigns.toArray();
    for (const campaign of campaigns) {
      try {
        const act = (campaign.codex?.spine?.beats?.[campaign.codex?.beatIndex]?.act) || 1;
        const [media, journal] = await Promise.all([
          dbi.media.where('campaignId').equals(campaign.id).toArray(),
          dbi.journal.where('campaignId').equals(campaign.id).toArray(),
        ]);
        const plan = sweepPlan({ media, journal, currentAct: act, horizon: 1 });
        if (plan.evicted.length) {
          const hashes = plan.evicted.map((r) => r.assetHash).filter(Boolean);
          totalEvicted += await evictBlobsOnly(dbi, hashes);
        }
      } catch { /* a campaign that cannot be swept is skipped — fail-open per tale */ }
    }
  } catch { /* a db that cannot be read is skipped — best-effort */ }

  // Rule 27: always log when the threshold is crossed so the long-march
  // "[quota]" counter captures the pressure event.
  console.warn('[quota] proactive eviction', {
    percentUsed: Math.round(percentUsed * 100),
    usageMB,
    quotaMB,
    blobsEvicted: totalEvicted,
    action: totalEvicted
      ? `${totalEvicted} old plate blob${totalEvicted === 1 ? '' : 's'} freed; painted scenes degrade to the cellar\u2019s honest frame`
      : 'no evictable blobs found; consider sweeping the cellar manually from Settings & Care',
  });
  return { percentUsed, usageMB, quotaMB, blobsEvicted: totalEvicted };
}

/**
 * Checks storage pressure and, if >= 70% of quota is used, evicts the oldest
 * evictable plate blobs across all local campaigns. Best-effort: any error
 * returns null silently. Safe to call on every startup and at every act close.
 */
export async function proactiveEvictIfNeeded() {
  // eslint-disable-next-line no-undef
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  if (!nav?.storage) return null;
  try {
    const { db } = await import('./db.js');
    return _proactiveEvictImpl(nav.storage, db);
  } catch {
    return null;
  }
}
