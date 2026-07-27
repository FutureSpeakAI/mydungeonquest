// C2 — WORLD DECK FIXTURE (Experience Directive C2)
// Hand-written world entries tied to bundled art in /public/keyart/.
// No AI generation for default cards — assets are served as static files.
// Each entry carries the full world shape so storeWorldAndAdvance() can
// forward it whole to onWorldReady. The fixture is the single source of
// truth for all preset world strings; no template generator lives here.
//
// GRAMMAR CONTRACT (writtenFirst eval):
//   — Every player-visible string (title, covenant, tone) resolves from this
//     fixture before turn one; no generated text is shown at step 0 by default.
//   — Strings pass: no orphan conjunctions at sentence start, no doubled
//     determiners, subject-verb agreement.

export const WORLD_DECK = [
  {
    id: 'gate',
    title: 'The Gate Eternal',
    covenant: 'An empire held together by a single impossible gate — and the guild that controls it.',
    tone: 'Political, tense, and morally grey',
    asset: '/keyart/gate.jpg',
    spineId: 'scheming-court',
    homeRegion: 'The Threshold City',
    styleBible: 'Dark oil painting with chiaroscuro lighting, gilded architectural details, and layered atmospheric smoke.',
    linesText: '',
    veilsText: '',
  },
  {
    id: 'frontier',
    title: 'The Long Frontier',
    covenant: 'A vast borderland where the law ends one day\'s ride from any settlement.',
    tone: 'Grounded, lonely, and dangerous',
    asset: '/keyart/frontier.jpg',
    spineId: 'classic-epic',
    homeRegion: 'Larkspur Crossing',
    styleBible: 'Romantic dark-fantasy oil painting with warm campfire light, vast open skies, and weathered faces.',
    linesText: '',
    veilsText: '',
  },
  {
    id: 'drowned',
    title: 'The Drowned Reaches',
    covenant: 'A sunken realm whose ruins still hold secrets — and the last people who refused to leave.',
    tone: 'Melancholic, eerie, and wondrous',
    asset: '/keyart/drowned.jpg',
    spineId: 'classic-epic',
    homeRegion: 'The Undertow Coast',
    styleBible: 'Underwater oil painting with filtered blue-green light, coral-encrusted ruins, and ghostly silhouettes.',
    linesText: '',
    veilsText: '',
  },
  // Fourth entry — available in the Shuffle rotation but not shown as a default card.
  {
    id: 'mountain',
    title: 'The Mountain That Remembers',
    covenant: 'A living mountain that recalls every civilization whose hands have carved its face.',
    tone: 'Ancient, layered, and strange',
    asset: '/keyart/mountain.jpg',
    spineId: 'classic-epic',
    homeRegion: 'The High Spine',
    styleBible: 'Epic landscape oil painting with god-ray lighting, towering scale, and intricate carved stone reliefs.',
    linesText: '',
    veilsText: '',
  },
];

// Default deck — the first three entries shown before any interaction.
export const DEFAULT_WORLD_DECK = WORLD_DECK.slice(0, 3);

// shuffleWorldDeck(seed) — deterministically picks three entries from the pool
// using a mulberry32 shuffle. The same seed always yields the same three cards;
// incrementing the seed on each "Shuffle" tap gives the next draw. No AI call.
function mulberry32(a) {
  return function () {
    let t = a += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffleWorldDeck(seed = 0) {
  const rng = mulberry32(seed >>> 0);
  const pool = [...WORLD_DECK];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
