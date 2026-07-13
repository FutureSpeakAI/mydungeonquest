import { mockAdapter } from './mock.js';
import { openaiAdapter } from './openai.js';
import { elevenLabsAdapter } from './elevenlabs.js';
import { replicateAdapter } from './replicate.js';
import { geminiAdapter } from './gemini.js';

// Provider chains per media kind, in preference order. The first configured
// provider is tried first; on error the route falls through to the next, with
// mock as the always-available floor. Per-kind env overrides:
//   PAINT_PROVIDER / VIDEO_PROVIDER / SPEAK_PROVIDER / MUSIC_PROVIDER / SFX_PROVIDER
// Set one to a provider name to force it, or to "mock" to force placeholders.
export function providerChains() {
  const gemini = geminiAdapter(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const openai = openaiAdapter(process.env.OPENAI_API_KEY);
  const eleven = elevenLabsAdapter(process.env.ELEVENLABS_API_KEY);
  const replicate = replicateAdapter(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY);
  const byName = { gemini, openai, elevenlabs: eleven, replicate, mock: mockAdapter };

  // Preference order per kind. Filtered to configured providers; mock always last.
  const preferences = {
    paint: [gemini, openai],
    video: [gemini, openai, replicate],
    speak: [eleven, openai],
    music: [eleven],
    sfx: [eleven]
  };

  function chain(kind) {
    const override = process.env[`${kind.toUpperCase()}_PROVIDER`];
    if (override) {
      const forced = byName[override.toLowerCase()];
      return forced && (forced === mockAdapter || forced.capabilities?.configured) ? [forced, mockAdapter] : [mockAdapter];
    }
    const configured = (preferences[kind] || []).filter((a) => a.capabilities?.configured);
    return [...configured, mockAdapter];
  }

  const chains = {};
  for (const kind of ['paint', 'video', 'speak', 'music', 'sfx']) chains[kind] = chain(kind);
  chains.mock = mockAdapter;
  return chains;
}

// Back-compat: the primary (first) adapter per kind, used by /api/health.
export function adapters() {
  const chains = providerChains();
  const out = { mock: mockAdapter };
  for (const kind of ['paint', 'video', 'speak', 'music', 'sfx']) out[kind] = chains[kind][0];
  return out;
}
