// ------------------------------------------------------------
// CLASS DECK — bundled fixture for the C3 class-selection step.
// All strings are hand-authored; no AI generation on any path.
// asset paths point to existing /reel/ images (served from /public/).
// ------------------------------------------------------------

// ── Stat helpers ────────────────────────────────────────────────────────────
export const STAT_KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
export const STAT_LABELS = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };

// Swap stat `statKey` with a random other stat — total stays 72.
// Called for per-stat reroll in the expanded view.
const hashSeed = (n) => Math.abs((Math.imul(n, 2654435761) | 0));
export function swapStat(abilities, statKey, seed) {
  const others = STAT_KEYS.filter((k) => k !== statKey);
  const target = others[hashSeed(seed) % others.length];
  const next = { ...abilities };
  [next[statKey], next[target]] = [next[target], next[statKey]];
  return next;
}

// ── Class cards ─────────────────────────────────────────────────────────────
// Eight entries. The first six are the default 2-column grid.
// The full eight are visible in the expanded view.
export const CLASS_DECK = [
  {
    className: 'Ranger',
    role: 'Scout and skirmisher — the wild is both home and weapon.',
    gear: 'Longbow, two shortswords, scale mail, and explorer\u2019s pack.',
    asset: '/reel/reel-01.jpg',
    assetPosition: 'center top',
  },
  {
    className: 'Fighter',
    role: 'Armored and trained — the most reliable blade in any fight.',
    gear: 'Chain mail, martial weapon, shield, and dungeoneer\u2019s pack.',
    asset: '/reel/reel-02.jpg',
    assetPosition: 'center top',
  },
  {
    className: 'Rogue',
    role: 'Unseen until decisive — the art of perfect timing.',
    gear: 'Rapier, shortbow, leather armor, and thieves\u2019 tools.',
    asset: '/reel/reel-03.jpg',
    assetPosition: 'center top',
  },
  {
    className: 'Wizard',
    role: 'Every problem has a spell — knowing the right one is the work.',
    gear: 'Quarterstaff, spellbook, arcane focus, and scholar\u2019s pack.',
    asset: '/reel/reel-04.jpg',
    assetPosition: 'center top',
  },
  {
    className: 'Cleric',
    role: 'The divine made present — healer, defender, and quiet judge.',
    gear: 'Mace, scale mail, shield, holy symbol, and priest\u2019s pack.',
    asset: '/reel/reel-05.jpg',
    assetPosition: 'center top',
  },
  {
    className: 'Bard',
    role: 'Words as weapons, songs as spells — the best negotiator in any room.',
    gear: 'Rapier, lute, leather armor, and diplomat\u2019s pack.',
    asset: '/reel/reel-06.jpg',
    assetPosition: 'center top',
  },
  {
    className: 'Barbarian',
    role: 'Fury as armor — no one absorbs a blow like a Barbarian.',
    gear: 'Greataxe, two handaxes, four javelins, and explorer\u2019s pack.',
    asset: '/reel/reel-07.jpg',
    assetPosition: 'center top',
  },
  {
    className: 'Warlock',
    role: 'A pact that pays in power — the terms are still being negotiated.',
    gear: 'Light crossbow, two daggers, leather armor, and scholar\u2019s pack.',
    asset: '/reel/reel-08.jpg',
    assetPosition: 'center top',
  },
];

// First six — shown by default in the 2-column grid.
export const CLASS_DECK_DEFAULT = CLASS_DECK.slice(0, 6);

// ── SRD equipment lists (by class) ──────────────────────────────────────────
export const CLASS_EQUIPMENT = {
  Ranger: [
    'Scale mail',
    'Two shortswords',
    'Longbow and quiver of 20 arrows',
    'Explorer\u2019s pack',
    'A favored enemy and a natural explorer terrain (chosen)',
  ],
  Fighter: [
    'Chain mail',
    'A martial weapon and a shield, or two martial weapons',
    'Light crossbow and 20 bolts, or two handaxes',
    'Dungeoneer\u2019s pack or explorer\u2019s pack',
  ],
  Rogue: [
    'Leather armor',
    'Rapier, or two daggers',
    'Shortbow and quiver of 20 arrows, or a shortsword',
    'Burglar\u2019s pack, dungeoneer\u2019s pack, or explorer\u2019s pack',
    'Thieves\u2019 tools',
    'Two additional daggers',
  ],
  Wizard: [
    'Quarterstaff, or a dagger',
    'A component pouch, or an arcane focus',
    'Scholar\u2019s pack, or an explorer\u2019s pack',
    'Spellbook',
  ],
  Cleric: [
    'A mace, or a warhammer',
    'Scale mail, leather, or chain mail',
    'A light crossbow and 20 bolts, or a simple weapon',
    'A priest\u2019s pack or an explorer\u2019s pack',
    'A shield and a holy symbol',
  ],
  Bard: [
    'A rapier, a longsword, or any simple weapon',
    'A diplomat\u2019s pack or an entertainer\u2019s pack',
    'A lute, or any other musical instrument',
    'Leather armor',
    'A dagger',
  ],
  Barbarian: [
    'A greataxe, or any martial melee weapon',
    'Two handaxes, or any simple weapon',
    'Four javelins',
    'Explorer\u2019s pack',
  ],
  Warlock: [
    'A light crossbow and 20 bolts, or any simple weapon',
    'A component pouch or an arcane focus',
    'A scholar\u2019s pack or a dungeoneer\u2019s pack',
    'Leather armor',
    'Any simple weapon',
    'Two daggers',
  ],
};
