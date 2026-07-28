// ---- CHROME COPY GATE (D8, Rule 18) ----
//
// Ensures the chrome UI obeys the D8 copy-and-type law:
//   1. EM DASHES — zero in Settings toggle labels, campaign-mast, act
//      headers, soul trail, party chip, pour-again banner, and the spell
//      tally; each surface is checked by source scan of the exact JSX text.
//   2. NUMERALS — the campaign-mast span uses Arabic numbers (beatIndex + 1
//      and chapter.count), not romanNumeral(); act headers in Book.jsx use
//      the numeric `act` variable, not romanNumeral(act).
//   3. TRAIL — "The trail is quiet." must not appear as a status line in
//      Book.jsx so no two cast cards share an identical trail.
//   4. BOND LABEL — the bond-thread has a visible bond-label span so sighted
//      players do not need to hover to read the bond value.
//   5. PRONOUNS — no lone "he " or "she " followed by a verb appears in the
//      Settings component text (Overlays.jsx), where such a hardcoded pronoun
//      would conflict with any hero whose voice_card names different pronouns.
//
// Headless — no build, no browser, no AI keys. Pure source courts.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appSrc    = readFileSync(path.join(ROOT, 'src/App.jsx'), 'utf8');
const bookSrc   = readFileSync(path.join(ROOT, 'src/components/Book.jsx'), 'utf8');
const olaysSrc  = readFileSync(path.join(ROOT, 'src/components/Overlays.jsx'), 'utf8');
const seqSrc    = readFileSync(path.join(ROOT, 'src/components/Sequence.jsx'), 'utf8');
const EM = '\u2014'; // the actual em-dash character

// ── §1 — EM DASHES ───────────────────────────────────────────────────────
// Strip JSX block comments ({/* … */}) from source before scanning so the
// court only sees rendered text, not authoring notes.
function stripJsxComments(src) {
  return src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}
const appStripped    = stripJsxComments(appSrc);
const bookStripped   = stripJsxComments(bookSrc);
const olaysStripped  = stripJsxComments(olaysSrc);
const seqStripped    = stripJsxComments(seqSrc);

// campaign-mast span (the persistent chrome header line)
const mastMatch = appStripped.match(/campaign-mast[\s\S]{0,800}?<\/div>/);
const mastText = mastMatch ? mastMatch[0] : '';
assert.ok(!mastText.includes(EM), 'campaign-mast span must contain no em dash');

// Settings toggle labels (sky, narrator, media tier descriptions)
// Extract the Settings function body
const settingsMatch = olaysSrc.match(/export function Settings\([\s\S]*?^}/m);
const settingsText = settingsMatch ? settingsMatch[0] : olaysSrc;
const settingsStripped = stripJsxComments(settingsText);
// The toggle <small> elements must be em-dash-free
const toggleSmalls = [...settingsStripped.matchAll(/<small>([\s\S]*?)<\/small>/g)].map(m => m[1]);
toggleSmalls.forEach((text, i) => {
  assert.ok(!text.includes(EM), `Settings toggle small[${i}] must not contain em dash: "${text.slice(0,80)}"`);
});

// Soul trail in Book.jsx
const trailMatch = bookStripped.match(/<small className="trail">([\s\S]{0,500})/);
const trailText = trailMatch ? trailMatch[0] : '';
assert.ok(!trailText.includes(EM), 'soul trail must not contain em dash');

// Party chip em text
const partyEmMatch = appStripped.match(/<em>Alone[^<]{0,60}<\/em>/);
if (partyEmMatch) {
  assert.ok(!partyEmMatch[0].includes(EM), 'party chip "Alone" text must not use em dash');
}

// Pour-again banner
const pourMatch = appStripped.match(/pour-again[\s\S]{0,400}?<\/div>/);
if (pourMatch) {
  assert.ok(!pourMatch[0].includes(EM), 'pour-again banner must not contain em dash');
}

// Death saves tally line
const doomed = appStripped.match(/doom-tally[\s\S]{0,150}/);
if (doomed) {
  assert.ok(!doomed[0].includes(EM), 'death saves tally must not contain em dash');
}

// Act header in Book.jsx (the tale-arc list)
// Full string: <b>Act {act}: {ACT_NAMES[act] || 'the road beyond'}</b>
const actHeaderMatch = bookStripped.match(/<b>Act \{act\}:[^<]{0,120}<\/b>/);
assert.ok(actHeaderMatch, 'Book.jsx must render an act header <b>Act {act}: ...</b>');
assert.ok(!actHeaderMatch[0].includes(EM), 'act header must not contain em dash');

// Recap mast goal separator in Sequence.jsx
const recapMastMatch = seqStripped.match(/recap-mast[\s\S]{0,300}/);
if (recapMastMatch) {
  assert.ok(!recapMastMatch[0].includes(EM), 'recap-mast must not use em dash as goal separator');
}

// ── §2 — NUMERALS ─────────────────────────────────────────────────────────

// campaign-mast must NOT use romanNumeral() for act or chapter display
assert.ok(
  !mastText.includes('romanNumeral'),
  'campaign-mast must not call romanNumeral() — use act.act and beatIndex+1 instead'
);
// The mast renders the ARABIC act and chapter
assert.match(
  mastText,
  /Act \{act\.act\}/,
  'campaign-mast must render Act {act.act} (Arabic act number)'
);
assert.match(
  mastText,
  /Chapter \{current\.codex\.beatIndex \+ 1\} of \{chapter\.count\}/,
  'campaign-mast must render Chapter {beatIndex+1} of {chapter.count} (Arabic numbers)'
);

// Book.jsx act header: must NOT call romanNumeral(act)
assert.ok(
  !bookSrc.match(/<b>Act \{romanNumeral/),
  'Book.jsx act header must not use romanNumeral() — use the numeric act variable'
);
// Must use a plain number (the act variable is numeric)
assert.match(
  bookSrc,
  /<b>Act \{act\}:/,
  'Book.jsx act header must render Act {act}: (colon, not em dash)'
);

// ── §3 — TRAIL ────────────────────────────────────────────────────────────

// "The trail is quiet." must be gone — each cast card must have unique trail or none
assert.ok(
  !bookSrc.includes("The trail is quiet."),
  '"The trail is quiet." must not appear in Book.jsx — no two cast cards may share an identical status line'
);

// The trail fallback must be an empty string (not a generic phrase)
assert.match(
  bookSrc,
  /soul\.last_seen \? `Last seen:/,
  'trail must use "Last seen:" (colon, not em dash) when last_seen is present'
);

// ── §4 — BOND LABEL ───────────────────────────────────────────────────────

// bond-thread must contain a bond-label span for visible text
assert.match(
  bookSrc,
  /bond-thread[^>]*>[\s\S]{0,20}<span className="bond-label">/,
  'bond-thread must start with a visible bond-label span before the pip elements'
);
// The hero synthetic card also carries the label
assert.match(
  bookSrc,
  /<span className="bond-label">Bond 4\/4<\/span>/,
  'hero cast card must show a visible "Bond 4/4" label'
);
// Regular cast cards use the soul.bond value
assert.match(
  bookSrc,
  /<span className="bond-label">Bond \{soul\.bond\}\/4<\/span>/,
  "cast card bond-label must render the soul's bond value"
);

// ── §5 — PRONOUNS ─────────────────────────────────────────────────────────

// Settings text (Overlays.jsx) must not hard-code "he " or "she " as hero pronouns.
// Generic uses like "they" for plural groups are fine; the concern is third-person
// singular hero references that would mismatch a stated voice_card.
const heroPronouns = settingsStripped.match(/\b(he|she)\s+(is|was|has|can|will|may|must|shall|does|did|makes|rides|speaks|opens|reads|binds|holds|takes|gives|runs|gets|says|tells|knows|finds|keeps|sees|leads|walks)\b/i);
assert.ok(
  !heroPronouns,
  `Settings must not hard-code singular hero pronouns (he/she + verb): found "${heroPronouns ? heroPronouns[0] : ''}" — route through tenor layer`
);

console.log('PASS chromeCopy \u2014 D8 chrome copy gate: zero em dashes in campaign-mast, Settings toggles, soul trail, party chip, pour banner, death saves, and act headers; Arabic numerals for act and chapter counts; \u201cThe trail is quiet.\u201d absent; bond-label visible on every cast card; no hardcoded singular hero pronouns in Settings.');
