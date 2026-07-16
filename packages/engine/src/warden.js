// ------------------------------------------------------------
// THE WARDEN — the Likeness Law, second half (Directive VI).
//
// The Sitting accepts a face; the Warden keeps it. Every soul render
// after the blessing is shown to a vision model beside the blessed
// anchor and judged: same person, or not. The judge is probabilistic;
// EVERYTHING AROUND THE JUDGE IS LAW. The brief carries the locked
// bearing verbatim and demands one JSON verdict. The parser is
// tolerant of fences and chatter and honest about gibberish. And the
// ruling is deterministic: a passing likeness ships with its verdict
// attested; a drifted likeness is repainted ONCE with the drift notes
// appended to the prompt; a second failure falls back to the anchor
// itself — THE HOUSE NEVER SHIPS A STRANGER. A missing signature is
// repainted once and then tolerated with the lack attested; identity
// is the hard law, the locket is the soft one.
//
// The Floor is honest about blindness: the keyless warden judges
// nothing, says so, and attests every pass as unjudged. Parchment owes
// no warden at all — procedural woodcuts have no anchor to betray.
// ------------------------------------------------------------

export const WARDEN_THRESHOLD = 0.65; // below this confidence, "same" is not same enough

const clean = (value, cap = 80) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, cap);

// The brief the vision judge receives, beside two images: the blessed
// anchor first, the new render second. Identity travels verbatim.
export function wardenBrief({ kind = 'soul', bearingText = '' } = {}) {
  const subject = kind === 'soul' ? 'person — exact facial features, age band, and build' : 'place — exact geography, structures, and landmarks';
  return [
    'You are the Warden. IMAGE 1 is the blessed anchor. IMAGE 2 is a new render.',
    `Judge whether they show the same ${subject}.`,
    `The locked identity, verbatim: ${String(bearingText || '').trim()}`,
    'Answer with ONLY this JSON, nothing else:',
    '{"same": true|false, "confidence": 0.0-1.0, "signature_present": true|false, "drift": ["short notes on what differs, if anything"]}'
  ].join(' ');
}

// A tolerant reader for an intolerant world: fenced, chattered-around,
// or clean JSON all parse; anything else is gibberish, said plainly.
export function parseVerdict(text = '') {
  const body = String(text);
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return { same: false, confidence: 0, signature_present: false, drift: ['the warden spoke gibberish'], malformed: true };
  try {
    const raw = JSON.parse(body.slice(start, end + 1));
    const confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0));
    const drift = Array.isArray(raw.drift) ? raw.drift.slice(0, 5).map((note) => clean(note)) : [];
    return { same: raw.same === true, confidence, signature_present: raw.signature_present !== false, drift, malformed: false };
  } catch {
    return { same: false, confidence: 0, signature_present: false, drift: ['the warden spoke gibberish'], malformed: true };
  }
}

// The keyless warden: it cannot see, and it says so. Floor verdicts
// pass unjudged and are attested as such — never mistaken for sight.
export function mockWarden() {
  return { same: true, confidence: 0, signature_present: true, drift: [], malformed: false, floor: true };
}

// The ruling — deterministic in (verdict, attempt). Actions:
//   'pass'    → ship the render, verdict attested
//   'repaint' → render again, notes appended to the prompt (once)
//   'anchor'  → fall back to the blessed anchor; a stranger never ships
export function wardenRuling(verdict, { attempt = 1 } = {}) {
  if (verdict.floor) {
    return { action: 'pass', notes: [], attest: { warden: 'floor', note: 'unjudged — the floor has no eyes' } };
  }
  if (verdict.malformed) {
    return attempt < 2
      ? { action: 'repaint', notes: ['the warden could not read the likeness — render again, plainly'], attest: null }
      : { action: 'anchor', notes: [], attest: { warden: 'fallback', reason: 'unreadable verdicts — the anchor stands in' } };
  }
  const seen = verdict.same === true && verdict.confidence >= WARDEN_THRESHOLD;
  if (!seen) {
    const driftNotes = (verdict.drift.length ? verdict.drift : ['the likeness drifted']).map((note) => `The likeness drifted: ${note}. Hold the blessed anchor exactly.`).slice(0, 3);
    return attempt < 2
      ? { action: 'repaint', notes: driftNotes, attest: null }
      : { action: 'anchor', notes: [], attest: { warden: 'fallback', reason: 'the likeness would not hold', drift: verdict.drift } };
  }
  if (!verdict.signature_present) {
    return attempt < 2
      ? { action: 'repaint', notes: ['same soul, but the signature is missing — paint it visible'], attest: null }
      : { action: 'pass', notes: [], attest: { warden: 'passed', confidence: verdict.confidence, signature: false } };
  }
  return { action: 'pass', notes: [], attest: { warden: 'passed', confidence: verdict.confidence, signature: true } };
}
