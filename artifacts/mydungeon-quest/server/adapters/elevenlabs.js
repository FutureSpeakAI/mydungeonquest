async function post(path, body, key, accept = 'audio/mpeg') {
  const response = await fetch(`https://api.elevenlabs.io${path}`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: accept }, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

export function elevenLabsAdapter(key) {
  return {
    name: 'elevenlabs', capabilities: { configured: Boolean(key), supportsReferences: false, maxReferenceImages: 0, supportsSeed: false, includesAudio: true, asynchronous: false },
    async speak({ text, voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' }) {
      const bytes = await post(`/v1/text-to-speech/${voiceId}`, { text, model_id: process.env.ELEVENLABS_VOICE_MODEL || 'eleven_multilingual_v2' }, key);
      return { bytes, mime: 'audio/mpeg', provider: 'elevenlabs', model: process.env.ELEVENLABS_VOICE_MODEL || 'eleven_multilingual_v2', seed: null, usage: null };
    },
    async music({ prompt, durationSeconds = 12 }) {
      // THE SOUND LAW: music is a short phrase with an ending — a musical
      // sentence at a punctuation moment, never a bed. Clamp 8–20 seconds.
      const bytes = await post('/v1/music', { prompt, music_length_ms: Math.max(8000, Math.min(20000, durationSeconds * 1000)) }, key);
      return { bytes, mime: 'audio/mpeg', provider: 'elevenlabs', model: 'music', seed: null, usage: null };
    },
    async sfx({ prompt, durationSeconds = 4 }) {
      const bytes = await post('/v1/sound-generation', { text: prompt, duration_seconds: Math.max(.5, Math.min(22, durationSeconds)), prompt_influence: .5 }, key);
      return { bytes, mime: 'audio/mpeg', provider: 'elevenlabs', model: 'sound-generation', seed: null, usage: null };
    }
  };
}
