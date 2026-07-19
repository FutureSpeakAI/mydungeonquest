import { useEffect, useRef, useState } from 'react';
import { X, Volume2 } from 'lucide-react';
import { db } from '../lib/db.js';
import { beatKeys } from '../lib/cinema/lookahead.js';
import { playMusic, stopMusic } from '../lib/cinema/audioDirector.js';
import { proceduralArtDataUrl } from '../lib/cinema/procedural.js';
import { markRevealed, revealSet } from '../lib/reveals.js';

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

// THE REVEAL LAW — no image is presented twice as a NEW reveal. Art already
// shown on a card is skipped by every rung of the ladder (each falls to the
// next; the procedural gradient stays the honest last resort), so chained
// cards (the DM's card, then the act turns) and beats whose own paint lags
// never deal the same cover twice. A REPLAY from the Codex is exempt — a
// re-view is not a new reveal, so it neither filters nor marks.
// Exported for the bench: the eval proves the ladder without a browser.
export async function resolveAssets(campaign, turnRecordHash, beatIndex, { replay = false } = {}) {
  const rows = await db.media.where('campaignId').equals(campaign.id).toArray();
  const keys = beatKeys(campaign.id, beatIndex ?? campaign.codex?.beatIndex ?? 0);
  const seen = replay ? new Set() : await revealSet(campaign.id, 'card');
  const fresh = (row) => (row && row.blob && !seen.has(row.assetHash) ? row : null);
  const byKey = (key) => rows.find((row) => row.cacheKey === key && row.blob);
  const byTurn = (kind) => rows.filter((row) => row.kind === kind && row.blob && turnRecordHash && row.originTurnHash === turnRecordHash)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  return {
    // THE FRESH PLATE LAW (XVII, Article III) — the card shows its OWN art:
    // the beat's pre-briefed cover, or this very turn's painting. The old
    // borrow rungs (the campaign's most recent unseen plate, any plate at
    // all) are struck: an ambient painting from another moment is a stale
    // plate, and the honest procedural gradient beats a recycled painting.
    still: fresh(byKey(keys.still)) || fresh(byTurn('paint')) || null,
    music: byKey(keys.score) || byTurn('music') || null
  };
}

export default function Cinematic({ cinematic, dialogue, campaign, reduceMotion, turnRecordHash, beatIndex, replay = false, onClose }) {
  const [assets, setAssets] = useState({ stillUrl: null, resolved: false });
  const musicRow = useRef(null);
  const stillRow = useRef(null);
  const closeTimer = useRef(null);
  const procedural = proceduralArtDataUrl(`${campaign.id}:${cinematic.title}`, '', cinematic.palette);

  useEffect(() => {
    if (reduceMotion) { const timer = setTimeout(onClose, 2200); return () => clearTimeout(timer); }
    let alive = true;
    const urls = [];
    (async () => {
      const found = await resolveAssets(campaign, turnRecordHash, beatIndex, { replay });
      if (!alive) return;
      const url = (row) => { if (!row?.blob) return null; const u = URL.createObjectURL(row.blob); urls.push(u); return u; };
      musicRow.current = found.music || null;
      stillRow.current = found.still || null;
      setAssets({ stillUrl: url(found.still), resolved: true });
    })();
    return () => { alive = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [campaign.id, turnRecordHash, beatIndex, reduceMotion]); // eslint-disable-line

  useEffect(() => {
    if (reduceMotion || !assets.resolved) return;
    // The card is on stage: seal the showing into the seen ledger, so no
    // later card can deal this art as new again. (A replay marks nothing.)
    const still = stillRow.current;
    if (still?.assetHash && !replay) markRevealed(campaign.id, 'card', still.assetHash, { beatIndex: beatIndex ?? null, title: cinematic.title, type: cinematic.type });
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
    {/* The close tap must not ALSO bubble into the container's tap-to-skip:
        onClose chains real state (DM card → act card → narration), and a
        double fire would skip a chained card cold. */}
    <button className="cinematic-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Skip cinematic"><X /></button>
    <div className="cinematic-title"><div className="gold-rule" /><p>{cinematic.type.replace('_', ' ')}</p><h2>{cinematic.title}</h2><h3>{cinematic.subtitle}</h3></div>
    {dialogue?.line && <div className="cinematic-subtitle"><Volume2 size={16}/><span><strong>{dialogue.speaker}</strong> — {dialogue.line}</span></div>}
  </div>;
}
