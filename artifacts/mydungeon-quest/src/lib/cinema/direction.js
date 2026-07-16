// ------------------------------------------------------------
// PER-LINE VOICE DIRECTION at the table — the Tenor Law's second
// half, begun (Directive V, Choir Law's deterministic floor).
//
// The engine owns the table (fatescript/direction): a short delivery
// tag derived from the record — the speaker's status and bond, the
// world's blight, the roll just resolved. This seat only CARRIES it:
// the speak body grows additively to { text, voiceId, direction },
// providers with prosody honor it, providers without ignore it, the
// dead take no direction, and keyless silence stays silence. A
// directed take caches under its own key, so a 'shaken' line never
// replays a 'warm' one. Pure — no Dexie, no fetch, no element.
// ------------------------------------------------------------
import { directionFor, directedSpeech } from 'fatescript/direction';

export { directionFor };

// The speak body for one segment, directed from the record at hand.
export function directedBody(segment, campaign, log) {
  return directedSpeech({
    text: segment?.text,
    voiceId: segment?.voiceId,
    soul: segment?.soul || null,
    blight: campaign?.codex?.blight ?? 0,
    resolution: log?.resolution || null,
    isNarrator: !!segment?.isNarrator
  });
}

// The cache key, directed: an undirected body keeps the standing key
// byte-for-byte (nothing already cached is orphaned); a directed take
// earns its own shelf.
export function directedKey(baseKey, body) {
  return body?.direction ? `${baseKey}:${body.direction}` : baseKey;
}
