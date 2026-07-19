import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Dices, ShieldCheck } from 'lucide-react';
import { SparkRow } from './Sparks.jsx';
import { sparks } from '../lib/onboarding.js';
import { isProving } from '../lib/proving.js';
import { SPINES } from 'fatescript/spines';
import { portraitPrompt, keyArtPrompt } from '../lib/cinema/prompts.js';
import { nameSeed } from '../lib/cinema/prologue.js';
import { oracleWorld, oracleHero, ORACLE_WORLD, ORACLE_HERO, CLASSES, BEARINGS, BACKGROUNDS, rollAbilities } from 'fatescript/forgeRolls';
import { FIELD_MAP, XCARD_COPY, fieldEntry, spineFromPromise, spineLabel, titleFromPromise, WORLD_KEYS, HERO_KEYS, CALLING_RIDERS } from 'fatescript/smith';
import { smithSpin } from '../lib/smithClient.js';
import { openSitting, blessSitting, sittingRequired } from '../lib/sitting.js';
import { ATELIER_FIELDS, dealAppearance, rollAppearance, heroCanonSoul } from '../lib/atelier.js';
import { dealAuditions } from '../lib/audition.js';

// THE FORGE REMEMBERS (G4) — a sitting's draft survives a reload. Drafts live
// in sessionStorage (per tab; never synced, never sealed, never exported) and
// burn the moment the chronicle begins. A torn or walled-off storage never
// blocks the forge — the defaults simply stand.
const WORLD_DRAFT_KEY = 'mdq:forge:world';
const HERO_DRAFT_KEY = 'mdq:forge:hero';
const XCARD_SEEN_KEY = 'mdq:xcard:seen';
export const clearForgeDrafts = () => {
  try { sessionStorage.removeItem(WORLD_DRAFT_KEY); sessionStorage.removeItem(HERO_DRAFT_KEY); } catch { /* storage walled off */ }
};
const loadDraft = (key) => { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { return null; } };
const saveDraft = (key, value) => { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

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
const ask = (scope, key) => fieldEntry(scope, key).ask;

// ------------------------------------------------------------
// THE TWO HANDS (Directive XIII, Law II) — every asked field owns a die
// and a pen. The pen's ink is SOVEREIGN: `__sovereign` in the draft names
// the keys the player wrote, and no spin may cross them. One consent
// exists: a sovereign field's OWN die (`force`) lifts its own ink and
// redraws that field alone. Applying any candidate returns written keys
// to the dice's custody (they redraw freely on the next spin).
// ------------------------------------------------------------
const sovereignOf = (form) => new Set(Array.isArray(form.__sovereign) ? form.__sovereign : []);
const markSovereign = (v, key) => [...new Set([...(Array.isArray(v.__sovereign) ? v.__sovereign : []), key])];
function applyCandidate(v, candidate, force = []) {
  const sov = sovereignOf(v);
  const next = { ...v };
  for (const [key, value] of Object.entries(candidate)) {
    if (sov.has(key) && !force.includes(key)) continue; // ink stands
    next[key] = value;
    sov.delete(key);
  }
  return { ...next, __sovereign: [...sov] };
}
// The standing remainder for a single-field respin: every other smith key's
// current value. For the calling, its unsovereign riders ride OUT of the
// lock — the calling is one body and moves with them (§5, the rider clause).
function remainderLock(form, keys, field) {
  const sov = sovereignOf(form);
  const riders = field === 'className' ? CALLING_RIDERS.filter((r) => !sov.has(r)) : [];
  const lock = {};
  for (const key of keys) {
    if (key === field || riders.includes(key)) continue;
    if (form[key] !== undefined) lock[key] = form[key];
  }
  return lock;
}
const sovereignLock = (form, keys) => {
  const sov = sovereignOf(form);
  return Object.fromEntries(keys.filter((k) => sov.has(k) && form[k] !== undefined).map((k) => [k, form[k]]));
};

// THE DOORS — every forge offers three: the fast door (plain questions, all
// dice), the Oracle (three questions), and the deep door (every field yours,
// each wearing a die). One shared form underneath, so nothing chosen is lost
// by walking through another door.
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

// THE X-CARD (Directive XIII §2) — safety presented as a CARD the game
// deals, never a form the player must fill. Dealt once per device; lines
// and veils keep their surfaces behind the deep door.
function XCard() {
  return <article className="xcard-card" role="note">
    <ShieldCheck aria-hidden/>
    <p>{XCARD_COPY}</p>
  </article>;
}

// THE AUDITION (XVII, Article VIII) — TEN voices step forward under the
// unchanged Tenor law: the stated register leads the deal exactly as the
// old three did (an earlier blessing keeps its chip), and the far register
// fills the back of the row. Tap to hear, tap to bless. A blessed voice
// rides the hero forever (the casting session yields to it); unblessed,
// the session reads the finished card. On a keyless table the throat is a
// plain tone — the choice still seals. The die beside the row is the
// voice's own die: a candidate steps forward blessed.
function AuditionRow({ presentation, name, voiceId, onBless }) {
  const [busy, setBusy] = useState(null);
  const candidates = dealAuditions(presentation, name);
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
    <span className="eyebrow label-line">{ask('hero', 'voice')} <DiceButton label="Spin a voice" onRoll={() => { const c = candidates[Math.floor(Math.random() * candidates.length)]; onBless(c.id); play(c); }}/></span>
    <div className="audition-choices">{candidates.map((candidate) =>
      <button key={candidate.id} type="button" className={`audition-chip${voiceId === candidate.id ? ' selected' : ''}`} disabled={Boolean(busy) && busy !== candidate.id}
        onClick={() => { onBless(candidate.id); play(candidate); }}>
        {busy === candidate.id ? '…' : '▶'} {candidate.label} — {candidate.line}
      </button>)}</div>
    <small className="fine-print">Ten voices wait. Tap to hear and bless one. {voiceId ? 'Blessed — this voice is theirs, for good.' : 'Unblessed, the casting session reads the finished card.'}</small>
  </div>;
}

export function WorldForge({ onBack, onContinue, mediaTier = 'parchment' }) {
  const [form, setForm] = useState(() => {
    const fallback = { title: 'The Unwritten Road', covenant: 'A moonlit frontier where roads choose their travelers.', spineId: 'classic-epic', tone: 'Mythic, warm, and dangerous', linesText: '', veilsText: '', homeRegion: 'Larkspur Vale', styleBible: 'Romantic dark-fantasy oil painting with gold-leaf light, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.', __sovereign: [] };
    const saved = loadDraft(WORLD_DRAFT_KEY);
    return saved && typeof saved.title === 'string' ? { ...fallback, ...saved } : fallback;
  });
  useEffect(() => { saveDraft(WORLD_DRAFT_KEY, form); }, [form]);
  const pen = (key) => (event) => setForm((v) => ({ ...v, [key]: event.target.value, __sovereign: markSovereign(v, key) }));
  const [door, setDoor] = useState('spin');
  // THE THREE SPARKS (Directive V) — dealt once per minute-seed, so a
  // returning player sees a fresh hand without the row shuffling mid-choice.
  // Under the proving rig (?proving=1, Task 52) the deal is the fixed seed 42.
  const [sparkDeal] = useState(() => sparks(isProving() ? 42 : (Date.now() / 60000) | 0));
  // The X-card is dealt as a card, once per device; a walled storage means
  // it was dealt elsewhere — never block the door over a flag.
  const [xcardDealt] = useState(() => { try { return localStorage.getItem(XCARD_SEEN_KEY) === '1'; } catch { return true; } });
  const [keyArt, setKeyArt] = useState(null);
  const urlRef = useRef(null);
  const spinBusy = useRef(false);

  // THE SHAPE OF THE PROMISE (Law I) — the fast path never asks the spine;
  // it reads the promise. The deep door's picker, once touched, outranks it.
  const sov = sovereignOf(form);
  const effSpine = sov.has('spineId') ? form.spineId : spineFromPromise(form.covenant);
  const effTitle = sov.has('covenant') && !sov.has('title') ? titleFromPromise(form.covenant) : form.title;

  // The whole-world die: locks exactly the sovereign ink, redraws the rest.
  const spin = async () => {
    if (spinBusy.current) return;
    spinBusy.current = true;
    try {
      const locked = sovereignLock(form, WORLD_KEYS);
      const result = await smithSpin({ scope: 'world', locked, seed: randomSeed(), tier: mediaTier });
      setForm((v) => applyCandidate(v, result.candidates[0]));
    } finally { spinBusy.current = false; }
  };
  // A field's own die: locks the ENTIRE standing remainder, redraws the
  // field alone — the one consent that lifts the field's own ink.
  const fieldDie = (key) => async () => {
    const locked = remainderLock(form, WORLD_KEYS, key);
    const result = await smithSpin({ scope: 'field', field: key, locked, seed: randomSeed(), tier: mediaTier });
    setForm((v) => applyCandidate(v, result.candidates[0], [key]));
  };
  // The Oracle composes; its words are the game's hand, not the pen's.
  const oracleWrite = (patch) => setForm((v) => {
    const composed = oracleWorld({ place: patch.__place ?? v.__place, wound: patch.__wound ?? v.__wound, hope: patch.__hope ?? v.__hope });
    return { ...applyCandidate(v, composed), ...patch };
  });

  const forgeOn = () => {
    try { localStorage.setItem(XCARD_SEEN_KEY, '1'); } catch { /* dealt elsewhere */ }
    const out = {};
    for (const [key, value] of Object.entries(form)) if (!key.startsWith('__')) out[key] = value;
    onContinue({ ...out, title: effTitle, spineId: effSpine, lines: form.linesText.split(',').map((x) => x.trim()).filter(Boolean), veils: form.veilsText.split(',').map((x) => x.trim()).filter(Boolean) });
  };

  // As the covenant, tone and style settle, the world paints itself faintly
  // behind the page — the forge becomes a title sequence.
  useEffect(() => {
    if (mediaTier === 'parchment' || !form.covenant.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const prompt = keyArtPrompt({ ...form, title: effTitle }, 'establishing');
        const url = await paintPreview({ prompt, kind: 'keyart', label: 'keyart', variant: 'establishing', seed: nameSeed(`${effTitle}:${form.covenant}`), dimensions: '1280x720' }, controller.signal);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url; setKeyArt(url);
      } catch { /* preview is optional; the sealed art comes at genesis */ }
    }, 1100);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [form.covenant, form.tone, form.styleBible, form.title, form.homeRegion, mediaTier]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const worldCard = <article className="spin-card">
    <h3>{effTitle}</h3>
    <p>{form.covenant}</p>
    <div className="spin-meta"><span>{spineLabel(effSpine)}</span><span>{form.tone}</span><span>Home — {form.homeRegion}</span></div>
  </article>;

  return <main className="forge-page page-enter">
    {keyArt && <div className="forge-keyart" style={{ backgroundImage: `url("${keyArt}")` }} aria-hidden />}
    <button className="text-button" onClick={onBack}>← Chronicle shelf</button>
    <header className="forge-header"><span className="eyebrow">World Forge</span><h1>Speak the world into being.</h1><p>A sentence is enough — or a single tap. Every question tells you where its answer lands.</p></header>
    <section className="forge-card">
      <DoorRow door={door} onDoor={setDoor} doors={[
        ['spin', 'Spin the World', 'One tap. The dice write it; keep spinning until it sings.'],
        ['oracle', 'The Oracle', 'Answer three questions; the world takes shape around them.'],
        ['deep', 'Deep Forge', 'Every field yours — with a die beside each.']
      ]}/>

      {door === 'spin' && <>
        <SparkRow sparks={sparkDeal} onPick={(spark) => setForm((v) => applyCandidate({ ...v, __sovereign: (v.__sovereign || []).filter((k) => !['title', 'covenant', 'tone', 'homeRegion'].includes(k)) }, { title: spark.title, covenant: spark.covenant, tone: spark.tone, homeRegion: spark.region }))}/>
        <label className="ask-row"><span className="label-line">{ask('world', 'covenant')} <DiceButton label="Spin a promise" onRoll={fieldDie('covenant')}/></span>
          <textarea value={form.covenant} onChange={pen('covenant')} rows="3" maxLength={2000}/>
          <small className="fine-print">{fieldEntry('world', 'covenant').hint}</small>
        </label>
        <label className="ask-row"><span className="label-line">{ask('world', 'tone')} <DiceButton label="Spin the feel" onRoll={fieldDie('tone')}/></span>
          <input value={form.tone} onChange={pen('tone')} maxLength={120}/>
        </label>
        <p className="shape-line">{ask('world', 'shape')} — <b>{spineLabel(effSpine)}</b><small>{fieldEntry('world', 'shape').hint}</small></p>
        {worldCard}
        {!xcardDealt && <XCard/>}
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={spin}><Dices/> Spin again</button>
          <button className="primary-button" onClick={forgeOn}>Forge the hero <ArrowRight/></button>
        </div>
        <p className="fine-print">Nothing is final ink — the Deep Forge door holds every field if you want your hands on them.</p>
      </>}

      {door === 'oracle' && <>
        <div className="form-grid oracle-grid">
          <label>What kind of place is it?<select defaultValue="" onChange={(e) => oracleWrite({ __place: e.target.value })}>
            <option value="" disabled>choose…</option>{ORACLE_WORLD.places.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>What is wrong with it?<select defaultValue="" onChange={(e) => oracleWrite({ __wound: e.target.value })}>
            <option value="" disabled>choose…</option>{ORACLE_WORLD.wounds.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>What hope remains?<select defaultValue="" onChange={(e) => oracleWrite({ __hope: e.target.value })}>
            <option value="" disabled>choose…</option>{ORACLE_WORLD.hopes.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        </div>
        <article className="spin-card"><h3>{effTitle}</h3><p>{form.covenant}</p></article>
        <button className="primary-button" onClick={forgeOn}>Forge the hero <ArrowRight/></button>
      </>}

      {door === 'deep' && <>
        <label><span className="label-line">{ask('world', 'title')} <DiceButton label="Roll a title" onRoll={fieldDie('title')}/></span><input value={sov.has('title') || !sov.has('covenant') ? form.title : effTitle} onChange={pen('title')} maxLength={80}/></label>
        <label><span className="label-line">{ask('world', 'covenant')} <DiceButton label="Roll a covenant" onRoll={fieldDie('covenant')}/></span><textarea value={form.covenant} onChange={pen('covenant')} rows="5" maxLength={2000}/></label>
        <div className="form-grid">
          <label>{ask('world', 'spineId')}<select value={effSpine} onChange={pen('spineId')}>{SPINES.map((s) => <option key={s.id} value={s.id}>{s.label} · {s.beats.length} beats</option>)}</select></label>
          <label><span className="label-line">{ask('world', 'tone')} <DiceButton label="Roll a tone" onRoll={fieldDie('tone')}/></span><input value={form.tone} onChange={pen('tone')} /></label>
          <label><span className="label-line">{ask('world', 'homeRegion')} <DiceButton label="Roll a region" onRoll={fieldDie('homeRegion')}/></span><input value={form.homeRegion} onChange={pen('homeRegion')} /></label>
          <label>{ask('world', 'linesText')}<input value={form.linesText} onChange={pen('linesText')} placeholder="comma separated" /></label>
          <label>{ask('world', 'veilsText')}<input value={form.veilsText} onChange={pen('veilsText')} placeholder="comma separated" /></label>
        </div>
        <label><span className="label-line">{ask('world', 'styleBible')} <DiceButton label="Roll a look" onRoll={fieldDie('styleBible')}/></span><textarea value={form.styleBible} onChange={pen('styleBible')} rows="3" maxLength={300}/></label>
        <div className="law-note"><ShieldCheck/><span>Every scene and painting stays PG-13. Your lines and veils never leave this device.</span></div>
        <button className="primary-button" onClick={forgeOn}>Forge the hero <ArrowRight/></button>
      </>}
    </section>
  </main>;
}

export function HeroForge({ world, onBack, onBegin, mediaTier = 'parchment' }) {
  const [form, setForm] = useState(() => {
    const fallback = { name: 'Aster Vale', sigil: '✦', ancestry: 'Human', className: 'Ranger', caster: 'half', hitDie: 10, abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 }, skills: ['Perception','Survival','Stealth'], bearing: 'Weather-worn leathers, a road-warden\u2019s longbow, and eyes that never stop reading the treeline.', background: 'A former road-warden who can hear when a path is lying.', presentation: 'neutral', pronouns: '', mark: '', keepsake: 'a river-stone that is always warm', voiceId: null, hair: 'chestnut hair bound in a travel knot', eyes: 'storm-grey eyes', skin: 'olive skin weathered by road-sun', build: 'wiry and quick', attire: 'weather-worn ranger leathers', accessory: 'a river-stone pendant on a cord', __sovereign: [] };
    const saved = loadDraft(HERO_DRAFT_KEY);
    // The blessing travels with the forge: a reload rehydrates the whole
    // sheet, voiceId included, so the blessed chip still wears its mark.
    return saved && typeof saved.name === 'string' ? { ...fallback, ...saved, abilities: { ...fallback.abilities, ...(saved.abilities || {}) } } : fallback;
  });
  useEffect(() => { saveDraft(HERO_DRAFT_KEY, form); }, [form]);
  const pen = (key) => (event) => setForm((v) => ({ ...v, [key]: event.target.value, __sovereign: markSovereign(v, key) }));
  const setPresentation = (event) => setForm((v) => ({ ...v, presentation: event.target.value, voiceId: null, __sovereign: markSovereign(v, 'presentation') })); // a new register opens a new audition
  // The calling is one body: choosing it seats the whole sheet — bearing,
  // background, abilities, skills — except where the player's ink stands.
  const setCalling = (event) => setForm((v) => {
    const cls = CLASSES.find((c) => c.className === event.target.value) || CLASSES[0];
    const riders = { caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills, abilities: rollAbilities(cls.className, randomSeed()), bearing: BEARINGS[cls.className], background: BACKGROUNDS[cls.className] };
    return { ...applyCandidate(v, riders), className: cls.className, __sovereign: markSovereign({ ...v, __sovereign: (v.__sovereign || []).filter((k) => k !== 'className') }, 'className') };
  });
  const updateAbility = (ability, value) => setForm((f) => ({ ...f, abilities: { ...f.abilities, [ability]: Number(value) }, __sovereign: markSovereign(f, 'abilities') }));
  const [door, setDoor] = useState('bones');
  const [portrait, setPortrait] = useState(null); // null | 'pending' | objectURL
  const urlRef = useRef(null);
  const paintCtl = useRef(null);
  const castBusy = useRef(false);
  const sov = sovereignOf(form);

  // The whole-hero die: one throw, a whole coherent soul — sovereign ink
  // stands, and a locked calling conditions the entire sheet around it.
  // The atelier's six strokes ride the same throw: the smith deals the
  // soul, the house tables deal the look, and sovereignty guards both.
  const castBones = async () => {
    if (castBusy.current) return;
    castBusy.current = true;
    try {
      const locked = sovereignLock(form, HERO_KEYS);
      const result = await smithSpin({ scope: 'hero', locked, seed: randomSeed(), tier: mediaTier });
      setForm((v) => ({ ...applyCandidate(applyCandidate(v, result.candidates[0]), dealAppearance(randomSeed())), voiceId: null }));
    } finally { castBusy.current = false; }
  };
  const fieldDie = (key) => async () => {
    const locked = remainderLock(form, HERO_KEYS, key);
    const result = await smithSpin({ scope: 'field', field: key, locked, seed: randomSeed(), tier: mediaTier });
    setForm((v) => applyCandidate(v, result.candidates[0], [key]));
  };
  // THE ATELIER DICE (XVII, Article VIII) — the six strokes are house
  // fields, not smith fields: their dice read the house tables and never
  // ride the wire. Each die is the field's own consent (force lifts its
  // own ink alone); the whole-look die respects sovereign ink entirely.
  const atelierDie = (key) => () => setForm((v) => applyCandidate(v, { [key]: rollAppearance(key, randomSeed()) }, [key]));
  const spinLook = () => setForm((v) => applyCandidate(v, dealAppearance(randomSeed())));
  const bless = (voiceId) => setForm((value) => ({ ...value, voiceId }));
  const oracleWrite = (patch) => setForm((v) => {
    const composed = oracleHero({ path: patch.__path ?? v.__path, virtue: patch.__virtue ?? v.__virtue, keepsake: patch.__keepsake ?? v.__keepsake });
    return { ...applyCandidate(v, composed), ...patch };
  });

  // THE SITTING — a face is accepted, not assigned (illuminated tier
  // only; parchment paints procedurally and owes no sitting). Three
  // chairs open from the hero's own bearing; editing the identity seats
  // a new sitting; the blessing is final and travels with the forge.
  const [sitting, setSitting] = useState(null);
  useEffect(() => {
    if (!sittingRequired(mediaTier) || !form.name.trim()) { setSitting(null); return; }
    setSitting(openSitting(form));
  }, [form.name, form.bearing, form.mark, form.background, form.hair, form.eyes, form.skin, form.build, form.attire, form.accessory, mediaTier]);
  const blessChair = (candidateId) => setSitting((current) => {
    const out = blessSitting(current, candidateId);
    return out.ok ? out.sitting : current;
  });

  // THE TAP REPAINT (XVII, Article VIII) — the portrait repaints on TAP,
  // never on keystroke: the player finishes their strokes, then asks the
  // easel. Same prompt seat and same seed as the sealed anchor
  // (heroCanonSoul + nameSeed), so the ritual and the canon match; the
  // atelier's composed visual rides the prompt. Parchment paints nothing
  // here — the sigil stands for the face until genesis paints procedurally.
  const paintFace = () => {
    if (mediaTier === 'parchment' || !form.name.trim() || portrait === 'pending') return;
    paintCtl.current?.abort();
    const controller = new AbortController();
    paintCtl.current = controller;
    setPortrait('pending');
    (async () => {
      try {
        const prompt = portraitPrompt(world, heroCanonSoul(form), 'bust');
        const url = await paintPreview({ prompt, kind: 'portrait', label: form.name, variant: 'bust', seed: nameSeed(form.name) }, controller.signal);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url; setPortrait(url);
      } catch { if (!controller.signal.aborted) setPortrait(null); /* the easel spoke plainly; the sealed art still comes at genesis */ }
    })();
  };

  useEffect(() => () => { paintCtl.current?.abort(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const hasFace = portrait && portrait !== 'pending';
  const heardAs = { feminine: 'Heard feminine', masculine: 'Heard masculine', neutral: 'Heard as they choose' }[form.presentation];
  const presentationField = (
    <label><span className="label-line">{ask('hero', 'presentation')} <DiceButton label="Spin how they present" onRoll={fieldDie('presentation')}/></span><select value={form.presentation} onChange={setPresentation}><option value="feminine">Feminine</option><option value="masculine">Masculine</option><option value="neutral">Neutral / unsaid</option></select></label>
  );
  return <main className="forge-page page-enter">
    <button className="text-button" onClick={onBack}>← World Forge</button>
    <header className="forge-header"><span className="eyebrow">Hero Forge</span><h1>Give the world someone to remember.</h1><p>{world.title} is waiting.</p></header>
    <section className="forge-card hero-forge">
      {/* THE ATELIER (XVII, Article VIII) — portrait-first: the painted
          hero stands large and central, and the face answers the TAP,
          never the keystroke. */}
      <div className="hero-identity atelier-identity">
        <figure className={`hero-portrait atelier-portrait ${portrait === 'pending' ? 'summoning' : ''}`}>
          {hasFace ? <img src={portrait} alt={form.name}/> : <span className="portrait-mark">{form.sigil}</span>}
          <figcaption>
            {hasFace ? form.name : portrait === 'pending' ? 'The face is arriving…' : 'A face waiting to be painted'}
            {form.mark.trim() && <span className="portrait-inscription">{form.mark}</span>}
          </figcaption>
        </figure>
        {mediaTier !== 'parchment'
          ? <button type="button" className="secondary-button repaint-button" onClick={paintFace} disabled={!form.name.trim() || portrait === 'pending'}>{portrait === 'pending' ? 'The face is arriving…' : hasFace ? 'Repaint from the glass' : 'Paint their face'}</button>
          : <p className="fine-print">Parchment paints the face procedurally when the chronicle begins; the sigil stands for it here.</p>}
        <div className="hero-sigil"><span>{form.sigil}</span><input aria-label="Sigil" value={form.sigil} onChange={pen('sigil')} maxLength={2}/><DiceButton label="Spin a sigil" onRoll={fieldDie('sigil')}/></div>
      </div>

      {/* THE LOOKING GLASS — six strokes of the portrait, each a die and a
          pen under the Two Hands; together they compose the sealed canon
          the anchor and the sheet both mint from. */}
      <div className="atelier-fields">
        <h3>The looking glass</h3>
        <p className="fine-print">Six strokes of the portrait. Your ink is sovereign, and the painting reads every word.</p>
        <div className="form-grid atelier-grid">
          {ATELIER_FIELDS.map(({ key, ask: askWord, placeholder }) =>
            <label key={key}><span className="label-line">{askWord} <DiceButton label={`Spin ${key}`} onRoll={atelierDie(key)}/></span>
              <input value={form[key] || ''} onChange={pen(key)} maxLength={90} placeholder={placeholder}/></label>)}
        </div>
        <button type="button" className="secondary-button" onClick={spinLook}><Dices/> Spin the whole look</button>
      </div>

      <DoorRow door={door} onDoor={setDoor} doors={[
        ['bones', 'Cast the Bones', 'A whole soul from one throw — then answer only what you care to.'],
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
        <label className="ask-row"><span className="label-line">{ask('hero', 'name')} <DiceButton label="Spin a name" onRoll={fieldDie('name')}/></span><input value={form.name} onChange={pen('name')} maxLength={60}/></label>
        <div className="form-grid">
          <label><span className="label-line">{ask('hero', 'ancestry')} <DiceButton label="Spin an ancestry" onRoll={fieldDie('ancestry')}/></span><input value={form.ancestry} onChange={pen('ancestry')} maxLength={40}/></label>
          <label><span className="label-line">{ask('hero', 'className')} <DiceButton label="Spin a calling" onRoll={fieldDie('className')}/></span><select value={CLASSES.some((c) => c.className === form.className) ? form.className : ''} onChange={setCalling}>{!CLASSES.some((c) => c.className === form.className) && <option value="" disabled>{form.className}</option>}{CLASSES.map((c) => <option key={c.className} value={c.className}>{c.className}</option>)}</select></label>
        </div>
        <div className="form-grid">
          {presentationField}
          <label><span className="label-line">{ask('hero', 'pronouns')} <DiceButton label="Spin the words" onRoll={fieldDie('pronouns')}/></span><input value={form.pronouns} onChange={pen('pronouns')} maxLength={30} placeholder="she/her, he/him, they/them…"/></label>
        </div>
        <label className="ask-row"><span className="label-line">{ask('hero', 'mark')} <DiceButton label="Spin a mark" onRoll={fieldDie('mark')}/></span><input value={form.mark} onChange={pen('mark')} maxLength={80} placeholder="A scar, a brand, a streak of white…"/></label>
        <label className="ask-row"><span className="label-line">{ask('hero', 'keepsake')} <DiceButton label="Spin a keepsake" onRoll={fieldDie('keepsake')}/></span><input value={form.keepsake} onChange={pen('keepsake')} maxLength={60} placeholder="It goes into their pack — and into the story."/></label>
      </>}

      {door === 'oracle' && <>
        <div className="form-grid oracle-grid">
          <label>Which way do you walk?<select defaultValue="" onChange={(e) => oracleWrite({ __path: e.target.value })}>
            <option value="" disabled>choose…</option>{ORACLE_HERO.paths.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>What carries you?<select defaultValue="" onChange={(e) => oracleWrite({ __virtue: e.target.value })}>
            <option value="" disabled>choose…</option>{ORACLE_HERO.virtues.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label>What do you keep?<select defaultValue="" onChange={(e) => oracleWrite({ __keepsake: e.target.value })}>
            <option value="" disabled>choose…</option>{ORACLE_HERO.keepsakes.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        </div>
        <div className="form-grid">
          <label>{ask('hero', 'name')}<input value={form.name} onChange={pen('name')} /></label>
          {presentationField}
        </div>
        <article className="spin-card"><p>{form.bearing}</p><p className="fine-print">{form.background}</p></article>
      </>}

      {door === 'hand' && <>
        <div className="form-grid">
          <label><span className="label-line">{ask('hero', 'name')} <DiceButton label="Roll a name" onRoll={fieldDie('name')}/></span><input value={form.name} onChange={pen('name')} /></label>
          <label><span className="label-line">{ask('hero', 'ancestry')} <DiceButton label="Roll an ancestry" onRoll={fieldDie('ancestry')}/></span><input value={form.ancestry} onChange={pen('ancestry')} /></label>
          <label>{ask('hero', 'className')}<input value={form.className} onChange={pen('className')} /></label>
          <label>Casting<select value={form.caster} onChange={pen('caster')}><option value="none">None</option><option value="full">Full caster</option><option value="half">Half caster</option><option value="energy">Spell energy</option></select></label>
          <label>Hit die<select value={form.hitDie} onChange={pen('hitDie')}><option>6</option><option>8</option><option>10</option><option>12</option></select></label>
        </div>
        <div className="ability-grid">{Object.entries(form.abilities).map(([ability, score]) => <label key={ability}>{ability}<input type="number" min="3" max="20" value={score} onChange={(e) => updateAbility(ability, e.target.value)}/><small>{Math.floor((score-10)/2) >= 0 ? '+' : ''}{Math.floor((score-10)/2)}</small></label>)}</div>
        <div className="form-grid">
          {presentationField}
          <label><span className="label-line">{ask('hero', 'pronouns')} <DiceButton label="Roll the words" onRoll={fieldDie('pronouns')}/></span><input value={form.pronouns} onChange={pen('pronouns')} maxLength={30} placeholder="she/her, he/him, they/them…"/></label>
          <label><span className="label-line">{ask('hero', 'mark')} <DiceButton label="Roll a mark" onRoll={fieldDie('mark')}/></span><input value={form.mark} onChange={pen('mark')} maxLength={80} placeholder="A scar, a brand, a streak of white…"/></label>
        </div>
        <label className="ask-row"><span className="label-line">{ask('hero', 'keepsake')} <DiceButton label="Roll a keepsake" onRoll={fieldDie('keepsake')}/></span><input value={form.keepsake} onChange={pen('keepsake')} maxLength={60}/></label>
        <label><span className="label-line">{ask('hero', 'bearing')} <DiceButton label="Roll a bearing" onRoll={fieldDie('bearing')}/></span><input value={form.bearing} onChange={pen('bearing')} maxLength={200} placeholder="Their look, their gear, the way they carry themselves"/></label>
        <label><span className="label-line">{ask('hero', 'background')} <DiceButton label="Roll a background" onRoll={fieldDie('background')}/></span><textarea value={form.background} onChange={pen('background')} rows="3" /></label>
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
      <button className="primary-button" onClick={() => { /* the blessing travels with the forge; the sovereign ledger stays home */ const hero = sitting ? { ...form, sitting } : { ...form }; const out = {}; for (const [key, value] of Object.entries(hero)) if (!key.startsWith('__')) out[key] = value; onBegin(out); }}>Begin the chronicle <ArrowRight/></button>
    </section>
  </main>;
}
