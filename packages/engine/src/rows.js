// ------------------------------------------------------------
// THE ROW WITNESS (Directive XII §VII.1, the Boundary Law) — ONE seat
// where a stored list becomes rows a reader may touch. Pure replay
// witnesses are born fail-closed: every list stands behind
// Array.isArray, and a row is a row only if it is a plain object —
// null, numbers, strings, and stray arrays prove nothing and are
// dropped at this door, so no fold downstream ever reads `.dm` off
// rot. Lawful rows pass through untouched, in order, the same bytes.
// Both sides of the house import THIS seat; the law is never mirrored.
// ------------------------------------------------------------
export function rowsOf(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((row) => row !== null && typeof row === 'object' && !Array.isArray(row));
}

// A list that may lawfully hold anything (words, rows) — but must BE a
// list. Anything else proves nothing and reads as empty.
export function listOf(list) {
  return Array.isArray(list) ? list : [];
}

// A lane that must be a plain object to be read at all — `dm`,
// `state_updates`, a story envelope. Rot reads as null, never as a lane.
export function laneOf(value) {
  return (value !== null && typeof value === 'object' && !Array.isArray(value)) ? value : null;
}
