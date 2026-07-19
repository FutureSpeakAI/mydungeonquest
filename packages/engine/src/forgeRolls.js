// ------------------------------------------------------------
// THE FORGE ROLLS — pure, seeded generators behind the two-speed forge.
// Spin the World / Cast the Bones draw whole lawful forms from these pools;
// the Oracle answers three questions; every field in the Deep Forge wears a
// die. Deterministic in the seed (that determinism is gated), no imports
// beyond the spine list, safe for the headless bench.
// ------------------------------------------------------------
import { SPINES } from './spines.js';

const hash = (s) => { let h = 0; const str = String(s ?? ''); for (let i = 0; i < str.length; i += 1) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return Math.abs(h); };
const pick = (pool, seed, salt = '') => pool[hash(`${seed}:${salt}`) % pool.length];

// THE DOUBLED POOLS (Directive XII §V.2) — counts are pinned law: TITLES 24,
// COVENANTS 20, TONES 16, REGION_NAMES 20, MARKS 20, FIRST_NAMES 32,
// LAST_NAMES 32, SIGILS 16; Oracle world pools 10 each, hero pools 10 each.
// Every entry clears the poison lexicon and the covenant's rating.
export const TITLES = ['The Unwritten Road', 'A Crown of Quiet Thunder', 'The Last Lantern District', 'Where the Salt Remembers', 'The Vale of Borrowed Names', 'A Winter for the Bell-Makers', 'The Ninth Ford', 'Embers of the Old Concord', 'The Cartographer\u2019s Debt', 'A Field of Small Gods', 'The Hollow Coronation', 'Songs the River Kept', 'The Mended Oath', 'A Harbor for the Winterborn', 'The Usurper\u2019s Kind Regards', 'Salt Roads and Sovereigns', 'The Pilgrim\u2019s Honest Mile', 'A Siege of Slow Letters', 'The Redeemer\u2019s Second Road', 'Wind Against the Named Course', 'The Notary of Thrones', 'A Creed of Borrowed Light', 'The Long Watch at Homewall', 'Tides That Keep Court'];
export const COVENANTS = [
  'A drowned empire where memories are legal tender.',
  'A cozy mountain kingdom built atop a sleeping machine.',
  'A moonlit frontier where roads choose their travelers.',
  'A river republic where every bridge is a treaty and one has just been broken.',
  'A harvest duchy where the scarecrows remember being soldiers.',
  'An archipelago of bell-towers whose ringing holds back the fog \u2014 and the fog is learning the songs.',
  'A canyon city carved by a departed god, now renting out the echo.',
  'A borderland where winter arrives as a person and must be housed.',
  'A guild-run port where names are cargo and yours has been sold.',
  'A pilgrim road that grows one mile longer every year, and no one knows toward what.',
  'A mountain hold where every promise is carved, and the mason has begun erasing.',
  'A pilgrim republic taxed in miracles, audited by doubt.',
  'A coastal league whose treaties are sung, and someone is changing the tune.',
  'A crown\u2019s winter court where legitimacy is a ledger and the ink is patient.',
  'A ring of border keeps that trade sleep like grain against the long watch.',
  'A drowned cathedral parish where the tide takes confession.',
  'An orchard duchy whose seasons obey a contract nobody living signed.',
  'A ferry kingdom on a river that remembers every toll ever refused.',
  'A walled market city that has never fallen and has never once been attacked.',
  'A teacher\u2019s valley where lessons are inherited, and one inheritance has soured.'
];
export const TONES = ['Mythic, warm, and dangerous', 'Cozy at the hearth, sharp at the treeline', 'Melancholy wonder with iron underneath', 'Swashbuckling and generous-hearted', 'Slow dread, small kindnesses', 'Storybook bright with real teeth', 'Windswept and elegiac', 'Wry, weathered, and hopeful', 'Patient dread with warm lamplight', 'Court-sharp, velvet over steel', 'Salt-bitten and stubbornly kind', 'Penitent, austere, and slowly bright', 'Devout wonder with a skeptic\u2019s pulse', 'Homefire warmth under siege shadow', 'Ledger-dry wit, sudden mercy', 'Weather-worn and gallows-gentle'];
export const REGION_NAMES = ['Larkspur Vale', 'The Tinderfen', 'Saltmere Reach', 'The Bellwether Downs', 'Cinderhollow', 'The Pale Orchards', 'Greywater Crossing', 'The Antler Hills', 'Mirrormoss', 'The Long Stair', 'The Winnow Coast', 'Hallowmere', 'The Stilt Gardens', 'Vesper Downs', 'The Salt Chancel', 'Kindlewick', 'The Regent\u2019s Steps', 'Foldbarrow', 'The Hushing Water', 'Lanternwrack'];
export const MARKS = ['a white scar through one brow', 'a streak of frost-grey hair', 'a burn in the shape of a key', 'mismatched eyes, one gold', 'a missing left ring finger', 'a faded oath-tattoo at the wrist', 'a voice roughened by old smoke', 'a limp that vanishes in danger', 'a birthmark like a compass rose', 'a silver tooth that catches light', 'a pilgrim\u2019s knot inked at the collarbone', 'salt-white lashes over dark eyes', 'a signet callus on the wrong finger', 'a hairline of gold in one tooth', 'rope-burn bracelets long healed', 'a tally of small scars, self-kept', 'an accent that drifts with the weather', 'an ear notched like a ledger', 'hands steady only when it matters', 'a shadow of old paint under the jaw'];
export const FIRST_NAMES = ['Aster', 'Sera', 'Rowan', 'Maren', 'Cassian', 'Ilya', 'Wren', 'Edda', 'Tomas', 'Liora', 'Bran', 'Sable', 'Odette', 'Corin', 'Yeva', 'Halric', 'Anselm', 'Brida', 'Caspian', 'Deryn', 'Esther', 'Falk', 'Greta', 'Hollis', 'Isolde', 'Jorun', 'Katri', 'Lowen', 'Mireille', 'Nikolai', 'Ottoline', 'Pell'];
export const LAST_NAMES = ['Vale', 'Marrow', 'Fenwick', 'Ashgrove', 'Quill', 'Harrow', 'Brightwater', 'Coldmane', 'Setter', 'Larkspur', 'Voss', 'Thorne', 'Merridew', 'Stone', 'Gallowglass', 'Reed', 'Amberlow', 'Birchall', 'Crane', 'Dunmore', 'Ellery', 'Farrow', 'Gorse', 'Hazelett', 'Ironquill', 'Jessop', 'Kestrel', 'Loam', 'Mott', 'Nightingale', 'Orrery', 'Pyke'];
export const ANCESTRIES = ['Human', 'Dwarf', 'Elf', 'Halfling', 'Orc-blooded', 'Tiefling', 'Gnome', 'Dragonborn'];
export const CLASSES = [
  { className: 'Ranger', caster: 'half', hitDie: 10, skills: ['Perception', 'Survival', 'Stealth'], order: ['DEX', 'WIS', 'CON', 'STR', 'INT', 'CHA'] },
  { className: 'Fighter', caster: 'none', hitDie: 10, skills: ['Athletics', 'Intimidation', 'Perception'], order: ['STR', 'CON', 'DEX', 'WIS', 'CHA', 'INT'] },
  { className: 'Rogue', caster: 'none', hitDie: 8, skills: ['Stealth', 'Sleight of Hand', 'Insight'], order: ['DEX', 'INT', 'CHA', 'CON', 'WIS', 'STR'] },
  { className: 'Wizard', caster: 'full', hitDie: 6, skills: ['Arcana', 'History', 'Investigation'], order: ['INT', 'CON', 'DEX', 'WIS', 'CHA', 'STR'] },
  { className: 'Cleric', caster: 'full', hitDie: 8, skills: ['Religion', 'Medicine', 'Insight'], order: ['WIS', 'CON', 'STR', 'CHA', 'INT', 'DEX'] },
  { className: 'Bard', caster: 'full', hitDie: 8, skills: ['Performance', 'Persuasion', 'Deception'], order: ['CHA', 'DEX', 'CON', 'WIS', 'INT', 'STR'] },
  { className: 'Barbarian', caster: 'none', hitDie: 12, skills: ['Athletics', 'Survival', 'Intimidation'], order: ['STR', 'CON', 'DEX', 'WIS', 'CHA', 'INT'] },
  { className: 'Warlock', caster: 'energy', hitDie: 8, skills: ['Arcana', 'Deception', 'Intimidation'], order: ['CHA', 'CON', 'DEX', 'WIS', 'INT', 'STR'] }
];
export const SIGILS = ['\u2726', '\u2735', '\u273f', '\u2740', '\u2749', '\u2698', '\u269c', '\u2694', '\u2736', '\u273a', '\u2742', '\u2744', '\u2766', '\u2699', '\u2691', '\u263e'];
const STANDARD = [15, 14, 13, 12, 10, 8];
const DEFAULT_STYLE = 'Romantic dark-fantasy oil painting with gold-leaf light, deep atmospheric perspective, expressive faces, and restrained PG-13 peril.';

export const BEARINGS = {
  Ranger: 'Weather-worn leathers, a longbow slung easy, and eyes that never stop reading the treeline.',
  Fighter: 'Dented plate kept honest, a soldier\u2019s stance, hands that have carried more than swords.',
  Rogue: 'Quiet boots, a coat of useful pockets, and a smile that arrives half a beat late.',
  Wizard: 'Ink-stained cuffs, a traveling library in one satchel, chalk dust on every hem.',
  Cleric: 'A road-worn vestment, a symbol polished by thumb, calm that feels load-bearing.',
  Bard: 'A bright coat gone artfully shabby, an instrument case scarred with border stamps.',
  Barbarian: 'Furs and old iron, braids wound with trophies, a stillness like held weather.',
  Warlock: 'Fine clothes a season out of fashion, and a shadow that sits slightly wrong.'
};
export const BACKGROUNDS = {
  Ranger: 'A former road-warden who can hear when a path is lying.',
  Fighter: 'Mustered out of a war nobody won, still keeping the watch out of habit.',
  Rogue: 'Retired from a guild that does not accept retirements.',
  Wizard: 'Expelled from the academy for asking the question that was the right one.',
  Cleric: 'Keeps a small god\u2019s last shrine, and the small god keeps them.',
  Bard: 'Collects the songs of places that no longer exist.',
  Barbarian: 'Last of a hill-clan, carrying its whole calendar from memory.',
  Warlock: 'Signed something at a crossroads and is still reading the fine print.'
};

export function rollAbilities(className, seed = 0) {
  const cls = CLASSES.find((c) => c.className === className) || CLASSES[0];
  // The standard array lands along the class's own priorities; the seed may
  // swap the two middle scores so no two heroes feel stamped from one die.
  const scores = [...STANDARD];
  if (hash(`${seed}:swap`) % 2) { const t = scores[2]; scores[2] = scores[3]; scores[3] = t; }
  const abilities = {};
  cls.order.forEach((ability, i) => { abilities[ability] = scores[i]; });
  return { STR: abilities.STR, DEX: abilities.DEX, CON: abilities.CON, INT: abilities.INT, WIS: abilities.WIS, CHA: abilities.CHA };
}

export const rollTitle = (seed) => pick(TITLES, seed, 'title');
export const rollCovenant = (seed) => pick(COVENANTS, seed, 'covenant');
export const rollTone = (seed) => pick(TONES, seed, 'tone');
export const rollRegion = (seed) => pick(REGION_NAMES, seed, 'region');
export const rollMark = (seed) => pick(MARKS, seed, 'mark');
export const rollName = (seed) => `${pick(FIRST_NAMES, seed, 'first')} ${pick(LAST_NAMES, seed, 'last')}`;

export function rollWorld(seed = 0) {
  return {
    title: rollTitle(seed),
    covenant: rollCovenant(seed),
    spineId: pick(SPINES, seed, 'spine').id,
    tone: rollTone(seed),
    homeRegion: rollRegion(seed),
    linesText: '', veilsText: '',
    styleBible: DEFAULT_STYLE
  };
}

export const ORACLE_WORLD = {
  places: ['a drowned coast', 'a mountain sanctuary', 'a frontier of moving roads', 'a river of treaties', 'a city in a god\u2019s ribcage', 'a walled orchard duchy', 'a road of stubborn shrines', 'an estuary of drowned bells', 'a court that winters in exile', 'a chain of ferry crossings'],
  wounds: ['its memory is being sold', 'its guardian has gone silent', 'its winters arrive angry and early', 'its bridges are failing one by one', 'its names are being stolen', 'its treaties are being resung', 'its harvest obeys a stranger\u2019s clock', 'its watchmen have begun to sell their sleep', 'its miracles arrive on schedule', 'its maps are older than its borders admit'],
  hopes: ['an heir who refuses the crown', 'a song that still opens doors', 'a road that remembers travelers kindly', 'one honest harbor', 'a lantern that has never gone out', 'a mason who still carves true', 'a tide that returns what it loves', 'a witness who cannot be bought', 'one bell the fog never learned', 'a child who asks the right questions']
};

export function oracleWorld({ place, wound, hope }) {
  const covenant = `${(place || ORACLE_WORLD.places[0]).replace(/^a /, 'A ')}, where ${wound || ORACLE_WORLD.wounds[0]} \u2014 and where the last hope is ${hope || ORACLE_WORLD.hopes[0]}.`;
  return {
    covenant,
    title: `The Tale of ${String(hope || ORACLE_WORLD.hopes[0]).split(' ').slice(-2).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}`,
    tone: pick(TONES, hash(covenant), 'oracle-tone')
  };
}

export function rollHero(seed = 0) {
  const cls = pick(CLASSES, seed, 'class');
  return {
    name: rollName(seed),
    sigil: pick(SIGILS, seed, 'sigil'),
    ancestry: pick(ANCESTRIES, seed, 'ancestry'),
    className: cls.className, caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills,
    abilities: rollAbilities(cls.className, seed),
    bearing: BEARINGS[cls.className],
    background: BACKGROUNDS[cls.className],
    presentation: pick(['feminine', 'masculine', 'neutral'], seed, 'presentation'),
    pronouns: '',
    mark: rollMark(seed),
    // THE POSSESSIONS CUT: every thrown soul carries a keepsake, so the
    // trove is seeded on the fast path with no extra tap.
    keepsake: pick(ORACLE_HERO.keepsakes, seed, 'keepsake')
  };
}

export const ORACLE_HERO = {
  paths: ['the blade', 'the shadow', 'the word', 'the wild', 'the flame', 'the hymn', 'the fang', 'the pact', 'the banner', 'the tide'],
  virtues: ['stubborn kindness', 'cold clarity', 'reckless loyalty', 'patient cunning', 'unkillable hope', 'weathered patience', 'honest doubt', 'quiet thrift', 'borrowed courage, repaid', 'a mender\u2019s stubbornness'],
  keepsakes: ['a mother\u2019s letter, unopened', 'a broken compass that points home', 'a coin from a country that fell', 'a rival\u2019s glove', 'a key with no known door', 'a bell clapper wrapped in wool', 'a treaty torn at one corner', 'a saint\u2019s medal worn smooth', 'a ship\u2019s nail bent by weather', 'a schoolmaster\u2019s red pencil']
};
// Every path answers with a calling (§V.2) — repeats are lawful; the set
// of callings stays the eight standing classes.
const PATH_CLASS = { 'the blade': 'Fighter', 'the shadow': 'Rogue', 'the word': 'Bard', 'the wild': 'Ranger', 'the flame': 'Wizard', 'the hymn': 'Cleric', 'the fang': 'Barbarian', 'the pact': 'Warlock', 'the banner': 'Fighter', 'the tide': 'Ranger' };

export function oracleHero({ path, virtue, keepsake }) {
  const className = PATH_CLASS[path] || 'Ranger';
  const cls = CLASSES.find((c) => c.className === className);
  return {
    className, caster: cls.caster, hitDie: cls.hitDie, skills: cls.skills,
    abilities: rollAbilities(className, hash(`${path}:${virtue}`)),
    bearing: BEARINGS[className],
    background: `Walks the way of ${path || 'the wild'}, carried by ${virtue || 'stubborn kindness'}; keeps ${keepsake || 'a key with no known door'}.`,
    mark: pick(MARKS, hash(`${virtue}:${keepsake}`), 'oracle-mark'),
    // The keepsake rides as a FIELD as well as a sentence, so the forge
    // can seed the trove from the same truth the background speaks.
    keepsake: keepsake || 'a key with no known door'
  };
}
