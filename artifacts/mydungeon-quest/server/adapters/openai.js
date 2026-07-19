async function api(path, body, key) {
  const response = await fetch(`https://api.openai.com${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  return response;
}

export function openaiAdapter(key) {
  return {
    name: 'openai',
    capabilities: { configured: Boolean(key), supportsReferences: true, maxReferenceImages: 4, supportsSeed: false, includesAudio: true, asynchronous: true },
    async paint({ prompt, kind = 'scene', size = null, references = [] }) {
      const model = process.env.PAINT_MODEL_OPENAI || 'gpt-image-1';
      // THE VERTICAL LAW (XVII): feed plates are portrait, sheets square,
      // furniture wide — same pins as the Gemini seat.
      size = size || (kind === 'portrait' || kind === 'scene' ? '1024x1536' : kind === 'sheet' ? '1024x1024' : '1536x1024');
      let response;
      if (references.length) {
        // Reference conditioning: locked canon busts/plates ride along so
        // faces and places converge on their anchors.
        const form = new FormData();
        form.append('model', model); form.append('prompt', prompt); form.append('size', size);
        for (const [index, ref] of references.slice(0, 4).entries()) {
          form.append('image[]', new Blob([Buffer.from(ref.data, 'base64')], { type: ref.mime || 'image/png' }), `reference-${index}.png`);
        }
        response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
        if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
      } else {
        response = await api('/v1/images/generations', { model, prompt, size }, key);
      }
      const json = await response.json();
      const item = json.data?.[0];
      const bytes = item?.b64_json ? Buffer.from(item.b64_json, 'base64') : Buffer.from(await (await fetch(item.url)).arrayBuffer());
      return { bytes, mime: 'image/png', provider: 'openai', model, seed: null, usage: json.usage || null };
    },
    // THE WARDEN'S EYES (Directive VI, Phase 13) — the understudy's sight,
    // same law as Gemini's: carry the brief and both images, return the
    // verdict's words; the engine parses and rules.
    async see({ brief, anchor, render }) {
      const model = process.env.WARDEN_MODEL_OPENAI || 'gpt-4o-mini';
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: [
            { type: 'text', text: brief },
            // (0.6.1) The anchor is optional — a text-only brief carries
            // one image; the likeness brief still carries two, anchor first.
            ...(anchor?.data ? [{ type: 'image_url', image_url: { url: `data:${anchor.mime || 'image/png'};base64,${anchor.data}` } }] : []),
            { type: 'image_url', image_url: { url: `data:${render?.mime || 'image/png'};base64,${render?.data || ''}` } }
          ] }],
          max_tokens: 300
        })
      });
      if (!response.ok) throw new Error(`OpenAI warden ${response.status}: ${(await response.text()).slice(0, 300)}`);
      const json = await response.json();
      const text = String(json.choices?.[0]?.message?.content || '').trim();
      if (!text) throw new Error('OpenAI warden returned no verdict');
      return { text, provider: 'openai', model };
    },

    async speak({ text, voice = 'alloy', instructions = 'Warm, cinematic, restrained.' }) {
      const response = await api('/v1/audio/speech', { model: process.env.SPEAK_MODEL_OPENAI || 'gpt-4o-mini-tts', voice, input: text, instructions, response_format: 'wav' }, key);
      return { bytes: Buffer.from(await response.arrayBuffer()), mime: 'audio/wav', provider: 'openai', model: process.env.SPEAK_MODEL_OPENAI || 'gpt-4o-mini-tts', seed: null, usage: null };
    }
  };
}
