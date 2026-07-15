// ------------------------------------------------------------
// THE VOICE CAST — every soul is given its OWN ElevenLabs voice,
// chosen once and deterministically so the same character always
// sounds the same across every turn and export. The narrator is a
// single, separate storyteller voice; character dialogue is spoken
// by the character's cast voice, never the narrator. Pure string
// math only — safe to import in the headless eval (no window, no
// fetch).
//
// THE CASTING LAW (the Experience Cut):
// 1. A soul is cast ONCE, at first introduction, BY ITS CARD —
//    register, age, and timbre are read from the written canon
//    (a gravelly smith must not draw a reedy tenor) — and the
//    chosen voice is persisted on the cast card as `voiceId`.
// 2. A card that carries a `voiceId` keeps it forever. Locked
//    until death; death retires the voice from new lines (the
//    dead do not speak), but replays of sealed turns keep it.
// 3. Souls cast before this law (no `voiceId` on the card) keep
//    their legacy name-hash voice — never recast mid-tale.
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

// The curated ensemble (ElevenLabs premade voices, eleven_multilingual_v2
// library). Each voice declares the register, age, and timbre it can
// truthfully play, so casting can READ THE CARD instead of drawing blind.
// Order matters: the legacy name-hash pools are derived from this list and
// must never be reordered, or every pre-law soul would be silently recast.
const ENSEMBLE = [
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel',    register: 'masc', age: 'mature', timbre: ['deep', 'authoritative', 'commanding', 'noble', 'stern', 'lordly'] },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam',      register: 'masc', age: 'mature', timbre: ['grounded', 'steady', 'warm', 'measured', 'calm', 'even'] },
  { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold',    register: 'masc', age: 'mature', timbre: ['crisp', 'forceful', 'hard', 'soldier', 'blunt', 'iron'] },
  { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum',    register: 'masc', age: 'mature', timbre: ['hoarse', 'intense', 'menacing', 'villain', 'gravel', 'rough', 'smoke', 'rasp'] },
  { id: 'pqHfZKP75CvOlQylNhV4', label: 'Bill',      register: 'masc', age: 'old',    timbre: ['weathered', 'old', 'wise', 'kind', 'tired', 'elder', 'gentle'] },
  { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh',      register: 'masc', age: 'young',  timbre: ['earnest', 'bright', 'quick', 'eager', 'boyish', 'hopeful'] },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Bella',     register: 'fem',  age: 'young',  timbre: ['soft', 'gentle', 'quiet', 'shy', 'tender', 'hush'] },
  { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi',      register: 'fem',  age: 'mature', timbre: ['strong', 'commanding', 'fierce', 'warrior', 'proud', 'bold'] },
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte', register: 'fem',  age: 'mature', timbre: ['cool', 'composed', 'cold', 'regal', 'distant', 'villain', 'velvet'] },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice',     register: 'fem',  age: 'young',  timbre: ['bright', 'confident', 'sharp', 'clever', 'quick', 'wry'] },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda',   register: 'fem',  age: 'mature', timbre: ['warm', 'patient', 'motherly', 'dry', 'steady', 'measured'] },
  { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli',      register: 'fem',  age: 'young',  timbre: ['young', 'feeling', 'tender', 'fragile', 'hopeful', 'light'] },
];

// Legacy pools — EXACTLY the pre-law MASC/FEM arrays, derived by register in
// ensemble order. castVoiceId (the name-hash) indexes into these; changing
// their contents or order would recast every soul introduced before the law.
const MASC = ENSEMBLE.filter((v) => v.register === 'masc').map((v) => v.id);
const FEM = ENSEMBLE.filter((v) => v.register === 'fem').map((v) => v.id);

// THE TENOR LAW — register resolution, in strict order of authority:
//   1. An EXPLICIT card field (card.gender, written by the DM at cast_add or
//      chosen by the player at the forge) outranks every inference, always.
//   2. The soul's OWN STATION — a lexicon over role and name only. "Her
//      mother" is feminine because SHE is the mother; prose about other
//      people ("lost her son to the king's war") can never misgender her.
//   3. Legacy prose sweep — kept ONLY so pre-law souls with wordless cards
//      resolve exactly as they always did. New souls never reach it: the
//      DM is required to write voice_card on every cast_add.
// Returns true (feminine), false (masculine), null (open room).
function register(soul, name) {
  const stated = String(soul?.gender || '').toLowerCase();
  if (stated === 'feminine') return true;
  if (stated === 'masculine') return false;
  if (stated === 'neutral') return null;
  const station = `${soul?.role || ''} ${soul?.name || name || ''}`.toLowerCase();
  if (/\b(mother|grandmother|granddam|queen|princess|duchess|countess|baroness|lady|dame|sister|daughter|widow|matron|priestess|abbess|maiden|crone|empress|wife|aunt|niece)\b/.test(station)) return true;
  if (/\b(father|grandfather|king|prince|duke|count|baron|lord|brother|son|widower|patriarch|abbot|monk|friar|emperor|husband|uncle|nephew)\b/.test(station)) return false;
  const text = `${soul?.voice || ''} ${soul?.visual || ''} ${soul?.role || ''} ${name || ''}`.toLowerCase();
  if (/\b(she|her|hers|woman|women|girl|lady|queen|mother|daughter|sister|priestess|matron|maiden|witch|crone|soprano|mezzo|alto)\b/.test(text)) return true;
  if (/\b(he|his|him|man|men|boy|lord|king|father|son|brother|priest|knight|baron|duke|baritone|bass|tenor|gravel|gruff)\b/.test(text)) return false;
  return null;
}

// Explicit age band from the card, when the DM wrote one. child|young → the
// young bin; adult → mature; elder → old. Null falls back to prose reading.
function explicitAge(soul) {
  const band = String(soul?.age_band || '').toLowerCase();
  if (band === 'child' || band === 'young') return 'young';
  if (band === 'adult') return 'mature';
  if (band === 'elder') return 'old';
  return null;
}

// Age band read from the card. 'silver', 'weathered', 'grizzled' age a soul;
// 'apprentice', 'lass', 'green' keep one young. Null when the card is quiet.
function ageOf(text) {
  if (/\b(old|elder|elderly|ancient|aged|grey|gray|white-?haired|silver|grizzled|crone|wizened|weathered|veteran|granddam|grandfather|grandmother)\b/.test(text)) return 'old';
  if (/\b(young|youth|boy|girl|lad|lass|child|apprentice|green|new-?blood|fresh-?faced|teen)\b/.test(text)) return 'young';
  return null;
}

// LEGACY: the pre-law voice — a name-hash into the register-guessed pool.
// Deterministic in the character's name. Kept verbatim so souls introduced
// before the casting law keep the exact voice they have always had.
export function castVoiceId(soul, name) {
  const key = soul?.name || name || 'someone';
  const fem = register(soul, name);
  const pool = fem === true ? FEM : fem === false ? MASC : [...MASC, ...FEM];
  return pool[hash(key) % pool.length];
}

// THE CASTING SESSION: choose a voice by reading the card. Scores every
// ensemble voice against the soul's written canon — register filters the
// room, timbre words score highest, age bands pull toward their own — and
// breaks ties deterministically by name, so the same card always casts the
// same voice. Called once at first introduction; the result is persisted on
// the cast card and never recomputed.
export function castVoiceByCard(soul, name) {
  const text = `${soul?.timbre || ''} ${soul?.voice || ''} ${soul?.visual || ''} ${soul?.role || ''}`.toLowerCase();
  const fem = register(soul, name);
  const room = ENSEMBLE.filter((v) => (fem === true ? v.register === 'fem' : fem === false ? v.register === 'masc' : true));
  const age = explicitAge(soul) || ageOf(text);
  const villainous = /\b(villain|regent|tyrant|usurper|dread|overlord|warlock|necromancer)\b/.test(`${soul?.role || ''} ${soul?.goal || ''}`.toLowerCase());
  const scored = room.map((voice) => {
    let score = 0;
    for (const t of voice.timbre) if (text.includes(t)) score += 2;
    if (age && voice.age === age) score += 1.5;
    else if (age === 'old' && voice.age === 'mature') score += 0.5;
    else if (age === 'young' && voice.age === 'mature') score += 0.25;
    if (villainous && voice.timbre.includes('villain')) score += 3;
    return { voice, score };
  });
  const best = Math.max(...scored.map((s) => s.score));
  const finalists = scored.filter((s) => s.score === best).map((s) => s.voice);
  return finalists[hash(soul?.name || name || 'someone') % finalists.length].id;
}

// THE RESOLUTION everywhere playback needs a voice: a card that carries its
// cast voice speaks with it; a pre-law card falls back to the legacy hash —
// identical to what it played before the law, so no soul is recast mid-tale.
export function resolveVoiceId(soul, name) {
  return soul?.voiceId || castVoiceId(soul, name);
}

// ------------------------------------------------------------
// THE HERO'S CASTING — the player's own soul obeys the same law
// as every NPC: cast once, by the card, deterministically. The
// forge asks no gender question, so the card the casting session
// reads is assembled from everything the player actually wrote —
// ancestry and class as the role, bearing and background as the
// canon. The legacy name-hash read NONE of that (only the name),
// which is how a hero could draw a voice from the wrong side of
// the room.
// ------------------------------------------------------------
export function heroVoiceCard(hero) {
  const stated = String(hero?.presentation || '').toLowerCase();
  return {
    name: hero?.name || 'the hero',
    role: `${hero?.ancestry || ''} ${hero?.className || hero?.class || ''}`.trim(),
    visual: `${hero?.bearing || ''} ${hero?.background || ''}${hero?.mark ? ` Distinguishing mark: ${hero.mark}.` : ''}`.trim().slice(0, 600),
    voice: '',
    goal: '',
    // THE TENOR LAW: the player's stated presentation travels with the card,
    // so a scarred knight who is a woman is cast as one — always.
    gender: ['feminine', 'masculine', 'neutral'].includes(stated) ? stated : null,
    timbre: hero?.voiceTimbre || ''
  };
}

// Cast the hero by their forge card. Deterministic in the written card, so
// the same hero casts the same voice in every session, replay, and export.
export function castHeroVoice(hero) {
  return castVoiceByCard(heroVoiceCard(hero), hero?.name);
}

// Playback resolution for the hero, mirroring resolveVoiceId: a persisted
// voice is kept forever; an uncast hero (campaigns from before this law,
// read-only restored spines) resolves to the card-cast answer in memory —
// identical every time, so nothing needs a write to speak truly.
export function resolveHeroVoiceId(hero) {
  return hero?.voiceId || castHeroVoice(hero);
}

// Does a spoken name belong to the hero? The full name always does. A bare
// first name reaches the hero ONLY when no cast soul could claim it too —
// the same restraint the canon uses for aliases: ambiguity touches nobody,
// a voice is never guessed. Shared by the live narrator and the podcast so
// the table and the episode always agree on who is speaking.
export function speakerIsHero(speaker, hero, cast = []) {
  if (!hero?.name) return false;
  const key = String(speaker || '').trim().toLowerCase();
  if (!key) return false;
  const name = String(hero.name).trim().toLowerCase();
  if (key === name) return true;
  if (key !== name.split(/\s+/)[0]) return false;
  return !cast.some((entry) => {
    const other = String(entry?.name || '').trim().toLowerCase();
    return other === key || other.split(/\s+/)[0] === key;
  });
}

export function narratorVoiceId() { return NARRATOR_VOICE; }

// Register per voice id — exported so gates (and the forge audition) can
// verify which side of the room a chosen voice truly stands on.
export const VOICE_REGISTER = Object.fromEntries(ENSEMBLE.map((v) => [v.id, v.register]));

// THE AUDITION — three candidate voices for the hero, drawn from the bins the
// stated presentation opens: feminine or masculine yields that register's
// three most distinct voices; neutral offers one of each plus a name-hash
// third. Deterministic in (presentation, name) so re-opening the forge
// auditions the same three.
export function auditionCandidates(presentation, name = '') {
  const stated = String(presentation || 'neutral').toLowerCase();
  const fem = ENSEMBLE.filter((v) => v.register === 'fem');
  const masc = ENSEMBLE.filter((v) => v.register === 'masc');
  let pool;
  if (stated === 'feminine') pool = fem;
  else if (stated === 'masculine') pool = masc;
  else pool = [fem[hash(name) % fem.length], masc[hash(`${name}:m`) % masc.length], (hash(`${name}:x`) % 2 ? fem : masc)[hash(`${name}:3`) % 6]];
  const seen = new Set();
  const picks = [];
  for (let i = 0; picks.length < 3 && i < pool.length * 3; i += 1) {
    const voice = pool[(hash(`${name}:${i}`) + i) % pool.length];
    if (!seen.has(voice.id)) { seen.add(voice.id); picks.push(voice); }
  }
  return picks.map((v) => ({ id: v.id, label: v.label, line: `${v.timbre[0]} and ${v.timbre[1]}` }));
}

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
