import { useMemo, useState } from 'react';
import { Film, ScrollText } from 'lucide-react';
import { db } from '../lib/db.js';
import { ACT_NAMES, romanNumeral } from 'fatescript/story';
import { rowsOf } from 'fatescript/rows';
import { cardsForCampaign } from 'fatescript/cards';
import { roomForTurn, SCRIBES } from '../lib/scriptorium.js';
import { tellCourt, TELL_FAMILIES } from '../lib/tells.js';
import { voiceLineOf, wordsLine, tieLine } from 'fatescript/wikiText';
import { clockWords } from '../lib/clockAtTable.js';
import { chapterCard, downloadCard } from '../lib/shareCard.js';
import { placesOf, soulsSwornTo } from '../lib/atlas.js';
import { presenceOf, visitorsOf, partyOf } from '../lib/presence.js';
import { threadsOf } from 'fatescript/threads';
import { troveOf, purseOf, heldBy } from 'fatescript/trove';
import { oneCoinFigure } from '../lib/ledger.js';
import { calendarOf } from 'fatescript/calendar';
import { Frame, useGallery } from './Overlays.jsx';
import { RecapCard } from './Sequence.jsx';
import TravelersChart from './TravelersChart.jsx';

// ------------------------------------------------------------
// THE OPEN BOOK (Directive XIV, the Book Law) — the codex, given the
// shape of a book: six chapters behind one button, a CLOSED set. Every
// page is the same pure fold the courts already proved, reseated whole
// under its mapped chapter roof — no fact moved without its citation,
// nothing derived at any token cost. Navigation state (chapter, soul,
// place, pack) is HELD BY THE TABLE, not by this mount: the book
// reopens to the page it was closed on, within the sitting, and none
// of that state is sealed, synced, or exported.
// ------------------------------------------------------------
export const CHAPTERS = [
  { id: 'tale', word: 'The Tale' },
  { id: 'people', word: 'The People' },
  { id: 'places', word: 'The Places' },
  { id: 'things', word: 'The Things' },
  { id: 'debts', word: 'The Debts' },
  { id: 'party', word: 'The Party' }
];

const STATUS_WORD = { active: 'Walks the tale', dead: 'Fallen', missing: 'Lost to the road' };

// THE PACK LAW (Directive XIV) — a pack is a filtered view of the sealed
// trove, and says so. Holdings from the hands-chain law, coin from the
// purse fold; provenance one tap deep, the trove's own citations.
function PackHolding({ item }) {
  const [open, setOpen] = useState(false);
  return <div className={`thread-row trove-row pack-holding${item.status === 'held' ? '' : ' settled'}`}>
    <span className="thread-kind">{item.kind}</span>
    <button className="text-button" onClick={() => setOpen(!open)}>{item.name}</button>
    {item.equipped && <span className="ready-mark">at the ready</span>}
    {open && <small className="trove-chain">{item.chain.map((hand) => `${hand.holder} (turn ${hand.since})`).join(' → ')}</small>}
    {open && item.note && <small className="trove-note">“{item.note}”</small>}
  </div>;
}

function PackCoin({ purse }) {
  const [open, setOpen] = useState(false);
  return <div className="pack-coin">
    <button className="text-button" onClick={() => setOpen(!open)}><b>{purse.coin}</b> coin</button>
    {open && (purse.entries.length
      ? <div className="purse-list">{purse.entries.map((entry, i) =>
        <div key={i} className="purse-row">
          <span className={`purse-delta${entry.delta < 0 ? ' spent' : ''}`}>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
          <b>{entry.reason}</b>
          <small>turn {entry.turn}{entry.clamped ? ' — held at zero' : ''}</small>
        </div>)}</div>
      : <p className="muted">No coin has moved through this hand.</p>)}
  </div>;
}

function Packs({ campaign, gallery, openPack, onOpenPack }) {
  const heroName = campaign.hero?.name || 'The hero';
  const bearers = [heroName, ...partyOf(campaign).map((member) => member.name)];
  return <>
    <h3>The Packs</h3>
    <div className="pack-list">{bearers.map((name) => {
      // THE READY HAND at the head of the pack (Directive XII §III.4);
      // the hero's coin through the one-coin era door (§IV), companions'
      // purses by the purse fold alone — they never had an old lane.
      const held = heldBy(campaign, name).sort((a, b) => (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0));
      const purse = name === heroName ? oneCoinFigure(campaign) : purseOf(campaign, name);
      const open = openPack === name;
      return <article key={name} className="pack" data-pack={name}>
        <button className="pack-head" onClick={() => onOpenPack(open ? null : name)} aria-expanded={open}>
          {gallery[name] ? <img className="soul-face" src={gallery[name]} alt={name}/> : <div className="procedural-portrait">{name.split(' ').map((x) => x[0]).join('')}</div>}
          <div><b>{name}</b><small>{purse.coin} coin · {held.length} {held.length === 1 ? 'thing' : 'things'} held</small></div>
        </button>
        {open && <div className="pack-body">
          <p className="muted pack-law">This pack is the sealed trove, filtered to one bearer.</p>
          <PackCoin purse={purse} />
          {held.length === 0
            ? <p className="muted">Nothing held.</p>
            : held.map((item, i) => <PackHolding key={i} item={item} />)}
        </div>}
      </article>;
    })}</div>
  </>;
}

export function Book({ campaign, nav, onNav, recap, reduceMotion, onClose, onReplay, onSealTale }) {
  const c = campaign.codex; const revealed = c.beatIndex >= c.spine.revealIdx;
  // THE ROW WITNESS at the Book's own door — junk rows prove nothing here
  // either; every read below this line touches witnessed rows only.
  const logs = rowsOf(campaign.logs);
  const gallery = useGallery(campaign);
  // THE LIVING WIKI: cards are derived lawfully from the log; each soul is a
  // page, each tie a backlink, each chronicle line a citation into the tale.
  const wiki = useMemo(() => { try { return cardsForCampaign(campaign).cards; } catch { return {}; } }, [campaign]);
  const chapter = CHAPTERS.some((entry) => entry.id === nav?.chapter) ? nav.chapter : 'tale';
  const openSoul = nav?.soul || null;
  const openPlace = nav?.place || null;
  const openPack = nav?.pack || null;
  const openCard = openSoul ? wiki[openSoul.toLowerCase()] : null;
  const acts = [...new Set(c.spine.beats.map((beat) => beat.act || 1))];
  // THE SCRIPTORIUM made visible: the standing plan the room holds for
  // the coming scene — four scribes, one domain each, never prose.
  const roomPlan = useMemo(() => roomForTurn(campaign), [campaign]);
  // THE HUMAN HAND made visible: only when a family runs hot does the
  // court speak on this page — the finding, never a rewrite.
  const tells = useMemo(() => { try { return tellCourt(campaign); } catch { return null; } }, [campaign]);
  // THE COMMONS — a walked chapter's public face: the act's key art walks
  // the strict door as a data plate (or the card goes plateless, lawfully),
  // the engine composes and escapes, and the patron receives a file named
  // by the numeral alone.
  const shareChapter = async (i) => {
    let plate = null;
    try {
      const act = c.spine.beats[i]?.act || 1;
      const row = await db.media.where('cacheKey').equals(`keyart:${campaign.id}:act-${act}`).first();
      if (row?.blob) plate = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => resolve(null); reader.readAsDataURL(row.blob); });
    } catch { /* the card is lawful without a plate */ }
    downloadCard(chapterCard(campaign, i, plate), i);
  };
  return <Frame title="The Book" icon={<ScrollText/>} onClose={onClose} wide>
    <div className="codex-head"><div><span className="eyebrow">{c.spine.label}</span><h3>{c.arc?.title || campaign.title}</h3><p>{c.spine.beats[c.beatIndex]?.title}</p><p className="muted codex-clock" role="note">{clockWords(logs)}</p></div><div className="codex-meta"><span className="day-chip">Day {calendarOf(logs).day}</span><div className="blight">Blight <b>{c.blight}/5</b></div></div></div>
    <nav className="book-chapters" role="tablist" aria-label="Chapters">{CHAPTERS.map((entry) =>
      <button key={entry.id} role="tab" data-chapter={entry.id} aria-selected={chapter === entry.id} className={chapter === entry.id ? 'open' : ''} onClick={() => onNav({ chapter: entry.id })}>{entry.word}</button>)}</nav>
    <div className="book-body" data-stillness={reduceMotion ? 'true' : undefined}>

    {chapter === 'tale' && <div className="book-page" data-page="tale">
    {recap && <RecapCard recap={recap} />}
    {/* The shape of the tale: the acts and the chapters already walked. The
        pages ahead keep their titles to themselves — no spoilers. */}
    <h3>The shape of the tale</h3>
    <div className="tale-arc">{acts.map((act) => <div className="act-row" key={act}>
      <b>Act {romanNumeral(act)} — {ACT_NAMES[act] || 'the road beyond'}</b>
      <ol>{c.spine.beats.map((beat, i) => (beat.act || 1) === act
        ? <li key={i} className={i < c.beatIndex ? 'walked' : i === c.beatIndex ? 'here' : ''}>{i <= c.beatIndex ? beat.title : '· · ·'}{(i < c.beatIndex || campaign.completed) && <button className="text-button" onClick={() => shareChapter(i)}>public face</button>}</li>
        : null)}</ol>
    </div>)}</div>
    {campaign.completed
      ? <p className="muted seal-tale-row">✦ The tale is told{campaign.sealedAt ? ', and the wax has taken the sigil' : ''}.</p>
      : c.sealing
        ? <p className="muted seal-tale-row">✦ The denouement — the road turns home.</p>
        : onSealTale
          ? <div className="seal-tale-row"><button className="secondary-button" onClick={onSealTale}>Seal the Tale</button><p className="muted">End with honor: a few closing turns, then the wax.</p></div>
          : null}
    <h3>The evil design</h3><p className={revealed ? '' : 'gated'}>{revealed ? c.arc?.evil_plot : 'The page refuses to hold the whole shape. Revelation must be earned.'}</p>
    {roomPlan && <><h3>The scriptorium — the room plans, the door speaks</h3>
    <ul className="scriptorium-plan">{SCRIBES.map((scribe) => <li key={scribe}><b>{scribe}</b> — <span className="muted">{roomPlan.scratchpad[scribe]}</span></li>)}</ul></>}
    {tells && tells.report.flagged.length > 0 && <><h3>The human hand — the tell court</h3>
    <ul className="scriptorium-plan">{tells.report.flagged.map((key) => <li key={key}><b>{TELL_FAMILIES[key].name}</b> — <span className="muted">{TELL_FAMILIES[key].finding}</span></li>)}</ul></>}
    <h3>Cinematic archive</h3><div className="replay-list">{logs.filter((l)=>l.dm?.cinematic && !l.redacted).map((log)=><button key={log.id} onClick={()=>onReplay(log.dm)}><Film/> {log.dm.cinematic.title}</button>)}</div>
    <h3>Memoir</h3>{c.memoir.length ? c.memoir.map((m,i)=><p key={i}>{m}</p>) : <p className="muted">The Chronicler has not yet needed to compress the road behind you.</p>}
    </div>}

    {chapter === 'people' && <div className="book-page" data-page="people">
    <h3>The cast — what the world remembers</h3>
    {openCard && <article className="soul-page">
      <button className="text-button" onClick={() => onNav({ soul: null })}>← All souls</button>
      <div className="soul-page-head">
        {gallery[openCard.name] ? <img className="soul-face large" src={gallery[openCard.name]} alt={openCard.name}/> : <div className="procedural-portrait large">{openCard.name.split(' ').map((x)=>x[0]).join('')}</div>}
        <div><h4>{openCard.name}</h4><span className="role-tag">{openCard.identity.role}</span>
          <span className={`status-badge ${openCard.state.status}`}>{STATUS_WORD[openCard.state.status] || openCard.state.status}</span>
          {voiceLineOf(openCard.identity) && <p className="muted">{voiceLineOf(openCard.identity)}.</p>}
        </div>
      </div>
      <p>{openCard.identity.canon.visual}</p>
      {wordsLine(openCard) && <p className="voice-italic">{wordsLine(openCard)}</p>}
      {/* THE PRESENCE CUT (Directive VII.12) — last known ground, replayed
          pure from the sealed record; a soul with no lawful sighting is
          said plainly to be unplaced. Cites are journal rows. The catch is
          the panel's own oath (architect's cut, 56.6): if the replay ever
          falls, the page SAYS so — never a crash, never silence. */}
      {(() => { let entry = null; let readable = true;
        try { entry = presenceOf(campaign).find((soul) => soul.name === openCard.name); } catch { readable = false; }
        return !readable
          ? <p className="cite ground-line">The presence record cannot be read.</p>
          : entry?.ground
            ? <p className="cite ground-line">Last seen standing in {entry.ground} — turn {entry.cite}.</p>
            : <p className="cite ground-line">Whereabouts unknown.</p>; })()}
      {openCard.ties.length > 0 && <div className="tie-chips">{openCard.ties.map((tie, i) =>
        <button key={i} className="tie-chip" onClick={() => wiki[tie.to.toLowerCase()] && onNav({ soul: tie.to })}>{tieLine(tie)}</button>)}</div>}
      <h4 className="eyebrow">Appearances</h4>
      <ol className="soul-timeline">{openCard.chronicle.map((line, i) => {
        const scene = logs.find((log) => log.turn === line.turn && log.dm?.cinematic && !log.redacted);
        return <li key={i}><b>Turn {line.turn}</b> — {line.gloss}{scene && <button className="text-button" onClick={() => onReplay(scene.dm)}>replay</button>}</li>;
      })}</ol>
    </article>}
    {!openCard && <div className="codex-grid gallery">{c.cast.map((soul)=>{
      const dead = soul.status === 'dead';
      const lastWhy = (soul.bond_arc || []).slice(-1)[0]?.why;
      return <article key={soul.id} className={`soul-card${dead ? ' memorial' : ''}`} onClick={() => onNav({ soul: soul.name })} role="button" tabIndex={0}>
        {gallery[soul.name] ? <img className="soul-face" src={gallery[soul.name]} alt={soul.name}/> : <div className="procedural-portrait">{soul.name.split(' ').map((x)=>x[0]).join('')}</div>}
        <span className="role-tag">{soul.role}</span>
        <h4>{soul.name}</h4>
        <span className={`status-badge ${soul.status || 'active'}`}>{STATUS_WORD[soul.status] || soul.status || 'Walks the tale'}</span>
        <p>{soul.visual}</p>
        <div className="bond-thread" title={`Bond ${soul.bond}/4`} aria-label={`Bond ${soul.bond} of 4`}>{Array.from({length:4},(_,i)=><i key={i} className={i<soul.bond?'lit':''}/>)}</div>
        {lastWhy && <small className="bond-why">“{lastWhy}”</small>}
        {(soul.known_facts || []).length > 0 && <ul className="known-facts">{soul.known_facts.map((fact,i)=><li key={i}>{fact}</li>)}</ul>}
        <small className="trail">{soul.last_seen ? `Last seen — ${soul.last_seen}` : 'The trail is quiet.'}{Number.isInteger(soul.introduced_turn) ? (soul.introduced_turn === 0 ? ' · Present from the first page' : ` · Entered the tale at turn ${soul.introduced_turn}`) : ''}</small>
      </article>;
    })}</div>}
    </div>}

    {chapter === 'places' && <div className="book-page" data-page="places">
    <h3>The Traveler's Chart</h3>
    <TravelersChart campaign={campaign} gallery={gallery} onOpenPlace={(name) => onNav({ place: name })} />
    <h3>Regions</h3><div className="region-gallery">{c.regions.map((region)=><article key={region.id} className="tappable" role="button" tabIndex={0} onClick={() => onNav({ place: openPlace === region.name ? null : region.name })}>{gallery[region.name] && <img className="region-plate" src={gallery[region.name]} alt={region.name}/>}<div className="region-copy"><b>{region.name}</b><span>{region.state}</span><p>{region.visual}</p></div></article>)}</div>
    {openPlace && (() => { const place = placesOf(campaign).find((entry) => entry.name === openPlace); const sworn = soulsSwornTo(c.cast, openPlace); return place && <article className="place-page">
      <header><h4>{place.name}</h4><span className="place-state">{place.state}</span><button className="text-button" style={{marginLeft:'auto'}} onClick={() => onNav({ place: null })}>close</button></header>
      {gallery[place.name] && <img className="region-plate" src={gallery[place.name]} alt={place.name}/>}
      <p>{place.visual}</p>
      {place.discoveredTurn !== null && <p className="cite">Entered the tale on turn {place.discoveredTurn}{place.gloss ? ` — “${place.gloss}”` : ''}.</p>}
      {sworn.length > 0 && <div className="sworn-chips">{sworn.map((edge, i) => <button key={i} onClick={() => onNav({ chapter: 'people', place: null, soul: edge.name })}>{edge.name} — sworn of {edge.of}</button>)}</div>}
      {/* THE PRESENCE CUT (Directive VII.12) — who stands here now, and who
          has stood here and moved on. Replayed pure from the sealed record;
          every entry cites the journal row that staged it. The catch is the
          panel's own oath (architect's cut, 56.6): if the replay ever falls,
          the page SAYS so — never a crash, never silence. */}
      {(() => { let visitors = null;
        try { visitors = visitorsOf(campaign, place.name); } catch { visitors = null; }
        return visitors === null
          ? <p className="cite">The presence record cannot be read.</p>
          : <>
        {visitors.standing.length > 0 && <><h4 className="eyebrow">Standing here</h4>
          <ul className="presence-list">{visitors.standing.map((entry, i) => <li key={i}><b>{entry.name}</b><span className="cite">turn {entry.cite}</span></li>)}</ul></>}
        {visitors.former.length > 0 && <><h4 className="eyebrow">Have stood here</h4>
          <ul className="presence-list">{visitors.former.map((entry, i) => <li key={i}><b>{entry.name}</b><span className="cite">turn {entry.cite}</span></li>)}</ul></>}
      </>; })()}
      {/* THE FIXTURES (Directive VIII.9) — place-bound canon from the
          fold, sealed once, each cited to the turn that sealed it. */}
      {(() => { const placeFixtures = (c.fixtures || []).filter((entry) => entry.place === place.name);
        return placeFixtures.length > 0 && <><h4 className="eyebrow">Fixtures</h4>
          <ul className="presence-list fixture-list">{placeFixtures.map((entry, i) => <li key={i}><b>{entry.name}</b> — {entry.visual}{Number.isInteger(entry.since) && <span className="cite">sealed turn {entry.since}</span>}</li>)}</ul></>; })()}
    </article>; })()}
    </div>}

    {chapter === 'things' && <div className="book-page" data-page="things">
    <h3>The Trove</h3>
    {(() => { const heroName = campaign.hero?.name || 'The hero'; const purse = oneCoinFigure(campaign); const items = troveOf(campaign).sort((a, b) => (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0)); return <>
      <p className="purse-line"><b>{purse.coin}</b> coin held by {heroName}.</p>
      {purse.entries.length > 0 && <div className="purse-list">{purse.entries.map((entry, i) =>
        <div key={i} className="purse-row">
          <span className={`purse-delta${entry.delta < 0 ? ' spent' : ''}`}>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
          <b>{entry.reason}</b>
          <small>turn {entry.turn}{entry.clamped ? ' — held at zero' : ''}</small>
        </div>)}</div>}
      {items.length === 0
        ? <p className="muted">Nothing registered yet — when a named thing enters the tale and matters, it is recorded here with every hand it passes through.</p>
        : <div className="thread-list trove-list">{items.map((item, i) =>
          <div key={i} className={`thread-row trove-row${item.status === 'held' ? '' : ' settled'}`}>
            <span className="thread-kind">{item.kind}</span>
            <b>{item.name}</b>
            {item.equipped && <span className="ready-mark">at the ready</span>}
            <small className="trove-chain">{item.chain.map((hand) => `${hand.holder} (turn ${hand.since})`).join(' → ')}</small>
            {item.note && <small className="trove-note">“{item.note}”</small>}
            {item.status === 'gone' && <span className="outcome">gone{item.removedReason ? ` — ${item.removedReason}` : ''}, turn {item.removedTurn}</span>}
          </div>)}</div>}
    </>; })()}
    <Packs campaign={campaign} gallery={gallery} openPack={openPack} onOpenPack={(name) => onNav({ pack: name })} />
    </div>}

    {chapter === 'debts' && <div className="book-page" data-page="debts">
    <h3>The Open Threads</h3>
    {(() => { const ledger = threadsOf(campaign);
      // THE DOOM LAW (Directive X, Law VII) — the fall note renders from the
      // reducer's own testimony (codex.threads): a doom-walk death folds
      // client-side and never rides a journal turn, so the pure replay
      // cannot see it. One hand writes the words; this panel only repeats
      // them, matched by label, shown only where a fall actually stands.
      const grief = new Map(rowsOf(campaign.codex?.threads).filter((t) => t?.fallNote).map((t) => [String(t.label || '').trim().toLowerCase(), t.fallNote]));
      return ledger.length === 0
      ? <p className="muted">Nothing sworn yet — when a promise, debt, mystery, or goal enters the tale, it is registered here and the tale must answer it.</p>
      : <div className="thread-list">{ledger.map((thread, i) =>
          <div key={i} className={`thread-row${thread.status === 'open' ? '' : ' settled'}`}>
            <span className="thread-kind">{thread.kind}</span>
            <b>{thread.label}</b>
            <small>{thread.holder ? `held by ${thread.holder} — ` : ''}sworn turn {thread.openedTurn}</small>
            {grief.has(String(thread.label || '').trim().toLowerCase()) && <small className="thread-fall">{grief.get(String(thread.label || '').trim().toLowerCase())}</small>}
            {thread.status !== 'open' && <span className="outcome">{thread.outcome}, turn {thread.closedTurn}</span>}
          </div>)}</div>; })()}
    </div>}

    {chapter === 'party' && <div className="book-page" data-page="party">
    {/* THE PARTY STRIP (Directive VIII.9) — who travels with the hero,
        from the codex fold; the hero is the permanent root and is never
        listed. An empty roster is said plainly — the hero travels alone. */}
    <h3>The party — who rides with the hero</h3>
    {rowsOf(c.party).length > 0
      ? <ul className="presence-list party-strip">{rowsOf(c.party).map((member, i) => { const memberPurse = purseOf(campaign, member.name); const memberHeld = heldBy(campaign, member.name); return <li key={i}><b>{member.name}</b><span className="cite">{Number.isInteger(member.joinedTurn) ? `joined turn ${member.joinedTurn}` : 'joined on the road'}</span>
        {/* THE COMPANION-SHEET LAW (Directive X, Law VI) — the sheet on the
            strip: role, level, hit points, and the spread — arithmetic from
            THE ROLE TABLE; the doomed and the stable say so plainly. */}
        {member.sheet && <span className="sheet-line">{member.sheet.sigil} {member.sheet.role} · level {member.sheet.level} · {member.sheet.doom === 'dead' ? 'fallen — the seal is permanent' : member.sheet.doom === 'stable' ? 'stable at zero' : `${member.sheet.hp}/${member.sheet.maxHp} hp`} · {['STR','DEX','CON','INT','WIS','CHA'].map((a) => `${a} ${member.sheet.abilities[a]}`).join(' · ')}</span>}
        {/* THE PACK ECHO (Directive XIV, the Pack Law) — the pack itself
            lives in the Things chapter; the strip carries its echo and the
            door through. */}
        <button className="text-button pack-echo" onClick={() => onNav({ chapter: 'things', pack: member.name })}>{memberPurse.coin} coin · {memberHeld.length} held — open the pack</button>
      </li>; })}</ul>
      : <p className="muted">The hero travels alone.</p>}
    </div>}

    </div>
  </Frame>;
}
