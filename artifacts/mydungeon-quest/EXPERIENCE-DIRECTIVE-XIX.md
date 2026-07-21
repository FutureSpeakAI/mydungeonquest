# EXPERIENCE DIRECTIVE XIX — THE UNBOUND WORLD

*(Task 64. Written first, before any bytes, per the series preamble. The
governing sentence of this directive, verbatim as commanded: **the compass
unbinds, the ledger never does.** Nine spines, one arc, one assumed goal,
and no verbs for ambition — those are the four bars on an otherwise
limitless world, and this task removes all four without loosening the
ledger by one byte. Every unbinding below is a new freedom judged at the
same doors: swept, schema-courted, presence-lawed, cited, and sealed.)*

The standing laws all hold: the client computes all mechanics; ops are
additive, never breaking (older campaigns load and play untouched);
systemPrompt, tool schema, and every validateDmTurn call-site move in
exact lockstep; one seat for any law two sides read; the journal is
append-only; witnesses are born fail-closed; the mock tier is sovereign
and the keyless chain runs whole with zero keys; exactly one validated
dm_turn enters the record per turn, however many minds deliberate.

## Article I — THE STORY SMITH LAW *(Stage One)*

**The bespoke spine.** On live keys, forging a world — or a new volume —
may call the story smith: one temperature-bounded model call (the pinned
`SMITH_TEMPERATURE`, no other dial) returning a bespoke spine as strict
JSON in exactly the shape the spine gates already check — `id`, `label`,
`revealIdx`, fifteen `beats` in three ascending acts of five (each beat
`act`, `key`, `title`, `goal`), `deadlines` with ascending `byBeat` and
roles from the cast law's own vocabulary — plus a `villainDesign` clause
fitted to the covenant and, for later volumes, to the carryover the Saga
Law defines. The story smith's seat is a new engine module beside the
smith (`storySmith.js`), importing the sweeps and the temperature from
the one smith seat, never restating them.

**The court before the seat.** Every candidate passes the spine schema
court (exact keys, no strangers, fenced strings, act arithmetic, lawful
roles, `revealIdx` inside the tale), the PG sweep, and the poisonSweep
before it seats; a failing candidate is discarded and redrawn whole,
never repaired by hand. The live tool schema MIRRORS the court exactly —
enums, fences, and counts — per the standing mirror law.

**The mint.** A seated spine is minted once per volume: the spine and its
attestation (source `shelf`/`smith`/`mock`, seed, provider, minted turn)
seal into the world's record, cached forever; a second mint for the same
volume is refused by name. **The keyless floor stands:** the nine
hand-built spines remain the shelf, the known-good exemplars, and the
mock smith's ground — `mockStorySmith` deals a lawful bespoke spine
deterministically in (seed, covenant, carryover), so every gate runs
without keys and the free tier still gets whole stories.

**The Two Hands govern the smith's door:** a player may pick a shelf
spine, roll a bespoke one, or open the deep forge; sovereign text stands
— the player's own words always outrank the smith's.

**Enforcement point:** the storySmith module (court, floor, mint law);
server smith seat for the live ask (schema mirror, redraw law); the
world-forge door for the Two Hands. **Gate:**
`evals/storySmith.test.mjs` — schema court on candidates (strangers,
fences, act arithmetic, roles all refused by name), sweep rejection path,
floor determinism, mint-once attestation, the mock smith lawful and
deterministic.

## Article II — THE SAGA LAW *(Stage Two)*

**Sealing a tale closes a volume, never a world.** A saga manifest binds
volumes in order: `{kind: 'saga', version, worldTitle, covenant,
volumes: [{index, title, headHash}]}`. Each new volume's genesis cites
the prior volume's head seal by hash, so the desk can walk a whole saga
the way it walks a chain — `verifySaga` verifies every chronicle, then
every inter-volume citation, and refuses any break by name (which
volume, which citation). Old single-volume tales carry no manifest and
load untouched; the sealed volume stays sealed, exportable, and
publishable exactly as before.

**The carryover is a pure fold** — derived, cited, never destructive.
The legacy packet grows additively to carry: the living cast (exact
voices, locked canon), the places, the trove and purses as written, the
standings, the open clocks, the open threads, and the calendar. Every
carried row keeps its origin citation; nothing in the sealed volume is
rewritten to produce it.

**The next volume is forged from what the last one left unpaid.** The
story smith's carryover input contract, stated here as law: `{
openThreads, openAmbitions, standings }` — consequence is the seed of
continuation.

**Enforcement point:** the saga module (manifest, grown packet,
openNextTale), the desk (`verifySaga`), genesis (the citation seat).
**Gate:** `evals/sagaChain.test.mjs` — manifest shape, the citation
chain verified and refused at the desk on a planted break, the carryover
fold pure and cited and complete, an old single-volume tale loading
untouched.

## Article III — THE HEIR LAW *(Stage Two)*

When a hero dies or retires, a new hero may rise in the same world
through the standing forge — the Two Hands whole, mid-saga, mid-volume.
The succession fold: the world's record continues untouched; the fallen
keep their memorials (the doom law's own notes), their marks on the
standings, and their unpaid debts — open threads they held or owed
remain open as the new hero's **inherited weather**, annotated and cited
to the fall. The heir seats with a fresh sheet; the Tenor law and the
anchor law apply to the heir untouched (the tale keeps its weather, the
new face is lawfully anchored). Permadeath becomes a chapter break: the
Book notes the succession and the journal continues, append-only.

**Enforcement point:** the succession fold in the engine; the forge door
open mid-tale; the memorial law in the cast fold. **Gate:**
`evals/heir.test.mjs` — the inheritance fold (world record whole,
memorial permanence, debts inherited open with citations), the forge
path lawful mid-saga.

## Article IV — THE DECLARATION LAW *(Stage Three)*

**The player's goals become first-class record.** The table gains a
declare affordance; a declared ambition rides the turn as structured
player intent. The validator requires the same turn's story to seal it
**verbatim** as an `ambition_add` operation — byte-identical text; a
turn that drops the declaration is refused by name, and a turn that
rewrites it is refused by name. Presence-lawed like every court: a turn
carrying no declaration owes nothing, and a bare context proves nothing.
Ambitions resolve like threads — `ambition_resolve` with an honest
outcome from a small lawful set — and list in the Debts chapter with
their citations.

**The Director is obligated:** `beat_intent` grows an `ambitions_served`
field that must name at least one open ambition whenever any stands
(presence-lawed through the briefing's own evidence). **The spine may
lawfully bend:** one sealed `spine_amend` per act at most, carrying its
stated reason, rendered in the Book, so the player can watch the story
change shape around their choices in the record itself. The Director
schema change is a lawful protocol bump under the cache-freshness law,
REPLAY named, re-judged once.

**Enforcement point:** the ambition ops in protocol + schema +
systemPrompt (lockstep); the verbatim-seal court in validateDmTurn at
every call-site; ambitions_served in the writers'-room bench; the
amendment cap in the fold. **Gate:** `evals/declaration.test.mjs` — the
verbatim-seal requirement enforced with drop and rewrite both refused by
name, honest resolution, the ambitions_served obligation under presence
law, the one-amendment-per-act cap, the Debts listing cited.

## Article V — THE CLOCK LAW *(Stage Three)*

**One universal primitive for any long undertaking.** A clock opens with
a label and a fixed segment count from the small lawful set **{4, 6,
8}**; it ticks forward only through sealed `clock_tick` operations
carrying reasons; at most **two clock operations a turn**, all kinds
counted together; a tick past full is refused. **A filled clock must
resolve:** while a filled clock stands unresolved in the briefing's
evidence, the turn must carry its `clock_resolve` with an honest outcome
— the door refuses a turn that leaves a filled clock silent. Clocks may
link to ambitions by name. They render in the Debts chapter with every
tick cited (turn and reason), and the briefing carries the nearest-full
clocks — bounded to three — in a cache-stable seat.

**Enforcement point:** the clock ops in protocol + schema + systemPrompt
(lockstep); the caps, the fill law, and the resolve obligation in
validateDmTurn; the fold's cited tick ledger; the briefing seat.
**Gate:** `evals/clocks.test.mjs` — the full matrix (open, tick, fill,
resolve), fill-must-resolve enforced, the caps and the segment set, the
citations whole, the briefing seat bounded and stable.

## Article VI — THE STANDING LAW *(Stage Three)*

**Factions become a ledger.** A bounded `standing_shift` operation names
a faction, a small delta from **{-2, -1, +1, +2}**, and a reason; at
most two a turn. The fold derives each faction's standing as the sum of
its cited shifts — every shift carrying turn, delta, and reason; no
score exists outside the fold's own arithmetic. The **Standings panel**
renders the ledger in the Debts chapter, and the stated-allegiance edges
already in the atlas join their factions' pages. The briefing carries
the strongest standings — bounded to four, by absolute score — and the
famine order grows by exactly one named tier: the elsewhere falls first,
then standings, then stated allegiances, then wealth and wields, as
before.

**Enforcement point:** the standing op in protocol + schema +
systemPrompt (lockstep); the delta bounds at the door; the fold's
derived ledger; the Debts panel; the briefing trim seat. **Gate:**
`evals/standings.test.mjs` — bounds enforced by name, fold parity (the
score provably the sum of its cited shifts), the panel contract, the
briefing seat and its trim order.

## Article VII — THE HORIZON LAW *(Stage Three)*

**The edge never runs dry.** Every volume's forge mints a small swept
rumor pool — six rumors — in the story smith's own call (live or mock),
each rumor swept by the PG and poison sweeps and sealed with the spine's
own attestation. The Traveler's Chart's blank vellum carries up to three
unresolved rumors at its edge, each a lawful seed the Dungeon Master may
open into a thread citing its rumor (`thread_add` grows an optional
rumor citation); an opened rumor leaves the edge and the pool seats the
next, so the edge never runs dry while the pool holds. **The map's
honesty is untouched:** rumors are marked as rumor, never drawn as
geography.

**Enforcement point:** the pool in the storySmith call (mint + sweep);
the chart's edge rendering; the rumor citation on thread_add at the
door. **Gate:** `evals/horizon.test.mjs` — pool shape and sweep, edge
rendering (bounded three, marked as rumor, rotation on open), the
open-into-thread path carrying its citation.

## Article VIII — THE WORLD SHAPE COURT *(Carryover from 1.2.0, sanctioned)*

The architect's finding C stands pre-existing: malformed world payloads
bend silently in the fold. **The validator gains the world shape court,
additively:** every world operation's payload is judged at the door for
shape (an object with known keys only — `blight_delta`, `region_add`,
`region_update`), bounds (the delta an integer in −5..5; names and
visuals inside their fences; states from the one seat's own
`REGION_STATES`), and unknown keys — refusals named, under the
bare-context presence discipline. **The reducer's silent bend retires**
in favor of the standing note pattern: where the fold must still guard
as a last belt, it writes a named note into the record instead of
bending silently. Every lawful payload the standing fixtures already
carry still passes untouched.

**Enforcement point:** the world court in validateDmTurn; the note
pattern in the story fold. **Gate:** `evals/worldShape.test.mjs` — the
refusal matrix proven by name, the fixtures' lawful payloads passing
untouched, the note pattern standing where the belt catches.

## THE BOOK AMENDMENT (the one sanctioned change to the 0.9.2 Book law)

The Debts chapter grows the **Standings panel**; ambitions and clocks
list under the Debts chapter's own standing law — debts of intent and
debts of time beside the debts of promise it already keeps, every row
cited. The chapter set otherwise stays closed: no new chapters, no
renames, no reorders.

## THE CACHE POSTURE (Task 63's posture governs every prompt and briefing change herein)

1. **systemPrompt additions append at the tail of the stable law text** —
   the declaration, clock, standing, and horizon laws land as appended
   articles, never inserted mid-prompt; existing bytes do not reorder.
   One lawful cache invalidation per stage when the appendix lands,
   byte-stable thereafter.
2. **New briefing seats are cache-stable and bounded:** the nearest-full
   clocks (three) and the strongest standings (four) seat in the pack at
   fixed positions; the famine order grows by exactly the one named
   standings tier; the 20-entry floor, the breakpoints, and the stable
   prefix bytes do not move; the promptCache gate stands witness.
3. **The Director schema bump** (ambitions_served and the new op
   families) is ONE lawful protocol bump at stage three, REPLAY named in
   its run log, the prose court recalibrated once to perfect separation
   before it sits.
4. **Listless legislation stands:** prompt-law strings carry no example
   enumerations, and the poisonSweep keeps its relics byte-stable.

## THE GATES, THE PIN, AND THE COURTS

- **Stage One** lands `storySmith` and `worldShape` in the counted
  chain, each printing its one PASS line: the pin moves **145 → 147** in
  the same commit as the gates — the standing debt paid before the new
  law. Stage One is proven keyless before Stage Two begins.
- **Stage Two** lands `sagaChain` and `heir`: pin **147 → 149**,
  same-commit law identical.
- **Stage Three** lands `declaration`, `clocks`, `standings`, `horizon`:
  pin **149 → 153**. The task's total growth is P to P plus eight
  (Section 5's supersession), and G13's final move rides the same commit
  as the final gate.
- **The courts:** the proving loop gains **G35 THE SAGA COURT** — seal
  the seeded volume, forge volume two from its unpaid thread through the
  mock smith, prove the Book carries the world forward with citations,
  the desk verifies both volumes and their linkage, the heir path forges
  lawfully after a seeded fall, and the sealed first volume still
  exports and publishes untouched — and **G36 THE OPEN ROAD COURT** —
  declare an ambition at the table and prove the same turn seals it
  verbatim, the next beat_intent names it, a clock opens, ticks with
  cited reasons, fills, and resolves honestly, a standing shifts and
  renders with its citation, a rumor stands at the chart's edge and
  opens into a cited thread, and a sealed spine amendment renders its
  reason in the Book. Both join REQUIRED_PROJECTS and REQUIRED_EXECUTED
  by name in the verdict, same commit as the courts.
- **The tooth:** tooth 22, next in the ledger, born under the Control
  Law — break the inter-volume citation in a copy and the desk must
  refuse the saga by name, the control proving its own lie before it
  seats.
- **THE SEATED STORYTELLER ITEM:** before stage three's prose-court
  recalibration begins, the writers'-room storyteller queue item
  recorded at 1.2.0's close is surfaced and its description ledgered in
  LOOP_LOG.md. If it is a live defect in the room, it receives
  probe-before-cure diagnosis and its cure lands with targeted proofs,
  or its blocker report lands instead, before any recalibration seats. A
  bench must never be recalibrated over a known-sick voice.
- The proving window is **64.1–64.14, ceiling fourteen** across the
  three stages, each stage proven keyless before the next, the whole
  ritual per the preamble: three consecutive greens, the architect's
  sitting on the full diff, the closing sentence with its RITUAL
  COMPLETE line — no step without its artifact. When it closes, the
  report may end: **the world is unbound, and the ledger holds.**
