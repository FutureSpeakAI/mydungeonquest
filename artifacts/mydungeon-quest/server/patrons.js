// THE DOORKEEPER — identity at the door of /api.
//
// The doctrine mirrors the media providers: the door is OPT-IN. When the
// Clerk keys are absent (a keyless fork, the eval harness), the door simply
// was never built — every request walks in as a guest, byte-for-byte as
// before, and nothing here may throw at import time. When the keys exist,
// patrons who give their name at the door get a line in the ledger
// (Postgres) and ride every /api request as `req.patron`; guests still pass
// unchallenged. Custody is unchanged either way: chronicles live on the
// player's device, and the ledger holds names, never tales.
import express from 'express';
import pg from 'pg';
import { clerkMiddleware, getAuth, clerkClient } from '@clerk/express';
import { publishableKeyFromHost } from '@clerk/shared/keys';
import { getClerkProxyHost } from './clerkProxy.js';

// Read at call time, not import time, so the eval can judge both stances.
export const doorOpen = () =>
  Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);

let pool = null;
function ledger() {
  if (!pool) pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

// The visitors' book: clerk subject → Promise<ledger row>. One inscription
// per patron per process, not one per request; a failed inscription is
// struck from the book so the next knock retries.
const known = new Map();

export async function inscribe(clerkUserId) {
  // The display name is garnish — fetched best-effort from Clerk; the
  // ledger line itself is the point and never depends on it. The fetch is
  // raced against a short candle so a slow Clerk API can never stall a
  // patron's first request; a timeout simply inscribes them nameless.
  let displayName = null;
  try {
    const user = await Promise.race([
      clerkClient.users.getUser(clerkUserId),
      new Promise((_, reject) => {
        const t = setTimeout(() => reject(new Error('name fetch outlasted the candle')), Number(process.env.DOOR_NAME_TIMEOUT_MS || 3000));
        t.unref?.();
      })
    ]);
    displayName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username || null;
  } catch { /* nameless is still known */ }
  const { rows } = await ledger().query(
    `INSERT INTO users (clerk_user_id, display_name) VALUES ($1, $2)
     ON CONFLICT (clerk_user_id)
     DO UPDATE SET display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                   updated_at = now()
     RETURNING id, clerk_user_id, display_name, created_at`,
    [clerkUserId, displayName]
  );
  return rows[0];
}

async function attachPatron(req, _res, next) {
  req.patron = null;
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId || null;
    if (clerkUserId) {
      if (known.size > 2000) known.clear(); // a modest book, rebound when full
      let entry = known.get(clerkUserId);
      if (!entry) {
        entry = inscribe(clerkUserId);
        known.set(clerkUserId, entry);
        entry.catch(() => known.delete(clerkUserId));
      }
      req.patron = await entry;
    }
  } catch (error) {
    // A stumble at the door never bars the table — fail open as a guest.
    console.error(`[door] ${error.message}`);
    req.patron = null;
  }
  next();
}

// The whole door as one mountable piece. Closed: a pass-through that marks
// everyone a guest. Open: Clerk's session reader (canonical key resolution
// via the proxy host, per the workspace template), then the ledger.
export function doorkeeper() {
  if (!doorOpen()) {
    return (req, _res, next) => { req.patron = null; next(); };
  }
  const door = express.Router();
  door.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? '',
        process.env.CLERK_PUBLISHABLE_KEY
      ),
    }))
  );
  door.use(attachPatron);
  return door;
}

// GET /api/whoami — the door's honest answer, for the client and for curl.
export function whoami(req, res) {
  res.json({
    patron: req.patron
      ? { id: req.patron.id, displayName: req.patron.display_name, since: req.patron.created_at }
      : null,
  });
}
