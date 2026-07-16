// THE PROLOGUE RENDER — shared job builders for the forge-as-title-sequence.
// The forge's free render time paints the world's key art and the hero's
// permanent bust anchor before Chapter I opens, so the first impression is a
// painted world rather than a gradient. Every job honours the anchor law:
// the hero's first bust becomes the anchor for label `hero.name`, and the
// campaign key art carries the stable `keyart` label so later surfaces
// (Chapter I mast, chronicle covers, the bound book) resolve the latest plate.
import { heroSoul, keyArtPrompt, portraitPrompt } from './prompts.js';

export const KEYART_LABEL = 'keyart';

// Deterministic per-name seed so a face or a world paints the same way every
// time it is asked for — the forge preview and the sealed anchor match.
export const nameSeed = (name) => {
  let h = 0;
  for (const c of String(name || '')) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return h >>> 0;
};

// heroSoul lives in prompts.js now — the scene easel seats the hero too, so
// her canon reads the same wherever she is painted. Re-exported here so the
// forge's older imports stay true.
export { heroSoul } from './prompts.js';

// The act determines how dark the key art reads, so a save's cover evolves as
// the story turns. Cache key is per-act so each variant paints exactly once.
export function actOf(campaign) {
  return campaign?.codex?.spine?.beats?.[campaign.codex.beatIndex]?.act || 1;
}

export function keyArtJob(campaign, act = 1) {
  const variant = act >= 3 ? 'act-3' : act === 2 ? 'act-2' : 'establishing';
  return {
    kind: 'paint',
    prompt: keyArtPrompt(campaign, variant),
    options: { kind: 'keyart', label: KEYART_LABEL, variant, seed: nameSeed(`${campaign.title}:${campaign.covenant}`), dimensions: '1280x720' },
    priority: 1,
    cacheKey: `keyart:${campaign.id}:act-${act}`
  };
}

export function heroBustJob(campaign) {
  const soul = heroSoul(campaign.hero);
  return {
    kind: 'paint',
    prompt: portraitPrompt(campaign, soul, 'bust'),
    // The hero's bust is an origin anchor — it references nothing and becomes
    // the anchor that every later render of the hero resolves against.
    options: { kind: 'portrait', label: campaign.hero.name, variant: 'bust', seed: nameSeed(campaign.hero.name), referenceLabels: [] },
    priority: 0
  };
}
