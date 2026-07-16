// ------------------------------------------------------------
// THE WARDEN-EYES GATE — Directive VI, Phase 13.
//
// The Sitting accepts a face; the Warden keeps it. This gate proves
// the WIRING: the foundry judges every post-anchor soul render beside
// its anchor — a pass ships with the verdict attested, drift repaints
// ONCE with the notes appended to the prompt, a second drift ships
// the anchor itself (the house never ships a stranger, and no
// colliding bytes are minted), the keyless floor attests its
// blindness, and renders with no anchor to betray owe nothing.
// Headless: node + fake-indexeddb, scripted doors, no AI keys.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockWarden, wardenRuling } from 'fatescript/warden';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

// The browser pieces the foundry leans on, stood up honestly for node.
globalThis.FileReader = class {
  readAsDataURL(blob) {
    blob.arrayBuffer()
      .then((buf) => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`; this.onload?.(); })
      .catch((error) => this.onerror?.(error));
  }
};

const paintCalls = [];
const wardenCalls = [];
let wardenScript = [];
globalThis.fetch = async (url, opts = {}) => {
  const target = String(url);
  const body = JSON.parse(opts.body || '{}');
  if (target.endsWith('/api/paint')) {
    paintCalls.push(body);
    return {
      ok: true,
      blob: async () => new Blob([`render-take-${paintCalls.length}`], { type: 'image/png' }),
      headers: { get: (name) => (name === 'X-Media-Provider' ? 'gemini' : 'test-model') },
    };
  }
  if (target.endsWith('/api/warden')) {
    wardenCalls.push(body);
    return { ok: true, json: async () => (wardenScript.shift() ?? { floor: true }) };
  }
  throw new Error(`unexpected fetch: ${target}`);
};

const { db } = await import('../src/lib/db.js');
const { Foundry } = await import('../src/lib/cinema/foundry.js');

// The blessed anchor on the shelf — Wren's first bust, bytes and all.
await db.media.put({
  assetHash: 'anch-wren', cacheKey: 'k-anchor-wren', campaignId: 'c-warden', kind: 'paint',
  label: 'Wren', variant: 'bust', mime: 'image/png', subtype: 'portrait',
  blob: new Blob(['the-blessed-anchor'], { type: 'image/png' }), createdAt: 1, originTurnHash: null,
});

const attests = [];
const forge = new Foundry({ campaignId: 'c-warden', tier: 'illuminated', onAttestation: (a) => { attests.push(a); } });
const wardenJob = (cacheKey) => ({
  kind: 'paint', prompt: 'Wren at the ford.', priority: 1, cacheKey,
  options: { kind: 'scene', referenceLabels: ['Wren'], warden: { kind: 'soul', bearingText: 'Wren — adult. A reed-thin scout in a patched green cloak.' } },
});

// 0. The engine's own floor law, quoted once: an unjudged pass says so.
{
  const ruling = wardenRuling(mockWarden(), { attempt: 1 });
  assert.equal(ruling.action, 'pass');
  assert.equal(ruling.attest.warden, 'floor', 'the floor has no eyes and admits it');
}

// 1. THE FLOOR — the door answers floor:true; the render ships with the
//    blindness attested, never mistaken for sight.
{
  wardenScript = [{ floor: true }];
  const row = await forge.enqueue(wardenJob('k-floor'));
  assert.equal(wardenCalls.length, 1, 'the judge was asked');
  assert.equal(row.warden?.warden, 'floor', 'the row carries the unjudged attest');
  assert.match(row.warden?.note || '', /unjudged/, 'blindness is written down, in so many words');
  assert.equal(attests.at(-1)?.warden?.warden, 'floor', 'the sealed attestation says the same');
}

// 2. A SEEN PASS — the verdict rides the attestation with its confidence.
{
  wardenScript = [{ text: '{"same": true, "confidence": 0.91, "signature_present": true, "drift": []}' }];
  const row = await forge.enqueue(wardenJob('k-pass'));
  assert.equal(row.warden?.warden, 'passed');
  assert.equal(row.warden?.confidence, 0.91, 'the verdict is attested, not discarded');
}

// 3. DRIFT → REPAINT ONCE, notes appended — then the second take passes.
{
  const before = paintCalls.length;
  wardenScript = [
    { text: '{"same": false, "confidence": 0.9, "signature_present": true, "drift": ["the chin is wrong"]}' },
    { text: '{"same": true, "confidence": 0.8, "signature_present": true, "drift": []}' },
  ];
  const row = await forge.enqueue(wardenJob('k-drift'));
  assert.equal(paintCalls.length, before + 2, 'one drift buys exactly one repaint');
  assert.match(paintCalls.at(-1).prompt, /The likeness drifted: the chin is wrong\. Hold the blessed anchor exactly\./, 'the drift notes are appended to the second prompt');
  assert.equal(row.warden?.warden, 'passed', 'the second take shipped judged');
}

// 4. DRIFT TWICE → THE ANCHOR STANDS IN. No stranger ships; no colliding
//    bytes are minted; the fallback is attested with its reason.
{
  const before = paintCalls.length;
  wardenScript = [
    { text: '{"same": false, "confidence": 0.9, "signature_present": true, "drift": ["another face entirely"]}' },
    { text: '{"same": false, "confidence": 0.9, "signature_present": true, "drift": ["still another face"]}' },
  ];
  const row = await forge.enqueue(wardenJob('k-fallen'));
  assert.equal(paintCalls.length, before + 2, 'two takes, then the house stops painting');
  assert.equal(row.assetHash, 'anch-wren', 'the anchor itself ships — the house never ships a stranger');
  assert.equal(attests.at(-1)?.warden?.warden, 'fallback', 'the fallback is attested');
  assert.equal(attests.at(-1)?.assetHash, 'anch-wren', 'provenance names the anchor');
  assert.equal(await db.media.where('cacheKey').equals('k-fallen').count(), 0, 'no new row is minted over the anchor\u2019s bytes');
}

// 5. NO ANCHOR TO BETRAY — a job without a warden plan is exempt: the
//    judge is never called, the render ships as before.
{
  const judged = wardenCalls.length;
  const row = await forge.enqueue({ kind: 'paint', prompt: 'A cover.', priority: 1, cacheKey: 'k-exempt', options: { kind: 'keyart' } });
  assert.equal(wardenCalls.length, judged, 'the warden was never troubled');
  assert.ok(row.assetHash, 'the render shipped untouched');
  assert.equal(row.warden ?? null, null, 'no verdict is invented for the unjudged');
}

// 6. THE WIRING — the foundry rules by the engine, the server's door is
//    named and whitelist-gated, every adapter answers see, and the job
//    bench seats the brief from the roster's first chair.
{
  const foundry = read('src/lib/cinema/foundry.js');
  assert.ok(foundry.includes('wardenRuling'), 'the foundry rules by the engine');
  assert.ok(foundry.includes("'/api/warden'"), 'the foundry knocks on the warden\u2019s own door');
  const server = read('server/index.js');
  assert.ok(/\['\/api\/dm'[^\]]*'\/api\/warden'\]/.test(server), 'the warden\u2019s room is behind the locked door');
  assert.ok(server.includes("app.post('/api/warden'"), 'the route stands');
  assert.ok(server.includes('WARDEN_IMAGE'), 'two lawful images only — the strict door holds');
  assert.ok(server.includes('spendAllowed(eyes.name)'), 'a barred artisan degrades to the floor');
  for (const adapter of ['gemini', 'openai', 'mock']) {
    assert.ok(read(`server/adapters/${adapter}.js`).includes('async see('), `${adapter} answers see`);
  }
  const app = read('src/App.jsx');
  assert.ok(app.includes('bearingTextFor('), 'the brief speaks the locked bearing');
  assert.ok(app.includes('warden: { kind'), 'the job bench seats the warden plan');
}

console.log('PASS — the warden\u2019s eyes: the floor attests its blindness, a seen pass carries its confidence, drift buys exactly one repaint with the notes in the prompt, a second drift ships the anchor with no colliding bytes and the fallback attested, anchorless renders owe nothing, and door, adapters, and job bench are all wired.');
