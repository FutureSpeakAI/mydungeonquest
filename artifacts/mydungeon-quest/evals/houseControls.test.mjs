/**
 * D5 — HOUSE CONTROLS EVAL
 *
 * Verifies that the Settings panel uses only styled, accessible form controls:
 *   - Checkboxes → HcSwitch (role="switch", aria-checked, 44 × 44 hit area)
 *   - Range input → HcSlider (role="slider", aria-valuenow, keyboard support)
 *   - Foundry tier + tempo → radio cards (role="radiogroup", role="radio", aria-checked)
 *   - All controls align to the top of the row (align-items:start on .toggle)
 *   - No raw browser checkbox, radio, or range input in the Settings component
 *   - Visible selected mark on radio cards (not color alone)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const overlays = readFileSync(join(root, 'src/components/Overlays.jsx'), 'utf8');

// Extract the Settings function body (from "export function Settings" to the closing "}")
// Step 1: find the function keyword
const settingsStart = overlays.indexOf('export function Settings(');
// Step 2: skip past the parameter list (find the matching ')' for the opening '(')
const bodyOpenBrace = (() => {
  let parenDepth = 0;
  let i = overlays.indexOf('(', settingsStart);
  for (; i < overlays.length; i++) {
    if (overlays[i] === '(') parenDepth++;
    else if (overlays[i] === ')') { parenDepth--; if (parenDepth === 0) break; }
  }
  // Now i points to the closing ')'; find the '{' that follows (the function body)
  return overlays.indexOf('{', i);
})();
// Step 3: count braces from the function body's opening '{' to find its close
const settingsEnd = (() => {
  let depth = 0;
  for (let i = bodyOpenBrace; i < overlays.length; i++) {
    if (overlays[i] === '{') depth++;
    else if (overlays[i] === '}') { depth--; if (depth === 0) return i + 1; }
  }
  return overlays.length;
})();
const settingsSrc = overlays.slice(settingsStart, settingsEnd);

const failures = [];
const pass = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => { console.log(`  ✗ ${msg}`); failures.push(msg); };

// ── §1 No raw browser form controls in Settings ───────────────────────────
console.log('\n§1 No raw browser form controls in Settings');
if (/input[^>]*type=["']checkbox["']/.test(settingsSrc))
  fail('Settings contains input[type=checkbox] — replace with HcSwitch');
else
  pass('No input[type=checkbox] in Settings');

if (/input[^>]*type=["']radio["']/.test(settingsSrc))
  fail('Settings contains input[type=radio] — replace with RadioCard pattern');
else
  pass('No input[type=radio] in Settings');

if (/input[^>]*type=["']range["']/.test(settingsSrc))
  fail('Settings contains input[type=range] — replace with HcSlider');
else
  pass('No input[type=range] in Settings');

// ── §2 Switch controls expose state (source) ──────────────────────────────
console.log('\n§2 Switch controls expose state to assistive tech');
// Settings delegates to HcSwitch (which owns role="switch"); verify the component is used
if ((settingsSrc.match(/<HcSwitch/g) || []).length >= 4)
  pass('Settings uses HcSwitch (≥4 times) — role="switch" lives inside the component');
else
  fail('Settings must use HcSwitch for its toggles (expect ≥4 instances)');

if (/aria-checked=\{/.test(settingsSrc) || /aria-checked="/.test(settingsSrc))
  pass('aria-checked wired in Settings');
else
  fail('Settings switches must have aria-checked');

// Verify HcSwitch component definition has role=switch + aria-checked
const switchDef = overlays.indexOf('function HcSwitch');
if (switchDef >= 0) {
  const switchBody = overlays.slice(switchDef, overlays.indexOf('}', switchDef + 50) + 50);
  if (/role=["']switch["']/.test(switchBody)) pass('HcSwitch renders role="switch"');
  else fail('HcSwitch must render role="switch"');
  if (/aria-checked/.test(switchBody)) pass('HcSwitch renders aria-checked');
  else fail('HcSwitch must render aria-checked');
} else {
  fail('HcSwitch component must be defined in Overlays.jsx');
}

// ── §3 Switch 44 × 44 hit area (CSS) ─────────────────────────────────────
console.log('\n§3 Switch 44 × 44 minimum hit area');
if (/\.hc-switch\{[^}]*height:44px/.test(css))
  pass('.hc-switch has height:44px');
else
  fail('.hc-switch must have height:44px (44 × 44 hit area requirement)');

if (/\.hc-switch\{[^}]*width:\d+px/.test(css))
  pass('.hc-switch has explicit width');
else
  fail('.hc-switch must have explicit width');

if (/\.hc-switch-track\{/.test(css)) pass('.hc-switch-track styled');
else fail('.hc-switch-track must be styled');

if (/\.hc-switch-thumb\{/.test(css)) pass('.hc-switch-thumb styled');
else fail('.hc-switch-thumb must be styled');

// ── §4 Slider exposes state (source + CSS) ────────────────────────────────
console.log('\n§4 Slider exposes state to assistive tech');
if (/function HcSlider/.test(overlays)) pass('HcSlider component defined');
else fail('HcSlider component must be defined in Overlays.jsx');

if (/role=["']slider["']/.test(overlays)) pass('role="slider" used in HcSlider');
else fail('HcSlider must have role="slider"');

if (/aria-valuenow/.test(overlays)) pass('aria-valuenow wired');
else fail('HcSlider must have aria-valuenow');

if (/aria-valuemin/.test(overlays)) pass('aria-valuemin wired');
else fail('HcSlider must have aria-valuemin');

if (/aria-valuemax/.test(overlays)) pass('aria-valuemax wired');
else fail('HcSlider must have aria-valuemax');

// Keyboard support (arrow keys)
if (/ArrowRight|ArrowLeft/.test(overlays)) pass('Arrow-key keyboard support present in slider');
else fail('HcSlider must handle ArrowLeft/ArrowRight for keyboard nav');

// CSS
if (/\.hc-slider\{/.test(css) || /\.hc-slider-rail\{/.test(css))
  pass('.hc-slider styled in CSS');
else
  fail('.hc-slider must be styled in CSS');

if (/\.hc-slider-pip\{/.test(css)) pass('.hc-slider-pip discrete stops styled');
else fail('.hc-slider-pip must be styled (discrete labeled stops)');

// ── §5 Radio cards expose state (source) ──────────────────────────────────
console.log('\n§5 Radio cards expose state to assistive tech');
if (/role=["']radiogroup["']/.test(settingsSrc))
  pass('role="radiogroup" on tier/tempo groups in Settings');
else
  fail('Foundry tier and tempo grids must have role="radiogroup"');

if (/role=["']radio["']/.test(settingsSrc))
  pass('role="radio" on tier/tempo buttons in Settings');
else
  fail('Tier/tempo buttons must have role="radio"');

// Verify aria-checked is on the radio buttons
if (/aria-checked=\{campaign\.mediaTier/.test(settingsSrc) || /aria-checked=\{campaign\.tempo/.test(settingsSrc) ||
    (settingsSrc.match(/aria-checked/g) || []).length >= 5)
  pass('aria-checked on radio buttons in Settings');
else
  fail('Tier/tempo radio buttons must have aria-checked reflecting current value');

// ── §6 Visible selected mark beyond color (CSS) ───────────────────────────
console.log('\n§6 Visible selected mark on radio cards');
if (/\.tier-grid button\.selected::after\{[^}]*content:'✓'/.test(css) ||
    /\.tier-grid button\.selected::after\{[^}]*content:"✓"/.test(css) ||
    /\.tier-grid button\[aria-checked=true\]::after/.test(css))
  pass('Visible checkmark (✓) on selected radio card — not color alone');
else
  fail('Selected radio cards need a visible mark beyond color (e.g., ::after content:"✓")');

if (/\.tier-grid button\{[^}]*position:relative/.test(css))
  pass('.tier-grid button has position:relative (for ::after anchoring)');
else
  fail('.tier-grid button needs position:relative for the ::after mark');

// ── §7 Toggle row alignment (CSS) ─────────────────────────────────────────
console.log('\n§7 Toggle rows align to top');
if (/\.toggle\{[^}]*align-items:start/.test(css))
  pass('.toggle has align-items:start (controls align to top of label, not center)');
else if (/\.toggle\{[^}]*align-items:flex-start/.test(css))
  pass('.toggle has align-items:flex-start');
else
  fail('.toggle must use align-items:start — controls align to top of row, not vertically centered');

// ── Result ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(52)}`);
if (failures.length === 0) {
  console.log('PASS houseControls — all Settings controls styled, accessible, top-aligned.\n');
} else {
  console.log(`FAIL houseControls — ${failures.length} failing check(s):\n`);
  failures.forEach((f) => console.log(`  • ${f}`));
  console.log();
  process.exit(1);
}
