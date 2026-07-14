import { db } from '../db.js';
import { sha256 } from '../canonical.js';
import { playSfx } from './audioDirector.js';
import { tollRefusal } from '../../patron/tollNotice.js';

// ------------------------------------------------------------
// THE TABLE'S FEW SOUNDS — a tiny, deliberate vocabulary of
// one-shot effects, each an accent at a moment the player caused:
// a die settling on parchment, a blade drawn as combat opens, a
// page turning as the book does. Generated once (ElevenLabs),
// cached globally by name, and played only through the Audio
// Director, which drops them rather than let them overlap a
// voice. Mock provenance is refused: keyless tables are silent.
// ------------------------------------------------------------

const PROMPTS = {
  die: 'A single small wooden die rattling briefly across a parchment-covered table and settling. Dry, close, intimate. No music, no voices.',
  sword: 'One short, restrained ring of a sword being drawn from a scabbard. Low, close, brief. No music, no voices.',
  page: 'A single soft page turn of a heavy old book, close and quiet. No music, no voices.',
  seal: 'A brass seal matrix pressing once into warm soft wax on parchment — a short, weighty, satisfying press and release. Close, quiet, dry. No music, no voices.',
};

const keyOf = (name) => `sfx:ui:${name}`;

// Fire-and-forget. First use may need to generate the asset; if that takes so
// long the moment has visibly passed, we bank the cache for next time and play
// nothing now — a late accent is worse than none.
export async function playUiSfx(campaign, name) {
  try {
    if (!campaign || campaign.mediaTier === 'parchment') return;
    const prompt = PROMPTS[name];
    if (!prompt) return;
    const key = keyOf(name);
    let row = await db.media.where('cacheKey').equals(key).first();
    const started = Date.now();
    if (!row?.blob) {
      const response = await fetch('/api/sfx', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, durationSeconds: 2 }),
      });
      if (!response.ok) {
        await tollRefusal(response); // a spent sting still gets its receipt
        return;
      }
      const blob = await response.blob();
      const provider = response.headers.get('X-Media-Provider') || 'unknown';
      if (provider === 'mock') return; // the audio floor is silence
      row = {
        campaignId: campaign.id, kind: 'sfx', cacheKey: key,
        assetHash: await sha256(new Uint8Array(await blob.arrayBuffer())),
        originTurnHash: null, mime: blob.type, blob, provider,
        model: response.headers.get('X-Media-Model') || 'unknown',
        label: name, variant: null, subtype: 'ui', createdAt: Date.now(),
      };
      try { await db.media.put(row); } catch { /* best-effort cache */ }
      if (Date.now() - started > 4000) return; // the moment passed; stay quiet
    }
    playSfx({ blob: row.blob, provider: row.provider, volume: 0.5, maxWaitMs: 1800 });
  } catch { /* silence is always lawful */ }
}
