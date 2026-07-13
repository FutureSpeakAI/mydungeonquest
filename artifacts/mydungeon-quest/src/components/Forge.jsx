import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { SPINES } from '../lib/spines.js';

const seedWorlds = [
  'A drowned empire where memories are legal tender.',
  'A cozy mountain kingdom built atop a sleeping machine.',
  'A moonlit frontier where roads choose their travelers.'
];

export function WorldForge({ onBack, onContinue }) {
  const [form, setForm] = useState({ title: 'The Unwritten Road', covenant: seedWorlds[2], spineId: 'classic-epic', tone: 'Mythic, warm, and dangerous', linesText: '', veilsText: '', homeRegion: 'Larkspur Vale', styleBible: 'Romantic dark-fantasy oil painting with illuminated-manuscript gold, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.' });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  return <main className="forge-page page-enter">
    <button className="text-button" onClick={onBack}>← Chronicle shelf</button>
    <header className="forge-header"><span className="eyebrow">World Forge</span><h1>Tell the world what it dreams.</h1><p>Plain language becomes the covenant. The spine gives the story bones without deciding where you walk.</p></header>
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
      <div className="law-note"><ShieldCheck/><span>All narration and generated media remain PG-13. Lines and Veils stay local and are scrubbed from media prompts.</span></div>
      <button className="primary-button" onClick={() => onContinue({ ...form, lines: form.linesText.split(',').map((x) => x.trim()).filter(Boolean), veils: form.veilsText.split(',').map((x) => x.trim()).filter(Boolean) })}>Forge the hero <ArrowRight/></button>
    </section>
  </main>;
}

const ARRAYS = {
  STR: [15,14,13,12,10,8], DEX: [14,15,13,12,10,8], CON: [14,13,15,12,10,8],
  INT: [10,13,12,15,14,8], WIS: [12,13,14,10,15,8], CHA: [8,12,10,13,14,15]
};

export function HeroForge({ world, onBack, onBegin }) {
  const [form, setForm] = useState({ name: 'Aster Vale', sigil: '✦', ancestry: 'Human', className: 'Ranger', caster: 'half', hitDie: 10, abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 }, skills: ['Perception','Survival','Stealth'], background: 'A former road-warden who can hear when a path is lying.' });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const updateAbility = (ability, value) => setForm((f) => ({ ...f, abilities: { ...f.abilities, [ability]: Number(value) } }));
  return <main className="forge-page page-enter">
    <button className="text-button" onClick={onBack}>← World Forge</button>
    <header className="forge-header"><span className="eyebrow">Hero Forge</span><h1>Give the world someone to remember.</h1><p>{world.title} is waiting.</p></header>
    <section className="forge-card hero-forge">
      <div className="hero-sigil"><span>{form.sigil}</span><input aria-label="Sigil" value={form.sigil} onChange={set('sigil')} maxLength={2}/></div>
      <div className="form-grid">
        <label>Name<input value={form.name} onChange={set('name')} /></label>
        <label>Ancestry<input value={form.ancestry} onChange={set('ancestry')} /></label>
        <label>Class<input value={form.className} onChange={set('className')} /></label>
        <label>Casting<select value={form.caster} onChange={set('caster')}><option value="none">None</option><option value="full">Full caster</option><option value="half">Half caster</option><option value="energy">Spell energy</option></select></label>
        <label>Hit die<select value={form.hitDie} onChange={set('hitDie')}><option>6</option><option>8</option><option>10</option><option>12</option></select></label>
      </div>
      <div className="ability-grid">{Object.entries(form.abilities).map(([ability, score]) => <label key={ability}>{ability}<input type="number" min="3" max="20" value={score} onChange={(e) => updateAbility(ability, e.target.value)}/><small>{Math.floor((score-10)/2) >= 0 ? '+' : ''}{Math.floor((score-10)/2)}</small></label>)}</div>
      <label>Background<textarea value={form.background} onChange={set('background')} rows="3" /></label>
      <p className="fine-print">Starting skills: Perception, Survival, Stealth. Standard-array values are fully client-owned and can be changed before play.</p>
      <button className="primary-button" onClick={() => onBegin(form)}>Begin the chronicle <ArrowRight/></button>
    </section>
  </main>;
}
