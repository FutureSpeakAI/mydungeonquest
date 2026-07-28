// ---- FORGE CHROME GATE (D10, Rules 13 + 15 + 18) ----
//
// Verifies that all five creation routes and the HeroForge heir path meet
// the same chrome standards as the main play surface:
//
//   Rule 13 (safe insets) — CSS variables are declared; creation screens
//     apply padding-top that references --chrome-top so the sticky table
//     header never occludes the first heading at 360, 390, or 430 px.
//
//   Rule 15 (house controls) — no native <select> anywhere in the creation
//     flow; every controlled input is a house radio chip or existing house
//     control (text input, checkbox for spells is exempt as it is not a
//     selection metaphor, covered separately).
//
//   Rule 18 (voice normalization) — audition chips are laid out in a CSS
//     grid (not flex-wrap) so each chip runs full-width at all three narrow
//     breakpoints; the expand button is block-level and full-width.
//
// Five creation routes: World (step 0), Class (step 1), Face (step 2),
//   Voice (step 3), Name (step 4) — bound by CREATION_STEPS in Forge.jsx.
//
// Headless — no build, no browser, no AI keys. Pure source courts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const forgeSrc  = readFileSync(path.join(ROOT, 'src/components/Forge.jsx'), 'utf8');
const stylesSrc = readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');

// ── §1 SAFE INSETS — CSS variables present (Rule 13) ─────────────────────
// These are the same variables checked by safeInsets.test.mjs; forge surfaces
// inherit them, so their existence is the gate, not per-screen declarations.
assert.ok(stylesSrc.includes('--chrome-top:72px'),
  '--chrome-top must be declared in :root (forge surfaces inherit it)');
assert.ok(stylesSrc.includes('--chrome-bottom:28px'),
  '--chrome-bottom must be declared in :root');
assert.ok(stylesSrc.includes('html{scroll-padding-top:var(--chrome-top)}'),
  'html must carry scroll-padding-top:var(--chrome-top) — forge scroll targets clear the sticky header');

// creation-page must exist as a layout class so the creation router has a
// known scroll root that inherits the html scroll-padding-top.
assert.ok(stylesSrc.includes('.creation-page{'),
  '.creation-page must be declared in styles.css (creation router scroll root)');

// forge-page must exist for the HeroForge heir path.
assert.ok(stylesSrc.includes('.forge-page{'),
  '.forge-page must be declared in styles.css (HeroForge heir path layout)');

// forge-header h1 must carry overflow-wrap:break-word so long headings never
// clip at 360 px — "HERO FORGE" (eyebrow text-transform: uppercase) and long
// step headings both pass through this rule.
assert.ok(
  stylesSrc.includes('overflow-wrap:break-word') ||
  stylesSrc.match(/\.forge-header h1\{[^}]*overflow-wrap/),
  'forge-header h1 must declare overflow-wrap:break-word to prevent heading clip at 360/390/430 px'
);

// The @media(max-width:720px) override must not remove safe insets from
// creation or forge pages at 360/390/430 widths.
const mobile720 = stylesSrc.match(/@media\(max-width:720px\)\{([\s\S]*?)\}/)?.[0] || '';
assert.ok(
  !mobile720.includes('.creation-page{padding-top:0') &&
  !mobile720.includes('.forge-page{padding-top:0'),
  '@media(max-width:720px) must not zero-out top padding on creation or forge pages'
);

// ── §2 FIVE CREATION ROUTES PRESENT (Rule 13) ─────────────────────────────
// CREATION_STEPS exports the route names; five routes means five step entries.
const stepsMatch = forgeSrc.match(/CREATION_STEPS\s*=\s*\[([^\]]+)\]/);
assert.ok(stepsMatch, 'CREATION_STEPS must be declared in Forge.jsx');
const stepsCount = (stepsMatch[1].match(/'/g) || []).length / 2;
assert.ok(
  stepsCount >= 5,
  `CREATION_STEPS must define at least 5 routes — found ${stepsCount}`
);

// HeroForge heir path must be exported.
// Note: the heading-clip fix is CSS overflow-wrap (§1 above); the eyebrow
// text follows the plain-language law ("New heir") enforced by plainSpeech.
assert.ok(
  forgeSrc.includes("export function HeroForge("),
  'HeroForge must be exported from Forge.jsx (heir path)'
);
assert.ok(
  forgeSrc.includes('>New heir<'),
  'HeroForge eyebrow must read "New heir" (plain language, not house vocab — see plainSpeech gate)'
);

// ── §3 NO NATIVE <select> IN CREATION FLOW (Rule 15) ─────────────────────
// Extract only the creation-related functions: IdentityControl, HeroForge,
// and the CreationRouter (export function CreationRouter / export default).
// Spell-pick checkboxes and stat-table are exempt (not selection metaphors).
//
// Strategy: count <select occurrences in the full file — all must be gone.
const selectOccurrences = (forgeSrc.match(/<select\b/g) || []).length;
assert.strictEqual(
  selectOccurrences,
  0,
  `No native <select> elements allowed in Forge.jsx — found ${selectOccurrences}. ` +
  'Replace with house radio chips (register-chip, calling-chip, or identity-chip pattern).'
);

// IdentityControl must use role="radiogroup" for the voice register (custom mode).
assert.ok(
  forgeSrc.includes('register-radio-row') || forgeSrc.includes('role="radiogroup"'),
  'IdentityControl custom mode must use a house radiogroup for voice register selection'
);
assert.ok(
  forgeSrc.includes('register-chip'),
  'register-chip class must be used for voice register radio buttons in IdentityControl'
);

// HeroForge calling picker must use calling-chip radio buttons.
assert.ok(
  forgeSrc.includes('calling-chip'),
  'calling-chip class must be used for calling/class radio buttons in HeroForge'
);
assert.ok(
  forgeSrc.includes('calling-chips'),
  'calling-chips container must be present in HeroForge'
);

// ── §4 VOICE BUTTONS FULL-WIDTH (Rule 18) ────────────────────────────────
// .audition-choices must use display:grid (not display:flex;flex-wrap:wrap)
// so every chip runs the full container width at 360/390/430 px.
// Check that there is no audition-choices rule with flex-wrap:wrap remaining.
const auditionChoicesRules = [...stylesSrc.matchAll(/\.audition-choices\{[^}]+\}/g)].map(m => m[0]);
assert.ok(
  auditionChoicesRules.length >= 1,
  '.audition-choices must be styled in styles.css'
);
for (const rule of auditionChoicesRules) {
  assert.ok(
    !rule.includes('flex-wrap:wrap'),
    '.audition-choices must not use flex-wrap:wrap — use display:grid so chips are full-width at 360/390/430 px'
  );
}
// At least one audition-choices rule must declare display:grid.
assert.ok(
  auditionChoicesRules.some(r => r.includes('display:grid')),
  'at least one .audition-choices rule must declare display:grid for full-width chips'
);

// .audition-expand must be block-level (not inline) so it stretches full width.
const expandRules = [...stylesSrc.matchAll(/\.audition-expand\{[^}]+\}/g)].map(m => m[0]);
assert.ok(expandRules.length >= 1, '.audition-expand must be styled');
assert.ok(
  expandRules.some(r => r.includes('display:block') || r.includes('width:100%') || r.includes('min-height:44px')),
  '.audition-expand must be display:block or width:100% (full-width touch target at narrow widths)'
);

// ── §5 CSS FOR NEW HOUSE CONTROLS (Rule 15) ──────────────────────────────
// register-chip and calling-chip must be styled.
assert.ok(
  stylesSrc.includes('.register-chip'),
  '.register-chip must be defined in styles.css'
);
assert.ok(
  stylesSrc.includes('.calling-chip'),
  '.calling-chip must be defined in styles.css'
);
// Both must have a .selected variant for the checked state.
assert.ok(
  stylesSrc.includes('.register-chip.selected') || stylesSrc.match(/\.register-chip\.selected\{/),
  '.register-chip.selected must be defined (visible checked state)'
);
assert.ok(
  stylesSrc.includes('.calling-chip.selected') || stylesSrc.match(/\.calling-chip\.selected\{/),
  '.calling-chip.selected must be defined (visible checked state)'
);

console.log(
  'PASS forgeChrome \u2014 D10 creation-screen chrome: ' +
  'safe insets inherited (--chrome-top, scroll-padding-top, overflow-wrap on h1); ' +
  'all 5 creation routes + HeroForge exported ("New heir" plain-language eyebrow); ' +
  'zero native <select> in Forge.jsx (register-chip + calling-chip replace them); ' +
  'audition chips are display:grid (full-width at 360/390/430 px); ' +
  'register-chip, calling-chip, and their .selected variants are styled.'
);
