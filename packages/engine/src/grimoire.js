// ---------------------------------------------------------------------------
// THE GRIMOIRE (Experience Directive XVIII, Article IV) — the spell library
// is DATA: ≥40 SRD 5.1 entries, cantrips and levels 1–3, one seat beside the
// armory. Every effect speaks ONLY through existing op families — damage via
// the roll path, conditions via the sheet_condition/add_conditions lane,
// healing via the hp path. No new effect machinery is born here; a spell the
// tables cannot express this way is not in the library. The visual clause is
// byte-stable: the painter receives it verbatim down the one road, never
// paraphrased (Article VI).
//
// MECHANICS FROM TABLES, FLAVOR FROM THE TALE: prose may clothe any row in
// any words; the numbers live here and only here.
// ---------------------------------------------------------------------------
import { CONDITIONS, modifier, proficiency, slotsForArchetype } from './rules.js';

// resolution: 'attack' (spell attack roll), 'save' (save-vs-ability, the
// `save` field names the ability), 'auto' (no roll). effect keys are the
// WHOLE effect vocabulary: damage 'NdM' or 'NdM+K' (the roll path), heal
// 'NdM' (the hp path), condition <SRD key> (the condition lane). A spell
// with an empty effect is utility — the tale carries it, the tables don't.
export const SPELL_TABLE = {
  // --- cantrips (level 0) — slotless, full casters' craft ---
  'fire bolt':        { level: 0, school: 'evocation',     archetypes: ['full'], resolution: 'attack', save: null,  effect: { damage: '1d10' }, concentration: false, visual: 'a mote of orange flame streaking in a dead-straight line, ember tail' },
  'sacred flame':     { level: 0, school: 'evocation',     archetypes: ['full'], resolution: 'save',   save: 'DEX', effect: { damage: '1d8' },  concentration: false, visual: 'a column of pale gold light falling from directly above' },
  'ray of frost':     { level: 0, school: 'evocation',     archetypes: ['full'], resolution: 'attack', save: null,  effect: { damage: '1d8' },  concentration: false, visual: 'a blue-white beam trailing a glitter of frost crystals' },
  'shocking grasp':   { level: 0, school: 'evocation',     archetypes: ['full'], resolution: 'attack', save: null,  effect: { damage: '1d8' },  concentration: false, visual: 'forked white sparks leaping from an open palm' },
  'poison spray':     { level: 0, school: 'conjuration',   archetypes: ['full'], resolution: 'save',   save: 'CON', effect: { damage: '1d12' }, concentration: false, visual: 'a puff of sickly green vapor bursting at arm\u2019s reach' },
  'chill touch':      { level: 0, school: 'necromancy',    archetypes: ['full'], resolution: 'attack', save: null,  effect: { damage: '1d8' },  concentration: false, visual: 'a skeletal ghost-hand of cold gray ash clutching at the mark' },
  'light':            { level: 0, school: 'evocation',     archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: false, visual: 'a steady candle-white glow clinging to one touched thing' },
  'mage hand':        { level: 0, school: 'conjuration',   archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: false, visual: 'a translucent floating hand with a faint violet shimmer' },
  'minor illusion':   { level: 0, school: 'illusion',      archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: false, visual: 'a small phantom image wavering at its edges like heat-haze' },
  'guidance':         { level: 0, school: 'divination',    archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: true,  visual: 'a thin silver thread of light winding about an ally\u2019s hands' },
  // --- first circle ---
  'magic missile':    { level: 1, school: 'evocation',     archetypes: ['full'], resolution: 'auto',   save: null,  effect: { damage: '3d4+3' }, concentration: false, visual: 'three darts of blue-white force curving unerringly to the mark' },
  'cure wounds':      { level: 1, school: 'evocation',     archetypes: ['full', 'half'], resolution: 'auto', save: null, effect: { heal: '1d8' }, concentration: false, visual: 'warm amber light pooling beneath laid-on hands' },
  'healing word':     { level: 1, school: 'evocation',     archetypes: ['full'], resolution: 'auto',   save: null,  effect: { heal: '1d4' },    concentration: false, visual: 'a single spoken word glowing briefly as motes of dawn light' },
  'burning hands':    { level: 1, school: 'evocation',     archetypes: ['full'], resolution: 'save',   save: 'DEX', effect: { damage: '3d6' },  concentration: false, visual: 'a fan of flame sheeting out from spread fingertips' },
  'thunderwave':      { level: 1, school: 'evocation',     archetypes: ['full'], resolution: 'save',   save: 'CON', effect: { damage: '2d8' },  concentration: false, visual: 'a visible ring of concussed air bursting outward from the caster' },
  'charm person':     { level: 1, school: 'enchantment',   archetypes: ['full', 'half'], resolution: 'save', save: 'WIS', effect: {},          concentration: false, visual: 'a soft rose-gold light passing behind the target\u2019s eyes' },
  'sleep':            { level: 1, school: 'enchantment',   archetypes: ['full'], resolution: 'save',   save: 'WIS', effect: { condition: 'unconscious' }, concentration: false, visual: 'a drift of glittering sand settling over drooping eyelids' },
  'bless':            { level: 1, school: 'enchantment',   archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: true,  visual: 'motes of white-gold light ringing the brows of the blessed' },
  'bane':             { level: 1, school: 'enchantment',   archetypes: ['full'], resolution: 'save',   save: 'CHA', effect: {},                 concentration: true,  visual: 'a thin veil of gray dimming the outlines of the accursed' },
  'faerie fire':      { level: 1, school: 'evocation',     archetypes: ['full'], resolution: 'save',   save: 'DEX', effect: {},                 concentration: true,  visual: 'every edge of the targets limned in cold violet-blue glow' },
  'entangle':         { level: 1, school: 'conjuration',   archetypes: ['full', 'half'], resolution: 'save', save: 'STR', effect: { condition: 'restrained' }, concentration: true, visual: 'grasping vines erupting through the soil in a green tangle' },
  'hunter\u2019s mark': { level: 1, school: 'divination',  archetypes: ['half'], resolution: 'auto',   save: null,  effect: {},                 concentration: true,  visual: 'a faint red sigil hanging in the air over the quarry\u2019s heart' },
  'guiding bolt':     { level: 1, school: 'evocation',     archetypes: ['full'], resolution: 'attack', save: null,  effect: { damage: '4d6' },  concentration: false, visual: 'a lance of dawn-colored light leaving a glittering mote-trail' },
  'inflict wounds':   { level: 1, school: 'necromancy',    archetypes: ['full'], resolution: 'attack', save: null,  effect: { damage: '3d10' }, concentration: false, visual: 'a clawed shadow flaring around the caster\u2019s gripping hand' },
  // --- second circle ---
  'scorching ray':    { level: 2, school: 'evocation',     archetypes: ['full'], resolution: 'attack', save: null,  effect: { damage: '2d6' },  concentration: false, visual: 'thin ropes of fire snapping across the air like whipcracks' },
  'hold person':      { level: 2, school: 'enchantment',   archetypes: ['full'], resolution: 'save',   save: 'WIS', effect: { condition: 'paralyzed' }, concentration: true, visual: 'the target seized rigid, veined in faint gray stone-light' },
  'misty step':       { level: 2, school: 'conjuration',   archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: false, visual: 'the caster dissolving into silver mist and reforming paces away' },
  'invisibility':     { level: 2, school: 'illusion',      archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: true,  visual: 'the subject\u2019s outline thinning to warped glass and then gone' },
  'web':              { level: 2, school: 'conjuration',   archetypes: ['full'], resolution: 'save',   save: 'DEX', effect: { condition: 'restrained' }, concentration: true, visual: 'thick ropes of gray-white webbing filling the space corner to corner' },
  'shatter':          { level: 2, school: 'evocation',     archetypes: ['full'], resolution: 'save',   save: 'CON', effect: { damage: '3d8' },  concentration: false, visual: 'a ringing crack of force, dust leaping from every nearby surface' },
  'spiritual weapon': { level: 2, school: 'evocation',     archetypes: ['full'], resolution: 'attack', save: null,  effect: { damage: '1d8' },  concentration: false, visual: 'a floating weapon of translucent golden light striking unheld' },
  'lesser restoration': { level: 2, school: 'abjuration',  archetypes: ['full', 'half'], resolution: 'auto', save: null, effect: {},            concentration: false, visual: 'a wash of clean white light scouring gray sickness from the flesh' },
  'blindness':        { level: 2, school: 'necromancy',    archetypes: ['full'], resolution: 'save',   save: 'CON', effect: { condition: 'blinded' }, concentration: false, visual: 'a smear of ink-dark shadow drawn across the target\u2019s eyes' },
  'moonbeam':         { level: 2, school: 'evocation',     archetypes: ['full'], resolution: 'save',   save: 'CON', effect: { damage: '2d10' }, concentration: true,  visual: 'a cold silver column of moonlight standing on the ground' },
  'pass without trace': { level: 2, school: 'abjuration',  archetypes: ['full', 'half'], resolution: 'auto', save: null, effect: {},            concentration: true,  visual: 'shadows pooling and clinging to the party like drawn cloaks' },
  'prayer of healing': { level: 2, school: 'evocation',    archetypes: ['full'], resolution: 'auto',   save: null,  effect: { heal: '2d8' },    concentration: false, visual: 'rings of soft gold light widening over bowed heads' },
  // --- third circle ---
  'fireball':         { level: 3, school: 'evocation',     archetypes: ['full'], resolution: 'save',   save: 'DEX', effect: { damage: '8d6' },  concentration: false, visual: 'a bead of orange light blooming into a rolling sphere of flame' },
  'lightning bolt':   { level: 3, school: 'evocation',     archetypes: ['full'], resolution: 'save',   save: 'DEX', effect: { damage: '8d6' },  concentration: false, visual: 'a blue-white line of lightning splitting the air dead straight' },
  'counterspell':     { level: 3, school: 'abjuration',    archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: false, visual: 'a lattice of violet glyphs snapping shut in the empty air' },
  'dispel magic':     { level: 3, school: 'abjuration',    archetypes: ['full', 'half'], resolution: 'auto', save: null, effect: {},            concentration: false, visual: 'threads of colored light unraveling and guttering out' },
  'fly':              { level: 3, school: 'transmutation', archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: true,  visual: 'pale spectral wings of shimmer unfolding at the subject\u2019s back' },
  'haste':            { level: 3, school: 'transmutation', archetypes: ['full'], resolution: 'auto',   save: null,  effect: {},                 concentration: true,  visual: 'the subject\u2019s outline doubling with golden after-images' },
  'mass healing word': { level: 3, school: 'evocation',    archetypes: ['full'], resolution: 'auto',   save: null,  effect: { heal: '1d4' },    concentration: false, visual: 'one spoken word rippling outward as widening rings of dawn light' },
  'spirit guardians': { level: 3, school: 'conjuration',   archetypes: ['full'], resolution: 'save',   save: 'WIS', effect: { damage: '3d8' },  concentration: true,  visual: 'a slow orbit of translucent winged figures circling the caster' }
};

// The seating law for spells: mechanics ops cite EXACT keys (case- and
// trim-blind), never fuzzy prose — free text died at this door (Article IV).
export function spellRowFor(name) {
  const key = String(name ?? '').trim().toLowerCase();
  const row = SPELL_TABLE[key];
  return row ? { key, ...row } : null;
}

// THE LEARNING CEILINGS — cumulative known counts by archetype and level
// (levels 1..5, the milestone band). Fixed counts, never prose-promoted;
// the energy archetype learns on the full caster's row (its tank differs,
// its schooling does not). Index 0 is unused padding.
const LEARN_FULL = [null, { cantrips: 3, spells: 4 }, { cantrips: 3, spells: 5 }, { cantrips: 4, spells: 6 }, { cantrips: 4, spells: 7 }, { cantrips: 4, spells: 8 }];
const LEARN_HALF = [null, { cantrips: 0, spells: 0 }, { cantrips: 0, spells: 2 }, { cantrips: 0, spells: 3 }, { cantrips: 0, spells: 4 }, { cantrips: 0, spells: 5 }];
const LEARN_NONE = { cantrips: 0, spells: 0 };
export function knownCountsFor(archetype, level) {
  const at = Math.max(1, Math.min(5, Math.trunc(Number(level) || 1)));
  if (archetype === 'full' || archetype === 'energy') return { ...LEARN_FULL[at] };
  if (archetype === 'half') return { ...LEARN_HALF[at] };
  return { ...LEARN_NONE };
}

// The highest circle an archetype may cast at a level — read off the slot
// tables themselves (one arithmetic, one seat): the energy tank casts by
// the full table's unlocking. Cantrips (level 0) are always castable where
// counts allow.
export function maxSpellLevelFor(archetype, level) {
  const table = archetype === 'energy' ? 'full' : archetype;
  const slots = slotsForArchetype(table, Math.max(1, Math.min(5, Math.trunc(Number(level) || 1))));
  const levels = Object.keys(slots).map(Number);
  return levels.length ? Math.max(...levels) : 0;
}

// THE PICKING DOOR (Article IV) — picks land as sealed ops validated
// against archetype, level, and count; never free text. Refusals are
// whole: one unlawful pick fells the batch (the repair-retry law's shape).
export function validateSpellPicks({ archetype = 'none', level = 1, known = [], picks = [] }) {
  const errors = [];
  if (!Array.isArray(picks) || picks.length === 0) errors.push('picks must be a non-empty list of spell keys');
  const knownKeys = new Set((Array.isArray(known) ? known : []).map((k) => String(k).trim().toLowerCase()));
  const ceilings = knownCountsFor(archetype, level);
  const maxLevel = maxSpellLevelFor(archetype, level);
  const seen = new Set();
  let cantrips = [...knownKeys].filter((k) => SPELL_TABLE[k]?.level === 0).length;
  let leveled = [...knownKeys].filter((k) => (SPELL_TABLE[k]?.level ?? 0) >= 1).length;
  for (const pick of Array.isArray(picks) ? picks : []) {
    const row = spellRowFor(pick);
    if (!row) { errors.push(`no such spell in the grimoire: ${String(pick).slice(0, 40)}`); continue; }
    if (seen.has(row.key) || knownKeys.has(row.key)) { errors.push(`${row.key} is already learned`); continue; }
    seen.add(row.key);
    const table = archetype === 'energy' ? 'full' : archetype;
    if (!row.archetypes.includes(table)) { errors.push(`${row.key} is not taught to the ${archetype} archetype`); continue; }
    if (row.level > maxLevel) { errors.push(`${row.key} sits above the reachable circle (${row.level} > ${maxLevel})`); continue; }
    if (row.level === 0) cantrips += 1; else leveled += 1;
  }
  if (cantrips > ceilings.cantrips) errors.push(`cantrip count would break the ceiling (${cantrips} > ${ceilings.cantrips})`);
  if (leveled > ceilings.spells) errors.push(`spell count would break the ceiling (${leveled} > ${ceilings.spells})`);
  return { ok: errors.length === 0, errors };
}

// THE COMPANION SHELF — fixed lists by calling, sliced by the same
// ceilings; no picking surface for sheets, no prose promotion. Lists hold
// only spells the calling's archetype may lawfully learn.
const ROLE_SHELVES = {
  mender:    { cantrips: ['sacred flame', 'guidance'], spells: ['cure wounds', 'healing word', 'bless', 'prayer of healing', 'lesser restoration', 'hold person', 'mass healing word', 'spirit guardians'] },
  trickster: { cantrips: [], spells: ['charm person', 'entangle', 'pass without trace', 'cure wounds', 'dispel magic'] }
};
export function companionSpellsFor(role, level, casting) {
  const shelf = ROLE_SHELVES[String(role || '').toLowerCase()];
  if (!shelf || !casting || casting === 'none') return [];
  const counts = knownCountsFor(casting, level);
  return [...shelf.cantrips.slice(0, counts.cantrips), ...shelf.spells.slice(0, counts.spells)];
}

// The casting ability by calling and by class — one seat, prose never
// promotes it. Used for the save DC the tables derive.
export const CASTING_ABILITY = {
  wizard: 'INT', cleric: 'WIS', druid: 'WIS', bard: 'CHA', sorcerer: 'CHA',
  paladin: 'CHA', ranger: 'WIS', warlock: 'CHA', mender: 'WIS', trickster: 'CHA'
};
export function spellSaveDc(caster) {
  const ability = CASTING_ABILITY[String(caster?.className || caster?.role || '').toLowerCase()] || 'WIS';
  return 8 + proficiency(Number(caster?.level) || 1) + modifier(caster?.abilities?.[ability] ?? 10);
}

// THE CASTER'S LINE (Article V, Cache Posture §2) — the dynamic casting
// evidence, seated LAST in the [STATE] block by its builder: slots by
// level, the held concentration, and the learned list the refusal matrix
// reads. Non-casters ride null so the line stays honest and small.
export function casterLineOf(hero) {
  if (!hero || (hero.caster || 'none') === 'none') return null;
  const slots = Object.fromEntries(Object.entries(hero.spellSlots || {}).map(([lvl, slot]) => [lvl, `${slot.current}/${slot.max}`]));
  return {
    archetype: hero.caster,
    spells: Array.isArray(hero.spells) ? [...hero.spells] : [],
    slots,
    ...(hero.spellEnergy ? { energy: `${hero.spellEnergy.current}/${hero.spellEnergy.max}` } : {}),
    concentration: hero.concentration || null
  };
}

// THE PAINTED SPELL (Article VI) — the clause the easel receives, byte
// for byte from the table row; null when no cast rides the turn.
export function spellClauseFor(story) {
  const cast = story?.cast_spell;
  if (!cast || typeof cast !== 'object' || Array.isArray(cast)) return null;
  return spellRowFor(cast.spell)?.visual || null;
}
