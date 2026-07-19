// ---------------------------------------------------------------------------
// THE AUDITION DEAL (Experience-Directive XVII, Article VIII) — ten voices
// step forward, under the UNCHANGED Tenor law: the engine's own dealer
// (auditionCandidates) is called as written, never edited; the stated
// register leads the deal exactly as it always has, so the first three
// chips are byte-for-byte the old deal and an earlier blessing keeps its
// chair. The far register fills the back of the row to ten — the blessing
// stays the player's own hand, and blessing one remains permanent.
// Deterministic per name; pure string math; keyless-safe.
// ---------------------------------------------------------------------------
import { auditionCandidates } from 'fatescript/cinema/casting';

export const AUDITION_COUNT = 10;

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
