// ------------------------------------------------------------
// THE CALENDAR — story time as a pure fold over the sealed record.
// time_advance operations are the only clock; ticks carry none and
// therefore move nothing. Day one is the day the tale opens.
//
// THE WATCH LAW (Directive VIII.8) — the folded hours map
// deterministically to a named watch of the day through this fixed
// table: six watches of four hours each. The briefing's calendar line
// carries the watch byte-exact, and every scene prompt speaks the same
// word, so dusk cannot flip to noon between plates.
// ------------------------------------------------------------
export const WATCHES = [
  { from: 0, to: 3, name: 'deep night' },
  { from: 4, to: 7, name: 'dawn' },
  { from: 8, to: 11, name: 'morning' },
  { from: 12, to: 15, name: 'afternoon' },
  { from: 16, to: 19, name: 'dusk' },
  { from: 20, to: 23, name: 'night' }
];

export function watchOf(hours) {
  const h = Number.isInteger(hours) ? ((hours % 24) + 24) % 24 : 0;
  const watch = WATCHES.find((entry) => h >= entry.from && h <= entry.to);
  return watch ? watch.name : 'deep night';
}

export function calendarOf(logs = []) {
  let day = 1;
  let hours = 0;
  for (const log of logs) {
    const advance = log?.dm?.time_advance;
    if (!advance || log.redacted) continue;
    if (advance.unit === 'days') day += Math.max(0, advance.n | 0);
    if (advance.unit === 'hours') {
      hours += Math.max(0, advance.n | 0);
      day += Math.floor(hours / 24);
      hours = hours % 24;
    }
  }
  return { day, hours };
}

export function calendarLine(logs) {
  const { day, hours } = calendarOf(logs);
  return `It is Day ${day} of the tale, in the ${watchOf(hours)} watch.`;
}
