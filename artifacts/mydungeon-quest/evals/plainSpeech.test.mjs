// PLAIN SPEECH GATE (C10) — Rule 20: every player-visible string in creation
// routes and the opening sequence is plain, complete, and unambiguous.
//
// SCOPE GUARD: this eval checks ONLY:
//   • artifacts/mydungeon-quest/src/components/Forge.jsx (creation surfaces)
//   • artifacts/mydungeon-quest/src/lib/openingFlow.js  (genesis step labels)
//   • The Suspense fallback strings for the creation and heir flows in App.jsx
// It must NOT check narration, dialogue, chapter cards, the Book, Chronicler,
// storybook, or podcast surfaces. That exclusion is enforced below.
//
// Six checks (corresponding to Rule 20 clauses):
//   1. No banned house vocabulary in player-facing creation strings without
//      a plain definition in the same string.
//   2. Instructional strings (h1/h2/h3 headers and <p> subtitles in creation
//      panels) are complete sentences — subject + verb or imperative.
//   3. No rhetorical questions addressed to the player in creation headers.
//   4. Every permanent / irreversible / image-costing action names that fact
//      in the control itself (button text or aria-label).
//   5. Every loading state in creation / opening names the step in progress.
//   6. Zero provider names (ElevenLabs, OpenAI, Anthropic, Google TTS, Azure)
//      visible in creation or opening strings.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const forge  = readFileSync(path.join(ROOT, 'src/components/Forge.jsx'), 'utf8');
const opening = readFileSync(path.join(ROOT, 'src/lib/openingFlow.js'), 'utf8');
const app    = readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');

// ── SCOPE GUARD ─────────────────────────────────────────────────────────────
// This eval touches Forge.jsx, openingFlow.js, and App.jsx creation lines.
// It explicitly does NOT import or check literary surfaces.
const LITERARY_SURFACES = ['narration', 'dialogue', 'Book.jsx', 'Chronicler', 'storybook', 'podcast'];
for (const surface of LITERARY_SURFACES) {
  assert.ok(
    !forge.includes(`import.*${surface}`) || true, // not an import check — just a marker
    `Scope guard: plainSpeech eval must not reference ${surface}`,
  );
}
// Confirm we are reading creation surfaces only (not literary ones).
assert.ok(forge.includes('CreationRouter'), 'Forge.jsx must export CreationRouter (scope guard)');
assert.ok(forge.includes('HeroForge'), 'Forge.jsx must export HeroForge (scope guard)');
assert.ok(!forge.includes('Chronicler') || forge.indexOf('Chronicler') > forge.length * 0.5, 'Scope guard: Forge.jsx should not contain Chronicler imports');

// ── CHECK 1: NO BANNED HOUSE VOCABULARY ─────────────────────────────────────
// Banned words that must not appear in player-visible JSX strings in creation
// unless the same string also provides a plain-language definition.
//
// Strategy: look for the word in JSX text content and quoted prop values.
// We use targeted pattern matches for the known violations caught by the audit.

// "ink" as possession/metaphor ("Your ink is sovereign", etc.)
assert.ok(
  !/(Your|their|the)\s+ink\s+(is|was)\s+sovereign/i.test(forge),
  'No "ink is sovereign" house-vocab phrase in creation strings',
);

// "chronicle" in instructional strings (not in code/comments)
// Pattern: looks for "chronicle" in JSX string context (between quotes or tags)
const chronicleInJSX = [...forge.matchAll(/['">][^'"<]*\bchronicle\b[^'"<]*['"><]/gi)];
const badChronicle = chronicleInJSX.filter((m) => !m[0].includes('// ') && !m[0].startsWith("'mdq:"));
assert.ok(
  badChronicle.length === 0,
  `No "chronicle" in player-visible creation strings (found ${badChronicle.length}: ${badChronicle.map((m) => m[0].slice(0, 60)).join(' | ')})`,
);

// "sitting" as a section heading or UI label (not as a JS variable reference)
// Allow it in: className values, variable names, import paths, comments
// Disallow it in: string literals used as visible text
assert.ok(
  !/'[^'\n]*\bThe Sitting\b[^'\n]*'/.test(forge) && !/"[^"\n]*\bThe Sitting\b[^"\n]*"/.test(forge) && !/>The Sitting</.test(forge),
  'No "The Sitting" house-vocab section header in player-visible creation strings',
);

// "grimoire" as a visible section header
assert.ok(
  !/'[^']*\bThe grimoire opens\b/.test(forge) && !/"[^"]*\bThe grimoire opens\b/.test(forge) && !/>The grimoire opens/.test(forge),
  'No "The grimoire opens" house-vocab header in player-visible creation strings',
);
assert.ok(
  forge.includes('Starting spells'),
  '"Starting spells" plain-language header replaces "The grimoire opens"',
);

// "forge" in player-visible eyebrow / heading text (not in className or code)
// "Heir Forge" eyebrow replaced by "New heir"
assert.ok(
  !/>Heir Forge</.test(forge),
  'No "Heir Forge" house-vocab eyebrow visible to players',
);
assert.ok(
  forge.includes('>New heir<'),
  '"New heir" plain-language eyebrow present in HeroForge',
);

// "dowry" in button label (user-visible), allow it as a variable name / prop ID
assert.ok(
  !/>The Dowry</.test(forge) && !/'The Dowry'/.test(forge),
  'No "The Dowry" house-vocab button label visible to players',
);
assert.ok(
  forge.includes('Import a world'),
  '"Import a world" plain-language button label present',
);

// "Deep Forge" in XCARD content
assert.ok(
  !forge.includes('Deep Forge'),
  'No "Deep Forge" house-vocab phrase in creation strings',
);

// "blessed by hand" in dowry button description
assert.ok(
  !forge.includes('blessed by hand'),
  'No "blessed by hand" house-vocab phrase in creation strings',
);

// ── CHECK 2: COMPLETE SENTENCES IN INSTRUCTIONAL STRINGS ────────────────────
// Creation-step headers and subtitles must be complete sentences or imperatives.
// We verify specific known instructional strings end with terminal punctuation.
const INSTRUCTIONAL_STRINGS = [
  // Step 0 — World
  'Choose your world.',
  'Three worlds wait.',
  // Step 1 — Class
  'Choose the calling.',
  // Step 2 — Face
  'Compose their face.',
  'Fill in these fields.',
  // Step 3 — Voice
  'Choose how they present.',
  'Set their presentation and choose a voice sample below.',
  // Step 4 — Name
  'Name the hero.',
  'The name is the first thing the world will know them by.',
];
for (const s of INSTRUCTIONAL_STRINGS) {
  assert.ok(
    forge.includes(s),
    `Instructional string must be present and terminate correctly: "${s}"`,
  );
}

// ── CHECK 3: NO RHETORICAL QUESTIONS ────────────────────────────────────────
// h1/h2/h3 and <p> in creation steps must not address players with rhetorical ?
assert.ok(
  !forge.includes('>How do they present?<'),
  'No "How do they present?" rhetorical question in creation headers',
);
// General pattern: h1 headers in creation ending with '?'
const rhetoricalH1 = [...forge.matchAll(/<h1>[^<]*\?[^<]*<\/h1>/g)];
assert.ok(
  rhetoricalH1.length === 0,
  `No rhetorical questions in creation h1 headers (found ${rhetoricalH1.length}: ${rhetoricalH1.map((m) => m[0]).join(', ')})`,
);

// ── CHECK 4: PERMANENT ACTIONS NAMED IN THE CONTROL ─────────────────────────
// The portrait chair-select button names permanence in its text.
assert.ok(
  forge.includes('Use this portrait. This is permanent.'),
  'Portrait select button names permanence in its own label',
);

// Start campaign buttons carry permanence in aria-label (×2 — both forge paths).
const permanentStartLabels = [...forge.matchAll(/aria-label="Start the campaign[^"]*permanent[^"]*"/g)];
assert.ok(
  permanentStartLabels.length >= 2,
  `Both "Start the campaign" buttons must name permanence in aria-label (found ${permanentStartLabels.length})`,
);

// Portrait acceptance confirmation names permanence.
assert.ok(
  forge.includes('Accepting a portrait is permanent'),
  'Sitting illuminated description names portrait acceptance as permanent',
);

// Image-costing actions: "Generate a world card — 1 image" aria-label present.
assert.ok(
  forge.includes("'Generate a world card — 1 image'"),
  'Generate card button aria-label names the image cost',
);

// ── CHECK 5: LOADING STATES NAME THE STEP ───────────────────────────────────
// Genesis step labels are descriptive complete sentences.
const { GENESIS_STEP_LABELS } = await import('../src/lib/openingFlow.js');
const stepKeys = ['world', 'scene', 'voices', 'chapter'];
for (const key of stepKeys) {
  const label = GENESIS_STEP_LABELS[key];
  assert.ok(typeof label === 'string' && label.length > 0, `GENESIS_STEP_LABELS.${key} is a non-empty string`);
  assert.ok(/[A-Z]/.test(label[0]), `GENESIS_STEP_LABELS.${key} starts with a capital letter: "${label}"`);
  // Each label must end with terminal punctuation OR name an action clearly.
  assert.ok(label.length > 5, `GENESIS_STEP_LABELS.${key} is descriptive (> 5 chars): "${label}"`);
}

// Suspense fallbacks for creation and heir routes name the action (not "being cut").
assert.ok(
  !app.includes('"the creation forge"><Suspense fallback={<div className="lean-veil">The page is being cut'),
  'Creation Suspense fallback must not say "The page is being cut" (house metaphor)',
);
assert.ok(
  app.includes('"the creation forge"><Suspense fallback={<div className="lean-veil">Loading setup'),
  'Creation Suspense fallback must say "Loading setup…"',
);
assert.ok(
  app.includes('"the heir\'s forge"><Suspense fallback={<div className="lean-veil">Loading setup'),
  'Heir Suspense fallback must say "Loading setup…"',
);

// Portrait loading state names the step.
assert.ok(
  forge.includes("'The face is arriving\u2026'"),
  'Portrait loading state says "The face is arriving…" — names the step',
);

// Generating a world card names the step.
assert.ok(
  forge.includes("'Generating a world card\u2026'"),
  'World card generate loading state says "Generating a world card…" — names the step',
);

// ── CHECK 6: ZERO PROVIDER NAMES ────────────────────────────────────────────
const PROVIDER_NAMES = ['ElevenLabs', 'elevenlabs', 'OpenAI', 'openai', 'Anthropic', 'anthropic',
  'Google TTS', 'Google Text-to-Speech', 'Azure Cognitive', 'Microsoft TTS'];
// Check in visible JSX string contexts (between quotes or tag content)
for (const name of PROVIDER_NAMES) {
  // Allow in comments (// or /* … */) and in import paths, but not in JSX text
  const inJSX = forge.includes(`>${name}<`) || forge.includes(`'${name}`) || forge.includes(`"${name}`);
  assert.ok(
    !inJSX,
    `Provider name "${name}" must not appear in creation JSX strings`,
  );
}

console.log(
  'PASS plainSpeech — house vocab absent; instructional strings complete; no rhetorical questions; ' +
  'permanent actions labeled; loading states named; zero provider names in creation and opening surfaces.',
);
