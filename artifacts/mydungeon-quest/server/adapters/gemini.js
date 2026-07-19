// Google Gemini adapter — image via gemini-3.1-flash-image ("Nano Banana 2",
// excellent at holding a face/place across references). Owner directive
// (July 2026): Nano Banana 2 on its fastest settings — 1K output, flash
// model, never the Pro line. PAINT_MODEL_GEMINI overrides for evals only.
// Reads GEMINI_API_KEY, falling back to GOOGLE_API_KEY so either secret works.
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Bound every request so a stalled Google call aborts and lets the caller's
// provider chain fall through to the next provider / mock instead of hanging.
function timedFetch(url, options = {}, ms = 120000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
}

// THE VERTICAL LAW (XVII): feed plates — scene and portrait — are
// vertical at the pinned 3:4; sheets are square (a 2x2 grid); covers,
// key art, and region canon are furniture and keep the wide frame.
function aspectFor(kind, size) {
  if (kind === 'portrait' || kind === 'scene') return '3:4';
  if (kind === 'sheet') return '1:1';
  if (kind === 'key_art' || kind === 'cover') return '16:9';
  if (typeof size === 'string' && /^\d+x\d+$/.test(size)) {
    const [w, h] = size.split('x').map(Number);
    return w >= h ? '16:9' : '3:4';
  }
  return '16:9';
}

export function geminiAdapter(key) {
  return {
    name: 'gemini',
    // THE SLOT LAW (XVII, Article II): Gemini's pinned budget is 14
    // reference images / 5 identifiable subjects — mirrored in
    // plateroad.SLOT_BUDGETS (the one road).
    capabilities: { configured: Boolean(key), supportsReferences: true, maxReferenceImages: 14, supportsSeed: false, includesAudio: true, asynchronous: true },

    async paint({ prompt, kind = 'scene', size = '1536x1024', references = [], edit = null }) {
      const model = process.env.PAINT_MODEL_GEMINI || 'gemini-3.1-flash-image';
      const parts = [{ text: prompt }];
      // THE MENDED PLATE (XVII): a warden repaint may carry the failed
      // render itself — a targeted edit that preserves the composition
      // while removing the offense. The failed bytes ride FIRST so the
      // instruction reads as an edit of that image.
      if (edit?.data) parts.push({ inlineData: { mimeType: edit.mime || 'image/png', data: edit.data } });
      // Locked canon sheets/busts/plates ride along so faces and places
      // converge — up to the pinned budget.
      for (const ref of references.slice(0, 14)) {
        if (ref?.data) parts.push({ inlineData: { mimeType: ref.mime || 'image/png', data: ref.data } });
      }
      const response = await timedFetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            // Fastest fire: 1K plates, aspect declared structurally (the 3.x
            // image models take it in imageConfig, not prose).
            imageConfig: { aspectRatio: aspectFor(kind, size), imageSize: '1K' }
          }
        })
      }, 120000);
      if (!response.ok) throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`);
      const json = await response.json();
      const image = (json.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
      if (!image) throw new Error('Gemini returned no image');
      return { bytes: Buffer.from(image.inlineData.data, 'base64'), mime: image.inlineData.mimeType || 'image/png', provider: 'gemini', model, seed: null, usage: json.usageMetadata || null };
    },

    // THE WARDEN'S EYES (Directive VI, Phase 13) — the key that paints can
    // also see. IMAGE 1 the blessed anchor, IMAGE 2 the new render; the
    // brief demands one JSON verdict, and the engine's parser judges the
    // reply. This adapter only carries the images and returns the words.
    async see({ brief, anchor, render }) {
      // gemini-3.1-flash never existed as a servable name (only -lite/-image
      // variants); the alias tracks the newest stable flash so a provider
      // rename can never silently kill the warden again.
      const model = process.env.WARDEN_MODEL_GEMINI || 'gemini-flash-latest';
      const response = await timedFetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [
          { text: brief },
          // (0.6.1) The anchor is optional — a text-only brief carries one
          // image; the likeness brief still carries two, anchor first.
          ...(anchor?.data ? [{ inlineData: { mimeType: anchor.mime || 'image/png', data: anchor.data } }] : []),
          { inlineData: { mimeType: render?.mime || 'image/png', data: render?.data || '' } }
        ] }] })
      }, 60000);
      if (!response.ok) throw new Error(`Gemini warden ${response.status}: ${(await response.text()).slice(0, 300)}`);
      const json = await response.json();
      const text = (json.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join(' ').trim();
      if (!text) throw new Error('Gemini warden returned no verdict');
      return { text, provider: 'gemini', model };
    }
  };
}
