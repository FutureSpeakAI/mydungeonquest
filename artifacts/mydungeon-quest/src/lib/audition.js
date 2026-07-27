// ---------------------------------------------------------------------------
// THE AUDITION DEAL (Experience-Directive XVII, Article VIII) — ten voices
// step forward, under the UNCHANGED Tenor law: the engine's own dealer
// (auditionCandidates) is called as written, never edited; the stated
// register leads the deal exactly as it always has, so the first three
// chips are byte-for-byte the old deal and an earlier blessing keeps its
// chair. The far register fills the back of the row to ten — the blessing
// stays the player's own hand, and blessing one remains permanent.
// Deterministic per name; pure string math; keyless-safe.
//
// C6 — THE SOUND LEXICON: voices are described by what you hear, never by
// the provider's name. One acoustic phrase per voice, written against its
// timbre table. Provider names (Daniel, Charlotte, Elli…) never reach
// the creation flow.
// ---------------------------------------------------------------------------
import { auditionCandidates } from 'fatescript/cinema/casting';

export const AUDITION_COUNT = 10;

// One acoustic phrase per ensemble voice. Derived from the timbre array in
// casting.js but written in plain language — no provider names anywhere.
const SOUND_MAP = {
  'onwK4e9ZLuTAKqWW03F9': 'Deep and commanding. Noble weight behind every word.',
  'pNInz6obpgDQGcFmaJgB': 'Low and measured. Steady warmth, nothing forced.',
  'VR6AewLTigWG4xSOukaG': 'Crisp and forceful. A soldier\u2019s economy of words.',
  'N2lVS1w4EtoT3dr4eOWO': 'Hoarse, gravelled. Smoke and slow menace.',
  'pqHfZKP75CvOlQylNhV4': 'Weathered and kind. Old, and a little tired.',
  'TxGEqnHWrfWFTfGW9XjX': 'Earnest. Bright and quick to believe.',
  'EXAVITQu4vr4xnSDxMaL': 'Soft and hushed. Every word handled gently.',
  'AZnzlk1XvdvUeBnXmlld': 'Bold and fierce. Walks into a room and owns it.',
  'XB0fDUnXU5powFXDhCwa': 'Cool and composed. Regal distance, velvet over steel.',
  'Xb7hH8MSUJpSbSDYk0k2': 'Sharp and confident. Wry at the edges.',
  'XrExE9yKIg1WjnnlVkGX': 'Warm and patient. Dry when it needs to be.',
  'MF3mGyEYCl7XYWbV9V6O': 'Young and feeling. Something tender, not yet hardened.',
};

// Returns the acoustic description for a voice ID. Falls back to a neutral
// phrase if a future voice is added before the map is extended.
export function soundDesc(id) {
  return SOUND_MAP[id] ?? 'Distinct. A voice of its own kind.';
}

export function dealAuditions(presentation, name = '', want = AUDITION_COUNT) {
  const stated = ['feminine', 'masculine'].includes(String(presentation || '').toLowerCase())
    ? String(presentation).toLowerCase() : null;
  const seen = new Set();
  const picks = [];
  const take = (register, salt) => {
    for (const candidate of auditionCandidates(register, salt)) {
      if (picks.length >= want) return;
      if (!seen.has(candidate.id)) { seen.add(candidate.id); picks.push(candidate); }
    }
  };
  if (stated) {
    take(stated, name); // the old deal leads, verbatim
    for (let i = 1; i <= 40 && picks.length < want; i += 1) take(stated, `${name}:deal${i}`);
    const far = stated === 'feminine' ? 'masculine' : 'feminine';
    take(far, name);
    for (let i = 1; i <= 40 && picks.length < want; i += 1) take(far, `${name}:far${i}`);
  } else {
    take('neutral', name); // the neutral deal leads as before
    for (let i = 1; i <= 40 && picks.length < want; i += 1) {
      take('feminine', `${name}:deal${i}`);
      take('masculine', `${name}:deal${i}`);
    }
  }
  return picks;
}
