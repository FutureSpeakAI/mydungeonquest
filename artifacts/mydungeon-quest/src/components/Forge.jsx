import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Dices, ShieldCheck, X } from 'lucide-react';
import { Dowry } from './Dowry.jsx';
import { isProving } from '../lib/proving.js';
import { WORLD_DECK, shuffleWorldDeck } from '../lib/worldDeck.js';
import { CLASS_DECK, CLASS_DECK_DEFAULT, CLASS_EQUIPMENT, STAT_LABELS, swapStat } from '../lib/classDeck.js';
import { SPINES } from 'fatescript/spines';
import { portraitPrompt } from '../lib/cinema/prompts.js';
import { nameSeed } from '../lib/cinema/prologue.js';
import { oracleWorld, oracleHero, ORACLE_WORLD, ORACLE_HERO, CLASSES, BEARINGS, BACKGROUNDS, rollAbilities } from 'fatescript/forgeRolls';
import { FIELD_MAP, XCARD_COPY, fieldEntry, spineFromPromise, spineLabel, titleFromPromise, WORLD_KEYS, HERO_KEYS, CALLING_RIDERS } from 'fatescript/smith';
import { smithSpin } from '../lib/smithClient.js';
import { openSitting, blessSitting, sittingRequired } from '../lib/sitting.js';
import { ATELIER_FIELDS, dealAppearance, rollAppearance, heroCanonSoul } from '../lib/atelier.js';
import { dealAuditions, soundDesc } from '../lib/audition.js';
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

// SITTING ARIA LABEL — held as a template literal so no double-quote wraps
// the house phrase; sittingAtForge.test reads this via forge.includes().
const SITTING_ARIA_LABEL = `The Sitting — a face is accepted, not assigned`;

// THE X-CARD (Directive XIII §2) — safety presented as a CARD the game
// deals, never a form the player must fill. Dealt once per device; lines
// and veils keep their surfaces behind the customize door.
function XCard() {
  return <article className="xcard-card" role="note">
    <ShieldCheck aria-hidden/>
    <p>{XCARD_COPY}</p>
  </article>;
}

// C6 — VOICE AUDITION (F4) — three candidates, described by sound.
// The stated register's voices step forward three at a time; Shuffle
// draws three more from the same register. An expanded view shows all
// voices in the register with a register label. Provider names never
// reach the player — every description comes from the sound lexicon.
// C8 — KEYLESS FLOOR: at parchment tier audio is unavailable; tapping
// a chip still blesses the voice (tap-count parity), but the preview
// call is skipped and an honest note replaces the play prompt.
function AuditionRow({ presentation, name, voiceId, onBless, mediaTier = 'illuminated' }) {
  const [busy, setBusy] = useState(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [expanded, setExpanded] = useState(false);
  // G2 — honest play failure: quota exhausted, autoplay blocked, or provider
  // unavailable. Shown in the fine-print so the player knows the tap landed
  // even if no sound played.
  const [playFail, setPlayFail] = useState(null);
  // THE POOL — the unchanged ten-voice dealer under the Tenor law.
  // Shuffle uses a seeded salt to rotate fresh candidates from the
  // same register without altering the underlying deal order.
  const pool = shuffleSeed === 0
    ? dealAuditions(presentation, name)
    : dealAuditions(presentation, `${name}:s${shuffleSeed}`);
  // Three candidates from the stated register for the default tray.
  const tray = pool.slice(0, 3);
  // Stated presentations have 6 ensemble voices; neutral uses all ten.
  const stated = ['feminine', 'masculine'].includes(String(presentation || '').toLowerCase());
  const fullRegister = stated ? pool.slice(0, 6) : pool;
  const shown = expanded ? fullRegister : tray;
  const registerLabel = { feminine: 'Feminine voices', masculine: 'Masculine voices' }[
    String(presentation || '').toLowerCase()
  ] ?? 'All voices';

  const play = async (candidate) => {
    if (mediaTier === 'parchment') return; // no audio at this table — honest floor
    setBusy(candidate.id);
    setPlayFail(null);
    // G2 — CREATE the Audio element synchronously, WITHIN the gesture context,
    // before any await. Mobile Chrome and Safari tie autoplay permission to the
    // original user gesture; after the first await the gesture context is gone
    // and play() will be rejected. Assigning src after the fetch is valid:
    // setting src on an already-constructed element re-uses the browser's
    // existing permission grant.
    const audio = new Audio();
    audio.load();
    try {
      const line = `I am ${name || 'the hero'}. The road is long, and I mean to walk it.`;
      const res = await fetch('/api/speak', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: line, voiceId: candidate.id }) });
      if (res.ok) {
        const url = URL.createObjectURL(await res.blob());
        audio.onended = () => URL.revokeObjectURL(url);
        audio.src = url;
        try {
          await audio.play();
        } catch (playErr) {
          // Log so diagnostics can detect the pattern; do not surface to the player
          // as an error — the gesture-context fix should handle most cases.
          console.warn('[audition] play() rejected:', playErr?.name, playErr?.message);
          setPlayFail('Preview blocked — the choice still seals.');
        }
      } else {
        // Surface quota and provider errors honestly so the player understands
        // why no sound played without needing to open developer tools.
        const body = await res.text().catch(() => '');
        const hint = /quota|credit|limit/i.test(body)
          ? 'Voice credits are exhausted — the choice still seals.'
          : `Voice preview unavailable (${res.status}) — the choice still seals.`;
        console.warn('[audition] speak refused:', res.status, body.slice(0, 200));
        setPlayFail(hint);
      }
    } catch (err) {
      console.warn('[audition] audition failed:', err?.message || err);
      // Network or other failure — the audition is ritual; the choice still seals.
    } finally { setBusy(null); }
  };

  return <div className="audition-row">
    <div className="audition-header"><span className="eyebrow">{ask('hero', 'voice')}</span><DiceButton label="Shuffle a voice" onRoll={() => setShuffleSeed((s) => s + 1)}/></div>
    {expanded && <p className="audition-register-label">{registerLabel}</p>}
    <div className="audition-choices">{shown.map((candidate) =>
      <button key={candidate.id} type="button" className={`audition-chip${voiceId === candidate.id ? ' selected' : ''}`} disabled={Boolean(busy) && busy !== candidate.id}
        onClick={() => { onBless(candidate.id); play(candidate); }}>
        {busy === candidate.id ? '…' : '▶'} {soundDesc(candidate.id)}
      </button>)}</div>
    <button type="button" className="audition-expand" onClick={() => setExpanded((e) => !e)}>
      {expanded ? 'Fewer voices' : 'All voices in this register'}
    </button>
    <small className="fine-print">
      {playFail
        ? playFail
        : mediaTier === 'parchment'
          ? 'Audio is unavailable at this table — tap to choose a voice.'
          : voiceId ? 'Voice chosen. This voice stays with the character.' : 'Tap to hear a voice and choose one.'}
    </small>
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

// World defaults — fallback shape; deck cards override title/covenant/tone/asset.
export const WORLD_FALLBACK = { title: 'The Unwritten Road', covenant: 'A moonlit frontier where roads choose their travelers.', spineId: 'classic-epic', tone: 'Mythic, warm, and dangerous', linesText: '', veilsText: '', homeRegion: 'Larkspur Vale', styleBible: 'Romantic dark-fantasy oil painting with gold-leaf light, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.', __sovereign: [] };

// C9 — CREATION IMAGE BUDGET (Rule 7).
// Total creation spend never exceeds this cap on any one creation session.
// Declared breakdown: custom world cover (1) + sitting portraits (3) +
// manual repaints (≤3 before the cap). Default path (parchment) = 0.
export const CREATION_IMAGE_CAP = 7;

// C2 — WORLD DECK CARD — one card in the swipeable deck.
// Each card shows a 4:5 full-bleed image, title, one-sentence premise, tone label.
// The active card is highlighted; clicking one makes it the selection for "Choose this world".
function WorldDeckCard({ world, active, onActivate }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`world-deck-card spark-card${active ? ' selected' : ''}`}
      onClick={() => onActivate(world)}
    >
      {world.asset
        ? <img className="world-deck-art" src={world.asset} alt="" aria-hidden="true"/>
        : <div className="world-deck-art world-deck-no-art" aria-hidden="true"/>}
      <div className="world-deck-caption">
        <strong className="world-deck-title">{world.title}</strong>
        <p className="world-deck-premise">{world.covenant}</p>
        <small className="world-deck-tone">{world.tone}</small>
      </div>
    </button>
  );
}
// C4 — IDENTITY CONTROL — the single identity question replacing the old
// presentation dropdown, free-text pronouns input, and die. Options cover
// the common identity presets in one tap. "Describe it yourself" opens a
// free-text description (kept local, NEVER parsed for gender) + an explicit
// pronouns field + an explicit voice-register selector. No prose inference
// on any path.
const IDENTITY_PRESETS = [
  { id: 'feminine',  label: 'Feminine',  note: 'she\u2019her', presentation: 'feminine',  pronouns: 'she/her'    },
  { id: 'masculine', label: 'Masculine', note: 'he\u2019him',  presentation: 'masculine', pronouns: 'he/him'     },
  { id: 'neutral',   label: 'Neutral',   note: 'they\u2019them', presentation: 'neutral', pronouns: 'they/them'  },
  { id: 'unsaid',    label: 'Prefer not to say', note: '',       presentation: 'neutral', pronouns: ''           },
];
function detectIdentityMode(presentation, pronouns) {
  for (const p of IDENTITY_PRESETS) {
    if (p.presentation === presentation && p.pronouns === pronouns) return p.id;
  }
  return 'custom';
}
function IdentityControl({ presentation, pronouns, onSet, onShuffle }) {
  const [mode, setMode] = useState(() => detectIdentityMode(presentation, pronouns));
  const [customDesc, setCustomDesc] = useState('');
  const pickPreset = (preset) => { setMode(preset.id); onSet({ presentation: preset.presentation, pronouns: preset.pronouns }); };
  const goCustom = () => setMode('custom');
  return (
    <div className="identity-control">
      <span className="label-line">{ask('hero', 'presentation')}</span>
      <div className="identity-presets" role="radiogroup" aria-label={ask('hero', 'presentation')}>
        {IDENTITY_PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={mode === p.id}
            className={`identity-chip${mode === p.id ? ' selected' : ''}`}
            onClick={() => pickPreset(p)}>
            <span className="identity-chip-label">{p.label}</span>
            {p.note && <small className="identity-chip-note"> \u00b7 {p.note}</small>}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={mode === 'custom'}
          className={`identity-chip identity-chip--custom${mode === 'custom' ? ' selected' : ''}`}
          onClick={goCustom}>
          <span className="identity-chip-label">Describe it yourself</span>
        </button>
      </div>
      <span className="fine-print identity-pronouns-ask">
        {ask('hero', 'pronouns')}
        {onShuffle && <DiceButton label="Shuffle the words" onRoll={onShuffle}/>}
      </span>
      {mode === 'custom' && (
        <div className="identity-custom">
          <label className="ask-row">
            <span className="label-line">How would you describe their identity?</span>
            <input value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} maxLength={80} placeholder="non-binary, agender, gender-fluid\u2026"/>
            <small className="fine-print">This is for you \u2014 the story never infers a voice from these words.</small>
          </label>
          <label className="ask-row">
            <span className="label-line">Pronouns</span>
            <input value={pronouns} onChange={(e) => onSet({ presentation, pronouns: e.target.value })} maxLength={30} placeholder="she/her, he/him, they/them\u2026"/>
          </label>
          {/* D10: voice-register house radio chips (Rule 15) */}
          <div className="register-radio-row" role="radiogroup" aria-label="Voice register">
            <span className="label-line">Voice register</span>
            {[['feminine','Feminine range'],['masculine','Masculine range'],['neutral','Either range']].map(([val, lbl]) =>
              <button key={val} type="button" role="radio" aria-checked={presentation === val}
                className={`register-chip${presentation === val ? ' selected' : ''}`}
                onClick={() => onSet({ presentation: val, pronouns })}>
                {lbl}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// C3 — CLASS DECK CARD — one card in the 2-column class selection grid.
// Bundled /reel/ image at 4:5, class name, one-line role, one-line gear.
function ClassDeckCard({ card, active, onChoose }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      className={`class-deck-card${active ? ' selected' : ''}`}
      onClick={() => onChoose(card.className)}
    >
      {card.asset
        ? <img className="class-deck-art" src={card.asset} alt="" aria-hidden="true" style={{ objectPosition: card.assetPosition || 'center top' }}/>
        : <div className="class-deck-art class-deck-no-art" aria-hidden="true"/>}
      <div className="class-deck-caption">
        <strong className="class-deck-name">{card.className}</strong>
        <p className="class-deck-role">{card.role}</p>
        <p className="class-deck-gear">{card.gear}</p>
      </div>
    </button>
  );
}

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

  // ── world form (covenant / description field and sovereign tracking) ────────
  const [worldForm, setWorldForm] = useState(() => {
    const saved = loadDraft(WORLD_DRAFT_KEY);
    return saved && typeof saved.title === 'string' ? { ...WORLD_FALLBACK, ...saved } : { ...WORLD_FALLBACK };
  });
  useEffect(() => { saveDraft(WORLD_DRAFT_KEY, worldForm); }, [worldForm]);

  const worldPen = (key) => (event) => setWorldForm((v) => ({ ...v, [key]: event.target.value, __sovereign: markSovereign(v, key) }));
  const worldSov = sovereignOf(worldForm);
  // effSpine / effTitle: used in step 1+ after a card is chosen and worldForm is updated.
  const effSpine = worldSov.has('spineId') ? worldForm.spineId : spineFromPromise(worldForm.covenant);
  const effTitle = (worldSov.has('covenant') && !worldSov.has('title')) ? titleFromPromise(worldForm.covenant) : worldForm.title;

  // C2 — DECK STATE: three cards drawn from fixture; a custom-generated card
  // sits first when present. No smithSpin fires for the three default cards.
  const initialSeed = isProving() ? 0 : (Date.now() / 60000) | 0;
  const [deckSeed, setDeckSeed] = useState(initialSeed);
  const [customCard, setCustomCard] = useState(null);
  const [activeDeckCard, setActiveDeckCard] = useState(null);
  const [generateBusy, setGenerateBusy] = useState(false);
  const generateBusyRef = useRef(false);

  // C9 — SESSION SPEND COUNTER. A ref mirrors the state for synchronous
  // reads inside async effects without adding them to dependency arrays.
  const imageSpendRef = useRef(0);
  const [imageSpend, setImageSpend] = useState(0);
  const addImageSpend = (n = 1) => {
    imageSpendRef.current = Math.min(imageSpendRef.current + n, CREATION_IMAGE_CAP);
    setImageSpend(imageSpendRef.current);
  };

  // The displayed deck: customCard always first when present; otherwise 3 fixture cards.
  const displayedDeck = useMemo(() => {
    const three = shuffleWorldDeck(deckSeed);
    return customCard ? [customCard, ...three.slice(0, 2)] : three;
  }, [deckSeed, customCard]);

  // resolvedActiveCard: the selected card, falling back to the first in the deck.
  const resolvedActiveCard = activeDeckCard ?? displayedDeck[0];

  // Shuffle: draw 3 new fixture cards, clear custom card, reset active selection.
  const shuffleDeck = () => {
    setDeckSeed((s) => s + 1);
    setCustomCard(null);
    setActiveDeckCard(null);
  };

  // Generate custom card from description: ONE smithSpin call, seats the card first.
  // C9 — at illuminated tier, also paints one cover image for the custom card (1 image).
  const generateCustomCard = async () => {
    if (generateBusyRef.current || !worldForm.covenant.trim()) return;
    generateBusyRef.current = true;
    setGenerateBusy(true);
    try {
      const result = await smithSpin({ scope: 'world', locked: { covenant: worldForm.covenant }, seed: randomSeed(), tier: mediaTier });
      const c = result.candidates[0];
      const card = {
        id: 'custom',
        title: c.title || titleFromPromise(worldForm.covenant),
        covenant: worldForm.covenant,
        tone: c.tone || worldForm.tone,
        asset: null,
        spineId: c.spineId || spineFromPromise(worldForm.covenant),
        homeRegion: c.homeRegion || WORLD_FALLBACK.homeRegion,
        styleBible: c.styleBible || WORLD_FALLBACK.styleBible,
        linesText: '', veilsText: '',
      };
      setCustomCard(card);
      setActiveDeckCard(card);
      // Cover art — 1 image in the session budget. Reserved immediately so the
      // cap is respected even if the paint is in-flight when Face step fires.
      if (mediaTier !== 'parchment' && imageSpendRef.current < CREATION_IMAGE_CAP) {
        addImageSpend(1);
        const coverTitle = card.title;
        const coverTone = card.tone || 'Mythic and atmospheric';
        (async () => {
          try {
            const prompt = `Fantasy landscape key art: "${coverTitle}". ${coverTone}. Wide painterly illustration, epic scale.`;
            const url = await paintPreview({ prompt, kind: 'cover', label: coverTitle, seed: randomSeed() });
            setCustomCard((prev) => (prev?.id === 'custom' ? { ...prev, asset: url } : prev));
          } catch { /* cover art is optional — the card works without it */ }
        })();
      }
    } finally {
      generateBusyRef.current = false;
      setGenerateBusy(false);
    }
  };

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
  const setIdentity = ({ presentation, pronouns }) => setHeroForm((v) => ({
    ...v, presentation, pronouns,
    voiceId: presentation !== v.presentation ? null : v.voiceId,
    __sovereign: markSovereign(markSovereign(v, 'presentation'), 'pronouns'),
  }));
  const setCalling = (event) => setHeroForm((v) => {
    const cls = CLASSES.find((c) => c.className === event.target.value) || CLASSES[0];
    const riders = { caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills, abilities: rollAbilities(cls.className, randomSeed()), bearing: BEARINGS[cls.className], background: BACKGROUNDS[cls.className], spells: dealGrimoire(cls.caster) };
    return { ...applyCandidate(v, riders), className: cls.className, __sovereign: markSovereign({ ...v, __sovereign: (v.__sovereign || []).filter((k) => k !== 'className') }, 'className') };
  });
  // C3 — chooseCalling: same logic as setCalling but takes a className string directly.
  // Pure-local (rollAbilities is seeded, no smithSpin), keeps total=72.
  const chooseCalling = (className) => setHeroForm((v) => {
    const cls = CLASSES.find((c) => c.className === className) || CLASSES[0];
    const riders = { caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills, abilities: rollAbilities(cls.className, randomSeed()), bearing: BEARINGS[cls.className], background: BACKGROUNDS[cls.className], spells: dealGrimoire(cls.caster) };
    return { ...applyCandidate(v, riders), className: cls.className, __sovereign: markSovereign({ ...v, __sovereign: (v.__sovereign || []).filter((k) => k !== 'className') }, 'className') };
  });
  const [classExpanded, setClassExpanded] = useState(false);
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
    if (imageSpendRef.current >= CREATION_IMAGE_CAP) return; // budget exhausted
    paintCtl.current?.abort();
    const controller = new AbortController(); paintCtl.current = controller;
    setPortrait('pending');
    (async () => {
      try {
        const prompt = portraitPrompt(worldForm, heroCanonSoul(heroForm), 'bust');
        const url = await paintPreview({ prompt, kind: 'portrait', label: heroForm.name, variant: 'bust', seed: nameSeed(heroForm.name) }, controller.signal);
        if (!controller.signal.aborted) {
          addImageSpend(1); // counted on success
          if (portraitUrlRef.current) URL.revokeObjectURL(portraitUrlRef.current);
          portraitUrlRef.current = url; setPortrait(url);
        } else { URL.revokeObjectURL(url); }
      } catch { if (!controller.signal.aborted) setPortrait(null); }
    })();
  };
  useEffect(() => () => {
    paintCtl.current?.abort();
    if (portraitUrlRef.current) URL.revokeObjectURL(portraitUrlRef.current);
  }, []);
  const hasFace = portrait && portrait !== 'pending';

  // ── sitting (face step) ──────────────────────────────────────────────────
  const [sitting, setSitting] = useState(null);
  useEffect(() => {
    // C8 — KEYLESS FLOOR: open the sitting at ALL tiers so the player sees
    // three procedural candidates even when no paint service is available.
    // Image fetches bail at parchment (the effect below checks mediaTier),
    // so only sigil placeholders are shown — honest and tap-count-identical.
    if (!heroForm.name.trim()) { setSitting(null); return; }
    setSitting(openSitting(heroForm));
  }, [heroForm.name, heroForm.bearing, heroForm.mark, heroForm.background, heroForm.hair, heroForm.eyes, heroForm.skin, heroForm.build, heroForm.attire, heroForm.accessory, mediaTier]);
  const blessChair = (candidateId) => setSitting((current) => {
    const out = blessSitting(current, candidateId);
    return out.ok ? out.sitting : current;
  });

  // ── C5: portrait tray — three painted chairs for the sitting ─────────────
  const [chairImages, setChairImages] = useState({});
  const chairImagesRef = useRef({});
  const chairCtls = useRef({});
  const [expandedChair, setExpandedChair] = useState(null);
  const chairLightboxRef = useRef(null);
  // A key derived from the candidates' briefs — changes only when appearance
  // fields change enough to open a new sitting with different lighting prompts.
  const sittingKey = sitting?.candidates?.map((c) => c.brief.slice(0, 40)).join('\u00b6') ?? '';
  // Reset images and abort in-flight fetches when the sitting identity changes.
  useEffect(() => {
    Object.values(chairImagesRef.current).forEach((url) => {
      if (url && url !== 'pending' && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setChairImages({});
    chairImagesRef.current = {};
    setExpandedChair(null);
    Object.values(chairCtls.current).forEach((ctl) => ctl?.abort());
    chairCtls.current = {};
  }, [sittingKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Generate a portrait for each candidate that hasn't started painting yet.
  // C9 — budget check: reserve all candidate slots before firing; bail if cap hit.
  useEffect(() => {
    if (!sitting || mediaTier === 'parchment') return undefined;
    const pending = sitting.candidates.filter((c) => !(c.id in chairImagesRef.current));
    if (!pending.length) return undefined;
    const slotsAvailable = CREATION_IMAGE_CAP - imageSpendRef.current;
    if (slotsAvailable <= 0) return undefined; // budget exhausted
    const toPaint = pending.slice(0, slotsAvailable);
    addImageSpend(toPaint.length); // reserve all slots up-front
    let alive = true;
    for (const candidate of toPaint) {
      const ctl = new AbortController();
      chairCtls.current[candidate.id] = ctl;
      chairImagesRef.current[candidate.id] = 'pending';
      setChairImages((prev) => ({ ...prev, [candidate.id]: 'pending' }));
      (async () => {
        try {
          const url = await paintPreview({ prompt: candidate.brief, kind: 'portrait', label: heroForm.name, variant: 'bust', seed: nameSeed(heroForm.name + candidate.id) }, ctl.signal);
          if (alive) { chairImagesRef.current[candidate.id] = url; setChairImages((prev) => ({ ...prev, [candidate.id]: url })); }
          else { URL.revokeObjectURL(url); }
        } catch { if (alive && !ctl.signal.aborted) { chairImagesRef.current[candidate.id] = null; setChairImages((prev) => ({ ...prev, [candidate.id]: null })); } }
      })();
    }
    return () => { alive = false; for (const c of toPaint) { chairCtls.current[c.id]?.abort(); } };
  }, [sittingKey, mediaTier]); // eslint-disable-line react-hooks/exhaustive-deps
  // Lightbox focus trap and body scroll lock for the chair lightbox (D4 pattern).
  useEffect(() => {
    if (!expandedChair) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const opener = document.activeElement;
    const onKey = (event) => {
      if (event.key === 'Escape') setExpandedChair(null);
      if (event.key === 'Tab') { event.preventDefault(); chairLightboxRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    chairLightboxRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [expandedChair]);

  // ── xcard + dowry secondary door ─────────────────────────────────────────
  const [xcardDealt] = useState(() => { try { return localStorage.getItem(XCARD_SEEN_KEY) === '1'; } catch { return true; } });
  const [dowry, setDowry] = useState(null);
  const [door, setDoor] = useState(null);
  const WORLD_SECONDARY = [
    ['dowry', 'Import a world', 'Bring pages from a previous story into this one.'],
  ];

  // ── collect world data when leaving step 0 ───────────────────────────────
  // C2: builds the world object from the selected deck card, merging any
  // sovereign description the player typed. Syncs worldForm so effTitle
  // is correct in step 1+ (React 18 batches both updates).
  const storeWorldAndAdvance = () => {
    try { localStorage.setItem(XCARD_SEEN_KEY, '1'); } catch { /* SWALLOW-JUSTIFIED: xcard-seen flag is best-effort cosmetic state; private mode is valid */ }
    const card = resolvedActiveCard;
    const base = { ...WORLD_FALLBACK, ...(card || {}) };
    const sov = sovereignOf(worldForm);
    const merged = { ...base };
    for (const k of [...sov]) { if (worldForm[k] !== undefined) merged[k] = worldForm[k]; }
    const title = card?.title || effTitle;
    const spineId = merged.spineId || effSpine;
    const out = {};
    for (const [key, value] of Object.entries(merged)) if (!key.startsWith('__')) out[key] = value;
    onWorldReady?.({ ...out, title, spineId, lines: (merged.linesText || '').split(',').map((x) => x.trim()).filter(Boolean), veils: (merged.veilsText || '').split(',').map((x) => x.trim()).filter(Boolean), dowry });
    setWorldForm({ ...merged, __sovereign: [...sov] });
    advance();
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
      <h3>Starting spells — {owed.cantrips} cantrips, {owed.spells} first-circle spells</h3>
      <p className="fine-print">Spell rules come from the tables below. Each row shows everything that spell does. Pick your starting spells — you will gain more at higher levels.</p>
      <div className="spell-pick-grid">
        <div><b>Cantrips ({heldCantrips}/{owed.cantrips})</b>
          {rows.filter(([, row]) => row.level === 0).map(([key, row]) => <label key={key} className={`spell-pick${held.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={held.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}</small></label>)}
        </div>
        <div><b>First circle ({heldSpells}/{owed.spells})</b>
          {rows.filter(([, row]) => row.level === 1).map(([key, row]) => <label key={key} className={`spell-pick${held.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={held.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}{row.concentration ? ' · concentration' : ''}</small></label>)}
        </div>
      </div>
      {(heldCantrips !== owed.cantrips || heldSpells !== owed.spells) && <p className="fine-print">The story cannot begin until the spell counts are exact.</p>}
      {verdict.errors.length > 0 && <p className="fine-print">{verdict.errors[0]}</p>}
    </div>;
  })();

  // ── render ────────────────────────────────────────────────────────────────
  const backLabel = step === 0 ? 'Story shelf' : CREATION_STEPS[step - 1];

  return <main className="creation-page page-enter">
    <CreationProgress step={step} maxReached={maxStep} onGoTo={goTo} />
    <button className="text-button creation-back" onClick={goBack}>← {backLabel}</button>

    {/* ── Step 0: World ─────────────────────────────────────────────── */}
    {step === 0 && <section className="forge-card creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">World — step 1 of 5</span>
        <h1>Choose your world.</h1>
        <p>Three worlds wait. Pick one, shuffle for more, or write one sentence and generate your own.</p>
      </header>

      {/* World deck — three cards, no AI call for defaults */}
      <div className="world-deck" role="radiogroup" aria-label="World options">
        {displayedDeck.map((world) => (
          <WorldDeckCard
            key={world.id}
            world={world}
            active={resolvedActiveCard?.id === world.id}
            onActivate={(w) => setActiveDeckCard(w)}
          />
        ))}
      </div>

      <div className="world-deck-actions button-row">
        <button className="primary-button" onClick={storeWorldAndAdvance}>
          Choose this world <ArrowRight/>
        </button>
        <button type="button" className="secondary-button" onClick={shuffleDeck}>
          <Dices/> Shuffle
        </button>
        <button type="button" className="text-button" onClick={() => setDoor(door === 'customize' ? null : 'customize')}>
          Customize
        </button>
      </div>

      {/* ── World Customize door — opens in place, prefills from worldForm ─── */}
      {door === 'customize' && <div className="world-customize-panel">
        <div className="customize-panel-header">
          <h3>Customize this world</h3>
          <button type="button" className="text-button" onClick={() => setDoor(null)}>Close</button>
        </div>
        <label className="ask-row">
          <span className="label-line">World title</span>
          <input value={worldForm.title} onChange={worldPen('title')} maxLength={80}/>
        </label>
        <label className="ask-row">
          <span className="label-line">Tone</span>
          <input value={worldForm.tone} onChange={worldPen('tone')} maxLength={120}/>
        </label>
        <label className="ask-row">
          <span className="label-line">{fieldEntry('world', 'homeRegion').ask}</span>
          <input value={worldForm.homeRegion} onChange={worldPen('homeRegion')} maxLength={80}/>
        </label>
        <label className="ask-row">
          <span className="label-line">Lines <small className="fine-print">(optional — topics kept off-limits)</small></span>
          <textarea value={worldForm.linesText} onChange={worldPen('linesText')} rows="2" maxLength={500} placeholder="Comma-separated — these topics never enter the story."/>
        </label>
        <label className="ask-row">
          <span className="label-line">Veils <small className="fine-print">(optional — topics handled off-camera)</small></span>
          <textarea value={worldForm.veilsText} onChange={worldPen('veilsText')} rows="2" maxLength={500} placeholder="Comma-separated — these topics happen off-screen only."/>
        </label>
      </div>}

      <p className="fine-print world-meta-asks">
        <b>{fieldEntry('world', 'tone').ask}:</b> {worldForm.tone || WORLD_FALLBACK.tone}
        {' · '}
        <b>{fieldEntry('world', 'shape').ask}:</b> {spineLabel(effSpine)}
      </p>

      <label className="ask-row world-describe">
        <span className="label-line">{fieldEntry('world', 'covenant').ask}</span>
        <span className="fine-print">{fieldEntry('world', 'covenant').hint}</span>
        <textarea value={worldForm.covenant} onChange={worldPen('covenant')} rows="2" maxLength={2000} placeholder="A moonlit frontier where roads choose their travelers."/>
        <button type="button" className="secondary-button"
          disabled={!worldForm.covenant.trim() || generateBusy}
          aria-label={generateBusy ? 'Generating a world card…' : mediaTier === 'parchment' ? 'Generate a card' : 'Generate a world card — 1 image'}
          onClick={generateCustomCard}>
          {generateBusy ? 'Generating a world card\u2026' : 'Generate a card'} <ArrowRight/>
        </button>
      </label>

      {!xcardDealt && <XCard/>}
      <div className="secondary-door-row">
        {WORLD_SECONDARY.map(([id, label, sub]) =>
          <button key={id} type="button" className={`door-option${door === id ? ' open' : ''}`} onClick={() => setDoor(door === id ? null : id)}>
            <b>{label}</b><span>{sub}</span>
          </button>
        )}
      </div>
      {door === 'dowry' && <Dowry dowry={dowry} onDowry={setDowry}/>}

      <p className="fine-print">Nothing is final — the next four steps shape the hero.</p>
    </section>}

    {/* ── Step 1: Class ─────────────────────────────────────────────── */}
    {step === 1 && <section className="forge-card creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">Class — step 2 of 5</span>
        <h1>Choose the calling.</h1>
        <p>{effTitle} is waiting for someone like this.</p>
      </header>

      {/* C3 — 2-column class card grid (6 default) */}
      <div className="class-deck-grid" role="radiogroup" aria-label="Class options">
        {CLASS_DECK_DEFAULT.map((card) => (
          <ClassDeckCard
            key={card.className}
            card={card}
            active={heroForm.className === card.className}
            onChoose={chooseCalling}
          />
        ))}
      </div>

      {/* Expand to see all 8 + stat array + equipment */}
      <button type="button" className="class-deck-expand" onClick={() => setClassExpanded((v) => !v)}>
        {classExpanded ? 'Hide full details' : 'See all eight callings, stats, and gear'}
      </button>

      {classExpanded && (() => {
        const currentClass = CLASSES.find((c) => c.className === heroForm.className) || CLASSES[0];
        const totalAbilities = Object.values(heroForm.abilities).reduce((a, b) => a + b, 0);
        return (
          <div className="class-expanded-section">
            {/* All 8 class cards */}
            <div className="class-deck-grid" role="radiogroup" aria-label="All class options">
              {CLASS_DECK.map((card) => (
                <ClassDeckCard
                  key={card.className}
                  card={card}
                  active={heroForm.className === card.className}
                  onChoose={chooseCalling}
                />
              ))}
            </div>

            {/* Stat array */}
            <div>
              <p className="class-section-label">Ability scores — by {heroForm.className} priority</p>
              <table className="stat-array-table">
                <tbody>
                  {currentClass.order.map((stat) => (
                    <tr key={stat}>
                      <td>{STAT_LABELS[stat]}</td>
                      <td>{heroForm.abilities[stat]}</td>
                      <td>
                        <DiceButton
                          label={`Swap ${STAT_LABELS[stat]} with another stat`}
                          onRoll={() => setHeroForm((v) => ({
                            ...v,
                            abilities: swapStat(v.abilities, stat, randomSeed()),
                            __sovereign: markSovereign(v, 'abilities'),
                          }))}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="stat-total">
                    <td>Total</td>
                    <td>{totalAbilities}</td>
                    <td/>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SRD equipment */}
            <div>
              <p className="class-section-label">Starting equipment</p>
              <ul className="class-equipment-list">
                {(CLASS_EQUIPMENT[heroForm.className] || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      })()}

      <button className="primary-button" onClick={advance}>Choose the face <ArrowRight/></button>
    </section>}

    {/* ── Step 2: Face ──────────────────────────────────────────────── */}
    {step === 2 && <section className="forge-card hero-forge creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">Face — step 3 of 5</span>
        <h1>Compose their face.</h1>
        <p>Fill in these fields. What you write takes priority over any shuffle.</p>
      </header>
      <div className="hero-identity atelier-identity">
        <figure className={`hero-portrait atelier-portrait${portrait === 'pending' ? ' summoning' : ''}`}>
          {hasFace ? <img src={portrait} alt={heroForm.name}/> : <span className="portrait-mark" role="img" aria-label={heroForm.name ? `Portrait placeholder for ${heroForm.name}` : 'Portrait placeholder'}>{heroForm.sigil}</span>}
          <figcaption>
            {hasFace ? heroForm.name : portrait === 'pending' ? 'The face is arriving…' : 'A face waiting to be painted'}
            {heroForm.mark.trim() && <span className="portrait-inscription">{heroForm.mark}</span>}
          </figcaption>
        </figure>
        {mediaTier !== 'parchment'
          ? <><button type="button" className="secondary-button repaint-button"
              aria-label={portrait === 'pending' ? 'The face is arriving…' : hasFace ? 'Repaint — 1 image' : 'Paint the face — 1 image'}
              onClick={paintFace}
              disabled={!heroForm.name.trim() || portrait === 'pending' || imageSpend >= CREATION_IMAGE_CAP}>
              {portrait === 'pending' ? 'The face is arriving…' : hasFace ? 'Repaint' : 'Paint the face'}
            </button>
            <p className="fine-print spend-note">{CREATION_IMAGE_CAP - imageSpend} of {CREATION_IMAGE_CAP} images remaining in creation</p></>
          : <p className="fine-print">A face will be generated when your story begins. The sigil stands in until then.</p>}
        <div className="hero-sigil"><span>{heroForm.sigil}</span><input aria-label="Sigil" value={heroForm.sigil} onChange={heroPen('sigil')} maxLength={2}/><DiceButton label="Shuffle a sigil" onRoll={heroFieldDie('sigil')}/></div>
      </div>
      <div className="atelier-fields">
        <h3>The looking glass</h3>
        <p className="fine-print">These fields shape the portrait. Everything you write here is used exactly as written.</p>
        <div className="form-grid atelier-grid">
          {ATELIER_FIELDS.map(({ key, ask: askWord, placeholder }) =>
            <label key={key}>
              <span className="label-line">{askWord}</span>
              <span className="field-row"><input value={heroForm[key] || ''} onChange={heroPen(key)} maxLength={90} placeholder={placeholder}/><DiceButton label={`Shuffle ${key}`} onRoll={atelierDie(key)}/></span>
            </label>)}
        </div>
        <button type="button" className="secondary-button" onClick={shuffleLook}><Dices/> Shuffle the look</button>
      </div>
      {sitting && <div className="sitting-panel" aria-label={SITTING_ARIA_LABEL}>
        <h3>Portrait options — choose the face that fits.</h3>
        {mediaTier === 'parchment'
          ? <p className="fine-print forge-floor-note">Portrait art is not available at this tier. Three sigil options stand in for the face. Tap one to keep it permanently.</p>
          : <p className="fine-print">Three portrait options are generated for this character. Tap any face to preview it. Accepting a portrait is permanent — all future art will use the face you keep.</p>}
        {sittingRequired(mediaTier) && <p className="fine-print spend-note" aria-label="Three portraits — 3 images">Three portraits — 3 images · {CREATION_IMAGE_CAP - imageSpend} of {CREATION_IMAGE_CAP} remaining</p>}
        <div className="chair-tray">{sitting.candidates.map((candidate) => {
          const img = chairImages[candidate.id];
          const isBlessed = sitting.blessed?.id === candidate.id;
          const isOther = sitting.status === 'blessed' && !isBlessed;
          return <div key={candidate.id} className={`chair-card${isBlessed ? ' chair-card--selected' : ''}${isOther ? ' chair-card--dimmed' : ''}`}>
            <button type="button" className="chair-tap" aria-label={`Study the ${candidate.id} portrait`}
              onClick={() => setExpandedChair(candidate.id)} disabled={isOther}>
              {img && img !== 'pending'
                ? <img src={img} alt={`${heroForm.name} in ${candidate.id} light`}/>
                : <div className={`chair-placeholder${img === 'pending' ? ' chair-placeholder--loading' : ''}`} role="img" aria-label={img === 'pending' ? `${candidate.id} portrait arriving` : `${candidate.id} portrait placeholder`}>{img !== 'pending' && heroForm.sigil}</div>}
            </button>
            <figcaption className="chair-caption">{candidate.id}</figcaption>
            {isBlessed && <span className="chair-badge" aria-hidden="true">✦</span>}
          </div>;
        })}</div>
        {sitting.status === 'blessed' && <p className="fine-print chair-accepted">Portrait accepted. All future art will use this face.</p>}
      </div>}
      {expandedChair && (() => {
        const img = chairImages[expandedChair];
        const isAlreadyBlessed = sitting?.blessed?.id === expandedChair;
        const canSelect = !isAlreadyBlessed && sitting?.status !== 'blessed';
        return <div className="plate-lightbox" role="dialog" aria-modal="true" aria-label={`${expandedChair} portrait, enlarged`} onClick={() => setExpandedChair(null)}>
          {img && img !== 'pending' && <img src={img} alt={heroForm.name} onClick={(e) => e.stopPropagation()}/>}
          <button type="button" ref={chairLightboxRef} className="lightbox-close" aria-label="Close" onClick={() => setExpandedChair(null)}><X/></button>
          {canSelect && <button type="button" className="chair-select-button" aria-label="Use this portrait. This is permanent." onClick={(e) => { e.stopPropagation(); blessChair(expandedChair); setExpandedChair(null); }}>Use this portrait. This is permanent.</button>}
          <span className="chair-lightbox-caption" aria-hidden="true">{expandedChair}</span>
        </div>;
      })()}
      <button className="primary-button" onClick={advance}>Choose the voice <ArrowRight/></button>
    </section>}

    {/* ── Step 3: Voice ─────────────────────────────────────────────── */}
    {step === 3 && <section className="forge-card creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">Voice — step 4 of 5</span>
        <h1>Choose how they present.</h1>
        <p>Set their presentation and choose a voice sample below.</p>
      </header>
      <IdentityControl
        presentation={heroForm.presentation}
        pronouns={heroForm.pronouns}
        onSet={setIdentity}
        onShuffle={heroFieldDie('pronouns')}
      />
      <AuditionRow presentation={heroForm.presentation} name={heroForm.name} voiceId={heroForm.voiceId} onBless={bless} mediaTier={mediaTier}/>
      <button className="primary-button" onClick={advance}>Choose the name <ArrowRight/></button>
    </section>}

    {/* ── Step 4: Name ──────────────────────────────────────────────── */}
    {step === 4 && <section className="forge-card creation-step-panel">
      <header className="forge-header">
        <span className="eyebrow">Name — step 5 of 5</span>
        <h1>Name the hero.</h1>
        <p>The name is the first thing the world will know them by.</p>
      </header>
      <label className="ask-row">
        <span className="label-line">{ask('hero', 'name')}</span>
        <span className="field-row"><input value={heroForm.name} onChange={heroPen('name')} maxLength={60}/><DiceButton label="Shuffle a name" onRoll={heroFieldDie('name')}/></span>
      </label>
      <div className="hero-sigil name-step-sigil"><span>{heroForm.sigil}</span><input aria-label="Sigil" value={heroForm.sigil} onChange={heroPen('sigil')} maxLength={2}/><DiceButton label="Shuffle a sigil" onRoll={heroFieldDie('sigil')}/></div>
      <div className="form-grid">
        <label className="ask-row">
          <span className="label-line">{ask('hero', 'mark')}</span>
          <span className="field-row"><input value={heroForm.mark} onChange={heroPen('mark')} maxLength={80} placeholder="A scar, a brand, a streak of white…"/><DiceButton label="Shuffle a mark" onRoll={heroFieldDie('mark')}/></span>
        </label>
        <label className="ask-row">
          <span className="label-line">{ask('hero', 'keepsake')}</span>
          <span className="field-row"><input value={heroForm.keepsake} onChange={heroPen('keepsake')} maxLength={60} placeholder="It goes into their pack — and into the story."/><DiceButton label="Shuffle a keepsake" onRoll={heroFieldDie('keepsake')}/></span>
        </label>
      </div>
      {grimoirePanel}
      <button className="primary-button" disabled={beginDisabled} onClick={handleBegin} aria-label="Start the campaign — your hero and world choices are now permanent.">Start the campaign <ArrowRight/></button>
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
  const setIdentity = ({ presentation, pronouns }) => setForm((v) => ({
    ...v, presentation, pronouns,
    voiceId: presentation !== v.presentation ? null : v.voiceId,
    __sovereign: markSovereign(markSovereign(v, 'presentation'), 'pronouns'),
  }));
  // D10: accepts a plain className string now (house chips replaced the old picker).
  const setCalling = (value) => setForm((v) => {
    const cls = CLASSES.find((c) => c.className === value) || CLASSES[0];
    const riders = { caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills, abilities: rollAbilities(cls.className, randomSeed()), bearing: BEARINGS[cls.className], background: BACKGROUNDS[cls.className], spells: dealGrimoire(cls.caster) };
    return { ...applyCandidate(v, riders), className: cls.className, __sovereign: markSovereign({ ...v, __sovereign: (v.__sovereign || []).filter((k) => k !== 'className') }, 'className') };
  });
  const [portrait, setPortrait] = useState(null);
  const urlRef = useRef(null);
  const paintCtl = useRef(null);
  const castBusy = useRef(false);
  const sov = sovereignOf(form);

  // C9 — SESSION SPEND COUNTER for the heir forge path.
  const imageSpendRef = useRef(0);
  const [imageSpend, setImageSpend] = useState(0);
  const addImageSpend = (n = 1) => {
    imageSpendRef.current = Math.min(imageSpendRef.current + n, CREATION_IMAGE_CAP);
    setImageSpend(imageSpendRef.current);
  };

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
    // C8 — KEYLESS FLOOR: open the sitting at ALL tiers (see CreationRouter).
    if (!form.name.trim()) { setSitting(null); return; }
    setSitting(openSitting(form));
  }, [form.name, form.bearing, form.mark, form.background, form.hair, form.eyes, form.skin, form.build, form.attire, form.accessory, mediaTier]);
  const blessChair = (candidateId) => setSitting((current) => {
    const out = blessSitting(current, candidateId);
    return out.ok ? out.sitting : current;
  });

  // ── C5: portrait tray for HeroForge sitting ───────────────────────────────
  const [chairImages, setChairImages] = useState({});
  const chairImagesRef = useRef({});
  const chairCtls = useRef({});
  const [expandedChair, setExpandedChair] = useState(null);
  const chairLightboxRef = useRef(null);
  const sittingKey = sitting?.candidates?.map((c) => c.brief.slice(0, 40)).join('\u00b6') ?? '';
  useEffect(() => {
    Object.values(chairImagesRef.current).forEach((url) => {
      if (url && url !== 'pending' && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setChairImages({});
    chairImagesRef.current = {};
    setExpandedChair(null);
    Object.values(chairCtls.current).forEach((ctl) => ctl?.abort());
    chairCtls.current = {};
  }, [sittingKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sitting || mediaTier === 'parchment') return undefined;
    const pending = sitting.candidates.filter((c) => !(c.id in chairImagesRef.current));
    if (!pending.length) return undefined;
    const slotsAvailable = CREATION_IMAGE_CAP - imageSpendRef.current;
    if (slotsAvailable <= 0) return undefined; // budget exhausted
    const toPaint = pending.slice(0, slotsAvailable);
    addImageSpend(toPaint.length); // reserve all slots up-front
    let alive = true;
    for (const candidate of toPaint) {
      const ctl = new AbortController();
      chairCtls.current[candidate.id] = ctl;
      chairImagesRef.current[candidate.id] = 'pending';
      setChairImages((prev) => ({ ...prev, [candidate.id]: 'pending' }));
      (async () => {
        try {
          const url = await paintPreview({ prompt: candidate.brief, kind: 'portrait', label: form.name, variant: 'bust', seed: nameSeed(form.name + candidate.id) }, ctl.signal);
          if (alive) { chairImagesRef.current[candidate.id] = url; setChairImages((prev) => ({ ...prev, [candidate.id]: url })); }
          else { URL.revokeObjectURL(url); }
        } catch { if (alive && !ctl.signal.aborted) { chairImagesRef.current[candidate.id] = null; setChairImages((prev) => ({ ...prev, [candidate.id]: null })); } }
      })();
    }
    return () => { alive = false; for (const c of toPaint) { chairCtls.current[c.id]?.abort(); } };
  }, [sittingKey, mediaTier]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!expandedChair) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const opener = document.activeElement;
    const onKey = (event) => {
      if (event.key === 'Escape') setExpandedChair(null);
      if (event.key === 'Tab') { event.preventDefault(); chairLightboxRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    chairLightboxRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [expandedChair]);

  const paintFace = () => {
    if (mediaTier === 'parchment' || !form.name.trim() || portrait === 'pending') return;
    if (imageSpendRef.current >= CREATION_IMAGE_CAP) return; // budget exhausted
    paintCtl.current?.abort();
    const controller = new AbortController(); paintCtl.current = controller;
    setPortrait('pending');
    (async () => {
      try {
        const prompt = portraitPrompt(world, heroCanonSoul(form), 'bust');
        const url = await paintPreview({ prompt, kind: 'portrait', label: form.name, variant: 'bust', seed: nameSeed(form.name) }, controller.signal);
        if (!controller.signal.aborted) {
          addImageSpend(1); // counted on success
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = url; setPortrait(url);
        } else { URL.revokeObjectURL(url); }
      } catch { if (!controller.signal.aborted) setPortrait(null); }
    })();
  };
  useEffect(() => () => { paintCtl.current?.abort(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const hasFace = portrait && portrait !== 'pending';
  const heardAs = { feminine: 'Heard feminine', masculine: 'Heard masculine', neutral: 'Heard as they choose' }[form.presentation] || 'Heard as they choose';
  return <main className="forge-page page-enter">
    <button className="text-button" onClick={onBack}>← {world.title}</button>
    <header className="forge-header"><span className="eyebrow">New heir</span><h1>Give the world someone new to remember.</h1><p>{world.title} waits for a new voice.</p></header>
    <section className="forge-card hero-forge">
      <div className="hero-identity atelier-identity">
        <figure className={`hero-portrait atelier-portrait${portrait === 'pending' ? ' summoning' : ''}`}>
          {hasFace ? <img src={portrait} alt={form.name}/> : <span className="portrait-mark" role="img" aria-label={form.name ? `Portrait placeholder for ${form.name}` : 'Portrait placeholder'}>{form.sigil}</span>}
          <figcaption>
            {hasFace ? form.name : portrait === 'pending' ? 'The face is arriving…' : 'A face waiting to be painted'}
            {form.mark.trim() && <span className="portrait-inscription">{form.mark}</span>}
          </figcaption>
        </figure>
        {mediaTier !== 'parchment'
          ? <><button type="button" className="secondary-button repaint-button"
              aria-label={portrait === 'pending' ? 'The face is arriving…' : hasFace ? 'Repaint — 1 image' : 'Paint the face — 1 image'}
              onClick={paintFace}
              disabled={!form.name.trim() || portrait === 'pending' || imageSpend >= CREATION_IMAGE_CAP}>
              {portrait === 'pending' ? 'The face is arriving…' : hasFace ? 'Repaint' : 'Paint the face'}
            </button>
            <p className="fine-print spend-note">{CREATION_IMAGE_CAP - imageSpend} of {CREATION_IMAGE_CAP} images remaining in creation</p></>
          : <p className="fine-print">A face will be generated when your story begins. The sigil stands in until then.</p>}
        <div className="hero-sigil"><span>{form.sigil}</span><input aria-label="Sigil" value={form.sigil} onChange={pen('sigil')} maxLength={2}/><DiceButton label="Shuffle a sigil" onRoll={fieldDie('sigil')}/></div>
      </div>
      <div className="atelier-fields">
        <h3>The looking glass</h3>
        <p className="fine-print">These fields shape the portrait. Everything you write here is used exactly as written.</p>
        <div className="form-grid atelier-grid">
          {ATELIER_FIELDS.map(({ key, ask: askWord, placeholder }) =>
            <label key={key}>
              <span className="label-line">{askWord}</span>
              <span className="field-row"><input value={form[key] || ''} onChange={pen(key)} maxLength={90} placeholder={placeholder}/><DiceButton label={`Shuffle ${key}`} onRoll={atelierDie(key)}/></span>
            </label>)}
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
      <label className="ask-row">
        <span className="label-line">{ask('hero', 'name')}</span>
        <span className="field-row"><input value={form.name} onChange={pen('name')} maxLength={60}/><DiceButton label="Shuffle a name" onRoll={fieldDie('name')}/></span>
      </label>
      <div className="form-grid">
        <label>
          <span className="label-line">{ask('hero', 'ancestry')}</span>
          <span className="field-row"><input value={form.ancestry} onChange={pen('ancestry')} maxLength={40}/><DiceButton label="Shuffle an ancestry" onRoll={fieldDie('ancestry')}/></span>
        </label>
        {/* D10: house calling chips (Rule 15) */}
        <div className="calling-radio-row">
          <span className="label-line">{ask('hero', 'className')}</span>
          <div className="calling-chips" role="radiogroup" aria-label={ask('hero', 'className')}>
            {CLASSES.map((c) => (
              <button key={c.className} type="button" role="radio" aria-checked={form.className === c.className}
                className={`calling-chip${form.className === c.className ? ' selected' : ''}`}
                onClick={() => setCalling(c.className)}>
                {c.className}
              </button>
            ))}
          </div>
          <DiceButton label="Shuffle a calling" onRoll={fieldDie('className')}/>
        </div>
      </div>
      <IdentityControl
        presentation={form.presentation}
        pronouns={form.pronouns}
        onSet={setIdentity}
        onShuffle={fieldDie('pronouns')}
      />
      <label className="ask-row">
        <span className="label-line">{ask('hero', 'mark')}</span>
        <span className="field-row"><input value={form.mark} onChange={pen('mark')} maxLength={80} placeholder="A scar, a brand, a streak of white…"/><DiceButton label="Shuffle a mark" onRoll={fieldDie('mark')}/></span>
      </label>
      <label className="ask-row">
        <span className="label-line">{ask('hero', 'keepsake')}</span>
        <span className="field-row"><input value={form.keepsake} onChange={pen('keepsake')} maxLength={60} placeholder="It goes into their pack — and into the story."/><DiceButton label="Shuffle a keepsake" onRoll={fieldDie('keepsake')}/></span>
      </label>
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
          <h3>Starting spells — {owed.cantrips} cantrips, {owed.spells} first-circle spells</h3>
          <p className="fine-print">Spell rules come from the tables below. Each row shows everything that spell does. Pick your starting spells — you will gain more at higher levels.</p>
          <div className="spell-pick-grid">
            <div><b>Cantrips ({heldCantrips}/{owed.cantrips})</b>
              {rows.filter(([, row]) => row.level === 0).map(([key, row]) => <label key={key} className={`spell-pick${held.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={held.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}</small></label>)}
            </div>
            <div><b>First circle ({heldSpells}/{owed.spells})</b>
              {rows.filter(([, row]) => row.level === 1).map(([key, row]) => <label key={key} className={`spell-pick${held.includes(key) ? ' picked' : ''}`}><input type="checkbox" checked={held.includes(key)} onChange={() => toggle(key)} /><span>{key}</span><small>{row.school}{row.concentration ? ' · concentration' : ''}</small></label>)}
            </div>
          </div>
          {(heldCantrips !== owed.cantrips || heldSpells !== owed.spells) && <p className="fine-print">The story cannot begin until the spell counts are exact.</p>}
          {verdict.errors.length > 0 && <p className="fine-print">{verdict.errors[0]}</p>}
        </div>;
      })()}
      {sitting && <div className="sitting-panel" aria-label={SITTING_ARIA_LABEL}>
        <h3>Portrait options — choose the face that fits.</h3>
        {mediaTier === 'parchment'
          ? <p className="fine-print forge-floor-note">Portrait art is not available at this tier. Three sigil options stand in for the face. Tap one to keep it permanently.</p>
          : <p className="fine-print">Three portrait options are generated for this character. Tap any face to preview it. Accepting a portrait is permanent — all future art will use the face you keep.</p>}
        {mediaTier !== 'parchment' && <p className="fine-print spend-note" aria-label="Three portraits — 3 images">Three portraits — 3 images · {CREATION_IMAGE_CAP - imageSpend} of {CREATION_IMAGE_CAP} remaining</p>}
        <div className="chair-tray">{sitting.candidates.map((candidate) => {
          const img = chairImages[candidate.id];
          const isBlessed = sitting.blessed?.id === candidate.id;
          const isOther = sitting.status === 'blessed' && !isBlessed;
          return <div key={candidate.id} className={`chair-card${isBlessed ? ' chair-card--selected' : ''}${isOther ? ' chair-card--dimmed' : ''}`}>
            <button type="button" className="chair-tap" aria-label={`Study the ${candidate.id} portrait`}
              onClick={() => setExpandedChair(candidate.id)} disabled={isOther}>
              {img && img !== 'pending'
                ? <img src={img} alt={`${form.name} in ${candidate.id} light`}/>
                : <div className={`chair-placeholder${img === 'pending' ? ' chair-placeholder--loading' : ''}`} role="img" aria-label={img === 'pending' ? `${candidate.id} portrait arriving` : `${candidate.id} portrait placeholder`}>{img !== 'pending' && form.sigil}</div>}
            </button>
            <figcaption className="chair-caption">{candidate.id}</figcaption>
            {isBlessed && <span className="chair-badge" aria-hidden="true">✦</span>}
          </div>;
        })}</div>
        {sitting.status === 'blessed' && <p className="fine-print chair-accepted">Portrait accepted. All future art will use this face.</p>}
      </div>}
      {expandedChair && (() => {
        const img = chairImages[expandedChair];
        const isAlreadyBlessed = sitting?.blessed?.id === expandedChair;
        const canSelect = !isAlreadyBlessed && sitting?.status !== 'blessed';
        return <div className="plate-lightbox" role="dialog" aria-modal="true" aria-label={`${expandedChair} portrait, enlarged`} onClick={() => setExpandedChair(null)}>
          {img && img !== 'pending' && <img src={img} alt={form.name} onClick={(e) => e.stopPropagation()}/>}
          <button type="button" ref={chairLightboxRef} className="lightbox-close" aria-label="Close" onClick={() => setExpandedChair(null)}><X/></button>
          {canSelect && <button type="button" className="chair-select-button" aria-label="Use this portrait. This is permanent." onClick={(e) => { e.stopPropagation(); blessChair(expandedChair); setExpandedChair(null); }}>Use this portrait. This is permanent.</button>}
          <span className="chair-lightbox-caption" aria-hidden="true">{expandedChair}</span>
        </div>;
      })()}
      <AuditionRow presentation={form.presentation} name={form.name} voiceId={form.voiceId} onBless={bless} mediaTier={mediaTier}/>
      <button className="primary-button" disabled={beginBusy || (() => {
        const owed = knownCountsFor(form.caster, 1);
        const held = Array.isArray(form.spells) ? form.spells : [];
        if (owed.cantrips === 0 && owed.spells === 0) return held.length > 0;
        const cantrips = held.filter((key) => SPELL_TABLE[key]?.level === 0).length;
        const leveled = held.filter((key) => (SPELL_TABLE[key]?.level ?? 0) >= 1).length;
        return cantrips !== owed.cantrips || leveled !== owed.spells || !validateSpellPicks({ archetype: form.caster, level: 1, known: [], picks: held }).ok;
      })()} onClick={() => { const hero = sitting ? { ...form, sitting } : { ...form }; const out = {}; for (const [key, value] of Object.entries(hero)) if (!key.startsWith('__')) out[key] = value; onBegin(out); }} aria-label="Start the campaign — your hero and world choices are now permanent.">Start the campaign <ArrowRight/></button>
    </section>
  </main>;
}
