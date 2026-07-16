# EXPERIENCE-DIRECTIVE VI — THE WORLD CUT

*For the agent that inherits this repo. Directives I–V made a game, a
seal, a stage, a living world, and a saga. This one makes the world
**whole**: time that passes, coin that is conserved, a chart that
remembers, faces that are accepted, and a book the player can trust.
Read `docs/CLAWS.md` first. PASS only grows.*

---

## THE TRIAGE (playtest of July 15 — take these before roll order)

Three wounds from a live table. It was good at first and decayed with
context — which is exactly why the answers below are courts, not
prompts. `pnpm run muster` prints them under THE TRIAGE:

1. **Unrecorded souls** — NPCs spoken in prose never reached the
   codex. The census court stands and is gated; Phase 11 wires it
   into the door.
2. **The empty sheet** — the hero's own face never reaches the
   character sheet. Phase 12.
3. **The drifting face** — renders stray from the anchor as turns
   accumulate. Wire the bearing (already on the roll), then Phase 13
   gives the house eyes.

## THE LAWS (already standing — groundwork shipped and gated)

Ten modules stand in `packages/engine/src/`, each with a green gate in
the engine suite. **They are law now; your work is wiring them.**

1. **The Calendar Law** (`clock.js`, gate `calendar`) — time is derived
   from the record, never stored. `worldClock` folds `time_advance` and
   sealed `clock_advance` spans; aging walks the band ladder
   (child 8y → young 14y → adult 25y → elder) and is computed, never
   edited.
2. **The Ledger Law** (`ledger.js`, gate `ledger`) — coin and goods
   move only by double-entry trade op, atomically, with a cause.
   `world` is the one faucet and the one sink, and it moves nothing
   without a cause. Refusals are receipts. Wallets and inventories are
   projections; replay is byte-identical.
3. **The Market Law** (`market.js`, gate `market`) — the house
   witnesses an economy, it does not simulate one. First quote locks;
   uncaused change is a **price attack**, refused by name; caused
   change is cited history; drift is deterministic, one notch per tick,
   toward the pressure the region's scars show.
4. **The Atlas Law** (`atlas.js`, gate `atlas`) — the map is data
   before picture. Relative placement phrases resolve to deterministic
   coordinates in **days of travel**; positions lock like faces; fog
   shows only the witnessed; a world event's reach is a geometry query.
   And above all: **the world may move souls; only the table may end
   them** — `missing` is the lawful offscreen state; an aftermath op
   carrying death is contraband (`assertAftermathLawful`).
5. **The Bearing, Signature & Roster Law** (`bearing.js`, gate
   `bearing`) — the card IS the prompt: locked visual verbatim, one
   high-contrast **signature** item per soul (also an inventory item —
   the ledger moves it, the paint follows), wounds from the record,
   age from the clock, **the dead never age**. At most **three painted
   subjects** per plate: speaker → villain → bond, deterministic;
   everyone else staged in prose.
6. **The Sitting — the Likeness Law, first half** (`sitting.js`, gate
   `sitting`) — **a face is accepted, not assigned.** Three candidates
   of one unvarying identity; the player blesses one, once; **no sheet
   before the blessing.** Souls sit on neutral ground; places keep
   their context (six views and five, respectively). Parchment is
   exempt — the Floor paints procedurally and owes no sitting.

7. **The Scriptorium Law** (`scriptorium.js`, gate `scriptorium`) —
   Agents' Room (Huot et al., arXiv 2410.02603), taken in under house
   law: four scribes — **plot, character, setting, conflict** — each
   briefed to one domain, planning in notes and directives, never
   prose. **The room plans; the door speaks.** `mockRoom` is the
   keyless Floor; `assertRoomSilent` is the court that keeps One Door
   singular.
8. **The Human Hand** (`tells.js`, gate `tells`) — StoryScope
   (Russell et al., arXiv 2604.03136) detects AI fiction at 93% from
   **structure alone**, robust to stylistic edits. The house's first
   answer is architectural: here the player, the dice, the committed
   entropy, the spine, the ticks, and the world's own events author
   the structure — the durable fingerprint is largely not ours to
   leave. The second answer is this court: four measurable tell
   families (**the stated moral, the borrowed body, the tidy bow, the
   hushed register**) counted per thousand words over the sealed
   narration, with counter-directives — capped, ordered,
   deterministic — pushed into the pack's `directives` the moment a
   family runs hot. The court measures; it never rewrites.

9. **The Census** (`census.js`, gate `census`) — the court against op
decay: an attributed speaker the record does not know is an
**unrecorded soul**, and the turn returns through the one-repair door
with the census note — add the `cast_add` (voice_card and all) or
remove the attribution. A soul added this turn may speak this turn;
the dead are counted (their speech is the snapshot court's business).
Nobody speaks who isn't counted.

10. **The Warden** (`warden.js`, gate `warden`) — the Likeness Law's
second half: machine vision judges every post-blessing render beside
the blessed anchor, under a deterministic ruling — pass with the
verdict attested, repaint once with the drift notes appended, then
the anchor itself stands in. **The house never ships a stranger.**
The keyless floor admits it has no eyes and attests every pass as
unjudged; parchment owes no warden.

Also standing: **the Salon** (`tools/salon/`, root gate `check:salon`)
— see `docs/research/AGENTS-ROOM.md`. The corpus stays untracked; that
is a law with a court.

## THE CONSTRAINTS (unchanged, and they bind you)

- `server/dm.js` core, `seal.js`, `rules.js` — protected.
  `protocol.js` is **additive-only, in lockstep**: any new op
  (`trade`, `price`, `world_event`, `clock_advance`, `place` on
  `region_add`) lands as schema + prompt + validator + reducer in one
  phase, or not at all. Until then these ops seal as client-generated
  rows (the ticks pattern) — the groundwork already speaks that shape.
- `App.jsx` gains hooks, never logic. Keyless gates first; keyed lanes
  refuse mocks honestly. One phase per checkpoint. Media spend is
  bounded: sheets count against `MEDIA_IMAGE_CAP`; plates render
  lazily on witness; the roster cap is 3.

## THE PHASES (in order of cost-to-aliveness; each ends in a gate)

**Phase 1 — The Clock at the Table.** Wire `worldClock` into the
context pack and the folio head; saga interludes emit a sealed
`clock_advance` span; band-crossings surface as raven-style notes.
Gate: `clockAtTable`.

**Phase 2 — The Purse.** Wire `buildLedger` behind the table: player
buy/sell UI seals trade rows; loot and rewards are `world` trades with
causes; the hero's purse and pack in the folio are ledger projections.
Gate: `purse`.

**Phase 3 — The Slate.** Vendors quote through `priceEntry`; ticks call
`driftFor`; the folio's Market ribbon reads `slateLine`. Gate: `slate`.

**Phase 4 — The Chart.** `region_add` gains an additive `place` field
(protocol lockstep); `buildAtlas` + `chartModel` feed the folio's
Atlas ribbon; witness marks places seen. Gate: `chart`.

**Phase 5 — The Weather of Consequence.** `world_event` enters the
protocol (lockstep); `applyWorldEvent` writes scars and movements
through the standing court; repaints anchor on predecessor plates.
Gate: `aftermathAtTable`.

**Phase 6 — The Sitting at the Forge.** After bones, oracle, and hand —
and before the tale opens on the illuminated tier — the Foundry paints
three candidates from the hero's bearing; the player blesses one
(exactly as the voice audition); `sheetBrief` mints the six-view
turnaround from the blessed anchor, lazily, against the media cap.
Major souls (villain, bond ≥ 3) sit on introduction, same law. The
**Warden's likeness check** — the Likeness Law's second half —
verifies every later render against the blessed anchor. Gate:
`sittingAtForge`.

**Phase 7 — The Folio.** Rebuild the `Codex` overlay to
`docs/design/CODEX-FOLIO.md` and its mockup, exactly. Gate: `folio`
(criteria written in the spec).

**Phase 8 — Ripples & the Loom.** A consequence index: open threads
the DM must eventually pay; ticks consume open consequences; the
folio's Ripples ribbon speaks "because of you" lines with seals.
Gate: `loom`.

**Phase 9 — The Scriptorium convenes.** Real scribes: at each act edge
or beat advance, draw the four `scribeBrief`s, run them as cheap
planning passes, land the scratchpad in `codex.notes` and the plan's
directives in the context pack. `assertRoomSilent` guards every plan —
a plan that speaks is discarded for the `mockRoom` Floor, and keyless
forks convene the mock room outright. Gate: `scribes`.

**Phase 10 — The Human Hand at the table.** `tellReport` over the
sealed record each turn — it is free and deterministic — and
`styleDirectives` land in the pack's `directives`, capped at three,
hottest family first. Pressure lands on the NEXT turn, where pressure
belongs. Gate: `humanHand`.

**Phase 11 — The Census at the door.** After `validateDmTurn`, run
`assertCensus(dm, cast, { hero })` against the same pre-turn snapshot;
a failing census joins the one-repair message with `censusNote`, and
the repaired turn is judged again. The DM prompt gains the standing
census rule in the same change — schema, prompt, and validator move
in lockstep. Gate: `censusDoor`.

**Phase 12 — The face on the sheet.** The `CharacterSheet` overlay
gains an `AnchorBust`: the hero's blessed anchor (post-Sitting), else
the first attested anchor, else the procedural bust on parchment —
sourced from the media store by asset hash, never re-rendered for the
occasion. A sheet without its face is a form, not a leaf.
Gate: `sheetFace`.

**Phase 13 — The Warden's eyes.** A vision route through the standing
adapter plan — the key that paints can also see. The foundry pipeline
becomes render → `wardenBrief` + anchor + render → `parseVerdict` →
`wardenRuling`: a repaint appends the notes to the prompt, a fallback
ships the anchor, and every attestation carries its verdict. The
watchtower counts warden calls under the image ceiling; `mockWarden`
is the floor; parchment owes nothing. Gate: `wardenEyes`.

**Charted beyond (in this order):** gossip horizons (known_facts as
hard pack horizon) · renown · the almanac (weather from the clock) ·
roads as cost functions on atlas distance · institutions with clocks ·
works (player-built permanence) · small-world casting and re-entry ·
the Salon's keyed harness and **the Tell Bench** — StoryScope's own feature court (its code and prompts are released) run over sealed chronicles — judging only against the human shelf.

## THE INHERITANCE

Suite at handoff: **76 gates green, keyless** — 17 engine, 58 game,
1 salon — via `pnpm run check`. The groundwork above is engine-pure
and consumed by nothing yet; that is not a gap, it is the method:
**the law precedes the courtroom.** Wire one phase, gate it, checkpoint,
and only then take the next. The world is watching; make it worth
witnessing.
