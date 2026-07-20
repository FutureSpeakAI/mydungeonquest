// ------------------------------------------------------------
// THE ARMORY (Experience Directive XVIII, Articles I & II) — the
// tables a fight turns on, fixed in the engine's one seat. MECHANICS
// FROM TABLES, FLAVOR FROM THE TALE: the model references these rows
// by plain name and dresses them in any words; it never invents a
// die, a bonus, or an armor class. SRD 5.1 material only (CC-BY-4.0,
// attribution in NOTICE.md); no Product Identity term rides here.
// Client and server import THIS module alike — no number is restated
// in prose, prompt, or schema (the mirrors-one-seat law).
// ------------------------------------------------------------
import { modifier } from './rules.js';

// Twelve SRD weapon rows: damage die, damage type, hands, range band
// (the table's zones: engaged is melee, far is ranged), finesse flag,
// thrown flag. The damage die is spoken by the tale but owned here.
export const WEAPON_TABLE = {
  dagger:       { damage: '1d4', type: 'piercing',    hands: 'one',       band: 'engaged', finesse: true,  thrown: true  },
  shortsword:   { damage: '1d6', type: 'piercing',    hands: 'one',       band: 'engaged', finesse: true,  thrown: false },
  longsword:    { damage: '1d8', type: 'slashing',    hands: 'versatile', band: 'engaged', finesse: false, thrown: false },
  greatsword:   { damage: '2d6', type: 'slashing',    hands: 'two',       band: 'engaged', finesse: false, thrown: false },
  handaxe:      { damage: '1d6', type: 'slashing',    hands: 'one',       band: 'engaged', finesse: false, thrown: true  },
  battleaxe:    { damage: '1d8', type: 'slashing',    hands: 'versatile', band: 'engaged', finesse: false, thrown: false },
  warhammer:    { damage: '1d8', type: 'bludgeoning', hands: 'versatile', band: 'engaged', finesse: false, thrown: false },
  mace:         { damage: '1d6', type: 'bludgeoning', hands: 'one',       band: 'engaged', finesse: false, thrown: false },
  quarterstaff: { damage: '1d6', type: 'bludgeoning', hands: 'versatile', band: 'engaged', finesse: false, thrown: false },
  spear:        { damage: '1d6', type: 'piercing',    hands: 'versatile', band: 'engaged', finesse: false, thrown: true  },
  shortbow:     { damage: '1d6', type: 'piercing',    hands: 'two',       band: 'far',     finesse: false, thrown: false },
  longbow:      { damage: '1d8', type: 'piercing',    hands: 'two',       band: 'far',     finesse: false, thrown: false }
};

// Six SRD suits plus the shield: base AC, dex cap (null uncapped for
// light; 2 for medium, where a NEGATIVE dex still bites; 0 for heavy,
// which takes no dex at all, not even a penalty), and the kind the
// worn law swaps by (light/medium/heavy are the suit class; the
// shield is its own class and is lawful alone).
export const ARMOR_TABLE = {
  leather:           { base: 11, dexCap: null, kind: 'light'  },
  'studded leather': { base: 12, dexCap: null, kind: 'light'  },
  'chain shirt':     { base: 13, dexCap: 2,    kind: 'medium' },
  'scale mail':      { base: 14, dexCap: 2,    kind: 'medium' },
  'chain mail':      { base: 16, dexCap: 0,    kind: 'heavy'  },
  plate:             { base: 18, dexCap: 0,    kind: 'heavy'  },
  shield:            { bonus: 2, kind: 'shield' }
};

// THE ENCHANT LAW (Article II) — a bounded table, single-digit count:
// each row is a key, a mechanical rider (a flat bonus or a table die,
// nothing free-form), and the item kinds it may seat on. At most ONE
// rune per notable thing, ever; ops carry the KEY alone and the door
// refuses free mechanics whole.
export const ENCHANT_TABLE = {
  keen:    { toHit: 1,                             seats: ['weapon'] },
  vicious: { damageBonus: 1,                       seats: ['weapon'] },
  flaming: { damageDie: '1d4', damageType: 'fire', seats: ['weapon'] },
  warded:  { acBonus: 1,                           seats: ['armor'] }
};

// Free names, table mechanics: a row seats on an item when its key
// appears whole in the item's canonical name; the LONGEST key wins
// ('studded leather' over 'leather'). A named thing with no row is
// flavor — it contributes nothing and governs nothing.
const canonText = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function rowFor(table, name) {
  const padded = ` ${canonText(name)} `;
  let best = null;
  for (const [key, row] of Object.entries(table)) {
    if (padded.includes(` ${key} `) && (!best || key.length > best.key.length)) best = { key, ...row };
  }
  return best;
}
export const weaponRowFor = (name) => rowFor(WEAPON_TABLE, name);
export const armorRowFor = (name) => rowFor(ARMOR_TABLE, name);

// The read-back of a hand: every held, equipped row of the named
// holder, each carrying its table rows (or null — flavor arms).
export function equippedRows(trove = [], holder) {
  const key = canonText(holder);
  return (Array.isArray(trove) ? trove : [])
    .filter((item) => item && item.status === 'held' && item.equipped && canonText(item.holder) === key)
    .map((item) => ({
      item,
      weapon: item.kind === 'weapon' ? weaponRowFor(item.name) : null,
      armor: item.kind === 'armor' ? armorRowFor(item.name) : null
    }));
}

// THE DERIVED TRUTH (Article I): AC is computed at read time, never
// stored as opinion. Armored: the suit row's base + dex capped by the
// row. Unarmored: 10 + dex, uncapped. The shield is lawful alone and
// adds its table bonus. A warded rune on a TABLE-seated suit or
// shield adds its rider — mechanics from tables, so a rune on a
// flavor coat the table does not know moves nothing. Never below 1.
export function derivedAc(abilities = {}, rows = []) {
  const dex = modifier(abilities?.DEX ?? 10);
  const suit = rows.find((row) => row.armor && row.armor.kind !== 'shield') || null;
  const shield = rows.find((row) => row.armor && row.armor.kind === 'shield') || null;
  let ac = suit
    ? suit.armor.base + (suit.armor.dexCap === null ? dex : suit.armor.dexCap === 0 ? 0 : Math.min(dex, suit.armor.dexCap))
    : 10 + dex;
  if (shield) ac += ARMOR_TABLE.shield.bonus;
  for (const worn of [suit, shield]) {
    const rune = worn?.item?.enchant ? ENCHANT_TABLE[worn.item.enchant] : null;
    if (rune?.acBonus) ac += rune.acBonus;
  }
  return Math.max(1, ac);
}

// The hero's AC settles from the standing record — the ONE writer of
// hero.ac now that the ac_set lane is retired. Folded at the turn
// funnel after the story updates apply, so an equip moves the number
// in the very turn it lands.
export function settleAc(hero, trove = []) {
  if (!hero) return hero;
  return { ...hero, ac: derivedAc(hero.abilities, equippedRows(trove, hero.name)) };
}

// THE ATTACK FOLD (Article I): the standing roll path wearing table
// law. The equipped weapon row governs the ability (a far-band weapon
// uses DEX; finesse takes the better of STR/DEX by modifier; else
// STR) and grants proficiency — the ready weapon is a proficient
// weapon. A keen rune rides as a NAMED modifier. The defender's TABLE
// armor overrides the spoken dc whenever the record names the target,
// so the margin is provable from sheet bytes, none of it asserted by
// prose. An empty or table-less hand leaves the request as declared —
// flavor arms are not governed — and a non-attack passes through
// untouched, byte for byte.
export function governAttackRoll(request, { abilities = {}, trove = [], holder = null, enemies = [] } = {}) {
  if (!request || request.kind !== 'attack') return request;
  const rows = equippedRows(trove, holder);
  const armed = rows.find((row) => row.weapon) || null;
  const governed = { ...request };
  if (armed) {
    const weapon = armed.weapon;
    governed.ability = weapon.band === 'far' ? 'DEX'
      : weapon.finesse ? (modifier(abilities?.DEX ?? 10) >= modifier(abilities?.STR ?? 10) ? 'DEX' : 'STR')
        : 'STR';
    governed.proficient = true;
    const rune = armed.item?.enchant ? ENCHANT_TABLE[armed.item.enchant] : null;
    if (rune?.toHit) {
      governed.extra_mod = (Number(request.extra_mod) || 0) + rune.toHit;
      governed.extra_source = `the ${armed.item.enchant} rune`;
    }
  }
  const targetKey = canonText(request.target_id);
  const enemy = targetKey
    ? (Array.isArray(enemies) ? enemies : []).find((foe) => canonText(foe?.id) === targetKey || canonText(foe?.name) === targetKey)
    : null;
  if (enemy && Number.isFinite(enemy.ac)) governed.dc = enemy.ac;
  governed.governed = {
    weapon: armed ? armed.item.name : null,
    ability: governed.ability ?? null,
    targetAc: enemy && Number.isFinite(enemy.ac) ? enemy.ac : null
  };
  return governed;
}
