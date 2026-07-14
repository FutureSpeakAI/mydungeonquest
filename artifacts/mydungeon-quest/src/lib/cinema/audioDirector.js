// ------------------------------------------------------------
// THE AUDIO DIRECTOR — the single throat through which every
// non-narration sound must pass. The Sound Law, enforced:
//   · The voice lane outranks everything. While any narration is
//     audible, no music and no effect may START; whatever is
//     playing is stopped the instant a voice takes the stage.
//   · One sound at a time, total: the director owns at most one
//     live element (a music phrase OR one effect), never two.
//   · Nothing loops. Music is a phrase with an ending; an effect
//     is a one-shot. A sound that misses its moment (its wait
//     expires while a voice holds the stage) is dropped —
//     silence is always lawful, overlap never is.
//   · Provenance or silence: only real, attested audio plays.
//     Mock provenance is refused at this layer — the keyless
//     floor for audio is silence, not placeholders.
// Plain module state over the global Audio constructor, so the
// node evals drive it with the same stubs as the narrator suite.
// ------------------------------------------------------------

const lawfulProvider = (provider) => Boolean(provider) && provider !== 'mock';

let voiceActive = false;
let live = null;   // { element, url, lane } — the one director-owned sound
let queue = [];    // staged punctuation: { lane, blob, provider, volume, requestedAt, expiresAt }

function cleanupLive() {
  if (!live) return;
  const { element, url } = live;
  live = null;
  element.onended = null;
  try { element.pause(); } catch { /* already stopped */ }
  if (url) { try { URL.revokeObjectURL(url); } catch { /* test stubs */ } }
}

function startSound(item) {
  cleanupLive();
  let url = null;
  try { url = URL.createObjectURL(item.blob); } catch { return; }
  const element = new Audio(url);
  element.loop = false; // nothing the director plays may ever loop
  element.volume = item.volume;
  live = { element, url, lane: item.lane };
  element.onended = () => { cleanupLive(); pump(); };
  try {
    const played = element.play();
    if (played?.catch) played.catch(() => { cleanupLive(); pump(); });
  } catch { cleanupLive(); }
}

// A gap has opened (a sound ended, or the voice yielded): drop whatever
// expired waiting, then play the eldest survivor — effects before music,
// because an effect is a moment and music is a mood.
function pump() {
  const now = Date.now();
  queue = queue.filter((item) => item.expiresAt > now);
  if (voiceActive || live || !queue.length) return;
  queue.sort((a, b) => (a.lane === b.lane ? a.requestedAt - b.requestedAt : a.lane === 'sfx' ? -1 : 1));
  startSound(queue.shift());
}

// The narrator reports its own state here. The instant a voice becomes
// audible, the stage is cleared — no fade, no negotiation. When the voice
// yields, staged punctuation that hasn't expired may fire.
export function setVoiceActive(active) {
  const next = Boolean(active);
  if (next === voiceActive) return;
  voiceActive = next;
  if (voiceActive) cleanupLive();
  else pump();
}

function request(lane, { blob, provider, volume, maxWaitMs = 0 }) {
  if (!blob || !lawfulProvider(provider)) return false; // the audio floor is silence
  if (voiceActive || live) {
    // A newer music phrase supersedes an older one (a re-fired cinematic).
    if (lane === 'music' && !voiceActive && live?.lane === 'music') { startSound({ lane, blob, provider, volume }); return true; }
    if (maxWaitMs > 0) {
      queue.push({ lane, blob, provider, volume, requestedAt: Date.now(), expiresAt: Date.now() + maxWaitMs });
      return true; // staged — it may still expire unheard, which is lawful
    }
    return false; // its moment is occupied → dropped, never overlapped
  }
  startSound({ lane, blob, provider, volume });
  return true;
}

// Music: a short phrase at a punctuation moment (arrival, cinematic, chapter
// close, the Sealing). Never looped, never under a voice.
export const playMusic = (options) => request('music', { volume: 0.45, ...options });

// An effect: one deliberate accent (a die on parchment, a page, a seal).
export const playSfx = (options) => request('sfx', { volume: 0.5, ...options });

export function stopMusic() {
  if (live?.lane === 'music') cleanupLive();
  queue = queue.filter((item) => item.lane !== 'music');
}

export function stopAllSound() { queue = []; cleanupLive(); }

// Test seam: the evals assert the Law against this, not against internals.
export function directorState() {
  return { voiceActive, playing: live ? live.lane : null, queued: queue.length };
}
