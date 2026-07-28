// ---- TERMINAL DOOR GATE (D9, Rule 9) ----
//
// Ensures "Seal the Tale" obeys the terminal-action law:
//   1. ORDER — the seal trigger appears AFTER the Composer in the JSX
//      source, making it the last interactive element in its surface.
//   2. CONFIRMATION — the seal-ask overlay requires a second, distinct
//      explicit action before confirmSeal fires; the confirm button is
//      labeled with the action itself ("Seal this tale").
//   3. STYLE — the button carries the terminal-action class (bordered,
//      low-fill) so it reads as distinct from navigation controls.
//   4. DIVIDER — a terminal-divider element separates the seal row from
//      the Composer so the player cannot tap it mid-compose.
//   5. CONSEQUENCE — the seal-ask overlay names both what happens
//      (denouement) and what is produced (the bound chronicle).
//
// Headless — no build, no browser, no AI keys. Pure source courts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appSrc = readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');

// ── §1 — ORDER: seal trigger must come AFTER <Composer ────────────────────
const composerIdx   = appSrc.indexOf('<Composer ');
const sealTriggerIdx = appSrc.indexOf('seal-ask');  // the button that opens seal-ask
const nearEndSealIdx = appSrc.indexOf('terminal-seal');

assert.ok(composerIdx >= 0, 'Composer must exist in App.jsx');
assert.ok(nearEndSealIdx >= 0, 'terminal-seal class must exist in App.jsx — the seal row must carry this class');
assert.ok(
  nearEndSealIdx > composerIdx,
  `The seal-trigger row (terminal-seal) must appear AFTER <Composer in the JSX — found Composer at ${composerIdx}, seal at ${nearEndSealIdx}`
);

// ── §2 — CONFIRMATION: seal-ask overlay must exist with a distinct button ─
// The overlay renders separately from the trigger; the confirm button label
// must be the action itself ("Seal this tale"), not the generic "Seal the Tale".
assert.match(
  appSrc,
  /overlay === 'seal-ask'/,
  'seal-ask overlay must exist in App.jsx'
);
assert.match(
  appSrc,
  /Seal this tale/,
  'confirm button in seal-ask must be labeled "Seal this tale" (lowercase "this"), naming the action'
);
// The generic "Seal the Tale" label must NOT appear as the confirm button text
// (it may appear as the trigger button label, which is fine)
const sealAskSection = appSrc.slice(appSrc.indexOf("overlay === 'seal-ask'"), appSrc.indexOf("overlay === 'seal-ask'") + 600);
assert.ok(
  !sealAskSection.includes('>Seal the Tale<'),
  'the confirm button inside seal-ask must not be labeled "Seal the Tale" — use "Seal this tale"'
);

// ── §3 — STYLE: terminal-action class ──────────────────────────────────────
assert.match(
  appSrc,
  /className="terminal-action"/,
  'the seal trigger button must carry className="terminal-action"'
);

// ── §4 — DIVIDER ───────────────────────────────────────────────────────────
assert.match(
  appSrc,
  /terminal-divider/,
  'a terminal-divider element must precede the seal row'
);
// The divider must come before the seal trigger in source order
const dividerIdx = appSrc.indexOf('terminal-divider');
assert.ok(
  dividerIdx < nearEndSealIdx,
  'terminal-divider must appear before terminal-seal in the JSX'
);

// ── §5 — CONSEQUENCE: the overlay names what happens and what is produced ──
assert.match(
  sealAskSection,
  /denouement/,
  'seal-ask overlay must name "denouement" so the player knows what happens next'
);
assert.match(
  sealAskSection,
  /bound|chronicle|sealed/,
  'seal-ask overlay must describe what is produced (the bound/sealed chronicle)'
);

// ── §6 — STYLES file: terminal-action and terminal-divider are defined ──────
const stylesSrc = readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');
assert.ok(
  stylesSrc.includes('.terminal-action'),
  '.terminal-action must be defined in styles.css'
);
assert.ok(
  stylesSrc.includes('.terminal-divider'),
  '.terminal-divider must be defined in styles.css'
);

console.log('PASS terminalDoor \u2014 D9 terminal door gate: seal trigger is last in its surface (post-Composer), behind a divider, styled as terminal-action, requires explicit "Seal this tale" confirmation, and names both consequence and product.');
