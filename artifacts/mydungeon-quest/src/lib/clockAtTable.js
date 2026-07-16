// ------------------------------------------------------------
// THE CLOCK AT THE TABLE — Directive VI, Phase 1.
//
// The engine keeps the Calendar Law (fatescript/clock): time is derived
// from the record, never stored. This file is the table's side of the
// wiring — the words the codex head speaks, the span row an act
// interlude seals, and the band-crossing notes a span surfaces in the
// raven style: derived, deterministic, and quoting only the record.
//
// Nothing here writes. App.jsx calls these and seals what they return;
// the components quote them. The law lives in the engine; this is the
// courtroom furniture.
// ------------------------------------------------------------
import { worldClock, watchOf, clockLine, spanEntry, bandCrossing } from 'fatescript/clock';

// An act interlude is a day on the road — the curtain falls, the world
// keeps one honest day of walking. Deterministic by law: the same act
// turn always costs the same day.
export const INTERLUDE_SPAN = { unit: 'days', n: 1 };

// The clock, folded fresh from the record.
export function clockOf(logs = []) {
  return worldClock(logs);
}

// The clock as the table speaks it — "Day 12, dusk."
export function clockWords(logs = []) {
  return clockLine(worldClock(logs));
}

// The clock as the pack carries it: small, spoken, and derived. The
// prompt renders [STORY] verbatim, so the DM reads the same hour the
// codex shows — one clock, two witnesses.
export function packClock(logs = []) {
  const clock = worldClock(logs);
  return { day: clock.day, watch: watchOf(clock.hour), line: clockLine(clock) };
}

// The interlude's sealed span row, seated for the feed: the engine
// builds the row (kind 'span', silent dm envelope), the table anchors
// it at the beat so the page law keeps holding. Returns the clock on
// either side of the span so the caller can ask about crossings.
export function interludeRow(logs = [], { turn = 0, beatIndex = 0, cause = '' } = {}) {
  const before = worldClock(logs);
  const row = { ...spanEntry(INTERLUDE_SPAN, { turn, cause }), beatIndex, notes: [] };
  const after = worldClock([...logs, row]);
  return { row, before, after };
}

// The span, spoken as a divider phrase — its own words, never the
// neighbor's: "The road takes a day — the act turns."
export function spanPhrase(log) {
  const span = log?.clock_advance || {};
  const n = Math.max(0, Math.floor(span.n || 0));
  const words = span.unit === 'years' ? (n === 1 ? 'a year' : `${n} years`)
    : span.unit === 'days' ? (n === 1 ? 'a day' : `${n} days`)
    : (n === 1 ? 'an hour' : `${n} hours`);
  const cause = String(log?.cause || '').trim();
  return cause ? `The road takes ${words} — ${cause}` : `The road takes ${words}.`;
}

// Band-crossings, surfaced in the raven style: every note derives from
// the fold and the card, quotes no invention, and the dead are outside
// time. A soul speaks a crossing only if its card carries a band —
// bands arrive with the bearing's own wiring phase; the court stands
// ready before the first witness takes the stand.
export function bandNotes(cast = [], before, after) {
  const notes = [];
  if (!before || !after) return notes;
  for (const soul of Array.isArray(cast) ? cast : []) {
    const band = soul?.band;
    if (!band || !soul?.name) continue;
    if (soul.status === 'dead') continue; // the dead never age
    const crossing = bandCrossing(band, before.years, after.years);
    if (!crossing) continue;
    const grown = crossing.to === 'elder' ? 'has grown old with the years'
      : crossing.to === 'adult' ? 'has grown into an adult'
      : 'has grown out of childhood';
    notes.push(`${soul.name} ${grown}.`);
  }
  return notes;
}
