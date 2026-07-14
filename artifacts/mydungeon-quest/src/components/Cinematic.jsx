import { useEffect, useRef, useState } from 'react';
import { X, Volume2 } from 'lucide-react';
import { db } from '../lib/db.js';
import { beatKeys } from '../lib/cinema/lookahead.js';
import { playMusic, stopMusic } from '../lib/cinema/audioDirector.js';
import { proceduralArtDataUrl } from '../lib/cinema/procedural.js';

// ------------------------------------------------------------
// THE CINEMATIC — a two-tier ladder, best available wins:
//   1. Animatic — a Ken Burns pass over the painted still.
//   2. Procedural — the palette art, last resort only.
// Sound obeys the Sound Law: if a REAL pre-briefed music phrase
// exists it plays through the Audio Director for the card's few
// seconds — otherwise the card is silent (no synthetic swell, no
// device-voice line). Dialogue appears as a subtitle; the turn's
// narration reads it aloud in the character's own cast voice
// AFTER the card, never over it. Tap always skips. Reduce-motion
// gets a quiet beat.
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
    // The chapter card usually fires the instant a turn seals, BEFORE that
    // turn's paint has landed — so a beat-key/turn-hash miss used to drop all
    // the way to the flat procedural gradient. Borrow the campaign's most
    // recent painted scene instead (any painted art beats the gradient, which
    // remains a true last resort).
    still: byKey(keys.still) || byTurn('paint') || latestScene || latestPaint || null,
    music: byKey(keys.score) || byTurn('music') || null
  };
}

export default function Cinematic({ cinematic, dialogue, campaign, reduceMotion, turnRecordHash, beatIndex, onClose }) {
  const [assets, setAssets] = useState({ stillUrl: null, resolved: false });
  const musicRow = useRef(null);
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
      musicRow.current = found.music || null;
      setAssets({ stillUrl: url(found.still), resolved: true });
    })();
    return () => { alive = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [campaign.id, turnRecordHash, beatIndex, reduceMotion]); // eslint-disable-line

  useEffect(() => {
    if (reduceMotion || !assets.resolved) return;
    // One phrase for the card, through the Director: refused if a voice holds
    // the stage, refused if the asset is mock — silence over placeholder.
    const row = musicRow.current;
    if (row?.blob) playMusic({ blob: row.blob, provider: row.provider, maxWaitMs: 0 });
    closeTimer.current = setTimeout(onClose, 9000);
    return () => { clearTimeout(closeTimer.current); stopMusic(); };
  }, [assets.resolved]); // eslint-disable-line

  if (reduceMotion) return <div className="quiet-beat"><span>✦</span><strong>{cinematic.title}</strong><small>{cinematic.subtitle}</small></div>;

  return <div className="cinematic" onClick={onClose} role="dialog" aria-label={`${cinematic.title} cinematic`}>
    <img src={assets.stillUrl || procedural} alt="" className="cinematic-art" />
    <div className="cinematic-wash" style={{ '--c1': cinematic.palette[0], '--c2': cinematic.palette[1], '--c3': cinematic.palette[2] }} />
    <div className="particles">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
    <button className="cinematic-close" onClick={onClose} aria-label="Skip cinematic"><X /></button>
    <div className="cinematic-title"><div className="gold-rule" /><p>{cinematic.type.replace('_', ' ')}</p><h2>{cinematic.title}</h2><h3>{cinematic.subtitle}</h3></div>
    {dialogue?.line && <div className="cinematic-subtitle"><Volume2 size={16}/><span><strong>{dialogue.speaker}</strong> — {dialogue.line}</span></div>}
  </div>;
}
