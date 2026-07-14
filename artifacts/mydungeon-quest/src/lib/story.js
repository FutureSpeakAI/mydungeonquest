import { getSpine } from './spines.js';
import { castVoiceByCard } from './cinema/casting.js';

const REGION_STATES = ['thriving', 'troubled', 'corrupted', 'ruined', 'healed'];
// The status law: a soul is exactly one of these. Anything else the DM sends
// is refused (noted as a wound), never written to canon. 'dead' is permanent
// downstream — the validator forbids the dead to speak from the next turn on.
export const CAST_STATUS = ['active', 'dead', 'missing'];
const MAX_FACTS = 10;
const MAX_BOND_ARC = 12;

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const clean = (value, max = 500) => String(value || '').trim().slice(0, max);
const canonName = (value) => String(value ?? '').trim().toLowerCase();

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

// meta.turn — the turn number being applied. Stamped onto new cast cards
// (introduced_turn) and bond-arc entries so the storybook can narrate
// relationships truthfully ("by turn 9, she trusted you"). Optional: sealed
// replays and old call sites simply record null.
export function applyStoryUpdates(codex, updates, meta = {}) {
  if (!updates) return codex;
  const next = structuredClone(codex);
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
    next.beatIndex = Math.min(next.beatIndex + 1, next.spine.beats.length - 1);
    if (next.beatIndex === next.spine.beats.length - 1) next.completed = true;
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
  return {
    beat: { index: codex.beatIndex, ...beat },
    evil_design: codex.beatIndex >= codex.spine.revealIdx ? codex.arc?.evil_plot || '' : '[GATED UNTIL REVELATION]',
    cast: codex.cast,
    regions: codex.regions,
    memoir: codex.memoir,
    wounds: codex.notes.slice(-8),
    directives: [
      ...overdue.map((role) => `Introduce the overdue ${role} role naturally before advancing this beat.`),
      ...(nearEnd ? ['Reckon with neglected bonds, regions, promises, and consequences before the ending.'] : [])
    ]
  };
}
