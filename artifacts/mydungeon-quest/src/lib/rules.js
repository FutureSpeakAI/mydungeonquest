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

export function slotsFor(className, level) {
  const key = String(className || '').toLowerCase();
  const row = FULL_CASTERS.has(key) ? FULL_SLOTS[level] : HALF_CASTERS.has(key) ? HALF_SLOTS[level] : [];
  return Object.fromEntries((row || []).map((count, index) => [index + 1, { max: count, current: count }]));
}

export function createHero(input) {
  const className = input.className || 'Wayfarer';
  const caster = input.caster || (FULL_CASTERS.has(className.toLowerCase()) ? 'full' : HALF_CASTERS.has(className.toLowerCase()) ? 'half' : 'none');
  const con = input.abilities?.CON || 12;
  const hitDie = Number(input.hitDie || 8);
  const hp = Math.max(1, hitDie + modifier(con));
  return {
    id: 'hero', name: input.name || 'Nameless', sigil: input.sigil || '✦',
    ancestry: input.ancestry || 'Human', className, caster, hitDie,
    level: 1, xp: 0, hp, maxHp: hp, ac: Number(input.ac || 12), gold: 10,
    abilities: input.abilities || { STR: 14, DEX: 13, CON: 15, INT: 10, WIS: 12, CHA: 8 },
    saves: input.saves || ['CON', 'WIS'], skills: input.skills || ['Perception', 'Survival', 'Persuasion'],
    inventory: ['Traveler’s pack'], conditions: [], spellSlots: slotsFor(className, 1),
    spellEnergy: caster === 'energy' ? { current: 3, max: 3 } : null,
    deathSaves: { successes: 0, failures: 0 }, deathTouched: false, bondRescueUsed: false,
    background: input.background || ''
  };
}

export function rollDie(sides, random = Math.random) {
  return Math.floor(random() * sides) + 1;
}

export function heroRoll(hero, request, random = Math.random) {
  const ability = request.ability || SKILLS[request.skill] || 'DEX';
  const poisoned = hero.conditions.includes('poisoned');
  const frightened = hero.conditions.includes('frightened');
  const restrainedDex = hero.conditions.includes('restrained') && request.kind === 'save' && ability === 'DEX';
  const autoFail = request.kind === 'save' && ['STR', 'DEX'].includes(ability) && hero.conditions.some((c) => ['paralyzed','stunned','unconscious'].includes(c));
  let mode = request.advantage || 'normal';
  if (poisoned || frightened || restrainedDex) mode = mode === 'advantage' ? 'normal' : 'disadvantage';
  const dice = [rollDie(20, random)];
  if (mode !== 'normal') dice.push(rollDie(20, random));
  const selected = mode === 'advantage' ? Math.max(...dice) : mode === 'disadvantage' ? Math.min(...dice) : dice[0];
  const mods = [
    { source: ability, value: modifier(hero.abilities[ability]) },
    ...(request.proficient ? [{ source: 'Proficiency', value: proficiency(hero.level) }] : []),
    ...(request.extra_mod ? [{ source: 'Other', value: Number(request.extra_mod) }] : [])
  ];
  const total = autoFail ? 0 : selected + mods.reduce((sum, entry) => sum + entry.value, 0);
  const target = request.dc ?? null;
  const outcome = autoFail ? 'failure' : selected === 20 ? 'critical_success' : selected === 1 ? 'critical_failure' : target == null ? 'success' : total >= target ? 'success' : 'failure';
  return { requestId: request.id, actorId: 'hero', targetId: request.target_id || null, actionId: request.action_id || null, rawDice: dice, selectedDie: selected, modifiers: mods, total, dcOrAc: target, outcome, appliedEffects: [] };
}

export function applyStateUpdates(hero, updates) {
  if (!updates) return hero;
  const next = structuredClone(hero);
  next.hp = Math.max(0, Math.min(next.maxHp, next.hp + Number(updates.hp_delta || 0)));
  next.xp = Math.max(0, next.xp + Math.max(0, Number(updates.xp_gain || 0)));
  next.gold = Math.max(0, next.gold + Number(updates.gold_delta || 0));
  if (Number.isFinite(updates.ac_set)) next.ac = Math.max(1, Math.min(30, Number(updates.ac_set)));
  for (const item of updates.add_items || []) if (!next.inventory.includes(item)) next.inventory.push(String(item).slice(0, 120));
  next.inventory = next.inventory.filter((item) => !(updates.remove_items || []).includes(item));
  for (const condition of updates.add_conditions || []) if (CONDITIONS[condition] && !next.conditions.includes(condition)) next.conditions.push(condition);
  next.conditions = next.conditions.filter((condition) => !(updates.remove_conditions || []).includes(condition));
  if (updates.slot_spend) spendSlot(next, Number(updates.slot_spend));
  if (updates.rest === 'long') {
    next.hp = next.maxHp;
    for (const slot of Object.values(next.spellSlots)) slot.current = slot.max;
    if (next.spellEnergy) next.spellEnergy.current = next.spellEnergy.max;
  }
  next.level = levelForXp(next.xp);
  return next;
}

export function spendSlot(hero, requestedLevel) {
  const levels = Object.keys(hero.spellSlots).map(Number).sort((a,b) => a-b);
  const usable = levels.find((level) => level >= requestedLevel && hero.spellSlots[level].current > 0);
  if (usable) hero.spellSlots[usable].current -= 1;
  return usable || null;
}

export function rollInitiative(hero, enemies, random = Math.random) {
  const entries = [
    { id: hero.id, name: hero.name, total: rollDie(20, random) + modifier(hero.abilities.DEX), zone: 'engaged', hero: true },
    ...enemies.map((enemy) => ({ id: enemy.id, name: enemy.name, total: rollDie(20, random) + Number(enemy.init_mod || 0), zone: enemy.zone, hero: false }))
  ];
  return entries.sort((a,b) => b.total - a.total);
}
