// ------------------------------------------------------------
// THE DIRECTION GATE (game) — the Tenor Law's second half, begun
// (Directive V, Choir Law's deterministic floor).
//
// Proves the SEAT through the pure lib: the speak body grows
// additively to { text, voiceId, direction } in the engine's own
// words, the roll and the blight color the line deterministically,
// the dead take no direction, and a directed take caches under its
// own key while an undirected body keeps the standing key
// byte-for-byte. The composer's marks (narrator flag, soul on the
// line) and the roll riding the row are asserted at the source —
// the narrator module itself lives behind browser doors and is not
// imported here. Zero keys, deterministic throughout.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { directionFor } = await import('fatescript/direction');
const { directedBody, directedKey } = await import('../src/lib/cinema/direction.js');

const VILLAIN = { name: 'Brannoc', role: 'villain', status: 'active', bond: 0 };
const ALLY = { name: 'Mira', role: 'ally', status: 'active', bond: 3 };
const DEAD = { name: 'Old Wen', role: 'ally', status: 'dead', bond: 4 };

const proseSeg = { voiceId: 'v-narrator', speaker: null, text: 'Rain hammers the pass.', isNarrator: true };
const villainSeg = { voiceId: 'v-brannoc', speaker: 'Brannoc', text: 'You should not have come.', soul: VILLAIN };
const allySeg = { voiceId: 'v-mira', speaker: 'Mira', text: 'Stay close to me.', soul: ALLY };

// 1. THE BODY GROWS ADDITIVELY, IN THE ENGINE'S OWN WORDS.
{
  const world = { codex: { blight: 0 } };
  const body = directedBody(villainSeg, world, { resolution: null });
  assert.deepEqual(Object.keys(body).sort(), ['direction', 'text', 'voiceId'], 'the shape grows, it never changes');
  assert.equal(body.direction, 'cold, measured');
  assert.equal(body.direction, directionFor({ soul: VILLAIN, blight: 0, resolution: null }), 'the game adds no words of its own');
  assert.equal(body.text, 'You should not have come.');
  assert.equal(body.voiceId, 'v-brannoc');
  assert.equal(directedBody(allySeg, world, {}).direction, 'warm, close', 'a bonded friend sounds like one');
}

// 2. THE ROLL AND THE BLIGHT COLOR THE LINE — deterministically.
{
  const world = { codex: { blight: 0 } };
  const lifted = directedBody(proseSeg, world, { resolution: { success: true } });
  assert.equal(lifted.direction, 'steady, lifted');
  assert.equal(lifted.direction, directedBody(proseSeg, world, { resolution: { success: true } }).direction, 'same state, same line, same direction');
  assert.equal(directedBody(proseSeg, world, { resolution: { success: false, nat1: true } }).direction, 'shaken');
  assert.equal(directedBody(proseSeg, world, {}).direction, 'measured, unhurried', 'an unrolled narrator is measured, unhurried');
  const hushed = directedBody(proseSeg, { codex: { blight: 5 } }, {});
  assert.ok(hushed.direction.includes('hushed'), 'a blighted world speaks warily');
}

// 3. THE DEAD TAKE NO DIRECTION — and the body does not pretend otherwise.
{
  const deadSeg = { voiceId: 'v-wen', speaker: 'Old Wen', text: 'never spoken', soul: DEAD };
  const body = directedBody(deadSeg, { codex: { blight: 0 } }, {});
  assert.deepEqual(Object.keys(body).sort(), ['text', 'voiceId'], 'no direction key is forged for the dead');
}

// 4. THE KEY LAW — an undirected body keeps the standing key byte-for-byte;
//    a directed take earns its own shelf.
{
  const base = 'narration:tale:hash:0:v1';
  assert.equal(directedKey(base, { text: 't', voiceId: 'v1' }), base, 'nothing already cached is orphaned');
  const directed = directedKey(base, { text: 't', voiceId: 'v1', direction: 'warm, close' });
  assert.equal(directed, `${base}:warm, close`);
  assert.notEqual(directed, base, 'a \u2018shaken\u2019 take never replays a \u2018warm\u2019 one');
}

// 5. THE WIRING — the composer marks its speakers, the speak call is
//    directed, the undirected body is gone, the roll rides the row.
{
  const lib = read('src/lib/cinema/direction.js');
  assert.ok(lib.includes('fatescript/direction') && lib.includes('directionFor'), 'the engine\u2019s table is the only direction law');
  const narrator = read('src/lib/cinema/narrator.js');
  assert.ok(narrator.includes('directedBody('), 'the speak call is directed');
  assert.ok(narrator.includes('directedKey('), 'the directed take earns its own shelf');
  assert.ok(narrator.split('isNarrator: true').length - 1 >= 2, 'prose and lead-ins both wear the narrator\u2019s mark');
  assert.ok(narrator.includes('soul: soul || null'), 'the line carries its soul');
  assert.ok(!narrator.includes('JSON.stringify({ text: segment.text, voiceId: segment.voiceId })'), 'the undirected body is gone');
  const app = read('src/App.jsx');
  assert.ok(app.includes('ts: Date.now(), resolution, redacted: false'), 'the roll rides the row the seal already keeps');
}

console.log('PASS \u2014 the direction gate (game): the speak body grows additively to text\u2013voice\u2013direction in the engine\u2019s own deterministic words, the roll and the blight color the line, a bonded friend sounds like one, the dead take no direction, a directed take caches under its own key while undirected keys stand byte-for-byte, and the composer marks narrator and soul at the source.');
