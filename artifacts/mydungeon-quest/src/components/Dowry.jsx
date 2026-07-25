import { useMemo, useState } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';
import { readPagesFloor, judgeProposals } from 'fatescript/dowryDoor';

// ------------------------------------------------------------
// THE DOWRY (Directive XX, Article Five, Law XV) — the fourth door of
// the World Forge: pages from an elder table enter the new tale as
// PROPOSALS, never as ink. Plain text and markdown only, pasted by the
// player's own hand — a PDF has no seat here (the deferral is named in
// the chronicle). Every proposal cites its page VERBATIM; the engine's
// own court judges each one live (the same seams a turn walks), and
// only what the player BLESSES will fold — at turn zero, through the
// ordinary reducers, sealed as one dowry row. Refusals leave no trace.
//
// The ceremony rides the Forge chunk (lazy); the reading rides the
// illuminated reader when the house has a key, and the engine's own
// deterministic floor when it does not — labeled honestly either way.
// ------------------------------------------------------------

const KIND_WORDS = { cast: 'a soul', region: 'a place', fact: 'a truth' };
const VOICE_GENDERS = ['feminine', 'masculine', 'neutral'];
const VOICE_AGES = ['child', 'young', 'adult', 'elder'];

export function Dowry({ dowry, onDowry }) {
  const [draftName, setDraftName] = useState('');
  const [draftText, setDraftText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const pages = dowry?.pages || [];
  const proposals = dowry?.proposals || [];
  const provider = dowry?.provider || null;

  // The court sits live at the surface: every amendment is re-judged as
  // the FINAL shape, in the door's own words. Forge-time context is an
  // empty canon — the hero's own court sits later, at the threshold.
  // playersHand: the rows on this table came through a strict reading
  // door (the server's judge, or the floor — grounded by construction);
  // what the player amends here is their own sovereignty over names
  // (the hero forge precedent), so the grounding court steps aside for
  // the ceremony ALONE. Every other court still sits.
  const verdicts = useMemo(
    () => (proposals.length ? judgeProposals(proposals, { cast: [], regions: [], hero: null, pages, playersHand: true }) : []),
    [proposals, pages]
  );

  const addPage = () => {
    const text = draftText.trim();
    if (!text) { setNote('A page without words is no page.'); return; }
    if (pages.length >= 8) { setNote('The table holds eight pages — bring the rest to another dowry.'); return; }
    if (text.length > 200000) { setNote('A page that long will not fit the table — split it before the next telling.'); return; }
    const name = draftName.trim().slice(0, 80) || `Page ${pages.length + 1}`;
    // New pages make the old reading stale — proposals reset with them.
    onDowry({ pages: [...pages, { name, text }], proposals: [], provider: null });
    setDraftName(''); setDraftText(''); setNote('');
  };
  const removePage = (index) => {
    const kept = pages.filter((_, i) => i !== index);
    onDowry(kept.length ? { pages: kept, proposals: [], provider: null } : null);
    setNote('');
  };

  const floorRead = (reason) => {
    const { proposals: rows } = readPagesFloor(pages);
    onDowry({ pages, proposals: rows, provider: 'floor' });
    setNote(reason || '');
  };
  const readPages = async () => {
    if (busy || !pages.length) return;
    setBusy(true); setNote('');
    try {
      const res = await fetch('/api/dowry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages })
      });
      const out = res.ok ? await res.json() : { declined: true };
      if (!out.declined && Array.isArray(out.proposals) && out.proposals.length) {
        // The boundary keeps its own manners: rows are re-seated from
        // known fields (op and citation ride WHOLE to the court), and
        // blessed is FORCED false — that hand is the player's alone,
        // never the wire's.
        const rows = out.proposals
          .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
          .map((row, index) => ({ id: typeof row.id === 'string' ? row.id : `dowry-i${index}`, kind: row.kind, op: row.op, citation: row.citation, blessed: false }));
        onDowry({ pages, proposals: rows, provider: 'anthropic' });
      } else floorRead(out.error || '');
    } catch { // the door never wedges silent — the floor answers (UI async law)
      floorRead('');
    } finally { setBusy(false); }
  };

  const patchRow = (index, patch) => {
    onDowry({ ...dowry, proposals: proposals.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  };
  const amend = (index, key, value) => {
    const op = { ...proposals[index].op };
    if (value === '' || value == null) delete op[key]; else op[key] = value;
    // The RENAME hand alone mints the amended mark — the second hand of
    // the grounding knob (a renamed shape is the player's sovereignty;
    // a voice or role edit lifts no grounding belt). The mark is
    // dropped at the wire boundary and sealed as provenance.
    patchRow(index, key === 'name' ? { op, amended: true } : { op });
  };
  const amendVoice = (index, key, value) => {
    const op = { ...proposals[index].op };
    const card = { ...(op.voice_card || {}) };
    if (value === '' || value == null) delete card[key]; else card[key] = value;
    if (Object.keys(card).length) op.voice_card = card; else delete op.voice_card;
    patchRow(index, { op });
  };

  return <div className="dowry-panel">
    <p className="fine-print">Pages from an elder table — session notes, a dead campaign’s ledger, homebrew lore — enter as <strong>proposals</strong>, never as ink. Paste plain text or markdown; every claim must quote its page, and only what you bless will cross the threshold.</p>

    <div className="dowry-pages">
      {pages.map((page, index) => <div key={index} className="dowry-page">
        <BookOpen/><span className="dowry-page-name">{page.name}</span>
        <small className="fine-print">{page.text.length.toLocaleString()} characters</small>
        <button type="button" className="text-button" aria-label={`Set down ${page.name}`} onClick={() => removePage(index)}><X/></button>
      </div>)}
    </div>

    <div className="form-grid dowry-add">
      <label>Name this page<input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={80} placeholder="The Vale Sessions, third winter"/></label>
      <label>The page itself<textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows="6" placeholder={'## People\n- Sella Marrow — a grave-quiet apothecary\n\n## Places\n- The Hollow Market — stalls sunk in old floodwater'}/></label>
    </div>
    <div className="button-row">
      <button type="button" className="secondary-button" onClick={addPage}><Plus/> Lay the page on the table</button>
      <button type="button" className="primary-button" disabled={!pages.length || busy} onClick={readPages}>{busy ? 'Reading…' : 'Read the pages'}</button>
    </div>
    {note && <p className="dowry-note fine-print">{note}</p>}

    {provider && <p className="dowry-provider fine-print">{provider === 'floor'
      ? 'Read by the house’s own floor reader — plain, deterministic, and honest about it. The illuminated reader was not at the table.'
      : 'Read by the illuminated reader. Every proposal below already survived the court once — your amendments are judged live.'}</p>}

    {proposals.length > 0 && <div className="dowry-proposals">
      {proposals.map((row, index) => {
        const verdict = verdicts[index] || { ok: false, errors: ['the court has not sat'] };
        const blessed = row.blessed === true;
        return <article key={row.id || index} className={`dowry-proposal${verdict.ok ? '' : ' dowry-refused'}${blessed ? ' dowry-blessed' : ''}`}>
          <header className="dowry-proposal-head">
            <span className="dowry-kind">{KIND_WORDS[row.kind] || row.kind}</span>
            <strong>{row.op?.name}</strong>
            {/* A refused row cannot be blessed — but a BLESSED row that
                turns refused (an amendment into a collision, an emptied
                name) keeps its unbless hand: the player must always be
                able to walk back out. */}
            <label className="dowry-bless"><input type="checkbox" checked={blessed} disabled={!verdict.ok && !blessed}
              onChange={(e) => patchRow(index, { blessed: e.target.checked })}/> Bless</label>
          </header>
          <blockquote className="dowry-cite">{row.citation?.quote}<footer>— {row.citation?.source}</footer></blockquote>
          {!verdict.ok && <p className="dowry-refusal">{verdict.errors.join(' · ')}</p>}
          {/* The amend hands stay on every blessed row — refused or not —
              so an amendment that went wrong can always be amended back. */}
          {blessed && <div className="dowry-amend form-grid">
            <label>Name<input value={row.op?.name || ''} onChange={(e) => amend(index, 'name', e.target.value)} maxLength={80}/></label>
            {row.kind === 'cast' && <>
              <label>Role<input value={row.op?.role || ''} onChange={(e) => amend(index, 'role', e.target.value)} maxLength={40} placeholder="only if the pages say"/></label>
              <label>Look<textarea value={row.op?.visual || ''} onChange={(e) => amend(index, 'visual', e.target.value)} rows="2" maxLength={360}/></label>
              <label>Voice<select value={row.op?.voice_card?.gender || ''} onChange={(e) => amendVoice(index, 'gender', e.target.value)}>
                <option value="">page’s silence</option>{VOICE_GENDERS.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
              <label>Age<select value={row.op?.voice_card?.age_band || ''} onChange={(e) => amendVoice(index, 'age_band', e.target.value)}>
                <option value="">page’s silence</option>{VOICE_AGES.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
              <label>Timbre<input value={row.op?.voice_card?.timbre || ''} onChange={(e) => amendVoice(index, 'timbre', e.target.value)} maxLength={24} placeholder="gravel, reed, bell…"/></label>
            </>}
            {row.kind === 'region' && <label>Look<textarea value={row.op?.visual || ''} onChange={(e) => amend(index, 'visual', e.target.value)} rows="2" maxLength={360}/></label>}
            {row.kind === 'fact' && <label>The truth<input value={row.op?.fact_add || ''} onChange={(e) => amend(index, 'fact_add', e.target.value)} maxLength={160}/></label>}
          </div>}
        </article>;
      })}
      <p className="fine-print">Blessed gifts fold at the tale’s threshold — turn zero — and seal as one dowry record, each with its page’s own words. What you leave unblessed leaves no trace at all.</p>
    </div>}
  </div>;
}
