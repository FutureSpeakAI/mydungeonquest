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
// THE PARTY AND THE ELSEWHERE (Directive VIII) — the same replay now
// carries the traveling party: party_join seats a KNOWN soul (an unknown
// name proves nothing), a lawful CHANGE of scene sights every standing
// member on the new ground (the party travels as one), and party_leave
// pins the departed soul at remains_at when the record holds that
// region, else at the standing ground. Party operations are the row's
// FINAL word on its members' ground — a farewell spoken in the leaving
// turn does not un-pin the leaver.
//
// FAIL-CLOSED (the architect's cut, 56.6): a substructure that is not
// the shape the law names — a list that is not an array, a name that is
// not a string — proves nothing and is skipped whole. The replay never
// throws on a legacy or imported record; it answers with what the
// record lawfully proves.
// ------------------------------------------------------------
import { canonName } from './names.js';

// THE ROAD'S OWN CANON (the architect's round): the replay folds names
// and grounds with the ONE canon every alias surface shares — case,
// whitespace, Unicode form, and invisible riders can never twin a soul
// or a ground into a second row.
const canon = canonName;

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

// THE FOLD'S OWN SEATS (Directive XX, Law VI — the Waypost Law): the
// replay is split into a state, a per-row step, and the walk, so a
// checkpoint may carry the state and resume it — ONE body of law, walked
// whole here and in stretches by the waypost. No behavior moved.
export function presenceState(campaign) {
  const known = new Map(); // canon name -> sealed display name
  const heroName = typeof campaign?.hero?.name === 'string' ? campaign.hero.name.trim() : '';
  if (heroName) known.set(canon(heroName), heroName);
  return {
    known,
    heroName,
    regions: new Set(), // canon region names the record holds
    souls: new Map(), // sealed name -> { name, last, stood }
    party: new Map(), // canon name -> { name, index } cited to the joining row
    ground: null, // the standing scene's region, or null before any stands
    stands: [] // every lawful CHANGE of ground, in sealed order (Directive XIV)
  };
}

// A sighting at an explicit ground — the leave pin's door. `turn` is the
// row's own turn number when the row carries one, else null; it is a
// SECOND clock and is never mixed with the row index.
function sightAtState(state, rawName, index, turn, at) {
  if (typeof rawName !== 'string') return; // a name that is not a string proves nothing
  const resolved = resolveName(state.known, rawName);
  if (!resolved) return;
  let soul = state.souls.get(resolved);
  if (!soul) { soul = { name: resolved, last: null, stood: new Map() }; state.souls.set(resolved, soul); }
  soul.last = { ground: at, index, turn };
  if (at !== null) soul.stood.set(canon(at), { ground: at, index });
}

export function foldPresenceRow(state, log, index) {
  const { known, regions, party, stands } = state;
  const heroName = state.heroName;
  const sightAt = (rawName, i, turn, at) => sightAtState(state, rawName, i, turn, at);
  {
    if (log?.redacted) return;        // the redaction law outranks all of this
    if (log?.kind === 'tick') return; // offscreen rows are never sightings
    const turnStamp = Number.isInteger(log?.turn) ? log.turn : null;
    const sight = (rawName) => sightAt(rawName, index, turnStamp, state.ground);
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
      const nextGround = set.region.trim();
      const moved = canon(nextGround) !== canon(state.ground ?? '');
      // THE TRAVEL RECORD (Directive XIV, the Chart Law) — a lawful CHANGE
      // of standing ground is the only travel the record knows; the chart
      // fold reads these stands and re-derives nothing. A restatement of
      // the standing ground records nothing here, exactly as it moves
      // nobody below. `from` is null at the first stand: an arrival from
      // nowhere is a beginning, never a road.
      if (moved) stands.push({ from: state.ground, to: nextGround, index, turn: turnStamp });
      state.ground = nextGround;
      // The party travels as one (VIII.4): a lawful CHANGE of ground
      // sights every standing member on the new ground, cited to the
      // travel row. A restatement moves nobody.
      if (moved) for (const member of party.values()) sight(member.name);
    }
    // Souls walk on before they speak: cast_add declares, then sights.
    for (const add of rows(story.cast_add)) {
      const name = typeof add?.name === 'string' ? add.name.trim() : '';
      if (!name) continue;
      if (!known.has(canon(name))) known.set(canon(name), name);
      sight(name);
    }
    for (const update of rows(story.cast_update)) {
      if (!update?.name) continue;
      sight(update.name);
      // THE ALIAS LEDGER (Directive XXI): a sealed epithet joins the
      // known map at its soul's own seat, so every later sighting under
      // the alias lands on the ONE soul. The map is presence STATE, not
      // a second resolver — the matching law lives on the name road.
      // First claim stands; a name the record never declared seats
      // nothing (junk proves nothing).
      const alias = typeof update.known_as_add === 'string' ? update.known_as_add.replace(/\s+/g, ' ').trim() : '';
      if (alias) {
        const owner = resolveName(known, update.name);
        if (owner && !known.has(canon(alias))) known.set(canon(alias), owner);
      }
    }
    for (const block of rows(log?.dm?.narration_blocks)) if (block?.speaker) sight(block.speaker);
    if (log?.dm?.dialogue_cue?.speaker) sight(log.dm.dialogue_cue.speaker);
    for (const add of rows(story.item_add)) if (add?.holder) sight(add.holder);
    for (const move of rows(story.item_transfer)) {
      if (move?.from) sight(move.from);
      if (move?.to) sight(move.to);
    }
    for (const drop of rows(story.item_remove)) if (drop?.holder) sight(drop.holder);
    for (const move of rows(story.purse)) if (move?.holder) sight(move.holder);
    // The hero is sighted by every non-struck player row — a row that is
    // not even an object proves nothing, not even the hero.
    if (log && typeof log === 'object' && !log.kind && heroName) sight(heroName);
    // THE PARTY (VIII.4) — processed LAST, the row's final word on its
    // members' ground. A join seats a KNOWN soul standing at the scene; a
    // name the record has never declared proves nothing. The hero is the
    // root and is never a member. A leave pins the departed soul at
    // remains_at when the record holds that region, else at the standing
    // ground — so a farewell spoken in the leaving turn cannot un-pin the
    // leaver.
    const join = story.party_join;
    if (join && typeof join === 'object' && !Array.isArray(join) && typeof join.name === 'string') {
      const resolved = resolveName(known, join.name);
      if (resolved && known.has(canon(resolved)) && canon(resolved) !== canon(heroName)) {
        if (!party.has(canon(resolved))) party.set(canon(resolved), { name: resolved, index });
        sight(resolved);
      }
    }
    const leave = story.party_leave;
    if (leave && typeof leave === 'object' && !Array.isArray(leave) && typeof leave.name === 'string') {
      const resolved = resolveName(known, leave.name);
      if (resolved && party.has(canon(resolved))) {
        party.delete(canon(resolved));
        const pinned = typeof leave.remains_at === 'string' && regions.has(canon(leave.remains_at))
          ? leave.remains_at.trim()
          : state.ground;
        sightAt(resolved, index, turnStamp, pinned);
      }
    }
  }
}

function replay(campaign) {
  const state = presenceState(campaign);
  const logs = Array.isArray(campaign?.logs) ? campaign.logs : [];
  logs.forEach((log, index) => foldPresenceRow(state, log, index));
  return state;
}

/** THE TRAVEL RECORD (Directive XIV, the Chart Law) — the standing ground
 * and every lawful change of ground in sealed order: { from, to, index,
 * turn }, `from` null at the first stand. This is the ONE seat of the
 * scene law's travel reading; the chart fold consumes it and derives no
 * ground of its own. Struck rows, tick rows, unknown regions, and
 * restatements prove nothing — the same doors the presence replay already
 * holds. */
export function travelRecord(campaign) {
  const { ground, stands } = replay(campaign);
  return { ground, stands };
}

/** Every sighted soul's last known ground: { name, ground, cite } — ground
 * null when the last sighting landed before any scene stood. A soul absent
 * from this list has no lawful sighting at all: whereabouts unknown. */
export function presenceOf(campaign) {
  return [...replay(campaign).souls.values()]
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
  for (const soul of replay(campaign).souls.values()) {
    if (soul.last && soul.last.ground !== null && canon(soul.last.ground) === key) {
      standing.push({ name: soul.name, cite: soul.last.index });
    } else if (soul.stood.has(key)) {
      former.push({ name: soul.name, cite: soul.stood.get(key).index });
    }
  }
  const order = (a, b) => (a.cite - b.cite) || a.name.localeCompare(b.name);
  return { standing: standing.sort(order), former: former.sort(order) };
}

/** The traveling party as the sealed record proves it: { name, cite } per
 * member, cited to the joining row, in joining order. The hero is the
 * party's permanent root and is never listed. */
export function partyOf(campaign) {
  return [...replay(campaign).party.values()]
    .map(({ name, index }) => ({ name, cite: index }))
    .sort((a, b) => (a.cite - b.cite) || a.name.localeCompare(b.name));
}

/** THE ELSEWHERE (VIII.5): every sighted soul who is NOT the hero, NOT a
 * party member, and whose last KNOWN ground is not the standing scene —
 * { name, ground, cite, sinceTurn }, most recently cited first. sinceTurn
 * is the sighting row's own turn number or null (two clocks, never
 * mixed); a soul with unknown ground is honestly absent, and before any
 * scene stands nobody is elsewhere of nowhere. */
export function elsewhereOf(campaign) {
  const { souls, party, ground } = replay(campaign);
  if (ground === null) return [];
  const heroName = typeof campaign?.hero?.name === 'string' ? campaign.hero.name.trim() : '';
  const out = [];
  for (const soul of souls.values()) {
    if (heroName && canon(soul.name) === canon(heroName)) continue;
    if (party.has(canon(soul.name))) continue;
    const at = soul.last && typeof soul.last.ground === 'string' ? soul.last.ground : null;
    if (!at || canon(at) === canon(ground)) continue;
    out.push({ name: soul.name, ground: at, cite: soul.last.index, sinceTurn: Number.isInteger(soul.last.turn) ? soul.last.turn : null });
  }
  return out.sort((a, b) => (b.cite - a.cite) || a.name.localeCompare(b.name));
}
