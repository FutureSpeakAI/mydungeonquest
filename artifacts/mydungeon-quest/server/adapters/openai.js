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
    capabilities: { configured: Boolean(key), supportsReferences: false, maxReferenceImages: 0, supportsSeed: false, includesAudio: true, asynchronous: true },
    async paint({ prompt, size = '1536x1024' }) {
      const response = await api('/v1/images/generations', { model: process.env.PAINT_MODEL_OPENAI || 'gpt-image-1', prompt, size }, key);
      const json = await response.json();
      const item = json.data?.[0];
      const bytes = item?.b64_json ? Buffer.from(item.b64_json, 'base64') : Buffer.from(await (await fetch(item.url)).arrayBuffer());
      return { bytes, mime: 'image/png', provider: 'openai', model: process.env.PAINT_MODEL_OPENAI || 'gpt-image-1', seed: null, usage: json.usage || null };
    },
    async speak({ text, voice = 'alloy', instructions = 'Warm, cinematic, restrained.' }) {
      const response = await api('/v1/audio/speech', { model: process.env.SPEAK_MODEL_OPENAI || 'gpt-4o-mini-tts', voice, input: text, instructions, response_format: 'wav' }, key);
      return { bytes: Buffer.from(await response.arrayBuffer()), mime: 'audio/wav', provider: 'openai', model: process.env.SPEAK_MODEL_OPENAI || 'gpt-4o-mini-tts', seed: null, usage: null };
    }
  };
}
