// ------------------------------------------------------------
// E3 — SWEEP UNSCOPED MEDIA (Rule 21, campaign isolation).
//
// Before E3 fixed all Foundry jobs to carry explicit campaign-scoped
// cacheKeys, heroBustJob and regionPrompt jobs fell back to spec.hash
// (a bare 64-character hex string with no campaign prefix). Those rows
// live in the DB as orphans after the fix — no new job will request
// them — but they must be evicted so the E3 boundary assertion can be
// relied upon absolutely: an orphan matched by coincidence would throw
// a false positive, or (if somehow matched) serve a foreign visual.
//
// sweepUnscopedMedia() is idempotent and safe to call on every app
// start. It removes only rows whose cacheKey is a bare sha256 hex
// (64 lowercase hex chars, no colons or known prefixes) — the exact
// shape of the pre-E3 spec.hash fallback keys. All legitimate post-E3
// keys carry a structured prefix (bust:, portrait:, region:, keyart:,
// beat:, narration:, scene:, sheet:, fixture:, sfx:) and are never
// touched.
// ------------------------------------------------------------
import { db } from '../db.js';

// Pattern for a bare SHA-256 hex string — exactly 64 lowercase hex chars.
const BARE_SHA256 = /^[0-9a-f]{64}$/;

/**
 * Evicts legacy unscoped cache entries from the media store.
 * Returns the count of rows removed.
 */
export async function sweepUnscopedMedia() {
  const all = await db.media.toArray();
  const stale = all.filter((row) => BARE_SHA256.test(row.cacheKey));
  if (!stale.length) return 0;
  await db.media.bulkDelete(stale.map((row) => row.assetHash));
  return stale.length;
}
