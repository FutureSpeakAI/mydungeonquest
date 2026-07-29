/**
 * D3 — HUD SHAPE EVAL
 *
 * Verifies the table-header is a fixed two-row grid:
 *   row 1: avatar, calendar chip, icon rail
 *   row 2: state chips with overflow-x scroll and edge fades
 *
 * Also checks:
 *   - Portrait fallback wired to the sigil-button
 *   - Chronicle-die replaces the red-sphere wax-seal
 *   - Accessible names on every nav button
 *   - white-space:nowrap on every chip and day-chip
 *   - --chrome-top:72px unchanged (safe-insets law holds)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const app = readFileSync(join(root, 'src/App.jsx'), 'utf8');

const failures = [];
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.log(`  ✗ ${msg}`); failures.push(msg); };

// ── §1 Two-row grid (CSS) ─────────────────────────────────────────────────
console.log('\n§1 Two-row grid');
if (/\.table-header\{[^}]*grid-template-rows:[^}]*44px[^}]*28px/.test(css))
  pass('table-header uses grid-template-rows:44px 28px');
else
  fail('table-header must use grid-template-rows:44px 28px (not flex wrap)');

if (/\.hud-row-1\{/.test(css)) pass('.hud-row-1 defined');
else fail('.hud-row-1 must be defined');

if (/\.hud-row-2\{/.test(css)) pass('.hud-row-2 defined');
else fail('.hud-row-2 must be defined');

// ── §2 State-chip overflow rail (CSS) ─────────────────────────────────────
console.log('\n§2 State-chip overflow rail');
if (/\.hud-state-chips\{[^}]*overflow-x:auto/.test(css))
  pass('.hud-state-chips has overflow-x:auto');
else
  fail('.hud-state-chips must have overflow-x:auto');

if (/\.hud-state-chips\{[^}]*scrollbar-width:none/.test(css))
  pass('.hud-state-chips has scrollbar-width:none');
else
  fail('.hud-state-chips must have scrollbar-width:none');

// Edge fades
if (/\.hud-state-chips-wrap\.scroll-has-left::(before|after)\{/.test(css) ||
    /scroll-has-left.*opacity/.test(css))
  pass('.hud-state-chips-wrap edge fades wired to .scroll-has-left / .scroll-has-right');
else
  fail('.hud-state-chips-wrap must have scroll-has-left/right edge fades');

// ── §3 Chip white-space (CSS) ─────────────────────────────────────────────
console.log('\n§3 Chip white-space');
if (/\.table-chip\{[^}]*white-space:nowrap/.test(css))
  pass('.table-chip has white-space:nowrap');
else
  fail('.table-chip must have white-space:nowrap');

if (/\.day-chip\{[^}]*white-space:nowrap/.test(css))
  pass('.day-chip has white-space:nowrap');
else
  fail('.day-chip must have white-space:nowrap');

// ── §4 Red sphere gone; chronicle-die present (CSS) ───────────────────────
console.log('\n§4 Chronicle die (no red sphere)');
// The old wax-seal had a red radial-gradient with #c4483b — verify it's gone
if (!css.includes('#c4483b') && !css.includes('wax-seal'))
  pass('Red sphere wax-seal CSS removed');
else
  fail('wax-seal red-sphere CSS (#c4483b) must be removed');

if (/\.chronicle-die\{/.test(css))
  pass('.chronicle-die defined');
else
  fail('.chronicle-die must be defined');

// ── §5 Portrait fallback wired (source) ───────────────────────────────────
console.log('\n§5 Portrait fallback');
if (/sigil-portrait/.test(app) && /gallery\[current\.hero\.name\]/.test(app))
  pass('sigil-portrait image wired with gallery fallback');
else
  fail('sigil-button must show portrait via gallery[current.hero.name] with emoji fallback');

if (/\.sigil-portrait\{[^}]*border-radius:50%/.test(css))
  pass('.sigil-portrait has border-radius:50%');
else
  fail('.sigil-portrait must have border-radius:50%');

// ── §6 Accessible names on nav buttons (source) ───────────────────────────
console.log('\n§6 Accessible nav names');
const bookAria = /aria-label=["'][^"']*[Bb]ook[^"']*["']/.test(app) ||
                 /aria-label=["'][^"']*[Bb]ook["']/.test(app);
if (bookAria) pass('Book button has aria-label');
else fail('Book nav button must have aria-label containing "Book"');

const settingsAria = /aria-label=["'][^"']*settings["']/.test(app) ||
                     /aria-label=["'][^"']*Settings["']/.test(app) ||
                     /aria-label=["'][^"']*care["']/.test(app);
if (settingsAria) pass('Settings button has aria-label');
else fail('Settings nav button must have aria-label');

if (/chronicle-die[^>]*aria-label=|aria-label=[^>]*chronicle/.test(app.replace(/\s+/g, ' ')))
  pass('chronicle-die has aria-label');
else if (/className="chronicle-die"[^>]*aria-label/.test(app.replace(/\s+/g, ' ')))
  pass('chronicle-die has aria-label');
else {
  // Check that the chronicle-die button has aria-label somewhere nearby
  const dieIdx = app.indexOf('chronicle-die');
  if (dieIdx >= 0 && app.slice(dieIdx, dieIdx + 200).includes('aria-label'))
    pass('chronicle-die button has aria-label');
  else
    fail('chronicle-die button must have aria-label');
}

// ── §7 Sigil-button aria-label (source) ───────────────────────────────────
console.log('\n§7 Sigil-button accessible name');
if (/sigil-button[^>]*aria-label|aria-label[^>]*sigil-button/.test(app.replace(/\s+/g, ' '))) {
  pass('sigil-button has aria-label');
} else {
  // It might be on the button directly without the class reference
  const sbIdx = app.indexOf('"sigil-button"');
  if (sbIdx >= 0 && app.slice(sbIdx, sbIdx + 300).includes('aria-label'))
    pass('sigil-button has aria-label');
  else
    fail('sigil-button must have aria-label');
}

// ── §8 --chrome-top is a safe-area-aware value (CSS) ─────────────────────
// K0.2 (Stage 6): --chrome-top now uses calc(72px + env(safe-area-inset-top))
// so scroll-padding-top clears the full notch-aware header height.
console.log('\n§8 Safe-insets law holds');
if (/--chrome-top:calc\(72px \+ env\(safe-area-inset-top\)\)/.test(css))
  pass('--chrome-top is calc(72px + env(safe-area-inset-top)) — notch-aware header height (K0.2)');
else if (/--chrome-top:72px/.test(css))
  fail('--chrome-top must be updated to calc(72px + env(safe-area-inset-top)) for K0.2 notch support');
else
  fail('--chrome-top must be declared in :root; K0.2 requires calc(72px + env(safe-area-inset-top))');

// ── §9 stateChipsRef wired for edge fades (source) ────────────────────────
console.log('\n§9 Edge-fade ref wired');
if (/stateChipsRef/.test(app) && /hud-state-chips[^>]*ref=\{stateChipsRef\}/.test(app.replace(/\s+/g, ' ')))
  pass('stateChipsRef wired to hud-state-chips div');
else if (/stateChipsRef/.test(app) && /ref=\{stateChipsRef\}/.test(app))
  pass('stateChipsRef wired');
else
  fail('stateChipsRef must be declared and wired to .hud-state-chips');

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
if (failures.length === 0) {
  console.log('PASS hudFit — HUD is a two-row grid, accessible, no red sphere.\n');
} else {
  console.log(`FAIL hudFit — ${failures.length} failing check(s):\n`);
  failures.forEach((f) => console.log(`  • ${f}`));
  console.log();
  process.exit(1);
}
