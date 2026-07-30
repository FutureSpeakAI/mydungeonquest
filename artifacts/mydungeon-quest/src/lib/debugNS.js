// ---------------------------------------------------------------------------
// DEBUG NAMESPACE — Stage 7 / L3
//
// window.__dungeon is a stable object that accumulates the two "dark
// metrics" the march cannot observe from outside the runtime:
//
//   swallowedExceptions — silent catch blocks that swallow errors without
//     surfacing them to the user or logging them to the console. The march
//     intercepts console traffic; a catch that never logs is invisible to it.
//
//   boundaryThrows — errors caught by a React error boundary (RoadBoundary).
//     A boundary-caught error never reaches window's own listeners (the
//     boundary intercepts it first), so pageerror handlers miss it.
//
// The march reads both counters at session end via page.evaluate and
// includes them in the K8-OBSERVATIONAL annotation.
//
// Law: increment functions are safe in every runtime (server, test, SSR).
// No namespace → safe no-op. This module has no side effects at import.
// ---------------------------------------------------------------------------

function ns() {
  if (typeof window === 'undefined') return null;
  if (!window.__dungeon) {
    window.__dungeon = { swallowedExceptions: 0, boundaryThrows: 0 };
  }
  return window.__dungeon;
}

/** Increment the swallowedExceptions counter by one. */
export function bumpSwallowed() {
  const n = ns();
  if (n) n.swallowedExceptions += 1;
}

/** Increment the boundaryThrows counter by one. */
export function bumpBoundaryThrow() {
  const n = ns();
  if (n) n.boundaryThrows += 1;
}
