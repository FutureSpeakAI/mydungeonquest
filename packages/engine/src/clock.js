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
