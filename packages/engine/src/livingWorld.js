// ------------------------------------------------------------
// THE LIVING WORLD — offscreen ticks. When story time passes (the DM's
// time_advance) or an act turns, the world moves without the player: each
// chosen soul's goal advances ONE bounded step, expressed ONLY as ops the
// reducers already govern (fact_add + last_seen). Ticks may not kill, may
// not change status or bonds, may not spend anything, and are budgeted.
// Deterministic in (codex, turn) — the same world ticks the same way.
// ------------------------------------------------------------

export const TICK_BUDGET = 4;

const hash = (s) => { let h = 0; const str = String(s || ''); for (let i = 0; i < str.length; i += 1) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return Math.abs(h); };
// P21 / J4 — excerpt produces grammatical text when attached to a stride:
//   1. Lowercase the first letter so "Find the chalice" → "find the chalice"
//      and the stride reads as one sentence ("presses on toward find the chalice").
//   2. Trim trailing punctuation so the fact_add template's own "." is never doubled.
//   3. Clip at a clause boundary (comma or period within the first 7 words) to
//      avoid mid-clause cuts — a period terminates early, a comma clips the rest.
const excerpt = (goal) => {
  const raw = String(goal || '').replace(/\s+/g, ' ').trim();
  const words = raw.split(' ').slice(0, 7);
  // Find a natural clause boundary within the excerpt (period or comma mid-word-list)
  let clauseEnd = words.length;
  for (let i = 0; i < words.length; i += 1) {
    if (/[.!?]$/.test(words[i])) { clauseEnd = i + 1; break; }
    if (/,$/.test(words[i])) { clauseEnd = i; break; } // stop before the comma word
  }
  const clipped = words.slice(0, clauseEnd).join(' ');
  // Trim any residual trailing punctuation then lowercase the first letter
  return clipped.replace(/[.,;:!?]+$/, '').replace(/^[A-Z]/, (c) => c.toLowerCase());
};

const STRIDES = [
  'presses on toward',
  'wins quiet ground toward',
  'meets a setback pursuing',
  'gathers what they need for',
  'keeps faith, still working toward',
  'takes a longer road toward'
];
const WHEREABOUTS = [
  'moving beyond the scene',
  'about their own business',
  'on the road between appearances',
  'keeping to their purpose offscreen'
];

// Who moves: active, goal-bearing souls who are not the villain (the design
// clock already governs the villain) and not the hero. Deterministic order:
// strongest bonds first, then the earliest-introduced, then the name.
// P22 / J4 — rotation: when the eligible pool is larger than the budget,
// use the turn number to rotate the starting window so the same N souls
// don't always tick and the pool cycles through turns. Deterministic in
// (codex, turn, budget) — same world + same turn → same targets.
export function pickTickTargets(codex, budget = TICK_BUDGET, turn = 0) {
  const eligible = (codex.cast || [])
    .filter((soul) => soul.status === 'active' && soul.role !== 'villain' && String(soul.goal || '').trim())
    .sort((a, b) => (b.bond - a.bond) || ((a.introduced_turn ?? 99) - (b.introduced_turn ?? 99)) || a.name.localeCompare(b.name));
  if (eligible.length <= budget) return eligible;
  // Rotate: the window start cycles through the eligible pool by turn.
  const start = Number(turn || 0) % Math.max(1, eligible.length - budget + 1);
  return eligible.slice(start, start + budget);
}

// The tick, as ops. NOTHING here may widen: fact_add and last_seen only.
export function tickUpdates(codex, turn, budget = TICK_BUDGET) {
  const targets = pickTickTargets(codex, budget, turn);
  if (!targets.length) return null;
  return {
    cast_update: targets.map((soul) => {
      const stride = STRIDES[hash(`${soul.name}:${turn}`) % STRIDES.length];
      return {
        name: soul.name,
        fact_add: `Offscreen — ${stride} ${excerpt(soul.goal)}.`,
        last_seen: WHEREABOUTS[hash(`${soul.name}:${turn}:w`) % WHEREABOUTS.length]
      };
    })
  };
}

// A tick's log entry: an ordinary record with empty narration — visible to
// the cards, the graph, and the wiki; silent in the book and the history.
export function tickLogEntry(updates, turn, beatIndex) {
  return {
    id: (globalThis.crypto?.randomUUID?.() || `tick-${turn}-${Math.random().toString(36).slice(2)}`),
    kind: 'tick', turn, beatIndex,
    player: null, sent: null, deed: null, resolution: null, redacted: false, ts: Date.now(),
    dm: { narration_blocks: [], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story: updates, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] }
  };
}
