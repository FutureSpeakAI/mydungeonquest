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

import { UNLETTERED_REINFORCEMENT, UNLETTERED_REFUSAL } from './unlettered.js';

// Below this confidence, "same" is not same enough. Raised from 0.65 after
// a feature-repaint traded the face for the mark and slid through at the
// old bar: the warden's eye must be at least as strict as the house's own
// proving judge, or a lenient warden launders what a strict gate refuses.
export const WARDEN_THRESHOLD = 0.75;

const clean = (value, cap = 80) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, cap);

// The brief the vision judge receives, beside two images: the blessed
// anchor first, the new render second. Identity travels verbatim.
// (TASK 54B §3) For SOULS the distinguishing feature is no longer asked
// at full-scene distance: THE MAGNIFIED LOOK owns it — stage one boxes
// the head and shoulders, stage two asks the mark question on a sharp
// crop alone (see magnifier.js; the proving court holds the identical
// instrument). Places keep the single-look landmark clause: geography
// has no head and shoulders to box.
export function wardenBrief({ kind = 'soul', bearingText = '' } = {}) {
  const subject = kind === 'soul' ? 'person — exact facial features, age band, and build' : 'place — exact geography, structures, and landmarks';
  const lines = [
    'You are the Warden. IMAGE 1 is the blessed anchor. IMAGE 2 is a new render.',
    `Judge whether they show the same ${subject}.`,
    `The locked identity, verbatim: ${String(bearingText || '').trim()}`,
  ];
  if (kind !== 'soul') {
    lines.push('"signature_present" means: the specific distinguishing feature named in the locked identity (a mark, scar, device, or landmark) is CLEARLY visible in IMAGE 2 at this render\u2019s distance — unmistakable, not merely hinted. If you are not certain it is visible, answer false. It does NOT mean an artist\u2019s signature, lettering, or any text — painted text is a defect, never a signature.');
  }
  lines.push(
    '"contains_text_or_watermark" means: any rendered lettering, words, numerals, calligraphy, runes, rows of glyphs, an inscription, an artist\u2019s signature or monogram, a watermark, or a logo is visible anywhere in IMAGE 2 — decorative or legible alike (THE UNLETTERED WORLD).',
    'Answer with ONLY this JSON, nothing else:',
    kind !== 'soul'
      ? '{"same": true|false, "confidence": 0.0-1.0, "signature_present": true|false, "contains_text_or_watermark": true|false, "drift": ["short notes on what differs, if anything"]}'
      : '{"same": true|false, "confidence": 0.0-1.0, "contains_text_or_watermark": true|false, "drift": ["short notes on what differs, if anything"]}'
  );
  return lines.join(' ');
}

// A tolerant reader for an intolerant world: fenced, chattered-around,
// or clean JSON all parse; anything else is gibberish, said plainly.
export function parseVerdict(text = '') {
  const body = String(text);
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return { same: false, confidence: 0, signature_present: false, contains_text_or_watermark: false, drift: ['the warden spoke gibberish'], malformed: true };
  try {
    const raw = JSON.parse(body.slice(start, end + 1));
    const confidence = Math.max(0, Math.min(1, Number(raw.confidence) || 0));
    const drift = Array.isArray(raw.drift) ? raw.drift.slice(0, 5).map((note) => clean(note)) : [];
    // An absent answer is not presence: the warden's bar stays at or above
    // the gate's, so a verdict that never affirms the feature never
    // launders it into an attested sighting (signature must be === true).
    return { same: raw.same === true, confidence, signature_present: raw.signature_present === true, contains_text_or_watermark: raw.contains_text_or_watermark === true, drift, malformed: false };
  } catch {
    return { same: false, confidence: 0, signature_present: false, contains_text_or_watermark: false, drift: ['the warden spoke gibberish'], malformed: true };
  }
}

// The keyless warden: it cannot see, and it says so. Floor verdicts
// pass unjudged and are attested as such — never mistaken for sight.
export function mockWarden() {
  return { same: true, confidence: 0, signature_present: true, contains_text_or_watermark: false, drift: [], malformed: false, floor: true };
}

// The ruling — deterministic in (verdict, attempt). Actions:
//   'pass'    → ship the render, verdict attested
//   'repaint' → render again, notes appended to the prompt (once)
//   'anchor'  → fall back to the blessed anchor; a stranger never ships
//   'refuse'  → ship nothing; the surface keeps its textless fallback (THE UNLETTERED WORLD)
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
  // THE UNLETTERED WORLD — painted text is a defect at every distance,
  // judged in the same look that judges the likeness. Identity outranks it
  // (a fallen face anchors before the text law speaks — the anchor's own
  // bytes passed this law when they were minted); one repaint with the
  // clause reinforced, then the plate is REFUSED outright.
  if (verdict.contains_text_or_watermark === true) {
    return attempt < 2
      ? { action: 'repaint', notes: [UNLETTERED_REINFORCEMENT], attest: null }
      : { action: 'refuse', notes: [], attest: { warden: 'refused', reason: UNLETTERED_REFUSAL } };
  }
  if (!verdict.signature_present) {
    return attempt < 2
      ? { action: 'repaint', notes: ['same soul, but the distinguishing feature named in the locked identity is not visible — make that feature clearly visible. Never add lettering, an artist\u2019s signature, or text of any kind. Change nothing else: hold the blessed anchor\u2019s exact face, age, hair, and build — the feature returns, the person does not change.'], attest: null }
      : { action: 'pass', notes: [], attest: { warden: 'passed', confidence: verdict.confidence, signature: false, ...(verdict.magnifier ? { magnifier: verdict.magnifier } : {}) } };
  }
  // (TASK 54B §3) When the magnified look answered, its box rides the
  // attestation — the sealed record shows WHERE the warden looked.
  return { action: 'pass', notes: [], attest: { warden: 'passed', confidence: verdict.confidence, signature: true, ...(verdict.magnifier ? { magnifier: verdict.magnifier } : {}) } };
}
