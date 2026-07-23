// THE DOOR'S FRAME (lean door, XX Law V) — the table loads first. The
// keyless house never fetches the door's timber: the frame answers
// synchronously with its children untouched, byte-for-byte the doorless
// game (the doorkeeper's own law, kept). Only a keyed build lifts the door
// itself — Clerk, wouter, the locked title — through a lazy seam, and the
// veil while it arrives is bare chrome, never narration and never the game:
// a signed-out patron glimpses nothing through a door still being hung.
// The door's laws live untouched in door.jsx; elder courts walk there.
import { Suspense, lazy } from 'react';
import { doorBuilt } from './doorBuilt.jsx';

const House = lazy(() => import('./door.jsx').then((m) => ({ default: m.PatronShell })));
const Door = lazy(() => import('./door.jsx').then((m) => ({ default: m.PatronDoor })));

export { doorBuilt };

export function PatronShell({ children }) {
  if (!doorBuilt) return children; // the doorless house, exactly as before
  return <Suspense fallback={<div className="door-veil" aria-hidden="true" />}><House>{children}</House></Suspense>;
}

export function PatronDoor(props) {
  if (!doorBuilt) return null; // no door was built; nothing hangs
  return <Suspense fallback={null}><Door {...props} /></Suspense>;
}
