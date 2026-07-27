// evals/deepDoor.test.mjs — C7: Customize behavior gate.
//
// Three proofs:
//
//   1. The World Customize door opens in-place and prefills from worldForm.
//      Nothing is blank; the door is a pure view toggle (no form state changes
//      on open/close).
//
//   2. Every DiceButton in the creation flow lives on its own field row.
//      No label-line span contains a <DiceButton — the two never share a text
//      baseline.
//
//   3. The field-row pattern is established — DiceButtons appear beside inputs
//      inside .field-row spans.
//
// Keyless, network-free, build-free.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const forge = readFileSync(path.join(ROOT, 'src/components/Forge.jsx'), 'utf8');

// Extract WORLD_FALLBACK from source text (Forge.jsx is JSX; can't import directly).
// The fallback is a single-line const: parse title/tone/homeRegion from source.
const wfSrc = forge.match(/export const WORLD_FALLBACK = \{([^\n]+)\}/)?.[1] ?? '';
const worldFallback = {
  title:      (wfSrc.match(/title:\s*'([^']+)'/)      || [])[1] ?? '',
  tone:       (wfSrc.match(/tone:\s*'([^']+)'/)        || [])[1] ?? '',
  homeRegion: (wfSrc.match(/homeRegion:\s*'([^']+)'/)  || [])[1] ?? '',
};

// ── 1. World Customize door ───────────────────────────────────────────────

// The Customize door render block exists.
assert.ok(
  forge.includes("door === 'customize'"),
  'Customize door render block exists (door === "customize")',
);

// The 2000-char window starting at the Customize door covers the panel.
const custStart = forge.indexOf("door === 'customize'");
assert.ok(custStart !== -1, 'Customize door found in source');
const custBlock = forge.slice(custStart, custStart + 2500);

// Required fields are prefilled from worldForm — nothing opens blank.
assert.ok(custBlock.includes('worldForm.title'),   'Customize panel prefills title from worldForm.title');
assert.ok(custBlock.includes('worldForm.tone'),    'Customize panel prefills tone from worldForm.tone');
assert.ok(custBlock.includes('worldForm.homeRegion'), 'Customize panel prefills homeRegion from worldForm.homeRegion');

// Edits write back via worldPen — closing preserves changes.
assert.ok(custBlock.includes("worldPen('title')"),      'title field uses worldPen — edits survive close');
assert.ok(custBlock.includes("worldPen('tone')"),       'tone field uses worldPen — edits survive close');
assert.ok(custBlock.includes("worldPen('homeRegion')"), 'homeRegion field uses worldPen — edits survive close');

// Close sets door to null — no step navigation, no step reset.
assert.ok(
  custBlock.includes('setDoor(null)'),
  'Customize close calls setDoor(null) — pure view toggle, no step navigation',
);

// WORLD_FALLBACK ensures required fields are never blank on first open.
assert.ok(
  worldFallback.title.length > 0,
  `WORLD_FALLBACK.title is non-empty ("${worldFallback.title}")`,
);
assert.ok(
  worldFallback.tone.length > 0,
  `WORLD_FALLBACK.tone is non-empty ("${worldFallback.tone}")`,
);
assert.ok(
  worldFallback.homeRegion.length > 0,
  `WORLD_FALLBACK.homeRegion is non-empty ("${worldFallback.homeRegion}")`,
);

// ── 2. No DiceButton inside a label-line span ─────────────────────────────
// Walk every className="label-line"> occurrence and check the text between
// that token and the next </span> does NOT include <DiceButton.
let offset = 0;
let labelLineCount = 0;
while (true) {
  const start = forge.indexOf('className="label-line">', offset);
  if (start === -1) break;
  labelLineCount += 1;
  const end = forge.indexOf('</span>', start);
  if (end === -1) break;
  const content = forge.slice(start, end);
  assert.ok(
    !content.includes('<DiceButton'),
    `label-line span at offset ${start} must not contain <DiceButton\n  found: "${content.slice(0, 100).replace(/\n/g, '↵')}"`,
  );
  offset = end + 7;
}
assert.ok(labelLineCount >= 4, `at least four label-line spans exist (found ${labelLineCount})`);

// ── 3. DiceButtons have migrated to field-row spans ───────────────────────
assert.ok(
  forge.includes('className="field-row"'),
  'field-row spans exist — DiceButtons now live beside inputs, not beside labels',
);

// Spot-check: the ask-row dice labels are all still present after restructuring.
const requiredDiceLabels = [
  'Shuffle a name', 'Shuffle a mark', 'Shuffle a keepsake',
  'Shuffle a sigil', 'Shuffle a voice', 'Shuffle a calling',
  'Shuffle an ancestry',
];
for (const label of requiredDiceLabels) {
  assert.ok(
    forge.includes(`label="${label}"`),
    `DiceButton with label="${label}" is still present after restructuring`,
  );
}

// The AuditionRow's shuffle die is now in an audition-header div, not a label-line.
assert.ok(
  forge.includes('audition-header'),
  'audition-header separates the voice-section eyebrow from its DiceButton',
);
assert.ok(
  !forge.includes('eyebrow label-line'),
  'the eyebrow+label-line compound class is gone — die is no longer in the eyebrow span',
);

console.log(`PASS deepDoor — Customize door opens in-place with all required fields prefilled from WORLD_FALLBACK (title="${worldFallback.title}", tone, homeRegion); ${labelLineCount} label-line spans contain zero DiceButtons; field-row pattern established; audition-header separates the voice-section eyebrow from its shuffle die.`);
