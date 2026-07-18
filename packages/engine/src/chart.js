// ------------------------------------------------------------
// THE TRAVELER'S CHART (Directive XIV, the Chart Law) — the world map
// drawn only from what the record knows. Medallions are the record's
// own regions with their discovery citations; roads exist ONLY where
// the sealed record proves the party traveled between two grounds —
// the presence replay's travel record, one seat, never re-derived
// here. Each crossing is costed by the calendar fold alone: the day
// standing at the arrival row, less the day standing at the row
// before it. Layout is the atlas fold's own deterministic placement,
// so the same tale always draws the same chart, byte-stable across
// rebuilds. Beyond the known regions the vellum stays blank: the
// record does not guess, so neither does the chart. Pure, keyless,
// zero tokens; nothing here commissions paint.
// ------------------------------------------------------------
import { parsePlacement, buildAtlas, positionOf, placesOf } from './atlas.js';
import { calendarOf } from './calendar.js';
import { travelRecord } from './presence.js';

const canon = (name) => String(name ?? '').trim().toLowerCase();

// A region card's placement phrase: its own `place` first (the protocol
// seam), else its visual when the fiction's words parse. THE ONE SEAT of
// this derivation — the table's ribbon re-exports it, never re-states it.
export function chartRegions(campaign) {
  return (campaign?.codex?.regions || []).map((region) => ({
    ...region,
    place: region.place || (parsePlacement(region.visual) ? region.visual : '')
  }));
}

// The crossing's cost in story days, from the calendar fold alone.
function crossingDays(logs, index) {
  const arrive = calendarOf(logs.slice(0, index + 1)).day;
  const depart = calendarOf(logs.slice(0, index)).day;
  return Math.max(0, arrive - depart);
}

// A cost, spoken: a crossing inside a single day says so plainly.
export function dayLabel(days) {
  if (!Number.isFinite(days) || days <= 0) return 'within the day';
  return days === 1 ? '1 day' : `${days} days`;
}

/** Every road the record sealed: undirected pairs, each carrying its
 * crossings in sealed order with the calendar fold's day cost, and a
 * label speaking each sealed cost in crossing order, identical costs
 * spoken once. Roads exist only where travel does. */
export function travelsOf(campaign) {
  const logs = Array.isArray(campaign?.logs) ? campaign.logs : [];
  const { ground, stands } = travelRecord(campaign);
  const route = [];
  const roads = new Map();
  for (const stand of stands) {
    // The route carries BOTH clocks: `index` is the fold's own pointer into
    // the log array; `turn` is the sealed row's own stamp — the ONLY number
    // a citation may speak, because tick rows shift indexes but never turns.
    route.push({ ground: stand.to, index: stand.index, turn: Number.isInteger(stand.turn) ? stand.turn : null, day: calendarOf(logs.slice(0, stand.index + 1)).day });
    if (stand.from === null) continue; // the first stand arrives from nowhere — no road
    const key = [canon(stand.from), canon(stand.to)].sort().join('::');
    if (!roads.has(key)) roads.set(key, { a: stand.from, b: stand.to, crossings: [] });
    roads.get(key).crossings.push({ from: stand.from, to: stand.to, index: stand.index, days: crossingDays(logs, stand.index) });
  }
  const list = [...roads.values()].map((road) => {
    const labels = [];
    for (const crossing of road.crossings) {
      const word = dayLabel(crossing.days);
      if (!labels.includes(word)) labels.push(word);
    }
    return { ...road, label: labels.join(' · ') };
  }).sort((a, b) => a.crossings[0].index - b.crossings[0].index);
  return { ground: ground ?? null, route, roads: list };
}

/** The chart itself: medallions (the record's regions — name, state,
 * discovery citation, deterministic position, current mark), roads with
 * their day labels and resolved ends, and the played route in order.
 * Nothing stands beyond the known regions. */
export function chartOf(campaign) {
  const atlas = buildAtlas({ regions: chartRegions(campaign) });
  const travels = travelsOf(campaign);
  const medallions = placesOf(campaign).map((place) => {
    const position = positionOf(atlas, place.name);
    return {
      name: place.name,
      state: place.state || 'unmapped',
      discoveredTurn: place.discoveredTurn,
      x: position ? position.x : 0,
      y: position ? position.y : 0,
      current: canon(place.name) === canon(travels.ground ?? '')
    };
  });
  const roads = travels.roads.map((road) => {
    const from = positionOf(atlas, road.a);
    const to = positionOf(atlas, road.b);
    return from && to ? { a: road.a, b: road.b, label: road.label, crossings: road.crossings, x1: from.x, y1: from.y, x2: to.x, y2: to.y } : null;
  }).filter(Boolean);
  return { origin: atlas.origin, medallions, roads, route: travels.route, ground: travels.ground };
}
