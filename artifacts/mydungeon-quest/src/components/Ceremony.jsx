import { useEffect, useState } from 'react';
import { BookOpen, Download, Mic, Shield, X } from 'lucide-react';
import { campaignJournal } from '../lib/db.js';

// ------------------------------------------------------------
// THE SEALING — how a tale ends (directive §3.6). Not a game-over
// screen: a ceremony. The journal's final block signs the whole
// chronicle; the wax presses; the verification badge speaks in
// green wax — "This tale is true." Then the offer, which is the
// whole point: your tale is told. Bind it — the book, the export,
// and (since the Forge was lit) the episode.
// The press itself (journal event + campaign.sealedAt) belongs to
// the App, which owns campaign state; this screen reads, stages,
// and asks.
// ------------------------------------------------------------

export default function Ceremony({ campaign, onPressSeal, onStorybook, onExport, onPodcast, onNextVolume, audioBusy, onClose }) {
  const [stats, setStats] = useState(null);
  const [pressing, setPressing] = useState(false);
  const sealed = Boolean(campaign.sealedAt);

  useEffect(() => {
    let alive = true;
    (async () => {
      const journal = await campaignJournal(campaign.id);
      if (!alive) return;
      setStats({
        turns: journal.filter((r) => r.type === 'turn').length,
        rolls: journal.filter((r) => r.type === 'resolution' && r.payload && r.payload.total != null).length,
        events: journal.length
      });
    })();
    return () => { alive = false; };
  }, [campaign.id, campaign.headHash]);

  const press = async () => {
    if (pressing || sealed) return;
    setPressing(true);
    try { await onPressSeal(); } finally { setPressing(false); }
  };

  return <div className="ceremony" role="dialog" aria-label="The Sealing">
    <button className="ceremony-close" onClick={onClose} aria-label="Return to the table"><X /></button>
    <div className="ceremony-page">
      <span className="eyebrow">{campaign.codex?.spine?.label} · The Sealing</span>
      <h1>{campaign.title}</h1>
      <p className="ceremony-lede">{sealed
        ? 'The wax has taken the sigil. What was lived is now bound.'
        : 'The tale has reached its final page. Only the wax remains.'}</p>

      <div className={`ceremony-seal ${sealed ? 'is-sealed' : ''} ${pressing ? 'is-pressing' : ''}`} aria-hidden="true">
        <span className="wax-emboss">{campaign.hero?.sigil || '✦'}</span>
      </div>

      {!sealed && <button className="press-seal" onClick={press} disabled={pressing}>
        {pressing ? 'The wax cools…' : 'Press the seal'}
      </button>}

      {sealed && <div className="verify-wax">
        <Shield size={15} />
        <span>
          This tale is true{stats ? `: ${stats.turns} turn${stats.turns === 1 ? '' : 's'}, ${stats.rolls} roll${stats.rolls === 1 ? '' : 's'}` : ''}, every one verifiable.
          {campaign.signatureStatus === 'signed' ? ' Signed on this device.' : ' Hash-chained on this device.'}
        </span>
      </div>}

      {sealed && <div className="keepsakes">
        <h3>Your tale is told. Bind it.</h3>
        <div className="keepsake-row">
          <button onClick={onStorybook}><BookOpen size={16} /> Open the storybook</button>
          <button className="secondary-button" onClick={onExport}><Download size={16} /> Export the chronicle</button>
          {onPodcast && <button className="secondary-button" disabled={audioBusy} onClick={onPodcast}><Mic size={16} /> {audioBusy ? 'Forging the episode…' : 'Forge the podcast'}</button>}
        </div>
        <p className="keepsake-note"><Mic size={13} /> The episode speaks only sealed words, in real voices only — a keyless table keeps the book.</p>
      </div>}

      {sealed && onNextVolume && <div className="keepsakes next-volume">
        <h3>The road goes on.</h3>
        <p className="keepsake-note">The world remembers this tale — every face, every voice, every grave. Open the next volume and name the span the road takes.</p>
        <div className="keepsake-row">
          <button className="secondary-button" onClick={() => onNextVolume(1)}>A winter passes</button>
          <button className="secondary-button" onClick={() => onNextVolume(3)}>Three winters pass</button>
          <button className="secondary-button" onClick={() => onNextVolume(9)}>Nine winters pass</button>
        </div>
      </div>}
    </div>
  </div>;
}
