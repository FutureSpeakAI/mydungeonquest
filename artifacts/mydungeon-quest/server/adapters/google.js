const BASE = 'https://generativelanguage.googleapis.com/v1beta';

async function call(path, key, { method = 'GET', body = null } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) throw new Error(`Google ${response.status}: ${await response.text()}`);
  return response.json();
}

function extractUri(operation) {
  const response = operation?.response || {};
  const sample = response.generateVideoResponse?.generatedSamples?.[0]?.video
    || response.generatedVideos?.[0]?.video
    || response.generatedSamples?.[0]?.video;
  return sample?.uri || sample?.videoUri || null;
}

// Google's Veo video generation via the Gemini API (raw key, matching the
// direct-provider pattern used by the OpenAI and ElevenLabs adapters).
export function googleAdapter(key) {
  const model = process.env.VIDEO_MODEL_GOOGLE || 'veo-3.0-fast-generate-001';
  return {
    name: 'google',
    capabilities: { configured: Boolean(key), supportsReferences: false, maxReferenceImages: 0, supportsSeed: false, includesAudio: true, asynchronous: true },
    async video({ prompt, aspectRatio = '16:9', negativePrompt = null }) {
      if (!key) throw new Error('Google video adapter requires GEMINI_API_KEY or GOOGLE_API_KEY');
      const parameters = { aspectRatio };
      if (negativePrompt) parameters.negativePrompt = negativePrompt;
      const started = await call(`/models/${model}:predictLongRunning`, key, {
        method: 'POST',
        body: { instances: [{ prompt }], parameters }
      });
      const name = started?.name;
      if (!name) throw new Error('Google video: no operation name returned');

      const deadline = Date.now() + Number(process.env.VIDEO_POLL_TIMEOUT_MS || 240000);
      let operation = started;
      while (!operation.done) {
        if (Date.now() > deadline) throw new Error('Google video generation timed out');
        await new Promise((resolve) => setTimeout(resolve, Number(process.env.VIDEO_POLL_INTERVAL_MS || 8000)));
        operation = await call(`/${name}`, key);
      }
      if (operation.error) throw new Error(`Google video: ${operation.error.message || 'operation failed'}`);

      const uri = extractUri(operation);
      if (!uri) throw new Error('Google video: no video URI in completed operation');
      const download = await fetch(uri, { headers: { 'x-goog-api-key': key } });
      if (!download.ok) throw new Error(`Google video download ${download.status}: ${await download.text()}`);
      const bytes = Buffer.from(await download.arrayBuffer());
      const mime = download.headers.get('content-type')?.split(';')[0] || 'video/mp4';
      return { bytes, mime, provider: 'google', model, seed: null, usage: null };
    }
  };
}
