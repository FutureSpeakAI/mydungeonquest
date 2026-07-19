// ---------------------------------------------------------------------------
// THE UNMET LAW (Experience-Directive XVII, Article VI) — the Book shows
// only souls the record has introduced; the unmet render as ABSENCE. The
// introduction ledger is read here and only here: a lawful integer stamp
// (introduced_turn, written by the fold from a real journal turn) seats a
// soul; a stampless soul seats only when the record has plainly moved him
// (a death, a sighting, a bond, a known fact) — the grandfather bench for
// tales written before the stamp law. Canon without record is the unmet
// villain, and he does not exist on any Book surface: no card, no count,
// no trail note, no tie chip, no side door.
// Born fail-closed: junk rows prove nothing and never crash a reader.
// ---------------------------------------------------------------------------
export function isIntroduced(soul) {
  if (!soul || typeof soul !== 'object' || Array.isArray(soul)) return false;
  if (typeof soul.name !== 'string' || !soul.name.trim()) return false;
  if (Number.isInteger(soul.introduced_turn)) return true;
  if (soul.status === 'dead') return true;
  if (typeof soul.last_seen === 'string' && soul.last_seen.trim()) return true;
  if ((Number(soul.bond) || 0) > 0) return true;
  if (Array.isArray(soul.bond_arc) && soul.bond_arc.length > 0) return true;
  if (Array.isArray(soul.known_facts) && soul.known_facts.length > 0) return true;
  return false;
}

// The shelf's fold — introduced rows ride WHOLE, verbatim; nothing is
// rebuilt field by field, so tomorrow's blocks survive today's reader.
export function introducedCast(campaign) {
  const cast = Array.isArray(campaign?.codex?.cast) ? campaign.codex.cast : [];
  return cast.filter(isIntroduced);
}

// Every spoken name the Book may utter, lowercased — the hero always
// speaks for herself.
export function introducedNames(campaign, hero = campaign?.hero) {
  const names = new Set(introducedCast(campaign).map((soul) => soul.name.trim().toLowerCase()));
  if (typeof hero?.name === 'string' && hero.name.trim()) names.add(hero.name.trim().toLowerCase());
  return names;
}
