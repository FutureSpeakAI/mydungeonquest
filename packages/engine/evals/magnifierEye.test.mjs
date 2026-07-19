// ------------------------------------------------------------
// THE WARDEN-EYE GATE (TASK 54B §3, engine twin, pure fraction) — the
// magnified look, judged where the instrument itself lives.
//
// Mark examination is two-stage everywhere: stage one boxes the subject's
// head and shoulders as strict JSON; stage two cuts that box at the
// engine's STATED padding and asks the mark question on the crop alone.
// This gate proves the PURE instrument, keyless:
//   1. the briefs are BYTE-STABLE and demand the strict flat JSON, failing
//      closed on doubt; the stated padding is stated;
//   2. the box-validation law is strict at both doors (found:true, real
//      area, inside the frame, finite coordinates; a 2%-overhang clamps);
//   3. the tolerant text readers turn gibberish and unlawful boxes into
//      honest not-founds, and only === true is a sighting;
//   4. the clamp arithmetic is exact on a pinned table, deterministic, and
//      grows a sliver to the minimum edge inside the frame;
//   5. refusal and attestation paths still write their notes — the floor
//      attests unjudged, and painted text twice still REFUSES the plate.
//
// STRIPPED, judged at the table's own gate:
//   - the sharp crop pipeline (byte-stable crop bytes) — sharp is a
//     dependency; the engine is zero-dep and never imports it;
//   - the Foundry composition (fail-closed sighting, boxless→repaint→
//     tolerated-lack, absent/gibberish stage two, the place single-look) —
//     the Foundry is a game-only orchestrator that imports the client db;
//   - the FileReader/fetch scaffolding and fake-indexeddb — browser/store
//     shims the engine has no window for;
//   - the doors-wired source reads (server/index.js, foundry.js,
//     tests/e2e) — those files live only at the table.
// The game addresses the instrument by 'fatescript/magnifier' etc.; here
// we import the engine's true seats directly.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import {
  MAGNIFIER_PADDING, MAGNIFIER_MIN_EDGE,
  boxBrief, markBrief, validateBox, parseBox, parseMark, clampBox,
} from '../src/magnifier.js';
import { mockWarden, wardenRuling } from '../src/warden.js';
import { UNLETTERED_REFUSAL } from '../src/unlettered.js';

// —— 1. The pure instrument. ——
assert.equal(boxBrief(), boxBrief(), 'stage-one brief is byte-stable');
assert.equal(markBrief('a key-shaped burn'), markBrief('a key-shaped burn'), 'stage-two brief is byte-stable');
assert.ok(boxBrief().includes('"found"') && boxBrief().includes('HEAD AND SHOULDERS'), 'stage one demands the strict flat box JSON');
assert.ok(markBrief('x').includes('mark_visible') && markBrief('x').includes('answer false'), 'stage two demands the strict mark JSON and fails closed on doubt');
assert.equal(MAGNIFIER_PADDING, 0.25, 'the stated padding is stated');

// The box-validation law — strict at both doors.
assert.equal(validateBox(null), null);
assert.equal(validateBox({ found: false, x: 0.1, y: 0.1, w: 0.5, h: 0.5 }), null, 'found:false is not a box');
assert.equal(validateBox({ found: true, x: 0.1, y: 0.1, w: 0, h: 0.5 }), null, 'zero area is not a box');
assert.equal(validateBox({ found: true, x: 0.9, y: 0.1, w: 0.5, h: 0.5 }), null, 'off the frame is not a box');
assert.equal(validateBox({ found: true, x: Number.NaN, y: 0.1, w: 0.5, h: 0.5 }), null, 'NaN is not a coordinate');
assert.ok(validateBox({ found: true, x: 0.2, y: 0.1, w: 0.4, h: 0.5 }), 'a lawful box validates');
{
  const clamped = validateBox({ found: true, x: -0.01, y: 0.0, w: 1.0, h: 1.01 });
  assert.ok(clamped && clamped.x === 0 && clamped.y === 0 && clamped.w <= 1 && clamped.h <= 1, 'a 2%-overhang box clamps into the frame');
}
// The tolerant text readers.
assert.deepEqual(parseBox('```json\n{"found":true,"x":0.25,"y":0.1,"w":0.5,"h":0.6}\n```').box, { x: 0.25, y: 0.1, w: 0.5, h: 0.6 }, 'fenced stage-one JSON parses');
assert.equal(parseBox('no subject here, sorry').found, false, 'gibberish is an honest not-found');
assert.equal(parseBox('{"found":true,"x":2,"y":0,"w":0.5,"h":0.5}').found, false, 'an unlawful box is an honest not-found');
assert.equal(parseMark('{"mark_visible":true,"confidence":0.9}').mark_visible, true);
assert.equal(parseMark('{"mark_visible":"yes","confidence":0.9}').mark_visible, false, 'only === true is a sighting');
assert.equal(parseMark('the crop is unclear').mark_visible, false, 'gibberish is never a sighting');

// The clamp arithmetic — exact on a pinned table, twice.
{
  const args = { box: { x: 0.4, y: 0.2, w: 0.2, h: 0.3 }, width: 1000, height: 800 };
  const rect = clampBox(args);
  assert.deepEqual(rect, { left: 350, top: 100, width: 300, height: 360 }, 'the stated padding cuts exactly where the arithmetic says');
  assert.deepEqual(clampBox(args), rect, 'the clamp is deterministic');
}
{
  const sliver = clampBox({ box: { x: 0.5, y: 0.5, w: 0.01, h: 0.01 }, width: 2000, height: 2000 });
  assert.equal(sliver.width, MAGNIFIER_MIN_EDGE, 'a sliver grows to the minimum edge');
  assert.equal(sliver.height, MAGNIFIER_MIN_EDGE);
  assert.ok(sliver.left >= 0 && sliver.top >= 0 && sliver.left + sliver.width <= 2000, 'growth stays inside the frame');
}

// —— 5. The refusal and attestation paths still write their notes. ——
// The floor still attests its blindness; text twice still refuses.
{
  const ruling = wardenRuling(mockWarden(), { attempt: 1 });
  assert.equal(ruling.action, 'pass');
  assert.equal(ruling.attest.warden, 'floor', 'the floor has no eyes and admits it');
  const texty = { same: true, confidence: 0.9, signature_present: true, contains_text_or_watermark: true, drift: [], malformed: false };
  assert.equal(wardenRuling(texty, { attempt: 1 }).action, 'repaint');
  const refused = wardenRuling(texty, { attempt: 2 });
  assert.equal(refused.action, 'refuse');
  assert.equal(refused.attest.reason, UNLETTERED_REFUSAL, 'the refusal still writes its note');
}

console.log('PASS — the warden\u2019s magnified look (engine twin, pure fraction): byte-stable briefs, strict box law, exact clamp arithmetic (sliver grows to the minimum edge inside the frame), the tolerant readers honest, the floor honest, and painted text still refused; the sharp pipeline, the Foundry composition, and the wired doors are judged at the table\u2019s own gate.');
