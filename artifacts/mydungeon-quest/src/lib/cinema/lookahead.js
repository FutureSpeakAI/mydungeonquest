import { scrubPrompt } from './prompts.js';

// ------------------------------------------------------------
// LOOKAHEAD (the Foundry's foresight) — the spine is known, so
// while beat N plays, beat N+1's cinematic package is already
// being briefed: a painted still and a score stinger, keyed by
// campaign+beat so they are found again the moment the DM's
// actual cinematic fires. Play never waits on a render queue.
// ------------------------------------------------------------

export const beatKeys = (campaignId, beatIndex) => ({
  still: `beat:${campaignId}:${beatIndex}:still`,
  score: `beat:${campaignId}:${beatIndex}:score`,
});

function beatPrompt(campaign, beat) {
  const style = campaign.codex?.arc?.style_bible || campaign.styleBible || 'Painterly illuminated dark fantasy.';
  const villain = (campaign.codex?.cast || []).find((soul) => soul.role === 'villain');
  const region = (campaign.codex?.regions || [])[0];
  return scrubPrompt(
    // The beat's TITLE stays off the brief — a quoted title is a title-card
    // invitation (the plague's oldest habit); the goal carries the picture.
    `${style}. A 16:9 painted keyframe of this story beat: ${beat.goal} ` +
    `${villain ? `The villain's presence may be felt: ${villain.visual}. ` : ''}` +
    `${region ? `Setting canon: ${region.name} — ${region.visual}, currently ${region.state}. ` : ''}` +
    `Blight ${campaign.codex?.blight || 0}/5 shown through weather and light. One clear action, strong silhouette.`,
    campaign
  );
}

// Briefs the NEXT beat's package on the given (shared-lane) foundry.
// Silent, best-effort, cache-first; a no-op below the illuminated tier.
export function briefUpcomingBeat(campaign, foundry, currentBeatIndex = null) {
  const codex = campaign.codex;
  if (!codex?.spine?.beats) return;
  const nextIndex = Math.min((currentBeatIndex ?? codex.beatIndex) + 1, codex.spine.beats.length - 1);
  const beat = codex.spine.beats[nextIndex];
  if (!beat) return;
  const keys = beatKeys(campaign.id, nextIndex);
  const prompt = beatPrompt(campaign, beat);
  const villain = (campaign.codex?.cast || []).find((soul) => soul.role === 'villain');
  const anchorLabels = [villain?.name, (campaign.codex?.regions || [])[0]?.name].filter(Boolean);
  foundry.enqueue({ kind: 'paint', prompt, priority: 5, cacheKey: keys.still, options: { kind: 'beat-still', label: beat.title, referenceLabels: anchorLabels } }).catch(() => {});
  // THE SOUND LAW: one short phrase for the beat's chapter card — a musical
  // sentence that ends cleanly. It plays once at the card, never as a bed.
  foundry.enqueue({ kind: 'music', prompt: `A short orchestral phrase for the beat "${beat.title}" — act ${beat.act}. One musical sentence, eight to twelve seconds, that ends cleanly and resolves toward silence. Restrained, cinematic, PG-13. No vocals.`, priority: 7, cacheKey: keys.score, options: { label: beat.title, durationSeconds: 10 } }).catch(() => {});
}
