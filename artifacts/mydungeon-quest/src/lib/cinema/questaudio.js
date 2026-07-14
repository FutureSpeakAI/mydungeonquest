import { db } from '../db.js';
import { bytesToBase64 } from '../canonical.js';
import { ensureNarrationBlob } from './narrator.js';

// ------------------------------------------------------------
// THE BOUND AUDIOBOOK — stitches a whole quest's narration (with
// its music bed ducked underneath) into one downloadable file.
// The audio lives on-device in IndexedDB, so we generate any
// missing narration, ship the ordered segments to the server, and
// it returns a single mixed MP3 (ffmpeg does the concat + duck).
// ------------------------------------------------------------

async function blobToBase64(blob) {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

export async function downloadQuestAudio(campaign, onProgress) {
  const logs = (campaign.logs || []).filter((log) => !log.redacted && log.dm?.narration_blocks?.length);
  if (!logs.length) throw new Error('There is no narration to bind yet.');

  const segments = [];
  for (let i = 0; i < logs.length; i += 1) {
    onProgress?.(`Reading turn ${i + 1} of ${logs.length}…`);
    const blob = await ensureNarrationBlob(campaign, logs[i]).catch(() => null);
    if (blob) segments.push({ audio: await blobToBase64(blob), mime: blob.type });
  }
  if (!segments.length) throw new Error('The narration could not be generated.');

  // A single music bed under the whole reading: the earliest beat stinger we have.
  const rows = await db.media.where('campaignId').equals(campaign.id).toArray();
  const bedRow = rows.filter((row) => row.kind === 'music' && row.blob).sort((a, b) => a.createdAt - b.createdAt)[0];
  const bed = bedRow ? { audio: await blobToBase64(bedRow.blob), mime: bedRow.mime } : null;

  onProgress?.('Binding the chronicle into one reading…');
  const response = await fetch('/api/quest-audio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments, bed, title: campaign.title })
  });
  if (!response.ok) {
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || 'The chronicle audio could not be mixed.');
  }
  return response.blob();
}
