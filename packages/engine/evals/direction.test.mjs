// THE CHOIR GATE (deterministic floor) — the Choir Law's direction half
// holds or this file turns the build red. The mint half lands with the
// casting phase; this gate guards what already ships: same state, same
// line, same direction — every time.
import assert from 'node:assert/strict';
import { directionFor, directedSpeech } from '../src/direction.js';

// The dead take no direction — refused upstream, refused again here.
assert.equal(directionFor({ soul: { status: 'dead', bond: 4 } }), null);

// The table, row by row.
assert.equal(directionFor({ resolution: { success: true, crit: true } }), 'triumphant, bright');
assert.equal(directionFor({ resolution: { success: true } }), 'steady, lifted');
assert.equal(directionFor({ resolution: { success: false, nat1: true } }), 'shaken');
assert.equal(directionFor({ resolution: { success: false } }), 'strained');
assert.equal(directionFor({ soul: { role: 'villain' } }), 'cold, measured');
assert.equal(directionFor({ soul: { bond: 3, status: 'active' } }), 'warm, close');
assert.equal(directionFor({ soul: { status: 'missing' } }), 'distant, echoing');
assert.equal(directionFor({ isNarrator: true }), 'measured, unhurried');
assert.equal(directionFor({}), 'measured');

// Blight hushes the world, and a direction is at most two tags.
const wary = directionFor({ blight: 5, soul: { bond: 3, status: 'active' }, resolution: { success: true } });
assert.equal(wary, 'steady, lifted; hushed, wary');
assert.ok(wary.split(';').length <= 2, 'two tags, no more — direction, not a monologue');

// Deterministic in its inputs.
const state = { soul: { role: 'villain' }, blight: 4, resolution: { success: false } };
assert.equal(directionFor(state), directionFor(state));

// The speak payload grows additively: without direction it is exactly
// { text, voiceId }; with it, exactly one more field. The door's shape
// grows — it never changes.
const dead = directedSpeech({ text: 'no words', voiceId: 'v1', soul: { status: 'dead' } });
assert.deepEqual(Object.keys(dead).sort(), ['text', 'voiceId']);
const living = directedSpeech({ text: 'The well remembers.', voiceId: 'v2', soul: { bond: 3, status: 'active' } });
assert.deepEqual(Object.keys(living).sort(), ['direction', 'text', 'voiceId']);
assert.equal(living.direction, 'warm, close');
assert.equal(living.text, 'The well remembers.');

console.log('PASS \u2014 the choir gate (floor): direction derives from the record and nowhere else, the dead take none, blight hushes, two tags at most, and the speak payload grows without changing shape.');
