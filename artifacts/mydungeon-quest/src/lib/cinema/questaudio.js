import { bytesToBase64 } from '../canonical.js';
import { narrationSegments, ensureSegmentAsset } from './narrator.js';

// ------------------------------------------------------------
// THE BOUND AUDIOBOOK — stitches a whole quest's narration into
// one downloadable reading. THE SOUND LAW: the voices stand
// alone — no music bed is mixed underneath, and segments of mock
// provenance are never bound (a keyless table declines honestly
// instead of shipping placeholder tones). The audio lives
// on-device in IndexedDB; we generate any missing narration, ship
// the ordered segments to the server, and it returns one MP3.
// ------------------------------------------------------------

async function blobToBase64(blob) {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

export async function downloadQuestAudio(campaign, onProgress) {
  const logs = (campaign.logs || []).filter((log) => !log.redacted && log.dm?.narration_blocks?.length);
  if (!logs.length) throw new Error('There is no narration to bind yet.');

  const cast = campaign.codex?.cast || [];
  const segments = [];
  let refused = 0;
  for (let i = 0; i < logs.length; i += 1) {
    onProgress?.(`Reading turn ${i + 1} of ${logs.length}…`);
    // Each turn is a cast performance: the narrator's prose plus each
    // character's own voice, in order, appended to the single reading.
    const parts = narrationSegments(logs[i].dm, cast);
    for (let s = 0; s < parts.length; s += 1) {
      const asset = await ensureSegmentAsset(campaign, logs[i], parts[s], s).catch(() => null);
      if (!asset?.blob) continue;
      if (asset.provider === 'mock') { refused += 1; continue; }
      segments.push({ audio: await blobToBase64(asset.blob), mime: asset.blob.type });
    }
  }
  if (!segments.length) {
    throw new Error(refused
      ? 'The narrator needs a real voice (an ElevenLabs key). Placeholder audio is never bound.'
      : 'The narration could not be generated.');
  }

  onProgress?.('Binding the chronicle into one reading…');
  const response = await fetch('/api/quest-audio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments, title: campaign.title })
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || 'The chronicle audio could not be mixed.');
  }
  return response.blob();
}
