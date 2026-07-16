// ------------------------------------------------------------
// THE ATLAS — the Atlas Law (Directive VI).
//
// The map is data before it is a picture. Locations enter the record in
// the fiction's own words — "half a day north of Harrow Ford, on the
// coast" — because the model is bad at coordinates and good at
// relations. The atlas reducer resolves those relations into
// deterministic coordinates measured in DAYS OF TRAVEL (the map's unit
// is time, which is what a road costs). A position locks at first
// resolution exactly as a face does; re-placing a placed region is a
// canon attack, refused and recorded. The chart shows only what the
// record has witnessed — fog of war, honest by construction — and
// "which places did the wave reach" is a geometry query, never a model
// opinion.
//
// One law above all of it: THE WORLD MAY MOVE SOULS; ONLY THE TABLE MAY
// END THEM. An aftermath may wound, ruin, scatter, and lose — it may
// not kill. 'Missing' is the lawful offscreen state, and finding the
// missing is story the event just wrote.
// ------------------------------------------------------------

const clean = (value, cap = 100) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, cap);
const canon = (name) => clean(name).toLowerCase();

// Deterministic fallback bearing for the unplaced: a stable hash walks
// them onto a ring, so an atlas without placement phrases still resolves
// the same chart every replay.
const hashOf = (text) => { let h = 5381; for (const ch of String(text)) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0; return h; };

export const DIRECTIONS = {
  north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0],
  northeast: [0.7071, -0.7071], northwest: [-0.7071, -0.7071],
  southeast: [0.7071, 0.7071], southwest: [-0.7071, 0.7071]
};

const DISTANCE_WORDS = { 'half a day': 0.5, 'a day': 1, 'one day': 1, 'two days': 2, 'three days': 3, 'four days': 4, 'five days': 5, 'six days': 6, 'a week': 7 };

// "half a day north of Harrow Ford" → { days, dir, anchor }.
export function parsePlacement(text = '') {
  const phrase = clean(text, 200).toLowerCase();
  if (!phrase) return null;
  const match = phrase.match(/(half a day|one day|a day|two days|three days|four days|five days|six days|a week|\d+(?:\.\d+)?\s*days?)\s+(north|south|east|west|northeast|northwest|southeast|southwest)\s+of\s+(.+?)(?:,|$)/);
  if (!match) return null;
  const days = DISTANCE_WORDS[match[1]] ?? parseFloat(match[1]);
  return { days, dir: match[2], anchor: clean(match[3]) };
}

// The fold: origin is the first region; relations resolve against locked
// anchors; the unplaced take the ring. Positions lock at first
// resolution; a differing later placement is a canon attack.
export function buildAtlas({ regions = [], witnessed = null } = {}) {
  const atlas = { positions: new Map(), refusals: [], origin: regions[0] ? clean(regions[0].name) : null };
  if (regions[0]) atlas.positions.set(canon(regions[0].name), { name: clean(regions[0].name), x: 0, y: 0, by: 'origin', coastal: /coast|harbor|harbour|port|shore/i.test(`${regions[0].place || ''} ${regions[0].visual || ''}`) });
  const resolved = (name) => atlas.positions.get(canon(name));
  let pass = 0;
  const queue = [...regions];
  while (queue.length && pass < regions.length + 2) {
    pass += 1;
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      const region = queue[i];
      const key = canon(region.name);
      const placement = parsePlacement(region.place);
      let position = null;
      if (placement && resolved(placement.anchor)) {
        const anchor = resolved(placement.anchor);
        const [dx, dy] = DIRECTIONS[placement.dir];
        position = { x: +(anchor.x + dx * placement.days).toFixed(3), y: +(anchor.y + dy * placement.days).toFixed(3), by: `placed — ${clean(region.place, 120)}` };
      } else if (!placement && pass > 1) {
        const angle = (hashOf(key) % 360) * (Math.PI / 180);
        const ring = 1.5 + (hashOf(key) % 3);
        position = { x: +(Math.cos(angle) * ring).toFixed(3), y: +(Math.sin(angle) * ring).toFixed(3), by: 'unplaced — given a bearing by the chart' };
      }
      if (!position) continue; // waits for its anchor on a later pass
      if (atlas.positions.has(key)) {
        if (placement) atlas.refusals.push({ name: region.name, reason: 'canon attack blocked: the chart remembers where this stands' });
      } else {
        atlas.positions.set(key, { name: clean(region.name), ...position, coastal: /coast|harbor|harbour|port|shore/i.test(`${region.place || ''} ${region.visual || ''}`) });
      }
      queue.splice(i, 1);
    }
  }
  atlas.witnessed = witnessed ? new Set([...witnessed].map(canon)) : null;
  return atlas;
}

export function positionOf(atlas, name) { return atlas.positions.get(canon(name)) || null; }

export function distanceBetween(atlas, a, b) {
  const from = positionOf(atlas, a); const to = positionOf(atlas, b);
  if (!from || !to) return null;
  return +Math.hypot(to.x - from.x, to.y - from.y).toFixed(3);
}

// The geometry query the aftermath stands on: exactly the places within
// reach, no opinion involved.
export function withinReach(atlas, epicenter, reachDays) {
  const center = positionOf(atlas, epicenter);
  if (!center) return [];
  return [...atlas.positions.values()]
    .filter((place) => Math.hypot(place.x - center.x, place.y - center.y) <= reachDays + 1e-9)
    .map((place) => place.name)
    .sort();
}

// The chart the compositor and the folio draw: only what the record has
// witnessed. Fog is honest because the unwitnessed simply is not here.
export function chartModel(atlas) {
  const places = [...atlas.positions.values()].filter((place) => !atlas.witnessed || atlas.witnessed.has(canon(place.name)));
  return { origin: atlas.origin, places: places.map(({ name, x, y, coastal }) => ({ name, x, y, coastal })) };
}

// A sealed world event. Ordinary record: kind 'world_event', dm envelope empty.
export function worldEventEntry({ kind, epicenter, reach = 1, severity = 'grave', turn = 0 } = {}) {
  return {
    id: (globalThis.crypto?.randomUUID?.() || `event-${turn}-${Math.random().toString(36).slice(2)}`),
    kind: 'world_event', turn,
    world_event: { kind: clean(kind, 60), epicenter: clean(epicenter), reach: Math.max(0, Number(reach) || 0), severity: clean(severity, 20) },
    player: null, sent: null, deed: null, resolution: null, redacted: false, ts: Date.now(),
    dm: { narration_blocks: [], suggestions: [], roll_request: null, state_updates: null, combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [] }
  };
}

// The aftermath: pure ops, every one citing the event. Regions in reach
// gain a scar; souls last seen there are moved — wounded, displaced, or
// missing by deterministic severity — NEVER killed. An op that tries to
// carry death out of a world event is refused by the court below.
export function applyWorldEvent(atlas, codex, event) {
  const zone = withinReach(atlas, event.epicenter, event.reach);
  const cite = `${event.kind} at ${event.epicenter} (t.${event.turn ?? 0})`;
  const regionOps = zone.map((name) => ({ name, scar_add: `Scarred by the ${cite} — ${event.severity}.` }));
  const soulOps = [];
  for (const soul of codex?.cast || []) {
    if (soul.status !== 'active') continue;
    const home = clean(soul.last_seen || '');
    if (!zone.some((name) => canon(home).includes(canon(name)))) continue;
    const grave = event.severity === 'grave' && hashOf(`${soul.name}::${event.kind}`) % 3 === 0;
    soulOps.push(grave
      ? { name: soul.name, status: 'missing', fact_add: `Missing since the ${cite}.`, last_seen: `unknown — last seen at ${home}` }
      : { name: soul.name, fact_add: `Bears the mark of the ${cite}.`, last_seen: home });
  }
  return { zone, regionOps, soulOps, repaint: zone.map((name) => ({ name, brief: `the same place, after the ${event.kind} — anchored on its last plate, scars visible, identity held` })) };
}

// The court: only the table may end a soul. Any aftermath op carrying
// death is contraband.
export function assertAftermathLawful(aftermath) {
  const errors = [];
  for (const op of aftermath.soulOps || []) {
    if (op.status === 'dead') errors.push(`the world tried to kill ${op.name} — only the table may end a soul`);
  }
  for (const op of aftermath.regionOps || []) {
    if (!op.scar_add || !/\(t\.\d+\)/.test(op.scar_add)) errors.push(`a scar without a citation on ${op.name}`);
  }
  return { ok: errors.length === 0, errors };
}

// ------------------------------------------------------------
// THE ATLAS OF PLACES (Directive V) — places and stated allegiances,
// replayed from the sealed record; lifted whole from the Hooked World
// cut. Nothing here is inferred from prose.
// ------------------------------------------------------------
const canonAtlas = (name) => String(name || '').trim().toLowerCase();

// Every region, with the turn and the words that carried it into the tale.
export function placesOf(campaign) {
  const logs = campaign?.logs || [];
  const seen = new Map();
  logs.forEach((log, index) => {
    if (log.redacted) return;
    const add = log?.dm?.story?.world?.region_add;
    if (add?.name && !seen.has(canonAtlas(add.name))) {
      seen.set(canonAtlas(add.name), { discoveredTurn: index, gloss: String(log.player || log.deed || '').slice(0, 90) });
    }
  });
  return (campaign?.codex?.regions || []).map((region) => ({
    name: region.name,
    visual: region.visual,
    state: region.state,
    discoveredTurn: seen.get(canonAtlas(region.name))?.discoveredTurn ?? null,
    gloss: seen.get(canonAtlas(region.name))?.gloss || ''
  }));
}

// Stated allegiances only: the written station says "of the X" and we
// record exactly that, with provenance, cited to the introducing turn.
const ALLEGIANCE_RE = /\bof (the [A-Z][\w'’-]+(?: [A-Z][\w'’-]+)?|[A-Z][\w'’-]+(?: [A-Z][\w'’-]+)?)/;

export function allegianceOf(soul) {
  const station = `${soul?.role || ''} ${soul?.station || ''}`;
  const match = station.match(ALLEGIANCE_RE);
  return match ? { of: match[1], provenance: 'station' } : null;
}

export function allegiancesOf(cast = []) {
  return cast.map((soul) => {
    const allegiance = allegianceOf(soul);
    return allegiance ? { name: soul.name, ...allegiance } : null;
  }).filter(Boolean);
}

// Souls whose stated station names this place — the only lawful backlink.
export function soulsSwornTo(cast = [], placeName) {
  const target = canonAtlas(placeName);
  return allegiancesOf(cast).filter((edge) => canonAtlas(edge.of).includes(target) || target.includes(canonAtlas(edge.of)));
}
