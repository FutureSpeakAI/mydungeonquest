// ------------------------------------------------------------
// THE CHART at the table — the Atlas Law's first seat
// (Directive VI, Phase 4 groundwork).
//
// The map is data before it is a picture, and the data is already
// in the record: a region card whose own words carry a relation
// ("two days east of Harrow Ford, on the coast") is placed by those
// words through the engine's one fold (fatescript/atlas); positions
// lock like faces; re-placing a placed region is a canon attack,
// refused by name. Cards whose words carry no relation take the
// deterministic ring — a bearing given by the chart and honestly
// labeled as such.
//
// Fog is honest by construction: the chart shows only what the
// unstruck record has witnessed — the home region, and every place
// the narration has actually spoken of. A card added but never yet
// named at the table is a rumor, counted but not drawn. When the
// protocol later grants region_add its own `place` field, that word
// wins; these derivations only fill silence.
// ------------------------------------------------------------
import { parsePlacement, buildAtlas, chartModel, positionOf, distanceBetween } from 'fatescript/atlas';

// A card's placement phrase: its own `place` first (the future
// protocol seam), else its visual when the fiction's words parse.
export function placedRegions(campaign) {
  return (campaign?.codex?.regions || []).map((region) => ({
    ...region,
    place: region.place || (parsePlacement(region.visual) ? region.visual : '')
  }));
}

// Witness: the home region, plus every region the unstruck narration
// has actually named. Struck rows witness nothing.
export function witnessedNames(campaign) {
  const names = new Set();
  const home = campaign?.homeRegion || campaign?.codex?.regions?.[0]?.name;
  if (home) names.add(home);
  const spoken = (campaign?.logs || [])
    .filter((log) => log && !log.redacted)
    .flatMap((log) => log.dm?.narration_blocks || [])
    .map((block) => String(block?.text || '').toLowerCase())
    .join(' ');
  for (const region of campaign?.codex?.regions || []) {
    if (region?.name && spoken.includes(String(region.name).toLowerCase())) names.add(region.name);
  }
  return names;
}

export function tableAtlas(campaign) {
  return buildAtlas({ regions: placedRegions(campaign), witnessed: witnessedNames(campaign) });
}

const dayWords = (days) => {
  if (days === 0.5) return 'half a day out';
  if (days === 1) return 'a day out';
  return `${+days.toFixed(1)} days out`;
};

// The folio's ribbon: the witnessed chart, spoken — origin first, every
// other witnessed place with its distance in days of travel, and the
// rumors counted honestly.
export function chartRibbon(campaign) {
  const atlas = tableAtlas(campaign);
  const chart = chartModel(atlas);
  const lines = chart.places
    .filter((place) => place.name !== chart.origin)
    .map((place) => `${place.name} — ${dayWords(distanceBetween(atlas, chart.origin, place.name) ?? 0)}${place.coastal ? ', on the coast' : ''}`);
  return {
    origin: chart.origin,
    lines,
    fogged: atlas.positions.size - chart.places.length,
    refusals: atlas.refusals
  };
}

export { positionOf };

// Directive V — the atlas of places and stated allegiances lives in the
// engine; the chart re-speaks it for the codex pages and the gates.
export { placesOf, allegianceOf, allegiancesOf, soulsSwornTo } from 'fatescript/atlas';
