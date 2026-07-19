// THE PUBLIC PAGE (Directive XV §III) — one sealed tale, readable by
// anyone holding the link. No account, no name asked, no Dexie writes:
// this surface READS — the record, the plates, nothing else — and the
// reader's own browser re-runs the desk on the exact bytes the author
// sealed. The badge is that court's verdict, not the server's word.
//
// Struck scenes appear NOWHERE here: the page model re-derives every
// strike from the journal's own redaction blocks (lib/publish.js
// fellStruck) before any surface renders — the book, the episodes, and
// the cast all read the felled roll.
import { useEffect, useState } from 'react';
import { fetchPublicTale, publicPageModel } from '../lib/publish.js';
import { buildStorybook } from '../lib/storybook.js';

const SHA256_HEX = /^[a-f0-9]{64}$/;
const dataUrlOf = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('the plate would not read'));
  reader.readAsDataURL(blob);
});

export default function PublicTale({ publishId }) {
  const [visit, setVisit] = useState({ phase: 'loading' });
  const [tab, setTab] = useState('book');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const answer = await fetchPublicTale(publishId);
        if (!alive) return;
        if (answer.status === 'gone') { setVisit({ phase: 'gone' }); return; }
        if (answer.status === 'missing') { setVisit({ phase: 'missing' }); return; }
        if (answer.status !== 'ok') { setVisit({ phase: 'error', detail: answer.detail || 'the commons did not answer' }); return; }

        const model = publicPageModel(answer.record);
        if (model.refused) { setVisit({ phase: 'error', detail: model.reason }); return; }

        // Hydrate the plates through the public asset door — every name
        // must BE a name (the strict media door) and an unreadable plate
        // degrades to its procedural seat, counted aloud, never a wedge.
        let unread = 0;
        const media = await Promise.all(model.mediaIndex
          .filter((row) => row && SHA256_HEX.test(String(row.assetHash)))
          .map(async (row) => {
            try {
              const response = await fetch(`/api/public/tale/${encodeURIComponent(publishId)}/asset/${row.assetHash}`);
              if (!response.ok) { unread += 1; return { ...row, dataUrl: null }; }
              return { ...row, dataUrl: await dataUrlOf(await response.blob()) };
            } catch { unread += 1; return { ...row, dataUrl: null }; }
          }));
        if (!alive) return;

        // The book binds the elder way (reveals: null — every proven plate
        // seats): a visitor has no seen-ledger, and none ever rides here.
        let bookHtml = null;
        try {
          // proof: false — the guest's book carries NO embedded chronicle.
          // The record door serves the byte-preserved proof to anyone who
          // asks; the rendered page must hold not one struck byte, and the
          // owner's keepsake keeps its save-proof device untouched.
          bookHtml = buildStorybook({ campaign: model.campaign, journal: answer.record.journal, media, reveals: null, pageSize: 'Letter', proof: false });
        } catch (error) {
          bookHtml = null;
          console.error(`[commons] the book would not bind: ${error.message}`);
        }
        setVisit({ phase: 'ok', meta: answer.meta, model, media, bookHtml, verdict: answer.verdict, unread });
      } catch (error) {
        if (alive) setVisit({ phase: 'error', detail: error.message });
      }
    })();
    return () => { alive = false; };
  }, [publishId]);

  if (visit.phase === 'loading') {
    return <div className="public-tale"><div className="public-plaque" role="status">The tale is being drawn from the shelf…</div></div>;
  }
  if (visit.phase === 'gone') {
    return <div className="public-tale"><div className="public-plaque tombstone" data-testid="tale-tombstone">
      <h1>The author has taken this tale down.</h1>
      <p>What was published here has been withdrawn. The shelf keeps no ghost.</p>
      <PublicFooter />
    </div></div>;
  }
  if (visit.phase === 'missing') {
    return <div className="public-tale"><div className="public-plaque tombstone" data-testid="tale-missing">
      <h1>No tale stands at this address.</h1>
      <PublicFooter />
    </div></div>;
  }
  if (visit.phase === 'error') {
    return <div className="public-tale"><div className="public-plaque tombstone" role="status">
      <h1>This tale cannot be read right now.</h1>
      <p>{visit.detail}</p>
      <PublicFooter />
    </div></div>;
  }

  const { meta, model, media, bookHtml, verdict, unread } = visit;
  const sceneFor = (log) => media.find((row) => row.kind === 'scene' && row.originTurnHash && row.originTurnHash === log.recordHash && row.dataUrl) || null;
  const heroName = model.hero?.name || 'The hero';

  return <div className="public-tale">
    <header className="public-mast">
      <span className="eyebrow">A sealed tale · MyDungeon.Quest</span>
      <h1>{model.title}</h1>
      <div className="desk-badge" data-testid="desk-badge" data-verdict={verdict.ok ? 'true' : 'false'}>
        {verdict.ok
          ? <>✦ This tale is true — {model.turnCount} record{model.turnCount === 1 ? '' : 's'}, chain re-verified in your browser just now. {model.signatureStatus === 'signed' ? 'Signed on its author\u2019s device.' : 'Hash-chained on its author\u2019s device.'} Head {String(model.headHash || '').slice(0, 12)}…</>
          : <>⊘ This copy does not verify — the desk refuses it: {verdict.reason || 'the chain does not hold'}. Read nothing here as true.</>}
      </div>
      {model.struckCount > 0 && <p className="public-struck-note">{model.struckCount} scene{model.struckCount === 1 ? ' was' : 's were'} struck from this telling at its own table; struck words appear nowhere on this page.</p>}
      {unread > 0 && <p className="public-struck-note" role="status">{unread} plate{unread === 1 ? '' : 's'} could not be read from the shelf; those scenes keep their woodcut seats.</p>}
    </header>

    <nav className="public-tabs" aria-label="Ways to read">
      <button className={tab === 'book' ? 'is-open' : ''} data-testid="tab-book" onClick={() => setTab('book')}>The storybook</button>
      <button className={tab === 'episodes' ? 'is-open' : ''} data-testid="tab-episodes" onClick={() => setTab('episodes')}>The episodes</button>
      <button className={tab === 'cast' ? 'is-open' : ''} data-testid="tab-cast" onClick={() => setTab('cast')}>Dramatis personae</button>
    </nav>

    {tab === 'book' && (bookHtml
      ? <iframe className="book-frame public-book" title={`${model.title} — storybook`} srcDoc={bookHtml} />
      : <div className="public-plaque" role="status">The book would not bind on this visit — the episodes and the cast still read true.</div>)}

    {tab === 'episodes' && <section className="public-episodes" data-testid="public-episodes">
      {model.campaign.logs.filter((log) => log && !log.redacted && log.dm).map((log, k) => {
        const plate = sceneFor(log);
        return <article className="public-episode" data-testid="episode-item" key={log.id || k}>
          <header><span className="episode-count">Turn {Number.isInteger(log.turn) ? log.turn + 1 : k + 1}</span></header>
          {plate && <img src={plate.dataUrl} alt={`The scene as it was painted for this turn`} />}
          {(log.sent || log.player) && <p className="episode-deed"><strong>{heroName}:</strong> {log.sent || log.player}</p>}
          {(log.dm.narration_blocks || []).map((block, j) => (
            <p className="episode-line" key={j}>{block.speaker ? <strong>{block.speaker}: </strong> : null}{block.text}</p>
          ))}
        </article>;
      })}
    </section>}

    {tab === 'cast' && <section className="public-cast" data-testid="public-cast">
      <article className="public-soul is-hero"><h3>{heroName}</h3><p className="role">{model.hero?.calling || model.hero?.class || 'The hero of this tale'}</p></article>
      {model.cast.map((soul, k) => (
        <article className="public-soul" key={soul.name || k}><h3>{soul.name}</h3><p className="role">{soul.role || 'A soul of this tale'}</p></article>
      ))}
    </section>}

    <PublicFooter />
  </div>;
}

function PublicFooter() {
  return <footer className="public-foot">
    <p>Told at a real table and sealed there. Engine: <strong>fatescript 1.0.0</strong> · <a href="https://github.com/futurespeakai/mydungeonquest" target="_blank" rel="noreferrer">source</a></p>
    <p><a href="/">Tell your own tale at MyDungeon.Quest →</a></p>
  </footer>;
}
