// ------------------------------------------------------------
// THE SHARED SKY at the table — the Shared Sky Law (Directive V,
// Phase 5). One sky hangs over every world: each season the house
// publishes an omen, and every world may see the same comet and read
// it by its own covenant. The engine composes the note
// (fatescript/sky) — bounded, a hook and never a command; it enters
// canon ONLY if the DM writes it through ordinary story ops. A world
// may close its sky with one setting, and a closed sky is a silent
// one. When the house's feed cannot be reached, the fixture seasons
// stand — a fork inherits them and owes nothing.
// ------------------------------------------------------------
import { currentSeason, skyNote, FIXTURE_SEASONS } from 'fatescript/sky';

// The house's feed, with the fixture floor. Never throws.
export async function fetchSeasons() {
  try {
    const response = await fetch('/api/seasons');
    if (!response.ok) throw new Error(`the sky kept its counsel (${response.status})`);
    const list = await response.json();
    return Array.isArray(list) && list.length ? list : FIXTURE_SEASONS;
  } catch {
    return FIXTURE_SEASONS;
  }
}

// The note for THIS world, now: null when the world closed its sky,
// null when no season has begun. Deterministic in (campaign.sky,
// seasons, now).
export function skyNoteFor(campaign, seasons, now = Date.now()) {
  const settings = campaign?.sky === 'off' ? { sky: 'off' } : {};
  return skyNote(currentSeason(seasons || FIXTURE_SEASONS, now), settings);
}
