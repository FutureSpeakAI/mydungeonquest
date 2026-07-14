import { db } from '../db.js';
import { sha256 } from '../canonical.js';
import { beatKeys } from './lookahead.js';

// ------------------------------------------------------------
// THE NARRATOR — the interactive-podcast voice. Each turn's prose
// is read aloud by the server speak chain (ElevenLabs → mock),
// cached in Dexie by turn, and played with any beat music ducked
// underneath. One narration plays at a time; a tiny pub/sub lets
// per-turn buttons reflect play/pause without prop drilling. This
// deliberately bypasses the Foundry tier gate: hearing the story
// read aloud is a comfort setting, available at any media tier.
// ------------------------------------------------------------

export function narrationText(dm) {
  return (dm?.narration_blocks || [])
    .map((block) => (block.speaker ? `${block.speaker}: ${block.text}` : block.text))
    .filter(Boolean)
    .join('\n\n');
}

const narrationKey = (campaignId, log) => `narration:${campaignId}:${log.recordHash || log.id}`;

// Generate (or reuse) the narration audio for one turn. Content-addressed in
// the same media table as painted assets so it survives reloads and export.
export async function ensureNarrationBlob(campaign, log) {
  const key = narrationKey(campaign.id, log);
  const cached = await db.media.where('cacheKey').equals(key).first();
  if (cached?.blob) return cached.blob;
  const text = narrationText(log.dm);
  if (!text) return null;
  const response = await fetch('/api/speak', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
  });
  if (!response.ok) throw new Error(`Narration failed (${response.status})`);
  const blob = await response.blob();
  try {
    const assetHash = await sha256(new Uint8Array(await blob.arrayBuffer()));
    await db.media.put({
      campaignId: campaign.id, kind: 'narration', cacheKey: key, assetHash,
      originTurnHash: log.recordHash || null, mime: blob.type, blob,
      provider: response.headers.get('X-Media-Provider') || 'unknown',
      model: response.headers.get('X-Media-Model') || 'unknown',
      label: null, variant: null, createdAt: Date.now()
    });
  } catch { /* caching is best-effort; playback still works this session */ }
  return blob;
}

// The music bed for a turn: its own beat stinger (matched by turn or by the
// lookahead-shared beat cache key), ducked under the voice during playback.
async function bedBlob(campaign, log) {
  const rows = await db.media.where('campaignId').equals(campaign.id).toArray();
  const music = rows.filter((row) => row.kind === 'music' && row.blob);
  if (!music.length) return null;
  const byTurn = music.filter((row) => log.recordHash && row.originTurnHash === log.recordHash)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (byTurn) return byTurn.blob;
  if (log.beatIndex != null) {
    const key = beatKeys(campaign.id, log.beatIndex).score;
    const found = music.find((row) => row.cacheKey === key);
    if (found) return found.blob;
  }
  return null;
}

let audio = null;   // HTMLAudioElement for the voice
let bed = null;     // HTMLAudioElement for the looped, ducked music bed
let activeId = null;
let activeUrls = [];
let session = 0;    // monotonic token; bumped on every stop/start so a slow
                    // generation that resolves after a newer request is discarded
const listeners = new Set();

function emit() {
  const state = { id: activeId, playing: Boolean(audio && !audio.paused && !audio.ended) };
  for (const fn of listeners) fn(state);
}

export function subscribeNarration(fn) {
  listeners.add(fn);
  fn({ id: activeId, playing: Boolean(audio && !audio.paused && !audio.ended) });
  return () => listeners.delete(fn);
}

export function stopNarration() {
  session += 1; // invalidate any generation still in flight
  if (audio) { audio.onended = null; audio.onpause = null; audio.onplay = null; audio.pause(); }
  if (bed) bed.pause();
  activeUrls.forEach((url) => URL.revokeObjectURL(url));
  activeUrls = []; audio = null; bed = null; activeId = null;
  emit();
}

export async function playNarration(campaign, log, { withBed = true } = {}) {
  stopNarration();
  const mine = session; // this call owns the narrator only while it stays current
  const blob = await ensureNarrationBlob(campaign, log).catch(() => null);
  // A newer play/stop happened while we were generating — drop this result so we
  // never start a second, overlapping voice track.
  if (!blob || mine !== session) return;
  const url = URL.createObjectURL(blob); activeUrls.push(url);
  const element = new Audio(url);
  audio = element; activeId = log.id;
  element.onended = () => stopNarration();
  element.onpause = emit; element.onplay = emit;
  if (withBed) {
    const music = await bedBlob(campaign, log);
    if (music && mine === session && audio === element) {
      const bedUrl = URL.createObjectURL(music); activeUrls.push(bedUrl);
      bed = new Audio(bedUrl); bed.loop = true; bed.volume = 0.16;
      bed.play().catch(() => { /* the voice still plays */ });
    }
  }
  if (mine !== session) return; // superseded during bed resolution
  try { await element.play(); } catch { /* a browser may block autoplay until a tap */ }
  emit();
}

// Play/pause toggle for a specific turn's narration button.
export function toggleNarration(campaign, log) {
  if (activeId === log.id && audio) {
    if (audio.paused) { audio.play().catch(() => {}); bed?.play().catch(() => {}); }
    else { audio.pause(); bed?.pause(); }
    emit();
    return Promise.resolve();
  }
  return playNarration(campaign, log);
}
