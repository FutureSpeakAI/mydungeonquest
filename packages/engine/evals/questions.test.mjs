// THE QUESTIONS GATE (Directive XIII, Law I) — every asked field carries
// its consequence (twin of the table's gate, the pure fraction). The
// plain-speech FIELD MAP is the ONE seat of the asked copy: this gate
// pins every ask byte-for-byte, pins the fast-path order, pins the
// demotions behind the deep doors, and proves the derived shape rule is
// deterministic.
//
// The rendered fractions — the one-seat law scanned across component
// source (that no component carries an ask literal), the headless
// renders of both forge doors proving the components read the map, and
// the X-card dealt as a CARD not a form — are React/component source
// and are judged at the table's own gate; the engine has no forge to
// render.
import assert from 'node:assert/strict';
import {
  FIELD_MAP, XCARD_COPY, fastFields, deepFields, spineFromPromise, titleFromPromise, spineLabel
} from '../src/smith.js';
import { SPINES } from '../src/spines.js';

// —— Law I, the pinned copy: every ask, byte-for-byte. ——
const PINNED = {
  world: {
    spark: 'The three sparks',
    covenant: 'Tell the game your world',
    tone: 'How it feels',
    shape: 'The shape of the promise',
    title: 'Chronicle title',
    spineId: 'Story spine',
    homeRegion: 'Home region',
    linesText: 'Lines — never appear',
    veilsText: 'Veils — fade to black',
    styleBible: 'The world\u2019s look'
  },
  hero: {
    name: 'Their name',
    ancestry: 'Where they come from',
    className: 'Their calling',
    presentation: 'How they present',
    pronouns: 'What words fit them',
    mark: 'The mark that sets them apart',
    keepsake: 'What they carry from home',
    voice: 'Which voice is theirs',
    sigil: 'Sigil',
    bearing: 'Bearing — how the world sees them',
    background: 'Background'
  }
};
for (const scope of ['world', 'hero']) {
  const keys = FIELD_MAP[scope].map((f) => f.key);
  assert.deepEqual(keys.sort(), Object.keys(PINNED[scope]).sort(), `${scope}: the map asks exactly the pinned questions`);
  for (const field of FIELD_MAP[scope]) {
    assert.equal(field.ask, PINNED[scope][field.key], `${scope}.${field.key}: the ask is pinned byte-for-byte`);
    assert.ok(['fast', 'deep', 'derived'].includes(field.door), `${scope}.${field.key}: a lawful door`);
    assert.ok(typeof field.surface === 'string' && field.surface.trim().length > 0, `${scope}.${field.key}: every question names the surface where its answer lands`);
    assert.ok(typeof field.hands === 'string' && field.hands.length > 0, `${scope}.${field.key}: the hands are stated`);
  }
}
assert.equal(XCARD_COPY, 'Tap the X-card at any table and the scene turns away, no questions asked. Lines and veils live behind the Deep Forge door.', 'the X-card copy is pinned');
assert.equal(FIELD_MAP.world.find((f) => f.key === 'covenant').hint, 'One sentence is enough — this is the promise of this world, and Chapter One opens inside it.', 'the promise fine print is pinned');

// —— The fast path asks in the pinned ORDER; the demotions hold. ——
assert.deepEqual(fastFields('world').map((f) => f.key), ['spark', 'covenant', 'tone'], 'the world fast door: sparks, then the promise, then the feel');
assert.deepEqual(fastFields('hero').map((f) => f.key), ['name', 'ancestry', 'className', 'presentation', 'pronouns', 'mark', 'keepsake', 'voice'], 'the hero fast door asks in the pinned order, the voice last');
assert.deepEqual(deepFields('world').map((f) => f.key), ['title', 'spineId', 'homeRegion', 'linesText', 'veilsText', 'styleBible'], 'the world demotions: title, spine, region, lines, veils, look');
assert.deepEqual(deepFields('hero').map((f) => f.key), ['sigil', 'bearing', 'background'], 'the hero demotions: sigil, bearing, background');
assert.equal(FIELD_MAP.world.find((f) => f.key === 'shape').door, 'derived', 'the shape is read, never asked');

// —— The shape of the promise: deterministic, total, and honest. ——
assert.equal(spineFromPromise('Every year one street vanishes and no one remembers it.'), 'mystery');
assert.equal(spineFromPromise('The crown sits in a vault that has never been opened.'), 'heist');
assert.equal(spineFromPromise('The fog eats the roads after dark.'), 'horror-survival');
assert.equal(spineFromPromise('A kingdom of green hills and old promises.'), 'classic-epic');
assert.equal(spineFromPromise(''), 'classic-epic', 'an empty promise still has a shape');
for (const probe of ['The fog eats the roads after dark.', 'A drowned empire where memories are legal tender.']) {
  assert.equal(spineFromPromise(probe), spineFromPromise(probe), 'same promise, same shape, every time');
  assert.ok(SPINES.some((s) => s.id === spineFromPromise(probe)), 'every shape is a real spine');
  assert.ok(typeof spineLabel(spineFromPromise(probe)) === 'string' && spineLabel(spineFromPromise(probe)).length > 0, 'every shape wears a plain label');
}
assert.ok(titleFromPromise('A drowned empire where memories are legal tender.').startsWith('The Tale of '), 'a typed promise names its own tale');
assert.equal(titleFromPromise('so it goes'), 'The Unwritten Road', 'a promise too short to name falls to the standing title');
assert.equal(titleFromPromise('A drowned empire where memories are legal tender.'), titleFromPromise('A drowned empire where memories are legal tender.'), 'the derived title is deterministic');

console.log('PASS — the questions gate (engine twin, pure fraction): every ask pinned byte-for-byte in the one-seat field map with its consequence named, fast-path order and demotions held, and the shape read deterministically from the promise; the one-seat component scan, both doors rendering from the map, and the X-card dealt once as a card are judged at the table\u2019s own gate.');
