// ------------------------------------------------------------
// THE VOICE CAST — every soul is given its OWN ElevenLabs voice,
// chosen once and deterministically from its canon so the same
// character always sounds the same across every turn and export.
// The narrator is a single, separate storyteller voice; character
// dialogue is spoken by the character's cast voice, never the
// narrator. Pure string math only — safe to import in the headless
// eval (no window, no fetch).
// ------------------------------------------------------------

const hash = (s) => {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return Math.abs(h);
};

// The storyteller. Warm, grave, unhurried — reads the world, sets every scene,
// and frames each line of dialogue before handing off to a character voice.
export const NARRATOR_VOICE = 'JBFqnCBsd6RMkjVDRZzb'; // "George" — warm mature narrator

// Curated ElevenLabs premade voices (eleven_multilingual_v2 library). Split by
// register so a character's voice matches their canon; ambiguous souls draw
// from the whole ensemble. Chosen for range and clear distinction from one
// another and from the narrator.
const MASC = [
  'onwK4e9ZLuTAKqWW03F9', // Daniel   — deep, authoritative
  'pNInz6obpgDQGcFmaJgB', // Adam     — grounded, narration
  'VR6AewLTigWG4xSOukaG', // Arnold   — crisp, forceful
  'N2lVS1w4EtoT3dr4eOWO', // Callum   — hoarse, intense (villains)
  'pqHfZKP75CvOlQylNhV4', // Bill     — older, weathered
  'TxGEqnHWrfWFTfGW9XjX', // Josh     — younger, earnest
];
const FEM = [
  'EXAVITQu4vr4xnSDxMaL', // Bella    — soft, measured
  'AZnzlk1XvdvUeBnXmlld', // Domi     — strong, commanding
  'XB0fDUnXU5powFXDhCwa', // Charlotte— mature, cool
  'Xb7hH8MSUJpSbSDYk0k2', // Alice    — bright, confident
  'XrExE9yKIg1WjnnlVkGX', // Matilda  — warm
  'MF3mGyEYCl7XYWbV9V6O', // Elli     — young, feeling
];

// Read a soul's canon (voice line, appearance, name) to guess register. Returns
// true (feminine), false (masculine), or null (unknown → whole ensemble).
function register(soul, name) {
  const text = `${soul?.voice || ''} ${soul?.visual || ''} ${soul?.role || ''} ${name || ''}`.toLowerCase();
  if (/\b(she|her|hers|woman|women|girl|lady|queen|mother|daughter|sister|priestess|matron|maiden|witch|crone|soprano|mezzo|alto)\b/.test(text)) return true;
  if (/\b(he|his|him|man|men|boy|lord|king|father|son|brother|priest|knight|baron|duke|baritone|bass|tenor|gravel|gruff)\b/.test(text)) return false;
  return null;
}

// The consistent voice for a named character. Deterministic in the character's
// name, so the same soul is cast identically every turn without any stored state.
export function castVoiceId(soul, name) {
  const key = soul?.name || name || 'someone';
  const fem = register(soul, name);
  const pool = fem === true ? FEM : fem === false ? MASC : [...MASC, ...FEM];
  return pool[hash(key) % pool.length];
}

export function narratorVoiceId() { return NARRATOR_VOICE; }

// A short storyteller bridge that names the speaker and frames the coming line,
// so the narrator hands off to the character rather than reading their dialogue.
// Deterministic phrasing (varied but stable per line) keeps re-reads identical.
export function dialogueLeadIn(speaker, prevBlock) {
  const name = titleCase(speaker);
  if (!name) return '';
  const afterAction = prevBlock && !prevBlock.speaker; // narrator just set the stage
  const withStage = [
    `And that is when ${name} said,`,
    `At that, ${name} answered,`,
    `Then ${name} spoke,`,
    `And ${name} replied,`,
  ];
  const cold = [
    `${name} said,`,
    `${name} spoke up,`,
    `Then came ${name}'s voice,`,
    `${name} answered,`,
  ];
  const options = afterAction ? withStage : cold;
  return options[hash(`${speaker}|${prevBlock?.text || ''}`) % options.length];
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim();
}
