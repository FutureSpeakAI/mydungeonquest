// ------------------------------------------------------------
// THE SHARED SKY — groundwork (Shared Sky Law, Directive V).
//
// One sky hangs over every world. Each season the house publishes an
// OMEN — a motif, a hook, a palette accent — and every world may see
// the same comet and read it by its own covenant. This module composes
// the note; it never writes it. The note is ephemeral, prompt-side
// flavor: it enters canon only if the DM writes it through ordinary
// story ops, so canon lock is untouched and the covenant stays supreme.
// A world may close its sky with one setting, and a closed sky is a
// silent one. Deterministic in (season, settings); keyless by way of
// the fixture seasons below.
// ------------------------------------------------------------

export const SKY_NOTE_MAX = 200;

// The season standing now: latest start at or before `now`. No season
// yet begun is no season at all.
export function currentSeason(seasons = [], now = Date.now()) {
  let standing = null;
  for (const season of [...seasons].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))) {
    if ((season.start ?? 0) <= now) standing = season;
  }
  return standing;
}

// The note, composed and bounded. A hook, never a command.
export function skyNote(season, settings = {}) {
  if (!season || settings.sky === 'off') return null;
  const name = String(season.name || '').trim();
  const omen = String(season.omen || '').trim();
  if (!name && !omen) return null;
  const note = `The sky: ${name}${name && omen ? ' — ' : ''}${omen}`.replace(/\s+/g, ' ').trim();
  return note.length > SKY_NOTE_MAX ? `${note.slice(0, SKY_NOTE_MAX - 1)}…` : note;
}

// The keyless feed: two seasons the Floor can always see. The house
// publishes the live feed; a fork inherits these and owes nothing.
export const FIXTURE_SEASONS = [
  {
    id: 'comet-year',
    name: 'The Comet Year',
    omen: 'A pale comet crosses every sky; each world reads it by its own covenant.',
    motif: 'omens overhead',
    palette: '#c8502e',
    hook: 'Someone in the tale has seen the comet before.',
    start: Date.UTC(2026, 6, 1)
  },
  {
    id: 'long-thaw',
    name: 'The Long Thaw',
    omen: 'Ice gives up what it kept.',
    motif: 'what returns',
    palette: '#4a6b8a',
    hook: 'A thing lost in a cold season is found.',
    start: Date.UTC(2026, 9, 1)
  }
];
