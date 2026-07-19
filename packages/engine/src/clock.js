// ------------------------------------------------------------
// THE WORLD CLOCK — the Calendar Law (Directive VI).
//
// Time is derived, never stored. The clock folds every sealed
// time_advance and every explicit client-sealed span into one canonical
// count of hours since the tale began — and everything temporal hangs
// off that fold: the hour of the day, the day of the tale, the years a
// saga has walked, and the age a soul has grown into. Nothing here
// writes; the clock is a projection of the record, byte-identical on
// replay, and a world that skips its calendar is simply a world where
// no time passed.
//
// Aging is the clock's second face: a soul's age band advances by the
// ladder below as world-years accrue after its introduction. The band
// is computed, never edited — and the dead are outside time (that guard
// lives in the bearing, where the dead refuse to age).
// ------------------------------------------------------------

export const HOURS_PER_DAY = 24;
export const DAYS_PER_YEAR = 360; // the world's year is a round one — twelve months of thirty days

// The aging ladder: years spent in a band before the next.
export const AGE_BANDS = ['child', 'young', 'adult', 'elder'];
export const YEARS_TO_NEXT = { child: 8, young: 14, adult: 25, elder: Infinity };

export function spanHours(span = {}) {
  const n = Number.isFinite(span.n) ? Math.max(0, Math.floor(span.n)) : 0;
  if (!n) return 0;
  if (span.unit === 'hours') return n;
  if (span.unit === 'days') return n * HOURS_PER_DAY;
  if (span.unit === 'years') return n * DAYS_PER_YEAR * HOURS_PER_DAY;
  return 0;
}

// A client-sealed span record — how interludes and absences declare the
// time they cover. Ordinary rows: kind 'span', dm envelope empty, so
// nothing downstream mistakes it for a spoken turn.
export function spanEntry(span, { turn = 0, cause = '' } = {}) {
  return {
    id: (globalThis.crypto?.randomUUID?.() || `span-${turn}-${Math.random().toString(36).slice(2)}`),
    kind: 'span', turn, clock_advance: { unit: span.unit, n: Math.max(0, Math.floor(span.n || 0)) }, cause: String(cause || ''),
    player: null, sent: null, deed: null, resolution: null, redacted: false, ts: Date.now(),
    dm: { narration_blocks: [], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] }
  };
}

// The fold. Reads dm.time_advance (the model's lawful clock moves) and
// entry.clock_advance (the client's sealed spans). Same record, same
// hour — every time.
export function worldClock(entries = [], { startHour = 8 } = {}) {
  let hours = 0;
  for (const entry of (Array.isArray(entries) ? entries : [])) {
    hours += spanHours(entry?.dm?.time_advance || {});
    hours += spanHours(entry?.clock_advance || {});
  }
  const absolute = startHour + hours;
  return {
    totalHours: hours,
    day: Math.floor(absolute / HOURS_PER_DAY) + 1,
    hour: absolute % HOURS_PER_DAY,
    years: hours / (DAYS_PER_YEAR * HOURS_PER_DAY)
  };
}

// The day's watches, for schedules, plates, and prose.
export function watchOf(hour) {
  if (hour < 5) return 'deep night';
  if (hour < 8) return 'dawn';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'dusk';
  return 'night';
}

// The clock, spoken for the table — "Day 12, dusk."
export function clockLine(clock) {
  return `Day ${clock.day}, ${watchOf(clock.hour)}.`;
}

// The ladder walked: a band, aged by elapsed world-years. Computed,
// never stored; monotonic — age walks forward only.
export function agedBand(band, elapsedYears = 0) {
  let index = Math.max(0, AGE_BANDS.indexOf(band));
  let remaining = Math.max(0, elapsedYears);
  while (index < AGE_BANDS.length - 1) {
    const need = YEARS_TO_NEXT[AGE_BANDS[index]];
    if (remaining < need) break;
    remaining -= need;
    index += 1;
  }
  return AGE_BANDS[index];
}

// Band crossings are events the reducer notices, not fields anyone edits.
export function bandCrossing(band, beforeYears, afterYears) {
  const was = agedBand(band, beforeYears);
  const now = agedBand(band, afterYears);
  return was === now ? null : { from: was, to: now };
}

// ------------------------------------------------------------
// THE CLOCK AT THE TABLE — Directive VI, Phase 1, seated home with
// the parity cut. Time is derived from the record, never stored;
// these are the words the codex head speaks, the span row an act
// interlude seals, and the band-crossing notes a span surfaces in
// the raven style: derived, deterministic, quoting only the record.
// Nothing here writes. The caller seals what these return.
// ------------------------------------------------------------

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

// Years the world has walked since a given turn was played — the
// bearing's age rung. The record keeps no turn numbers on its rows: a
// turn IS a dm-bearing row, so the prefix closes the moment the marked
// turn's own row seals, and every span or advance after it ages the
// soul. Derived twice from the one record, never stored.
export function yearsSinceTurn(logs = [], turn = 0) {
  const rows = Array.isArray(logs) ? logs : [];
  const prefix = [];
  let played = 0;
  for (const row of rows) {
    prefix.push(row);
    if (row?.dm && played++ === turn) break;
  }
  return Math.max(0, worldClock(rows).years - worldClock(prefix).years);
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
