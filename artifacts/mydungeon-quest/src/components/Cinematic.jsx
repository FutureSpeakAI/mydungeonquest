import { useEffect, useMemo } from 'react';
import { X, Volume2 } from 'lucide-react';
import { proceduralArtDataUrl } from '../lib/cinema/procedural.js';

function playScore(palette) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain(); master.gain.setValueAtTime(.0001, ctx.currentTime); master.gain.exponentialRampToValueAtTime(.08, ctx.currentTime + .8); master.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + 5.8); master.connect(ctx.destination);
    [110, 165, 220, 311].forEach((freq, index) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = index === 3 ? 'triangle' : 'sine'; osc.frequency.value = freq; gain.gain.value = .24 / (index + 1);
      osc.connect(gain); gain.connect(master); osc.start(ctx.currentTime + index * .35); osc.stop(ctx.currentTime + 6);
    });
    setTimeout(() => ctx.close(), 6500);
  } catch { /* Audio is an enhancement. */ }
}

export default function Cinematic({ cinematic, dialogue, campaign, reduceMotion, score, onClose }) {
  const art = useMemo(() => proceduralArtDataUrl(`${campaign.id}:${cinematic.title}`, cinematic.title, cinematic.palette), [campaign.id, cinematic]);
  useEffect(() => {
    if (reduceMotion) { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); }
    if (score) playScore(cinematic.palette);
    if (dialogue?.line && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(dialogue.line); utterance.rate = .88; utterance.pitch = .92;
      setTimeout(() => speechSynthesis.speak(utterance), 1400);
    }
    const timer = setTimeout(onClose, 8000);
    return () => { clearTimeout(timer); speechSynthesis?.cancel?.(); };
  }, [dialogue, reduceMotion, score, onClose, cinematic.palette]);
  if (reduceMotion) return <div className="quiet-beat"><span>✦</span><strong>{cinematic.title}</strong><small>{cinematic.subtitle}</small></div>;
  return <div className="cinematic" onClick={onClose} role="dialog" aria-label={`${cinematic.title} cinematic`}>
    <img src={art} alt="" className="cinematic-art" />
    <div className="cinematic-wash" style={{ '--c1': cinematic.palette[0], '--c2': cinematic.palette[1], '--c3': cinematic.palette[2] }} />
    <div className="particles">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    <button className="cinematic-close" onClick={onClose} aria-label="Skip cinematic"><X /></button>
    <div className="cinematic-title"><div className="gold-rule" /><p>{cinematic.type.replace('_',' ')}</p><h2>{cinematic.title}</h2><h3>{cinematic.subtitle}</h3></div>
    {dialogue?.line && <div className="cinematic-subtitle"><Volume2 size={16}/><span><strong>{dialogue.speaker}</strong> — {dialogue.line}</span></div>}
  </div>;
}
