// THE ATLAS GATE — places and allegiances derive from the sealed record
// only. A place cites the turn that sealed it; an allegiance exists only
// when the soul's written station states it; no presence is ever inferred.
import assert from 'node:assert/strict';
import { placesOf, allegianceOf, allegiancesOf, soulsSwornTo } from '../src/lib/atlas.js';

const campaign = {
  codex: { regions: [
    { name: 'Larkspur Vale', visual: 'terraced orchards under chalk cliffs', state: 'thriving' },
    { name: 'The Tinderfen', visual: 'black reeds and will-o-light', state: 'wounded' }
  ] },
  logs: [
    { player: 'I ask the ferryman about the vale.', dm: { story: { world: { region_add: { name: 'Larkspur Vale' } } } } },
    { redacted: true, player: 'struck', dm: { story: { world: { region_add: { name: 'The Tinderfen' } } } } },
    { player: null, deed: 'Crossed at night', dm: { story: { world: { region_add: { name: 'The Tinderfen' } } } } }
  ]
};
const places = placesOf(campaign);
assert.equal(places.length, 2);
assert.equal(places[0].discoveredTurn, 0, 'a place cites the turn that sealed it');
assert.ok(places[0].gloss.includes('ferryman'), 'and the words that carried it in');
assert.equal(places[1].discoveredTurn, 2, 'a struck turn cannot be the citation');
assert.ok(places[1].gloss.includes('Crossed'), 'a deed serves as the gloss when no words were spoken');

assert.deepEqual(allegianceOf({ role: 'envoy of the Duchy' }), { of: 'the Duchy', provenance: 'station' });
assert.deepEqual(allegianceOf({ role: 'ally', station: 'knight of Greywater Crossing' }), { of: 'Greywater Crossing', provenance: 'station' });
assert.equal(allegianceOf({ role: 'a wandering peddler' }), null, 'no stated house means no edge — never inference');
assert.equal(allegianceOf({ role: 'keeper of the ferry' }), null, 'lowercase objects are not houses');

const cast = [{ name: 'Corin Voss', role: 'envoy of the Duchy' }, { name: 'Edda', role: 'widow' }];
assert.equal(allegiancesOf(cast).length, 1, 'only stated allegiances survive');
assert.equal(soulsSwornTo(cast, 'the duchy')[0].name, 'Corin Voss', 'a place page finds its sworn souls');
assert.equal(soulsSwornTo(cast, 'Larkspur Vale').length, 0);
console.log('PASS — the atlas gate: places cite their sealing turn, allegiances exist only when the written station states them, and nothing is inferred.');
