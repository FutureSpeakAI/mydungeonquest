import { useEffect, useState, useMemo } from 'react';
import { Download, Heart, ScrollText, Shield, Sparkles, X } from 'lucide-react';
import { CONDITIONS } from 'fatescript/rules';
import { db } from '../lib/db.js';
import { doorBuilt } from '../patron/door.jsx';
import { TollSection, useToll } from '../patron/toll.jsx';
import { resolveSheetFace } from '../lib/sheetFace.js';
import { heroPurse, oneCoinFigure } from '../lib/ledger.js';
import { regionSlate } from '../lib/market.js';
import { chartRibbon } from '../lib/atlas.js';
import { composeReport } from '../lib/errata.js';
import { HOUSE_VERSION } from '../lib/houseConfig.js';

// Load the latest painted plate per label (souls, regions, key art) so the
// Codex reads as a gallery of the world's real faces, not initials.
export function useGallery(campaign) {
  const [gallery, setGallery] = useState({});
  useEffect(() => {
    let urls = [], alive = true;
    (async () => {
      // (Directive XIV) The table itself now wears faces on a chip — the
      // hook must stand quietly when no tale is open yet.
      if (!campaign) { if (alive) setGallery({}); return; }
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
  }, [campaign?.id, campaign?.logs?.length]);
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

export function Frame({ title, icon, onClose, children, wide = false }) {
  return <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className={`modal ${wide ? 'wide' : ''}`}><header><span>{icon}<h2>{title}</h2></span><button onClick={onClose} aria-label="Close"><X/></button></header>{children}</section></div>;
}

export function CharacterSheet({ campaign, onClose, onExport }) {
  const h = campaign.hero;
  // THE PURSE — coin and pack are projections of the sealed record,
  // folded through the one ledger; refusals are receipts, shown, and a
  // count that drifted from the sheet's old memory says so out loud.
  const purse = useMemo(() => heroPurse(campaign), [campaign]);
  // ONE COIN (Directive XII §IV) — the ribbon's figure walks the era door:
  // purse-law tales speak the purse fold, legacy tales the cited old lane.
  const oneCoin = useMemo(() => oneCoinFigure(campaign), [campaign]);
  // THE SLATE — the active region's staple prices, witnessed and drifted
  // by the record alone; the market ribbon speaks the engine's own words.
  const slate = useMemo(() => regionSlate(campaign), [campaign]);
  // THE CHART — the witnessed world in days of travel; rumors are
  // counted, never drawn, and the fog is honest by construction.
  const chart = useMemo(() => chartRibbon(campaign), [campaign]);
  return <Frame title="Character Sheet" icon={<Shield/>} onClose={onClose}>
    <div className="sheet-hero"><AnchorBust campaign={campaign}/><div><h3>{h.name}</h3><p>Level {h.level} {h.ancestry} {h.className}</p></div></div>
    <div className="stat-ribbon"><span><b>{h.hp}/{h.maxHp}</b> HP</span><span><b>{h.ac}</b> AC</span><span><b>{oneCoin.coin}</b> gold</span><span><b>{h.xp}</b> XP</span></div>
    {/* ONE COIN (Directive XII §IV) — the ledger's figure is the only coin
        spoken; the sheet keeps no rival memory worth quoting. */}
    <div className="ability-grid compact">{Object.entries(h.abilities).map(([a,v]) => <div key={a}><b>{a}</b><span>{v}</span><small>{Math.floor((v-10)/2) >= 0 ? '+' : ''}{Math.floor((v-10)/2)}</small></div>)}</div>
    <h3>Spell slots</h3><div className="slot-row">{Object.entries(h.spellSlots).length ? Object.entries(h.spellSlots).map(([lvl,slot]) => <span key={lvl}>L{lvl} {Array.from({length:slot.max},(_,i)=><i className={i<slot.current?'full':''} key={i}/>)}</span>) : <em>No prepared slots</em>}</div>
    {/* THE GRIMOIRE (XVIII): the learned list and the held thread are
        projections of the hero record — the tables own the numbers, the
        sheet only speaks them. Non-casters keep the old sheet whole. */}
    {h.spellEnergy ? <><h3>Spell energy</h3><div className="slot-row"><span>Charges {Array.from({length:h.spellEnergy.max},(_,i)=><i className={i<h.spellEnergy.current?'full':''} key={i}/>)}</span></div></> : null}
    {Array.isArray(h.spells) && h.spells.length > 0 && <><h3>Spells known</h3><div className="spell-list">{h.spells.map((s) => <span className="spell-known" key={s}>{s}</span>)}</div>{h.concentration ? <p className="muted">Concentrating: {h.concentration} — one thread at a time; a new one asks the old to fall.</p> : null}</>}
    <h3>Conditions</h3>{h.conditions.length ? h.conditions.map((c)=><div className="condition" key={c}><b>{c}</b><span>{CONDITIONS[c]}</span></div>) : <p className="muted">No conditions.</p>}
    <h3>Inventory</h3><ul>{purse.pack.map(({ item, qty }) => <li key={item}>{qty > 1 ? `${qty}\u00d7 ${item}` : item}</li>)}</ul>
    {purse.refusals.length > 0 && <><h3>The till’s receipts</h3>{purse.refusals.map((r, i) => <p className="muted" key={i}>Refused at t.{r.turn} — {r.reason}.</p>)}</>}
    {slate.lines.length > 0 && <><h3>The market slate — {slate.region}</h3>{slate.lines.map((line, i) => <p className="muted" key={i}>{line}</p>)}</>}
    {chart.origin && <><h3>The chart — from {chart.origin}</h3>{chart.lines.map((line, i) => <p className="muted" key={i}>{line}</p>)}{chart.fogged > 0 && <p className="muted">… and {chart.fogged} {chart.fogged === 1 ? 'place' : 'places'} spoken of in the codex, not yet witnessed at the table.</p>}</>}
    <button className="secondary-button" onClick={onExport}><Download/> Export sealed chronicle</button>
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
    <BetaDoor campaign={campaign} settings={settings} toll={toll} />
    <OwnersBell/>
    <div className="law-note"><Heart/><span>{doorBuilt
      ? 'Your chronicles stay on this device. A name at the door is only a key — the tale itself never leaves without you.'
      : 'No accounts. Nothing leaves this device without you.'}</span></div>
  </Frame>;
}

// THE BETA DOORS (XVII, stage three) — a report the tester sends by their
// own hand, consent stated in its first lines; the on-device errata ledger
// rides in; the vault's local-only truth is said plainly; and the beta is
// defined in one line. Nothing here touches the network — copy and mailto
// are the only exits, and both are the tester's own hand.
function BetaDoor({ campaign, settings, toll }) {
  const [word, setWord] = useState(null);
  const report = useMemo(() => composeReport({ version: HOUSE_VERSION, campaign, settings, plan: toll?.plan || 'keyless' }), [campaign, settings, toll]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(report); setWord('Copied whole. Paste it wherever you send word.'); }
    catch { setWord('The clipboard was refused. Select the report and copy it by hand.'); }
  };
  return <>
    <h3>The beta door</h3>
    <p className="muted">This is the beta: the free local build behind invites. The cloud and the toll arrive as their own works.</p>
    <pre className="beta-report" aria-label="The report, exactly as it would be sent">{report}</pre>
    <div className="button-row">
      <button className="secondary-button" onClick={copy}>Copy the report</button>
      <a className="secondary-button" href={`mailto:?subject=${encodeURIComponent('MyDungeon.Quest beta report')}&body=${encodeURIComponent(report)}`}>Send by hand</a>
    </div>
    {word && <p className="muted" role="status">{word}</p>}
    <p className="muted">Until the Commons lands, this vault lives on this device alone. Export a sealed chronicle now and then — the sheet's export door keeps the tale in your own hands.</p>
  </>;
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
