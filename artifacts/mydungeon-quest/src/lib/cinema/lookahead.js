import { scrubPrompt } from './prompts.js';

// ------------------------------------------------------------
// LOOKAHEAD (the Foundry's foresight) — the spine is known, so
// while beat N plays, beat N+1's cinematic package is already
// being briefed: a film, a still, and a score stinger, keyed by
// campaign+beat so they are found again the moment the DM's
// actual cinematic fires. Play never waits on a render queue.
// ------------------------------------------------------------

export const beatKeys = (campaignId, beatIndex) => ({
  film: `beat:${campaignId}:${beatIndex}:film`,
  still: `beat:${campaignId}:${beatIndex}:still`,
  score: `beat:${campaignId}:${beatIndex}:score`,
});

function beatPrompt(campaign, beat) {
  const style = campaign.codex?.arc?.style_bible || campaign.styleBible || 'Painterly illuminated dark fantasy.';
  const villain = (campaign.codex?.cast || []).find((soul) => soul.role === 'villain');
  const region = (campaign.codex?.regions || [])[0];
  return scrubPrompt(
    `${style}. A 6-10 second 16:9 cinematic for the story beat "${beat.title}": ${beat.goal} ` +
    `${villain ? `The villain's presence may be felt: ${villain.visual}. ` : ''}` +
    `${region ? `Setting canon: ${region.name} — ${region.visual}, currently ${region.state}. ` : ''}` +
    `Blight ${campaign.codex?.blight || 0}/5 shown through weather and light. Slow purposeful camera, one readable action, strong silhouette, no cuts faster than two seconds.`,
    campaign
  );
}

// Briefs the NEXT beat's package on the given (shared-lane) foundry.
// Silent, best-effort, cache-first; a no-op below the cinema tier
// for film/score and below illuminated for the still.
export function briefUpcomingBeat(campaign, foundry, currentBeatIndex = null) {
  const codex = campaign.codex;
  if (!codex?.spine?.beats) return;
  const nextIndex = Math.min((currentBeatIndex ?? codex.beatIndex) + 1, codex.spine.beats.length - 1);
  const beat = codex.spine.beats[nextIndex];
  if (!beat) return;
  const keys = beatKeys(campaign.id, nextIndex);
  const prompt = beatPrompt(campaign, beat);
  foundry.enqueue({ kind: 'video', prompt, priority: 6, cacheKey: keys.film, options: { kind: 'beat-film', label: beat.title } }).catch(() => {});
  foundry.enqueue({ kind: 'paint', prompt: `${prompt} A single painted keyframe of the moment.`, priority: 5, cacheKey: keys.still, options: { kind: 'beat-still', label: beat.title } }).catch(() => {});
  foundry.enqueue({ kind: 'music', prompt: `A 20 second cinematic stinger for the beat "${beat.title}" — act ${beat.act}, restrained, orchestral, PG-13.`, priority: 7, cacheKey: keys.score, options: { label: beat.title } }).catch(() => {});
}
