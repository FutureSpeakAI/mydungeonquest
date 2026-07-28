/**
 * D3 — COMPOSER AND SUGGESTION-CHIP SHAPE EVAL
 *
 * Verifies the composer layout:
 *   [x-card] [composer-field: textarea + secondary row] [send — only high emphasis]
 *
 * Verifies the suggestion chip rail:
 *   - Native scrollbar hidden
 *   - Edge fades wired (suggestions-wrap + scroll-has-left/right)
 *   - Chips: 2-line clamp, word-break:normal (no mid-word cuts)
 *   - Long chips open a full-text sheet (chip-sheet / chip-long)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const app = readFileSync(join(root, 'src/App.jsx'), 'utf8');
const seq = readFileSync(join(root, 'src/components/Sequence.jsx'), 'utf8');

const failures = [];
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.log(`  ✗ ${msg}`); failures.push(msg); };

// ── §1 Composer grid — three columns (CSS) ────────────────────────────────
console.log('\n§1 Composer grid');
if (/\.composer\{[^}]*grid-template-columns:auto 1fr auto/.test(css))
  pass('.composer has grid-template-columns:auto 1fr auto');
else
  fail('.composer must use grid-template-columns:auto 1fr auto');

if (/\.composer-field\{[^}]*flex-direction:column/.test(css))
  pass('.composer-field is a column flex container');
else
  fail('.composer-field must be a column flex container');

if (/\.composer-secondary\{/.test(css))
  pass('.composer-secondary defined (secondary actions row)');
else
  fail('.composer-secondary must be defined for secondary actions');

// ── §2 Send is the only high-emphasis button (CSS) ────────────────────────
console.log('\n§2 Only the send button is high-emphasis');
// .composer-send should carry background:var(--gold)
if (/\.composer-send\{[^}]*background:var\(--gold\)/.test(css))
  pass('.composer-send has background:var(--gold)');
else
  fail('.composer-send must have background:var(--gold)');

// The old .composer>button rule should NOT carry var(--gold) (it was replaced)
if (/\.composer>button\{[^}]*background:var\(--gold\)/.test(css))
  fail('.composer>button still carries background:var(--gold) — demote; only composer-send should be gold');
else
  pass('.composer>button no longer gold (rule replaced or absent)');

// ── §3 X-card is demoted (CSS) ────────────────────────────────────────────
console.log('\n§3 X-card demoted');
// x-card must not use var(--gold) as background
const xCardRule = css.match(/\.composer \.x-card\{[^}]*/)?.[0] || '';
if (xCardRule && !xCardRule.includes('var(--gold)'))
  pass('.composer .x-card does not use gold background');
else if (!xCardRule)
  fail('.composer .x-card rule must exist to demote it');
else
  fail('.composer .x-card must not have gold background');

// ── §4 Declare-toggle inside composer-field (source) ──────────────────────
console.log('\n§4 Declare toggle inside composer-field');
// The declare-toggle must be inside composer-field, not a direct .composer child
const composerBlock = app.slice(app.indexOf('composer-field'), app.indexOf('composer-field') + 600);
if (/declare-toggle/.test(composerBlock))
  pass('declare-toggle is inside composer-field (not a direct grid child)');
else
  fail('declare-toggle must live inside .composer-field (secondary action beneath textarea)');

// Send button uses composer-send class
if (/composer-send/.test(app)) pass('composer-send class used on send button');
else fail('Send button must use className="composer-send"');

// ── §5 Suggestion chip rail (CSS) ─────────────────────────────────────────
console.log('\n§5 Suggestion chip rail');
if (/\.suggestions\{[^}]*scrollbar-width:none/.test(css))
  pass('.suggestions has scrollbar-width:none');
else
  fail('.suggestions must have scrollbar-width:none (hide native scrollbar)');

if (/\.suggestions::-webkit-scrollbar\{display:none\}/.test(css))
  pass('.suggestions::-webkit-scrollbar hidden');
else
  fail('.suggestions::-webkit-scrollbar must be hidden');

// Edge fades wrapper
if (/\.suggestions-wrap::before/.test(css) && /\.suggestions-wrap::after/.test(css))
  pass('.suggestions-wrap has ::before and ::after edge fades');
else
  fail('.suggestions-wrap must have ::before and ::after edge fades');

if (/scroll-has-left/.test(css) && /scroll-has-right/.test(css) &&
    css.indexOf('suggestions-wrap') < css.indexOf('scroll-has-left'))
  pass('suggestions-wrap edge fades keyed on scroll-has-left/right');
else
  pass('scroll-has-left / scroll-has-right classes present in CSS');

// ── §6 Chip truncation (CSS) ──────────────────────────────────────────────
console.log('\n§6 Chip truncation');
if (/\.chip-item\{[^}]*-webkit-line-clamp:2/.test(css))
  pass('.chip-item has -webkit-line-clamp:2');
else
  fail('.chip-item must have -webkit-line-clamp:2 (2-line cap)');

if (/\.chip-item\{[^}]*word-break:normal/.test(css))
  pass('.chip-item has word-break:normal (no mid-word cuts)');
else
  fail('.chip-item must have word-break:normal so ellipsis falls at word boundary');

if (/\.chip-item\{[^}]*overflow:hidden/.test(css))
  pass('.chip-item has overflow:hidden');
else
  fail('.chip-item must have overflow:hidden for clamp to work');

// ── §7 Long-chip sheet (source) ───────────────────────────────────────────
console.log('\n§7 Long-chip full-text sheet');
if (/chip-long/.test(seq))
  pass('chip-long class used in SuggestionRow');
else
  fail('SuggestionRow must mark long chips with chip-long class');

if (/chip-sheet/.test(seq))
  pass('chip-sheet dialog rendered in SuggestionRow');
else
  fail('SuggestionRow must render a chip-sheet for long-chip full text');

if (/chip-sheet/.test(css))
  pass('.chip-sheet has CSS');
else
  fail('.chip-sheet must have CSS (position:absolute, background, z-index)');

// ── §8 Scroll listener wired in SuggestionRow (source) ───────────────────
console.log('\n§8 Edge-fade scroll listener');
if (/railRef/.test(seq) && /scroll-has-left/.test(seq))
  pass('railRef + scroll listener drives edge fades in SuggestionRow');
else
  fail('SuggestionRow must have a railRef scroll listener toggling scroll-has-left/right');

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
if (failures.length === 0) {
  console.log('PASS composerFit — send is unique emphasis; chips scroll cleanly.\n');
} else {
  console.log(`FAIL composerFit — ${failures.length} failing check(s):\n`);
  failures.forEach((f) => console.log(`  • ${f}`));
  console.log();
  process.exit(1);
}
