// ------------------------------------------------------------
// THE UNLETTERED WORLD — the Silence Amendment (0.6.1, Task 53 §2).
//
// Seven nouns in seven iterations is a vocabulary, not a law. This module
// is the ONE general clause every paint prompt rides — replacing the
// accumulated noun-pile — and the law half of the warden's new question:
// contains_text_or_watermark, asked of EVERY delivered plate. On true,
// ONE repaint with the clause reinforced; on a second true the plate is
// REFUSED — the surface keeps its lawful textless fallback and the
// refusal lands in the sealed record. The clause is byte-stable: the
// same string, every builder, exactly once.
// ------------------------------------------------------------

export const UNLETTERED_WORLD = 'THE UNLETTERED WORLD — this image contains no writing of any kind: no letters, words, numerals, or typography; no signatures, monograms, watermarks, or logos; no glyphs, runes, sigils, or invented alphabets; no labels, captions, titles, inscriptions, or lettered borders; no legible or decorative writing on any surface that faces the viewer — not on maps, charts, scrolls, books, banners, signs, blades, stones, waymarks, gravestones, epitaphs, or walls; surfaces that would carry writing show only blank weathered texture. Story-required written matter may exist only as an object — a folded letter, a rolled map, a carved stone — with its face turned away, in shadow, or beyond legibility.';

// The reinforcement appended to the ONE lawful repaint after the warden
// sees text: the clause itself rides again with the rebuilt prompt, so
// the note narrows rather than repeats.
export const UNLETTERED_REINFORCEMENT = 'The previous render broke THE UNLETTERED WORLD: rendered text, lettering, a signature, or a watermark appeared. Repaint with every letterform gone — blank weathered texture where writing would sit — and change nothing else.';

// The refusal note that lands in the sealed record when the second render
// still carries text.
export const UNLETTERED_REFUSAL = 'painted text twice — the plate is refused; the surface keeps its textless fallback';

// The single-image brief for plates that owe no likeness warden (first
// takes, covers, regions before any anchor): the same question the
// two-image warden asks, alone.
export function unletteredBrief() {
  return [
    'You are the Warden of an unlettered world. IMAGE 1 is a freshly painted plate.',
    '"contains_text_or_watermark" means: any rendered lettering, words, numerals, calligraphy, runes, rows of glyphs, an inscription, an artist\u2019s signature or monogram, a watermark, or a logo is visible anywhere in IMAGE 1 — decorative or legible alike. Blank scrolls, blind stones, and letterforms turned away or beyond legibility do not count.',
    'Answer with ONLY this JSON, nothing else:',
    '{"contains_text_or_watermark": true|false, "confidence": 0.0-1.0}'
  ].join(' ');
}

// Tolerant parse, strict boolean: only a true boolean can refuse a plate.
// Absence, strings, and gibberish all read false — the judge's own failure
// never refuses a render (the same fail-open the likeness floor keeps).
export function parseUnlettered(text = '') {
  const body = String(text);
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return { contains_text_or_watermark: false, confidence: 0, malformed: true };
  try {
    const raw = JSON.parse(body.slice(start, end + 1));
    return { contains_text_or_watermark: raw.contains_text_or_watermark === true, confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0)), malformed: false };
  } catch {
    return { contains_text_or_watermark: false, confidence: 0, malformed: true };
  }
}

// The text-only ruling for unwardened plates — deterministic in
// (verdict, attempt): clean, unjudged, or unreadable ships; text repaints
// ONCE with the clause reinforced; a second sighting refuses the plate.
export function unletteredRuling(verdict, { attempt = 1 } = {}) {
  if (!verdict || verdict.floor || verdict.malformed || verdict.contains_text_or_watermark !== true) {
    return { action: 'pass', notes: [], attest: null };
  }
  return attempt < 2
    ? { action: 'repaint', notes: [UNLETTERED_REINFORCEMENT], attest: null }
    : { action: 'refuse', notes: [], attest: { warden: 'refused', reason: UNLETTERED_REFUSAL } };
}
