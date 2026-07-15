import { getSpine } from './spines.js';
import { castVoiceByCard } from './cinema/casting.js';

const REGION_STATES = ['thriving', 'troubled', 'corrupted', 'ruined', 'healed'];
// The status law: a soul is exactly one of these. Anything else the DM sends
// is refused (noted as a wound), never written to canon. 'dead' is permanent
// downstream — the validator forbids the dead to speak from the next turn on.
export const CAST_STATUS = ['active', 'dead', 'missing'];
const MAX_FACTS = 10;
const MAX_BOND_ARC = 12;
// An honored early ending breathes for this many quiet turns before the seal.
export const SEALING_DENOUEMENT_TURNS = 3;

// The acts as the player reads them (directive §3.5): every spine beat
// already carries its act number; these are the acts' spoken names.
export const ACT_NAMES = {
  1: 'the world as it was',
  2: 'the world unravelling',
  3: 'the world remade'
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const clean = (value, max = 500) => String(value || '').trim().slice(0, max);
const canonName = (value) => String(value ?? '').trim().toLowerCase();

export function romanNumeral(n) {
  const value = Math.max(1, Math.trunc(Number(n) || 1));
  const table = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = value, out = '';
  for (const [size, glyph] of table) while (rest >= size) { out += glyph; rest -= size; }
  return out;
}

// Chapter I…N is the beat index made visible; one beat, one chapter.
export function chapterInfo(codex) {
  const beats = codex.spine.beats;
  const beat = beats[codex.beatIndex] || beats[beats.length - 1];
  return {
    numeral: romanNumeral(codex.beatIndex + 1),
    countNumeral: romanNumeral(beats.length),
    count: beats.length,
    title: beat.title,
    goal: beat.goal,
    act: beat.act || 1
  };
}

export function actInfo(codex) {
  const act = codex.spine.beats[codex.beatIndex]?.act || 1;
  return { act, numeral: romanNumeral(act), name: ACT_NAMES[act] || ACT_NAMES[1] };
}

// Resolve a DM-sent name to a cast card: exact canonical match first, then a
// unique bare-first-name alias ("Mara" reaches "Mara Vey" when she is the only
// Mara at the table). An ambiguous alias resolves to nobody — canon is never
// guessed. The validator's dead-speak check follows the same law.
function findSoul(cast, rawName) {
  const name = canonName(rawName);
  if (!name) return null;
  const exact = cast.find((entry) => canonName(entry.name) === name);
  if (exact) return exact;
  const aliased = cast.filter((entry) => canonName(entry.name).split(/\s+/)[0] === name);
  return aliased.length === 1 ? aliased[0] : null;
}

function pushFact(list, fact) {
  const facts = Array.isArray(list) ? [...list] : [];
  const value = clean(fact, 160);
  if (!value) return facts;
  if (facts.some((f) => String(f).toLowerCase() === value.toLowerCase())) return facts;
  facts.push(value);
  return facts.slice(-MAX_FACTS);
}

export function initCodex(spineId, seed = {}) {
  const spine = getSpine(spineId);
  return {
    version: 1,
    spine: structuredClone(spine),
    beatIndex: 0,
    arc: seed.arc || null,
    cast: [],
    regions: [],
    memoir: [],
    chronicle: [],
    blight: 0,
    notes: [],
    completed: false
  };
}

// SEAL THE TALE — the honored early ending (directive §3.6). The player may
// choose the seal at any time; the DM is then steered into quiet denouement
// turns through the [STORY] directives, and the tale completes once those
// turns have breathed. A pure reducer so the proving ground can walk it.
export function requestSeal(codex, turn) {
  if (codex.completed || codex.sealing) return codex;
  const next = structuredClone(codex);
  const requested = Number.isInteger(turn) ? turn : 0;
  next.sealing = { requested_turn: requested, final_turn: requested + SEALING_DENOUEMENT_TURNS - 1 };
  next.notes.push('The player has chosen to seal the tale — the denouement begins.');
  return next;
}

// meta.turn — the turn number being applied. Stamped onto new cast cards
// (introduced_turn) and bond-arc entries so the storybook can narrate
// relationships truthfully ("by turn 9, she trusted you"). Optional: sealed
// replays and old call sites simply record null. NOTE: this reducer must run
// even when the DM sends story:null — the sealing countdown ticks on every
// turn, not only on turns that carry updates.
export function applyStoryUpdates(codex, updates, meta = {}) {
  const next = structuredClone(codex);
  updates = updates || {};
  if (updates.arc && !next.arc) {
    next.arc = {
      title: clean(updates.arc.title, 100),
      evil_plot: clean(updates.arc.evil_plot, 700),
      stakes: clean(updates.arc.stakes, 500),
      style_bible: clean(updates.arc.style_bible, 240)
    };
  }

  for (const soul of updates.cast_add || []) {
    const exists = next.cast.some((entry) => canonName(entry.name) === canonName(soul.name));
    if (exists) {
      next.notes.push(`Canon attack blocked: ${clean(soul.name, 80)} was already introduced.`);
      continue;
    }
    if (soul.role === 'villain' && next.cast.some((entry) => entry.role === 'villain')) {
      next.notes.push(`Second villain blocked: ${clean(soul.name, 80)}.`);
      continue;
    }
    const card = {
      id: soul.id || `soul-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      name: clean(soul.name, 80), role: clean(soul.role, 40),
      visual: clean(soul.visual, 360), voice: clean(soul.voice, 180),
      goal: clean(soul.goal, 300), secret: clean(soul.secret, 300),
      status: 'active', bond: 0, last_seen: null,
      known_facts: [], bond_arc: [],
      introduced_turn: Number.isInteger(meta.turn) ? meta.turn : null
    };
    // THE TENOR LAW: the DM's explicit voice_card (gender / age / timbre)
    // rides onto the cast card before the casting session, so the voice is
    // chosen by stated identity — never inferred from prose.
    const stated = soul.voice_card || {};
    const gender = String(stated.gender || '').toLowerCase();
    if (['feminine', 'masculine', 'neutral'].includes(gender)) card.gender = gender;
    const band = String(stated.age || '').toLowerCase();
    if (['child', 'young', 'adult', 'elder'].includes(band)) card.age_band = band;
    if (stated.timbre) card.timbre = clean(String(stated.timbre), 24);
    // THE CASTING SESSION happens here, once, at first introduction: the
    // voice is chosen by reading the card and persisted forever. Souls from
    // before this law have no voiceId and keep their legacy hash voice.
    card.voiceId = castVoiceByCard(card, card.name);
    next.cast.push(card);
  }

  for (const patch of updates.cast_update || []) {
    const soul = findSoul(next.cast, patch.name);
    if (!soul) continue;
    if (patch.status) {
      const status = String(patch.status).trim().toLowerCase();
      if (!CAST_STATUS.includes(status)) {
        next.notes.push(`Unlawful status refused for ${soul.name}: "${clean(patch.status, 40)}" (allowed: ${CAST_STATUS.join(' | ')}).`);
      } else if (status !== soul.status) {
        // Death is a sealed event: the status flips once, a memorial fact is
        // written, and from the NEXT turn the validator holds the line — the
        // dead do not speak. No resurrection retcons.
        if (soul.status === 'dead') {
          next.notes.push(`Resurrection retcon blocked: ${soul.name} is dead and remains so.`);
        } else {
          soul.status = status;
          if (status === 'dead') {
            soul.known_facts = pushFact(soul.known_facts, `Fell${Number.isInteger(meta.turn) ? ` on turn ${meta.turn}` : ''}${patch.last_seen ? ` — ${clean(patch.last_seen, 100)}` : ''}`);
          }
        }
      }
    }
    const delta = Math.trunc(Number(patch.bond_delta) || 0);
    soul.bond = clamp(soul.bond + delta, 0, 4);
    if (delta !== 0) {
      // The bond arc remembers WHEN a disposition moved and why, so the
      // storybook can narrate the relationship rather than assert it.
      soul.bond_arc = [
        ...(Array.isArray(soul.bond_arc) ? soul.bond_arc : []),
        { turn: Number.isInteger(meta.turn) ? meta.turn : null, delta, why: clean(patch.bond_reason || patch.last_seen || '', 140) || null }
      ].slice(-MAX_BOND_ARC);
    }
    if (patch.fact_add) soul.known_facts = pushFact(soul.known_facts, patch.fact_add);
    // voice_card on an update may FILL missing identity fields (for the wiki
    // and the record) but can never flip a stated one, and the cast voiceId
    // is already sealed — the Cast Law holds.
    if (patch.voice_card) {
      const late = patch.voice_card;
      const lateGender = String(late.gender || '').toLowerCase();
      if (!soul.gender && ['feminine', 'masculine', 'neutral'].includes(lateGender)) soul.gender = lateGender;
      const lateBand = String(late.age || '').toLowerCase();
      if (!soul.age_band && ['child', 'young', 'adult', 'elder'].includes(lateBand)) soul.age_band = lateBand;
      if (!soul.timbre && late.timbre) soul.timbre = clean(String(late.timbre), 24);
    }
    if (patch.last_seen) soul.last_seen = clean(patch.last_seen, 160);
  }

  const world = updates.world;
  if (world) {
    next.blight = clamp(next.blight + (world.blight_delta || 0), 0, 5);
    if (world.region_add && !next.regions.some((region) => canonName(region.name) === canonName(world.region_add.name))) {
      next.regions.push({
        id: world.region_add.id || `region-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        name: clean(world.region_add.name, 100), visual: clean(world.region_add.visual, 360), state: 'thriving'
      });
    }
    if (world.region_update) {
      const region = next.regions.find((entry) => canonName(entry.name) === canonName(world.region_update.name));
      if (region && REGION_STATES.includes(world.region_update.state)) region.state = world.region_update.state;
    }
  }

  if (updates.beat_advance && !next.completed) {
    // The final beat must PLAY, not merely arrive: advancing while already on
    // the last beat is what closes the tale. (Before the Experience Cut,
    // arrival alone completed it — and the epilogue never got its turns.)
    // Once a seal is requested, the denouement clock below is the SOLE
    // authority on completion: a beat_advance may still walk the spine, but
    // closing the final beat yields to the countdown — the promised quiet
    // turns are never cut short by an eager beat.
    if (next.beatIndex >= next.spine.beats.length - 1) { if (!next.sealing) next.completed = true; }
    else next.beatIndex += 1;
  }

  // The honored early ending: once the player has asked for the seal, the
  // tale completes when the denouement turns have breathed.
  if (next.sealing && !next.completed && Number.isInteger(meta.turn) && meta.turn >= next.sealing.final_turn) {
    next.completed = true;
  }
  return next;
}

export function storyBlock(codex) {
  const beat = codex.spine.beats[codex.beatIndex];
  const roles = new Set(codex.cast.map((soul) => soul.role));
  const overdue = codex.spine.deadlines
    .filter((deadline) => codex.beatIndex >= deadline.byBeat)
    .flatMap((deadline) => deadline.roles)
    .filter((role) => !roles.has(role));
  const nearEnd = codex.beatIndex >= codex.spine.beats.length - 3;
  const sealing = Boolean(codex.sealing) && !codex.completed;
  return {
    beat: { index: codex.beatIndex, ...beat },
    evil_design: codex.beatIndex >= codex.spine.revealIdx ? codex.arc?.evil_plot || '' : '[GATED UNTIL REVELATION]',
    cast: codex.cast,
    regions: codex.regions,
    memoir: codex.memoir,
    wounds: codex.notes.slice(-8),
    directives: [
      ...(codex.completed ? ['The tale is sealed. Write nothing new; if asked, speak only a closing line.'] : []),
      ...(sealing ? ['SEAL THE TALE — the player has chosen to end with honor. These are denouement turns: quiet and combat-free; no new cast, no new threads; resolve what stands, let farewells be spoken, and bring the road home. If a cinematic is due, let it be the ending the tale has earned (victory, death, or bittersweet).'] : []),
      ...overdue.map((role) => `Introduce the overdue ${role} role naturally before advancing this beat.`),
      ...(nearEnd ? ['Reckon with neglected bonds, regions, promises, and consequences before the ending.'] : [])
    ]
  };
}
