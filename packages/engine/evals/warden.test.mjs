// THE WARDEN GATE — the Likeness Law's second half holds or this file turns the build red.
import assert from 'node:assert/strict';
import { WARDEN_THRESHOLD, wardenBrief, parseVerdict, mockWarden, wardenRuling } from '../src/warden.js';

assert.equal(WARDEN_THRESHOLD, 0.65);

// The brief: identity verbatim, two images named, one JSON demanded.
const bearing = 'Mira — elder. A grey-eyed healer with rowan-stained hands. Signature: the rowan charm — always visible.';
const brief = wardenBrief({ kind: 'soul', bearingText: bearing });
assert.ok(brief.includes(bearing), 'the locked identity travels verbatim');
assert.ok(brief.includes('IMAGE 1') && brief.includes('blessed anchor'));
assert.ok(brief.includes('"same"') && brief.includes('"signature_present"') && brief.includes('"drift"'));
assert.ok(wardenBrief({ kind: 'region', bearingText: 'Harrow Ford.' }).includes('geography'), 'places are judged as places');

// The parser: tolerant of fences and chatter, honest about gibberish, clamped.
const clean = parseVerdict('{"same": true, "confidence": 0.9, "signature_present": true, "drift": []}');
assert.deepEqual([clean.same, clean.confidence, clean.malformed], [true, 0.9, false]);
const fenced = parseVerdict('Here is my judgment:\n```json\n{"same": false, "confidence": 0.8, "signature_present": true, "drift": ["the eyes turned brown", "younger jawline"]}\n```\nHope that helps!');
assert.equal(fenced.same, false);
assert.deepEqual(fenced.drift, ['the eyes turned brown', 'younger jawline']);
assert.equal(parseVerdict('{"same": true, "confidence": 3.7}').confidence, 1, 'confidence is clamped to one');
assert.equal(parseVerdict('{"same": "true", "confidence": 0.9}').same, false, 'only a true boolean is true');
assert.equal(parseVerdict('{"same": true, "confidence": 0.9, "drift": ["a","b","c","d","e","f","g"]}').drift.length, 5, 'drift notes are capped');
const gibberish = parseVerdict('I cannot really say, they look nice');
assert.ok(gibberish.malformed && gibberish.drift[0].includes('gibberish'));

// The floor is honest about blindness.
const floor = mockWarden();
assert.ok(floor.floor && floor.confidence === 0);
const floorRuling = wardenRuling(floor, { attempt: 1 });
assert.equal(floorRuling.action, 'pass');
assert.equal(floorRuling.attest.warden, 'floor');
assert.ok(floorRuling.attest.note.includes('no eyes'), 'an unjudged pass says so');

// Gibberish: one more look, then the anchor stands in.
assert.equal(wardenRuling(gibberish, { attempt: 1 }).action, 'repaint');
assert.equal(wardenRuling(gibberish, { attempt: 2 }).action, 'anchor');

// Drift: repaint once with the drift in the notes — then THE HOUSE NEVER SHIPS A STRANGER.
const drifted = parseVerdict('{"same": false, "confidence": 0.9, "signature_present": true, "drift": ["the eyes turned brown"]}');
const repaint = wardenRuling(drifted, { attempt: 1 });
assert.equal(repaint.action, 'repaint');
assert.ok(repaint.notes[0].includes('the eyes turned brown') && repaint.notes[0].includes('blessed anchor'));
assert.ok(repaint.notes.length <= 3);
const stranger = wardenRuling(drifted, { attempt: 2 });
assert.equal(stranger.action, 'anchor', 'a second failure ships the anchor, never the stranger');
assert.equal(stranger.attest.warden, 'fallback');
const unsure = parseVerdict('{"same": true, "confidence": 0.4, "signature_present": true, "drift": []}');
assert.equal(wardenRuling(unsure, { attempt: 1 }).action, 'repaint', 'low-confidence sameness is not sameness');

// The signature: repainted once, then tolerated with the lack attested.
const bare = parseVerdict('{"same": true, "confidence": 0.9, "signature_present": false, "drift": []}');
assert.ok(wardenRuling(bare, { attempt: 1 }).notes[0].includes('signature is missing'));
const tolerated = wardenRuling(bare, { attempt: 2 });
assert.equal(tolerated.action, 'pass');
assert.equal(tolerated.attest.signature, false, 'identity is the hard law; the locket is the soft one');

// The happy path, and the same verdict rules the same way twice.
const passed = wardenRuling(clean, { attempt: 1 });
assert.equal(passed.action, 'pass');
assert.equal(passed.attest.confidence, 0.9);
assert.equal(JSON.stringify(wardenRuling(drifted, { attempt: 1 })), JSON.stringify(repaint), 'the ruling is deterministic');

console.log('PASS \u2014 the warden gate: the brief carries the locked identity verbatim, the parser survives fences and names gibberish honestly, the floor admits it has no eyes, drift is repainted once with its notes, the signature is soft law, and a stranger never ships \u2014 the anchor stands in.');
