// ------------------------------------------------------------
// THE VOICE-CASTING LAW — free, local, sovereign.
// Each soul is cast ONCE, deterministically, from the device's
// Web Speech voices; pitch and rate derive from their canon
// `voice` line. The mentor never changes voice mid-campaign.
// ------------------------------------------------------------

const hash = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) { h = (h << 5) - h + String(s).charCodeAt(i); h |= 0; } return Math.abs(h); };

let voices = [];
const loadVoices = () => { try { voices = window.speechSynthesis.getVoices() || []; } catch { voices = []; } };
try { loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; } catch { /* no speech on this device */ }

export const speechAvailable = () => { try { return 'speechSynthesis' in window; } catch { return false; } };

const KEYWORDS = [
  [/deep|grave|low|boom|gravel|baritone/i, { pitch: -0.25, rate: -0.05 }],
  [/soft|gentle|quiet|whisper|velvet/i, { pitch: 0.05, rate: -0.08 }],
  [/fast|quick|clipped|sharp|rapid/i, { pitch: 0.05, rate: 0.12 }],
  [/slow|measured|patient|unhurried|dry/i, { pitch: 0, rate: -0.12 }],
  [/high|bright|young|reedy|alto/i, { pitch: 0.2, rate: 0.03 }],
  [/cold|flat|hollow|echo/i, { pitch: -0.12, rate: -0.02 }],
];

export function castVoice(name, canonVoiceLine) {
  const pool = voices.filter((v) => v.lang && v.lang.startsWith('en'));
  const list = pool.length ? pool : voices;
  const voice = list.length ? list[hash(name || 'narrator') % list.length] : null;
  let pitch = 1, rate = 0.96;
  for (const [pattern, adjust] of KEYWORDS) if (pattern.test(canonVoiceLine || '')) { pitch += adjust.pitch; rate += adjust.rate; }
  return { voice, pitch: Math.max(0.5, Math.min(1.6, pitch)), rate: Math.max(0.7, Math.min(1.3, rate)) };
}

let speaking = false;

export function stopSpeaking() {
  speaking = false;
  try { window.speechSynthesis.cancel(); } catch { /* nothing to cancel */ }
}

function speakOne(text, name, canonVoiceLine, volume) {
  return new Promise((resolve) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const { voice, pitch, rate } = castVoice(name, canonVoiceLine);
      if (voice) utterance.voice = voice;
      utterance.pitch = pitch; utterance.rate = rate; utterance.volume = volume;
      utterance.onend = resolve; utterance.onerror = resolve;
      window.speechSynthesis.speak(utterance);
    } catch { resolve(); }
  });
}

export function speakLine(line, speakerName, cast = [], volume = 0.9) {
  if (!speechAvailable() || !line) return Promise.resolve();
  const soul = cast.find((entry) => entry.name === speakerName);
  return speakOne(line, speakerName || 'narrator', soul?.voice || 'measured, warm, storyteller', volume);
}

export async function speakBlocks(blocks, cast = [], volume = 0.85) {
  if (!speechAvailable()) return;
  stopSpeaking();
  speaking = true;
  for (const block of blocks || []) {
    if (!speaking || !block?.text) return;
    const soul = block.speaker ? cast.find((entry) => entry.name === block.speaker) : null;
    await speakOne(block.text, block.speaker || 'narrator', soul?.voice || 'measured, warm, storyteller', volume);
  }
  speaking = false;
}
