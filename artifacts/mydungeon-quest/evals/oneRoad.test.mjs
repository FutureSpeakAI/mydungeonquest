// ---------------------------------------------------------------------------
// ONE ROAD GATE (C1) — creation step router.
// Proofs:
//   1. CREATION_STEPS has exactly 5 entries: World · Class · Face · Voice · Name.
//   2. No DoorRow render in Forge.jsx (method selector deleted).
//   3. Forbidden method-selector verbs absent from creation-flow source.
//   4. Fast path: five taps reach "Start the campaign".
//   5. Back navigation: completed steps become navigable in the progress bar.
//   6. Both CreationRouter and HeroForge (heir path) are exported.
// Headless; keyless-safe; JSX rendered through the node jsx loader.
// ---------------------------------------------------------------------------
process.env.DM_PROVIDER = 'mock';

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { register, createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

let failures = 0;
const check = (ok, label) => {
  if (ok) console.log(`  ok — ${label}`);
  else { failures += 1; console.error(`  FAIL — ${label}`); }
};

// ── Source-text proofs (no JSX loader needed) ──────────────────────────────
const forgeSource = readFileSync(join(ROOT, 'src/components/Forge.jsx'), 'utf8');
const appSource   = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');

// 1a. CREATION_STEPS literal present in the source.
check(forgeSource.includes("CREATION_STEPS"), 'CREATION_STEPS symbol defined in Forge.jsx');
check(forgeSource.includes("export const CREATION_STEPS"), 'CREATION_STEPS is exported');

// 1b. All five step labels appear in the export line.
const stepLineMatch = forgeSource.match(/export const CREATION_STEPS\s*=\s*\[([^\]]+)\]/);
check(!!stepLineMatch, 'CREATION_STEPS has a literal array export');
if (stepLineMatch) {
  const entries = stepLineMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, ''));
  check(entries.length === 5, `exactly 5 routes in source (found ${entries.length})`);
  for (const label of ['World', 'Class', 'Face', 'Voice', 'Name'])
    check(entries.includes(label), `"${label}" is in CREATION_STEPS`);
}

// 2. DoorRow removed.
check(!forgeSource.includes('DoorRow'), 'DoorRow is absent from Forge.jsx (method selector deleted)');

// 3. Forbidden method-selector strings absent.
const BANNED = [
  { pattern: /\bSpin the World\b/,   name: '"Spin the World"' },
  { pattern: /\bCast the Bones\b/,   name: '"Cast the Bones"' },
  { pattern: /\bCast again\b/,       name: '"Cast again"' },
  { pattern: /\bDeep Forge\b/,       name: '"Deep Forge"' },
  { pattern: /\bForge by Hand\b/,    name: '"Forge by Hand"' },
  { pattern: /\bForge the hero\b/,   name: '"Forge the hero"' },
  { pattern: /\bBegin the chronicle\b/, name: '"Begin the chronicle"' },
  { pattern: /['"]oracle['"]\s*,/,   name: 'door id "oracle"' },
  { pattern: /['"]bones['"]\s*,/,    name: 'door id "bones"' },
  { pattern: /\bSpin again\b/,       name: '"Spin again"' },
];
for (const { pattern, name } of BANNED) {
  check(!pattern.test(forgeSource), `Forge.jsx: ${name} absent`);
}
check(!/'Begin the chronicle'/.test(appSource), 'App.jsx: "Begin the chronicle" absent');
check(!/'Forge the hero'/.test(appSource), 'App.jsx: "Forge the hero" absent');

// 4. App.jsx uses 'creation' flow (not 'world'/'hero' for new campaigns).
check(appSource.includes("flow === 'creation'"), 'App.jsx routes creation via flow=creation');
check(!appSource.includes("flow === 'world'"), 'App.jsx: flow=world route removed');
check(!appSource.includes("flow === 'hero'") || appSource.split("flow === 'hero'").length === 1, 'App.jsx: flow=hero route removed');
check(appSource.includes("setFlow('creation')"), 'App.jsx: onNew calls setFlow(creation)');

// 5. CreationRouter is the new export replacing WorldForge.
check(forgeSource.includes('export function CreationRouter'), 'CreationRouter exported from Forge.jsx');
check(!forgeSource.includes('export function WorldForge'), 'WorldForge removed from Forge.jsx');
check(forgeSource.includes('export function HeroForge'), 'HeroForge still exported for heir path');

// ── JSX render proofs ──────────────────────────────────────────────────────
// Register the loader and then import via dynamic require after.
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// 6. CREATION_STEPS runtime value.
const { CREATION_STEPS, CreationRouter, HeroForge } = await import('../src/components/Forge.jsx');
check(Array.isArray(CREATION_STEPS), 'CREATION_STEPS is an array at runtime');
check(CREATION_STEPS.length === 5, `CREATION_STEPS has 5 entries at runtime (found ${CREATION_STEPS.length})`);
const EXPECTED = ['World', 'Class', 'Face', 'Voice', 'Name'];
for (const [i, label] of EXPECTED.entries())
  check(CREATION_STEPS[i] === label, `runtime route ${i + 1} is "${label}"`);

// 7. Fast path: five taps reach "Start the campaign".
let begun = null;
let worldReady = null;
let tree;
TestRenderer.act(() => {
  tree = TestRenderer.create(h(CreationRouter, {
    mediaTier: 'parchment',
    beginBusy: false,
    onBack: () => {},
    onWorldReady: (w) => { worldReady = w; },
    onBegin: (hero) => { begun = hero; },
  }));
});

const primaryBtns = () => tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('primary-button'));
const progressBtns = () => tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('creation-step'));
const eyebrow = () => { const spans = tree.root.findAll((n) => n.type === 'span' && String(n.props.className || '').includes('eyebrow')); return spans.length ? String(spans[0].children?.[0] ?? '') : ''; };

check(eyebrow().includes('World'), 'router opens on World step');
check(progressBtns().length === 5, '5 progress-bar buttons present');
check(primaryBtns().length >= 1, 'World step has a primary button');
check(!primaryBtns()[0].props.disabled, 'World step Next is enabled without filling fields');

// Tap 1 — World → Class
TestRenderer.act(() => { primaryBtns()[0].props.onClick(); });
check(worldReady !== null, 'onWorldReady called when leaving World step');
check(eyebrow().includes('Class'), 'after tap 1: Class step');

// Tap 2 — Class → Face
TestRenderer.act(() => { primaryBtns()[0].props.onClick(); });
check(eyebrow().includes('Face'), 'after tap 2: Face step');

// Tap 3 — Face → Voice
TestRenderer.act(() => { primaryBtns()[0].props.onClick(); });
check(eyebrow().includes('Voice'), 'after tap 3: Voice step');

// Tap 4 — Voice → Name
TestRenderer.act(() => { primaryBtns()[0].props.onClick(); });
check(eyebrow().includes('Name'), 'after tap 4: Name step');

// Tap 5 — Start. Default hero is Ranger (half-caster, no starting spells owed)
// so the Start button is enabled without picking spells.
const startBtn = primaryBtns()[0];
// Extract text from React children without JSON.stringify (avoids fiber circular refs).
const extractText = (node) => {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && node.props) return extractText(node.props.children);
  return '';
};
const startText = extractText(startBtn.props.children);
check(startText.includes('Start'), `"Start" appears in Name step primary button (found: "${startText.slice(0,40)}")`);
check(!startBtn.props.disabled, 'Start the campaign enabled with defaults');
TestRenderer.act(() => { startBtn.props.onClick(); });
check(begun !== null, 'onBegin fired after fifth tap (fast path complete)');
check(typeof begun.name === 'string' && begun.name.length > 0, 'begun hero has a name');

// 8. Back navigation: completed steps unlock in the progress bar.
let tree2;
TestRenderer.act(() => {
  tree2 = TestRenderer.create(h(CreationRouter, {
    mediaTier: 'parchment', beginBusy: false,
    onBack: () => {}, onWorldReady: () => {}, onBegin: () => {},
  }));
});
const pb2 = () => tree2.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('creation-step'));
const prim2 = () => tree2.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('primary-button'));

check(pb2()[0].props.disabled === false || pb2()[0].props.disabled == null, 'step 0 enabled from start');
check(pb2()[1].props.disabled === true, 'step 1 locked before advancing');

// Advance twice: World → Class → Face
TestRenderer.act(() => { prim2()[0].props.onClick(); });
TestRenderer.act(() => { prim2()[0].props.onClick(); });
check(!pb2()[0].props.disabled, 'step 0 (World) unlocked after passing it');
check(!pb2()[1].props.disabled, 'step 1 (Class) unlocked after passing it');
check(pb2()[2].props.disabled === true, 'step 2 (Face=current) still locked (not yet passed)');

// Click step 0 in progress bar → should return to World
TestRenderer.act(() => { pb2()[0].props.onClick(); });
const ew2 = tree2.root.findAll((n) => n.type === 'span' && String(n.props.className || '').includes('eyebrow'));
check(String(ew2[0]?.children?.[0] ?? '').includes('World'), 'clicking step 0 in progress bar returns to World');

// 9. HeroForge heir path: calling select + primary button survive.
let tree3;
TestRenderer.act(() => {
  tree3 = TestRenderer.create(h(HeroForge, { world: { title: 'The Bench World' }, onBack: () => {}, onBegin: () => {} }));
});
const callingSelect = tree3.root.findAll((n) => n.type === 'select').find((s) => s.findAll((o) => o.type === 'option' && o.props.value === 'Wizard').length > 0);
const heirStart = tree3.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('primary-button'));
check(!!callingSelect, 'HeroForge (heir) renders a calling select with Wizard option');
check(heirStart.length >= 1, 'HeroForge (heir) renders a primary button');

// ── final verdict ──────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`FAIL — one-road gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — one road: 5 creation routes; DoorRow deleted; forbidden verbs absent; five-tap fast path reaches "Start the campaign"; back navigation works; HeroForge heir export intact.');
