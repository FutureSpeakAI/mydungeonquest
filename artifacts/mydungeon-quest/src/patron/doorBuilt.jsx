// THE DOOR'S ONE QUESTION (lean door, XX Law V) — was a publishable key
// built into this house? One seat: the frame, the toll, and the door itself
// all read the answer HERE, so asking never lifts the door's timber (the
// Clerk-bearing door.jsx) into the entry chunk. door.jsx re-exports it, so
// elder courts that ask the door directly keep their walk unchanged.
export const doorBuilt = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
