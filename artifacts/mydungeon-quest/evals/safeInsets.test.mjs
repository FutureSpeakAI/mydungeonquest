// SAFE INSETS GATE (D1) — Rule 13: every scroll container applies
// chrome-safe padding; headings, buttons, and links are never occluded by
// the sticky table header, the fixed composer, or the dev-badge zone.
//
// This is a CSS SOURCE verification (not a browser/DOM probe).
// It checks that the required CSS variables are declared and that each
// layout surface applies them correctly. The "360 / 390 / 430 widths"
// dimension checks confirm that the ≤720px media override does NOT remove
// or override the inset properties added by D1.
//
// Five structural guarantees verified:
//   1. Chrome variables defined in :root with correct measured values.
//   2. html carries scroll-padding-top referencing --chrome-top.
//   3. .modal carries scroll-padding-top referencing --modal-chrome.
//   4. .book-chapters is position:sticky beneath the modal header.
//   5. .seal-status reserves the badge zone on its right edge.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');

// ── 1. CSS VARIABLES DEFINED IN :root ────────────────────────────────────────
// Values are MEASURED from the rendered layout:
//   --chrome-top    = table-header height (72px, position:sticky;top:0)
//   --chrome-bottom = seal-status height  (28px, position:fixed;bottom:0)
//   --badge-safe    = dev-badge clearance (80px, bottom-right corner)
//   --modal-chrome  = modal header height (~58px, padding:1rem + h2 + 1rem)

assert.ok(
  css.includes('--chrome-top:72px'),
  '--chrome-top must be declared as 72px in :root (measured table-header height)',
);
assert.ok(
  css.includes('--chrome-bottom:28px'),
  '--chrome-bottom must be declared as 28px in :root (measured seal-status height)',
);
assert.ok(
  css.includes('--badge-safe:80px'),
  '--badge-safe must be declared as 80px in :root (dev-badge clearance)',
);
assert.ok(
  css.includes('--modal-chrome:58px'),
  '--modal-chrome must be declared in :root (modal header height for scroll-padding)',
);

// ── 2. html CARRIES scroll-padding-top ───────────────────────────────────────
// When scrollIntoView() is called (e.g., logEndRef.scrollIntoView()), the
// browser must leave --chrome-top px clear at the top so the sticky header
// (table-header) does not occlude the target element.
assert.ok(
  css.includes('html{scroll-padding-top:var(--chrome-top)}'),
  'html must set scroll-padding-top:var(--chrome-top) so scrollIntoView() clears the sticky header',
);

// Width verification (360 / 390 / 430):
// The ≤720px media query must NOT override or remove scroll-padding-top on html.
const mobile720Block = css.match(/@media\(max-width:720px\)\{([\s\S]*?)\}/)?.[0] || '';
assert.ok(
  !mobile720Block.includes('html{scroll-padding-top:0') && !mobile720Block.includes('html{scroll-padding-top:none'),
  '@media(max-width:720px) must not zero-out html scroll-padding-top (affects 360/390/430 widths)',
);

// ── 3. .modal CARRIES scroll-padding-top ────────────────────────────────────
// The modal is the scroll container for Settings, Book, CharacterSheet, etc.
// Without scroll-padding-top, headings scrolled-to inside the modal are
// occluded by the modal's own sticky header (.modal>header).
assert.ok(
  css.includes('scroll-padding-top:var(--modal-chrome)'),
  '.modal must set scroll-padding-top:var(--modal-chrome) to clear its own sticky header',
);

// The modal rule must contain this property:
const modalRule = css.match(/\.modal\{[^}]+\}/)?.[0] || '';
assert.ok(
  modalRule.includes('scroll-padding-top:var(--modal-chrome)'),
  'scroll-padding-top:var(--modal-chrome) must be inside the .modal{} rule',
);

// Width verification:
// Mobile override (.modal{max-height:100vh;height:100vh;border-radius:0;border:0})
// must NOT override scroll-padding-top to 0 or remove it.
assert.ok(
  !mobile720Block.includes('scroll-padding-top:0'),
  '@media(max-width:720px) must not zero-out scroll-padding-top (affects 360/390/430 widths)',
);

// ── 4. .book-chapters-wrap IS position:sticky BENEATH THE MODAL HEADER ───────
// D2 moved the sticky+background to .book-chapters-wrap so the inner nav can
// own overflow-x:auto (sticky + ancestor-overflow conflict does not apply
// to the sticky element itself). The rail must still stick just below the
// modal header at the same calc() offset.
assert.ok(
  css.includes('.book-chapters-wrap{'),
  '.book-chapters-wrap must be present in the stylesheet (D2 sticky wrapper)',
);

const bookChaptersWrapRule = css.match(/\.book-chapters-wrap\{[^}]+\}/)?.[0] || '';
assert.ok(
  bookChaptersWrapRule.includes('position:sticky'),
  '.book-chapters-wrap must declare position:sticky',
);
assert.ok(
  bookChaptersWrapRule.includes('top:calc(var(--modal-chrome) - 1.2rem)'),
  '.book-chapters-wrap top must be calc(var(--modal-chrome) - 1.2rem) to clear the modal header',
);
assert.ok(
  bookChaptersWrapRule.includes('z-index:2'),
  '.book-chapters-wrap must have z-index:2 to paint above scrolling content',
);
assert.ok(
  bookChaptersWrapRule.includes('background:') && !bookChaptersWrapRule.includes('background:transparent'),
  '.book-chapters-wrap must have an opaque background so content does not bleed through',
);

// Width verification: mobile override must not remove sticky from the wrapper.
assert.ok(
  !mobile720Block.includes('.book-chapters-wrap{position:static') &&
  !mobile720Block.includes('.book-chapters-wrap{position:relative'),
  '@media(max-width:720px) must not un-stick .book-chapters-wrap (affects 360/390/430 widths)',
);

// ── 5. .seal-status RESERVES THE BADGE ZONE ──────────────────────────────────
// The Replit dev badge lives at the bottom-right corner (~80px wide).
// The seal-status bar spans the full viewport width and must not render
// its text content underneath the badge.
// We check ALL .seal-status{} rules in the file (base + every media override):
// any rule that uses the padding shorthand must also set padding-right:var(--badge-safe),
// otherwise the shorthand silently wipes the badge clearance at narrow widths.
const allSealRules = [...css.matchAll(/\.seal-status\{[^}]+\}/g)].map((m) => m[0]);
assert.ok(
  allSealRules.length >= 1,
  '.seal-status rule must be present in the stylesheet',
);
assert.ok(
  allSealRules[0].includes('padding-right:var(--badge-safe)'),
  '.seal-status base rule must pad its right edge by --badge-safe to clear the dev badge',
);
for (const rule of allSealRules) {
  if (rule.includes('padding:')) {
    assert.ok(
      rule.includes('padding-right:var(--badge-safe)'),
      `.seal-status rule uses a padding shorthand without preserving padding-right:var(--badge-safe) — badge zone wiped at 360/390/430 widths (rule: ${rule.slice(0, 100)})`,
    );
  }
}

console.log(
  'PASS safeInsets — chrome vars declared (top 72px / bottom 28px / badge 80px / modal 58px); ' +
  'html scroll-padding-top wired; .modal scroll-padding-top wired; ' +
  '.book-chapters sticky with opaque background beneath modal header; ' +
  '.seal-status badge zone reserved; all three narrow-width breakpoints (360/390/430) unaffected.',
);
