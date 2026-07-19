// ---------------------------------------------------------------------------
// THE THRESHOLD GATE — Experience-Directive XVII, Article VII (keyless).
// Genesis wears the house's face: a branded rite over the pipeline's OWN
// events — never a fake meter, never a delay. The walk is forward-only
// (skips lawful on slow tables, regress and strangers refused), the words
// are pinned house speech, the promo slot is dark by default, and nothing
// in the rite touches the network. Headless: pure node, no AI keys.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { RITE_STAGES, riteOpen, riteWalk, riteWord } from '../src/lib/threshold.js';
import { HOUSE_PROMO, HOUSE_VERSION } from '../src/lib/houseConfig.js';

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};
const EM_DASH = '\u2014';

// --- LAW I: the five stages, pinned ----------------------------------------
const WANT = [
  ['seated', 'The table is set.'],
  ['word', 'The first word is on the wire.'],
  ['easel', 'The easel is lit. The world and the face are at the frame.'],
  ['anchors', 'The anchors are home.'],
  ['open', 'Chapter One opens.']
];
check(RITE_STAGES.length === 5 && RITE_STAGES.every((s, i) => s.id === WANT[i][0]),
  'the rite walks five stages in pinned order: seated, word, easel, anchors, open');
check(RITE_STAGES.every((s, i) => s.word === WANT[i][1]),
  'every stage speaks its pinned house word, byte for byte');
check(RITE_STAGES.every((s) => !s.word.includes('%') && !s.word.includes(EM_DASH)),
  'the words carry no percent signs and no em dashes — a rite, not a meter');

// --- LAW II: forward-only walking ------------------------------------------
const opened = riteOpen();
check(opened && opened.stage === 'seated', 'the rite opens seated at the table');
let walk = opened;
for (const stage of ['word', 'easel', 'anchors', 'open']) walk = riteWalk(walk, stage);
check(walk && walk.stage === 'open', 'the full walk lands on Chapter One in order');
check(riteWalk(opened, 'anchors')?.stage === 'anchors',
  'a slow table may lawfully skip forward — the pipeline\u2019s own pace rules');
const late = riteWalk(riteWalk(opened, 'open'), 'word');
check(late?.stage === 'open', 'the walk never regresses — an earlier event cannot pull the rite backward');
check(riteWalk(opened, 'lunch')?.stage === 'seated', 'a stranger stage is refused; the rite stands where it stood');
check(riteWalk(null, 'word') === null, 'a closed rite stays closed — walking nothing raises nothing');
check(riteWord(riteWalk(opened, 'easel')) === WANT[2][1], 'riteWord speaks the standing stage\u2019s pinned word');

// --- LAW III: the promo slot is dark; the house knows its version -----------
check(HOUSE_PROMO === null, 'the promo slot is DARK by default — no partner word ships unbidden');
check(HOUSE_VERSION === '1.0.1-beta', 'the house knows its own version: 1.0.1-beta');

// --- LAW IV: the seats — the rite rides real events, and stays clean --------
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
check(app.includes('setRite(riteOpen())'), 'genesis seats the rite the moment the table is taken');
check(app.includes("riteWalk(") && app.includes("'word'") && app.includes('onPourDispatched'),
  'the first word walks the rite off the pour\u2019s OWN dispatch — the genesis first-word law untouched');
check(app.includes('mediaGate'), 'the pour hooks still carry the media gate — wrapping the hooks stole nothing');
check(app.includes('<ThresholdRite rite={rite}'), 'the rite renders at the table while genesis works');
check(app.includes("setRite((r) => (r && r.stage === 'open' ? null : r))"),
  'the rite leaves the stage when Chapter One stands — and a stale timer cannot blow out a successor rite mid-walk');

const rite = readFileSync(new URL('../src/components/Threshold.jsx', import.meta.url), 'utf8');
check(rite.includes('candle') && rite.includes('MyDungeon') && rite.includes('.Quest'),
  'the threshold wears the house\u2019s own face — the candle and the wordmark (split across its styling span)');
check(!rite.includes('<script') && !rite.includes('<iframe') && !rite.includes('adsbygoogle') && !rite.includes('fetch('),
  'the rite is pure presentation — no scripts, no frames, no ad surface, no network');
check(rite.includes('HOUSE_PROMO &&'), 'the promo line renders only when the house lights it');

const threshold = readFileSync(new URL('../src/lib/threshold.js', import.meta.url), 'utf8');
check(!threshold.includes('setTimeout') && !threshold.includes('setInterval'),
  'the rite owns no clock — every step answers a real pipeline event, so it can never delay the pour');

// --- the gate's word --------------------------------------------------------
if (failures > 0) {
  console.error(`FAIL — the threshold gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — the threshold gate: genesis wears the house\u2019s face through five pinned stages walked forward off the pipeline\u2019s own events; regress and strangers are refused; the promo slot ships dark; and the rite touches no clock and no network.');
