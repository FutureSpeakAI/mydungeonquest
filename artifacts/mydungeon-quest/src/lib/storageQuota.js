// THE STORAGE QUOTA GUARD (H7, Stage 4)
//
// Checks navigator.storage.estimate() on app startup and warns when the
// player's storage is near full. A near-full store risks failing the next
// DM turn's media write (the cellar sweep runs at act close, not proactively).
//
// The guard is:
//  • best-effort (returns null on any error or in environments without the API)
//  • loud when near-full (console.warn with structured record — Rule 27)
//  • fast (one API call, no DB reads)
//  • call-safe to invoke on every app startup (idempotent read)
//
// FUTURE: the result should surface in Settings & Care as a player-visible
// warning. H7 wires the check; the UI surface is H8 or a later phase.

const WARN_THRESHOLD = 0.85; // warn when >85% of quota is used

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
