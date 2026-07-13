import { scrubPrompt } from './prompts.js';

// ------------------------------------------------------------
// THE PROLOGUE — the forge is free render time. While the player
// speaks a world into being and shapes a hero, the Foundry paints
// the campaign's key art and the hero's portrait so Chapter I can
// open on a painted world instead of a bare gradient.
// Key art is versioned by act so a save's cover darkens as the
// story turns toward crisis.
// ------------------------------------------------------------

export const keyArtKey = (id, act = 1) => `keyart:${id}:act${act}`;
export const heroPortraitKey = (id) => `hero-portrait:${id}`;

const actMood = (act) =>
  act >= 3
    ? ' The stakes stand at their absolute peak — the light besieged, the palette deepened toward crisis, storm and ember in the air.'
    : act === 2
      ? ' The mood has darkened; shadows lengthen, weather turns, and the world shows the first strain of the coming design.'
      : '';

export function keyArtPrompt(draft, act = 1) {
  const style = draft?.codex?.arc?.style_bible || draft.styleBible;
  return scrubPrompt(
    `${style}. Sweeping 16:9 cinematic key art establishing the world of "${draft.title}": ${draft.covenant}. ` +
      `Tone: ${draft.tone}. Epic film-poster composition, dramatic light, strong silhouettes, deep atmospheric ` +
      `perspective, a lone figure dwarfed by a vast world. No text, no lettering, no title, no frame.${actMood(act)}`,
    draft
  );
}

export function heroPortraitPrompt(draft, hero) {
  const style = draft?.codex?.arc?.style_bible || draft.styleBible;
  return scrubPrompt(
    `${style}. Heroic three-quarter bust portrait of ${hero.name}, a ${hero.ancestry} ${hero.className}. ` +
      `${hero.background} Noble dramatic lighting, expressive face, painterly illuminated detail, ` +
      `strong silhouette against atmospheric depth. No text, no frame.`,
    draft
  );
}
