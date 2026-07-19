# EXPERIENCE-DIRECTIVE VII — THE PRESENCE CUT (0.7.1)

Ratified before any code, under the Standing Law of the series. Each law
names its enforcement point and its gate. If the build must deviate, this
file is amended in the same commit with a one-line reason.

The atlas gets its people. Today no lawful operation states where a scene
stands, so the wiki cannot say who is where — and it never guesses. This
cut seals the ground as an operation, derives presence purely from the
record, and makes the briefing name the ground by law.

## THE LAWS

**VII.1 — THE OPERATION.** One additive story operation: `scene_set
{ region }`. It is an object, never an array — one stage per turn by
shape. Exactly one key, `region`, 3–100 characters. Unknown keys are
refused. Enforcement: `validateScene` in `packages/engine/src/protocol.js`,
shape law always. Gate: the presence eval.

**VII.2 — THE SEATED COURT.** The scene courts are presence-based, as the
possessions courts are. The atlas law binds only when `context.regions`
is an array (the caller attesting the atlas; empty = attested empty). The
travel law binds only when the context CARRIES the `scene` key —
`scene: null` is the caller attesting no scene stands. A bare context
gets shape law only, so bare-context callers (the engine's own long-run
proofs) stay lawful. Enforcement: `validateScene`. Gate: the presence
eval matrix.

**VII.3 — THE ATLAS LAW.** A seated `scene_set` must name a region the
pre-turn record holds, or one created by `world.region_add` in the same
turn — the stage may be built and stood upon in one breath. Matching is
canonical (trimmed, case-blind). Enforcement: `validateScene`. Gate: the
presence eval; the fixture's genesis turn exercises the same-turn
creation.

**VII.4 — THE TRAVEL LAW.** A seated `scene_set` that CHANGES the ground
from the standing scene must ride with `time_advance` in the same turn;
free teleportation is refused by name. Restating the standing region is
lawful and costs nothing. Genesis is free: when the context attests no
scene stands (`scene: null`), the first `scene_set` needs no time.
Enforcement: `validateScene`. Gates: the presence eval and G20a at
protocol level.

**VII.5 — THE TICK LAW.** The offscreen world may act, never relocate the
stage. Three doors hold it: (1) `livingWorld.tickUpdates` keeps its
closed op set — `cast_update` facts and whereabouts only, `scene_set` is
not in it; (2) the reducer refuses `scene_set` on any fold marked as a
tick (`meta.tick`), with a note — so even a widened tick could not move
the stage; (3) the presence replay skips tick rows entirely — offscreen
whereabouts are never sightings. Enforcement: `livingWorld.js`,
`applyStoryUpdates`, `presence.js`. Gate: the presence eval proves all
three doors.

**VII.6 — THE FOLD.** The reducer folds `codex.scene = { region,
sinceTurn }` where `sinceTurn` is the turn-number stamp (`meta.turn`,
null when unstamped). The fold runs AFTER the world fold, so a region
added this turn stands before the scene is set on it. A `scene_set`
naming a region the codex does not hold is refused with a note. Restating
the standing region no-ops — the ground did not change, so `sinceTurn`
holds. Old codexes backfill `scene: null`; `initCodex` starts it null.
Enforcement: `story.js`. Gate: the presence eval.

**VII.7 — THE STATE BLOCK.** `storyBlock` emits `scene_state`
(`{ region, sinceTurn }` or null), and it rides the briefing's spread to
the server court exactly as `threads_state` and `trove_state` do; the
server judge seats the scene court from it. Enforcement: `story.js`,
`server/dm.js`. Gates: the presence eval and the grown hookedWorld
capstone.

**VII.8 — THE SIGHTING LAW.** A pure replay module beside the trove's:
`packages/engine/src/presence.js`, subpath `fatescript/presence`,
dependency-free. `presenceOf(campaign)` and `visitorsOf(campaign, place)`
replay non-struck, non-tick rows in journal order. The standing scene for
a row is the last lawful `scene_set` at or before it — a row's own
`scene_set` stands for that row's sightings (the stage is set before the
players speak on it). A soul is SIGHTED on a row when the record stages
it there: it speaks (a `narration_blocks` speaker or the `dialogue_cue`
speaker, canonically matched, bare first name reaching its soul only when
unique), it walks on (`cast_add`), it is updated by a staged (non-tick)
`cast_update`, or it is named a hand in possession or purse operations
(`item_add.holder`, `item_transfer.from/.to`, `item_remove.holder`,
`purse.holder`). The hero is sighted by every non-struck player row. A
sighting before any scene stands lands on no ground. NO INFERENCE: a soul
with no lawful sighting has unknown whereabouts and the page says so
plainly. Struck rows contribute nothing — the redaction law outranks all
of this. Cites are journal indices. Enforcement: `presence.js`. Gates:
the presence eval and G20a.

**VII.9 — THE STAMP DIVERGENCE, NAMED.** `codex.scene.sinceTurn` carries
the turn-number stamp; replay cites carry journal indices. They are
different clocks with different names, never cross-asserted — the same
choice the trove made (`since`/`moved` stamps vs chain indices), recorded
here so no court ever "reconciles" them.

**VII.10 — THE GROUND LINE.** The briefing names the ground by law, not
by heuristic. (a) When a scene stands, `buildBriefing` carries
`scene_ground` as its SECOND key, immediately after `calendar`:
byte-exact `The scene stands in {name} — {visual}` from the codex's own
region entry (name and visual verbatim; a scene naming a region the
codex no longer holds rides name-only as `The scene stands in {region}.`).
When no scene stands the key is ABSENT — an honest omission, never an
empty string. (b) The standing scene's region rides FULL in the pack's
`regions` regardless of the recent-text heuristic, and the budget's
slim-trim may never slim it (it joins the index-0 immunity). (c) Famine
order is unchanged and the ground is above it: allegiances fall first,
then the wealth line; `scene_ground` and `calendar` never fall. Calendar
keeps the first byte. Enforcement: `graph.js`. Gate: the ground eval,
byte-exact, including key order and famine.

**VII.11 — THE PROMPT LAW.** `systemPrompt` gains rules 29 and 30,
continuing the numbered sequence: state the ground when it changes (seal
it with `story.scene_set`; the region must already stand in the record or
be created by `world.region_add` the same turn; `[STORY].scene_state`
names the standing ground), and pay for travel in time (a `scene_set`
that changes the ground rides with `time_advance` the same turn; the door
refuses free teleportation). LISTLESS LEGISLATION: no example
enumerations in the rule language. The dm_turn tool schema declares
`scene_set` with the validator's own shape and bounds — a schema looser
than the court teaches the model to write turns the court refuses.
Enforcement: `src/lib/systemPrompt.js`, `server/dm.js` storySchema. Gate:
architect inspection (no automated court claims this and none pretends
to).

**VII.12 — THE WIKI LAW.** Atlas place pages gain STANDING HERE (souls
whose last sighting stands on this ground) and HAVE STOOD HERE (souls
sighted here whose last sighting has moved on), each entry cited to its
journal row; soul pages gain a last-known-ground line, or `Whereabouts
unknown.` said plainly. Rendering reads `fatescript/presence` through the
game shim; model-authored names render as React text under the standing
escape law. Enforcement: `src/components/Overlays.jsx`. Gates: G20b at
the DOM, and the G15 copy law extended to open one place page and one
soul page so the sweeps cover what a player can reach.

**VII.13 — THE GATE LAW.** Keyless gates grow by exactly two — the
presence gate and the ground gate — and the pinned number rises 96 → 98
in the same commit (`g13-check.spec.ts` reconciled on the pin). G20 THE
GROUND joins the loop: deterministic DOM and protocol criteria, no judge
calls, no new teeth; `verdict.mjs` demands G20a and G20b by name; the dom
project regex admits g20. The hookedWorld capstone is sanctioned to grow
a ground leg — fold, replay, and briefing agree on the same ground. The
mock DM sets the genesis scene and performs one lawful travel
(same-turn region creation paired with time_advance) so keyless proofs
and seeded fixtures exist. The proving fixture grows additively: the
genesis turn sets the scene on the region it creates; one appended turn
travels to the record's second region with time paid; the struck turn is
untouched; no new paint surfaces, so the unchanged vision courts replay
lawfully under the cache-freshness law.

**VII.14 — THE ROUND-TRIP RIDER (instrument only).** The harness
read-back mapper has dropped a field silently twice (`kind`, then
`dm.story`) — a defect family, now ended: the mapper carries every field
of every row VERBATIM (the row spread whole), with derived conveniences
layered beside, never in place of, the record. The preflight court gains
one assertion: a maximal journal row — every field the writer can
produce, `dm.story` carrying every op including `scene_set`, and a
redaction — survives the mapper byte-complete, proven by per-key byte
comparison over every key present on the row. `scene_state` lives in the
state block, not on journal rows; the maximal row therefore proves
`scene_set` carriage inside `dm.story` — this reading is logged. This is
instrument code: no keyless gate, no pin growth; the edit is logged in
LOOP_LOG.md.

## WHAT THE TICK MAY NEVER DO

Move the stage. A tick may write facts and whereabouts; it may not set
the scene, and nothing a tick writes is ever a sighting. If a future cut
widens the tick's op set, the reducer's tick door and the replay's tick
skip stand until this directive is amended.
