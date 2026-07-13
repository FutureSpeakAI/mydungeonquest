import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { SPINES } from '../lib/spines.js';
import { Foundry } from '../lib/cinema/foundry.js';
import { proceduralArtDataUrl } from '../lib/cinema/procedural.js';
import { heroPortraitKey, heroPortraitPrompt, keyArtKey, keyArtPrompt } from '../lib/cinema/prologue.js';

const seedWorlds = [
  'A drowned empire where memories are legal tender.',
  'A cozy mountain kingdom built atop a sleeping machine.',
  'A moonlit frontier where roads choose their travelers.'
];

// Debounced Foundry render used by both forges. Returns a live object
// URL for the painted asset (or null while it renders / on parchment).
function useForgeRender(id, tier, deps, makeJob, watch) {
  const [url, setUrl] = useState(null);
  const [rendering, setRendering] = useState(false);
  useEffect(() => {
    if (!id || tier === 'parchment') { setUrl(null); return; }
    let alive = true, objectUrl = null;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const foundry = new Foundry({ campaignId: id, tier });
        const row = await foundry.enqueue(makeJob());
        if (alive && row?.blob) { objectUrl = URL.createObjectURL(row.blob); setUrl(objectUrl); }
      } catch { /* the procedural plate stands in */ }
      finally { if (alive) setRendering(false); }
    }, 850);
    return () => { alive = false; clearTimeout(timer); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, deps); // eslint-disable-line
  return [url, rendering];
}

export function WorldForge({ mediaTier = 'parchment', onBack, onContinue }) {
  const idRef = useRef(crypto.randomUUID());
  const [form, setForm] = useState({ title: 'The Unwritten Road', covenant: seedWorlds[2], spineId: 'classic-epic', tone: 'Mythic, warm, and dangerous', linesText: '', veilsText: '', homeRegion: 'Larkspur Vale', styleBible: 'Romantic dark-fantasy oil painting with illuminated-manuscript gold, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.' });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));

  const proc = useMemo(() => proceduralArtDataUrl(`${idRef.current}:${form.covenant}`, '', ['#0d0b14', '#3a2740', '#d4a24e']), [form.covenant]);
  const [artUrl, rendering] = useForgeRender(
    idRef.current, mediaTier,
    [form.covenant, form.styleBible, form.tone, form.title, mediaTier],
    () => ({ kind: 'paint', prompt: keyArtPrompt({ ...form, lines: [], veils: [] }, 1), cacheKey: keyArtKey(idRef.current, 1), options: { kind: 'scene', label: 'keyart' } })
  );

  const cover = artUrl || proc;
  return <main className="forge-page prologue page-enter" style={{ '--keyart': `url("${cover}")` }}>
    <div className={`prologue-plate${rendering ? ' summoning' : ''}${artUrl ? ' painted' : ''}`} aria-hidden="true" />
    <div className="prologue-veil" aria-hidden="true" />
    <div className="prologue-content">
      <button className="text-button" onClick={onBack}>← Chronicle shelf</button>
      <header className="forge-header"><span className="eyebrow">World Forge · Prologue</span><h1>Tell the world what it dreams.</h1><p>Plain language becomes the covenant. As you write, the world is already being painted.</p></header>
      <section className="forge-card">
        <label>Chronicle title<input value={form.title} onChange={set('title')} maxLength={80}/></label>
        <label>Your world<textarea value={form.covenant} onChange={set('covenant')} rows="5" maxLength={2000}/></label>
        <div className="seed-row">{seedWorlds.map((seed) => <button key={seed} onClick={() => setForm((v) => ({ ...v, covenant: seed }))}>{seed}</button>)}</div>
        <div className="form-grid">
          <label>Story spine<select value={form.spineId} onChange={set('spineId')}>{SPINES.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.beats.length} beats</option>)}</select></label>
          <label>Tone<input value={form.tone} onChange={set('tone')} /></label>
          <label>Home region<input value={form.homeRegion} onChange={set('homeRegion')} /></label>
          <label>Lines — never appear<input value={form.linesText} onChange={set('linesText')} placeholder="comma separated" /></label>
          <label>Veils — fade to black<input value={form.veilsText} onChange={set('veilsText')} placeholder="comma separated" /></label>
        </div>
        <label>Style bible<textarea value={form.styleBible} onChange={set('styleBible')} rows="3" maxLength={300}/></label>
        <div className="law-note"><ShieldCheck/><span>All narration and painted art remain PG-13. Lines and Veils stay with you and never reach the brush.</span></div>
        <button className="primary-button" onClick={() => onContinue({ ...form, id: idRef.current, lines: form.linesText.split(',').map((x) => x.trim()).filter(Boolean), veils: form.veilsText.split(',').map((x) => x.trim()).filter(Boolean) })}>Forge the hero <ArrowRight/></button>
      </section>
    </div>
  </main>;
}

const ARRAYS = {
  STR: [15,14,13,12,10,8], DEX: [14,15,13,12,10,8], CON: [14,13,15,12,10,8],
  INT: [10,13,12,15,14,8], WIS: [12,13,14,10,15,8], CHA: [8,12,10,13,14,15]
};

export function HeroForge({ world, mediaTier = 'parchment', onBack, onBegin }) {
  const [form, setForm] = useState({ name: 'Aster Vale', sigil: '✦', ancestry: 'Human', className: 'Ranger', caster: 'half', hitDie: 10, abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 }, skills: ['Perception','Survival','Stealth'], background: 'A former road-warden who can hear when a path is lying.' });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const updateAbility = (ability, value) => setForm((f) => ({ ...f, abilities: { ...f.abilities, [ability]: Number(value) } }));

  const proc = useMemo(() => proceduralArtDataUrl(`${world.id}:${form.name}:${form.className}`, '', ['#100d15', '#4a3350', '#d4a24e'], true), [world.id, form.name, form.className]);
  const [portraitUrl, painting] = useForgeRender(
    world.id, mediaTier,
    [form.name, form.ancestry, form.className, form.background, mediaTier],
    () => ({ kind: 'paint', prompt: heroPortraitPrompt(world, form), cacheKey: heroPortraitKey(world.id), options: { kind: 'portrait', label: form.name, variant: 'bust' } })
  );

  return <main className="forge-page page-enter">
    <button className="text-button" onClick={onBack}>← World Forge</button>
    <header className="forge-header"><span className="eyebrow">Hero Forge</span><h1>Give the world someone to remember.</h1><p>{world.title} is waiting.</p></header>
    <section className="forge-card hero-forge">
      <div className="hero-portrait-row">
        <figure className={`hero-portrait${painting ? ' summoning' : ''}${portraitUrl ? ' painted' : ''}`}>
          <img src={portraitUrl || proc} alt={`${form.name}, ${form.ancestry} ${form.className}`} />
          <figcaption>{portraitUrl ? 'Painted likeness' : 'A likeness gathers…'}</figcaption>
        </figure>
        <div className="hero-sigil-block">
          <div className="hero-sigil"><span>{form.sigil}</span><input aria-label="Sigil" value={form.sigil} onChange={set('sigil')} maxLength={2}/></div>
          <p className="hero-portrait-name"><b>{form.name}</b><small>{form.ancestry} {form.className}</small></p>
        </div>
      </div>
      <div className="form-grid">
        <label>Name<input value={form.name} onChange={set('name')} /></label>
        <label>Ancestry<input value={form.ancestry} onChange={set('ancestry')} /></label>
        <label>Class<input value={form.className} onChange={set('className')} /></label>
        <label>Casting<select value={form.caster} onChange={set('caster')}><option value="none">None</option><option value="full">Full caster</option><option value="half">Half caster</option><option value="energy">Spell energy</option></select></label>
        <label>Hit die<select value={form.hitDie} onChange={set('hitDie')}><option>6</option><option>8</option><option>10</option><option>12</option></select></label>
      </div>
      <div className="ability-grid">{Object.entries(form.abilities).map(([ability, score]) => <label key={ability}>{ability}<input type="number" min="3" max="20" value={score} onChange={(e) => updateAbility(ability, e.target.value)}/><small>{Math.floor((score-10)/2) >= 0 ? '+' : ''}{Math.floor((score-10)/2)}</small></label>)}</div>
      <label>Background<textarea value={form.background} onChange={set('background')} rows="3" /></label>
      <p className="fine-print">Starting skills: Perception, Survival, Stealth. Standard-array values are fully yours and can be changed before play.</p>
      <button className="primary-button" onClick={() => onBegin(form)}>Begin the chronicle <ArrowRight/></button>
    </section>
  </main>;
}
