// Google Gemini adapter — image via gemini-2.5-flash-image ("nano banana",
// excellent at holding a face/place across references) and video via Veo.
// Reads GEMINI_API_KEY, falling back to GOOGLE_API_KEY so either secret works.
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Bound every request so a stalled Google call aborts and lets the caller's
// provider chain fall through to the next provider / mock instead of hanging.
function timedFetch(url, options = {}, ms = 120000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
}

function aspectFor(kind, size) {
  if (kind === 'portrait') return '3:4';
  if (kind === 'scene' || kind === 'key_art' || kind === 'cover') return '16:9';
  if (typeof size === 'string' && /^\d+x\d+$/.test(size)) {
    const [w, h] = size.split('x').map(Number);
    return w >= h ? '16:9' : '3:4';
  }
  return '16:9';
}

export function geminiAdapter(key) {
  return {
    name: 'gemini',
    capabilities: { configured: Boolean(key), supportsReferences: true, maxReferenceImages: 3, supportsSeed: false, includesAudio: true, asynchronous: true },

    async paint({ prompt, kind = 'scene', size = '1536x1024', references = [] }) {
      const model = process.env.PAINT_MODEL_GEMINI || 'gemini-2.5-flash-image';
      const parts = [{ text: `${prompt}\n\nAspect ratio ${aspectFor(kind, size)}.` }];
      // Locked canon busts/plates ride along so faces and places converge.
      for (const ref of references.slice(0, 3)) {
        if (ref?.data) parts.push({ inlineData: { mimeType: ref.mime || 'image/png', data: ref.data } });
      }
      const response = await timedFetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } })
      }, 120000);
      if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
      const json = await response.json();
      const image = (json.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
      if (!image) throw new Error('Gemini returned no image');
      return { bytes: Buffer.from(image.inlineData.data, 'base64'), mime: image.inlineData.mimeType || 'image/png', provider: 'gemini', model, seed: null, usage: json.usageMetadata || null };
    },

    async video({ prompt, seconds = 8, size = '1280x720', references = [] }) {
      const model = process.env.VIDEO_MODEL_GEMINI || 'veo-3.1-fast-generate-preview';
      const instance = { prompt };
      if (references[0]?.data) instance.image = { bytesBase64Encoded: references[0].data, mimeType: references[0].mime || 'image/png' };
      const parameters = { aspectRatio: aspectFor('scene', size), durationSeconds: Math.max(4, Math.min(8, Math.round(seconds))) };
      const create = await timedFetch(`${BASE}/models/${model}:predictLongRunning?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [instance], parameters })
      }, 60000);
      if (!create.ok) throw new Error(`Gemini video ${create.status}: ${(await create.text()).slice(0, 300)}`);
      const op = await create.json();
      if (!op.name) throw new Error('Gemini video: no operation name');
      for (let attempt = 0; attempt < 150; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 6000));
        const poll = await timedFetch(`${BASE}/${op.name}?key=${key}`, {}, 30000);
        if (!poll.ok) throw new Error(`Gemini video poll ${poll.status}`);
        const status = await poll.json();
        if (status.error) throw new Error(`Gemini video failed: ${status.error.message || 'unknown'}`);
        if (!status.done) continue;
        const sample = status.response?.generateVideoResponse?.generatedSamples?.[0]
          || status.response?.generatedVideos?.[0]
          || status.response?.videos?.[0];
        const uri = sample?.video?.uri || sample?.video?.videoUri || sample?.uri;
        const inlineB64 = sample?.video?.bytesBase64Encoded || sample?.bytesBase64Encoded;
        if (inlineB64) return { bytes: Buffer.from(inlineB64, 'base64'), mime: 'video/mp4', provider: 'gemini', model, seed: null, usage: null };
        if (uri) {
          // Veo file URIs require the API key to download.
          const file = await timedFetch(uri.includes('key=') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}key=${key}`, {}, 180000);
          if (!file.ok) throw new Error(`Gemini video download ${file.status}`);
          return { bytes: Buffer.from(await file.arrayBuffer()), mime: 'video/mp4', provider: 'gemini', model, seed: null, usage: null };
        }
        throw new Error('Gemini video: no sample in response');
      }
      throw new Error('Gemini video timed out');
    }
  };
}
