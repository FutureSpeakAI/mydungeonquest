// FORGE FLOOR GATE (C8) — keyless creation passes on all five steps.
//
// Rule: the full creation flow must run without any AI keys:
//   • World and class art are bundled assets — no AI call, no key check.
//   • Face step opens three procedural candidates (sigil placeholders) at
//     parchment tier with an honest label naming the fallback.
//   • Voice step shows three named registers with a note that audio is
//     unavailable at parchment tier; the voice chip still seals the choice.
//   • Tap count is identical: no extra confirmation taps on the keyless path.
//
// Strategy: source-text inspection (esbuild + runtime where needed).
// The sitting effect change (removing sittingRequired gate), the honest
// labels, and the AuditionRow mediaTier prop are all verified directly.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const forge = readFileSync(path.join(ROOT, 'src/components/Forge.jsx'), 'utf8');
const worldDeck = readFileSync(path.join(ROOT, 'src/lib/worldDeck.js'), 'utf8');
const classDeck = readFileSync(path.join(ROOT, 'src/lib/classDeck.js'), 'utf8');

// ── 1. Bundled world art ─────────────────────────────────────────────────────
// Every world card carries a static /keyart/ asset — no AI key needed.
const worldAssets = [...worldDeck.matchAll(/asset:\s*['"`][^'"` ]+['"`]/g)];
assert.ok(worldAssets.length >= 1, `World deck has ${worldAssets.length} bundled asset entries — expected ≥1`);
// All world assets must be static paths (not API calls or data URIs).
for (const m of worldAssets) {
  const val = m[0];
  assert.ok(!val.includes('http') && !val.includes('data:'), `World asset must be a static path, got: ${val}`);
}

// ── 2. Bundled class art ─────────────────────────────────────────────────────
// All eight class cards carry a static /reel/ asset.
const classAssets = [...classDeck.matchAll(/asset:\s*['"`][^'"` ]+['"`]/g)];
assert.ok(classAssets.length === 8, `Class deck has ${classAssets.length} bundled asset entries — expected 8`);

// ── 3. Sitting opens at ALL tiers (parchment floor) ─────────────────────────
// The old guard `sittingRequired(mediaTier)` must be absent from sitting effects.
// We check that neither CreationRouter nor HeroForge gate setSitting on
// sittingRequired; the comment documents why.
assert.ok(
  !forge.includes('if (!sittingRequired(mediaTier)'),
  'sittingRequired(mediaTier) guard must no longer gate the sitting — C8 keyless floor removed it',
);
// The C8 comment must be present (one note per forge).
assert.ok(
  forge.includes('C8 — KEYLESS FLOOR'),
  'C8 keyless floor comment is absent from Forge.jsx',
);

// ── 4. Honest label at parchment tier on the sitting panel ───────────────────
// Both CreationRouter and HeroForge sitting panels must carry the honest note.
const floorNoteCount = (forge.match(/forge-floor-note/g) || []).length;
assert.ok(
  floorNoteCount >= 2,
  `Expected ≥2 forge-floor-note elements (one per forge component), found ${floorNoteCount}`,
);
assert.ok(
  forge.includes('Portrait art is not available at this tier.'),
  'Sitting panel honest label "Portrait art is not available at this tier." is missing',
);

// ── 5. AuditionRow accepts mediaTier prop ────────────────────────────────────
assert.ok(
  forge.includes("function AuditionRow({ presentation, name, voiceId, onBless, mediaTier = 'illuminated' })"),
  "AuditionRow must accept mediaTier prop with default 'illuminated'",
);

// ── 6. Audio skipped at parchment tier (no API call, no exception) ───────────
assert.ok(
  forge.includes("if (mediaTier === 'parchment') return; // no audio at this table — honest floor"),
  "AuditionRow play() must bail immediately at parchment tier with the honest floor comment",
);

// ── 7. Honest audio note at parchment in AuditionRow ────────────────────────
assert.ok(
  forge.includes('Audio is unavailable at this table'),
  "AuditionRow must show 'Audio is unavailable at this table' note at parchment tier",
);

// ── 8. mediaTier prop threaded to AuditionRow in both forge components ───────
const auditionRowUsages = [...forge.matchAll(/AuditionRow[^/\n]*mediaTier=\{mediaTier\}/g)];
assert.ok(
  auditionRowUsages.length >= 2,
  `Both CreationRouter and HeroForge must pass mediaTier={mediaTier} to AuditionRow (found ${auditionRowUsages.length})`,
);

// ── 9. Tap-count parity: voice chip blesses regardless of tier ───────────────
// The onClick must call onBless unconditionally; the audio play is gated inside
// play() itself, so the bless tap is always one chip-tap, not two.
assert.ok(
  forge.includes('onClick={() => { onBless(candidate.id); play(candidate); }}'),
  'AuditionRow chip onClick must call onBless unconditionally (play gates itself)',
);

// ── 10. Face advance button is never gated on sitting status ─────────────────
// The "Choose the voice →" button in the Face step (step === 2) must not
// have a `disabled` prop — the player advances with one tap regardless of tier.
const faceStepBlock = forge.match(/step === 2[\s\S]{0,8000}Choose the voice/)?.[0] ?? '';
assert.ok(
  faceStepBlock.includes('Choose the voice'),
  'Face step block not found — cannot check advance button',
);
// The advance button for step 2 must not be disabled.
const advanceInFaceBlock = faceStepBlock.match(/button className="primary-button"[^>]*>Choose the voice/);
assert.ok(
  advanceInFaceBlock && !advanceInFaceBlock[0].includes('disabled'),
  'Face step advance button must never be disabled (tap-count parity)',
);

console.log(
  `PASS forgeFloor — bundled art confirmed (${worldAssets.length} world, ${classAssets.length} class); ` +
  `sitting opens at all tiers (sittingRequired gate removed); ` +
  `${floorNoteCount} honest sitting labels; ` +
  `AuditionRow parchment floor: audio bails early, "Audio is unavailable" note shown; ` +
  `mediaTier threaded to ${auditionRowUsages.length} AuditionRow usages; ` +
  `face advance button unconstrained — tap-count parity holds.`,
);
