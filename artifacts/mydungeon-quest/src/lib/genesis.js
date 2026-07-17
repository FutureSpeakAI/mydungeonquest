// THE FIRST WORD LAW — Task 54C §1.
//
// At genesis, the Dungeon Master's prologue request leaves the page before
// any paint request is made, and narration streams to the player as soon as
// the first byte arrives. Genesis media is kicked in parallel and may take
// as long as it takes; a plate that arrives after its narration slots into
// its lawful seat below the text (LogEntry's own order law) without
// reordering, displacing, or interrupting a word. The player hears the
// world speak first, always.
//
// This module is the whole of that law, as a pure sequencer with no React,
// no fetch, and no game state — so the keyless first-word gate can prove
// the ordering deterministically, and the app can obey it by injection:
//
//   pour({ onPourDispatched, mediaGate })
//     — dispatches the prologue turn. It MUST call onPourDispatched() the
//       moment the DM request has actually left the page (fetch initiated,
//       before the response is awaited). mediaGate is a promise that opens
//       when the genesis easel settles: the turn's OWN media (its scene
//       plate, cast busts) waits on it, so the bench's rank law — identity
//       anchors before the scenes that cite them — holds across the two
//       foundry lanes. Text never waits on it.
//   paint()
//     — kicks the genesis media (key art, the hero's bust anchor). Called
//       only once the pour's request is on the wire — or, if the pour
//       snags before ever dispatching, once the pour settles, so a snagged
//       first turn still leaves a painted table rather than a starved one.
//
// Returns the pour's own promise: the caller awaits the words, never the
// paint. Paint failures are contained here and never reject the genesis.

export function beginGenesis({ pour, paint }) {
  let releaseDispatched;
  const dispatched = new Promise((resolve) => { releaseDispatched = resolve; });
  let releaseEasel;
  const easelSettled = new Promise((resolve) => { releaseEasel = resolve; });

  // Promise.resolve().then(...) contains a synchronously-throwing pour: the
  // race still starts, the easel still kicks on settle, the gate still
  // opens, and the caller receives the throw as the genesis's own rejection
  // — the sequencer's contract holds even for a pour that falls at the door.
  const pourPromise = Promise.resolve().then(() => pour({ onPourDispatched: releaseDispatched, mediaGate: easelSettled }));
  // The race's second leg: a pour that settles (resolve or reject) without
  // ever signaling must not starve the easel forever. Errors are observed
  // here so the race never manufactures an unhandled rejection; the caller
  // still sees the pour's own outcome through the returned promise.
  const pourSettled = Promise.resolve(pourPromise).then(() => undefined, () => undefined);

  Promise.race([dispatched, pourSettled]).then(() => {
    // Promise.resolve().then(paint) contains a synchronously-throwing paint;
    // the easel gate opens on settle either way, so gated turn media is
    // never starved by a fallen easel.
    Promise.resolve().then(paint).then(releaseEasel, releaseEasel);
  });

  return pourPromise;
}
