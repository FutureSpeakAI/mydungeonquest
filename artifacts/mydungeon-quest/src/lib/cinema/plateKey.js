// H3 — stable scene-plate cache key, shared between mint and lookup.
//
// Rule 21 (campaign isolation): every plate key is campaign-scoped.
//
// The P16 trap: the old key used `turnRecord.recordHash || logId`.
// recordHash is absent at mint time (the seal races the job brief) so
// the key became `scene:${campaign.id}:${logId}` at mint.
// After seal, recordHash exists, so the same expression produced
// `scene:${campaign.id}:${recordHash}` at lookup — a different key,
// causing a cache miss and re-mint on every lookup.
//
// logId is a stable UUID set when the log entry is created and never
// changed. Using it unconditionally makes mint key === lookup key.
// A conditional on recordHash is removed rather than left as a trap.

/**
 * Stable, campaign-scoped cache key for a scene plate.
 * Produces the same key at job-brief (mint) time and at any later lookup.
 *
 * @param {string} campaignId - The campaign's UUID
 * @param {string} logId - The log entry's stable UUID
 * @returns {string} e.g. "scene:abc:def"
 */
export const scenePlateKey = (campaignId, logId) => `scene:${campaignId}:${logId}`;
