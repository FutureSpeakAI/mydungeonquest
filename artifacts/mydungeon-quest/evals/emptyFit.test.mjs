/**
 * D6 — EMPTY FIT EVAL
 *
 * Verifies the empty-state contract for the Traveler's Chart and Web of Souls:
 *   § 1 — List fallback threshold: ≤4 nodes → list, ≥5 → canvas (source)
 *   § 2 — Legends filtered to present edge types only (source)
 *   § 3 — Node size uniform for non-hero nodes (source)
 *   § 4 — Rumors rendered as a list, not a middot run-on (source)
 *   § 5 — figcaption stacked with chart-caption class (source + CSS)
 *   § 6 — Souls-list and chart-list CSS present (CSS)
 *   § 7 — No container with explicit height that would cause >2x oversize (CSS)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const soulsSrc = readFileSync(join(root, 'src/components/SoulsWeb.jsx'), 'utf8');
const chartSrc = readFileSync(join(root, 'src/components/TravelersChart.jsx'), 'utf8');

const failures = [];
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.log(`  ✗ ${msg}`); failures.push(msg); };

// ── §1 List fallback threshold ─────────────────────────────────────────────
console.log('\n§1 List fallback threshold (≤4 → list, ≥5 → canvas)');

// SoulsWeb: must check nodes.length <= 4 (or < 5) before rendering SVG
if (/web\.nodes\.length\s*<=\s*4/.test(soulsSrc) || /web\.nodes\.length\s*<\s*5/.test(soulsSrc))
  pass('SoulsWeb has list fallback guard at ≤4 nodes');
else
  fail('SoulsWeb must render a list when nodes ≤ 4 (check web.nodes.length <= 4 or < 5)');

// SoulsWeb list fallback must NOT render an SVG for small counts
if (/souls-list/.test(soulsSrc))
  pass('SoulsWeb list fallback uses souls-list class');
else
  fail('SoulsWeb list fallback must use souls-list class');

// TravelersChart: must check medallions.length <= 4 (or < 5)
if (/chart\.medallions\.length\s*<=\s*4/.test(chartSrc) || /chart\.medallions\.length\s*<\s*5/.test(chartSrc))
  pass('TravelersChart has list fallback guard at ≤4 medallions');
else
  fail('TravelersChart must render a list when medallions ≤ 4');

if (/chart-list/.test(chartSrc))
  pass('TravelersChart list fallback uses chart-list class');
else
  fail('TravelersChart list fallback must use chart-list class');

// The full SVG canvas must be guarded behind the >4 threshold
if (/FULL CANVAS|five or more|full canvas/i.test(soulsSrc))
  pass('SoulsWeb full canvas is guarded behind the threshold comment');
else if (/web\.nodes\.length\s*(<=\s*4|<\s*5)/.test(soulsSrc))
  pass('SoulsWeb SVG render falls after the threshold guard');
else
  fail('SoulsWeb SVG canvas must be gated — only renders above threshold');

// ── §2 Legend filtered to present edge types ───────────────────────────────
console.log('\n§2 Legend shows only present edge types');

// SoulsWeb: must compute present types and filter
if (/presentTypes/.test(soulsSrc) || /new Set\(web\.edges\.map/.test(soulsSrc))
  pass('SoulsWeb computes the set of present edge types');
else
  fail('SoulsWeb must derive the set of present edge types from web.edges');

// Legend must be filtered (STRAND_ENTRIES.filter, not all hardcoded)
if (/STRAND_ENTRIES\.filter/.test(soulsSrc) || /filter\(\s*\(\[type\]\)/.test(soulsSrc))
  pass('SoulsWeb legend is filtered to present types');
else
  fail('SoulsWeb legend must filter STRAND_ENTRIES to only present types');

// Old hardcoded legend (all four always) must be gone
const hardcodedLegend = /<span><i className="key-kin"\s*\/>bound by blood<\/span>/.test(soulsSrc) &&
  /<span><i className="key-enemy"\s*\/>sworn enemies<\/span>/.test(soulsSrc) &&
  /<span><i className="key-ally"\s*\/>oath and bond<\/span>/.test(soulsSrc) &&
  /<span><i className="key-met"\s*\/>paths crossed<\/span>/.test(soulsSrc);
if (!hardcodedLegend)
  pass('Legend is not hardcoded (no all-four static span block)');
else
  fail('Legend must not be all four types hardcoded — filter to present types only');

// ── §3 Uniform node size ───────────────────────────────────────────────────
console.log('\n§3 Non-hero nodes are uniform in size');

// Must NOT have `bond * 2` or bond-based radius variation for non-hero nodes
if (/node\.bond\)\s*\*\s*[0-9]/.test(soulsSrc) || /bond\s*\*\s*[0-9]/.test(soulsSrc.replace(/\/\/.*/g, '')))
  fail('Node radius must not vary by bond — uniform size for non-hero nodes; position encodes bond');
else
  pass('Node radius does not scale with bond (uniform non-hero size)');

// Hero is distinguished
if (/node\.hero\s*\?\s*[0-9]+\s*:\s*[0-9]+/.test(soulsSrc))
  pass('Hero and non-hero nodes use different fixed radii');
else
  fail('SoulsWeb must set hero radius distinctly from non-hero radius (both fixed, no bond scaling)');

// ── §4 Rumors as a list ────────────────────────────────────────────────────
console.log('\n§4 Rumors rendered one per line');

// Old middot join must be gone
if (/i > 0 \? ' · '/.test(chartSrc) || /i>0\?'·'/.test(chartSrc))
  fail('Rumors must not be joined by middots — render as a list instead');
else
  pass('No middot join found in rumors');

// New pattern: ul + li for rumors
if (/chart-rumor-list/.test(chartSrc))
  pass('Rumors use chart-rumor-list class (one per line)');
else
  fail('Rumors must render in a .chart-rumor-list (ul > li per rumor)');

// Must render edge_rumors entries as li elements
if (/<li key=\{i\}>/.test(chartSrc) || /<li key={i}/.test(chartSrc))
  pass('Each rumor renders as a <li> element');
else
  fail('Each rumor must be a <li> element');

// ── §5 figcaption stacked ──────────────────────────────────────────────────
console.log('\n§5 Chart figcaption stacked (chart-caption class)');

// TravelersChart must use chart-caption class on figcaption
if (/<figcaption className="chart-caption"/.test(chartSrc))
  pass('TravelersChart figcaption has chart-caption class');
else
  fail('TravelersChart figcaption must use className="chart-caption"');

// CSS must make chart-caption display:block (stacked)
if (/\.chart-caption\{[^}]*display:block/.test(css))
  pass('.chart-caption CSS is display:block (stacked paragraphs)');
else
  fail('.chart-caption must have display:block to stack paragraphs');

// ── §6 List fallback CSS ───────────────────────────────────────────────────
console.log('\n§6 List fallback CSS classes present');

if (/\.souls-list\{/.test(css)) pass('.souls-list styled');
else fail('.souls-list must be styled in CSS');

if (/\.chart-list\{/.test(css)) pass('.chart-list styled');
else fail('.chart-list must be styled in CSS');

if (/\.chart-rumor-list\{/.test(css)) pass('.chart-rumor-list styled');
else fail('.chart-rumor-list must be styled in CSS');

if (/\.chart-caption\{/.test(css)) pass('.chart-caption styled');
else fail('.chart-caption must be styled in CSS');

// Centering for list items
if (/justify-items:center/.test(css) || /text-align:center/.test(css))
  pass('List fallback items are centred');
else
  fail('List fallback must centre its items (justify-items:center or text-align:center)');

// ── §7 No oversized empty containers ──────────────────────────────────────
console.log('\n§7 Containers shrink to content in the list fallback');

// Neither .souls-web nor .travelers-chart should have a fixed min-height
// that would dwarf the list content. The --list variant must clear it.
if (/travelers-chart--list.*min-height:unset|souls-web--list.*min-height:unset/.test(css.replace(/\s/g, '')))
  pass('List-variant classes clear any min-height constraint');
else if (!/.souls-web{[^}]*min-height/.test(css) && !/.travelers-chart{[^}]*min-height/.test(css))
  pass('Base container classes have no min-height that would oversize the list');
else
  fail('List-fallback containers must not carry a large min-height (add --list modifier or remove from base)');

// SVG containers are height:auto (already enforced by viewBox, just verify)
if (/\.souls-web svg\{[^}]*height:auto/.test(css))
  pass('.souls-web svg is height:auto (no fixed canvas height)');
else
  fail('.souls-web svg must be height:auto');

if (/\.travelers-chart svg\{[^}]*height:auto/.test(css))
  pass('.travelers-chart svg is height:auto (no fixed canvas height)');
else
  fail('.travelers-chart svg must be height:auto');

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
if (failures.length === 0) {
  console.log('PASS emptyFit — list fallback below 5 nodes, filtered legend, uniform node size, rumors one-per-line, stacked caption, shrinking containers.\n');
} else {
  console.log(`FAIL emptyFit — ${failures.length} failing check(s):\n`);
  failures.forEach((f) => console.log(`  • ${f}`));
  console.log();
  process.exit(1);
}
