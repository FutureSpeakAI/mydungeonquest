export const ABILITIES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
export const SKILLS = {
  Athletics: 'STR', Acrobatics: 'DEX', 'Sleight of Hand': 'DEX', Stealth: 'DEX',
  Arcana: 'INT', History: 'INT', Investigation: 'INT', Nature: 'INT', Religion: 'INT',
  'Animal Handling': 'WIS', Insight: 'WIS', Medicine: 'WIS', Perception: 'WIS', Survival: 'WIS',
  Deception: 'CHA', Intimidation: 'CHA', Performance: 'CHA', Persuasion: 'CHA'
};
export const XP_LEVELS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
export const CONDITIONS = {
  poisoned: 'Disadvantage on attack rolls and ability checks.',
  frightened: 'Disadvantage while the source of fear is visible; cannot willingly move closer.',
  restrained: 'Speed 0; disadvantage on attacks and Dexterity saves; attacks against you have advantage.',
  stunned: 'Incapacitated; automatically fail Strength and Dexterity saves; attacks against you have advantage.',
  paralyzed: 'Incapacitated; automatically fail Strength and Dexterity saves; adjacent hits are critical.',
  unconscious: 'Incapacitated and prone; automatically fail Strength and Dexterity saves.',
  blinded: 'Automatically fail sight checks; attacks have disadvantage and attacks against you have advantage.',
  prone: 'Crawl to move; attacks have disadvantage; adjacent attacks against you have advantage.'
};

const FULL_SLOTS = [
  [], [2], [3], [4,2], [4,3], [4,3,2], [4,3,3], [4,3,3,1], [4,3,3,2], [4,3,3,3,1],
  [4,3,3,3,2], [4,3,3,3,2,1], [4,3,3,3,2,1], [4,3,3,3,2,1,1], [4,3,3,3,2,1,1],
  [4,3,3,3,2,1,1,1], [4,3,3,3,2,1,1,1], [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1],
  [4,3,3,3,3,2,1,1,1], [4,3,3,3,3,2,2,1,1]
];
const HALF_SLOTS = [
  [], [], [2], [3], [3], [4,2], [4,2], [4,3], [4,3], [4,3,2], [4,3,2], [4,3,3],
  [4,3,3], [4,3,3,1], [4,3,3,1], [4,3,3,2], [4,3,3,2], [4,3,3,3,1], [4,3,3,3,1], [4,3,3,3,2], [4,3,3,3,2]
];
export const FULL_CASTERS = new Set(['wizard', 'cleric', 'druid', 'bard', 'sorcerer']);
export const HALF_CASTERS = new Set(['paladin', 'ranger']);

export const modifier = (score) => Math.floor((Number(score) - 10) / 2);
export const proficiency = (level) => 2 + Math.floor((Math.max(1, level) - 1) / 4);
export const levelForXp = (xp) => XP_LEVELS.reduce((level, threshold, index) => xp >= threshold ? index + 1 : level, 1);

// THE CASTING ARCHETYPES (XVIII, Article IV) — class names fold to an
// archetype in ONE seat; the warlock's energy tank is its own standing
// lane (pre-directive law) and rides beside full/half/none.
export function casterOf(className) {
  const key = String(className || '').toLowerCase();
  if (FULL_CASTERS.has(key)) return 'full';
  if (HALF_CASTERS.has(key)) return 'half';
  if (key === 'warlock') return 'energy';
  return 'none';
}

// THE SLOT ARITHMETIC (XVIII, Article IV) — the same band tables that
// govern the leveling law govern slots, by archetype, one seat. The
// energy archetype holds a tank, not slots (its own lane).
export function slotsForArchetype(archetype, level) {
  const row = archetype === 'full' ? FULL_SLOTS[level] : archetype === 'half' ? HALF_SLOTS[level] : [];
  return Object.fromEntries((row || []).map((count, index) => [index + 1, { max: count, current: count }]));
}

export function slotsFor(className, level) {
  return slotsForArchetype(casterOf(className), level);
}

export function createHero(input) {
  const className = input.className || 'Wayfarer';
  const caster = input.caster || casterOf(className);
  const abilities = input.abilities || { STR: 14, DEX: 13, CON: 15, INT: 10, WIS: 12, CHA: 8 };
  const con = abilities.CON || 12;
  const hitDie = Number(input.hitDie || 8);
  const hp = Math.max(1, hitDie + modifier(con));
  // THE DERIVED TRUTH (XVIII, Article I): AC is never stored opinion —
  // the forge derives the unarmored law (10 + DEX, uncapped) and any
  // stated input.ac dies here; equips re-settle it through the armory.
  return {
    id: 'hero', name: input.name || 'Nameless', sigil: input.sigil || '✦',
    ancestry: input.ancestry || 'Human', className, caster, hitDie,
    level: 1, xp: 0, hp, maxHp: hp, ac: 10 + modifier(abilities.DEX ?? 10), gold: 10,
    abilities,
    saves: input.saves || ['CON', 'WIS'], skills: input.skills || ['Perception', 'Survival', 'Persuasion'],
    inventory: ['Traveler’s pack'], conditions: [], spellSlots: slotsFor(className, 1),
    spellEnergy: caster === 'energy' ? { current: 3, max: 3 } : null,
    // THE GRIMOIRE (XVIII, Article IV): the learned list — picks are
    // validated at the forge's own picking surface (the door), sealed
    // here as keys; a non-caster is born with the empty shelf. The held
    // concentration (Article V) is born released.
    spells: Array.isArray(input.spells) ? input.spells.map((key) => String(key).trim().toLowerCase()).filter(Boolean) : [],
    concentration: null,
    deathSaves: { successes: 0, failures: 0 }, deathTouched: false, bondRescueUsed: false,
    // THE REST LAW (XVIII, Article III): the calendar day of the last
    // long rest — born null (never rested), stamped by the rest fold.
    lastRestDay: null,
    background: input.background || ''
  };
}

export function rollDie(sides, random = Math.random) {
  return Math.floor(random() * sides) + 1;
}

// THE TABLE'S-DICE LAW (Directive X, Law V) — ONE roll engine, two lawful
// actors: the hero and the sheeted companion fold the same way, and the
// result carries its owner's name. A death save is the plain die: no
// ability, no proficiency — a d20 against 10, the dark keeping score.
function tableRoll(actorId, abilities, level, conditions, request, random) {
  const isDeathSave = request.kind === 'death_save';
  const ability = request.ability || SKILLS[request.skill] || 'DEX';
  const poisoned = conditions.includes('poisoned');
  const frightened = conditions.includes('frightened');
  const restrainedDex = conditions.includes('restrained') && request.kind === 'save' && ability === 'DEX';
  // THE CONDITION LAW (Directive XII §II.1) — the attack teeth: a blinded,
  // prone, or restrained sheet swings at disadvantage. Standing teeth
  // (poisoned/frightened everywhere, restrained DEX saves) are untouched.
  const attackImpaired = request.kind === 'attack' && conditions.some((c) => ['blinded','prone','restrained'].includes(c));
  const autoFail = request.kind === 'save' && ['STR', 'DEX'].includes(ability) && conditions.some((c) => ['paralyzed','stunned','unconscious'].includes(c));
  let mode = request.advantage || 'normal';
  if (poisoned || frightened || restrainedDex || attackImpaired) mode = mode === 'advantage' ? 'normal' : 'disadvantage';
  const dice = [rollDie(20, random)];
  if (mode !== 'normal') dice.push(rollDie(20, random));
  const selected = mode === 'advantage' ? Math.max(...dice) : mode === 'disadvantage' ? Math.min(...dice) : dice[0];
  const mods = isDeathSave ? [] : [
    { source: ability, value: modifier(abilities[ability]) },
    ...(request.proficient ? [{ source: 'Proficiency', value: proficiency(level) }] : []),
    // A governed extra names its source (XVIII: the rune rides as a
    // NAMED modifier); requests without one keep the standing 'Other'.
    ...(request.extra_mod ? [{ source: request.extra_source ? String(request.extra_source).slice(0, 40) : 'Other', value: Number(request.extra_mod) }] : [])
  ];
  const total = autoFail ? 0 : selected + mods.reduce((sum, entry) => sum + entry.value, 0);
  const target = request.dc ?? (isDeathSave ? 10 : null);
  const outcome = autoFail ? 'failure' : selected === 20 ? 'critical_success' : selected === 1 ? 'critical_failure' : target == null ? 'success' : total >= target ? 'success' : 'failure';
  // THE SPOKEN DIE (Directive XII §II.3) — the fold names its mode and the
  // tooth that set it, so the ritual overlay can say WHY the second die
  // fell. A DM-granted swing with no tooth speaks as the DM's word; teeth
  // that eat a granted advantage are named as the crossing. Older sealed
  // resolutions simply lack these keys and the overlay stays silent.
  const biters = [...new Set([
    ...(poisoned ? ['poisoned'] : []), ...(frightened ? ['frightened'] : []),
    ...(restrainedDex ? ['restrained'] : []),
    ...(attackImpaired ? conditions.filter((c) => ['blinded', 'prone', 'restrained'].includes(c)) : [])
  ])];
  const asked = request.advantage || 'normal';
  const cause = autoFail ? conditions.filter((c) => ['paralyzed', 'stunned', 'unconscious'].includes(c)).join(' & ')
    : mode !== 'normal' && biters.length ? biters.join(' & ')
      : mode !== 'normal' ? 'the DM\u2019s word'
        : asked === 'advantage' && biters.length ? `advantage crossed by ${biters.join(' & ')}`
          : null;
  return { requestId: request.id, actorId, targetId: request.target_id || null, actionId: request.action_id || null, rawDice: dice, selectedDie: selected, modifiers: mods, total, dcOrAc: target, outcome, mode, cause, appliedEffects: [] };
}

export function heroRoll(hero, request, random = Math.random) {
  return tableRoll('hero', hero.abilities, hero.level, hero.conditions, request, random);
}

// The sheet-bearing sibling: a sheeted companion's die, folded from the
// companion's own sheet — conditions included, since Directive XII §II.2
// made the sheet's condition lane law. Sheets sealed before that law
// carry none and fold as empty, fail-closed.
export function companionRoll(name, sheet, request, random = Math.random) {
  const conditions = Array.isArray(sheet.conditions) ? sheet.conditions : [];
  return tableRoll(String(name ?? '').trim(), sheet.abilities, sheet.level, conditions, request, random);
}

export function applyStateUpdates(hero, updates, meta = {}) {
  if (!updates) return hero;
  const next = structuredClone(hero);
  next.hp = Math.max(0, Math.min(next.maxHp, next.hp + Number(updates.hp_delta || 0)));
  // THE DOOM LAW (Directive X, Law VII) — breath returning clears the
  // deathbed: above zero the saves reset and the stable-at-zero mark lifts.
  // The permanent seal (dead) is not this fold's to touch.
  if (next.hp > 0) {
    if (next.stableAtZero) next.stableAtZero = false;
    if (next.deathSaves && (next.deathSaves.successes || next.deathSaves.failures)) next.deathSaves = { successes: 0, failures: 0 };
  }
  next.xp = Math.max(0, next.xp + Math.max(0, Number(updates.xp_gain || 0)));
  next.gold = Math.max(0, next.gold + Number(updates.gold_delta || 0));
  // THE DERIVED TRUTH (XVIII, Article I): the ac_set lane is retired —
  // AC settles from the worn table rows alone (armory.settleAc); an old
  // sealed turn carrying ac_set folds to nothing, harmless on replay.
  for (const item of updates.add_items || []) if (!next.inventory.includes(item)) next.inventory.push(String(item).slice(0, 120));
  next.inventory = next.inventory.filter((item) => !(updates.remove_items || []).includes(item));
  for (const condition of updates.add_conditions || []) if (CONDITIONS[condition] && !next.conditions.includes(condition)) next.conditions.push(condition);
  next.conditions = next.conditions.filter((condition) => !(updates.remove_conditions || []).includes(condition));
  if (updates.slot_spend) spendSlot(next, Number(updates.slot_spend));
  if (updates.rest === 'long') {
    next.hp = next.maxHp;
    for (const slot of Object.values(next.spellSlots)) slot.current = slot.max;
    if (next.spellEnergy) next.spellEnergy.current = next.spellEnergy.max;
    // THE CASTING LAW (XVIII, Article V): the night releases a held
    // concentration — sleep is the one release that needs no note.
    if (next.concentration !== undefined) next.concentration = null;
    // THE REST LAW (XVIII, Article III): the rest stamps the calendar
    // day it blessed so the door can refuse a second before the day
    // turns; an unstamped fold (older callers) keeps the standing mark.
    if (Number.isInteger(meta.day)) next.lastRestDay = meta.day;
  }
  // THE MILESTONE LAW (Directive XII §I) — the level no longer derives
  // from experience. XP stays a kept ledger of deeds; the level is the
  // road's own milestone, folded by milestoneLevel from the spine's
  // standing beat. The lantern is not the road.
  return next;
}

// ------------------------------------------------------------
// THE MILESTONE LAW (Directive XII §I) — levels 1..5 from spine
// progress alone. Four thresholds by name: the first beat of Act II,
// the Revelation beat, the first beat of Act III, the final beat.
// Monotone and clamped; a spine missing a threshold simply never
// grants that rise — fail closed, never invent a level.
// ------------------------------------------------------------
export function milestoneThresholds(spine) {
  const beats = Array.isArray(spine?.beats) ? spine.beats : [];
  if (!beats.length) return null;
  const firstOfAct = (act) => beats.findIndex((beat) => Number(beat?.act) === act);
  return {
    act2: firstOfAct(2),
    reveal: Number.isInteger(spine?.revealIdx) ? spine.revealIdx : -1,
    act3: firstOfAct(3),
    final: beats.length - 1
  };
}

export function milestoneLevel(spine, beatIndex) {
  const thresholds = milestoneThresholds(spine);
  if (!thresholds || !Number.isInteger(beatIndex) || beatIndex < 0) return 1;
  let level = 1;
  for (const at of [thresholds.act2, thresholds.reveal, thresholds.act3, thresholds.final]) {
    if (at >= 0 && beatIndex >= at) level += 1;
  }
  return Math.max(1, Math.min(5, level));
}

// What a rise gives, in numbers (§I.4): each level adds
// floor(hitDie/2) + 1 + CON modifier to maximum AND current hit
// points, never less than 1 per rise; proficiency keeps its standing
// formula; spell slots re-derive at the new level carrying their
// spent counts. The fold is monotone — it refuses a lower level.
export function applyMilestone(hero, level) {
  const target = Math.max(1, Math.min(5, Math.trunc(Number(level) || 1)));
  if (!hero || target <= (Number(hero.level) || 1)) return hero;
  const next = structuredClone(hero);
  const perRise = Math.max(1, Math.floor(Number(next.hitDie || 8) / 2) + 1 + modifier(next.abilities?.CON ?? 10));
  const rises = target - (Number(next.level) || 1);
  next.maxHp = Math.max(1, Number(next.maxHp || 1) + perRise * rises);
  next.hp = Math.max(1, Number(next.hp || 0) + perRise * rises);
  next.level = target;
  const fresh = slotsFor(next.className, target);
  for (const [slotLevel, slot] of Object.entries(fresh)) {
    const old = next.spellSlots?.[slotLevel];
    const spent = old ? Math.max(0, (Number(old.max) || 0) - (Number(old.current) || 0)) : 0;
    slot.current = Math.max(0, slot.max - spent);
  }
  next.spellSlots = fresh;
  return next;
}

export function spendSlot(hero, requestedLevel) {
  const levels = Object.keys(hero.spellSlots).map(Number).sort((a,b) => a-b);
  const usable = levels.find((level) => level >= requestedLevel && hero.spellSlots[level].current > 0);
  if (usable) hero.spellSlots[usable].current -= 1;
  return usable || null;
}

// THE CASTING FOLD (XVIII, Article V) — pure and identity-on-refusal: a
// cast spends EXACTLY one slot of the spell's own level (never the
// upcast walk spendSlot takes for the legacy lane); cantrips are
// slotless; the energy tank spends one charge a circle-cast. A second
// concentration while one holds is refused WHOLE unless the same op
// carries the release; the release itself is the sealed note's business
// at the story fold. The refused caller receives the SAME object back —
// identity is the refusal's signature.
export function applyCast(hero, spellRow, { release = false } = {}) {
  if (!hero || !spellRow || !Number.isInteger(spellRow.level)) return hero;
  if (spellRow.concentration && hero.concentration && release !== true) return hero;
  const next = structuredClone(hero);
  if (spellRow.level >= 1) {
    if (next.caster === 'energy') {
      if (!next.spellEnergy || next.spellEnergy.current < 1) return hero;
      next.spellEnergy.current -= 1;
    } else {
      const slot = next.spellSlots?.[spellRow.level];
      if (!slot || slot.current < 1) return hero;
      slot.current -= 1;
    }
  }
  if (release === true && next.concentration) next.concentration = null;
  if (spellRow.concentration) next.concentration = spellRow.key || null;
  return next;
}

// THE ROUND LAW (Directive X, Law III) — the order is sealed ONCE when
// battle opens, as an operation: device draws for the player's side
// (d20 + DEX for the hero; companions draw plain until sheets are law),
// pool draws for enemy species groups — pack initiative, every instance
// of a group sharing its drawn die. Ties break toward the player's side,
// then by name — determinism is law. Death and flight never reshuffle
// the sealed order; the fallen keep their seats.
export function sealInitiative({ hero, party = [], enemies = [], draws = [], random = Math.random }) {
  const canon = (value) => String(value ?? '').trim().toLowerCase();
  const rows = [];
  rows.push({ id: hero.id || 'hero', name: hero.name, side: 'player', total: rollDie(20, random) + modifier(hero.abilities.DEX), hero: true });
  for (const companion of party) {
    const name = typeof companion === 'string' ? companion : companion?.name;
    if (!name) continue;
    rows.push({ id: `party-${canon(name).replace(/[^a-z0-9]+/g, '-')}`, name, side: 'player', total: rollDie(20, random), hero: false });
  }
  const drawByGroup = new Map();
  for (const draw of draws) if (draw && typeof draw === 'object') drawByGroup.set(canon(draw.group), Number(draw.value) || 0);
  for (const enemy of enemies) {
    const groupKey = drawByGroup.has(canon(enemy.species)) ? canon(enemy.species) : canon(enemy.id);
    rows.push({ id: enemy.id, name: enemy.name, side: 'enemy', total: drawByGroup.get(groupKey) ?? 0, hero: false });
  }
  return rows.sort((a, b) => (b.total - a.total)
    || (a.side !== b.side ? (a.side === 'player' ? -1 : 1) : 0)
    || (canon(a.name) < canon(b.name) ? -1 : canon(a.name) > canon(b.name) ? 1 : 0));
}

export function rollInitiative(hero, enemies, random = Math.random) {
  const entries = [
    { id: hero.id, name: hero.name, total: rollDie(20, random) + modifier(hero.abilities.DEX), zone: 'engaged', hero: true },
    ...enemies.map((enemy) => ({ id: enemy.id, name: enemy.name, total: rollDie(20, random) + Number(enemy.init_mod || 0), zone: enemy.zone, hero: false }))
  ];
  return entries.sort((a,b) => b.total - a.total);
}

// THE COMPANION-SHEET LAW (Directive X, Law VI) — THE ROLE TABLE fixes the
// spread, the band, and the growth; hit points are arithmetic, never model
// numbers. The sigil is the owner's mark on the roll surface.
// THE CASTING COLUMN (XVIII, Article IV): each calling's archetype is a
// fixed table cell — full, half, or none. No prose may promote a calling.
export const ROLE_TABLE = {
  guardian:   { spread: { STR: 15, DEX: 12, CON: 14, INT: 8,  WIS: 12, CHA: 10 }, bandHp: 12, perLevel: 7, sigil: '▲', casting: 'none' },
  skirmisher: { spread: { STR: 12, DEX: 15, CON: 12, INT: 10, WIS: 13, CHA: 10 }, bandHp: 9,  perLevel: 5, sigil: '➤', casting: 'none' },
  mender:     { spread: { STR: 10, DEX: 12, CON: 13, INT: 12, WIS: 15, CHA: 10 }, bandHp: 8,  perLevel: 4, sigil: '✚', casting: 'full' },
  trickster:  { spread: { STR: 10, DEX: 15, CON: 12, INT: 13, WIS: 10, CHA: 14 }, bandHp: 8,  perLevel: 5, sigil: '◆', casting: 'half' }
};

// hp = bandHp(role) + (level − 1) × perLevel(role). An unlawful role or
// level returns null — fail closed, never invent a sheet.
export function sheetFor(role, level) {
  const row = ROLE_TABLE[String(role || '').toLowerCase()];
  if (!row || !Number.isInteger(level) || level < 1 || level > 5) return null;
  const hp = row.bandHp + (level - 1) * row.perLevel;
  // conditions born empty (Directive XII §II.2); sheets sealed before
  // that law lack the lane and every reader defends with `|| []`.
  return { role: String(role).toLowerCase(), level, sigil: row.sigil, abilities: { ...row.spread }, hp, maxHp: hp, deathSaves: { successes: 0, failures: 0 }, conditions: [] };
}

// THE DOOM LAW (Directive X, Law VII) — three-and-three, a pure fold: each
// resolved save moves one count; three successes stand stable at zero,
// three failures seal death. A sealed bed refuses a fourth save — the
// fold returns the seal unchanged. No resurrection retcons ride here.
export function foldDeathSave(saves, outcome) {
  const current = { successes: Math.max(0, Math.trunc(Number(saves?.successes) || 0)), failures: Math.max(0, Math.trunc(Number(saves?.failures) || 0)) };
  if (current.successes >= 3) return { deathSaves: current, verdict: 'stable' };
  if (current.failures >= 3) return { deathSaves: current, verdict: 'dead' };
  const success = outcome === 'success' || outcome === 'critical_success';
  const next = { successes: current.successes + (success ? 1 : 0), failures: current.failures + (success ? 0 : 1) };
  return { deathSaves: next, verdict: next.successes >= 3 ? 'stable' : next.failures >= 3 ? 'dead' : 'pending' };
}
