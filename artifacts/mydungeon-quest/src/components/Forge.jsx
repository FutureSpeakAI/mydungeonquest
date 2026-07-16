import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Dices, ShieldCheck } from 'lucide-react';
import { SparkRow } from './Sparks.jsx';
import { sparks } from '../lib/onboarding.js';
import { SPINES } from 'fatescript/spines';
import { portraitPrompt, keyArtPrompt } from '../lib/cinema/prompts.js';
import { heroSoul, nameSeed } from '../lib/cinema/prologue.js';
import { auditionCandidates } from 'fatescript/cinema/casting';
import { rollWorld, rollHero, oracleWorld, oracleHero, rollTitle, rollCovenant, rollTone, rollRegion, rollName, rollMark, ORACLE_WORLD, ORACLE_HERO } from 'fatescript/forgeRolls';
import { openSitting, blessSitting, sittingRequired } from '../lib/sitting.js';

const seedWorlds = [
  'A drowned empire where memories are legal tender.',
  'A cozy mountain kingdom built atop a sleeping machine.',
  'A moonlit frontier where roads choose their travelers.'
];

// Ephemeral forge preview: paint straight from the model and hand back an
// object URL. Nothing is sealed here — the canonical, attested art is forged
// when the chronicle begins. This is pure ritual: the world taking shape while
// the player writes it.
async function paintPreview(body, signal) {
  const res = await fetch('/api/paint', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal
  });
  if (!res.ok) throw new Error('preview failed');
  return URL.createObjectURL(await res.blob());
}

const randomSeed = () => Math.floor(Math.random() * 1e9);

// THE DOORS — every forge offers three: the fast door (one tap, all dice),
// the Oracle (three questions), and the deep door (every field yours, each
// wearing a die). One shared form underneath, so nothing chosen is lost by
// walking through another door.
function DoorRow({ doors, door, onDoor }) {
  return <div className="door-row" role="tablist" aria-label="How to forge">
    {doors.map(([id, label, hint]) =>
      <button key={id} type="button" role="tab" aria-selected={door === id} className={`door-tab${door === id ? ' selected' : ''}`} onClick={() => onDoor(id)}>
        <b>{label}</b><span>{hint}</span>
      </button>)}
  </div>;
}

function DiceButton({ onRoll, label }) {
  return <button type="button" className="dice-button" onClick={onRoll} aria-label={label} title={label}><Dices/></button>;
}

// THE AUDITION — three voices step forward by the stated presentation; tap to
// hear, tap to bless. A blessed voice rides the hero forever (the casting
// session yields to it); unblessed, the session reads the finished card. On a
// keyless table the throat is a plain tone — the choice still seals.
function AuditionRow({ presentation, name, voiceId, onBless }) {
  const [busy, setBusy] = useState(null);
  const candidates = auditionCandidates(presentation, name);
  const play = async (candidate) => {
    setBusy(candidate.id);
    try {
      const line = `I am ${name || 'the hero'}. The road is long, and I mean to walk it.`;
      const res = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: line, voiceId: candidate.id }) });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      }
    } catch { /* the audition is ritual; the blessing still seals */ }
    finally { setBusy(null); }
  };
  return <div className="audition-row">
    <span className="eyebrow">The audition — how they sound</span>
    <div className="audition-choices">{candidates.map((candidate) =>
      <button key={candidate.id} type="button" className={`audition-chip${voiceId === candidate.id ? ' selected' : ''}`} disabled={Boolean(busy) && busy !== candidate.id}
        onClick={() => { onBless(candidate.id); play(candidate); }}>
        {busy === candidate.id ? '…' : '▶'} {candidate.label} — {candidate.line}
      </button>)}</div>
    <small className="fine-print">Tap to hear and bless a voice. {voiceId ? 'Blessed — this voice is theirs.' : 'Unblessed, the casting session reads the finished card.'}</small>
  </div>;
}

export function WorldForge({ onBack, onContinue, mediaTier = 'parchment' }) {
  const [form, setForm] = useState({ title: 'The Unwritten Road', covenant: seedWorlds[2], spineId: 'classic-epic', tone: 'Mythic, warm, and dangerous', linesText: '', veilsText: '', homeRegion: 'Larkspur Vale', styleBible: 'Romantic dark-fantasy oil painting with illuminated-manuscript gold, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.' });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const [door, setDoor] = useState('spin');
  // THE THREE SPARKS (Directive V) — dealt once per minute-seed, so a
  // returning player sees a fresh hand without the row shuffling mid-choice.
  const [sparkDeal] = useState(() => sparks((Date.now() / 60000) | 0));
  const [keyArt, setKeyArt] = useState(null);
  const urlRef = useRef(null);
  const spin = () => setForm((value) => ({ ...value, ...rollWorld(randomSeed()) }));
  const dice = (roll) => () => { const seed = randomSeed(); setForm((value) => ({ ...value, ...roll(seed) })); };
  const forgeOn = () => onContinue({ ...form, lines: form.linesText.split(',').map((x) => x.trim()).filter(Boolean), veils: form.veilsText.split(',').map((x) => x.trim()).filter(Boolean) });

  // As the covenant, tone and style settle, the world paints itself faintly
  // behind the page — the forge becomes a title sequence.
  useEffect(() => {
    if (mediaTier === 'parchment' || !form.covenant.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const prompt = keyArtPrompt({ ...form, covenant: form.covenant }, 'establishing');
        const url = await paintPreview({ prompt, kind: 'keyart', label: 'keyart', variant: 'establishing', seed: nameSeed(`${form.title}:${form.covenant}`), dimensions: '1280x720' }, controller.signal);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url; setKeyArt(url);
      } catch { /* preview is optional; the sealed art comes at genesis */ }
    }, 1100);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [form.covenant, form.tone, form.styleBible, form.title, form.homeRegion, mediaTier]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  return <main className="forge-page page-enter">
    {keyArt && <div className="forge-keyart" style={{ backgroundImage: `url("${keyArt}")` }} aria-hidden />}
    <button className="text-button" onClick={onBack}>← Chronicle shelf</button>
    <header className="forge-header"><span className="eyebrow">World Forge</span><h1>Speak the world into being.</h1><p>A sentence is enough — or a single tap. The spine gives the story its bones without deciding where you walk.</p></header>
    <section className="forge-card">
      <DoorRow door={door} onDoor={setDoor} doors={[
        ['spin', 'Spin the World', 'One tap. The dice write it; keep spinning until it sings.'],
        ['oracle', 'The Oracle', 'Answer three questions; the world takes shape around them.'],
        ['deep', 'Deep Forge', 'Every field yours — with a die beside each.']
      ]}/>

      {door === 'spin' && <>
        <SparkRow sparks={sparkDeal} onPick={(spark) => setForm((f) => ({ ...f, title: spark.title, covenant: spark.covenant, tone: spark.tone, homeRegion: spark.region }))}/>
        <article className="spin-card">
          <h3>{form.title}</h3>
          <p>{form.covenant}</p>
          <div className="spin-meta"><span>{SPINES.find((s) => s.id === form.spineId)?.label}</span><span>{form.tone}</span><span>Home — {form.homeRegion}</span></div>
        </article>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={spin}><Dices/> Spin again</button>
          <button className="primary-button" onClick={forgeOn}>Forge the hero <ArrowRight/></button>
        </div>
        <p className="fine-print">Nothing is final ink — the Deep Forge door holds every field if you want your hands on them.</p>
      </>}

      {door === 'oracle' && <>
        <div className="form-grid oracle-grid">
          <label>What kind of place is it?<select value={undefined} defaultValue="" onChange={(e) => setForm((v) => ({ ...v, ...oracleWorld({ place: e.target.value, wound: v.__wound, hope: v.__hope }), __place: e.target.value }))}>
            <option value="" disabled>choose…</option>{ORACLE_WORLD.places.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>What is wrong with it?<select defaultValue="" onChange={(e) => setForm((v) => ({ ...v, ...oracleWorld({ place: v.__place, wound: e.target.value, hope: v.__hope }), __wound: e.target.value }))}>
            <option value="" disabled>choose…</option>{ORACLE_WORLD.wounds.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>What hope remains?<select defaultValue="" onChange={(e) => setForm((v) => ({ ...v, ...oracleWorld({ place: v.__place, wound: v.__wound, hope: e.target.value }), __hope: e.target.value }))}>
            <option value="" disabled>choose…</option>{ORACLE_WORLD.hopes.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        </div>
        <article className="spin-card"><h3>{form.title}</h3><p>{form.covenant}</p></article>
        <button className="primary-button" onClick={forgeOn}>Forge the hero <ArrowRight/></button>
      </>}

      {door === 'deep' && <>
        <label><span className="label-line">Chronicle title <DiceButton label="Roll a title" onRoll={dice((s) => ({ title: rollTitle(s) }))}/></span><input value={form.title} onChange={set('title')} maxLength={80}/></label>
        <label><span className="label-line">Your world <DiceButton label="Roll a covenant" onRoll={dice((s) => ({ covenant: rollCovenant(s) }))}/></span><textarea value={form.covenant} onChange={set('covenant')} rows="5" maxLength={2000}/></label>
        <div className="seed-row">{seedWorlds.map((seed) => <button key={seed} onClick={() => setForm((v) => ({ ...v, covenant: seed }))}>{seed}</button>)}</div>
        <div className="form-grid">
          <label>Story spine<select value={form.spineId} onChange={set('spineId')}>{SPINES.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.beats.length} beats</option>)}</select></label>
          <label><span className="label-line">Tone <DiceButton label="Roll a tone" onRoll={dice((s) => ({ tone: rollTone(s) }))}/></span><input value={form.tone} onChange={set('tone')} /></label>
          <label><span className="label-line">Home region <DiceButton label="Roll a region" onRoll={dice((s) => ({ homeRegion: rollRegion(s) }))}/></span><input value={form.homeRegion} onChange={set('homeRegion')} /></label>
          <label>Lines — never appear<input value={form.linesText} onChange={set('linesText')} placeholder="comma separated" /></label>
          <label>Veils — fade to black<input value={form.veilsText} onChange={set('veilsText')} placeholder="comma separated" /></label>
        </div>
        <label>The world's look<textarea value={form.styleBible} onChange={set('styleBible')} rows="3" maxLength={300}/></label>
        <div className="law-note"><ShieldCheck/><span>Every scene and painting stays PG-13. Your lines and veils never leave this device.</span></div>
        <button className="primary-button" onClick={forgeOn}>Forge the hero <ArrowRight/></button>
      </>}
    </section>
  </main>;
}

export function HeroForge({ world, onBack, onBegin, mediaTier = 'parchment' }) {
  const [form, setForm] = useState({ name: 'Aster Vale', sigil: '✦', ancestry: 'Human', className: 'Ranger', caster: 'half', hitDie: 10, abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 }, skills: ['Perception','Survival','Stealth'], bearing: 'Weather-worn leathers, a road-warden\u2019s longbow, and eyes that never stop reading the treeline.', background: 'A former road-warden who can hear when a path is lying.', presentation: 'neutral', pronouns: '', mark: '', voiceId: null });
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const setPresentation = (event) => setForm((value) => ({ ...value, presentation: event.target.value, voiceId: null })); // a new register opens a new audition
  const updateAbility = (ability, value) => setForm((f) => ({ ...f, abilities: { ...f.abilities, [ability]: Number(value) } }));
  const [door, setDoor] = useState('bones');
  const [portrait, setPortrait] = useState(null); // null | 'pending' | objectURL
  const urlRef = useRef(null);
  const castBones = () => setForm((value) => ({ ...value, ...rollHero(randomSeed()), voiceId: null }));
  const dice = (roll) => () => { const seed = randomSeed(); setForm((value) => ({ ...value, ...roll(seed) })); };
  const bless = (voiceId) => setForm((value) => ({ ...value, voiceId }));

  // THE SITTING — a face is accepted, not assigned (illuminated tier
  // only; parchment paints procedurally and owes no sitting). Three
  // chairs open from the hero's own bearing; editing the identity seats
  // a new sitting; the blessing is final and travels with the forge.
  const [sitting, setSitting] = useState(null);
  useEffect(() => {
    if (!sittingRequired(mediaTier) || !form.name.trim()) { setSitting(null); return; }
    setSitting(openSitting(form));
  }, [form.name, form.bearing, form.mark, form.background, mediaTier]);
  const blessChair = (candidateId) => setSitting((current) => {
    const out = blessSitting(current, candidateId);
    return out.ok ? out.sitting : current;
  });

  // The hero's face materialises live beside the sheet: shimmer, then the
  // generated bust. Uses the same prompt + seed as the sealed anchor so the
  // ritual and the canon match.
  useEffect(() => {
    if (mediaTier === 'parchment' || !form.name.trim()) { setPortrait(null); return; }
    const controller = new AbortController();
    setPortrait('pending');
    const timer = setTimeout(async () => {
      try {
        const prompt = portraitPrompt(world, heroSoul(form), 'bust');
        const url = await paintPreview({ prompt, kind: 'portrait', label: form.name, variant: 'bust', seed: nameSeed(form.name) }, controller.signal);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url; setPortrait(url);
      } catch { setPortrait(null); }
    }, 800);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [form.name, form.bearing, form.background, mediaTier, world]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const hasFace = portrait && portrait !== 'pending';
  const heardAs = { feminine: 'Heard feminine', masculine: 'Heard masculine', neutral: 'Heard as they choose' }[form.presentation];
  return <main className="forge-page page-enter">
    <button className="text-button" onClick={onBack}>← World Forge</button>
    <header className="forge-header"><span className="eyebrow">Hero Forge</span><h1>Give the world someone to remember.</h1><p>{world.title} is waiting.</p></header>
    <section className="forge-card hero-forge">
      <div className="hero-identity">
        <figure className={`hero-portrait ${portrait === 'pending' ? 'summoning' : ''}`}>
          {hasFace ? <img src={portrait} alt={form.name}/> : <span className="portrait-mark">{form.sigil}</span>}
          <figcaption>{hasFace ? form.name : portrait === 'pending' ? 'The face is arriving…' : 'A face waiting to be painted'}</figcaption>
        </figure>
        <div className="hero-sigil"><span>{form.sigil}</span><input aria-label="Sigil" value={form.sigil} onChange={set('sigil')} maxLength={2}/></div>
      </div>

      <DoorRow door={door} onDoor={setDoor} doors={[
        ['bones', 'Cast the Bones', 'A whole soul from one throw. Cast until they feel true.'],
        ['oracle', 'The Oracle', 'Three questions shape the sheet.'],
        ['hand', 'Forge by Hand', 'Every stat and sentence yours — with dice on call.']
      ]}/>

      {door === 'bones' && <>
        <article className="spin-card">
          <h3>{form.name}</h3>
          <p className="spin-meta"><span>{form.ancestry} {form.className}</span><span>{heardAs}</span></p>
          <p>{form.bearing}</p>
          <p className="fine-print">{form.mark ? `Marked by ${form.mark}. ` : ''}{form.background}</p>
        </article>
        <button type="button" className="secondary-button" onClick={castBones}><Dices/> Cast again</button>
      </>}

      {door === 'oracle' && <>
        <div className="form-grid oracle-grid">
          <label>Which way do you walk?<select defaultValue="" onChange={(e) => setForm((v) => ({ ...v, ...oracleHero({ path: e.target.value, virtue: v.__virtue, keepsake: v.__keepsake }), __path: e.target.value, voiceId: v.voiceId }))}>
            <option value="" disabled>choose…</option>{ORACLE_HERO.paths.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>What carries you?<select defaultValue="" onChange={(e) => setForm((v) => ({ ...v, ...oracleHero({ path: v.__path, virtue: e.target.value, keepsake: v.__keepsake }), __virtue: e.target.value, voiceId: v.voiceId }))}>
            <option value="" disabled>choose…</option>{ORACLE_HERO.virtues.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>What do you keep?<select defaultValue="" onChange={(e) => setForm((v) => ({ ...v, ...oracleHero({ path: v.__path, virtue: v.__virtue, keepsake: e.target.value }), __keepsake: e.target.value, voiceId: v.voiceId }))}>
            <option value="" disabled>choose…</option>{ORACLE_HERO.keepsakes.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        </div>
        <div className="form-grid">
          <label>Name<input value={form.name} onChange={set('name')} /></label>
          <label>Presentation — how they are heard<select value={form.presentation} onChange={setPresentation}><option value="feminine">Feminine</option><option value="masculine">Masculine</option><option value="neutral">Neutral / unsaid</option></select></label>
        </div>
        <article className="spin-card"><p>{form.bearing}</p><p className="fine-print">{form.background}</p></article>
      </>}

      {door === 'hand' && <>
        <div className="form-grid">
          <label><span className="label-line">Name <DiceButton label="Roll a name" onRoll={dice((s) => ({ name: rollName(s) }))}/></span><input value={form.name} onChange={set('name')} /></label>
          <label>Ancestry<input value={form.ancestry} onChange={set('ancestry')} /></label>
          <label>Class<input value={form.className} onChange={set('className')} /></label>
          <label>Casting<select value={form.caster} onChange={set('caster')}><option value="none">None</option><option value="full">Full caster</option><option value="half">Half caster</option><option value="energy">Spell energy</option></select></label>
          <label>Hit die<select value={form.hitDie} onChange={set('hitDie')}><option>6</option><option>8</option><option>10</option><option>12</option></select></label>
        </div>
        <div className="ability-grid">{Object.entries(form.abilities).map(([ability, score]) => <label key={ability}>{ability}<input type="number" min="3" max="20" value={score} onChange={(e) => updateAbility(ability, e.target.value)}/><small>{Math.floor((score-10)/2) >= 0 ? '+' : ''}{Math.floor((score-10)/2)}</small></label>)}</div>
        <div className="form-grid">
          <label>Presentation — how they are heard<select value={form.presentation} onChange={setPresentation}><option value="feminine">Feminine</option><option value="masculine">Masculine</option><option value="neutral">Neutral / unsaid</option></select></label>
          <label>Pronouns (optional)<input value={form.pronouns} onChange={set('pronouns')} maxLength={30} placeholder="she/her, he/him, they/them…"/></label>
          <label><span className="label-line">Distinguishing mark <DiceButton label="Roll a mark" onRoll={dice((s) => ({ mark: rollMark(s) }))}/></span><input value={form.mark} onChange={set('mark')} maxLength={80} placeholder="A scar, a brand, a streak of white…"/></label>
        </div>
        <label><span className="label-line">Bearing — how the world sees them</span><input value={form.bearing} onChange={set('bearing')} maxLength={200} placeholder="Their look, their gear, the way they carry themselves"/></label>
        <label>Background<textarea value={form.background} onChange={set('background')} rows="3" /></label>
        <p className="fine-print">Starting skills: {Array.isArray(form.skills) ? form.skills.join(', ') : 'Perception, Survival, Stealth'}. Every value is yours to change before play.</p>
      </>}

      {sitting && <div className="sitting-panel">
        <h3>The Sitting — a face is accepted, not assigned</h3>
        <p className="fine-print">Three chairs, one identity — only the light differs. Bless one; the blessing is final, and every later painting answers to the face you accept. No sheet is minted before the blessing.</p>
        <div className="audition-choices">{sitting.candidates.map((candidate) =>
          <button key={candidate.id} type="button" className={`door-tab${sitting.blessed?.id === candidate.id ? ' selected' : ''}`} aria-pressed={sitting.blessed?.id === candidate.id} disabled={sitting.status === 'blessed' && sitting.blessed?.id !== candidate.id} onClick={() => blessChair(candidate.id)}>
            {candidate.id}
          </button>)}</div>
      </div>}
      <AuditionRow presentation={form.presentation} name={form.name} voiceId={form.voiceId} onBless={bless}/>
      <button className="primary-button" onClick={() => onBegin(sitting ? { ...form, sitting } : form)}>Begin the chronicle <ArrowRight/></button>
    </section>
  </main>;
}
