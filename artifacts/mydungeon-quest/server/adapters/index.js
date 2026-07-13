import { mockAdapter } from './mock.js';
import { openaiAdapter } from './openai.js';
import { elevenLabsAdapter } from './elevenlabs.js';

export function adapters() {
  const openai = openaiAdapter(process.env.OPENAI_API_KEY);
  const eleven = elevenLabsAdapter(process.env.ELEVENLABS_API_KEY);
  return {
    paint: process.env.PAINT_PROVIDER === 'openai' && process.env.OPENAI_API_KEY ? openai : mockAdapter,
    video: mockAdapter,
    speak: process.env.SPEAK_PROVIDER === 'elevenlabs' && process.env.ELEVENLABS_API_KEY ? eleven : process.env.SPEAK_PROVIDER === 'openai' && process.env.OPENAI_API_KEY ? openai : mockAdapter,
    music: process.env.MUSIC_PROVIDER === 'elevenlabs' && process.env.ELEVENLABS_API_KEY ? eleven : mockAdapter,
    sfx: process.env.SFX_PROVIDER === 'elevenlabs' && process.env.ELEVENLABS_API_KEY ? eleven : mockAdapter,
    mock: mockAdapter
  };
}
