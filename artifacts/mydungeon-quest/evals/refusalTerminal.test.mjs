// ------------------------------------------------------------
// THE REFUSAL-TERMINAL GATE — Task 53, the closing review.
//
// Three proving runs starved on plates that had RESOLVED: a refused
// render leaves no row on the shelf by law (0.6.1 — refused bytes are
// hashed into the record, then dropped), and every consumer that
// polled the shelf mistook lawful silence for pending work. This gate
// pins what refusal MUST mean so the mistake stays impossible:
//   1. the job RESOLVES — the lawful textless fallback ships (the
//      blessed anchor where one stands), never a hang, never a throw;
//   2. the refusal is ATTESTED into the sealed record, named;
//   3. the refused bytes are NEVER stored — not under the job's key,
//      not under their own hash (the media shelf is content-addressed
//      and the vault chain-verifies: a marker row would be a forgery);
//   4. the lane ADVANCES — the next queued job paints and lands.
// Headless: node + fake-indexeddb, scripted doors, no AI keys.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';

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

// The blessed anchor on the shelf — Edda's first bust, bytes and all.
await db.media.put({
  assetHash: 'anch-edda', cacheKey: 'k-anchor-edda', campaignId: 'c-refusal', kind: 'paint',
  label: 'Edda', variant: 'bust', mime: 'image/png', subtype: 'portrait',
  blob: new Blob(['the-blessed-anchor'], { type: 'image/png' }), createdAt: 1, originTurnHash: null,
});

const attests = [];
const forge = new Foundry({ campaignId: 'c-refusal', tier: 'illuminated', onAttestation: (a) => { attests.push(a); } });
const job = (cacheKey) => ({
  kind: 'paint', prompt: 'Edda at the lychgate.', priority: 1, cacheKey,
  options: { kind: 'scene', referenceLabels: ['Edda'], warden: { kind: 'soul', bearingText: 'Edda — old. A stooped bell-ringer in an ash-grey shawl.' } },
});
const textSighting = { text: '{"same": true, "confidence": 0.9, "signature_present": true, "contains_text_or_watermark": true, "drift": []}' };

// 1 + 2 + 3. TWO SIGHTINGS → REFUSE: the job resolves to the anchor
// (never a stranger, never a hang), the refusal is attested with the
// dropped bytes' hash, and those bytes are stored NOWHERE.
{
  const before = paintCalls.length;
  wardenScript = [textSighting, textSighting];
  const shipped = await forge.enqueue(job('k-refused'));
  assert.equal(paintCalls.length, before + 2, 'text buys one reinforced retake, then the house stops painting');
  assert.equal(wardenCalls.length, 2, 'the judge was asked twice, no more');
  assert.equal(shipped?.assetHash, 'anch-edda', 'the refused plate resolves to the blessed anchor — the lawful textless fallback');
  const attest = attests.at(-1);
  assert.equal(attest?.warden?.warden, 'refused', 'the refusal is attested into the sealed record');
  assert.ok(attest?.assetHash && attest.assetHash !== 'anch-edda', 'the record names the dropped bytes by their own hash');
  assert.equal(await db.media.get(attest.assetHash), undefined, 'the refused bytes are never stored under their hash');
  assert.equal(await db.media.where('cacheKey').equals('k-refused').count(), 0, 'no marker row is minted on the content-addressed shelf');
}

// 4. THE LANE ADVANCES — refusal is terminal, not a wedge: the next
// queued job paints, passes, and lands on the shelf.
{
  // (54B §3) A soul's mark is proven by the magnified look now — the
  // scripted door answers stage one and stage two, or the pass would
  // lawfully spend its repaint chasing the unproven mark.
  wardenScript = [{
    text: '{"same": true, "confidence": 0.92, "contains_text_or_watermark": false, "drift": []}',
    magnifier: { found: true, box: { left: 10, top: 10, width: 56, height: 70 }, markText: '{"mark_visible": true, "confidence": 0.9}' },
  }];
  const row = await forge.enqueue(job('k-after'));
  assert.equal(row?.warden?.warden, 'passed', 'the very next job ships judged');
  assert.equal(await db.media.where('cacheKey').equals('k-after').count(), 1, 'and its row lands on the shelf');
}

console.log('PASS — the refusal-terminal gate: a refused plate resolves to the lawful fallback, the refusal is attested with the dropped bytes\u2019 hash, those bytes are stored nowhere, and the lane advances.');
