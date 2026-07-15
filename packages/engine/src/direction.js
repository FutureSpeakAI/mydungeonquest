// ------------------------------------------------------------
// THE CHOIR'S SECOND HALF — per-line direction (Tenor Law, completed;
// Directive V, Choir Law's deterministic floor).
//
// The Tenor Law cast a voice from stated identity. This module directs
// the line: a short performance tag derived deterministically from the
// record — the speaker's status and bond, the world's blight, the roll
// just resolved. The tag rides the speak call as an ADDITIVE field;
// providers with prosody honor it, providers without it ignore it, and
// keyless silence stays silence. The dead take no direction: they are
// refused upstream by the cast snapshot, and refused again here.
// Same state, same line, same direction — every time.
// ------------------------------------------------------------

export function directionFor({ soul = null, blight = 0, resolution = null, isNarrator = false } = {}) {
  if (soul && soul.status === 'dead') return null; // the dead do not speak, and are not directed
  const tags = [];
  if (resolution) {
    if (resolution.success && (resolution.crit || resolution.nat20)) tags.push('triumphant, bright');
    else if (resolution.success) tags.push('steady, lifted');
    else if (resolution.crit || resolution.nat1) tags.push('shaken');
    else tags.push('strained');
  }
  if ((blight ?? 0) >= 4) tags.push('hushed, wary');
  if (soul) {
    if (soul.role === 'villain') tags.push('cold, measured');
    else if ((soul.bond ?? 0) >= 3) tags.push('warm, close');
    else if ((soul.status || 'active') === 'missing') tags.push('distant, echoing');
  }
  if (isNarrator && !tags.length) tags.push('measured, unhurried');
  if (!tags.length) tags.push('measured');
  return tags.slice(0, 2).join('; ');
}

// The speak payload, directed. Additive to { text, voiceId } — the door's
// shape grows, it never changes.
export function directedSpeech({ text, voiceId, soul = null, blight = 0, resolution = null, isNarrator = false } = {}) {
  const direction = directionFor({ soul, blight, resolution, isNarrator });
  return direction ? { text, voiceId, direction } : { text, voiceId };
}
