// ------------------------------------------------------------
// THE ADAPTIVE SCORE — pure WebAudio, zero dependencies, offline.
// A drone rooted in the campaign's name, a minor-pentatonic motif
// that quickens with danger, and a tritone leitmotif whenever the
// villain takes the stage. One campaign, one sound, forever.
// ------------------------------------------------------------

const hash = (s) => { let h = 0; for (let i = 0; i < String(s).length; i++) { h = (h << 5) - h + String(s).charCodeAt(i); h |= 0; } return h; };
const PENTA = [0, 3, 5, 7, 10];
const freq = (root, semis) => root * Math.pow(2, semis / 12);

let ctx = null, master = null, drone = [], motifTimer = null, running = false, root = 55;
let state = { act: 1, combat: false, hpFrac: 1, blight: 0, villain: false, seed: 1, volume: 0.8 };

function ensureCtx() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.0001; master.connect(ctx.destination);
    return true;
  } catch { return false; }
}

export const scoreRunning = () => running;

export function startScore(campaignName, volume = 0.8) {
  if (running || !ensureCtx()) return;
  ctx.resume?.();
  state.seed = (hash(campaignName || 'chronicle') >>> 0) || 1;
  state.volume = volume;
  root = 55 * Math.pow(2, (state.seed % 12) / 12);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(master);
  drone = [0, 7, 12].map((semi, i) => {
    const osc = ctx.createOscillator(); osc.type = i ? 'sine' : 'triangle';
    osc.frequency.value = freq(root, semi) * (1 + (i ? 0.0015 : 0));
    const gain = ctx.createGain(); gain.gain.value = i ? 0.05 : 0.09;
    osc.connect(gain); gain.connect(lp); osc.start();
    return osc;
  });
  master.gain.setTargetAtTime(state.volume * 0.4, ctx.currentTime, 1.2);
  running = true;
  let step = 0;
  const R = () => { state.seed = (state.seed * 1664525 + 1013904223) >>> 0; return state.seed / 4294967296; };
  motifTimer = setInterval(() => {
    if (!running || !ctx) return;
    const intensity = Math.min(1, 0.18 + (state.combat ? 0.4 : 0) + state.blight * 0.07 + (1 - state.hpFrac) * 0.3 + (state.act - 1) * 0.08);
    if (R() < 0.3 + intensity * 0.5) {
      const semis = PENTA[Math.floor(R() * PENTA.length)] + 24 + (state.act >= 3 ? 12 : 0);
      pluck(freq(root, semis), ctx.currentTime + R() * 0.2, state.combat ? 0.5 : 1.6, 0.05 + intensity * 0.05, state.combat ? 'square' : 'sine');
    }
    if (state.villain && step % 4 === 0) { // the tritone motif
      pluck(freq(root, 30), ctx.currentTime, 0.9, 0.055, 'triangle');
      pluck(freq(root, 36), ctx.currentTime + 0.42, 1.1, 0.05, 'triangle');
    }
    if (state.combat && step % 2 === 0) pluck(freq(root, 12), ctx.currentTime, 0.12, 0.07, 'square');
    step++;
  }, 1150);
}

function pluck(f, when, dur, gain, type = 'sine') {
  const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = f;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g); g.connect(master);
  osc.start(when); osc.stop(when + dur + 0.05);
}

export function setScoreState(next) {
  state = { ...state, ...next };
  if (running && master && ctx) {
    const vol = state.volume * (0.35 + Math.min(0.35, state.blight * 0.04 + (state.combat ? 0.15 : 0)));
    master.gain.setTargetAtTime(vol, ctx.currentTime, 0.8);
  }
}

// A composed swell for cinematic moments — works even if the
// persistent score is off; leans on it when it's running.
export function scoreSwell() {
  if (!ensureCtx()) return;
  ctx.resume?.();
  const base = running ? root : 110;
  const t = ctx.currentTime;
  [0, 7, 12, 19].forEach((semi, i) => pluck(freq(base, semi + 12), t + i * 0.35, 4.5 - i * 0.5, 0.06 / (i * 0.5 + 1), i === 3 ? 'triangle' : 'sine'));
  if (running && master) {
    const prev = master.gain.value;
    master.gain.setTargetAtTime(Math.min(0.6, prev * 1.6 + 0.08), t, 0.4);
    master.gain.setTargetAtTime(prev, t + 4.5, 1.2);
  }
}

export function stopScore() {
  running = false;
  if (motifTimer) { clearInterval(motifTimer); motifTimer = null; }
  if (master && ctx) master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4);
  setTimeout(() => { drone.forEach((osc) => { try { osc.stop(); } catch { /* already stopped */ } }); drone = []; }, 1200);
}
