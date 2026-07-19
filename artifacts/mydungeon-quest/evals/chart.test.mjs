// ------------------------------------------------------------
// THE CHART GATE (game) — the Atlas Law's first seat
// (Directive VI, Phase 4 groundwork).
//
// The folio's chart is a projection of the record through the
// engine's one fold: a card whose own words carry a relation is
// placed by those words, positions lock and a re-placement is a
// canon attack refused by name, the unplaced take a deterministic
// ring, the chart shows only what the unstruck narration has
// witnessed (rumors counted, never drawn), and the same record
// draws the same chart byte for byte. Zero keys.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { buildAtlas, positionOf } = await import('fatescript/atlas');
const { placedRegions, witnessedNames, tableAtlas, chartRibbon } = await import('../src/lib/atlas.js');

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

// 6. THE WIRING — the engine's fold under the lib, the ribbon on the folio.
{
  const lib = read('src/lib/atlas.js');
  // The parity cut seated the chart's table half home: the lib is the
  // engine's door, whole — and the re-speak of the one seat (Task 58C)
  // now lives beside the fold itself, in the engine's own atlas.
  assert.ok(lib.includes("export * from 'fatescript/atlas'"), 'the engine\u2019s atlas is the only fold');
  assert.ok(!lib.includes('function'), 'no second parse hides behind the door');
  const engineAtlas = read('../../packages/engine/src/atlas.js');
  assert.ok(engineAtlas.includes('chartRegions as placedRegions'), 'the one seat re-speaks the chart fold, never a second parse');
  assert.ok(engineAtlas.includes('parsePlacement'), 'placement is parsed, never guessed');
  const overlays = read('src/components/Overlays.jsx');
  assert.ok(overlays.includes('chartRibbon'), 'the folio draws the chart');
  assert.ok(overlays.includes('The chart —'), 'the ribbon is seated');
  assert.ok(overlays.includes('not yet witnessed'), 'rumors are named to the patron');
}

console.log('PASS \u2014 the chart gate (game): a card placed by its own words resolves to locked coordinates in days of travel, a re-placement is a canon attack refused by name, the unplaced take a ring that never wanders, the chart draws only what the unstruck narration witnessed with rumors counted honestly, an empty world draws nothing, and the folio\u2019s ribbon speaks the fold\u2019s own chart.');
