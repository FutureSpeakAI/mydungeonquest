import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Dices, ShieldCheck } from 'lucide-react';
import { SparkRow } from './Sparks.jsx';
import { Dowry } from './Dowry.jsx';
import { sparks } from '../lib/onboarding.js';
import { isProving } from '../lib/proving.js';
import { SPINES } from 'fatescript/spines';
import { portraitPrompt, keyArtPrompt } from '../lib/cinema/prompts.js';
import { nameSeed } from '../lib/cinema/prologue.js';
import { oracleWorld, oracleHero, ORACLE_WORLD, ORACLE_HERO, CLASSES, BEARINGS, BACKGROUNDS, rollAbilities } from 'fatescript/forgeRolls';
import { FIELD_MAP, XCARD_COPY, fieldEntry, spineFromPromise, spineLabel, titleFromPromise, WORLD_KEYS, HERO_KEYS, CALLING_RIDERS } from 'fatescript/smith';
import { smithSpin, spineSpin } from '../lib/smithClient.js';
import { openSitting, blessSitting, sittingRequired } from '../lib/sitting.js';
import { ATELIER_FIELDS, dealAppearance, rollAppearance, heroCanonSoul } from '../lib/atelier.js';
import { dealAuditions } from '../lib/audition.js';
// THE GRIMOIRE OPENS AT THE FORGE (XVIII, Article IV) — learning is
// sealed here, at the surface: fixed counts from the tables, picks judged
// by the one door (validateSpellPicks), never prose promotion.
import { SPELL_TABLE, knownCountsFor, validateSpellPicks } from 'fatescript/grimoire';

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
// the keys the player wrote, and no shuffle may cross them. One consent
// exists: a sovereign field's OWN die (`force`) lifts its own ink and
// redraws that field alone. Applying any candidate returns written keys
// to the dice's custody (they redraw freely on the next shuffle).
// ------------------------------------------------------------
const sovereignOf = (form) => new Set(Array.isArray(form.__sovereign) ? form.__sovereign : []);
const markSovereign = (v, key) => [...new Set([...(Array.isArray(v.__sovereign) ? v.__sovereign : []), key])];
// THE GRIMOIRE DEAL (Directive XVIII §3, bound to the one-tap law of
// G27c): the owed rows from the same table the atelier reads — the owed
// cantrips first, then the owed first-circle spells, in the library's
// own order. Always lawful under validateSpellPicks, so a dealt caster
// still walks to Chapter One in three choices; the atelier stays the
// sovereign door for repicking.
function dealGrimoire(caster) {
  const owed = knownCountsFor(caster, 1);
  if (!owed.cantrips && !owed.spells) return [];
  const table = caster === 'energy' ? 'full' : caster;
  const rows = Object.entries(SPELL_TABLE).filter(([, row]) => (row.archetypes || []).includes(table));
  return [
    ...rows.filter(([, row]) => row.level === 0).slice(0, owed.cantrips),
    ...rows.filter(([, row]) => row.level === 1).slice(0, owed.spells),
  ].map(([key]) => key);
}
function applyCandidate(v, candidate, force = []) {
  const sov = sovereignOf(v);
  const next = { ...v };
  for (const [key, value] of Object.entries(candidate)) {
    if (sov.has(key) && !force.includes(key)) continue; // ink stands
    next[key] = value;
    sov.delete(key);
  }
  // The calling is one body: a candidate that RESEATS the calling deals
  // the grimoire with it (the prune below would otherwise thin a stale
  // deal under the owed counts and wedge the door), and a candidate
  // that leaves a caster's hands empty gets the deal too. The player's
  // own picks are sovereign ink and are never redealt.
  const reseated = typeof candidate.className === 'string' && candidate.className !== v.className;
  if (next.className && !sov.has('spells') && (reseated || !(Array.isArray(next.spells) && next.spells.length > 0))) {
    next.spells = dealGrimoire(next.caster);
  }
  return { ...next, __sovereign: [...sov] };
}
// The standing remainder for a single-field reshuffle: every other smith key's
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

function DiceButton({ onRoll, label }) {
  return <button type="button" className="dice-button" onClick={onRoll} aria-label={label} title={label}><Dices/></button>;
}

// THE X-CARD (Directive XIII §2) — safety presented as a CARD the game
// deals, never a form the player must fill. Dealt once per device; lines
// and veils keep their surfaces behind the customize door.
function XCard() {
  return <article className="xcard-card" role="note">
    <ShieldCheck aria-hidden/>
    <p>{XCARD_COPY}</p>
  </article>;
}

// THE AUDITION (XVII, Article VIII) — TEN voices step forward under the
// unchanged Tenor law: the stated register leads the deal exactly as the
// old three did (an earlier choice keeps its chip), and the far register
// fills the back of the row. Tap to hear, tap to choose. A chosen voice
// rides the hero forever (the casting session yields to it); unchosen,
// the session reads the finished card. On a keyless table the throat is a
// plain tone — the choice still seals. The die beside the row is the
// voice's own die: a candidate steps forward chosen.
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
    } catch { /* the audition is ritual; the choice still seals */ }
    finally { setBusy(null); }
  };
  return <div className="audition-row">
    <span className="eyebrow label-line">{ask('hero', 'voice')} <DiceButton label="Shuffle a voice" onRoll={() => { const c = candidates[Math.floor(Math.random() * candidates.length)]; onBless(c.id); play(c); }}/></span>
    <div className="audition-choices">{candidates.map((candidate) =>
      <button key={candidate.id} type="button" className={`audition-chip${voiceId === candidate.id ? ' selected' : ''}`} disabled={Boolean(busy) && busy !== candidate.id}
        onClick={() => { onBless(candidate.id); play(candidate); }}>
        {busy === candidate.id ? '…' : '▶'} {candidate.label} — {candidate.line}
      </button>)}</div>
    <small className="fine-print">Ten voices wait. Tap to hear and choose one. {voiceId ? 'Chosen — this voice is theirs, for good.' : 'Unchosen, the casting session reads the finished card.'}</small>
  </div>;
}

// C1 — CREATION STEP ROUTER (F1, F5)
// Five labeled steps replace the four world method options and three hero
// method options. Each step: a sticky progress bar, back to any completed
// step, and a hard limit of two screens of vertical scroll. C2–C6 fill the
// content; C1 builds the shell and route plumbing only.

// THE FIVE ROUTES — exported so the oneRoad eval can bind the exact count.
export const CREATION_STEPS = ['World', 'Class', 'Face', 'Voice', 'Name'];

function CreationProgress({ step, maxReached, onGoTo }) {
  return <nav className="creation-progress" aria-label="Creation progress" role="tablist">
    {CREATION_STEPS.map((label, i) =>
      <button
        key={label} type="button" role="tab"
        className={`creation-step${i === step ? ' current' : ''}${i < step ? ' done' : ''}`}
        disabled={i > maxReached}
        onClick={() => { if (i <= maxReached) onGoTo(i); }}
        aria-current={i === step ? 'step' : undefined}
        aria-selected={i === step}
      >
        <span className="step-index" aria-hidden>{i + 1}</span>
        <span className="step-label">{label}</span>
      </button>
    )}
  </nav>;
}

// World defaults — the same fallback the old WorldForge used.
const WORLD_FALLBACK = { title: 'The Unwritten Road', covenant: 'A moonlit frontier where roads choose their travelers.', spineId: 'classic-epic', tone: 'Mythic, warm, and dangerous', linesText: '', veilsText: '', homeRegion: 'Larkspur Vale', styleBible: 'Romantic dark-fantasy oil painting with gold-leaf light, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.', __sovereign: [] };
// Hero defaults — the same fallback the old HeroForge used.
const HERO_FALLBACK = { name: 'Aster Vale', sigil: '✦', ancestry: 'Human', className: 'Ranger', caster: 'half', hitDie: 10, abilities: { STR: 14, DEX: 15, CON: 13, INT: 10, WIS: 12, CHA: 8 }, skills: ['Perception','Survival','Stealth'], bearing: 'Weather-worn leathers, a road-warden\u2019s longbow, and eyes that never stop reading the treeline.', background: 'A former road-warden who can hear when a path is lying.', presentation: 'neutral', pronouns: '', mark: '', keepsake: 'a river-stone that is always warm', voiceId: null, hair: 'chestnut hair bound in a travel knot', eyes: 'storm-grey eyes', skin: 'olive skin weathered by road-sun', build: 'wiry and quick', attire: 'weather-worn ranger leathers', accessory: 'a river-stone pendant on a cord', __sovereign: [] };

export function CreationRouter({ onBack, onWorldReady, onBegin, mediaTier = 'parchment', beginBusy = false }) {
  // ── step navigation ──────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);

  // maxStep tracks the highest step that has been COMPLETED (passed through).
  // A step is navigable only when i <= maxStep (i.e. it was already completed).
  // Step 0 starts navigable even before any advance because maxStep starts at 0
  // and the check is i <= maxStep — but on initial render step is also 0, and
  // step 0 represents "not yet passed" so disable = i > maxStep gives:
  //   i=0, maxStep=0 → 0>0=false → enabled ✓
  // After one advance we mark step 0 as passed: maxStep becomes 0 (Math.max(0,0)),
  // then step=1. But we DON'T increment maxStep to the destination — we record the
  // step we are LEAVING. So after two advances: step=2, maxStep=1.
  //   i=0 → 0>1=false → enabled ✓   i=1 → 1>1=false → enabled ✓
  //   i=2 → 2>1=true  → disabled ✓  (current, not yet passed)
  const goTo = (i) => { if (i <= maxStep) setStep(i); };
  const advance = () => {
    setMaxStep((m) => Math.max(m, step)); // mark the step we're LEAVING as passed
    setStep(step + 1);
  };
  const goBack = () => { if (step > 0) setStep(step - 1); else onBack?.(); };

  // ── world form ───────────────────────────────────────────────────────────
  const [worldForm, setWorldForm] = useState(() => {
    const saved = loadDraft(WORLD_DRAFT_KEY);
    return saved && typeof saved.title === 'string' ? { ...WORLD_FALLBACK, ...saved } : { ...WORLD_FALLBACK };
  });
  useEffect(() => { saveDraft(WORLD_DRAFT_KEY, worldForm); }, [worldForm]);

  const worldPen = (key) => (event) => setWorldForm((v) => ({ ...v, [key]: event.target.value, __sovereign: markSovereign(v, key) }));
  const worldSov = sovereignOf(worldForm);
  const effSpine = worldSov.has('spineId') ? worldForm.spineId : spineFromPromise(worldForm.covenant);
  const bespoke = worldForm.bespokeSpine?.spine ? worldForm.bespokeSpine : null;
  const shapeName = bespoke ? bespoke.spine.label : spineLabel(effSpine);
  const effTitle = (worldSov.has('covenant') && !worldSov.has('title')) ? titleFromPromise(worldForm.covenant) : worldForm.title;

  const spinBusy = useRef(false);
  const shuffleWorld = async () => {
    if (spinBusy.current) return; spinBusy.current = true;
    try {
      const result = await smithSpin({ scope: 'world', locked: sovereignLock(worldForm, WORLD_KEYS), seed: randomSeed(), tier: mediaTier });
      setWorldForm((v) => applyCandidate(v, result.candidates[0]));
    } finally { spinBusy.current = false; }
  };
  const worldFieldDie = (key) => async () => {
    const result = await smithSpin({ scope: 'field', field: key, locked: remainderLock(worldForm, WORLD_KEYS, key), seed: randomSeed(), tier: mediaTier });
    setWorldForm((v) => applyCandidate(v, result.candidates[0], [key]));
  };
  const spineDie = async () => {
    const dealt = await spineSpin({ covenant: worldForm.covenant, tone: worldForm.tone, seed: randomSeed(), tier: mediaTier });
    setWorldForm((v) => ({ ...v, bespokeSpine: dealt, __sovereign: markSovereign(v, 'spineId') }));
  };

  // Key art fades in behind the world step as the promise takes shape.
  const [keyArt, setKeyArt] = useState(null);
  const keyArtUrlRef = useRef(null);
  useEffect(() => {
    if (step !== 0 || mediaTier === 'parchment' || !worldForm.covenant.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const prompt = keyArtPrompt({ ...worldForm, title: effTitle }, 'establishing');
        const url = await paintPreview({ prompt, kind: 'keyart', label: 'keyart', variant: 'establishing', seed: nameSeed(`${effTitle}:${worldForm.covenant}`), dimensions: '1280x720' }, controller.signal);
        if (keyArtUrlRef.current) URL.revokeObjectURL(keyArtUrlRef.current);
        keyArtUrlRef.current = url; setKeyArt(url);
      } catch { /* preview is ritual; sealed art comes at genesis */ }
    }, 1100);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [worldForm.covenant, worldForm.tone, worldForm.styleBible, worldForm.title, worldForm.homeRegion, mediaTier, step]);

  // ── hero form ────────────────────────────────────────────────────────────
  const [heroForm, setHeroForm] = useState(() => {
    const saved = loadDraft(HERO_DRAFT_KEY);
    return saved && typeof saved.name === 'string' ? { ...HERO_FALLBACK, ...saved, abilities: { ...HERO_FALLBACK.abilities, ...(saved.abilities || {}) } } : { ...HERO_FALLBACK };
  });
  useEffect(() => { saveDraft(HERO_DRAFT_KEY, heroForm); }, [heroForm]);

  // THE GRIMOIRE'S PRUNE — a calling change re-lawfuls the held picks.
  useEffect(() => {
    setHeroForm((v) => {
      const held = Array.isArray(v.spells) ? v.spells : [];
      const table = v.caster === 'energy' ? 'full' : v.caster;
      const allowed = held.filter((key) => { const row = SPELL_TABLE[key]; return row && row.level <= 1 && row.archetypes.includes(table); });
      const owed = knownCountsFor(v.caster, 1);
      const lawful = [
        ...allowed.filter((key) => SPELL_TABLE[key].level === 0).slice(0, owed.cantrips),
        ...allowed.filter((key) => SPELL_TABLE[key].level === 1).slice(0, owed.spells),
      ];
      if (lawful.length === held.length) return v;
      const sov = (Array.isArray(v.__sovereign) ? v.__sovereign : []).filter((k) => k !== 'spells' || lawful.length > 0);
      return { ...v, spells: lawful, __sovereign: sov };
    });
  }, [heroForm.caster]);

  const heroPen = (key) => (event) => setHeroForm((v) => ({ ...v, [key]: event.target.value, __sovereign: markSovereign(v, key) }));
  const setPresentation = (event) => setHeroForm((v) => ({ ...v, presentation: event.target.value, voiceId: null, __sovereign: markSovereign(v, 'presentation') }));
  const setCalling = (event) => setHeroForm((v) => {
    const cls = CLASSES.find((c) => c.className === event.target.value) || CLASSES[0];
    const riders = { caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills, abilities: rollAbilities(cls.className, randomSeed()), bearing: BEARINGS[cls.className], background: BACKGROUNDS[cls.className], spells: dealGrimoire(cls.caster) };
    return { ...applyCandidate(v, riders), className: cls.className, __sovereign: markSovereign({ ...v, __sovereign: (v.__sovereign || []).filter((k) => k !== 'className') }, 'className') };
  });
  const updateAbility = (ability, value) => setHeroForm((f) => ({ ...f, abilities: { ...f.abilities, [ability]: Number(value) }, __sovereign: markSovereign(f, 'abilities') }));
  const bless = (voiceId) => setHeroForm((value) => ({ ...value, voiceId }));
  const heroSov = sovereignOf(heroForm);

  const castBusy = useRef(false);
  const shuffleHero = async () => {
    if (castBusy.current) return; castBusy.current = true;
    try {
      const result = await smithSpin({ scope: 'hero', locked: sovereignLock(heroForm, HERO_KEYS), seed: randomSeed(), tier: mediaTier });
      setHeroForm((v) => ({ ...applyCandidate(applyCandidate(v, result.candidates[0]), dealAppearance(randomSeed())), voiceId: null }));
    } finally { castBusy.current = false; }
  };
  const heroFieldDie = (key) => async () => {
    const result = await smithSpin({ scope: 'field', field: key, locked: remainderLock(heroForm, HERO_KEYS, key), seed: randomSeed(), tier: mediaTier });
    setHeroForm((v) => applyCandidate(v, result.candidates[0], [key]));
  };
  const atelierDie = (key) => () => setHeroForm((v) => applyCandidate(v, { [key]: rollAppearance(key, randomSeed()) }, [key]));
  const shuffleLook = () => setHeroForm((v) => applyCandidate(v, dealAppearance(randomSeed())));

  const heroCard = <article className="spin-card">
    <h3>{heroForm.name}</h3>
    <p className="spin-meta"><span>{heroForm.ancestry} {heroForm.className}</span><span>{ { feminine: 'Heard feminine', masculine: 'Heard masculine', neutral: 'Heard as they choose' }[heroForm.presentation] }</span></p>
    <p>{heroForm.bearing}</p>
    <p className="fine-print">{heroForm.mark ? `Marked by ${heroForm.mark}. ` : ''}{heroForm.background}</p>
  </article>;

  // ── portrait (face step) ─────────────────────────────────────────────────
  const [portrait, setPortrait] = useState(null);
  const portraitUrlRef = useRef(null);
  const paintCtl = useRef(null);
  const paintFace = () => {
    if (mediaTier === 'parchment' || !heroForm.name.trim() || portrait === 'pending') return;
    paintCtl.current?.abort();
    const controller = new AbortController(); paintCtl.current = controller;
    setPortrait('pending');
    (async () => {
      try {
        const prompt = portraitPrompt(worldForm, heroCanonSoul(heroForm), 'bust');
        const url = await paintPreview({ prompt, kind: 'portrait', label: heroForm.name, variant: 'bust', seed: nameSeed(heroForm.name) }, controller.signal);
        if (portraitUrlRef.current) URL.revokeObjectURL(portraitUrlRef.current);
        portraitUrlRef.current = url; setPortrait(url);
      } catch { if (!controller.signal.aborted) setPortrait(null); }
    })();
  };
  useEffect(() => () => {
    paintCtl.current?.abort();
    if (portraitUrlRef.current) URL.revokeObjectURL(portraitUrlRef.current);
    if (keyArtUrlRef.current) URL.revokeObjectURL(keyArtUrlRef.current);
  }, []);
  const hasFace = portrait && portrait !== 'pending';

  // ── sitting (face step) ──────────────────────────────────────────────────
  const [sitting, setSitting] = useState(null);
  useEffect(() => {
    if (!sittingRequired(mediaTier) || !heroForm.name.trim()) { setSitting(null); return; }
    setSitting(openSitting(heroForm));
  }, [heroForm.name, heroForm.bearing, heroForm.mark, heroForm.background, heroForm.hair, heroForm.eyes, heroForm.skin, heroForm.build, heroForm.attire, heroForm.accessory, mediaTier]);
  const blessChair = (candidateId) => setSitting((current) => {
    const out = blessSitting(current, candidateId);
    return out.ok ? out.sitting : current;
  });

  // ── sparks + xcard (world step) ─────────────────────────────────────────
  const [sparkDeal] = useState(() => sparks(isProving() ? 42 : (Date.now() / 60000) | 0));
  const [xcardDealt] = useState(() => { try { return localStorage.getItem(XCARD_SEEN_KEY) === '1'; } catch { return true; } });
  const [dowry, setDowry] = useState(null);
  // ── world secondary door (the Dowry import ceremony) ─────────────────────
  // C1 removes the method-selector tabs; the Dowry lives on as an
  // expandable secondary section so the ceremony remains reachable without
  // requiring a four-tab picker on the world step.
  const [door, setDoor] = useState(null);
  // Secondary-door entries: each is [id, label, subtitle].
  const WORLD_SECONDARY = [
    ['dowry', 'The Dowry', 'Pages from an elder table — carried in, judged, and blessed by hand.'],
  ];

  // ── world card preview ───────────────────────────────────────────────────
  const worldCard = <article className="spin-card">
    <h3>{effTitle}</h3>
    <p>{worldForm.covenant}</p>
    <div className="spin-meta"><span>{shapeName}</span><span>{worldForm.tone}</span><span>Home — {worldForm.homeRegion}</span></div>
  </article>;

  // ── collect world data when leaving step 0 ───────────────────────────────
  const storeWorld = () => {
    try { localStorage.setItem(XCARD_SEEN_KEY, '1'); } catch { /* dealt elsewhere */ }
    const out = {};
    for (const [key, value] of Object.entries(worldForm)) if (!key.startsWith('__')) out[key] = value;
    onWorldReady?.({ ...out, title: effTitle, spineId: effSpine, lines: (worldForm.linesText || '').split(',').map((x) => x.trim()).filter(Boolean), veils: (worldForm.veilsText || '').split(',').map((x) => x.trim()).filter(Boolean), dowry });
  };

  // ── start the campaign ───────────────────────────────────────────────────
  const handleBegin = () => {
    const hero = sitting ? { ...heroForm, sitting } : { ...heroForm };
    const out = {};
    for (const [key, value] of Object.entries(hero)) if (!key.startsWith('__')) out[key] = value;
    onBegin(out);
  };

  // ── grimoire start-gate (same arithmetic as before) ──────────────────────
  const beginDisabled = beginBusy || (() => {
    const owed = knownCountsFor(heroForm.caster, 1);
    const held = Array.isArray(heroForm.spells) ? heroForm.spells : [];
    if (owed.cantrips === 0 && owed.spells === 0) return held.length > 0;
    const cantrips = held.filter((key) => SPELL_TABLE[key]?.level === 0).length;
    const leveled = held.filter((key) => (SPELL_TABLE[key]?.level ?? 0) >= 1).length;
    return cantrips !== owed.cantrips || leveled !== owed.spells || !validateSpellPicks({ archetype: heroForm.caster, level: 1, known: [], picks: held }).ok;
  })();

  // ── presentation field (reused across steps) ─────────────────────────────
  const presentationField = (
    <label><span className="label-line">{ask('hero', 'presentation')} <DiceButton label="Shuffle the presentation" onRoll={heroFieldDie('presentation')}/></span>
      <select value={heroForm.presentation} onChange={setPresentation}>
        <option value="feminine">Feminine</option>
        <option value="masculine">Masculine</option>
        <option value="neutral">Neutral / unsaid</option>
      </select>
    </label>
  );

  // ── grimoire panel (shown in Name step for casters) ──────────────────────
  const grimoirePanel = (() => {
    const owed = knownCountsFor(heroForm.caster, 1);
    if (owed.cantrips === 0 && owed.spells === 0) return null;
    const table = heroForm.caster === 'energy' ? 'full' : heroForm.caster;
    const rows = Object.entries(SPELL_TABLE).filter(([, row]) => row.archetypes.includes(table));
    const held = Array.isArray(heroForm.spells) ? heroForm.spells : [];
    const heldCantrips = held.filter((key) => SPELL_TABLE[key]?.level === 0).length;
    const heldSpells = held.filter((key) => (SPELL_TABLE[key]?.level ?? 0) >= 1).length;
    const toggle = (key) => setHeroForm((v) => { const has = Array.isArray(v.spells) ? v.spells : []; return { ...v, spells: has.includes(key) ? has.filter((k) => k !== key) : [...has, key], __sovereign: markSovereign(v, 'spells') }; });
    const verdict = held.length ? validateSpellPicks({ archetype: heroForm.caster, level: 1, known: [], picks: held }) : { ok: true, errors: [] };
    return <div className="sitting-panel grimoire-picks">
      <h3>The grimoire opens — {owed.cantrips} cantrips, {owed.spells} first-circle spells</h3>
      <p className="fine-print">Mechanics from tables, flavor from the tale: every number a cast will ever carry lives in the spell&rsquo;s own row. Pick your starting craft; the milestones open the book again.</p>
      <div className="spell-pick-grid">
        <div><b>Cantrips ({heldCantrips}/{owed.cantrips})</b>
          {rows.filter(([, row]) => row.level === 0).map(([key, row]) => <label key={key} className={`spell-pick${held.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={held.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}</small></label>)}
        </div>
        <div><b>First circle ({heldSpells}/{owed.spells})</b>
          {rows.filter(([, row]) => row.level === 1).map(([key, row]) => <label key={key} className={`spell-pick${held.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={held.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}{row.concentration ? ' · concentration' : ''}</small></label>)}
        </div>
      </div>
      {(heldCantrips !== owed.cantrips || heldSpells !== owed.spells) && <p className="fine-print">The chronicle waits until the counts stand exact.</p>}
      {verdict.errors.length > 0 && <p className="fine-print">{verdict.errors[0]}</p>}
    </div>;
  })();

  // ── render ────────────────────────────────────────────────────────────────
  const backLabel = step === 0 ? 'Chronicle shelf' : CREATION_STEPS[step - 1];

  return <main className="creation-page page-enter">
    <CreationProgress step={step} maxReached={maxStep} onGoTo={goTo} />
    <button className="text-button creation-back" onClick={goBack}>← {backLabel}</button>

    {/* ── Step 0: World ─────────────────────────────────────────────── */}
    {step === 0 && <section className="forge-card creation-step-panel">
      {keyArt && <div className="forge-keyart" style={{ backgroundImage: `url("${keyArt}")` }} aria-hidden />}
      <header className="forge-header">
        <span className="eyebrow">World — step 1 of 5</span>
        <h1>Speak the world into being.</h1>
        <p>A sentence is enough — or one tap. Every field tells you where its answer lands.</p>
      </header>
      <SparkRow sparks={sparkDeal} onPick={(spark) => setWorldForm((v) => applyCandidate({ ...v, __sovereign: (v.__sovereign || []).filter((k) => !['title', 'covenant', 'tone', 'homeRegion'].includes(k)) }, { title: spark.title, covenant: spark.covenant, tone: spark.tone, homeRegion: spark.region }))}/>
      <label className="ask-row"><span className="label-line">{ask('world', 'covenant')} <DiceButton label="Shuffle a promise" onRoll={worldFieldDie('covenant')}/></span>
        <textarea value={worldForm.covenant} onChange={worldPen('covenant')} rows="3" maxLength={2000}/>
        <small className="fine-print">{fieldEntry('world', 'covenant').hint}</small>
      </label>
      <label className="ask-row"><span className="label-line">{ask('world', 'tone')} <DiceButton label="Shuffle the feel" onRoll={worldFieldDie('tone')}/></span>
        <input value={worldForm.tone} onChange={worldPen('tone')} maxLength={120}/>
      </label>
      <p className="shape-line">{ask('world', 'shape')} — <b>{shapeName}</b><small>{fieldEntry('world', 'shape').hint}</small></p>
      {worldCard}
      {!xcardDealt && <XCard/>}
      <div className="secondary-door-row">
        {WORLD_SECONDARY.map(([id, label, sub]) =>
          <button key={id} type="button" className={`door-option${door === id ? ' open' : ''}`} onClick={() => setDoor(door === id ? null : id)}>
            <b>{label}</b><span>{sub}</span>
          </button>
        )}
      </div>
      {door === 'dowry' && <Dowry dowry={dowry} onDowry={setDowry}/>}
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={shuffleWorld}><Dices/> Shuffle</button>
        <button className="primary-button" onClick={() => { storeWorld(); advance(); }}>Choose the hero <ArrowRight/></button>
      </div>
      <p className="fine-print">Nothing is final — each step has a die beside every field if you want your hands on them.</p>
    </section>}

    {/* ── Step 1: Class ─────────────────────────────────────────────── */}
    {step === 1 && <section className="forge-card creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">Class — step 2 of 5</span>
        <h1>Choose the calling.</h1>
        <p>{effTitle} is waiting for someone.</p>
      </header>
      {heroCard}
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={shuffleHero}><Dices/> Shuffle</button>
      </div>
      <div className="form-grid">
        <label><span className="label-line">{ask('hero', 'ancestry')} <DiceButton label="Shuffle an ancestry" onRoll={heroFieldDie('ancestry')}/></span>
          <input value={heroForm.ancestry} onChange={heroPen('ancestry')} maxLength={40}/></label>
        <label><span className="label-line">{ask('hero', 'className')} <DiceButton label="Shuffle a calling" onRoll={heroFieldDie('className')}/></span>
          <select value={CLASSES.some((c) => c.className === heroForm.className) ? heroForm.className : ''} onChange={setCalling}>
            {!CLASSES.some((c) => c.className === heroForm.className) && <option value="" disabled>{heroForm.className}</option>}
            {CLASSES.map((c) => <option key={c.className} value={c.className}>{c.className}</option>)}
          </select></label>
      </div>
      <button className="primary-button" onClick={advance}>Choose the face <ArrowRight/></button>
    </section>}

    {/* ── Step 2: Face ──────────────────────────────────────────────── */}
    {step === 2 && <section className="forge-card hero-forge creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">Face — step 3 of 5</span>
        <h1>Compose their face.</h1>
        <p>Six strokes of the portrait. Your ink is sovereign.</p>
      </header>
      <div className="hero-identity atelier-identity">
        <figure className={`hero-portrait atelier-portrait${portrait === 'pending' ? ' summoning' : ''}`}>
          {hasFace ? <img src={portrait} alt={heroForm.name}/> : <span className="portrait-mark">{heroForm.sigil}</span>}
          <figcaption>
            {hasFace ? heroForm.name : portrait === 'pending' ? 'The face is arriving…' : 'A face waiting to be painted'}
            {heroForm.mark.trim() && <span className="portrait-inscription">{heroForm.mark}</span>}
          </figcaption>
        </figure>
        {mediaTier !== 'parchment'
          ? <button type="button" className="secondary-button repaint-button" onClick={paintFace} disabled={!heroForm.name.trim() || portrait === 'pending'}>{portrait === 'pending' ? 'The face is arriving…' : hasFace ? 'Repaint' : 'Paint the face'}</button>
          : <p className="fine-print">Parchment paints the face procedurally when the chronicle begins; the sigil stands for it here.</p>}
        <div className="hero-sigil"><span>{heroForm.sigil}</span><input aria-label="Sigil" value={heroForm.sigil} onChange={heroPen('sigil')} maxLength={2}/><DiceButton label="Shuffle a sigil" onRoll={heroFieldDie('sigil')}/></div>
      </div>
      <div className="atelier-fields">
        <h3>The looking glass</h3>
        <p className="fine-print">Six strokes of the portrait. Your ink is sovereign, and the painting reads every word.</p>
        <div className="form-grid atelier-grid">
          {ATELIER_FIELDS.map(({ key, ask: askWord, placeholder }) =>
            <label key={key}><span className="label-line">{askWord} <DiceButton label={`Shuffle ${key}`} onRoll={atelierDie(key)}/></span>
              <input value={heroForm[key] || ''} onChange={heroPen(key)} maxLength={90} placeholder={placeholder}/></label>)}
        </div>
        <button type="button" className="secondary-button" onClick={shuffleLook}><Dices/> Shuffle the look</button>
      </div>
      {sitting && <div className="sitting-panel">
        <h3>The Sitting — a face is accepted, not assigned</h3>
        <p className="fine-print">Three chairs, one identity — only the light differs. Choose one; the choice is final, and every later painting answers to the face you accept. No sheet is minted before the choice.</p>
        <div className="audition-choices">{sitting.candidates.map((candidate) =>
          <button key={candidate.id} type="button" className={`door-tab${sitting.blessed?.id === candidate.id ? ' selected' : ''}`} aria-pressed={sitting.blessed?.id === candidate.id} disabled={sitting.status === 'blessed' && sitting.blessed?.id !== candidate.id} onClick={() => blessChair(candidate.id)}>
            {candidate.id}
          </button>)}</div>
      </div>}
      <button className="primary-button" onClick={advance}>Choose the voice <ArrowRight/></button>
    </section>}

    {/* ── Step 3: Voice ─────────────────────────────────────────────── */}
    {step === 3 && <section className="forge-card creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">Voice — step 4 of 5</span>
        <h1>Choose how they speak.</h1>
        <p>Tap to hear, tap to choose. The choice is theirs, for good.</p>
      </header>
      {presentationField}
      <AuditionRow presentation={heroForm.presentation} name={heroForm.name} voiceId={heroForm.voiceId} onBless={bless}/>
      <button className="primary-button" onClick={advance}>Choose the name <ArrowRight/></button>
    </section>}

    {/* ── Step 4: Name ──────────────────────────────────────────────── */}
    {step === 4 && <section className="forge-card creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">Name — step 5 of 5</span>
        <h1>Name the hero.</h1>
        <p>The name is the first thing the world will know them by.</p>
      </header>
      <label className="ask-row"><span className="label-line">{ask('hero', 'name')} <DiceButton label="Shuffle a name" onRoll={heroFieldDie('name')}/></span>
        <input value={heroForm.name} onChange={heroPen('name')} maxLength={60}/>
      </label>
      <div className="hero-sigil name-step-sigil"><span>{heroForm.sigil}</span><input aria-label="Sigil" value={heroForm.sigil} onChange={heroPen('sigil')} maxLength={2}/><DiceButton label="Shuffle a sigil" onRoll={heroFieldDie('sigil')}/></div>
      <div className="form-grid">
        <label><span className="label-line">{ask('hero', 'pronouns')} <DiceButton label="Shuffle the words" onRoll={heroFieldDie('pronouns')}/></span>
          <input value={heroForm.pronouns} onChange={heroPen('pronouns')} maxLength={30} placeholder="she/her, he/him, they/them…"/></label>
        <label className="ask-row"><span className="label-line">{ask('hero', 'mark')} <DiceButton label="Shuffle a mark" onRoll={heroFieldDie('mark')}/></span>
          <input value={heroForm.mark} onChange={heroPen('mark')} maxLength={80} placeholder="A scar, a brand, a streak of white…"/></label>
        <label className="ask-row"><span className="label-line">{ask('hero', 'keepsake')} <DiceButton label="Shuffle a keepsake" onRoll={heroFieldDie('keepsake')}/></span>
          <input value={heroForm.keepsake} onChange={heroPen('keepsake')} maxLength={60} placeholder="It goes into their pack — and into the story."/></label>
      </div>
      {grimoirePanel}
      <button className="primary-button" disabled={beginDisabled} onClick={handleBegin}>Start the campaign <ArrowRight/></button>
    </section>}
  </main>;
}

// ── HeroForge (heir path) ────────────────────────────────────────────────────
// Kept for the heir forge only (flow === 'heir' in App.jsx). The method
// selector is removed; the default sheet and identity fields are always shown.
export function HeroForge({ world, onBack, onBegin, mediaTier = 'parchment', beginBusy = false }) {
  const [form, setForm] = useState(() => {
    const fallback = { ...HERO_FALLBACK };
    const saved = loadDraft(HERO_DRAFT_KEY);
    return saved && typeof saved.name === 'string' ? { ...fallback, ...saved, abilities: { ...fallback.abilities, ...(saved.abilities || {}) } } : fallback;
  });
  useEffect(() => { saveDraft(HERO_DRAFT_KEY, form); }, [form]);
  // THE GRIMOIRE'S PRUNE — a calling change re-lawfuls the held picks.
  useEffect(() => {
    setForm((v) => {
      const held = Array.isArray(v.spells) ? v.spells : [];
      const table = v.caster === 'energy' ? 'full' : v.caster;
      const allowed = held.filter((key) => { const row = SPELL_TABLE[key]; return row && row.level <= 1 && row.archetypes.includes(table); });
      const owed = knownCountsFor(v.caster, 1);
      const lawful = [
        ...allowed.filter((key) => SPELL_TABLE[key].level === 0).slice(0, owed.cantrips),
        ...allowed.filter((key) => SPELL_TABLE[key].level === 1).slice(0, owed.spells),
      ];
      if (lawful.length === held.length) return v;
      const sov = (Array.isArray(v.__sovereign) ? v.__sovereign : []).filter((k) => k !== 'spells' || lawful.length > 0);
      return { ...v, spells: lawful, __sovereign: sov };
    });
  }, [form.caster]);
  const pen = (key) => (event) => setForm((v) => ({ ...v, [key]: event.target.value, __sovereign: markSovereign(v, key) }));
  const setPresentation = (event) => setForm((v) => ({ ...v, presentation: event.target.value, voiceId: null, __sovereign: markSovereign(v, 'presentation') }));
  const setCalling = (event) => setForm((v) => {
    const cls = CLASSES.find((c) => c.className === event.target.value) || CLASSES[0];
    const riders = { caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills, abilities: rollAbilities(cls.className, randomSeed()), bearing: BEARINGS[cls.className], background: BACKGROUNDS[cls.className], spells: dealGrimoire(cls.caster) };
    return { ...applyCandidate(v, riders), className: cls.className, __sovereign: markSovereign({ ...v, __sovereign: (v.__sovereign || []).filter((k) => k !== 'className') }, 'className') };
  });
  const [portrait, setPortrait] = useState(null);
  const urlRef = useRef(null);
  const paintCtl = useRef(null);
  const castBusy = useRef(false);
  const sov = sovereignOf(form);

  const shuffleAll = async () => {
    if (castBusy.current) return; castBusy.current = true;
    try {
      const result = await smithSpin({ scope: 'hero', locked: sovereignLock(form, HERO_KEYS), seed: randomSeed(), tier: mediaTier });
      setForm((v) => ({ ...applyCandidate(applyCandidate(v, result.candidates[0]), dealAppearance(randomSeed())), voiceId: null }));
    } finally { castBusy.current = false; }
  };
  const fieldDie = (key) => async () => {
    const result = await smithSpin({ scope: 'field', field: key, locked: remainderLock(form, HERO_KEYS, key), seed: randomSeed(), tier: mediaTier });
    setForm((v) => applyCandidate(v, result.candidates[0], [key]));
  };
  const atelierDie = (key) => () => setForm((v) => applyCandidate(v, { [key]: rollAppearance(key, randomSeed()) }, [key]));
  const spinLook = () => setForm((v) => applyCandidate(v, dealAppearance(randomSeed())));
  const bless = (voiceId) => setForm((value) => ({ ...value, voiceId }));

  const [sitting, setSitting] = useState(null);
  useEffect(() => {
    if (!sittingRequired(mediaTier) || !form.name.trim()) { setSitting(null); return; }
    setSitting(openSitting(form));
  }, [form.name, form.bearing, form.mark, form.background, form.hair, form.eyes, form.skin, form.build, form.attire, form.accessory, mediaTier]);
  const blessChair = (candidateId) => setSitting((current) => {
    const out = blessSitting(current, candidateId);
    return out.ok ? out.sitting : current;
  });

  const paintFace = () => {
    if (mediaTier === 'parchment' || !form.name.trim() || portrait === 'pending') return;
    paintCtl.current?.abort();
    const controller = new AbortController(); paintCtl.current = controller;
    setPortrait('pending');
    (async () => {
      try {
        const prompt = portraitPrompt(world, heroCanonSoul(form), 'bust');
        const url = await paintPreview({ prompt, kind: 'portrait', label: form.name, variant: 'bust', seed: nameSeed(form.name) }, controller.signal);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = url; setPortrait(url);
      } catch { if (!controller.signal.aborted) setPortrait(null); }
    })();
  };
  useEffect(() => () => { paintCtl.current?.abort(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const hasFace = portrait && portrait !== 'pending';
  const heardAs = { feminine: 'Heard feminine', masculine: 'Heard masculine', neutral: 'Heard as they choose' }[form.presentation];
  const presentationField = (
    <label><span className="label-line">{ask('hero', 'presentation')} <DiceButton label="Shuffle the presentation" onRoll={fieldDie('presentation')}/></span>
      <select value={form.presentation} onChange={setPresentation}><option value="feminine">Feminine</option><option value="masculine">Masculine</option><option value="neutral">Neutral / unsaid</option></select>
    </label>
  );
  return <main className="forge-page page-enter">
    <button className="text-button" onClick={onBack}>← {world.title}</button>
    <header className="forge-header"><span className="eyebrow">Heir Forge</span><h1>Give the world someone new to remember.</h1><p>{world.title} waits for a new voice.</p></header>
    <section className="forge-card hero-forge">
      <div className="hero-identity atelier-identity">
        <figure className={`hero-portrait atelier-portrait${portrait === 'pending' ? ' summoning' : ''}`}>
          {hasFace ? <img src={portrait} alt={form.name}/> : <span className="portrait-mark">{form.sigil}</span>}
          <figcaption>
            {hasFace ? form.name : portrait === 'pending' ? 'The face is arriving…' : 'A face waiting to be painted'}
            {form.mark.trim() && <span className="portrait-inscription">{form.mark}</span>}
          </figcaption>
        </figure>
        {mediaTier !== 'parchment'
          ? <button type="button" className="secondary-button repaint-button" onClick={paintFace} disabled={!form.name.trim() || portrait === 'pending'}>{portrait === 'pending' ? 'The face is arriving…' : hasFace ? 'Repaint' : 'Paint the face'}</button>
          : <p className="fine-print">Parchment paints the face procedurally when the chronicle begins; the sigil stands for it here.</p>}
        <div className="hero-sigil"><span>{form.sigil}</span><input aria-label="Sigil" value={form.sigil} onChange={pen('sigil')} maxLength={2}/><DiceButton label="Shuffle a sigil" onRoll={fieldDie('sigil')}/></div>
      </div>
      <div className="atelier-fields">
        <h3>The looking glass</h3>
        <p className="fine-print">Six strokes of the portrait. Your ink is sovereign, and the painting reads every word.</p>
        <div className="form-grid atelier-grid">
          {ATELIER_FIELDS.map(({ key, ask: askWord, placeholder }) =>
            <label key={key}><span className="label-line">{askWord} <DiceButton label={`Shuffle ${key}`} onRoll={atelierDie(key)}/></span>
              <input value={form[key] || ''} onChange={pen(key)} maxLength={90} placeholder={placeholder}/></label>)}
        </div>
        <button type="button" className="secondary-button" onClick={spinLook}><Dices/> Shuffle the look</button>
      </div>
      <article className="spin-card">
        <h3>{form.name}</h3>
        <p className="spin-meta"><span>{form.ancestry} {form.className}</span><span>{heardAs}</span></p>
        <p>{form.bearing}</p>
        <p className="fine-print">{form.mark ? `Marked by ${form.mark}. ` : ''}{form.background}</p>
      </article>
      <div className="button-row">
        <button type="button" className="secondary-button" onClick={shuffleAll}><Dices/> Shuffle</button>
      </div>
      <label className="ask-row"><span className="label-line">{ask('hero', 'name')} <DiceButton label="Shuffle a name" onRoll={fieldDie('name')}/></span><input value={form.name} onChange={pen('name')} maxLength={60}/></label>
      <div className="form-grid">
        <label><span className="label-line">{ask('hero', 'ancestry')} <DiceButton label="Shuffle an ancestry" onRoll={fieldDie('ancestry')}/></span><input value={form.ancestry} onChange={pen('ancestry')} maxLength={40}/></label>
        <label><span className="label-line">{ask('hero', 'className')} <DiceButton label="Shuffle a calling" onRoll={fieldDie('className')}/></span>
          <select value={CLASSES.some((c) => c.className === form.className) ? form.className : ''} onChange={setCalling}>
            {!CLASSES.some((c) => c.className === form.className) && <option value="" disabled>{form.className}</option>}
            {CLASSES.map((c) => <option key={c.className} value={c.className}>{c.className}</option>)}
          </select></label>
      </div>
      <div className="form-grid">
        {presentationField}
        <label><span className="label-line">{ask('hero', 'pronouns')} <DiceButton label="Shuffle the words" onRoll={fieldDie('pronouns')}/></span><input value={form.pronouns} onChange={pen('pronouns')} maxLength={30} placeholder="she/her, he/him, they/them…"/></label>
      </div>
      <label className="ask-row"><span className="label-line">{ask('hero', 'mark')} <DiceButton label="Shuffle a mark" onRoll={fieldDie('mark')}/></span><input value={form.mark} onChange={pen('mark')} maxLength={80} placeholder="A scar, a brand, a streak of white…"/></label>
      <label className="ask-row"><span className="label-line">{ask('hero', 'keepsake')} <DiceButton label="Shuffle a keepsake" onRoll={fieldDie('keepsake')}/></span><input value={form.keepsake} onChange={pen('keepsake')} maxLength={60} placeholder="It goes into their pack — and into the story."/></label>
      {(() => {
        const owed = knownCountsFor(form.caster, 1);
        if (owed.cantrips === 0 && owed.spells === 0) return null;
        const table = form.caster === 'energy' ? 'full' : form.caster;
        const rows = Object.entries(SPELL_TABLE).filter(([, row]) => row.archetypes.includes(table));
        const held = Array.isArray(form.spells) ? form.spells : [];
        const heldCantrips = held.filter((key) => SPELL_TABLE[key]?.level === 0).length;
        const heldSpells = held.filter((key) => (SPELL_TABLE[key]?.level ?? 0) >= 1).length;
        const toggle = (key) => setForm((v) => { const has = Array.isArray(v.spells) ? v.spells : []; return { ...v, spells: has.includes(key) ? has.filter((k) => k !== key) : [...has, key], __sovereign: markSovereign(v, 'spells') }; });
        const verdict = held.length ? validateSpellPicks({ archetype: form.caster, level: 1, known: [], picks: held }) : { ok: true, errors: [] };
        return <div className="sitting-panel grimoire-picks">
          <h3>The grimoire opens — {owed.cantrips} cantrips, {owed.spells} first-circle spells</h3>
          <p className="fine-print">Mechanics from tables, flavor from the tale: every number a cast will ever carry lives in the spell&rsquo;s own row. Pick your starting craft; the milestones open the book again.</p>
          <div className="spell-pick-grid">
            <div><b>Cantrips ({heldCantrips}/{owed.cantrips})</b>
              {rows.filter(([, row]) => row.level === 0).map(([key, row]) => <label key={key} className={`spell-pick${held.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={held.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}</small></label>)}
            </div>
            <div><b>First circle ({heldSpells}/{owed.spells})</b>
              {rows.filter(([, row]) => row.level === 1).map(([key, row]) => <label key={key} className={`spell-pick${held.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={held.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}{row.concentration ? ' · concentration' : ''}</small></label>)}
            </div>
          </div>
          {(heldCantrips !== owed.cantrips || heldSpells !== owed.spells) && <p className="fine-print">The chronicle waits until the counts stand exact.</p>}
          {verdict.errors.length > 0 && <p className="fine-print">{verdict.errors[0]}</p>}
        </div>;
      })()}
      {sitting && <div className="sitting-panel">
        <h3>The Sitting — a face is accepted, not assigned</h3>
        <p className="fine-print">Three chairs, one identity — only the light differs. Choose one; the choice is final, and every later painting answers to the face you accept. No sheet is minted before the choice.</p>
        <div className="audition-choices">{sitting.candidates.map((candidate) =>
          <button key={candidate.id} type="button" className={`door-tab${sitting.blessed?.id === candidate.id ? ' selected' : ''}`} aria-pressed={sitting.blessed?.id === candidate.id} disabled={sitting.status === 'blessed' && sitting.blessed?.id !== candidate.id} onClick={() => blessChair(candidate.id)}>
            {candidate.id}
          </button>)}</div>
      </div>}
      <AuditionRow presentation={form.presentation} name={form.name} voiceId={form.voiceId} onBless={bless}/>
      <button className="primary-button" disabled={beginBusy || (() => {
        const owed = knownCountsFor(form.caster, 1);
        const held = Array.isArray(form.spells) ? form.spells : [];
        if (owed.cantrips === 0 && owed.spells === 0) return held.length > 0;
        const cantrips = held.filter((key) => SPELL_TABLE[key]?.level === 0).length;
        const leveled = held.filter((key) => (SPELL_TABLE[key]?.level ?? 0) >= 1).length;
        return cantrips !== owed.cantrips || leveled !== owed.spells || !validateSpellPicks({ archetype: form.caster, level: 1, known: [], picks: held }).ok;
      })()} onClick={() => { const hero = sitting ? { ...form, sitting } : { ...form }; const out = {}; for (const [key, value] of Object.entries(hero)) if (!key.startsWith('__')) out[key] = value; onBegin(out); }}>Start the campaign <ArrowRight/></button>
    </section>
  </main>;
}
