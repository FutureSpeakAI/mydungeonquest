---
name: MyDungeon door (Clerk) — locked when keyed, absent when keyless
description: Auth doctrine — mandatory sign-in when keys exist, keyless forks doorless forever, eval/env handling, Clerk quirks
---

## Doctrine (owner directive, July 2026): THE DOOR IS LOCKED
- **Server**: `namedOnly()` (patrons.js) mounts on every pouring room — `/api/dm, /api/retell, /api/paint, /api/speak, /api/music, /api/sfx, /api/quest-audio, /api/bind-pdf` — via one `app.use([paths], namedOnly())` in index.js, answering **401 `{door:true}` BEFORE the innkeeper** reads any ledger. `/api/toll`, `/api/whoami`, `/api/health`, the Stripe courier, and static halls stay nameless-readable.
- **Client**: `DoorGate` inside DoorFrame's catch-all route — signed-out visitors see `LockedTitle` (candlelit title + offer: six turns free, $5/wk, $129.99/yr) and never a playable table; `/sign-in` + `/sign-up` routes sit OUTSIDE the gate.
- **Keyless forks stay doorless forever**: namedOnly is a pass-through, PatronShell returns children untouched — a fork or eval is byte-for-byte the free table. Media doctrine and door doctrine are the same law.

## Identity vs money — never mix the refusals
- Door refusals: **401 `{door:true, error}`**. Toll refusals: **402 `{closed:true, ...}`**. A nameless knock must never produce a 402.

## Eval & env handling
- `evals/tollhouse.test.mjs` §0 tests the lock by setting `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY` inside try/finally, then striking them — the rest of the bench must stay keyless.
- The jsx loader pins `VITE_CLERK_PUBLISHABLE_KEY=''` so component evals always walk the doorless house.
- Clerk CAPTCHA blocks agent-driven browser sign-up — E2E of the signed-in table needs the owner's real session; curl-test the 401s instead.

## Clerk quirks (unchanged)
- `publishableKeyFromHost(window.location.hostname, envKey)` resolves per-hostname; guard behind doorBuilt (headless eval has no window).
- `proxyUrl` passed unconditionally (empty in dev, auto-set in prod) — never gated on NODE_ENV.
- Clerk needs real paths for OAuth callbacks → wouter `/sign-in/*?` optional-wildcard routes.

**Why:** nobody plays unnamed — the six-turn lifetime taste needs a name for its count to bind to; keyless pass-through keeps evals and forks honest without a second code path.
**How to apply:** adding any new pouring route → add its path to the namedOnly `app.use` list in server/index.js (and nothing else).
