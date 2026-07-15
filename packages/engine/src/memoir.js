// ------------------------------------------------------------
// THE ANNALS — the Long Memory Law (Directive V).
//
// Year two must remember year one, and memory is derived from the record
// alone. At each act or tale seal the Chronicler composes an ANNAL — a
// digest bound by its three laws: nothing invented, nothing contradicted,
// nothing embellished; quotes verbatim or absent. The keyless path is a
// deterministic template over sealed ops; a keyed model may write finer
// prose, but every annal — templated or modeled — must pass the same
// court: assertAnnalLawful. Annals seal as journal entries (kind:'annal')
// and ride the context pack newest-first, so a fact from turn three can
// reach turn two hundred without the prompt growing without bound.
// (Named ANNALS in code because codex.memoir already names the DM's
// running memory lines — two ledgers, two words, no collision.)
// ------------------------------------------------------------
import { buildCards } from './cards.js';

const trim = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

// The deterministic template: chronicle-worthy ops from the slice, in the
// record's own words. Every proper noun below EXISTS in the record —
// that is not a style choice, it is the law the court enforces.
export function composeAnnal({ entries = [], codex = null, hero = null, actIndex = 0, actName = '' } = {}) {
  const { cards } = buildCards({ hero, entries });
  const lines = [];
  const head = actName ? `Act ${actIndex + 1} — ${actName}.` : `Act ${actIndex + 1}.`;
  for (const key of Object.keys(cards)) {
    const card = cards[key];
    const name = card.identity.name;
    if (card.identity.hero) continue;
    if (card.state.status === 'dead') {
      const fell = card.chronicle.find((c) => c.gloss.startsWith('Fell'));
      lines.push(`${name} fell${fell && Number.isInteger(fell.turn) ? ` at turn ${fell.turn}` : ''}.`);
    }
    if ((card.state.bond ?? 0) >= 3) lines.push(`${name} stood close to the hero.`);
    const fact = [...card.chronicle].reverse().find((c) => !c.gloss.startsWith('Spoke') && !c.gloss.startsWith('Entered'));
    if (fact && card.state.status !== 'dead') lines.push(`${name} — ${trim(fact.gloss, 90)}`);
    if (card.lastWords && card.state.status === 'dead') lines.push(`${name} spoke last — “${card.lastWords}”`);
  }
  const wounds = (codex?.notes || []).slice(-2).map((note) => trim(note, 90));
  return [head, ...lines.slice(0, 10), ...wounds].join(' ');
}

// The corpus: every string the record actually holds. The court reads
// against this, and only this.
function corpusOf({ entries = [], codex = null, hero = null } = {}) {
  const parts = [];
  if (hero?.name) parts.push(hero.name);
  for (const soul of codex?.cast || []) parts.push(soul.name, soul.role, soul.visual, soul.voice, soul.goal, soul.secret, soul.last_seen, ...(soul.known_facts || []));
  for (const region of codex?.regions || []) parts.push(region.name, region.description, region.state);
  for (const note of codex?.notes || []) parts.push(note);
  for (const line of codex?.memoir || []) parts.push(line);
  for (const entry of entries) {
    parts.push(entry.player, entry.deed);
    for (const block of entry.dm?.narration_blocks || []) parts.push(block.speaker, block.text);
    const su = entry.dm?.story;
    if (su) for (const op of [...(su.cast_add || []), ...(su.cast_update || [])]) parts.push(op.name, op.visual, op.voice, op.goal, op.secret, op.fact_add, op.last_seen);
  }
  return parts.filter(Boolean).join(' \u0001 ');
}

// Sentence-frame words the template itself supplies — never evidence of
// invention. Everything else capitalized must live in the record.
const FRAME = new Set(['The','A','An','Act','Turn','Chapter','Volume','In','At','On','By','When','Then','But','And','Now','Offscreen','She','He','They','It','Her','His','Their','Spoke','Fell','Entered','Grew','Drew','I','II','III','IV','V','VI','VII','VIII','IX','X']);

export function assertAnnalLawful(annalText, record = {}) {
  const errors = [];
  const corpus = corpusOf(record);
  const corpusFold = corpus.toLowerCase();
  // First law of the court: quotes are verbatim or they are contraband.
  for (const match of String(annalText).matchAll(/[“"]([^”"]{2,200})[”"]/g)) {
    if (!corpus.includes(match[1])) errors.push(`quote not in the record: “${trim(match[1], 40)}”`);
  }
  // Second: no smuggled names. Any capitalized token outside the sentence
  // frame must appear somewhere in the record corpus.
  for (const match of String(annalText).matchAll(/\b([A-Z][a-zA-Z'’-]{2,})\b/g)) {
    const word = match[1];
    if (FRAME.has(word)) continue;
    if (!corpusFold.includes(word.toLowerCase())) errors.push(`name not in the record: ${word}`);
  }
  return { ok: errors.length === 0, errors };
}

// The sealed row: an ordinary record, silent in the book and the history,
// alive in the pack. `annal` carries the text; the dm envelope stays empty
// so nothing downstream mistakes it for a spoken turn.
export function annalEntry(text, { turn = 0, actIndex = 0, beatIndex = 0 } = {}) {
  return {
    id: (globalThis.crypto?.randomUUID?.() || `annal-${turn}-${Math.random().toString(36).slice(2)}`),
    kind: 'annal', turn, actIndex, beatIndex,
    annal: String(text || ''),
    player: null, sent: null, deed: null, resolution: null, redacted: false, ts: Date.now(),
    dm: { narration_blocks: [], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] }
  };
}
