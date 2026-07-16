import { useEffect, useState, useMemo } from 'react';
import { Download, Film, Heart, ScrollText, Shield, Sparkles, X } from 'lucide-react';
import { CONDITIONS } from 'fatescript/rules';
import { db } from '../lib/db.js';
import { ACT_NAMES, romanNumeral } from 'fatescript/story';
import { cardsForCampaign } from 'fatescript/cards';
import { voiceLineOf, wordsLine, tieLine } from 'fatescript/wikiText';
import { doorBuilt } from '../patron/door.jsx';
import { TollSection, useToll } from '../patron/toll.jsx';
import { clockWords } from '../lib/clockAtTable.js';
import { resolveSheetFace } from '../lib/sheetFace.js';
import { chapterCard, downloadCard } from '../lib/shareCard.js';

// Load the latest painted plate per label (souls, regions, key art) so the
// Codex reads as a gallery of the world's real faces, not initials.
function useGallery(campaign) {
  const [gallery, setGallery] = useState({});
  useEffect(() => {
    let urls = [], alive = true;
    (async () => {
      const rows = await db.media.where('campaignId').equals(campaign.id).toArray();
      const latest = {};
      for (const row of rows) {
        if (row.kind !== 'paint' || !row.blob || !row.label) continue;
        if (!latest[row.label] || latest[row.label].createdAt < row.createdAt) latest[row.label] = row;
      }
      const out = {};
      for (const [label, row] of Object.entries(latest)) { const u = URL.createObjectURL(row.blob); urls.push(u); out[label] = u; }
      if (alive) setGallery(out); else urls.forEach(URL.revokeObjectURL);
    })();
    return () => { alive = false; urls.forEach(URL.revokeObjectURL); };
  }, [campaign.id, campaign.logs.length]);
  return gallery;
}

// THE FACE ON THE SHEET — Directive VI, Phase 12. The ladder is the
// resolver's law (src/lib/sheetFace.js): the blessed anchor (post-Sitting)
// outranks all; else the stable hash key minted at the forge (a rename
// never orphans it); else the elder-tale walk to the OLDEST bust under the
// hero's own label — never the latest take, never a borrowed portrait.
// Sourced from the media store by asset hash, never re-rendered.
export function useHeroBust(campaign) {
  const [face, setFace] = useState(null);
  useEffect(() => {
    let url = null, alive = true;
    (async () => {
      const rows = await db.media.where('campaignId').equals(campaign.id).toArray();
      const { row } = resolveSheetFace({
        heroName: campaign.hero?.name,
        blessedHash: campaign.blessedAnchors?.hero || null,
        anchorHash: campaign.heroBustHash || null,
        rows,
      });
      // No lawful face for THIS tale/name: clear any prior portrait — a live
      // update must fall to the parchment mark, never keep a stale ghost.
      if (!row?.blob) { if (alive) setFace(null); return; }
      url = URL.createObjectURL(row.blob);
      if (alive) setFace(url); else { URL.revokeObjectURL(url); url = null; }
    })();
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [campaign.id, campaign.heroBustHash, campaign.hero?.name, campaign.blessedAnchors?.hero]);
  return face;
}

// THE ANCHOR BUST — the sheet's face as a leaf. The resolved anchor rides
// as an image when one stands; the parchment floor is the hero's sigil in
// the woodcut frame — a bust-shaped mark, never a bare form. A sheet
// without its face is a form, not a leaf.
export function AnchorBust({ campaign }) {
  const h = campaign.hero;
  const face = useHeroBust(campaign);
  return face
    ? <img className="hero-face" src={face} alt={h.name}/>
    : <span className="hero-face parchment-bust" role="img" aria-label={`${h.name} — the parchment mark`}>{h.sigil}</span>;
}

function Frame({ title, icon, onClose, children, wide = false }) {
  return <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className={`modal ${wide ? 'wide' : ''}`}><header><span>{icon}<h2>{title}</h2></span><button onClick={onClose} aria-label="Close"><X/></button></header>{children}</section></div>;
}

export function CharacterSheet({ campaign, onClose, onExport }) {
  const h = campaign.hero;
  return <Frame title="Character Sheet" icon={<Shield/>} onClose={onClose}>
    <div className="sheet-hero"><AnchorBust campaign={campaign}/><div><h3>{h.name}</h3><p>Level {h.level} {h.ancestry} {h.className}</p></div></div>
    <div className="stat-ribbon"><span><b>{h.hp}/{h.maxHp}</b> HP</span><span><b>{h.ac}</b> AC</span><span><b>{h.gold}</b> gold</span><span><b>{h.xp}</b> XP</span></div>
    <div className="ability-grid compact">{Object.entries(h.abilities).map(([a,v]) => <div key={a}><b>{a}</b><span>{v}</span><small>{Math.floor((v-10)/2) >= 0 ? '+' : ''}{Math.floor((v-10)/2)}</small></div>)}</div>
    <h3>Spell slots</h3><div className="slot-row">{Object.entries(h.spellSlots).length ? Object.entries(h.spellSlots).map(([lvl,slot]) => <span key={lvl}>L{lvl} {Array.from({length:slot.max},(_,i)=><i className={i<slot.current?'full':''} key={i}/>)}</span>) : <em>No prepared slots</em>}</div>
    <h3>Conditions</h3>{h.conditions.length ? h.conditions.map((c)=><div className="condition" key={c}><b>{c}</b><span>{CONDITIONS[c]}</span></div>) : <p className="muted">No conditions.</p>}
    <h3>Inventory</h3><ul>{h.inventory.map((item)=><li key={item}>{item}</li>)}</ul>
    <button className="secondary-button" onClick={onExport}><Download/> Export sealed chronicle</button>
  </Frame>;
}

const STATUS_WORD = { active: 'Walks the tale', dead: 'Fallen', missing: 'Lost to the road' };

export function Codex({ campaign, onClose, onReplay, onSealTale }) {
  const c = campaign.codex; const revealed = c.beatIndex >= c.spine.revealIdx;
  const gallery = useGallery(campaign);
  // THE LIVING WIKI: cards are derived lawfully from the log; each soul is a
  // page, each tie a backlink, each chronicle line a citation into the tale.
  const wiki = useMemo(() => { try { return cardsForCampaign(campaign).cards; } catch { return {}; } }, [campaign]);
  const [openSoul, setOpenSoul] = useState(null);
  const openCard = openSoul ? wiki[openSoul.toLowerCase()] : null;
  const acts = [...new Set(c.spine.beats.map((beat) => beat.act || 1))];
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
  return <Frame title="The Codex" icon={<ScrollText/>} onClose={onClose} wide>
    <div className="codex-head"><div><span className="eyebrow">{c.spine.label}</span><h3>{c.arc?.title || campaign.title}</h3><p>{c.spine.beats[c.beatIndex]?.title}</p><p className="muted codex-clock" role="note">{clockWords(campaign.logs)}</p></div><div className="blight">Blight <b>{c.blight}/5</b></div></div>
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
    <h3>The cast — what the world remembers</h3>
    {openCard && <article className="soul-page">
      <button className="text-button" onClick={() => setOpenSoul(null)}>← All souls</button>
      <div className="soul-page-head">
        {gallery[openCard.name] ? <img className="soul-face large" src={gallery[openCard.name]} alt={openCard.name}/> : <div className="procedural-portrait large">{openCard.name.split(' ').map((x)=>x[0]).join('')}</div>}
        <div><h4>{openCard.name}</h4><span className="role-tag">{openCard.identity.role}</span>
          <span className={`status-badge ${openCard.state.status}`}>{STATUS_WORD[openCard.state.status] || openCard.state.status}</span>
          {voiceLineOf(openCard.identity) && <p className="muted">{voiceLineOf(openCard.identity)}.</p>}
        </div>
      </div>
      <p>{openCard.identity.canon.visual}</p>
      {wordsLine(openCard) && <p className="voice-italic">{wordsLine(openCard)}</p>}
      {openCard.ties.length > 0 && <div className="tie-chips">{openCard.ties.map((tie, i) =>
        <button key={i} className="tie-chip" onClick={() => wiki[tie.to.toLowerCase()] && setOpenSoul(tie.to)}>{tieLine(tie)}</button>)}</div>}
      <h4 className="eyebrow">Appearances</h4>
      <ol className="soul-timeline">{openCard.chronicle.map((line, i) => {
        const scene = campaign.logs.find((log) => log.turn === line.turn && log.dm?.cinematic && !log.redacted);
        return <li key={i}><b>Turn {line.turn}</b> — {line.gloss}{scene && <button className="text-button" onClick={() => onReplay(scene.dm)}>replay</button>}</li>;
      })}</ol>
    </article>}
    {!openCard && <div className="codex-grid gallery">{c.cast.map((soul)=>{
      const dead = soul.status === 'dead';
      const lastWhy = (soul.bond_arc || []).slice(-1)[0]?.why;
      return <article key={soul.id} className={`soul-card${dead ? ' memorial' : ''}`} onClick={() => setOpenSoul(soul.name)} role="button" tabIndex={0}>
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
    <h3>Regions</h3><div className="region-gallery">{c.regions.map((region)=><article key={region.id}>{gallery[region.name] && <img className="region-plate" src={gallery[region.name]} alt={region.name}/>}<div className="region-copy"><b>{region.name}</b><span>{region.state}</span><p>{region.visual}</p></div></article>)}</div>
    <h3>Cinematic archive</h3><div className="replay-list">{campaign.logs.filter((l)=>l.dm.cinematic && !l.redacted).map((log)=><button key={log.id} onClick={()=>onReplay(log.dm)}><Film/> {log.dm.cinematic.title}</button>)}</div>
    <h3>Memoir</h3>{c.memoir.length ? c.memoir.map((m,i)=><p key={i}>{m}</p>) : <p className="muted">The Chronicler has not yet needed to compress the road behind you.</p>}
  </Frame>;
}

// THE OWNER'S BELL-PULL, given a handle in the house itself. The room only
// exists when ADMIN_TOKEN is chalked (a tokenless fork answers 404), so we
// ask ONCE per page load — an unauthorized knock, refused before any ping
// rides out — and render nothing at all where the room does not stand.
// Keyless/unconfigured forks see Settings byte-for-byte as before.
let bellRoomAsked = null;
function bellRoomStands() {
  if (!bellRoomAsked) {
    bellRoomAsked = fetch('/api/herald/test', { method: 'POST' })
      .then((r) => r.status !== 404)
      .catch(() => false);
  }
  return bellRoomAsked;
}

const BELL_WORD = {
  sent: 'Sent — the herald delivered the test ping.',
  undelivered: 'Undelivered — the webhook was rung but did not answer. Check the chalked address.',
  mute: 'Mute — no herald webhook is chalked on this house, so there was nothing to ring.',
};

function OwnersBell() {
  const [stands, setStands] = useState(false);
  const [token, setToken] = useState(() => { try { return localStorage.getItem('mdq.bellToken') || ''; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const [rung, setRung] = useState(null); // { status, herald } | { refused } | { broke }
  useEffect(() => { let alive = true; bellRoomStands().then((v) => { if (alive) setStands(v); }); return () => { alive = false; }; }, []);
  if (!stands) return null;
  const keepToken = (value) => { setToken(value); try { value ? localStorage.setItem('mdq.bellToken', value) : localStorage.removeItem('mdq.bellToken'); } catch { /* private mode keeps nothing */ } };
  const ring = async () => {
    setBusy(true); setRung(null);
    try {
      const response = await fetch('/api/herald/test', { method: 'POST', headers: { Authorization: `Bearer ${token.trim()}` } });
      if (response.status === 401) setRung({ refused: true });
      else if (!response.ok) setRung({ broke: `The bell answered ${response.status}.` });
      else setRung(await response.json());
    } catch { setRung({ broke: 'The bell could not be reached.' }); }
    setBusy(false);
  };
  return <>
    <h3>The owner's bell-pull</h3>
    <p className="muted">Re-test the alert webhook without a restart. The admin token stays on this device only.</p>
    <div className="bell-pull-row">
      <input type="password" placeholder="Admin token" value={token} autoComplete="off" onChange={(e) => keepToken(e.target.value)} aria-label="Admin token"/>
      <button className="secondary-button" disabled={busy || !token.trim()} onClick={ring}>{busy ? 'Ringing…' : 'Ring the test'}</button>
    </div>
    {rung?.refused && <p className="muted">The bell-pull answers only the owner's hand — that token was refused.</p>}
    {rung?.broke && <p className="muted">{rung.broke}</p>}
    {rung?.status && <div className="bell-outcome">
      <p><b>{BELL_WORD[rung.status] || rung.status}</b></p>
      <p className="muted">Herald: {rung.herald?.configured ? 'webhook chalked' : 'no webhook chalked'}
        {rung.herald?.last ? ` · last ring ${rung.herald.last.status} at ${new Date(rung.herald.last.at).toLocaleString()}` : ' · no ring on record'}</p>
    </div>}
  </>;
}

export function Settings({ campaign, settings, onChange, onDownloadAudio, audioBusy, onClose }) {
  const toll = useToll();
  // Honest hints, spoken only when the gateway truly stands: a guest at a lit
  // house is told plainly the paints wait behind the door; a hearth or
  // illuminated seat is told plainly which throat the voiced seat opens.
  const paintsBehindDoor = toll?.live && toll.plan === 'guest';
  const voiceElsewhere = toll?.live && toll.plan !== 'guest' && toll.quotas?.speak === 0;
  const forgeElsewhere = toll?.live && toll.plan !== 'guest' && toll.quotas?.podcast === 0;
  return <Frame title="Settings & Care" icon={<Sparkles/>} onClose={onClose}>
    <label className="toggle"><span>Reduce motion<small>Replace cinematics with quiet beat lines.</small></span><input type="checkbox" checked={settings.reduceMotion} onChange={(e)=>onChange({...settings,reduceMotion:e.target.checked})}/></label>
    <label className="toggle"><span>Haptics<small>Use a brief vibration for dice.</small></span><input type="checkbox" checked={settings.haptics} onChange={(e)=>onChange({...settings,haptics:e.target.checked})}/></label>
    <label className="toggle"><span>The shared sky<small>One sky hangs over every world — a seasonal omen the Dungeon Master may read by this world's covenant, or ignore entirely. Close it and this world's sky falls silent.</small></span><input type="checkbox" checked={campaign.sky !== 'off'} onChange={(e)=>onChange({...settings,sky:e.target.checked?'open':'off'})}/></label>
    <label className="toggle"><span>The narrator<small>Each new turn is read aloud — the storyteller's voice for the prose, each soul's own voice for its lines. One voice at a time, nothing beneath it. Tap “Listen” on any turn to replay it.{voiceElsewhere ? ' The voiced seat opens this throat — see the toll-house below.' : ''}</small></span><input type="checkbox" checked={settings.narrator} onChange={(e)=>onChange({...settings,narrator:e.target.checked})}/></label>
    <label>Text scale<input type="range" min=".9" max="1.3" step=".05" value={settings.textScale} onChange={(e)=>onChange({...settings,textScale:Number(e.target.value)})}/></label>
    <h3>Foundry tier</h3><div className="tier-grid">{[
      ['parchment','Parchment','Procedural woodcut art, instant, free — and silent.'],['illuminated','Illuminated','Painted stills, voiced narration, music only at the turning points.']
    ].map(([id,label,desc])=><button className={campaign.mediaTier===id?'selected':''} key={id} onClick={()=>onChange({...settings,mediaTier:id})}><b>{label}</b><span>{desc}{id==='illuminated' && paintsBehindDoor ? ' The house paints for named patrons — give your name at the door.' : ''}</span></button>)}</div>
    <div className="spend"><b>Session cap</b><span>Images {campaign.spend?.images||0}/80</span><span>Music {campaign.spend?.music||0}/8</span></div>
    <TollSection toll={toll} />
    {onDownloadAudio && <>
      <h3>The chronicle, read aloud</h3>
      <p className="muted">Stitch every turn's narration — each soul in its own voice, nothing playing beneath — into one reading you can keep.</p>
      <button className="secondary-button" disabled={audioBusy} onClick={onDownloadAudio}><Download/> {audioBusy ? 'Forging the episode…' : 'Forge the podcast'}</button>
      <p className="muted">One produced episode from the sealed record — the Chronicler retells, the cast re-speak their own lines, stings sound only between sections. The forge binds real voices only; a keyless table keeps the book.{forgeElsewhere ? ' The forge lights for the voiced seat — the toll-house below tells the way.' : ''}</p>
    </>}
    <OwnersBell/>
    <div className="law-note"><Heart/><span>{doorBuilt
      ? 'Your chronicles stay on this device. A name at the door is only a key — the tale itself never leaves without you.'
      : 'No accounts. Nothing leaves this device without you.'}</span></div>
  </Frame>;
}

export function Storybook({ html, onClose, onPdf, onHtml, onSize }) {
  // The folio choice lives here: the compiler rebinds the same book to
  // Letter or A5, and the reader in the iframe re-opens on page one.
  const [size, setSize] = useState('Letter');
  return <Frame title="The Bound Chronicle" icon={<ScrollText/>} onClose={onClose} wide>
    {/* Sandboxed: the book's reader script runs, but in an opaque origin —
        a crafted chronicle can never reach the table's own vault from here. */}
    <iframe className="book-frame" srcDoc={html} sandbox="allow-scripts allow-downloads" title="The bound chronicle" />
    <div className="button-row">
      {onSize && <div className="size-toggle" role="group" aria-label="Folio size">{['Letter', 'A5'].map((option) =>
        <button key={option} className={`secondary-button${size === option ? ' selected' : ''}`} onClick={() => { if (size !== option) { setSize(option); onSize(option); } }}>{option}</button>)}</div>}
      <button className="secondary-button" onClick={onHtml}><Download/> Keep as HTML</button>
      <button className="primary-button" onClick={onPdf}><Download/> Bind to PDF</button>
    </div>
    <p className="muted">Your tale is told. Bind it — the book turns its own pages here, prints to {size}, and carries its proof for the notary.</p>
  </Frame>;
}
