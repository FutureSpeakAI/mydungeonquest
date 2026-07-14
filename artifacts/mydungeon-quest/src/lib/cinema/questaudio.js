import { db, campaignJournal } from '../db.js';
import { bytesToBase64, sha256 } from '../canonical.js';
import { narratorVoiceId, resolveVoiceId } from './casting.js';
import { buildPodcastScript, validatePodcastScript, buildMixPlan } from '../podcast.js';
import { tollRefusal } from '../../patron/tollNotice.js';

// ------------------------------------------------------------
// THE PODCAST FORGE, client side (the Experience Cut, Phase 5).
// The episode is compiled from the sealed record ONLY — the
// Chronicler's passages read whole by the narrator, the cast
// re-speaking their finest sealed lines in their own voices, a
// fixed liturgy for the frame — validated against the verbatim
// court before a single voice is generated. Then the sequencer
// binds it: voices with breathing gaps, stings (sealed musical
// phrases, real provenance only) sounding only BETWEEN sections,
// chapter markers, the key art as cover. THE SOUND LAW: nothing
// plays under a voice, and mock audio is never bound — a keyless
// table declines honestly and keeps the book.
// ------------------------------------------------------------

async function blobBase64(blob) {
  return bytesToBase64(new Uint8Array(await blob.arrayBuffer()));
}

// Generate (or reuse) one podcast line in one voice. Content-addressed by
// voice + text so a re-forged episode reuses every line that did not change.
async function ensurePodcastAsset(campaign, voiceId, text) {
  const digest = await sha256(new TextEncoder().encode(`${voiceId}\n${text}`));
  const key = `podcast:${campaign.id}:${digest}`;
  const cached = await db.media.where('cacheKey').equals(key).first();
  // A mock-cached line is a MISS, not a hit: once a real key arrives the line
  // must be re-voiced for real, and the placeholder row is swept before the
  // true take is written — a keyless era never locks a line out of the forge.
  if (cached?.blob && cached.provider && cached.provider !== 'mock') return { blob: cached.blob, provider: cached.provider };
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId })
  });
  if (!response.ok) {
    const closed = await tollRefusal(response);
    throw new Error(closed?.error || `The voice failed (${response.status})`);
  }
  const blob = await response.blob();
  const provider = response.headers.get('X-Media-Provider') || 'unknown';
  try {
    await db.media.where('cacheKey').equals(key).delete();
    await db.media.put({
      campaignId: campaign.id, kind: 'narration', cacheKey: key,
      assetHash: await sha256(new Uint8Array(await blob.arrayBuffer())),
      originTurnHash: null, mime: blob.type, blob, provider,
      model: response.headers.get('X-Media-Model') || 'unknown',
      label: 'podcast', variant: voiceId, createdAt: Date.now()
    });
  } catch { /* caching is best-effort; the forge still binds this session */ }
  return { blob, provider };
}

export async function downloadQuestAudio(campaign, onProgress) {
  onProgress?.('Compiling the script from the sealed record…');
  const journal = await campaignJournal(campaign.id);
  const script = buildPodcastScript({ campaign, journal });
  const verdict = validatePodcastScript(script, { campaign, journal });
  if (!verdict.ok) throw new Error(`The script broke the law: ${verdict.errors[0]}`);

  const cast = campaign.codex?.cast || [];
  const flat = [];
  script.sections.forEach((section, index) => section.segments.forEach((segment) => flat.push({ section: index, segment })));
  if (!flat.length) throw new Error('There is nothing sealed to retell yet.');

  // Voice every line — narrator or the character's own cast voice — refusing
  // mock provenance at the door. A refused line simply falls out of the plan;
  // the gaps close around it.
  const voices = [];
  const segments = [];
  let refused = 0;
  for (let i = 0; i < flat.length; i += 1) {
    onProgress?.(`Voicing line ${i + 1} of ${flat.length}…`);
    const { section, segment } = flat[i];
    const voiceId = segment.voice === 'narrator'
      ? narratorVoiceId()
      : resolveVoiceId(cast.find((soul) => String(soul.name).toLowerCase() === String(segment.voice).toLowerCase()), segment.voice);
    const asset = await ensurePodcastAsset(campaign, voiceId, segment.text).catch(() => null);
    if (!asset?.blob) continue;
    if (asset.provider === 'mock') { refused += 1; continue; }
    const ref = `v${segments.length}`;
    segments.push({ ref, audio: await blobBase64(asset.blob), mime: asset.blob.type, provider: asset.provider });
    voices.push({ ref, section });
  }
  if (!voices.length) {
    throw new Error(refused
      ? 'The podcast needs voices. Add a key, or keep the book.'
      : 'The narration could not be generated.');
  }

  // Stings: the tale's own sealed musical phrases (never mock), sounding only
  // between sections. No phrases sealed → the sections turn in silence, lawfully.
  onProgress?.('Choosing stings for the gaps…');
  const rows = await db.media.where('campaignId').equals(campaign.id).toArray();
  const stingRows = rows
    .filter((row) => row.kind === 'music' && row.blob && row.provider && row.provider !== 'mock')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
  const stings = [];
  for (let i = 0; i < stingRows.length; i += 1) {
    stings.push({ ref: `s${i}`, audio: await blobBase64(stingRows[i].blob), mime: stingRows[i].mime || stingRows[i].blob.type, provider: stingRows[i].provider });
  }

  const plan = buildMixPlan({ voices, chapters: script.chapters, stings: stings.map((sting) => sting.ref) });

  // The cover: the latest key art, sent as a strict data URI (the server's
  // door refuses anything that is not a plain base64 image).
  let cover = null;
  const art = rows.filter((row) => row.kind === 'paint' && row.label === 'keyart' && row.blob).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (art) cover = `data:${art.mime || art.blob.type};base64,${await blobBase64(art.blob)}`;

  onProgress?.('Sequencing — voices, breathing gaps, stings between…');
  const response = await fetch('/api/quest-audio', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: campaign.title, segments, stings, plan, cover })
  });
  if (!response.ok) {
    await tollRefusal(response); // a spent forge shows the receipt, not a stack trace
    const message = await response.json().catch(() => ({}));
    throw new Error(message.error || 'The episode could not be sequenced.');
  }
  return response.blob();
}
