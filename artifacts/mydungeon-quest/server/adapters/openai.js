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
    async paint({ prompt, size = '1536x1024', references = [] }) {
      const model = process.env.PAINT_MODEL_OPENAI || 'gpt-image-1';
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
    async video({ prompt, seconds: requestedSeconds = 8, size = '1280x720', references = [] }) {
      const model = process.env.VIDEO_MODEL_OPENAI || 'sora-2';
      // Sora only accepts these durations; snap to the nearest so an arbitrary
      // clip length (e.g. 6s) doesn't 400 the whole request.
      const allowed = [4, 8, 12];
      const seconds = allowed.reduce((best, v) => (Math.abs(v - requestedSeconds) < Math.abs(best - requestedSeconds) ? v : best), allowed[0]);
      let create;
      if (references.length) {
        const form = new FormData();
        form.append('model', model); form.append('prompt', prompt); form.append('seconds', String(seconds)); form.append('size', size);
        form.append('input_reference', new Blob([Buffer.from(references[0].data, 'base64')], { type: references[0].mime || 'image/png' }), 'reference.png');
        create = await fetch('https://api.openai.com/v1/videos', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
        if (!create.ok) throw new Error(`OpenAI ${create.status}: ${await create.text()}`);
      } else {
        create = await api('/v1/videos', { model, prompt, seconds: String(seconds), size }, key);
      }
      const job = await create.json();
      for (let attempt = 0; attempt < 150; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const poll = await fetch(`https://api.openai.com/v1/videos/${job.id}`, { headers: { Authorization: `Bearer ${key}` } });
        if (!poll.ok) throw new Error(`OpenAI video poll ${poll.status}`);
        const status = await poll.json();
        if (status.status === 'completed') {
          const content = await fetch(`https://api.openai.com/v1/videos/${job.id}/content`, { headers: { Authorization: `Bearer ${key}` } });
          if (!content.ok) throw new Error(`OpenAI video content ${content.status}`);
          return { bytes: Buffer.from(await content.arrayBuffer()), mime: 'video/mp4', provider: 'openai', model, seed: null, usage: null };
        }
        if (status.status === 'failed') throw new Error(`OpenAI video failed: ${status.error?.message || 'unknown'}`);
      }
      throw new Error('OpenAI video timed out');
    },
    async speak({ text, voice = 'alloy', instructions = 'Warm, cinematic, restrained.' }) {
      const response = await api('/v1/audio/speech', { model: process.env.SPEAK_MODEL_OPENAI || 'gpt-4o-mini-tts', voice, input: text, instructions, response_format: 'wav' }, key);
      return { bytes: Buffer.from(await response.arrayBuffer()), mime: 'audio/wav', provider: 'openai', model: process.env.SPEAK_MODEL_OPENAI || 'gpt-4o-mini-tts', seed: null, usage: null };
    }
  };
}
