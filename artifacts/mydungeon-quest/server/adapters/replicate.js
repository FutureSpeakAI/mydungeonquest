// Replicate video adapter — one integration point for many video
// models (Wan, Kling, Veo hosts, etc.). Set VIDEO_PROVIDER=replicate
// and REPLICATE_VIDEO_MODEL to the model slug you want; failures
// degrade to the mock like every other adapter.
async function replicateApi(path, options, token) {
  const response = await fetch(`https://api.replicate.com${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error(`Replicate ${response.status}: ${await response.text()}`);
  return response;
}

export function replicateAdapter(token) {
  return {
    name: 'replicate',
    capabilities: { configured: Boolean(token), supportsReferences: true, maxReferenceImages: 1, supportsSeed: true, includesAudio: false, asynchronous: true },
    async video({ prompt, seconds = 8, seed = null }) {
      const model = process.env.REPLICATE_VIDEO_MODEL;
      if (!model) throw new Error('REPLICATE_VIDEO_MODEL is not set');
      const create = await replicateApi(`/v1/models/${model}/predictions`, {
        method: 'POST', headers: { Prefer: 'wait=60' },
        body: JSON.stringify({ input: { prompt, duration: seconds, ...(seed != null ? { seed } : {}) } })
      }, token);
      let prediction = await create.json();
      for (let attempt = 0; attempt < 90 && !['succeeded','failed','canceled'].includes(prediction.status); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        prediction = await (await replicateApi(`/v1/predictions/${prediction.id}`, { method: 'GET' }, token)).json();
      }
      if (prediction.status !== 'succeeded') throw new Error(`Replicate video ${prediction.status}: ${prediction.error || 'timeout'}`);
      const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      if (!url) throw new Error('Replicate returned no video output');
      const asset = await fetch(url);
      if (!asset.ok) throw new Error(`Replicate asset ${asset.status}`);
      return { bytes: Buffer.from(await asset.arrayBuffer()), mime: asset.headers.get('content-type') || 'video/mp4', provider: 'replicate', model, seed, usage: null };
    }
  };
}
