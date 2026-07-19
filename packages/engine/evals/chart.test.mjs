// ------------------------------------------------------------
// THE CHART GATE (engine twin, pure fraction) — the Atlas Law's
// first seat (Directive VI, Phase 4 groundwork).
//
// The chart is a projection of the record through the engine's one
// fold: a card whose own words carry a relation is placed by those
// words, positions lock and a re-placement is a canon attack refused
// by name, the unplaced take a deterministic ring, the chart shows
// only what the unstruck narration has witnessed (rumors counted,
// never drawn), and the same record draws the same chart byte for
// byte. Zero keys.
//
// The wiring fraction (the lib compat door, Overlays.jsx drawing the
// ribbon) is React/source-shape law and is judged at the table's own
// gate — the engine seats the fold itself.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { buildAtlas, positionOf, placedRegions, witnessedNames, tableAtlas, chartRibbon } from '../src/atlas.js';

const turn = (id, text, redacted = false) => ({ id, redacted, dm: { narration_blocks: [{ text }] } });
const CAMPAIGN = {
  homeRegion: 'Harrow Ford',
  codex: { regions: [
    { name: 'Harrow Ford', visual: 'A river crossing of black stones' },
    { name: 'Saltmere', visual: 'A harbor town, two days east of Harrow Ford, on the coast' },
    { name: 'Thornhollow', visual: 'A hamlet, half a day north of Harrow Ford, under thorn trees' },
    { name: 'The Drowned Keep', visual: 'A sunken fortress no road claims' }
  ] },
  logs: [
    turn('t1', 'The road bends toward Saltmere and its salt-bleached piers.'),
    turn('t2', 'Thornhollow waits under its thorns.', true)
  ]
};

// 1. THE FICTION'S OWN WORDS PLACE THE CARD — days of travel, locked
//    coordinates, the coast read from the record.
{
  const regions = placedRegions(CAMPAIGN);
  assert.equal(regions[1].place, regions[1].visual, 'a card whose words carry a relation is placed by them');
  assert.equal(regions[0].place, '', 'no relation, no claim');
  const atlas = tableAtlas(CAMPAIGN);
  assert.deepEqual({ x: positionOf(atlas, 'Harrow Ford').x, y: positionOf(atlas, 'Harrow Ford').y }, { x: 0, y: 0 }, 'the home region anchors the world');
  assert.deepEqual({ x: positionOf(atlas, 'Saltmere').x, y: positionOf(atlas, 'Saltmere').y }, { x: 2, y: 0 }, 'two days east is two days east');
  assert.ok(positionOf(atlas, 'Saltmere').coastal, 'the coast is read, not guessed');
  assert.ok(positionOf(atlas, 'The Drowned Keep'), 'the unplaced still stand somewhere — deterministically');
  assert.ok(positionOf(atlas, 'The Drowned Keep').by.includes('unplaced'), 'and the chart says so honestly');
}

// 2. POSITIONS LOCK LIKE FACES — one name holds one place, and a
//    conflicting placement is a canon attack refused by name. (The
//    codex itself dedupes names at region_add, so a duplicate card can
//    only arrive as an attack — and the chart never draws two of it.)
{
  const attacked = {
    ...CAMPAIGN,
    codex: { regions: [...CAMPAIGN.codex.regions, { name: 'Saltmere', visual: 'A harbor town, four days west of Harrow Ford' }] }
  };
  const atlas = tableAtlas(attacked);
  const spots = [...atlas.positions.values()].filter((place) => place.name === 'Saltmere');
  assert.equal(spots.length, 1, 'one name, one place — never two Saltmeres on the chart');
  assert.ok(atlas.refusals.some((r) => r.reason.includes('canon attack blocked')), 'refused by name');
}

// 3. THE FOG IS HONEST — only what the unstruck narration witnessed is
//    drawn; a struck row witnesses nothing; rumors are counted.
{
  const witnessed = witnessedNames(CAMPAIGN);
  assert.ok(witnessed.has('Harrow Ford') && witnessed.has('Saltmere'));
  assert.ok(!witnessed.has('Thornhollow'), 'a struck row witnesses nothing');
  assert.ok(!witnessed.has('The Drowned Keep'), 'a card never spoken is a rumor');
  const ribbon = chartRibbon(CAMPAIGN);
  assert.equal(ribbon.origin, 'Harrow Ford');
  assert.deepEqual(ribbon.lines, ['Saltmere — 2 days out, on the coast'], 'the ribbon speaks days of travel');
  assert.equal(ribbon.fogged, 2, 'rumors counted, never drawn');
}

// 4. THE SAME RECORD DRAWS THE SAME CHART — byte for byte, ring and all.
{
  assert.equal(JSON.stringify(chartRibbon(CAMPAIGN)), JSON.stringify(chartRibbon(CAMPAIGN)));
  const a = positionOf(tableAtlas(CAMPAIGN), 'The Drowned Keep');
  const b = positionOf(tableAtlas(CAMPAIGN), 'The Drowned Keep');
  assert.deepEqual({ x: a.x, y: a.y }, { x: b.x, y: b.y }, 'the ring never wanders');
}

// 5. AN EMPTY WORLD DRAWS NOTHING — never an invented map.
{
  const bare = chartRibbon({ codex: { regions: [] }, logs: [] });
  assert.equal(bare.origin, null);
  assert.deepEqual(bare.lines, []);
}

console.log('PASS \u2014 the chart gate (engine twin, pure fraction): a card placed by its own words resolves to locked coordinates in days of travel, a re-placement is a canon attack refused by name, the unplaced take a ring that never wanders, the chart draws only what the unstruck narration witnessed with rumors counted honestly, an empty world draws nothing, and the fold speaks its own chart; the folio\u2019s ribbon is judged at the table\u2019s own gate.');
