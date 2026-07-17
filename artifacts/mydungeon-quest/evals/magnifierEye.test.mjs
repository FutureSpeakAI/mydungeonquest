// ------------------------------------------------------------
// THE WARDEN-EYE GATE (TASK 54B §3) — the magnified look.
//
// Mark examination is two-stage everywhere: stage one boxes the
// subject's head and shoulders as strict JSON; stage two cuts that box
// with sharp at the engine's STATED padding and asks the mark question
// on the crop alone. This gate proves, keyless:
//   1. the instrument is pure and BYTE-STABLE — briefs build the same
//      bytes twice, the box-validation law is strict, the clamp
//      arithmetic is exact on a pinned table (slivers grow to the
//      minimum edge inside the frame), and the sharp pipeline cuts
//      identical crop bytes twice;
//   2. the engine composes the magnifier's answer FAIL-CLOSED — a
//      boxless, stumbled, absent, or gibberish answer is never a
//      sighting; only found:true + mark_visible:true attests the mark;
//   3. refusal and attestation paths still write their notes — the
//      floor attests unjudged, a magnified sighting attests
//      signature:true with the box beside it, a boxless soul repaints
//      once and then ships with signature:false attested, and painted
//      text twice still REFUSES the plate;
//   4. the wiring is real — the soul brief carries NO signature clause
//      (places keep theirs), the client asks to magnify, the server
//      door holds the two-stage look.
// Headless: node + fake-indexeddb, scripted doors, no AI keys.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import {
  MAGNIFIER_PADDING, MAGNIFIER_MIN_EDGE,
  boxBrief, markBrief, validateBox, parseBox, parseMark, clampBox,
} from 'fatescript/magnifier';
import { wardenBrief, mockWarden, wardenRuling } from 'fatescript/warden';
import { UNLETTERED_REFUSAL } from 'fatescript/unlettered';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

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

// The sharp pipeline — the same ask cuts the same bytes, twice.
{
  const raw = Buffer.alloc(200 * 160 * 3);
  for (let i = 0; i < raw.length; i += 1) raw[i] = (i * 31) % 251;
  const png = await sharp(raw, { raw: { width: 200, height: 160, channels: 3 } }).png().toBuffer();
  const rect = clampBox({ box: { x: 0.3, y: 0.25, w: 0.4, h: 0.5 }, width: 200, height: 160 });
  const cropA = await sharp(png).extract(rect).png().toBuffer();
  const cropB = await sharp(png).extract(rect).png().toBuffer();
  assert.equal(sha256(cropA), sha256(cropB), 'the magnifier pipeline is byte-stable');
}

// —— 2 & 3. The engine composes fail-closed; the notes still land. ——
globalThis.FileReader = class {
  readAsDataURL(blob) {
    blob.arrayBuffer()
      .then((buf) => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`; this.onload?.(); })
      .catch((error) => this.onerror?.(error));
  }
};
const wardenCalls = [];
let wardenScript = [];
globalThis.fetch = async (url, opts = {}) => {
  const target = String(url);
  const body = JSON.parse(opts.body || '{}');
  if (target.endsWith('/api/warden')) {
    wardenCalls.push(body);
    return { ok: true, json: async () => (wardenScript.shift() ?? { floor: true }) };
  }
  throw new Error(`unexpected fetch: ${target}`);
};

const { Foundry } = await import('../src/lib/cinema/foundry.js');
const forge = new Foundry({ campaignId: 'c-eye', tier: 'illuminated', onAttestation: () => {} });
const anchorRow = { blob: new Blob(['the-blessed-anchor'], { type: 'image/png' }), mime: 'image/png' };
const render = new Blob(['a-new-render'], { type: 'image/png' });
const soulPlan = { kind: 'soul', bearingText: 'Wren — reed-thin scout. Distinguishing feature: a key-shaped burn on the left cheek.' };
const likeness = '{"same":true,"confidence":0.9,"contains_text_or_watermark":false,"drift":[]}';

// A magnified sighting: signature true, the box rides the attest.
wardenScript = [{ text: likeness, magnifier: { found: true, box: { left: 10, top: 8, width: 60, height: 72 }, markText: '{"mark_visible":true,"confidence":0.88}' } }];
{
  const verdict = await forge.judge(soulPlan, anchorRow, render);
  assert.equal(verdict.signature_present, true, 'a magnified sighting attests the mark');
  const ruling = wardenRuling(verdict, { attempt: 1 });
  assert.equal(ruling.action, 'pass');
  assert.equal(ruling.attest.signature, true);
  assert.deepEqual(ruling.attest.magnifier, { found: true, box: { left: 10, top: 8, width: 60, height: 72 } }, 'the record shows WHERE the warden looked');
  const sent = wardenCalls.at(-1);
  assert.equal(sent.magnify, true, 'the client asks the two-stage question for souls');
  assert.ok(typeof sent.mark === 'string' && sent.mark.includes('key-shaped'), 'the mark text rides the ask');
  assert.ok(!sent.brief.includes('signature_present'), 'the soul brief no longer asks the mark at scene distance');
}
// Boxless → not-proven → repaint once, then tolerated with the lack attested.
wardenScript = [{ text: likeness, magnifier: { found: false, box: null, markText: '', boxText: 'no clear subject' } }];
{
  const verdict = await forge.judge(soulPlan, anchorRow, render);
  assert.equal(verdict.signature_present, false, 'boxless is never a sighting');
  assert.equal(wardenRuling(verdict, { attempt: 1 }).action, 'repaint', 'the lack buys one repaint');
  const shipped = wardenRuling(verdict, { attempt: 2 });
  assert.equal(shipped.action, 'pass');
  assert.equal(shipped.attest.signature, false, 'the tolerated lack is attested, never laundered');
}
// Absent magnifier (an old door) and gibberish stage two — fail-closed.
wardenScript = [{ text: likeness }];
assert.equal((await forge.judge(soulPlan, anchorRow, render)).signature_present, false, 'an absent magnifier answer is not a sighting');
wardenScript = [{ text: likeness, magnifier: { found: true, box: { left: 0, top: 0, width: 48, height: 48 }, markText: 'hmm, perhaps' } }];
assert.equal((await forge.judge(soulPlan, anchorRow, render)).signature_present, false, 'gibberish stage two is not a sighting');
// A place plan asks no magnifier and keeps its landmark clause.
wardenScript = [{ text: '{"same":true,"confidence":0.9,"signature_present":true,"contains_text_or_watermark":false,"drift":[]}' }];
{
  const verdict = await forge.judge({ kind: 'place', bearingText: 'The vale — a river fork below a broch.' }, anchorRow, render);
  assert.equal(verdict.signature_present, true, 'places keep the single-look landmark answer');
  const sent = wardenCalls.at(-1);
  assert.ok(!sent.magnify, 'geography has no head and shoulders to box');
  assert.ok(sent.brief.includes('signature_present'), 'the place brief keeps its clause');
}
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

// —— 4. The doors are wired. ——
assert.ok(read('server/index.js').includes("from 'fatescript/magnifier'"), 'the server holds the instrument');
assert.ok(read('server/index.js').includes('magnify === true'), 'the server door answers the two-stage ask');
assert.ok(read('src/lib/cinema/foundry.js').includes('parseMark'), 'the foundry composes the magnified answer');
assert.ok(read('tests/e2e/lib/magnifier.ts').includes("from 'fatescript/magnifier'"), 'the proving court holds the identical instrument');

console.log('PASS — the warden\u2019s magnified look: byte-stable briefs, strict box law, exact clamp arithmetic, a byte-stable sharp pipeline, fail-closed composition (boxless, stumbled, absent, and gibberish answers are never sightings), the sighting\u2019s box on the attest, the tolerated lack attested after one repaint, the floor honest, painted text still refused, and both doors wired to the one instrument.');
