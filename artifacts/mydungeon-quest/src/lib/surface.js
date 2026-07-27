// ------------------------------------------------------------
// THE SURFACE SANITIZER (A4 — Close the curtain everywhere).
//
// A guard applied to player-facing narration strings before they
// render. Refuses strings that contain internal state that should
// never leave the DM layer:
//
//   1. Internal field names — snake_case identifiers like gold_delta
//      or beat_intent that belong in model-facing schemas, not prose.
//   2. Bare turn references — "turn 23" in narration signals the DM
//      is narrating internal state rather than story. Chronicle
//      citations (" — turn N" in a cite span) are UI chrome, not
//      narration, and never pass through this function.
//   3. Orphan punctuation — " )", " ,", or an unclosed "(" indicate
//      a malformed string that was spliced together without care.
//
// sanitizeSurface(text) returns the string unmodified when clean and
// throws a named Error when it would leak. Apply it to every
// player-facing narration block and reason string at the generation
// site — never as a silent filter, always as a refusal.
// ------------------------------------------------------------

// Matches any word_word snake_case identifier (at least two segments).
const INTERNAL_FIELD = /\b[a-z][a-z0-9]*_[a-z][a-z0-9]*\b/;

// Matches "turn N" as a bare integer reference — the DM narrating
// turn numbers as internal state (e.g., "On turn 15 the hero…").
// Pattern: word boundary, "turn", optional whitespace, one or more digits.
const BARE_TURN_REF = /\bturn\s+\d+\b/i;

// Space before a closing paren or comma — indicates a gap left by a
// deleted qualifier ("he walked forward )" or "quietly ,").
const ORPHAN_CLOSE_PAREN = / \)/;
const ORPHAN_SPACE_COMMA  = / ,/;

function hasUnclosedParen(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') depth -= 1;
  }
  return depth > 0;
}

/**
 * Validates that `text` is safe to render on a player-facing surface.
 * Returns `text` unmodified when clean; throws a named Error otherwise.
 * Non-string values are returned as-is without checking.
 */
export function sanitizeSurface(text) {
  if (typeof text !== 'string' || text.length === 0) return text;

  const fieldMatch = text.match(INTERNAL_FIELD);
  if (fieldMatch) {
    throw new Error(
      `curtain breach — internal field name "${fieldMatch[0]}" in player-facing string`
    );
  }

  const turnMatch = text.match(BARE_TURN_REF);
  if (turnMatch) {
    throw new Error(
      `curtain breach — bare turn reference ("${turnMatch[0]}") in player-facing string`
    );
  }

  if (ORPHAN_CLOSE_PAREN.test(text)) {
    throw new Error('curtain breach — orphan " )" in player-facing string');
  }
  if (ORPHAN_SPACE_COMMA.test(text)) {
    throw new Error('curtain breach — orphan " ," in player-facing string');
  }
  if (hasUnclosedParen(text)) {
    throw new Error('curtain breach — unclosed "(" in player-facing string');
  }

  return text;
}
