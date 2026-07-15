// ------------------------------------------------------------
// WIKI TEXT — cards rendered as STORY, never machinery. "A warm elder
// woman's voice," not "gender: F, bin 3." Pure string math; shared by the
// Codex wiki pages and the bound book's dramatis personae.
// ------------------------------------------------------------

const AGE_WORD = { child: 'young', young: 'young', adult: '', elder: 'elder' };
const REGISTER_WORD = { feminine: "woman's", masculine: "man's", neutral: '' };

// One story-worded line for how a soul is heard.
export function voiceLineOf(entity = {}) {
  const gender = String(entity.gender || entity.presentation || '').toLowerCase();
  const band = AGE_WORD[String(entity.age_band || '').toLowerCase()] ?? '';
  const timbre = String(entity.timbre || '').toLowerCase().trim();
  const registered = REGISTER_WORD[gender] ?? '';
  const parts = [timbre, band, registered].filter(Boolean);
  if (!parts.length) return entity.voice ? `Heard as ${String(entity.voice).trim()}` : '';
  return `A ${parts.join(' ')} voice`.replace(/\s+/g, ' ');
}

// First and last sealed words, cited to their turns. Empty when unspoken.
export function wordsLine(card) {
  if (!card?.firstWords) return '';
  const first = `First words — “${card.firstWords.text}” (turn ${card.firstWords.turn})`;
  if (!card.lastWords || card.lastWords.turn === card.firstWords.turn) return first;
  return `${first} · Last — “${card.lastWords.text}” (turn ${card.lastWords.turn})`;
}

// A tie, spoken plainly.
export function tieLine(tie) {
  if (!tie) return '';
  if (tie.type === 'kin') return `${tie.why} of ${tie.to}`;
  if (tie.type === 'enemy') return `enemy of ${tie.to}`;
  if (tie.type === 'ally') return `sworn to ${tie.to}`;
  return `${tie.why} with ${tie.to}`;
}
