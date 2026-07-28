// ---- SETTINGS CLARITY GATE (D9, Rule 9) ----
//
// Ensures the Settings panel obeys the destructive-action and billing law:
//   1. ONE BILLING STATE — no surface renders two mutually exclusive billing
//      states simultaneously. When plan === 'house', the purchase copy
//      (toll-seats, seat-upgrade buttons, legal notice) is hidden entirely.
//   2. DESTRUCTIVE LABELS — every destructive control names its consequence
//      in its own label or an adjacent line.
//   3. SESSION CAPS — rendered as two labeled meters (cap-meter), not as
//      inline fractions in a row.
//   4. BETA COPY HIERARCHY — "Copy the report" is the primary action;
//      "Send by hand" is secondary.
//   5. BETA OVERFLOW — the beta-report block has overflow:auto so long
//      reports scroll rather than overflow the panel.
//
// Headless — no build, no browser, no AI keys. Pure source courts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tollSrc   = readFileSync(path.join(ROOT, 'src/patron/toll.jsx'), 'utf8');
const olaysSrc  = readFileSync(path.join(ROOT, 'src/components/Overlays.jsx'), 'utf8');
const stylesSrc = readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');

// ── §1 — ONE BILLING STATE: house plan hides purchase copy ────────────────
// The toll-seats div (with seat-upgrade buttons and legal notice) must NOT
// render when plan === 'house'. The gate is: plan !== 'house' must be a
// condition on the toll-seats block.
assert.match(
  tollSrc,
  /toll\.plan !== 'house'/,
  "TollSection must guard toll-seats behind toll.plan !== 'house' so the purchase copy is hidden for the house seat"
);
// The house plan must not show both standing text AND seat-upgrade buttons.
// We verify that the toll-seats block is only rendered when plan !== 'house'.
const tollSeatBlock = tollSrc.match(/toll\.plan !== 'house'[\s\S]{0,600}?toll-seats/);
assert.ok(tollSeatBlock, "toll-seats div must be gated on toll.plan !== 'house'");

// ── §2 — DESTRUCTIVE LABELS ───────────────────────────────────────────────
// The cellar sweep button must have context (the details/summary block already
// explains what is cleared and what is kept; the button itself or its adjacent
// text must name the consequence).
assert.match(
  olaysSrc,
  /Sweep the cellar/,
  'cellar button must render with consequence-naming label "Sweep the cellar"'
);
// The details block must explain what is cleared (from D8).
assert.match(
  olaysSrc,
  /settings-detail/,
  'cellar must have a settings-detail disclosure block explaining what it frees'
);
// The disclosure must mention what is NEVER touched (the sealed record).
assert.match(
  olaysSrc,
  /never touched|sealed record is never/i,
  'cellar disclosure must name what is never touched (the sealed record)'
);

// ── §3 — SESSION CAP METERS ───────────────────────────────────────────────
// The session caps must be rendered as labeled meters, not as a row of
// fractions inside a single div.
assert.match(
  olaysSrc,
  /session-caps/,
  'session caps must use className="session-caps" container'
);
assert.match(
  olaysSrc,
  /cap-meter/,
  'session caps must use cap-meter elements for labeled meters'
);
assert.match(
  olaysSrc,
  /cap-bar/,
  'each cap-meter must contain a cap-bar progress track'
);
assert.match(
  olaysSrc,
  /cap-fill/,
  'each cap-bar must contain a cap-fill element for the progress indicator'
);
// Must render TWO distinct meters (one for images, one for music)
const imageMeter = olaysSrc.match(/Images this session/);
const musicMeter = olaysSrc.match(/Music this session/);
assert.ok(imageMeter, 'session caps must have a labeled "Images this session" meter');
assert.ok(musicMeter, 'session caps must have a labeled "Music this session" meter');
// The old inline fraction style must be gone
assert.ok(
  !olaysSrc.includes('className="spend"'),
  'the old className="spend" fraction row must be replaced by session-caps meters'
);

// ── §4 — BETA COPY HIERARCHY ──────────────────────────────────────────────
// "Copy the report" is the primary action — must carry primary-button class.
// "Send by hand" is secondary — must NOT be primary.
assert.match(
  olaysSrc,
  /primary-button[^>]*>Copy the report/,
  '"Copy the report" must carry className="primary-button"'
);
assert.ok(
  !olaysSrc.match(/primary-button[^>]*>Send by hand/),
  '"Send by hand" must NOT be a primary-button — it is the secondary action'
);

// ── §5 — BETA OVERFLOW ────────────────────────────────────────────────────
// The .beta-report CSS rule must include overflow (auto or scroll)
// so long reports scroll within the panel rather than overflowing.
assert.match(
  stylesSrc,
  /\.beta-report\{[^}]*overflow[^}]*\}/,
  '.beta-report must declare overflow in its CSS rule'
);

// ── §6 — STYLES: cap-meter and session-caps defined ──────────────────────
assert.ok(
  stylesSrc.includes('.session-caps'),
  '.session-caps must be defined in styles.css'
);
assert.ok(
  stylesSrc.includes('.cap-meter'),
  '.cap-meter must be defined in styles.css'
);
assert.ok(
  stylesSrc.includes('.cap-bar'),
  '.cap-bar must be defined in styles.css'
);

console.log('PASS settingsClarity \u2014 D9 settings clarity gate: one billing state at a time (house hides purchase copy); cellar names its consequence; session caps are labeled meters; Copy is primary and Send is secondary; beta-report has overflow.');
