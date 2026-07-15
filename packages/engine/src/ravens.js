// ------------------------------------------------------------
// THE RAVENS — the Raven Law (Directive V).
//
// The world moves while the player is away, and on return it accounts
// for itself. Absence scales the Living World: one tick batch per elapsed
// day, capped at six — souls walk, they do not sprint — each batch under
// the standing TICK_BUDGET, deterministic in (codex, lastSealTs, now),
// ops-only, zero tokens at the Floor. The return opens with WHAT THE
// RAVENS BRING: a recap composed only from the unseen ticks and the
// latest annal. Every line traces to a sealed op by construction; a keyed
// model may gloss it later, but the gloss decorates the record — it never
// replaces it. Zero absence is zero noise: no ticks, no recap, no ravens.
// ------------------------------------------------------------
import { tickUpdates, tickLogEntry } from './livingWorld.js';

export const ABSENCE_BATCH_CAP = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

export function absenceDays(lastSealTs, now = Date.now()) {
  if (!Number.isFinite(lastSealTs) || lastSealTs <= 0) return 0;
  return Math.max(0, Math.floor((now - lastSealTs) / DAY_MS));
}

// The batches, as record rows. Synthetic turns are derived from the base
// turn so the same absence over the same codex ticks the same way.
export function absenceBatches({ codex, lastSealTs, now = Date.now(), startTurn = 0 } = {}) {
  const days = Math.min(ABSENCE_BATCH_CAP, absenceDays(lastSealTs, now));
  const entries = [];
  for (let day = 0; day < days; day += 1) {
    const turn = 2_000_000 + startTurn * 100 + day; // collision-free with play turns and interludes
    const updates = tickUpdates(codex, turn);
    if (updates) entries.push({ ...tickLogEntry(updates, turn, codex.beatIndex ?? 0), absence: true });
  }
  return entries;
}

// What the ravens bring: one line per soul, the freshest word winning,
// spoken in the tick's own words with the machinery filed off.
export function composeRecap({ tickEntries = [], annal = '' } = {}) {
  const latest = new Map(); // soul → freshest offscreen fact
  for (const entry of tickEntries) {
    for (const op of entry.dm?.story?.cast_update || []) {
      if (op.fact_add) latest.set(op.name, op.fact_add.replace(/^Offscreen — /, ''));
    }
  }
  const lines = [...latest.entries()].map(([name, fact]) => `${name} ${fact}`);
  const opening = lines.length ? 'While you were away —' : '';
  const tail = annal ? `Last the record tells: ${annal}` : '';
  return {
    lines,
    text: [opening, ...lines, tail].filter(Boolean).join('\n')
  };
}
