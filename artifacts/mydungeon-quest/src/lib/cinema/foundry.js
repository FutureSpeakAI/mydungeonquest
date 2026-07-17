import { db } from '../db.js';
import { generationSpec, momentBrief, parseMoment, momentRuling } from './prompts.js';
import { sha256 } from 'fatescript/canonical';
import { wardenBrief, parseVerdict, mockWarden, wardenRuling } from 'fatescript/warden';
import { unletteredBrief, parseUnlettered, unletteredRuling } from 'fatescript/unlettered';
import { tollRefusal } from '../../patron/tollNotice.js';

// ------------------------------------------------------------
// THE FOUNDRY — asynchronous media orchestrator.
// v2: two independent lanes (image / audio) so a slow paint
// never blocks narration or score; explicit cacheKey support
// so beat packages briefed by lookahead are found again when the
// cinematic actually fires. Spend caps, content-addressed cache,
// and sealed attestations are unchanged.
// ------------------------------------------------------------

const laneOf = (kind) => (kind === 'paint' ? 'image' : 'audio');

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

// THE ANCHOR LAW — a soul's first bust (or a region's first plate)
// is its permanent visual anchor. Anchors are resolved lazily at
// generation time by label, so jobs queued before the anchor exists
// still pick it up, and the chosen anchors are sealed into the
// attestation for provenance.
async function resolveAnchors(campaignId, labels = []) {
  if (!labels.length) return [];
  const rows = await db.media.where('campaignId').equals(campaignId).toArray();
  const anchors = [];
  for (const label of labels.filter(Boolean).slice(0, 3)) {
    const candidates = rows.filter((row) => row.kind === 'paint' && row.label === label && row.blob);
    if (!candidates.length) continue;
    candidates.sort((a, b) => (a.variant === 'bust' ? 0 : 1) - (b.variant === 'bust' ? 0 : 1) || a.createdAt - b.createdAt);
    anchors.push(candidates[0]);
  }
  return anchors;
}

export class Foundry {
  constructor({ campaignId, tier = 'parchment', spend = {}, onAttestation = null }) {
    this.campaignId = campaignId;
    this.tier = tier;
    this.spend = { images: 0, music: 0, ...spend };
    this.caps = { images: 80, music: 8 };
    this.lanes = { image: { queue: [], running: false }, audio: { queue: [], running: false } };
    this.onAttestation = onAttestation;
  }

  allowed(kind) {
    if (this.tier === 'parchment') return false;
    // Illuminated adds stills AND the audio layer (narration bed, score, sfx)
    // so the interactive-podcast experience works at the default tier.
    const bucket = kind === 'paint' ? 'images' : kind === 'music' ? 'music' : null;
    return !bucket || this.spend[bucket] < this.caps[bucket];
  }

  async enqueue({ kind, prompt, originTurnHash = null, options = {}, priority = 5, cacheKey = null, ...rest }) {
    const spec = await generationSpec(kind, prompt, options);
    const key = cacheKey || spec.hash;
    const cached = await db.media.where('cacheKey').equals(key).first();
    if (cached) return cached;
    if (!this.allowed(kind)) return null;
    return new Promise((resolve, reject) => {
      const lane = this.lanes[laneOf(kind)];
      lane.queue.push({ kind, prompt, originTurnHash, options, priority, spec, cacheKey: key, resolve, reject, ...rest });
      lane.queue.sort((a, b) => a.priority - b.priority);
      this.pump(lane);
    });
  }

  async pump(lane) {
    if (lane.running || !lane.queue.length) return;
    lane.running = true;
    const job = lane.queue.shift();
    try {
      // Another job may have filled this key while we waited in line.
      const cached = await db.media.where('cacheKey').equals(job.cacheKey).first();
      job.resolve(cached || await this.generate(job));
    } catch (error) { job.reject(error); }
    finally { lane.running = false; this.pump(lane); }
  }

  async generate(job) {
    const anchors = await resolveAnchors(this.campaignId, job.options?.referenceLabels || []);
    const references = await Promise.all(anchors.map(async (row) => ({ mime: row.mime, data: await blobToBase64(row.blob), assetHash: row.assetHash })));
    const referenceAssetHashes = anchors.map((row) => row.assetHash);
    if (references.length) job.options = { ...job.options, references };
    const route = job.kind === 'paint' ? 'paint' : job.kind;
    // THE WARDEN'S EYES (Directive VI, Phase 13) — every post-anchor soul
    // render is judged beside its anchor: a pass ships with the verdict
    // attested, drift repaints ONCE with the notes appended to the prompt,
    // and a second drift ships the anchor itself — THE HOUSE NEVER SHIPS A
    // STRANGER. Renders with no anchor to betray (first takes, parchment's
    // procedural woodcuts, covers, audio) owe the warden nothing.
    const wardenPlan = job.kind === 'paint' && job.options?.warden?.bearingText && anchors.length ? job.options.warden : null;
    // THE MOMENT LAW (0.6.1) — a scene paint that carries its turn's moment
    // answers for it: the beat-supremacy clause is a plea until someone
    // checks the work.
    const momentPlan = job.kind === 'paint' && job.options?.kind === 'scene' && job.options?.moment?.prose ? String(job.options.moment.prose) : null;
    const bucket = job.kind === 'paint' ? 'images' : job.kind === 'music' ? 'music' : null;
    let prompt = job.prompt;
    let response; let blob; let wardenAttest = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      response = await fetch(`/api/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, ...job.options }) });
      if (!response.ok) {
        // THE RECEIPT: a 402 is the innkeeper's refusal, not a foundry fault —
        // surface it to the patron before the error rides the reject path.
        const closed = await tollRefusal(response);
        throw new Error(closed?.error || `Foundry ${response.status}`);
      }
      blob = await response.blob();
      // Every render spends — a repaint costs its own slot in the cap.
      if (bucket) this.spend[bucket] += 1;
      if (job.kind !== 'paint') break;
      // THE UNLETTERED WORLD (0.6.1) — every delivered plate is asked the
      // text question. Anchored soul renders ask it inside the likeness
      // verdict (one look, two laws); anchor-less plates get the single-
      // image brief alone. On text: ONE repaint with the clause reinforced;
      // on a second sighting the plate is REFUSED — the surface keeps its
      // lawful textless fallback and the refusal is sealed into the record.
      const ruling = wardenPlan
        ? wardenRuling(await this.judge(wardenPlan, anchors[0], blob), { attempt })
        : unletteredRuling(await this.judgeText(blob), { attempt });
      if (ruling.action === 'repaint') { prompt = `${prompt} ${ruling.notes.join(' ')}`; continue; }
      if (ruling.action === 'refuse') {
        // The refused bytes are hashed for the record and then dropped —
        // never stored, never shipped. The blessed anchor is the lawful
        // textless fallback where one exists (its bytes passed this same
        // law when they were minted); silence — null — everywhere else.
        const refusedHash = await sha256(new Uint8Array(await blob.arrayBuffer()));
        await this.onAttestation?.({ originTurnHash: job.originTurnHash, kind: job.kind, promptHash: job.spec.promptHash, generationSpecHash: job.spec.hash, assetHash: refusedHash, mime: blob.type, byteLength: blob.size, referenceAssetHashes, warden: ruling.attest });
        return anchors.length ? anchors[0] : null;
      }
      if (ruling.action === 'anchor') {
        // The anchor stands in — no new bytes are minted (the anchor row
        // already holds these very bytes under its own name); the sealed
        // attestation carries the fallback verdict for provenance.
        await this.onAttestation?.({ originTurnHash: job.originTurnHash, kind: job.kind, promptHash: job.spec.promptHash, generationSpecHash: job.spec.hash, assetHash: anchors[0].assetHash, mime: anchors[0].mime, byteLength: anchors[0].blob?.size ?? 0, referenceAssetHashes, warden: ruling.attest });
        return anchors[0];
      }
      // THE MOMENT LAW (0.6.1) — one more question at the same door for
      // scene plates that carry their moment: is THIS moment staged? A miss
      // repaints once with the order reinforced; a second miss SHIPS the
      // better take with the miss sealed in its attest — the house labels
      // dishonesty, it does not starve the shelf (a turn with no plate
      // starves every consumer waiting on the easel). The judge's own
      // stumbles (floor, malformed) never count against a render.
      if (momentPlan) {
        const momentVerdict = momentRuling(await this.judgeMoment(blob, momentPlan), { attempt });
        if (momentVerdict.action === 'repaint') { prompt = `${prompt} ${momentVerdict.notes.join(' ')}`; continue; }
        wardenAttest = { ...(ruling.attest || {}), ...momentVerdict.attest };
        break;
      }
      wardenAttest = ruling.attest;
      break;
    }
    const assetHash = await sha256(new Uint8Array(await blob.arrayBuffer()));
    const row = {
      campaignId: this.campaignId, kind: job.kind, cacheKey: job.cacheKey, promptHash: job.spec.promptHash,
      generationSpecHash: job.spec.hash, assetHash, originTurnHash: job.originTurnHash, mime: blob.type,
      label: job.options?.label || null, variant: job.options?.variant || null,
      // The paint subtype ('scene', 'portrait', 'region', 'keyart', 'beat-still')
      // travels onto the row so consumers can pick backdrops explicitly instead
      // of inferring from label absence. Older rows lack it; keep a heuristic.
      subtype: job.options?.kind || null,
      referenceAssetHashes,
      provider: response.headers.get('X-Media-Provider') || 'unknown', model: response.headers.get('X-Media-Model') || 'unknown',
      // The Warden's attest rides the row — 'passed' with its confidence,
      // or 'floor' with the blindness admitted; null for the unjudged kinds.
      warden: wardenAttest || null,
      blob, createdAt: Date.now()
    };
    // The pyre law (same choke as saveCampaign's guard): a burned spine takes
    // no ink — a straggling parcel lands in ash, never back on the shelf. The
    // caller still gets its row; there is simply nothing left to keep it for.
    const { spineBurned } = await import('../db.js');
    if (spineBurned(this.campaignId)) return row;
    await db.media.put(row);
    await this.onAttestation?.({ originTurnHash: job.originTurnHash, kind: job.kind, promptHash: row.promptHash, generationSpecHash: row.generationSpecHash, assetHash, mime: row.mime, byteLength: blob.size, referenceAssetHashes, ...(wardenAttest ? { warden: wardenAttest } : {}) });
    return row;
  }

  // The judge's errand: both images as lawful data URLs beside the engine's
  // own brief, one POST to the warden's door. A closed door, a floor answer,
  // or a stumble all come home as the floor verdict — unjudged, and attested
  // as such; the errand never breaks the render it was sent to judge.
  async judge(plan, anchorRow, renderBlob) {
    try {
      const toDataUrl = async (source, mime) => `data:${mime || source.type || 'image/png'};base64,${await blobToBase64(source)}`;
      const [anchor, render] = await Promise.all([
        toDataUrl(anchorRow.blob, anchorRow.mime),
        toDataUrl(renderBlob, renderBlob.type),
      ]);
      const response = await fetch('/api/warden', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: wardenBrief({ kind: plan.kind || 'soul', bearingText: plan.bearingText }), anchor, render }),
      });
      if (!response.ok) return mockWarden();
      const body = await response.json();
      if (body.floor) return mockWarden();
      return parseVerdict(body.text || '');
    } catch { return mockWarden(); }
  }

  // The text-only errand for plates with no anchor to stand beside: one
  // image, one brief, the same door. A closed door, a floor answer, or a
  // stumble all come home as an unjudged pass — the judge's own failure
  // never refuses the render it was sent to judge (the likeness errand's
  // own law).
  async judgeText(renderBlob) {
    const floor = { contains_text_or_watermark: false, confidence: 0, malformed: false, floor: true };
    try {
      const render = `data:${renderBlob.type || 'image/png'};base64,${await blobToBase64(renderBlob)}`;
      const response = await fetch('/api/warden', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: unletteredBrief(), render }),
      });
      if (!response.ok) return floor;
      const body = await response.json();
      if (body.floor) return floor;
      return parseUnlettered(body.text || '');
    } catch { return floor; }
  }

  // The moment errand — one image, the moment brief, the same door, the
  // same floor law: a closed door, a floor answer, or a stumble come home
  // as an unjudged pass, never a refusal.
  async judgeMoment(renderBlob, prose) {
    const floor = { moment_staged: true, missing: '', floor: true };
    try {
      const render = `data:${renderBlob.type || 'image/png'};base64,${await blobToBase64(renderBlob)}`;
      const response = await fetch('/api/warden', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: momentBrief(prose), render }),
      });
      if (!response.ok) return floor;
      const body = await response.json();
      if (body.floor) return floor;
      return parseMoment(body.text || '');
    } catch { return floor; }
  }
}
