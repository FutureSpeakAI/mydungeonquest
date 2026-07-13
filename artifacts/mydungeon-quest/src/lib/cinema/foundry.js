import { db } from '../db.js';
import { generationSpec } from './prompts.js';
import { sha256 } from '../canonical.js';

// ------------------------------------------------------------
// THE FOUNDRY — asynchronous media orchestrator.
// v2: three independent lanes (image / video / audio) so a slow
// video render never blocks portraits; explicit cacheKey support
// so beat packages briefed by lookahead are found again when the
// cinematic actually fires. Spend caps, content-addressed cache,
// and sealed attestations are unchanged.
// ------------------------------------------------------------

const laneOf = (kind) => (kind === 'video' ? 'video' : kind === 'paint' ? 'image' : 'audio');

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
    this.spend = { images: 0, videos: 0, music: 0, ...spend };
    this.caps = { images: 80, videos: 16, music: 8 };
    this.lanes = { image: { queue: [], running: false }, video: { queue: [], running: false }, audio: { queue: [], running: false } };
    this.onAttestation = onAttestation;
  }

  allowed(kind) {
    if (this.tier === 'parchment') return false;
    if (['video','music','sfx','speak'].includes(kind) && this.tier !== 'cinema') return false;
    const bucket = kind === 'paint' ? 'images' : kind === 'video' ? 'videos' : kind === 'music' ? 'music' : null;
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
    let response;
    const anchors = await resolveAnchors(this.campaignId, job.options?.referenceLabels || []);
    const references = await Promise.all(anchors.map(async (row) => ({ mime: row.mime, data: await blobToBase64(row.blob), assetHash: row.assetHash })));
    const referenceAssetHashes = anchors.map((row) => row.assetHash);
    if (references.length) job.options = { ...job.options, references };
    if (job.kind === 'video') {
      const queued = await fetch('/api/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: job.prompt, ...job.options }) }).then((r) => r.json());
      for (let attempt = 0; attempt < 240; attempt += 1) {
        const status = await fetch(`/api/video/${queued.id}`).then((r) => r.json());
        // The server flags `degraded` when the real render (Veo) throws and it
        // falls back to the procedural animatic; carry it onto the sealed row.
        if (status.status === 'ready') { job.__degraded = Boolean(status.degraded); response = await fetch(`/api/video/${queued.id}/asset`); break; }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!response) throw new Error('Video generation timed out');
    } else {
      const route = job.kind === 'paint' ? 'paint' : job.kind;
      response = await fetch(`/api/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: job.prompt, ...job.options }) });
    }
    if (!response.ok) throw new Error(`Foundry ${response.status}`);
    const blob = await response.blob();
    const assetHash = await sha256(new Uint8Array(await blob.arrayBuffer()));
    const bucket = job.kind === 'paint' ? 'images' : job.kind === 'video' ? 'videos' : job.kind === 'music' ? 'music' : null;
    if (bucket) this.spend[bucket] += 1;
    const row = {
      campaignId: this.campaignId, kind: job.kind, cacheKey: job.cacheKey, promptHash: job.spec.promptHash,
      generationSpecHash: job.spec.hash, assetHash, originTurnHash: job.originTurnHash, mime: blob.type,
      label: job.options?.label || null, variant: job.options?.variant || null,
      referenceAssetHashes,
      provider: response.headers.get('X-Media-Provider') || 'unknown', model: response.headers.get('X-Media-Model') || 'unknown',
      degraded: Boolean(job.__degraded),
      blob, createdAt: Date.now()
    };
    await db.media.put(row);
    await this.onAttestation?.({ originTurnHash: job.originTurnHash, kind: job.kind, promptHash: row.promptHash, generationSpecHash: row.generationSpecHash, assetHash, mime: row.mime, byteLength: blob.size, referenceAssetHashes });
    return row;
  }
}
