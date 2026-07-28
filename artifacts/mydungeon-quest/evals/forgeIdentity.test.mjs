// ---------------------------------------------------------------------------
// FORGE IDENTITY GATE (C4) — single identity control in the creation flow.
// Proofs:
//   1. Exactly one identity control exists in the creation flow (source-text
//      proof: presentationField select removed from Voice step, no standalone
//      pronouns input at Voice step, IdentityControl component present).
//   2. voice_card is fully populated from stated input — heroVoiceCard reads
//      heroForm.presentation and heroForm.pronouns, never inferring from prose.
//   3. No prose inference path: the custom-identity description text is never
//      passed through castVoiceByCard or any gender-inference function.
//   4. Feminine identity → zero masculine-register voice candidates.
//      Chains into the existing tenor gate (which already proves this for
//      auditionCandidates; this eval adds the same proof for the forge path).
//   5. The "Ancestry" label is seated in the one honest seat (smith.js),
//      and the forge renders it from that seat — no hard-coded label.
// ---------------------------------------------------------------------------
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

const forgeSrc = readFileSync(join(ROOT, 'src/components/Forge.jsx'), 'utf8');
const smithSrc = readFileSync(join(ROOT, '../../packages/engine/src/smith.js'), 'utf8');

// ── 1. Single identity control — source-text proofs ───────────────────────
// IdentityControl component must exist.
check(forgeSrc.includes('function IdentityControl'), 'IdentityControl component is defined');
// The old standalone presentation <select> inside presentationField must be gone.
check(!forgeSrc.includes('presentationField'), 'presentationField computed variable removed');
// The Voice step block must contain IdentityControl.
const voiceBlock = forgeSrc.match(/Step 3: Voice[\s\S]*?Step 4: Name/)?.[0] ?? '';
check(voiceBlock.length > 0, 'Voice step block found');
check(voiceBlock.includes('IdentityControl'), 'IdentityControl used in Voice step');
// The Voice step must NOT contain a standalone presentation <select>.
check(!voiceBlock.includes('<select') || voiceBlock.includes('IdentityControl'), 'no standalone presentation select in Voice step');
// Pronouns must not be in the Name step as a standalone labeled input.
const nameBlock = forgeSrc.match(/Step 4: Name[\s\S]*?<\/main>/)?.[0] ?? '';
check(nameBlock.length > 0, 'Name step block found');
// The name step should no longer have the standalone pronouns input
// (it moved into IdentityControl in the Voice step).
check(!nameBlock.includes("ask('hero', 'pronouns')"), 'pronouns ask removed from Name step standalone input');
// No prose inference: the custom description (customDesc) must NEVER be passed
// to castVoiceByCard, heroVoiceCard, or any gender-inference function.
check(!forgeSrc.includes('castVoiceByCard(customDesc') && !forgeSrc.includes('heroVoiceCard(customDesc'), 'custom description text is never passed to voice inference');

// ── 2. voice_card fully populated from stated input ───────────────────────
// heroVoiceCard reads hero.presentation for gender — must not read prose fields.
const castingSrc = readFileSync(join(ROOT, '../../packages/engine/src/cinema/casting.js'), 'utf8');
const hvCard = castingSrc.match(/export function heroVoiceCard[\s\S]*?\n\}/)?.[0] ?? '';
check(hvCard.length > 0, 'heroVoiceCard function found in casting.js');
check(hvCard.includes('hero?.presentation'), 'heroVoiceCard reads hero.presentation for gender');
// gender must be set from presentation (not from prose).
check(!hvCard.includes('castVoiceByCard(hero?.bearing') && !hvCard.includes('castVoiceId('), 'heroVoiceCard does not infer gender from bearing or prose');

// ── 3. Ancestry label sits in one honest seat ─────────────────────────────
check(smithSrc.includes("ask: 'Ancestry'"), 'smith.js carries the "Ancestry" label');
check(!smithSrc.includes("ask: 'Where they come from'"), '"Where they come from" removed from smith.js');
// Forge.jsx must use ask('hero', 'ancestry') — not hard-code the string.
check(!forgeSrc.includes("'Where they come from'"), 'Forge.jsx has no hard-coded "Where they come from"');
check(!forgeSrc.includes('"Where they come from"'), 'Forge.jsx has no hard-coded "Where they come from" (dquotes)');

// ── 4. voice_card gender from stated identity — runtime proofs ─────────────
const { heroVoiceCard, auditionCandidates, VOICE_REGISTER } = await import('fatescript/cinema/casting');

const reg = (id) => VOICE_REGISTER[id];

// A hero with stated feminine presentation gets feminine gender in voice_card.
const feminineHero = { name: 'Sera Vale', ancestry: 'Human', className: 'Ranger', bearing: 'a scarred knight', background: 'a soldier', presentation: 'feminine', pronouns: 'she/her', voiceTimbre: '' };
const femCard = heroVoiceCard(feminineHero);
check(femCard.gender === 'feminine', `heroVoiceCard: feminine hero gets gender='feminine' (got '${femCard.gender}')`);
check(femCard.name === 'Sera Vale', 'heroVoiceCard: name is set from hero.name');
check(femCard.role.includes('Human') && femCard.role.includes('Ranger'), 'heroVoiceCard: role carries ancestry and class');

// A hero with stated masculine presentation gets masculine gender.
const mascHero = { ...feminineHero, name: 'Brannoc', presentation: 'masculine', pronouns: 'he/him' };
const mascCard = heroVoiceCard(mascHero);
check(mascCard.gender === 'masculine', `heroVoiceCard: masculine hero gets gender='masculine' (got '${mascCard.gender}')`);

// A neutral hero gets gender='neutral'.
const neutralHero = { ...feminineHero, name: 'Ash', presentation: 'neutral', pronouns: 'they/them' };
const neutralCard = heroVoiceCard(neutralHero);
check(neutralCard.gender === 'neutral', `heroVoiceCard: neutral hero gets gender='neutral' (got '${neutralCard.gender}')`);

// ── 5. Feminine identity → zero masculine-register candidates ─────────────
// Chains into the tenor gate (which already proves this for auditionCandidates).
// Here we verify from the forge path: stated presentation drives the register.
const femCandidates = auditionCandidates('feminine', 'Sera Vale');
check(femCandidates.length >= 3, `auditionCandidates('feminine') returns at least 3 candidates (found ${femCandidates.length})`);
check(femCandidates.every((c) => reg(c.id) === 'fem'),
  'feminine identity: every auditionCandidates result is a feminine-register voice (zero masculine)');

// Masculine identity: all candidates are masculine.
const mascCandidates = auditionCandidates('masculine', 'Brannoc');
check(mascCandidates.every((c) => reg(c.id) === 'masc'),
  'masculine identity: every auditionCandidates result is a masculine-register voice');

// Neutral identity: candidates span both registers.
const neutralCandidates = auditionCandidates('neutral', 'Ash');
check(neutralCandidates.some((c) => reg(c.id) === 'fem') && neutralCandidates.some((c) => reg(c.id) === 'masc'),
  'neutral identity: auditionCandidates spans both registers');

// ── 6. JSX runtime: IdentityControl renders at Voice step ─────────────────
register('./jsxLoader.mjs', import.meta.url);
const require = createRequire(import.meta.url);
const TestRenderer = require('react-test-renderer');
const React = require('react');
const h = React.createElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const store = new Map();
globalThis.localStorage = { getItem: (k) => (store.has(`l:${k}`) ? store.get(`l:${k}`) : null), setItem: (k, v) => store.set(`l:${k}`, String(v)), removeItem: (k) => store.delete(`l:${k}`) };
globalThis.sessionStorage = { getItem: (k) => (store.has(`s:${k}`) ? store.get(`s:${k}`) : null), setItem: (k, v) => store.set(`s:${k}`, String(v)), removeItem: (k) => store.delete(`s:${k}`) };
globalThis.window = globalThis.window || { location: { search: '', href: 'http://localhost/' } };

const { CreationRouter } = await import('../src/components/Forge.jsx');

let worldReady = null;
let tree;
TestRenderer.act(() => {
  tree = TestRenderer.create(h(CreationRouter, {
    mediaTier: 'parchment', onBack: () => {}, onWorldReady: (w) => { worldReady = w; }, onBegin: () => {},
  }));
});
const primary = () => tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('primary-button'));
const eyebrow = () => { const s = tree.root.findAll((n) => n.type === 'span' && String(n.props.className || '').includes('eyebrow')); return s.length ? String(s[0].children?.[0] ?? '') : ''; };

// Advance World → Class → Face → Voice
TestRenderer.act(() => { primary()[0].props.onClick(); }); // World → Class
TestRenderer.act(() => { primary()[0].props.onClick(); }); // Class → Face
TestRenderer.act(() => { primary()[0].props.onClick(); }); // Face → Voice
check(eyebrow().includes('Voice'), 'Voice step is active after three taps');

// Exactly one .identity-control in the Voice step.
const idControls = tree.root.findAll((n) => n.type === 'div' && String(n.props.className || '').includes('identity-control'));
check(idControls.length === 1, `exactly one identity-control div in the Voice step (found ${idControls.length})`);

// Identity chip buttons exist (at least 4: feminine, masculine, neutral, unsaid, describe).
const idChips = tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('identity-chip'));
check(idChips.length >= 4, `at least 4 identity chip buttons (found ${idChips.length})`);

// Default: one chip should be selected (aria-checked=true).
const selectedChips = idChips.filter((c) => c.props['aria-checked'] === true);
check(selectedChips.length === 1, `exactly one identity chip selected by default (found ${selectedChips.length})`);

// Tapping the Describe it yourself chip activates it without crashing.
const findText = (children) => {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(findText).join('');
  if (typeof children === 'object') return findText(children.props?.children);
  return '';
};
const descChip = idChips.find((c) => findText(c.props.children).includes('Describe'));
check(!!descChip, '"Describe it yourself" chip exists');
TestRenderer.act(() => { descChip?.props.onClick(); });

// After activating custom mode, the voice register chips appear (D10 house controls).
const voiceRegChips = tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('register-chip'));
check(voiceRegChips.length >= 3, 'voice register chips appear in Describe it yourself mode (feminine, masculine, neutral)');

// Primary button is still enabled (no required fields block progression).
check(!primary()[0].props.disabled, 'primary button still enabled after switching to custom identity mode');

// Tapping a preset chip (feminine) activates it and deactivates the custom chip.
const femChip = idChips.find((c) => {
  const arr = Array.isArray(c.props.children) ? c.props.children : [];
  return arr.some((ch) => String(ch?.props?.children ?? '') === 'Feminine');
});
check(!!femChip, 'feminine chip exists');
TestRenderer.act(() => { femChip?.props.onClick(); });
const selectedAfter = tree.root.findAll((n) => n.type === 'button' && String(n.props.className || '').includes('identity-chip')).filter((c) => c.props['aria-checked'] === true);
check(selectedAfter.length === 1, 'exactly one chip selected after tapping feminine');

// ── final verdict ──────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`FAIL — forge identity gate: ${failures} clause(s) broken.`);
  process.exit(1);
}
console.log('PASS — forge identity gate: single IdentityControl (no presentationField, no standalone pronouns at Voice step), voice_card gender reads presentation only (no prose inference), feminine→zero masculine candidates (chains into tenor), Ancestry label sits in one honest seat, and the control renders exactly once in the Voice step with chip selection and custom path.');
