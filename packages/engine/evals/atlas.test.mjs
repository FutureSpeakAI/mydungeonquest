// THE ATLAS GATE — the Atlas Law holds or this file turns the build red.
// Three courts sit in this one room: placement (the chart remembers),
// reach (the zone is exactly the geometry), aftermath (the world may
// move souls; only the table may end them).
import assert from 'node:assert/strict';
import { parsePlacement, buildAtlas, positionOf, distanceBetween, withinReach, chartModel, worldEventEntry, applyWorldEvent, assertAftermathLawful } from '../src/atlas.js';
import { fixtureCodex } from './fixtures.mjs';

// Relations parse in the fiction's own words.
const parsed = parsePlacement('Half a day north of Harrow Ford, on the coast');
assert.equal(parsed.days, 0.5);
assert.equal(parsed.dir, 'north');
assert.equal(parsed.anchor, 'harrow ford');
assert.equal(parsePlacement('a pleasant spot'), null, 'no relation, no claim');

const regions = [
  { name: 'Harrow Ford', visual: 'A river crossing of black stones' },
  { name: 'Saltmere', place: 'two days east of Harrow Ford, on the coast', visual: 'A harbor town of salt-bleached piers' },
  { name: 'Thornhollow', place: 'half a day north of Harrow Ford', visual: 'A hamlet under thorn trees' },
  { name: 'The Drowned Keep', visual: 'A sunken fortress' }
];
const atlas = buildAtlas({ regions });

// The origin anchors the world; relations resolve to coordinates in days of travel.
assert.deepEqual({ x: positionOf(atlas, 'Harrow Ford').x, y: positionOf(atlas, 'Harrow Ford').y }, { x: 0, y: 0 });
assert.deepEqual({ x: positionOf(atlas, 'Saltmere').x, y: positionOf(atlas, 'Saltmere').y }, { x: 2, y: 0 });
assert.deepEqual({ x: positionOf(atlas, 'Thornhollow').x, y: positionOf(atlas, 'Thornhollow').y }, { x: 0, y: -0.5 });
assert.ok(positionOf(atlas, 'Saltmere').coastal, 'the coast is read from the record');
assert.ok(positionOf(atlas, 'The Drowned Keep'), 'the unplaced still stand somewhere — deterministically');
assert.equal(distanceBetween(atlas, 'Harrow Ford', 'Saltmere'), 2);

// The same regions chart the same world, byte for byte.
const snapshot = (a) => JSON.stringify([...a.positions.entries()]);
assert.equal(snapshot(atlas), snapshot(buildAtlas({ regions })));

// A position locks at first resolution; re-placing is a canon attack.
const attacked = buildAtlas({ regions: [...regions, { name: 'Harrow Ford', place: 'a day south of Saltmere' }] });
assert.equal(attacked.refusals.length, 1);
assert.ok(attacked.refusals[0].reason.includes('canon attack blocked'));
assert.deepEqual({ x: positionOf(attacked, 'Harrow Ford').x, y: positionOf(attacked, 'Harrow Ford').y }, { x: 0, y: 0 }, 'the chart did not move');

// Reach is exactly the geometry — no opinion involved.
const reach = withinReach(atlas, 'Saltmere', 2);
const expected = [...atlas.positions.values()]
  .filter((p) => Math.hypot(p.x - 2, p.y - 0) <= 2 + 1e-9).map((p) => p.name).sort();
assert.deepEqual(reach, expected);
assert.ok(reach.includes('Harrow Ford') && reach.includes('Saltmere'));
assert.ok(!reach.includes('Thornhollow'), 'two days and a hair is out of reach of two days');

// Fog is honest: the chart shows only what the record has witnessed.
const fogged = buildAtlas({ regions, witnessed: ['Harrow Ford', 'saltmere'] });
assert.deepEqual(chartModel(fogged).places.map((p) => p.name).sort(), ['Harrow Ford', 'Saltmere']);
assert.equal(chartModel(atlas).places.length, 4, 'an unfogged atlas shows the whole record');

// The aftermath: scars cite the event; souls in the zone are moved, never ended.
const codex = fixtureCodex();
const event = { ...worldEventEntry({ kind: 'tidal wave', epicenter: 'Saltmere', reach: 2, severity: 'grave', turn: 60 }).world_event, turn: 60 };
const aftermath = applyWorldEvent(atlas, codex, event);
assert.deepEqual(aftermath.zone, reach, 'the affected set is the geometry query');
assert.ok(aftermath.regionOps.every((op) => op.scar_add.includes('tidal wave at Saltmere (t.60)')), 'every scar cites its cause');
const mira = aftermath.soulOps.find((op) => op.name === 'Mira');
assert.ok(mira, 'a soul last seen in the zone is touched by the wave');
assert.ok(!aftermath.soulOps.some((op) => op.name === 'Edda'), 'the dead are beyond the weather');
assert.ok(!aftermath.soulOps.some((op) => op.name === 'Tam'), 'the flooded road is not in the zone');
assert.ok(aftermath.soulOps.every((op) => op.status !== 'dead'), 'the world may move souls; only the table may end them');
if (mira.status === 'missing') assert.ok(mira.last_seen.startsWith('unknown'), 'the missing are lost, not erased');
assert.equal(JSON.stringify(applyWorldEvent(atlas, codex, event)), JSON.stringify(aftermath), 'the same wave breaks the same way');
assert.ok(aftermath.repaint.every((r) => r.brief.includes('anchored on its last plate')), 'places age forward, never reset');

// The court refuses death smuggled in an aftermath.
assert.ok(assertAftermathLawful(aftermath).ok);
const contraband = assertAftermathLawful({ soulOps: [{ name: 'Mira', status: 'dead' }], regionOps: [] });
assert.equal(contraband.ok, false);
assert.ok(contraband.errors[0].includes('only the table may end a soul'));

console.log('PASS \u2014 the atlas gate: relations become coordinates deterministically, positions lock like faces, fog shows only the witnessed, reach is exactly the geometry, scars cite their event, and the world may move souls \u2014 never end them.');
