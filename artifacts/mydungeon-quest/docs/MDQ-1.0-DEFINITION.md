# MyDungeon.Quest 1.0 — The Definition

Pinned at the 1.0.0 release (2026-07-19, Task 60 §3), in the release's own commit. This document defines what MyDungeon.Quest IS at 1.0: the promises the house makes, the laws that keep them, and the gates that prove them. It is a record, not a roadmap — what 1.0 means, so any later cut can be judged against it.

## What the house is

MyDungeon.Quest is a solo tabletop role-playing house: one player, one Dungeon Master who listens, dice with teeth, and a record that cannot be quietly rewritten. The table is a React app; the truth is a sealed journal; the law is a zero-dependency engine — fatescript — that the game re-speaks seat by seat; and a proving loop plays the game itself, with a vision judge at the plates.

## The eight promises

**1. The record is sovereign.** Every turn is a sealed envelope: hash-chained, Ed25519-signed. The desk — an engine seat — verifies any exported tale anywhere JavaScript runs: no database, no keys, no network. One flipped byte is refused with the record named; a re-hashing forger only moves the break down the chain until the head seal, and then the signature court stops him cold — nor may he claim the tale was never signed: while the envelope carries a public key or any record's ink, a hash-only claim is refused as a downgrade, so the signed claim can never be laundered. Imports verify before the door opens — at the desk's one seat; restored tales are read-only and carry their public key forward, so their re-exports verify whole; forks are new spines that name their parent.

**2. The tale replays pure.** The journal is the truth and the table is a fold of it: replay the records and the same tale stands. Reducers upgrade copies, never records. Journal strikes outrank every cached flag; a retelling falls whole if any cited turn is struck; a page that cannot prove its citations is never used.

**3. Keyless is a full citizen.** With no provider key in the house, the mock floor deals the whole game — deterministic, lock-conditioned, court-judged — and the entire keyless check plays on it. Providers are opt-in; the live tiers degrade to mock and never error; spend ceilings skip providers rather than failing a turn. Players keyless get honest silence, never a broken speaker. Films are retired (July 2026): legacy posters render as stills, labeled for what they are.

**4. The door is tight.** Time-to-wonder is a number with a budget — 133 whole seconds, pinned by ceremony on the live door — and the clock stops at a sentence, never a plate. The first word lands before any paint is asked for. A returning tale is greeted with exactly one recap per sitting; the front gate and the legal pages are static files that load with no app at all.

**5. Old tales load untouched.** A pre-0.7 save walks every reader: absences read as absences, era doors carry legacy shapes across in exactly one write, and the oldest tale plays whole under the newest law. The back-compat gate holds this promise inside the keyless chain, deep-frozen.

**6. The law sits in one seat.** Every pure fraction of the game's law lives in the engine — fatescript 1.0.0, first stable, zero dependencies — and the game's own modules re-speak those seats; no law byte lives twice. The engine's keyless suite twins the game's gates fraction for fraction; the five gates that keep no twin are named in BUILD_STATUS with their reasons, and both repos pin the same parity section verbatim.

**7. The house proves itself.** The game's keyless check: 125 green verdicts, exit 0, counted and pinned by an e2e court of its own. The engine's: 58 gates, exit 0, in seconds. The proving loop — the full Playwright suite, zero skips, every court executed, the vision judge's teeth all in — sat three consecutive greens on live keys for this release. A gate that cannot be run is a gate that does not exist.

**8. The money is honest.** The toll-house deals a lifetime taste, then $5 a week or $129.99 a year, unmetered. A refused pour resumes after checkout; the remaining pours are visible without opening Settings; renewal dates are honest nulls when the till does not know; retired marks raise nothing; the house's own comp seat is owner-written and cannot be minted from outside.

## What 1.0 is not

No films — retired, not degraded, and the poster law stands in their place. No shared table; the house seats one player. No cloud copy of reveals: the seen ledger is device-local by law, never sealed, never synced, never exported. Procedural audio sits in the eval room only; at the table a player hears real voices or honest silence.

## The numbers

- Game: `mydungeon-quest` 1.0.0 — keyless check 125 PASS, exit 0, pinned.
- Engine: `fatescript` 1.0.0, first stable — keyless check 58 PASS, exit 0, zero dependencies.
- The proving loop: three consecutive greens on live keys at this release (iterations 60.1–60.3), zero skips.
- Three sealed reference tales — thirty-seven turns each — stand on the demo shelf behind the front gate.
- Tags: `v1.0.0` (the game, at the monorepo root) and `fatescript-v1.0.0` (the engine).
