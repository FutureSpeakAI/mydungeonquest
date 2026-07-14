import { useEffect, useRef, useState } from 'react';
import { X, Volume2 } from 'lucide-react';
import { db } from '../lib/db.js';
import { beatKeys } from '../lib/cinema/lookahead.js';
import { scoreSwell } from '../lib/cinema/score.js';
import { speakLine } from '../lib/cinema/voice.js';
import { proceduralArtDataUrl } from '../lib/cinema/procedural.js';

// ------------------------------------------------------------
// THE CINEMATIC — a three-tier ladder, best available wins:
//   1. Film    — the generated video briefed by lookahead or by
//                this turn's foundry jobs.
//   2. Animatic — a Ken Burns pass over the generated still.
//   3. Procedural — the palette art, last resort only.
// Music plays the generated stinger when it exists, otherwise
// the score swells. The dialogue line speaks in its soul's cast
// voice. Tap always skips. Reduce-motion gets a quiet beat.
// ------------------------------------------------------------

async function resolveAssets(campaign, turnRecordHash, beatIndex) {
  const rows = await db.media.where('campaignId').equals(campaign.id).toArray();
  const keys = beatKeys(campaign.id, beatIndex ?? campaign.codex?.beatIndex ?? 0);
  const byKey = (key) => rows.find((row) => row.cacheKey === key && row.blob);
  const byTurn = (kind) => rows.filter((row) => row.kind === kind && row.blob && turnRecordHash && row.originTurnHash === turnRecordHash)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const newest = (list) => list.sort((a, b) => b.createdAt - a.createdAt)[0];
  const paints = rows.filter((row) => row.kind === 'paint' && row.blob);
  // Prefer a true scene so the backdrop is a place, not a character bust. New
  // rows carry an explicit subtype; older rows are inferred — scene plates are
  // the only paint jobs enqueued without a label/variant.
  const isScene = (row) => (row.subtype ? row.subtype === 'scene' : !row.label && !row.variant);
  const latestScene = newest(paints.filter(isScene));
  const latestPaint = newest(paints);
  return {
    film: byKey(keys.film) || byTurn('video') || null,
    // The chapter card usually fires the instant a turn seals, BEFORE that
    // turn's paint has landed — so a beat-key/turn-hash miss used to drop all
    // the way to the flat procedural gradient. Borrow the campaign's most
    // recent painted scene instead (any painted art beats the gradient, which
    // remains a true last resort).
    still: byKey(keys.still) || byTurn('paint') || latestScene || latestPaint || null,
    music: byKey(keys.score) || byTurn('music') || null
  };
}

export default function Cinematic({ cinematic, dialogue, campaign, reduceMotion, score, voiceOn, turnRecordHash, beatIndex, onClose }) {
  const [assets, setAssets] = useState({ filmUrl: null, stillUrl: null, musicUrl: null, resolved: false });
  const [muted, setMuted] = useState(false);
  const closeTimer = useRef(null);
  const procedural = proceduralArtDataUrl(`${campaign.id}:${cinematic.title}`, '', cinematic.palette);

  useEffect(() => {
    if (reduceMotion) { const timer = setTimeout(onClose, 2200); return () => clearTimeout(timer); }
    let alive = true;
    const urls = [];
    (async () => {
      const found = await resolveAssets(campaign, turnRecordHash, beatIndex);
      if (!alive) return;
      const url = (row) => { if (!row?.blob) return null; const u = URL.createObjectURL(row.blob); urls.push(u); return u; };
      setAssets({ filmUrl: url(found.film), stillUrl: url(found.still), musicUrl: url(found.music), resolved: true });
    })();
    return () => { alive = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [campaign.id, turnRecordHash, beatIndex, reduceMotion]); // eslint-disable-line

  useEffect(() => {
    if (reduceMotion || !assets.resolved) return;
    if (!assets.musicUrl && score) scoreSwell();
    let spoken;
    if (dialogue?.line && voiceOn) spoken = setTimeout(() => speakLine(dialogue.line, dialogue.speaker, campaign.codex?.cast || []), 1200);
    if (!assets.filmUrl) closeTimer.current = setTimeout(onClose, 8000); // film closes itself on ended
    return () => { clearTimeout(spoken); clearTimeout(closeTimer.current); try { window.speechSynthesis?.cancel(); } catch { /* quiet */ } };
  }, [assets.resolved]); // eslint-disable-line

  if (reduceMotion) return <div className="quiet-beat"><span>✦</span><strong>{cinematic.title}</strong><small>{cinematic.subtitle}</small></div>;

  return <div className="cinematic" onClick={onClose} role="dialog" aria-label={`${cinematic.title} cinematic`}>
    {assets.filmUrl
      ? <video className="cinematic-art" src={assets.filmUrl} autoPlay playsInline muted={muted}
          onEnded={onClose}
          onError={() => setAssets((prev) => ({ ...prev, filmUrl: null }))}
          ref={(el) => { if (el && !muted) el.play().catch(() => { setMuted(true); el.muted = true; el.play().catch(() => {}); }); }} />
      : <img src={assets.stillUrl || procedural} alt="" className="cinematic-art" />}
    {assets.musicUrl && <audio src={assets.musicUrl} autoPlay />}
    <div className="cinematic-wash" style={{ '--c1': cinematic.palette[0], '--c2': cinematic.palette[1], '--c3': cinematic.palette[2] }} />
    <div className="particles">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    <button className="cinematic-close" onClick={onClose} aria-label="Skip cinematic"><X /></button>
    <div className="cinematic-title"><div className="gold-rule" /><p>{cinematic.type.replace('_', ' ')}</p><h2>{cinematic.title}</h2><h3>{cinematic.subtitle}</h3></div>
    {dialogue?.line && <div className="cinematic-subtitle"><Volume2 size={16}/><span><strong>{dialogue.speaker}</strong> — {dialogue.line}</span></div>}
  </div>;
}
