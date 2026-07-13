import { getSpine } from './spines.js';

const REGION_STATES = ['thriving', 'troubled', 'corrupted', 'ruined', 'healed'];
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n) || 0));
const clean = (value, max = 500) => String(value || '').trim().slice(0, max);

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

export function applyStoryUpdates(codex, updates) {
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
    const exists = next.cast.some((entry) => entry.name.toLowerCase() === String(soul.name).trim().toLowerCase());
    if (exists) {
      next.notes.push(`Canon attack blocked: ${clean(soul.name, 80)} was already introduced.`);
      continue;
    }
    if (soul.role === 'villain' && next.cast.some((entry) => entry.role === 'villain')) {
      next.notes.push(`Second villain blocked: ${clean(soul.name, 80)}.`);
      continue;
    }
    next.cast.push({
      id: soul.id || `soul-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
      name: clean(soul.name, 80), role: clean(soul.role, 40),
      visual: clean(soul.visual, 360), voice: clean(soul.voice, 180),
      goal: clean(soul.goal, 300), secret: clean(soul.secret, 300),
      status: 'active', bond: 0, last_seen: null
    });
  }

  for (const patch of updates.cast_update || []) {
    const soul = next.cast.find((entry) => entry.name.toLowerCase() === String(patch.name).toLowerCase());
    if (!soul) continue;
    if (patch.status) soul.status = clean(patch.status, 60);
    soul.bond = clamp(soul.bond + (patch.bond_delta || 0), 0, 4);
    if (patch.last_seen) soul.last_seen = clean(patch.last_seen, 160);
  }

  const world = updates.world;
  if (world) {
    next.blight = clamp(next.blight + (world.blight_delta || 0), 0, 5);
    if (world.region_add && !next.regions.some((region) => region.name.toLowerCase() === String(world.region_add.name).toLowerCase())) {
      next.regions.push({
        id: world.region_add.id || `region-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        name: clean(world.region_add.name, 100), visual: clean(world.region_add.visual, 360), state: 'thriving'
      });
    }
    if (world.region_update) {
      const region = next.regions.find((entry) => entry.name.toLowerCase() === String(world.region_update.name).toLowerCase());
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
