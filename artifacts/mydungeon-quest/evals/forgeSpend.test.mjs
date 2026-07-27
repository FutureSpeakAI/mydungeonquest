// FORGE SPEND GATE (C9) — creation image budget declared, labelled, and capped.
//
// Rule 7: default path spends zero images; custom world spends one; portraits
// spend three; regeneration spends three; total creation spend ≤ 7 on any path.
//
// This eval verifies:
//   1. CREATION_IMAGE_CAP === 7 is exported.
//   2. Every image-generating control names its image count in its accessible
//      name (aria-label).
//   3. Remaining session capacity is shown near each generating control.
//   4. The cap is enforced: generation bails when imageSpendRef.current >=
//      CREATION_IMAGE_CAP.
//   5. Default path (parchment) produces zero image calls (already verified by
//      forgeFloor; confirmed here by bailing logic at parchment tier).
//   6. Image spend is tracked by both CreationRouter and HeroForge.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const forge = readFileSync(path.join(ROOT, 'src/components/Forge.jsx'), 'utf8');

// ── 1. CREATION_IMAGE_CAP exported and equals 7 ─────────────────────────────
const capMatch = forge.match(/export const CREATION_IMAGE_CAP = (\d+)/);
assert.ok(capMatch, 'CREATION_IMAGE_CAP must be exported from Forge.jsx');
assert.strictEqual(Number(capMatch[1]), 7, `CREATION_IMAGE_CAP must be 7 (found ${capMatch[1]})`);

// ── 2. Generating controls carry image count in their accessible name ─────────
// "Generate a card" button — 1 image for custom world cover.
assert.ok(
  forge.includes("'Generate a world card — 1 image'"),
  "Generate a card button must have aria-label containing '— 1 image' for the world cover",
);

// "Paint the face" / "Repaint" buttons — 1 image each.
const paintFaceAriaLabels = [...forge.matchAll(/'(?:Paint the face|Repaint) — 1 image'/g)];
assert.ok(
  paintFaceAriaLabels.length >= 2,
  `Expected ≥2 'Paint the face — 1 image' / 'Repaint — 1 image' aria-labels (found ${paintFaceAriaLabels.length}) — one per forge component`,
);

// Sitting panel spend note — "3 images" near the sitting.
const sittingImageNote = [...forge.matchAll(/Three portraits — 3 images/g)];
assert.ok(
  sittingImageNote.length >= 2,
  `Expected ≥2 sitting spend notes "Three portraits — 3 images" (found ${sittingImageNote.length}) — one per forge component`,
);

// ── 3. Remaining session capacity shown near generating controls ─────────────
// The pattern `of {CREATION_IMAGE_CAP} images remaining in creation` must appear
// near the repaint button and the spend note uses `of {CREATION_IMAGE_CAP} remaining`.
assert.ok(
  forge.includes('of {CREATION_IMAGE_CAP} images remaining in creation'),
  'Remaining capacity note "of {CREATION_IMAGE_CAP} images remaining in creation" must be shown near repaint buttons',
);
assert.ok(
  forge.includes('of {CREATION_IMAGE_CAP} remaining'),
  'Remaining capacity "of {CREATION_IMAGE_CAP} remaining" must be shown near the sitting spend note',
);

// ── 4. Budget cap enforced before each generation call ───────────────────────
// paintFace: bails when imageSpendRef.current >= CREATION_IMAGE_CAP.
assert.ok(
  forge.includes('if (imageSpendRef.current >= CREATION_IMAGE_CAP) return; // budget exhausted'),
  'paintFace must bail when imageSpendRef.current >= CREATION_IMAGE_CAP (cap guard missing)',
);

// Sitting effect: bails when slotsAvailable <= 0.
const slotsAvailableChecks = [...forge.matchAll(/slotsAvailable <= 0.*?budget exhausted/g)];
assert.ok(
  slotsAvailableChecks.length >= 2,
  `Sitting effect must bail at cap in both CreationRouter and HeroForge (found ${slotsAvailableChecks.length} checks)`,
);

// Generate card: only fires cover paint when imageSpendRef.current < CREATION_IMAGE_CAP.
assert.ok(
  forge.includes('imageSpendRef.current < CREATION_IMAGE_CAP'),
  'generateCustomCard must check imageSpendRef.current < CREATION_IMAGE_CAP before painting cover art',
);

// ── 5. Default path (parchment) = zero image calls ──────────────────────────
// paintFace bails at parchment — already present from C8.
assert.ok(
  forge.includes("if (mediaTier === 'parchment' || !heroForm.name.trim() || portrait === 'pending') return;"),
  'CreationRouter paintFace must bail at parchment tier (zero images on default path)',
);
// Sitting fetch bails at parchment — already present from C8.
const parchmentBails = [...forge.matchAll(/if \(!sitting \|\| mediaTier === 'parchment'\) return undefined;/g)];
assert.ok(
  parchmentBails.length >= 2,
  `Sitting effect must bail at parchment in both forge components (found ${parchmentBails.length})`,
);

// ── 6. imageSpend state tracked in both forge components ────────────────────
const imageSpendDecls = [...forge.matchAll(/const \[imageSpend, setImageSpend\] = useState\(0\)/g)];
assert.ok(
  imageSpendDecls.length >= 2,
  `imageSpend state must be declared in both CreationRouter and HeroForge (found ${imageSpendDecls.length})`,
);
const addImageSpendDecls = [...forge.matchAll(/const addImageSpend = /g)];
assert.ok(
  addImageSpendDecls.length >= 2,
  `addImageSpend helper must exist in both CreationRouter and HeroForge (found ${addImageSpendDecls.length})`,
);

// ── 7. Budget math: max spend ≤ 7 on any declared path ──────────────────────
// Declared paths: world cover (1) + sitting (3) + repaints.
// The sitting effect slices to slotsAvailable; paintFace bails at cap.
// Together: 1 + 3 = 4 minimum; repaints fill the remaining 3 for a max of 7.
// We verify the declared cap is 7 and that addImageSpend is bounded by the cap.
assert.ok(
  forge.includes('Math.min(imageSpendRef.current + n, CREATION_IMAGE_CAP)'),
  'addImageSpend must clamp to CREATION_IMAGE_CAP to prevent overflow',
);

console.log(
  `PASS forgeSpend — CREATION_IMAGE_CAP=${capMatch[1]}; ` +
  `"Generate a world card — 1 image" label present; ` +
  `${paintFaceAriaLabels.length} paint/repaint labels; ` +
  `${sittingImageNote.length} sitting spend notes; ` +
  `remaining capacity shown; cap enforced in all ${slotsAvailableChecks.length + 2} generation paths; ` +
  `parchment floor confirmed; imageSpend tracked in ${imageSpendDecls.length} components.`,
);
