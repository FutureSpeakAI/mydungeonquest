import { useEffect, useState } from 'react';
import { BookOpen, Download, Globe, Mic, Shield, X } from 'lucide-react';
import { campaignJournal } from '../lib/db.js';
import { publishStatus, minePages, publishTale, revokeTale, setTaleListing } from '../lib/publish.js';

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
        : campaign.codex?.sealing && !campaign.completed
          ? 'The denouement is armed. Return to the table and play the road home — or press now, and bind the book as it stands.'
          : 'The tale has reached its final page. Only the wax remains.'}</p>

      <div className={`ceremony-seal ${sealed ? 'is-sealed' : ''} ${pressing ? 'is-pressing' : ''}`} aria-hidden="true">
        <span className="wax-emboss">{campaign.hero?.sigil || '✦'}</span>
      </div>

      {!sealed && !campaign.readOnly && <button className="press-seal" onClick={press} disabled={pressing}>
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

      {sealed && <CommonsPanel campaign={campaign} />}

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

// ------------------------------------------------------------
// THE COMMONS (Directive XV §III) — a sealed tale may be set on the
// public shelf. The panel renders ONLY when the commons are live for a
// named patron: a keyless table shows nothing (the loop's houses stay
// byte-quiet), and every outcome here is a spoken line, never a silent
// wedge. One living page per tale; unlisted unless chosen; revocable
// at any hour.
// ------------------------------------------------------------
function CommonsPanel({ campaign }) {
  const [state, setState] = useState({ phase: 'checking', page: null, error: null });

  const readShelf = async () => {
    try {
      const status = await publishStatus();
      if (!status.live || !status.patron) { setState({ phase: 'dormant', page: null, error: null }); return; }
      const pages = await minePages();
      const page = pages.find((row) => row.campaignId === campaign.id && !row.revokedAt) || null;
      setState({ phase: page ? 'standing' : 'ready', page, error: null });
    } catch (error) {
      setState({ phase: 'error', page: null, error: error.message });
    }
  };
  useEffect(() => { readShelf(); }, [campaign.id]);

  const act = (work) => async () => {
    setState((prev) => ({ ...prev, phase: 'busy', error: null }));
    try { await work(); await readShelf(); }
    catch (error) {
      // A standing page (409) is news, not a wedge — re-read the shelf so
      // the panel shows the page that stands; every other stumble speaks.
      if (error.code === 409) { await readShelf(); return; }
      setState((prev) => ({ ...prev, phase: prev.page ? 'standing' : 'ready', error: error.message }));
    }
  };

  if (state.phase === 'dormant' || state.phase === 'checking') return null;
  const url = state.page ? `/t/${state.page.publishId}` : null;
  const fullUrl = url && typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;

  return <div className="keepsakes commons-panel">
    <h3><Globe size={15} /> The commons.</h3>
    {!state.page && <p className="keepsake-note">Set this tale on the public shelf. Anyone with the link may read it — no account, no name asked — and every reader's own browser re-verifies the chain. Unlisted unless you choose otherwise; you may take it down at any hour.</p>}
    {!state.page && <div className="keepsake-row">
      <button data-testid="publish-tale" disabled={state.phase === 'busy'} onClick={act(async () => { await publishTale(campaign.id); })}>
        <Globe size={16} /> {state.phase === 'busy' ? 'Setting the page…' : 'Publish the tale'}
      </button>
    </div>}
    {state.page && <>
      <p className="keepsake-note">This tale stands on the public shelf. The page re-proves itself in every reader's browser.</p>
      <p className="commons-link"><a data-testid="publish-url" href={url} target="_blank" rel="noreferrer">{fullUrl}</a></p>
      <label className="commons-listing">
        <input data-testid="publish-listing" type="checkbox" checked={Boolean(state.page.listed)} disabled={state.phase === 'busy'}
          onChange={(event) => act(async () => { await setTaleListing(state.page.publishId, event.target.checked); })()} />
        <span>List it on the commons shelf (off: link-only)</span>
      </label>
      <div className="keepsake-row">
        <button data-testid="revoke-tale" className="secondary-button" disabled={state.phase === 'busy'}
          onClick={act(async () => { await revokeTale(state.page.publishId); })}>
          {state.phase === 'busy' ? 'Taking it down…' : 'Take the page down'}
        </button>
      </div>
    </>}
    {state.error && <p className="keepsake-note commons-error" data-testid="publish-error" role="status">The commons answered: {state.error}</p>}
  </div>;
}
