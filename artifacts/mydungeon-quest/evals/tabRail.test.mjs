// TABRAIL GATE (D2) — Rule 19: one horizontally scrollable tab rail with
// scroll snap, 44px minimum height, edge-fade masks, scrollIntoView on
// selection, and fill+underline active state. No duplicate implementations.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const css = readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');
const book = readFileSync(path.join(ROOT, 'src/components/Book.jsx'), 'utf8');

// ── 1. EXACTLY ONE RAIL IMPLEMENTATION ───────────────────────────────────────
// Book.jsx must have exactly one role="tablist" — no duplicate rail.
const tabbedNavCount = (book.match(/role="tablist"/g) || []).length;
assert.equal(
  tabbedNavCount, 1,
  `Book.jsx must have exactly one role="tablist" (found ${tabbedNavCount}); remove any duplicate tab rail`,
);
// The .book-chapters class name must appear in Book.jsx (the one implementation).
assert.ok(
  book.includes('book-chapters'),
  'Book.jsx must reference the .book-chapters rail',
);

// ── 2. SCROLLABLE RAIL WITH SCROLL SNAP ──────────────────────────────────────
// .book-chapters must be overflow-x:auto with scroll-snap-type (no flex-wrap).
const bookChaptersRule = css.match(/\.book-chapters\{[^}]+\}/)?.[0] || '';
assert.ok(bookChaptersRule, '.book-chapters rule must be present in styles.css');
assert.ok(
  bookChaptersRule.includes('overflow-x:auto'),
  '.book-chapters must declare overflow-x:auto for horizontal scroll',
);
assert.ok(
  bookChaptersRule.includes('scroll-snap-type'),
  '.book-chapters must declare scroll-snap-type for snap behavior',
);
assert.ok(
  !bookChaptersRule.includes('flex-wrap:wrap'),
  '.book-chapters must not use flex-wrap:wrap — tabs must never wrap to multiple rows',
);

// ── 3. 44px MINIMUM HEIGHT ────────────────────────────────────────────────────
// Every tab button must meet the 44px touch target minimum.
const buttonRule = css.match(/\.book-chapters button\{[^}]+\}/)?.[0] || '';
assert.ok(buttonRule, '.book-chapters button rule must be present in styles.css');
assert.ok(
  buttonRule.includes('min-height:44px'),
  '.book-chapters button must declare min-height:44px (44px minimum touch target)',
);

// ── 4. ACTIVE STATE: FILL + 2px UNDERLINE (never color alone) ────────────────
// The active tab must declare both a background fill AND an explicit underline
// via box-shadow or border-bottom — not color change alone.
const activeRule = css.match(/\.book-chapters button\.open\{[^}]+\}/)?.[0]
  || css.match(/\.book-chapters button\[aria-selected="true"\]\{[^}]+\}/)?.[0]
  || '';
assert.ok(activeRule, 'An active-tab rule (.open or [aria-selected="true"]) must exist for .book-chapters button');
assert.ok(
  activeRule.includes('background:'),
  'Active tab must declare a background fill (fill part of the active state)',
);
assert.ok(
  activeRule.includes('box-shadow:') || activeRule.includes('border-bottom:'),
  'Active tab must declare a 2px underline via box-shadow or border-bottom (underline part of the active state)',
);

// ── 5. EDGE FADE MASKS — CONDITIONAL ON SCROLL ────────────────────────────────
// .book-chapters-wrap must have ::before and ::after pseudo-elements for the
// left and right edge fades. They must be conditional on scroll position.
assert.ok(
  css.includes('.book-chapters-wrap::before') || css.includes('.book-chapters-wrap:before'),
  '.book-chapters-wrap must declare a ::before pseudo-element for the left edge fade',
);
assert.ok(
  css.includes('.book-chapters-wrap::after') || css.includes('.book-chapters-wrap:after'),
  '.book-chapters-wrap must declare an ::after pseudo-element for the right edge fade',
);
// Fades appear only when scroll is available — gated by a class toggled by JS.
assert.ok(
  css.includes('scroll-has-left') && css.includes('scroll-has-right'),
  'Edge fades must be gated by scroll-has-left / scroll-has-right classes (appear only when scroll is available)',
);

// ── 6. scrollIntoView WIRED FOR SELECTED TAB ─────────────────────────────────
// Book.jsx must call scrollIntoView with inline:'center' to keep the active
// tab visible within the scroll window after selection.
assert.ok(
  book.includes('scrollIntoView') && book.includes("inline: 'center'"),
  "Book.jsx must call scrollIntoView({ inline: 'center' }) to center the selected tab on activation",
);

// ── 7. GAP — 12px (.75rem) ────────────────────────────────────────────────────
assert.ok(
  bookChaptersRule.includes('gap:.75rem'),
  '.book-chapters must declare gap:.75rem (12px gap between tabs)',
);

console.log(
  'PASS tabRail — one scrollable rail; scroll-snap; no flex-wrap; 44px buttons; ' +
  'fill+underline active state; conditional edge fades; scrollIntoView({inline:center}) wired; 12px gap.',
);
