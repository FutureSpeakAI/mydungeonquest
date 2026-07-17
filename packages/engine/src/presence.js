// ------------------------------------------------------------
// THE PRESENCE CUT (Directive VII) — who stands where, replayed pure
// from the sealed record. The ground exists because a scene_set sealed
// it; a soul stands somewhere because a non-struck, non-tick row staged
// it there — it spoke, walked on, was updated onstage, or was named a
// hand in possession or coin. The hero is sighted by every non-struck
// player row. NO INFERENCE: a soul with no lawful sighting has unknown
// whereabouts, and a sighting before any scene stands lands on no
// ground. Struck rows contribute nothing — the redaction law outranks
// all of this; tick rows are skipped whole — offscreen whereabouts are
// never sightings. Cites are journal INDICES (the trove's own choice);
// codex.scene.sinceTurn is a different clock with a different name, and
// the two are never cross-asserted. Pure, deterministic, keyless.
//
// FAIL-CLOSED (the architect's cut, 56.6): a substructure that is not
// the shape the law names — a list that is not an array, a name that is
// not a string — proves nothing and is skipped whole. The replay never
// throws on a legacy or imported record; it answers with what the
// record lawfully proves.
// ------------------------------------------------------------
const canon = (value) => String(value ?? '').trim().toLowerCase();

// A list that is not an array proves nothing.
const rows = (list) => (Array.isArray(list) ? list : []);

// Resolve a staged name against the souls the record has declared so far:
// exact canonical match first, then a unique bare-first-name alias — the
// same law the reducer and the dead-speak court follow. An unknown or
// ambiguous name keeps its own written form: a named hand, honestly
// recorded, never guessed into the cast.
function resolveName(known, rawName) {
  const name = canon(rawName);
  if (!name) return null;
  if (known.has(name)) return known.get(name);
  const matches = [];
  for (const [key, sealed] of known) {
    if (key.split(/\s+/)[0] === name && !matches.includes(sealed)) matches.push(sealed);
  }
  return matches.length === 1 ? matches[0] : String(rawName).trim();
}

function replay(campaign) {
  const known = new Map(); // canon name -> sealed display name
  const heroName = typeof campaign?.hero?.name === 'string' ? campaign.hero.name.trim() : '';
  if (heroName) known.set(canon(heroName), heroName);
  const regions = new Set(); // canon region names the record holds
  const souls = new Map(); // sealed name -> { name, last, stood }
  let ground = null; // the standing scene's region, or null before any stands

  const sight = (rawName, index) => {
    if (typeof rawName !== 'string') return; // a name that is not a string proves nothing
    const resolved = resolveName(known, rawName);
    if (!resolved) return;
    let soul = souls.get(resolved);
    if (!soul) { soul = { name: resolved, last: null, stood: new Map() }; souls.set(resolved, soul); }
    soul.last = { ground, index };
    if (ground !== null) soul.stood.set(canon(ground), { ground, index });
  };

  const logs = Array.isArray(campaign?.logs) ? campaign.logs : [];
  logs.forEach((log, index) => {
    if (log?.redacted) return;        // the redaction law outranks all of this
    if (log?.kind === 'tick') return; // offscreen rows are never sightings
    const story = (log?.dm?.story && typeof log.dm.story === 'object' && !Array.isArray(log.dm.story)) ? log.dm.story : {};
    // The world folds first, as the reducer folds it — a region added this
    // turn stands before the scene is set upon it.
    const added = story.world?.region_add?.name;
    if (typeof added === 'string' && added.trim()) regions.add(canon(added));
    // A row's own scene_set stands for that row's sightings — the stage is
    // set before the players speak on it. A scene_set naming a region the
    // record does not hold is refused here as the fold refuses it.
    const set = story.scene_set;
    if (set && typeof set === 'object' && !Array.isArray(set)
      && typeof set.region === 'string' && regions.has(canon(set.region))) {
      ground = set.region.trim();
    }
    // Souls walk on before they speak: cast_add declares, then sights.
    for (const add of rows(story.cast_add)) {
      const name = typeof add?.name === 'string' ? add.name.trim() : '';
      if (!name) continue;
      if (!known.has(canon(name))) known.set(canon(name), name);
      sight(name, index);
    }
    for (const update of rows(story.cast_update)) if (update?.name) sight(update.name, index);
    for (const block of rows(log?.dm?.narration_blocks)) if (block?.speaker) sight(block.speaker, index);
    if (log?.dm?.dialogue_cue?.speaker) sight(log.dm.dialogue_cue.speaker, index);
    for (const add of rows(story.item_add)) if (add?.holder) sight(add.holder, index);
    for (const move of rows(story.item_transfer)) {
      if (move?.from) sight(move.from, index);
      if (move?.to) sight(move.to, index);
    }
    for (const drop of rows(story.item_remove)) if (drop?.holder) sight(drop.holder, index);
    for (const move of rows(story.purse)) if (move?.holder) sight(move.holder, index);
    // The hero is sighted by every non-struck player row — a row that is
    // not even an object proves nothing, not even the hero.
    if (log && typeof log === 'object' && !log.kind && heroName) sight(heroName, index);
  });
  return souls;
}

/** Every sighted soul's last known ground: { name, ground, cite } — ground
 * null when the last sighting landed before any scene stood. A soul absent
 * from this list has no lawful sighting at all: whereabouts unknown. */
export function presenceOf(campaign) {
  return [...replay(campaign).values()]
    .map((soul) => ({ name: soul.name, ground: soul.last?.ground ?? null, cite: soul.last?.index ?? null }))
    .sort((a, b) => ((a.cite ?? 0) - (b.cite ?? 0)) || a.name.localeCompare(b.name));
}

/** Who stands on this ground now (their LAST sighting is here), and who has
 * stood here and moved on — each cited to the journal row that staged them. */
export function visitorsOf(campaign, place) {
  const key = canon(place);
  const standing = [];
  const former = [];
  if (!key) return { standing, former };
  for (const soul of replay(campaign).values()) {
    if (soul.last && soul.last.ground !== null && canon(soul.last.ground) === key) {
      standing.push({ name: soul.name, cite: soul.last.index });
    } else if (soul.stood.has(key)) {
      former.push({ name: soul.name, cite: soul.stood.get(key).index });
    }
  }
  const order = (a, b) => (a.cite - b.cite) || a.name.localeCompare(b.name);
  return { standing: standing.sort(order), former: former.sort(order) };
}
