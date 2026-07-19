// ---------------------------------------------------------------------------
// THE HOUSE VOICE GATE — Experience-Directive XVII, Article V (keyless).
// The DM writes like a fantasy author, not a language model. The craft
// canon and the exemplar shelf ride the writer's prompt from ONE pinned
// source (src/lib/voice.js); the Editor's deterministic scans (dash law,
// tells lexicon) run before any judged look; THE DASH LAW is absolute:
// the deterministic doors are born at zero (the 0.9 mock corpus folds at
// the source, before the chair and the validator), a dash flag on any
// tier is mandatory revise, and the ship door folds a twice-refused
// dash, so shipped narration never carries an em dash, keyless or keyed.
// Headless: pure node, mock room throughout, no AI keys.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import {
  EM_DASH, CRAFT_CANON, EXEMPLAR_SHELF, shelfLines, dashCheck, dashFold,
  dashFoldBlocks, dashFoldTurn, proseOfTurn, DASH_REASON, HOUSE_VOICE_RULE, EDITOR_ADDENDUM
} from '../src/lib/voice.js';
import { buildSystemPrompt } from '../src/lib/systemPrompt.js';
import { editorPrePass, convene } from '../server/room.js';
import { mockEditor } from 'fatescript/room';

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};

// --- LAW I: the one pinned source -----------------------------------------
check(Array.isArray(CRAFT_CANON) && CRAFT_CANON.length >= 7, 'the craft canon holds at least seven distilled principles');
for (const principle of CRAFT_CANON) {
  check(HOUSE_VOICE_RULE.includes(principle), `the writer's rule carries the canon line: ${principle.slice(0, 44)}...`);
}
check(HOUSE_VOICE_RULE.includes('44. THE HOUSE VOICE'), 'the canon rides as rule 44 in the charge');
check(HOUSE_VOICE_RULE.includes('THE DASH LAW'), 'the dash law is taught by name in the rule');
check(/ever write one/.test(HOUSE_VOICE_RULE), 'the rule forbids the em dash outright');
check(EDITOR_ADDENDUM.includes('MANDATORY REVISE') && /dash/i.test(EDITOR_ADDENDUM), "the Editor's addendum names the dash law mandatory revise");
check(/dash law/.test(DASH_REASON), 'the mandatory reason names the dash law');

const roomSource = readFileSync(new URL('../server/room.js', import.meta.url), 'utf8');
const promptSource = readFileSync(new URL('../src/lib/systemPrompt.js', import.meta.url), 'utf8');
const dmSource = readFileSync(new URL('../server/dm.js', import.meta.url), 'utf8');
check(promptSource.includes("from './voice.js'") && promptSource.includes('${HOUSE_VOICE_RULE}'), 'the charge interpolates the rule from the one pinned source, never a mirror');
check(roomSource.includes("from '../src/lib/voice.js'"), "the writers' room reads the same pinned source");
check((roomSource.match(/EDITOR_ADDENDUM/g) || []).length >= 3, "the addendum rides BOTH live Editor seats from the one source");
check(roomSource.includes("flags.includes('dash')") && roomSource.includes('DASH_REASON'), 'the sitting makes a dash flag mandatory revise with the law among its reasons');
check(roomSource.includes('dashFoldTurn(sealed.turn)'), "the ship door folds a twice-refused dash before anything ships");
check(dmSource.includes('bornAtZero(') && dmSource.includes('dashFoldTurn'), 'the deterministic doors are born at zero: mock and fallback fold at the source, before the chair and the validator');
check(roomSource.includes('tells-lexicon.json') && roomSource.includes('TELLS_LEXICON'), 'the tells lexicon is pinned fixture data bound at the door');

// --- LAW II: the exemplar shelf is lawful fixture matter -------------------
check(EXEMPLAR_SHELF.length >= 3, 'the shelf seats at least three exemplars');
for (const entry of EXEMPLAR_SHELF) {
  check(Number.isInteger(entry.died) && entry.died <= 1955, `${entry.author} rests in the public domain (died ${entry.died}, before 1956)`);
  check(!entry.passage.includes(EM_DASH), `${entry.author}'s passage obeys the law it teaches: no em dash`);
  check(typeof entry.work === 'string' && entry.work.length > 3, `${entry.author}'s passage carries its provenance`);
  check(shelfLines().includes(entry.author), `${entry.author} is named on the shelf the prompt reads`);
}

// --- LAW III: the charge carries the voice --------------------------------
let prompt = '';
try {
  prompt = buildSystemPrompt({ id: 'gate', title: 'The Gate', tone: 'mythic' }, { name: 'Bram', role: 'guardian', level: 2 });
} catch {
  try { prompt = buildSystemPrompt({ id: 'gate', title: 'The Gate', tone: 'mythic' }); }
  catch (error) { check(false, `the charge must build for the probe: ${error.message}`); }
}
check(prompt.includes('44. THE HOUSE VOICE'), 'the built charge seats rule 44');
check(prompt.includes(EXEMPLAR_SHELF[0].passage.slice(0, 40)), 'the built charge carries the shelf, not a pointer to it');

// --- LAW IV: the deterministic scans, before any judged look ---------------
check(dashCheck('a page with no dash').count === 0, 'the dash scan holds its silence on clean prose');
check(dashCheck(`one ${EM_DASH} here`).flagged, 'the dash scan cries on a single em dash');
check(dashFold(`The road ${EM_DASH} long and cold ${EM_DASH} ends.`) === 'The road, long and cold, ends.', 'the fold turns spaced dashes to commas');
check(dashFold(`word${EM_DASH}word`) === 'word,word', 'the fold turns a bare dash to a comma');
for (const sample of [`a ${EM_DASH} b`, `x${EM_DASH}${EM_DASH}y`, `tail ${EM_DASH}`, `${EM_DASH} head`, 'clean prose stays clean']) {
  check(dashFold(sample).length <= sample.length, `the fold only ever shrinks or holds: ${JSON.stringify(sample)}`);
  check(dashCheck(dashFold(sample)).count === 0, `the fold leaves zero dashes: ${JSON.stringify(sample)}`);
}
const foldedBlocks = dashFoldBlocks([{ speaker: 'The Keeper', text: `so ${EM_DASH} it goes` }]);
check(foldedBlocks[0].speaker === 'The Keeper' && foldedBlocks[0].text === 'so, it goes', 'the block fold keeps the speaker and folds only the prose');

const dashedTurn = {
  narration_blocks: [{ speaker: null, text: `The gate opens ${EM_DASH} slowly.` }],
  suggestions: ['Press on'],
  image_cue: { kind: 'scene', subjects: ['Bram'], moment: `The gate opens ${EM_DASH} slowly.`, caption: 'A gate at dusk, as this page tells it.' }
};
const wholeFolded = dashFoldTurn(dashedTurn);
check(wholeFolded.narration_blocks[0].text === 'The gate opens, slowly.', 'the whole-turn fold cures the page');
check(wholeFolded.image_cue.moment === 'The gate opens, slowly.', "the cue's quoted moment folds in lockstep — a folded page never contradicts its own cue");
check(wholeFolded.image_cue.caption === dashedTurn.image_cue.caption && wholeFolded.suggestions === dashedTurn.suggestions, 'nothing outside the law\u2019s scope is touched');
const cleanTurn = { narration_blocks: [{ speaker: null, text: 'A quiet road.' }], suggestions: [] };
check(dashFoldTurn(cleanTurn).narration_blocks[0].text === 'A quiet road.', 'a clean page walks the fold unchanged');

const planted = {
  narration_blocks: [{ speaker: 'The Keeper', text: `The air was thick with a palpable dread ${EM_DASH} a testament to the tapestry of ruin ${EM_DASH} and his breath hitched as a wave of fear washed over him ${EM_DASH} little did he know what waited ${EM_DASH} his heart pounded, unwavering.` }],
  suggestions: []
};
let plantedFlags = [];
try { plantedFlags = editorPrePass(planted, { intent: null, priorPages: [], priorSuggestions: [] }); }
catch (error) { check(false, `the deterministic scan must accept a skeletal page: ${error.message}`); }
check(plantedFlags.includes('dash'), `a planted dashed page is flagged 'dash' (saw: ${JSON.stringify(plantedFlags)})`);
check(plantedFlags.includes('tells'), `a page dense with model tells is flagged 'tells' (saw: ${JSON.stringify(plantedFlags)})`);

let cleanFlags = [];
try { cleanFlags = editorPrePass({ narration_blocks: [{ speaker: 'The Keeper', text: EXEMPLAR_SHELF[1].passage }], suggestions: [] }, { intent: null, priorPages: [], priorSuggestions: [] }); }
catch (error) { check(false, `the scan must accept the exemplar page: ${error.message}`); }
check(!cleanFlags.includes('dash') && !cleanFlags.includes('tells'), `a known-good exemplar raises neither dash nor tells (saw: ${JSON.stringify(cleanFlags)})`);

const mockVerdict = mockEditor(['dash']);
check(mockVerdict.verdict === 'revise', "the deterministic Editor answers 'revise' to a dash flag");
check(mockVerdict.reasons.some((reason) => /dash/i.test(String(reason))), 'the deterministic verdict names the dash among its reasons');

// --- LAW V: the corpus scans at zero ---------------------------------------
const seasons = readFileSync(new URL('../server/seasons/seasons.json', import.meta.url), 'utf8');
check(!seasons.includes(EM_DASH), 'the mock corpus (seasons shelf) scans at zero em dashes');
check(!shelfLines().includes(EM_DASH), 'the exemplar shelf scans at zero em dashes');

const barred = { anthropic: true, openai: true, google: true, gemini: true };
let convenedPages = 0;
for (let turnNo = 1; turnNo <= 8; turnNo += 1) {
  let result = null;
  try {
    result = await convene({ turn: turnNo, player_input: 'I press on through the pass.', hero: { name: 'Bram', role: 'guardian', level: 2 }, story: {} }, { barred });
  } catch (error) {
    check(false, `the mock room must convene turn ${turnNo}: ${error.message}`);
    continue;
  }
  const prose = proseOfTurn(result?.turn);
  if (!result?.turn || !prose) { check(false, `turn ${turnNo} must ship a page with prose`); continue; }
  convenedPages += 1;
  check(dashCheck(prose).count === 0, `shipped page ${turnNo} carries zero em dashes`);
  check(typeof result.turn.image_cue?.moment !== 'string' || !result.turn.image_cue.moment.includes(EM_DASH), `page ${turnNo}'s cue never quotes a dash its page no longer carries`);
  check(result.room_ledger && Array.isArray(result.room_ledger.flags), `turn ${turnNo} attests its standing flags in the ledger`);
}
check(convenedPages === 8, `all eight mock pages shipped for the scan (saw ${convenedPages})`);

// --- the gate's word --------------------------------------------------------
if (failures > 0) {
  console.error(`FAIL — the house voice gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — the house voice gate: the canon and shelf ride one pinned source into the charge, the deterministic scans flag dashes and tells before any judged look, the house doors are born at zero, a dash is mandatory revise, the ship door folds, and the corpus scans clean.');
