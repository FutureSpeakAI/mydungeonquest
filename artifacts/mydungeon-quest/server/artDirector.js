// ============================================================
// THE ART DIRECTOR (0.9.0, LAW IX) — the third chair in the
// writer's room. The chair sits ONLY when a plate is due — a
// lawful image_cue riding the draft — and its whole work is a
// merge: the cue leaves this room carrying its `moment` (the
// page's own staged line, whole, for the warden's one question)
// and its `caption` (Law X prose that DESCRIBES the plate and
// never quotes the page). The merge happens BEFORE the one
// dm_turn validator sits, so there is no second channel and no
// second court: an unlawful caption fails the same seal every
// other word of the turn fails. A draft that already carries a
// lawful caption or moment keeps its own — the chair completes,
// it never overwrites. No imports: the chair reads the draft's
// bytes and nothing else, so every tier (mock, keyed, repair)
// meets the same deterministic hand.
// ============================================================

// A plate is due iff the cue holds the validator's own shape law:
// object, lawful kind, subjects an array. Malformed cues are left
// untouched — the shape court speaks, not this chair.
export function plateDue(turn) {
  const cue = turn?.image_cue;
  return Boolean(
    cue && typeof cue === 'object' && !Array.isArray(cue)
    && ['portrait', 'scene'].includes(cue.kind) && Array.isArray(cue.subjects)
  );
}

// THE MOMENT (Law IX): the first unattributed narration line — the
// telling's own scene description — whole, never the 90-character
// slice the legacy client took. 480 is the moment brief's own cap.
export function momentOf(turn) {
  const blocks = Array.isArray(turn?.narration_blocks) ? turn.narration_blocks : [];
  const line = blocks.find((block) => block && !block.speaker && block.text) || blocks[0] || null;
  return String((line && line.text) || '').slice(0, 480);
}

// THE CAPTION (Law X): composed from the cue's own staging — mood,
// subjects, region — in a frame the page never speaks, so the folded
// caption can never be a folded substring of the folded narration.
// The bands are guaranteed by construction: mood ≤ 48, names ≤ 80,
// region ≤ 40, fixed frame ≈ 47 — the whole runs 40–220, opens on a
// capital, closes on a period, one sentence, no truncation marks.
export function captionOf(turn) {
  const cue = turn?.image_cue || {};
  const mood = String(cue.mood || 'the staged moment').trim().slice(0, 48) || 'the staged moment';
  const names = (Array.isArray(cue.subjects) ? cue.subjects : [])
    .filter((s) => typeof s === 'string' && s.trim())
    .slice(0, 2).map((s) => s.trim()).join(' and ').slice(0, 80) || 'the scene';
  const region = String(cue.region || '').trim().slice(0, 40);
  const opened = mood.charAt(0).toUpperCase() + mood.slice(1);
  const sky = region ? `the ${region} sky` : 'an unnamed sky';
  return `${opened}: ${names} beneath ${sky}, as this page tells it.`;
}

// THE SITTING — one merge, pure, deterministic. Fields the draft
// already carries lawfully (non-empty strings) are kept; the chair
// only fills empty seats. Cue-less and malformed drafts pass through
// byte-identical.
export function artDirectorSits(turn) {
  if (!plateDue(turn)) return turn;
  const cue = turn.image_cue;
  const caption = (typeof cue.caption === 'string' && cue.caption.trim()) ? cue.caption : captionOf(turn);
  const staged = momentOf(turn);
  const moment = (typeof cue.moment === 'string' && cue.moment.trim())
    ? cue.moment
    : (staged || caption);
  return { ...turn, image_cue: { ...cue, caption, moment } };
}
