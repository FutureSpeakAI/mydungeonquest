// ------------------------------------------------------------
// THE ANCHORED WINDOW (Task 54) — one shared history-window law,
// imported by BOTH sides of the wire (the client furnishing log
// entries, the server trimming shaped messages).
//
// The old law was two sliding slices (client slice(-20) entries,
// server slice(-30) messages) that each advanced by one every turn:
// past ~15 turns the message prefix changed at its FIRST byte every
// turn, so the Anthropic prompt cache never read and the breakpoint
// on the last message bought a fresh cache write each turn instead.
//
// The anchored law: the window START advances only in steps of
// STEP entries, never by one. Between re-anchors the window only
// APPENDS, so one turn's shaped messages are a byte-for-byte prefix
// of the next turn's and the cached prefix actually reads. A
// re-anchor (once every STEP turns) lawfully invalidates the cache
// once; a redaction likewise (rare, accepted).
//
// THE FLOOR: the window never furnishes fewer than FLOOR entries
// (once FLOOR exist) — the Editor's echo court is owed a twenty-page
// window (Law VI) and the floor keeps that debt paid. The window may
// lawfully run as wide as FLOOR + STEP - 1 entries just before a
// re-anchor.
//
// The server judges MESSAGES (two per entry: the player's word and
// the DM's answer), so its floor/step are the entry law doubled, and
// its floor equals the client's widest lawful send — the server
// NEVER trims below the client's ceiling.
// ------------------------------------------------------------

export const HISTORY_FLOOR_ENTRIES = 20;
export const HISTORY_STEP_ENTRIES = 10;

// Two messages ride per entry; the server's floor is the client's
// ceiling (FLOOR + STEP - 1 entries, doubled) so a lawful client
// window passes the server whole, untouched.
export const HISTORY_FLOOR_MESSAGES = 2 * (HISTORY_FLOOR_ENTRIES + HISTORY_STEP_ENTRIES - 1);
export const HISTORY_STEP_MESSAGES = 2 * HISTORY_STEP_ENTRIES;

/** Where the anchored window starts for a list of `length` rows. */
export function anchoredStart(length, floor, step) {
  if (!Number.isFinite(length) || length <= floor) return 0;
  return Math.floor((length - floor) / step) * step;
}

/**
 * The anchored window itself. Pure and deterministic on the list
 * length alone, so both sides of the wire agree byte-for-byte.
 */
export function anchoredWindow(rows, { floor = HISTORY_FLOOR_ENTRIES, step = HISTORY_STEP_ENTRIES } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  return list.slice(anchoredStart(list.length, floor, step));
}
