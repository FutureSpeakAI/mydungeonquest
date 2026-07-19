// ---------------------------------------------------------------------------
// THE ATELIER GATE — Experience-Directive XVII, Article VIII (keyless).
// Portrait-first creation: six structured strokes (hair, eyes, skin, build,
// attire, accessory), each a die and a pen under the Two Hands, compose ONE
// sealed canon that the forge preview, the bust anchor, and the hero sheet
// all read from the same seat. The voice audition deals TEN under the
// unchanged Tenor law (the engine's own dealer leads, verbatim). The face
// answers the TAP, never the keystroke. Headless: pure node, no AI keys.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import {
  ATELIER_KEYS, ATELIER_FIELDS, rollAppearance, dealAppearance,
  composeAppearance, composeSignature, heroVisual, heroCanonSoul
} from '../src/lib/atelier.js';
import { dealAuditions, AUDITION_COUNT } from '../src/lib/audition.js';
import { auditionCandidates } from 'fatescript/cinema/casting';
import { heroSoul } from 'fatescript/cinema/prompts';

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};
const EM_DASH = '\u2014';

// --- LAW I: the six strokes and their tables -------------------------------
check(JSON.stringify(ATELIER_KEYS) === JSON.stringify(['hair', 'eyes', 'skin', 'build', 'attire', 'accessory']),
  'the atelier names exactly six strokes: hair, eyes, skin, build, attire, accessory');
check(ATELIER_FIELDS.length === 6 && ATELIER_FIELDS.every((f) => ATELIER_KEYS.includes(f.key) && typeof f.ask === 'string' && f.ask.trim().length > 0),
  'every stroke carries a plain-speech ask');
check(ATELIER_FIELDS.every((f) => !f.ask.includes(EM_DASH) && !(f.placeholder || '').includes(EM_DASH)),
  'the asks are born at zero — no em dash enters through the house\u2019s own labels');

for (const key of ATELIER_KEYS) {
  const seen = new Set();
  let clean = true;
  for (let seed = 0; seed < 100; seed += 1) {
    const phrase = rollAppearance(key, seed);
    if (typeof phrase !== 'string' || !phrase.trim() || phrase.includes(EM_DASH)) clean = false;
    seen.add(phrase);
  }
  check(clean, `every ${key} throw lands a non-empty, dash-free phrase`);
  check(seen.size >= 8, `the ${key} table deals at least eight distinct faces (saw ${seen.size})`);
  check(rollAppearance(key, 41) === rollAppearance(key, 41), `the ${key} die is deterministic per seed`);
}
const dealt = dealAppearance(7);
check(ATELIER_KEYS.every((key) => dealt[key] === rollAppearance(key, 7)),
  'the whole-look deal is each stroke\u2019s own die at the same seed — no hidden table');

// --- LAW II: one sealed canon, one seat ------------------------------------
check(composeAppearance({ hair: 'a', eyes: 'b', skin: 'c', build: 'd' }) === 'a; b; c; d',
  'appearance composes hair; eyes; skin; build in pinned order');
check(composeAppearance({ eyes: 'b', build: 'd' }) === 'b; d', 'absent strokes fall out without leaving holes');
check(composeAppearance({ appearance: 'already sealed' }) === 'already sealed',
  'a sealed hero\u2019s composed appearance passes through the same seat whole');
check(composeAppearance({ hair: 'x'.repeat(400) }).length <= 220, 'appearance holds its 220 cap');
check(composeSignature({ attire: 'w', accessory: 'v' }) === 'w; v', 'signature composes attire; accessory');
check(composeSignature({ signature: 'sealed look' }) === 'sealed look', 'a sealed signature passes through whole');
check(composeSignature({ attire: 'y'.repeat(400) }).length <= 160, 'signature holds its 160 cap');

const draft = { hair: 'silver hair', eyes: 'amber eyes', skin: 'olive skin', build: 'wiry', attire: 'ranger leathers', accessory: 'a stone pendant', bearing: 'reads the treeline' };
const sealed = { appearance: composeAppearance(draft), signature: composeSignature(draft), bearing: draft.bearing };
check(heroVisual(draft) === heroVisual(sealed),
  'the forge draft and the sealed hero compose the SAME visual — one seat, both moments');
check(heroVisual(draft).includes('silver hair') && heroVisual(draft).includes('ranger leathers') && heroVisual(draft).includes('reads the treeline'),
  'the composed visual carries the strokes, the signature, and the bearing');
check(heroVisual({ bearing: 'only a bearing' }) === 'only a bearing', 'a legacy hero composes to the bare bearing, unchanged');
check(heroVisual({ hair: 'h'.repeat(300), attire: 'a'.repeat(300), bearing: 'b'.repeat(300) }).length <= 300,
  'the visual holds the painter\u2019s 300 ceiling');

const heroed = { name: 'Wren', bearing: 'a quiet bearing', mark: 'a white streak', presentation: 'feminine', hair: 'copper curls escaping a leather tie' };
const canonSoul = heroCanonSoul(heroed);
const baseSoul = heroSoul(heroed);
check(canonSoul.visual.includes('copper curls') && canonSoul.visual.includes('a quiet bearing'),
  'heroCanonSoul rides the composed visual into the engine\u2019s own soul');
check(canonSoul.mark === baseSoul.mark && canonSoul.presentation === baseSoul.presentation,
  'identity is untouched — mark and presentation keep the engine\u2019s seats (Tenor and Likeness stand)');
const legacySoul = heroCanonSoul({ name: 'Old Hand', bearing: 'legacy bearing only' });
check(legacySoul.visual === heroSoul({ name: 'Old Hand', bearing: 'legacy bearing only' }).visual,
  'a legacy hero\u2019s soul is byte-for-byte the engine\u2019s own');

// --- LAW III: ten voices under the unchanged Tenor law ----------------------
for (const register of ['feminine', 'masculine']) {
  const deal = dealAuditions(register, 'Wren');
  const engineLead = auditionCandidates(register, 'Wren').map((c) => c.id);
  check(deal.length === AUDITION_COUNT && new Set(deal.map((c) => c.id)).size === AUDITION_COUNT,
    `the ${register} audition deals ten distinct voices`);
  // The engine's dealer seats UP TO three — its hash walk may lawfully
  // exhaust early (e.g. feminine/'Wren' seats two). The law is not "three":
  // it is that the OLD DEAL leads verbatim, whatever its length, so every
  // chip an earlier table showed keeps its exact chair in the new row.
  check(engineLead.length > 0 && JSON.stringify(deal.slice(0, engineLead.length).map((c) => c.id)) === JSON.stringify(engineLead),
    `the ${register} deal opens with the engine\u2019s own deal (${engineLead.length} chairs), verbatim — an old blessing keeps its chip`);
  const statedPool = new Set();
  for (let i = 0; i <= 40; i += 1) for (const c of auditionCandidates(register, `Wren:deal${i}`)) statedPool.add(c.id);
  for (const c of auditionCandidates(register, 'Wren')) statedPool.add(c.id);
  check(deal.slice(0, statedPool.size).every((c) => statedPool.has(c.id)),
    `the stated register empties first — Tenor law unchanged (${statedPool.size} stated voices lead)`);
  check(deal.slice(statedPool.size).every((c) => !statedPool.has(c.id)),
    `only then does the far register fill the row to ten`);
  check(JSON.stringify(dealAuditions(register, 'Wren').map((c) => c.id)) === JSON.stringify(deal.map((c) => c.id)),
    `the ${register} deal is deterministic per name`);
}
const neutralDeal = dealAuditions('neutral', 'Ash');
check(neutralDeal.length === AUDITION_COUNT && new Set(neutralDeal.map((c) => c.id)).size === AUDITION_COUNT,
  'a neutral presentation deals ten distinct voices from both shores');
const neutralLead = auditionCandidates('neutral', 'Ash').map((c) => c.id);
check(neutralLead.length > 0 && JSON.stringify(neutralDeal.slice(0, neutralLead.length).map((c) => c.id)) === JSON.stringify(neutralLead),
  'the neutral deal opens with the engine\u2019s own deal, verbatim');

// --- LAW IV: the seats — tap repaint, sealed fields, one canon road ---------
const forge = readFileSync(new URL('../src/components/Forge.jsx', import.meta.url), 'utf8');
check(forge.includes('const paintFace = ') && forge.includes('onClick={paintFace}'),
  'the portrait answers a TAP — an explicit paintFace hand, wired to a button');
check(!forge.includes(', 800);'), 'the keystroke debounce easel is gone from the forge');
check(!forge.includes('heroSoul(form)'), 'the preview paints from the composed canon, never the bare soul');
check(forge.includes('heroCanonSoul(form)'), 'the preview prompt reads heroCanonSoul — the same seat the anchor mints from');
check(forge.includes('dealAuditions(presentation, name)'), 'the audition row deals through the game\u2019s ten-voice dealer');
check(forge.includes('atelier-portrait'), 'the portrait stands large and central in the atelier');
check(forge.includes("applyCandidate(applyCandidate(v, result.candidates[0]), dealAppearance(randomSeed()))"),
  'the whole-hero throw deals the look too — through applyCandidate, so sovereign ink stands');
check(forge.includes("applyCandidate(v, { [key]: rollAppearance(key, randomSeed()) }, [key])"),
  'each stroke\u2019s own die forces only its own field — the Two Hands consent, unchanged');
check(forge.includes('{ ...fallback, ...saved') && forge.includes("hair: 'chestnut"),
  'the six strokes ride the same draft that already carries the blessing across a reload');

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
check(app.includes('composeAppearance(heroInput)') && app.includes('composeSignature(heroInput)'),
  'beginCampaign seals appearance and signature from the same composers');

const prologue = readFileSync(new URL('../src/lib/cinema/prologue.js', import.meta.url), 'utf8');
check(prologue.includes('heroCanonSoul(campaign.hero)'), 'the sealed bust anchor mints from the composed canon — the same seat as the preview');

const sheets = readFileSync(new URL('../src/lib/sheets.js', import.meta.url), 'utf8');
check(sheets.includes('campaign.hero.appearance') && sheets.includes('campaign.hero.signature') && sheets.includes(".join('; ')"),
  'the hero sheet mints its canon from the sealed appearance and signature — the third reader of the one seat');

// --- the gate's word --------------------------------------------------------
if (failures > 0) {
  console.error(`FAIL — the atelier gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — the atelier gate: six strokes compose one sealed canon read by preview, anchor, and sheet alike; the dice respect sovereign ink; ten voices deal under the unchanged Tenor law with the engine\u2019s three leading verbatim; and the face answers the tap, never the keystroke.');
