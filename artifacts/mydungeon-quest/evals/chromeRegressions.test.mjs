// E7 — chromeRegressions (T6 through T11)
//
// Source-level structural enforcement of the six chrome regressions closed
// in Phase E7. No browser, no build, no AI keys.
//
// T6 — chips over narration: `.suggestions` must carry scroll-snap-type and
//   `.chip-item` must carry scroll-snap-align so the chip rail snaps correctly
//   and every chip is reachable without clipping.
// T7 — HUD avatar multi-panel: `.sigil-portrait` must carry object-position
//   so only panel one (top-left) fills the 42×42 circle crop.
// T8 — party chip contradiction: the party chip must say "Traveling alone"
//   when the hero has no companions; "souls" (a house term) must not appear
//   in chrome; the known-count fact must live in a separate chip.
// T9 — mixed numerals: plateNumeral must use String() (Arabic), never
//   romanNumeral(); the campaign-mast span already uses Arabic (covered by
//   chromeCopy.test.mjs); this test enforces the plate caption.
// T10 — region banner tiling: `.region-strip` must carry background-repeat:
//   no-repeat so the background image never tiles regardless of aspect ratio.
// T11 — template captions: cueCaption() must be defined; it must skip
//   cue?.mood (the template-phrase field) and derive from subjects + region.
//
// Headless — no build, no browser, no AI keys. Pure source courts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appSrc    = readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
const cssSrc    = readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');

function stripComments(src) {
  return src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}
const appStripped = stripComments(appSrc);

// ── T6 — suggestion rail: scroll-snap ─────────────────────────────────────
assert.ok(
  cssSrc.includes('scroll-snap-type:x mandatory') || cssSrc.includes('scroll-snap-type: x mandatory'),
  '.suggestions must have scroll-snap-type: x mandatory (T6: chips must snap to chip-item boundaries)'
);
assert.ok(
  cssSrc.includes('scroll-snap-align:start') || cssSrc.includes('scroll-snap-align: start'),
  '.chip-item must have scroll-snap-align: start (T6: each chip aligns to the snap axis)'
);
// The overflow-x:auto must still be present (T6: scroll affordance)
assert.ok(
  cssSrc.includes('.suggestions{') && cssSrc.match(/\.suggestions\{[^}]*overflow-x:auto/),
  '.suggestions must retain overflow-x:auto for horizontal scrollability (T6)'
);
// word-break:normal must still be present on chip-item (T6: no mid-word cuts)
assert.ok(
  cssSrc.match(/\.chip-item\{[^}]*word-break:normal/),
  '.chip-item must retain word-break:normal (T6: no mid-word chip cuts)'
);

console.log('ok — T6: scroll-snap-type on rail, scroll-snap-align on chips, overflow-x:auto, word-break:normal');

// ── T7 — HUD avatar: single-face crop ─────────────────────────────────────
// .sigil-portrait must have object-position: left top so multi-panel reference
// sheets are cropped to panel one (top-left) rather than the centered default.
assert.ok(
  cssSrc.match(/\.sigil-portrait\{[^}]*object-position:[^}]*left[^}]*top/) ||
  cssSrc.match(/\.sigil-portrait\{[^}]*object-position:left top/),
  '.sigil-portrait must have object-position: left top (T7: crop panel one of multi-panel reference sheet)'
);
// object-fit:cover must still be present
assert.ok(
  cssSrc.match(/\.sigil-portrait\{[^}]*object-fit:cover/),
  '.sigil-portrait must retain object-fit:cover (T7)'
);

console.log('ok — T7: sigil-portrait crops to left top, object-fit:cover retained');

// ── T8 — party chip: one fact per chip ────────────────────────────────────
// Party chip empty state must say "Traveling alone", not "Alone: N souls known"
assert.ok(
  appStripped.includes('>Traveling alone<'),
  'party chip must render "Traveling alone" when hero has no companions (T8)'
);
// "souls" must not appear in the party-chip or known-count chip context
const chipPartyBlock = appStripped.slice(
  appStripped.indexOf('data-chip="party"'),
  appStripped.indexOf('data-chip="party"') + 400
);
assert.ok(
  !chipPartyBlock.toLowerCase().includes('souls'),
  'party chip must not use the house term "souls" in chrome (T8)'
);
// A separate "known" chip must exist for the known count
assert.ok(
  appStripped.includes('data-chip="known"'),
  'a separate chip with data-chip="known" must carry the known-count fact (T8: one fact per chip)'
);
// The known chip must say "character(s) known", not "souls"
const knownChipBlock = appStripped.slice(
  appStripped.indexOf('data-chip="known"'),
  appStripped.indexOf('data-chip="known"') + 200
);
assert.ok(
  knownChipBlock.includes('character') && !knownChipBlock.toLowerCase().includes('souls'),
  'known-count chip must say "character(s)" without "souls" (T8)'
);

console.log('ok — T8: party chip says "Traveling alone"; "souls" absent; separate known chip carries cast count');

// ── T9 — plate numeral: Arabic ─────────────────────────────────────────────
// plateNumeral must be computed with String(), not romanNumeral()
assert.ok(
  appStripped.match(/plateNumeral\s*=\s*showsPlate\s*\?\s*String\(/),
  'plateNumeral must use String() (Arabic numeral) — not romanNumeral() (T9: Plate 1, not Plate I)'
);
assert.ok(
  !appStripped.match(/plateNumeral\s*=\s*showsPlate\s*\?\s*romanNumeral\(/),
  'plateNumeral must NOT call romanNumeral() (T9: no roman in plate caption)'
);

console.log('ok — T9: plateNumeral uses String() (Arabic); romanNumeral() not used for plate numbering');

// ── T10 — region banner: no tiling ────────────────────────────────────────
assert.ok(
  cssSrc.match(/\.region-strip\{[^}]*background-repeat:no-repeat/),
  '.region-strip must have background-repeat: no-repeat (T10: prevent banner tiling)'
);
// background-size:cover must still be present
assert.ok(
  cssSrc.match(/\.region-strip\{[^}]*background-size:cover/),
  '.region-strip must retain background-size: cover (T10)'
);

console.log('ok — T10: region-strip has background-repeat:no-repeat; background-size:cover retained');

// ── T11 — caption from actual content ─────────────────────────────────────
// cueCaption() must be defined in App.jsx
assert.ok(
  appSrc.includes('function cueCaption('),
  'cueCaption() must be defined in App.jsx (T11: derive caption from cue subjects/region)'
);
// cueCaption must NOT fall back to cue?.mood (the template-phrase field)
const cueCaptionBody = appSrc.slice(
  appSrc.indexOf('function cueCaption('),
  appSrc.indexOf('function cueCaption(') + 500
);
assert.ok(
  !cueCaptionBody.includes('cue?.mood') && !cueCaptionBody.includes('cue.mood'),
  'cueCaption() must not use cue?.mood — that is the template-phrase field (T11)'
);
// cueCaption must use subjects and region
assert.ok(
  cueCaptionBody.includes('subjects') && cueCaptionBody.includes('region'),
  'cueCaption() must derive from subjects and region (T11: actual cue content)'
);
// The mood chain in LogEntry must call cueCaption, not use cue?.mood directly
const logEntrySection = appSrc.slice(
  appSrc.indexOf('export function LogEntry('),
  appSrc.indexOf('export function LogEntry(') + 800
);
assert.ok(
  logEntrySection.includes('cueCaption(cue,') || logEntrySection.includes('cueCaption(cue ,'),
  'LogEntry must call cueCaption(cue, ...) for its mood (T11)'
);
assert.ok(
  !logEntrySection.includes('cue?.mood'),
  'LogEntry must not use cue?.mood directly (T11: template phrases bypassed)'
);

console.log('ok — T11: cueCaption() defined; skips cue.mood; uses subjects+region; LogEntry calls cueCaption');

console.log('PASS chromeRegressions \u2014 T6\u2013T11: suggestion rail snaps, sigil crops panel one, party chip says "Traveling alone" with no house terms and a separate known chip, plate numerals are Arabic, region banner does not tile, captions derive from actual cue content.');
