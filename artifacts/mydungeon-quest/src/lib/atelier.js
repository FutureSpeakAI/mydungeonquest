// ---------------------------------------------------------------------------
// THE ATELIER (Experience-Directive XVII, Article VIII) — character creation
// is portrait-first: six structured strokes of appearance (hair, eyes, skin,
// build, attire, accessory), each carrying die and pen under the Two Hands
// law with sovereign text intact, each composing the sealed canon that feeds
// the anchor and the sheet. ONE seat composes that canon — the forge preview,
// the sealed bust job, and the hero sheet all read the same composition, so
// what the player shapes is what the painter is bound to.
// Pure string math; engine untouched; safe in the headless eval.
// ---------------------------------------------------------------------------
import { heroSoul } from 'fatescript/cinema/prompts';

export const ATELIER_KEYS = ['hair', 'eyes', 'skin', 'build', 'attire', 'accessory'];

export const ATELIER_FIELDS = [
  { key: 'hair', ask: 'Their hair?', placeholder: 'A braid, a crop, a color…' },
  { key: 'eyes', ask: 'Their eyes?', placeholder: 'The color, and what they do…' },
  { key: 'skin', ask: 'Their skin?', placeholder: 'Tone and weather…' },
  { key: 'build', ask: 'How are they built?', placeholder: 'Frame and carriage…' },
  { key: 'attire', ask: 'What do they wear?', placeholder: 'The clothes the road sees…' },
  { key: 'accessory', ask: 'What rides with them?', placeholder: 'One thing always on them…' }
];

// The tables the six dice read. House voice, PG-13, and born at zero:
// no em dash may enter canon through the house's own tables.
const TABLES = {
  hair: [
    'raven-black hair cropped close', 'a silver-streaked braid over one shoulder',
    'copper curls escaping a leather tie', 'a storm-grey mane swept straight back',
    'chestnut hair bound in a travel knot', 'white hair shorn nearly to the scalp',
    'oak-brown waves falling to the shoulder', 'a black topknot wound in red cord',
    'sun-bleached tangles stiff with salt', 'auburn hair kept under a deep hood'
  ],
  eyes: [
    'storm-grey eyes', 'amber eyes that catch the lamplight', 'deep brown eyes, steady as stone',
    'green eyes flecked with gold', 'pale blue eyes like winter water', 'black eyes quick as a crow',
    'hazel eyes always half-amused', 'one dark eye and one clouded white', 'sea-green eyes rimmed with tired shadow',
    'grey-violet eyes that hold a stare too long'
  ],
  skin: [
    'deep umber skin', 'olive skin weathered by road-sun', 'pale skin quick to flush',
    'warm brown skin', 'bronze skin crossed with old freckles', 'ashen-fair skin',
    'golden-tan skin', 'dark copper skin', 'ruddy wind-burned skin', 'sallow skin that rarely sees noon'
  ],
  build: [
    'wiry and quick', 'broad-shouldered and slow to move', 'tall and rawboned', 'compact and coiled',
    'lean as a fence rail', 'heavyset and sure-footed', 'small, sharp, and fast', 'long-limbed and loose',
    'thick-armed from years of labor', 'slight, with a dancer\u2019s balance'
  ],
  attire: [
    'weather-worn ranger leathers', 'a patched traveling cloak over quilted wool',
    'oiled mail under a road-stained surcoat', 'scholar\u2019s robes hemmed with dried mud',
    'hunter\u2019s greens with a deep hood', 'salt-crusted sailor\u2019s canvas',
    'faded finery a size too grand', 'plain homespun with careful mending',
    'blackened brigandine with a wolf-fur collar', 'temple linens girdled with rope'
  ],
  accessory: [
    'a river-stone pendant on a cord', 'a longbow slung crosswise', 'a brass-bound journal at the hip',
    'a chipped shield stripped of its arms', 'a ring of cold iron keys', 'a hawk-feather charm in the hair',
    'a walking staff capped with pewter', 'a scarred lute across the back', 'a small knife worn openly',
    'a tin locket that will not open'
  ]
};

const hash = (s) => {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i += 1) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
};

// One die, one field — deterministic for a given seed, so the eval and the
// replay always read the same throw.
export function rollAppearance(key, seed) {
  const table = TABLES[key];
  if (!Array.isArray(table) || table.length === 0) return '';
  return table[hash(`${key}:${seed}`) % table.length];
}

// The whole-look die: every stroke at once. Sovereign ink is respected by
// the caller (applyCandidate), never here.
export function dealAppearance(seed) {
  return Object.fromEntries(ATELIER_KEYS.map((key) => [key, rollAppearance(key, seed)]));
}

const word = (v) => String(v || '').replace(/\s+/g, ' ').trim();

// THE SEALED CANON, first half: hair, eyes, skin, build. When the six raw
// strokes are absent (a sealed hero carries only the composition), the
// already-composed string passes through whole.
export function composeAppearance(src) {
  const parts = ['hair', 'eyes', 'skin', 'build'].map((k) => word(src?.[k])).filter(Boolean);
  if (parts.length) return parts.join('; ').slice(0, 220);
  return word(src?.appearance).slice(0, 220);
}

// THE SEALED CANON, second half — the signature look: attire and accessory.
export function composeSignature(src) {
  const parts = ['attire', 'accessory'].map((k) => word(src?.[k])).filter(Boolean);
  if (parts.length) return parts.join('; ').slice(0, 160);
  return word(src?.signature).slice(0, 160);
}

// The one visual the painter reads: composed canon first, then the bearing
// the older law already trusted. Works on the forge draft (raw strokes) and
// the sealed hero (composed strings) alike — one seat, both moments.
export function heroVisual(src) {
  const parts = [composeAppearance(src), composeSignature(src), word(src?.bearing || src?.background)].filter(Boolean);
  return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 300);
}

// The soul the easel seats: the engine's own heroSoul, with the atelier's
// composed visual riding in place of the bare bearing. Identity (name, mark,
// presentation) is untouched — the Tenor and Likeness laws keep their seats.
export function heroCanonSoul(hero) {
  const base = heroSoul(hero);
  const visual = heroVisual(hero);
  return visual ? { ...base, visual } : base;
}
