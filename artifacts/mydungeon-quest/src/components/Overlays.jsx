import { useEffect, useState } from 'react';
import { Download, Film, Heart, ScrollText, Shield, Sparkles, X } from 'lucide-react';
import { CONDITIONS } from '../lib/rules.js';
import { db } from '../lib/db.js';

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

function Frame({ title, icon, onClose, children, wide = false }) {
  return <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className={`modal ${wide ? 'wide' : ''}`}><header><span>{icon}<h2>{title}</h2></span><button onClick={onClose} aria-label="Close"><X/></button></header>{children}</section></div>;
}

export function CharacterSheet({ campaign, onClose, onExport }) {
  const h = campaign.hero;
  return <Frame title="Character Sheet" icon={<Shield/>} onClose={onClose}>
    <div className="sheet-hero"><span>{h.sigil}</span><div><h3>{h.name}</h3><p>Level {h.level} {h.ancestry} {h.className}</p></div></div>
    <div className="stat-ribbon"><span><b>{h.hp}/{h.maxHp}</b> HP</span><span><b>{h.ac}</b> AC</span><span><b>{h.gold}</b> gold</span><span><b>{h.xp}</b> XP</span></div>
    <div className="ability-grid compact">{Object.entries(h.abilities).map(([a,v]) => <div key={a}><b>{a}</b><span>{v}</span><small>{Math.floor((v-10)/2) >= 0 ? '+' : ''}{Math.floor((v-10)/2)}</small></div>)}</div>
    <h3>Spell slots</h3><div className="slot-row">{Object.entries(h.spellSlots).length ? Object.entries(h.spellSlots).map(([lvl,slot]) => <span key={lvl}>L{lvl} {Array.from({length:slot.max},(_,i)=><i className={i<slot.current?'full':''} key={i}/>)}</span>) : <em>No prepared slots</em>}</div>
    <h3>Conditions</h3>{h.conditions.length ? h.conditions.map((c)=><div className="condition" key={c}><b>{c}</b><span>{CONDITIONS[c]}</span></div>) : <p className="muted">No conditions.</p>}
    <h3>Inventory</h3><ul>{h.inventory.map((item)=><li key={item}>{item}</li>)}</ul>
    <button className="secondary-button" onClick={onExport}><Download/> Export sealed chronicle</button>
  </Frame>;
}

export function Codex({ campaign, onClose, onReplay }) {
  const c = campaign.codex; const revealed = c.beatIndex >= c.spine.revealIdx;
  const gallery = useGallery(campaign);
  return <Frame title="The Codex" icon={<ScrollText/>} onClose={onClose} wide>
    <div className="codex-head"><div><span className="eyebrow">{c.spine.label}</span><h3>{c.arc?.title || campaign.title}</h3><p>{c.spine.beats[c.beatIndex]?.title}</p></div><div className="blight">Blight <b>{c.blight}/5</b></div></div>
    <h3>The evil design</h3><p className={revealed ? '' : 'gated'}>{revealed ? c.arc?.evil_plot : 'The page refuses to hold the whole shape. Revelation must be earned.'}</p>
    <h3>Souls</h3><div className="codex-grid gallery">{c.cast.map((soul)=><article key={soul.id}>{gallery[soul.name] ? <img className="soul-face" src={gallery[soul.name]} alt={soul.name}/> : <div className="procedural-portrait">{soul.name.split(' ').map((x)=>x[0]).join('')}</div>}<span className="role-tag">{soul.role}</span><h4>{soul.name}</h4><p>{soul.visual}</p><small>Bond {soul.bond}/4 · {soul.status}</small></article>)}</div>
    <h3>Regions</h3><div className="region-gallery">{c.regions.map((region)=><article key={region.id}>{gallery[region.name] && <img className="region-plate" src={gallery[region.name]} alt={region.name}/>}<div className="region-copy"><b>{region.name}</b><span>{region.state}</span><p>{region.visual}</p></div></article>)}</div>
    <h3>Cinematic archive</h3><div className="replay-list">{campaign.logs.filter((l)=>l.dm.cinematic && !l.redacted).map((log)=><button key={log.id} onClick={()=>onReplay(log.dm)}><Film/> {log.dm.cinematic.title}</button>)}</div>
    <h3>Memoir</h3>{c.memoir.length ? c.memoir.map((m,i)=><p key={i}>{m}</p>) : <p className="muted">The Chronicler has not yet needed to compress the road behind you.</p>}
  </Frame>;
}

export function Settings({ campaign, settings, onChange, onClose }) {
  return <Frame title="Settings & Care" icon={<Sparkles/>} onClose={onClose}>
    <label className="toggle"><span>Reduce motion<small>Replace cinematics with quiet beat lines.</small></span><input type="checkbox" checked={settings.reduceMotion} onChange={(e)=>onChange({...settings,reduceMotion:e.target.checked})}/></label>
    <label className="toggle"><span>Haptics<small>Use a brief vibration for dice.</small></span><input type="checkbox" checked={settings.haptics} onChange={(e)=>onChange({...settings,haptics:e.target.checked})}/></label>
    <label className="toggle"><span>The score<small>A living motif that follows your story's danger.</small></span><input type="checkbox" checked={settings.score} onChange={(e)=>onChange({...settings,score:e.target.checked})}/></label>
    <label className="toggle"><span>Voiced narration<small>Each soul is cast once from this device's voices.</small></span><input type="checkbox" checked={settings.voice} onChange={(e)=>onChange({...settings,voice:e.target.checked})}/></label>
    <label>Text scale<input type="range" min=".9" max="1.3" step=".05" value={settings.textScale} onChange={(e)=>onChange({...settings,textScale:Number(e.target.value)})}/></label>
    <h3>Foundry tier</h3><div className="tier-grid">{[
      ['parchment','Parchment','Procedural, instant, free.'],['illuminated','Illuminated','Portraits, regions, and stills.'],['cinema','Cinema','Video, voice, music, and SFX.']
    ].map(([id,label,desc])=><button className={campaign.mediaTier===id?'selected':''} key={id} onClick={()=>onChange({...settings,mediaTier:id})}><b>{label}</b><span>{desc}</span></button>)}</div>
    <div className="spend"><b>Session cap</b><span>Images {campaign.spend?.images||0}/80</span><span>Video {campaign.spend?.videos||0}/16</span><span>Music {campaign.spend?.music||0}/8</span></div>
    <div className="law-note"><Heart/><span>No accounts. Nothing leaves this device without you.</span></div>
  </Frame>;
}

export function Storybook({ html, onClose, onPdf, onHtml }) {
  return <Frame title="The Bound Chronicle" icon={<ScrollText/>} onClose={onClose} wide>
    <iframe className="book-frame" srcDoc={html} title="The bound chronicle" />
    <div className="button-row"><button className="secondary-button" onClick={onHtml}><Download/> Save HTML</button><button className="primary-button" onClick={onPdf}><Download/> Bind to PDF</button></div>
  </Frame>;
}
