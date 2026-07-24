// ---------------------------------------------------------------------------
// THE ALIAS GATE (game) — Directive XXI at the table: one soul, many
// names, one card, judged through the table's OWN doors. The engine twin
// judges the pure fraction (the road, the folds, the courts); this gate
// judges the SEATING: the dm.js pipeline seals and refuses through
// judgeTurn with the refusal NAMING the holder; the tool schema teaches
// exactly the keys and bounds the court enforces (the toolschema-
// validation lesson: a hidden seat is a trap); the prompt teaches the
// rule in lockstep; the wiki speaks the ledger as story; and a pre-alias
// save walks the card fold DEEP-FROZEN, byte-stable, ledgerless — the
// elder record replays exactly as it always did.
// Headless: pure node, no AI keys, no network.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, '..', p), 'utf8');

const { dmToolSchema, judgeTurn } = await import('../server/dm.js');
const { buildCards } = await import('fatescript/cards');
const { knownAsLine } = await import('fatescript/wikiText');

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};
const sameSet = (a, b) => { const l = [...new Set(a)].sort(); const r = [...new Set(b)].sort(); return l.length === r.length && l.every((v, i) => v === r[i]); };
const deepFreeze = (value) => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const key of Object.keys(value)) deepFreeze(value[key]); } return value; };

// --- CLAUSE 1: schema-validator lockstep -----------------------------------
const schemaProps = dmToolSchema?.properties || dmToolSchema?.input_schema?.properties || dmToolSchema?.parameters?.properties || null;
const storyProps = schemaProps?.story?.anyOf?.find((arm) => arm?.type === 'object')?.properties || null;
check(!!storyProps, 'the story arm of the schema opens for the walk');
const aliasItems = storyProps?.cast_update?.items || null;
check(!!aliasItems, 'cast_update holds a declared seat in the schema — the court it feeds is not hidden');
check(sameSet(Object.keys(aliasItems?.properties || {}), ['name', 'known_as_add']), 'cast_update teaches exactly the taught keys: name, known_as_add');
check(aliasItems?.additionalProperties !== false, 'cast_update stays OPEN — the elder prompt-taught fields (status, bond_delta, fact_add, last_seen) keep their freedom');
const aliasArms = aliasItems?.properties?.known_as_add?.anyOf || [];
check(aliasArms.some((arm) => arm?.type === 'null'), 'known_as_add teaches the lawful empty seat: null');
check(aliasArms.some((arm) => arm?.type === 'string' && arm?.minLength === 2 && arm?.maxLength === 60), 'known_as_add mirrors the court\u2019s own 2\u201360 bounds');
check(aliasItems?.properties?.name?.minLength === 2 && aliasItems?.properties?.name?.maxLength === 80, 'cast_update.name rides the standing 2\u201380 name bounds');

// --- CLAUSE 2: prompt lockstep ----------------------------------------------
const prompt = read('src/lib/systemPrompt.js');
check(prompt.includes('known_as_add'), 'the prompt teaches known_as_add by name');
check(/known_as ledger/.test(prompt), 'the prompt teaches the ledger in the record\u2019s own words');
check(/case-blind, to another soul/.test(prompt), 'the prompt teaches the collision law the door enforces');

// --- CLAUSE 3: the pipeline seals and refuses, refusals NAMING the holder ---
const tableInput = { turn: 4, hero: { name: 'Bram' }, story: { cast: [
  { name: 'Maren Duskholm', status: 'active', known_as: ['The Gray Warden'] },
  { name: 'Tobias Crane', status: 'active' }
] } };
const aliasTurn = (ops) => ({ narration_blocks: [{ speaker: null, text: 'A name is spoken over the fire.' }], suggestions: ['Press on', 'Hold fast'], story: ops });
const aliasClass = (errors) => (errors || []).filter((e) => /known_as_add|cannot seal|epithet|belongs/i.test(e));
const lawful = judgeTurn(aliasTurn({ cast_update: [{ name: 'Tobias Crane', known_as_add: 'The Quiet Hand' }] }), tableInput)?.errors || [];
check(aliasClass(lawful).length === 0, `a free epithet seals without an alias refusal (saw: ${JSON.stringify(aliasClass(lawful))})`);
const nameCollision = judgeTurn(aliasTurn({ cast_update: [{ name: 'Maren Duskholm', known_as_add: 'tobias crane' }] }), tableInput)?.errors || [];
check(nameCollision.some((e) => /belongs to Tobias Crane/.test(e)), `a claim on another\u2019s sealed name is refused NAMING the holder (errors: ${JSON.stringify(nameCollision.slice(0, 3))})`);
const ledgerCollision = judgeTurn(aliasTurn({ cast_update: [{ name: 'Tobias Crane', known_as_add: 'the gray warden' }] }), tableInput)?.errors || [];
check(ledgerCollision.some((e) => /belongs to Maren Duskholm/.test(e)), 'a claim on another\u2019s LEDGER name is refused naming its soul — case-blind');
const heroCollision = judgeTurn(aliasTurn({ cast_update: [{ name: 'Tobias Crane', known_as_add: 'BRAM' }] }), tableInput)?.errors || [];
check(heroCollision.some((e) => /belongs to Bram/.test(e)), 'the hero\u2019s own name is a standing claim — refused, case-blind, naming Bram');
const reseal = judgeTurn(aliasTurn({ cast_update: [{ name: 'Maren Duskholm', known_as_add: 'The Gray Warden' }] }), tableInput)?.errors || [];
check(aliasClass(reseal).length === 0, 're-sealing a soul\u2019s own claim is the quiet no-op, never an error');
const shape = judgeTurn(aliasTurn({ cast_update: [{ name: 'Tobias Crane', known_as_add: 'X' }] }), tableInput)?.errors || [];
check(shape.some((e) => /known_as_add/.test(e) && /2-60/.test(e)), 'the shape court holds its own 2\u201360 door');

// --- CLAUSE 4: the card and the wiki speak the ledger ------------------------
const heroRow = { name: 'Bram', className: 'Warden' };
const entries = [
  { turn: 1, dm: { narration_blocks: [], story: { cast_add: [{ name: 'Maren Duskholm', role: 'warden of the mill' }] } } },
  { turn: 2, dm: { narration_blocks: [], story: { cast_update: [{ name: 'Maren Duskholm', known_as_add: 'The Gray Warden' }] } } },
  { turn: 3, dm: { narration_blocks: [{ speaker: 'The Gray Warden', text: 'Hold the line.' }], story: {} } }
];
const { cards } = buildCards({ hero: heroRow, entries });
const maren = cards['maren duskholm'];
check(!!maren && Array.isArray(maren.known_as) && maren.known_as.length === 1 && maren.known_as[0] === 'The Gray Warden', 'the ledger rides the card in append order');
check((maren?.chronicle || []).some((row) => /Came to be called/.test(row.gloss)), 'a true seal writes its one chronicle line');
check(maren?.lastWords?.text === 'Hold the line.', 'speech under the epithet lands on the ONE soul\u2019s card');
check(knownAsLine(maren) === 'Also called The Gray Warden', 'the wiki speaks the ledger as story');
check(knownAsLine({}) === '' && knownAsLine(null) === '', 'a wordless card claims nothing — and never crashes the page');

// --- CLAUSE 5: the elder record replays exactly as it always did -------------
const elderEntries = deepFreeze([
  { turn: 1, dm: { narration_blocks: [{ speaker: 'Maren Duskholm', text: 'The mill stands.' }], story: { cast_add: [{ name: 'Maren Duskholm', role: 'miller' }] } } },
  { turn: 2, dm: { narration_blocks: [], story: { cast_update: [{ name: 'Maren Duskholm', last_seen: 'the mill road' }] } } }
]);
const one = buildCards({ hero: heroRow, entries: elderEntries });
const two = buildCards({ hero: heroRow, entries: elderEntries });
check(JSON.stringify(one) === JSON.stringify(two), 'the pre-alias walk is byte-stable on the repeat');
check(!('known_as' in (one.cards['maren duskholm'] || {})), 'no ledger is born where no seal ever landed — the elder card carries no new key');

if (failures > 0) { console.error(`THE ALIAS GATE (game): ${failures} court(s) fell`); process.exit(1); }
console.log('PASS — the alias gate (game): the schema teaches exactly the court\u2019s keys and bounds with the null arm and the open elder fields; the prompt carries the rule in lockstep; the table\u2019s own door seals a free epithet, refuses collisions NAMING the holder — sealed name, ledger name, the hero\u2019s own — case-blind, holds the 2\u201360 shape door, and lets an own claim re-seal as a quiet no-op; the card carries the ledger in append order with its one chronicle line, speech under the epithet lands on the one soul, the wiki speaks it as story; and a deep-frozen pre-alias save replays byte-stable without growing a key.');
