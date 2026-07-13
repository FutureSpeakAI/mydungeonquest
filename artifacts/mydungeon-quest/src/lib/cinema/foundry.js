import { db } from '../db.js';
import { generationSpec } from './prompts.js';
import { sha256 } from '../canonical.js';

export class Foundry {
  constructor({ campaignId, tier = 'parchment', spend = {}, onAttestation = null }) {
    this.campaignId = campaignId;
    this.tier = tier;
    this.spend = { images: 0, videos: 0, music: 0, ...spend };
    this.caps = { images: 80, videos: 16, music: 8 };
    this.queue = [];
    this.running = false;
    this.onAttestation = onAttestation;
  }

  allowed(kind) {
    if (this.tier === 'parchment') return false;
    if (['video','music','sfx','speak'].includes(kind) && this.tier !== 'cinema') return false;
    const bucket = kind === 'paint' ? 'images' : kind === 'video' ? 'videos' : kind === 'music' ? 'music' : null;
    return !bucket || this.spend[bucket] < this.caps[bucket];
  }

  async enqueue({ kind, prompt, originTurnHash = null, options = {}, priority = 5 }) {
    const spec = await generationSpec(kind, prompt, options);
    const cached = await db.media.where('cacheKey').equals(spec.hash).first();
    if (cached) return cached;
    if (!this.allowed(kind)) return null;
    return new Promise((resolve, reject) => {
      this.queue.push({ kind, prompt, originTurnHash, options, priority, spec, resolve, reject });
      this.queue.sort((a,b) => a.priority - b.priority);
      this.pump();
    });
  }

  async pump() {
    if (this.running || !this.queue.length) return;
    this.running = true;
    const job = this.queue.shift();
    try {
      const asset = await this.generate(job);
      job.resolve(asset);
    } catch (error) { job.reject(error); }
    finally { this.running = false; this.pump(); }
  }

  async generate(job) {
    let response;
    if (job.kind === 'video') {
      const queued = await fetch('/api/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: job.prompt, ...job.options }) }).then((r) => r.json());
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const status = await fetch(`/api/video/${queued.id}`).then((r) => r.json());
        if (status.status === 'ready') { response = await fetch(`/api/video/${queued.id}/asset`); break; }
        await new Promise((resolve) => setTimeout(resolve, 500));
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
      campaignId: this.campaignId, kind: job.kind, cacheKey: job.spec.hash, promptHash: job.spec.promptHash,
      generationSpecHash: job.spec.hash, assetHash, originTurnHash: job.originTurnHash, mime: blob.type,
      provider: response.headers.get('X-Media-Provider') || 'unknown', model: response.headers.get('X-Media-Model') || 'unknown',
      blob, createdAt: Date.now()
    };
    await db.media.put(row);
    await this.onAttestation?.({ originTurnHash: job.originTurnHash, kind: job.kind, promptHash: row.promptHash, generationSpecHash: row.generationSpecHash, assetHash, mime: row.mime, byteLength: blob.size });
    return row;
  }
}
