# EXPERIENCE-DIRECTIVE VIII — THE PARTY AND THE ELSEWHERE

*Ratified for the 0.7.2 cut. The Presence Cut (Directive VII) taught the record
where the stage is. This directive teaches it who travels and who remains, so
the game can never again walk a mother out of her ferry-house because the model
forgot she stayed behind — and it gives place-bound details a card, because a
comet-burned ring in a table is canon the moment it is spoken, and canon
without a card is an invitation to the painter's imagination.*

Every law below names its enforcement point and its gate. The protocol stays
additive: older campaigns load and play untouched; every new list on the codex
is backfilled empty on first fold.

---

## VIII.1 THE PARTY LAW — who travels, sealed as operations

The party is a sealed roster, moved only by two additive story operations,
each an object and never an array, judged at the single door against the
pre-turn record:

- `party_join { name }` — exactly one key; name 2–80 chars. Lawful only for a
  living soul whose last lawful ground is the current scene, or who is
  introduced by this same turn's `cast_add` (a soul walks on where the stage
  stands). The dead do not travel.
- `party_leave { name, remains_at? }` — name required (2–80); `remains_at`
  optional, 3–100 chars, and must name a region the record knows or one built
  by this same turn's `world.region_add`. Lawful only for a current member.
  `remains_at` defaults to the current scene's region at the fold.

THE HERO-ROOT LAW: the hero is the party's permanent root and is never joined
and never left. A `party_join` or `party_leave` naming the hero is refused by
name.

**Enforcement:** `packages/engine/src/protocol.js` (`validateParty`), with the
bare-context presence law exactly as the trove holds it: the membership court
seats iff the context carries a `party` array (empty = attested empty); the
living court seats iff the context carries `cast`; the ground court seats iff
the context carries a `presence` array AND a standing `scene` (a null scene
stands no court — genesis is free); the hero-root court seats iff the context
carries `hero`. A bare context gets shape law only. The reducer
(`packages/engine/src/story.js`) is the canon guard behind the door: unknown
souls, the dead, duplicates, non-members, unknown `remains_at`, and the hero
root are refused with notes; `meta.heroName` (additive, optional) lets the
fold hold the hero-root line even doorless.
**Gate:** `evals/party.test.mjs` (the party gate); G21a at the table.

## VIII.2 THE FOLD — codex.party, joined in time

The reducer folds `codex.party` as a member list `{ name, joinedTurn }`,
backfilled `[]` for old codexes. Fold order within a turn is law: the world,
then fixtures, then the ground, then the party — so a `party_leave` in a
traveling turn defaults its `remains_at` to the NEW ground unless it names
another region outright. The offscreen tick may not move the party: a tick
fold refuses `party_join` and `party_leave` with a note, exactly as it
refuses `scene_set` — the presence replay skips tick rows whole, and a party
the fold moved where the replay cannot follow would split the one record.
`party_state` rides the story block to the server court as `{ name,
joinedTurn }`, exactly as `trove_state` and `scene_state` ride.

**Enforcement:** `applyStoryUpdates` and `storyBlock` in
`packages/engine/src/story.js`.
**Gate:** `evals/party.test.mjs`; parity in `evals/hookedWorld.test.mjs`.

## VIII.3 THE NOBODY-TELEPORTS LAW — the heart of the task

When the court is seated, a `narration_blocks` speaker or `dialogue_cue`
voice whose derived last lawful ground is KNOWN and is neither the current
scene nor within the party is rejected, and the violation names the soul and
its actual ground. Exempt by law: the hero (the root travels with the
scene), every party member, a soul introduced by this same turn's
`cast_add`, and a soul whose whereabouts the record does not know — the law
binds only where the record can testify.

**Enforcement:** `validateSpeakerGround` in
`packages/engine/src/protocol.js`. The court seats iff the context carries a
`presence` array, a `party` array, AND a standing `scene` region — all three,
or silence (the bare-context presence law; a caller who wants the law threads
the whole record). The server door threads all three from the story block's
own `presence_state` and `party_state` (VIII.5).
**Gate:** `evals/party.test.mjs` (rejection matrices); G21a proves the
elsewhere speaker rejected by name on the sealed table.

## VIII.4 THE REPLAY — partyOf, elsewhereOf, and ground that moves together

The pure presence replay (`packages/engine/src/presence.js`) grows the party:

- A lawful `party_join` row seats a KNOWN soul in the party and sights it on
  the standing ground, cited to that row.
- Travel moves the ground of every party member together: a lawful change of
  scene sights every current member on the new ground, cited to the travel
  row. A restatement moves nobody.
- `party_leave` releases the member and pins the departed soul's ground at
  `remains_at` (when the record holds that region) or at the standing ground,
  cited to the leave row.
- `partyOf(campaign)` answers the standing party `{ name, cite }`;
  `elsewhereOf(campaign)` answers every known soul NOT in the party whose
  known ground is NOT the current scene — `{ name, ground, sinceTurn, cite }`,
  most recently cited first. A soul with no known ground is not "the
  elsewhere"; it is honestly unplaced and stays off the list. Struck rows
  contribute nothing; tick rows are skipped whole; cites are journal ROW
  indices and `sinceTurn` is the row's own turn number (or null) — two clocks,
  never cross-asserted. Fail-closed like every witness: a list that is not an
  array, a name that is not a string, a row that is not an object — each
  proves nothing and is skipped whole; the replay never throws.

**Enforcement:** `packages/engine/src/presence.js`.
**Gate:** `evals/party.test.mjs` (replay matrices, citations, determinism,
mangled records); parity in `evals/hookedWorld.test.mjs`.

## VIII.5 THE BRIEFING — TRAVELING WITH YOU and THE ELSEWHERE

The briefing gains two sections with a stated trim order:

- `traveling_with` — TRAVELING WITH YOU: every party member as
  `Name — joined turn N` (name alone when the turn is unrecorded). Rides in
  full and NEVER trims; present even empty (an empty roster is the hero
  walking alone, honestly recorded).
- `elsewhere` — THE ELSEWHERE: up to six absent souls as
  `Name — in Ground since turn N` (the since-clause absent when the turn is
  unrecorded), most recently cited first, present only when the record holds
  at least one. Famine order is law: THE ELSEWHERE trims first, entry by
  entry, BEFORE the allegiances; then allegiances; then the wealth line. The
  calendar keeps the first byte; the ground line keeps the second key; the
  floors above never move.

The context pack carries the court's evidence in full, immune to the budget:
`presence_state` (`{ name, ground }` per sighted soul, from the pure replay),
beside `party_state` and `fixture_state` from the block — evidence is never
trimmed, or the door goes blind exactly when the tale grows long.

**Enforcement:** `buildBriefing` / `buildContextPack` in
`packages/engine/src/graph.js`; `judgeTurn` in `server/dm.js` seats the courts
from these exact keys.
**Gate:** `evals/party.test.mjs` (briefing bytes, famine order);
`evals/hookedWorld.test.mjs` (agreement on one record).

## VIII.6 THE FIXTURE LAW — place-bound canon, sealed once

`fixture_add { place, name, visual }` — an object, exactly three keys; place
3–100, name 3–60, visual 8–160. The place must exist in the record or be
created by this same turn's `world.region_add`. A second `fixture_add` with
the same name in the same place is rejected: fixture canon seals once, like
region canon. The reducer folds `codex.fixtures` as
`{ place, name, visual, since }`, backfilled `[]`; a duplicate is refused
with a note; the tick door does NOT bar fixtures — the offscreen world may
build detail, it may not move souls — and no replay reads fixtures, so the
one record cannot split.

**Enforcement:** `validateFixtures` in `packages/engine/src/protocol.js`
(atlas court iff `context.regions` is an array; seal court iff
`context.fixtures` is an array; bare context gets shape law); the fold in
`packages/engine/src/story.js`.
**Gate:** `evals/fixture.test.mjs` (the fixture gate); G21b shows the card.

## VIII.7 THE FIXTURE RIDER — the card rides the easel

Scene prompts carry up to three fixtures of the painted place, most recently
sealed first, each with its sealed visual clause verbatim — byte-stable: the
same record briefs the same bytes. The rider stands beside the region canon
and beneath the beat: the moment still wins every disagreement.

**Enforcement:** `scenePrompt` in
`artifacts/mydungeon-quest/src/lib/cinema/prompts.js`.
**Gate:** `evals/fixture.test.mjs` (rider bytes, cap, ordering);
`evals/hookedWorld.test.mjs` (the prompt speaks the sealed card).

## VIII.8 THE WATCH LAW — the folded hours get a name

The calendar's folded hours map deterministically to a named watch of the day
through a fixed table in code — six watches of four hours each: deep night
(00–03), dawn (04–07), morning (08–11), afternoon (12–15), dusk (16–19),
night (20–23). The briefing's calendar line extends to carry the watch,
byte-exact: `It is Day N of the tale, in the W watch.` — and the calendar
keeps the first byte of the briefing. Every scene prompt carries the watch
word (`The watch of the day is W.`), byte-stable, so dusk cannot flip to noon
between plates; where the beat states its own hour, the beat still rules
(Directive 0.6.x beat supremacy, unchanged). The mock DM's script advances
hours across its run, so keyless tables walk more than one watch.

**Enforcement:** `watchOf` / `calendarLine` in
`packages/engine/src/calendar.js`; the rider in `scenePrompt`; the script in
`packages/engine/src/mockDm.js`.
**Gate:** `evals/watch.test.mjs` (the watch gate); G21 holds the byte-exact
line across the sealed travel.

## VIII.9 THE PAGES — the codex speaks the party, the fixtures, the ground

The Codex gains the party strip: every standing member with their joined
turn, or the honest line that the hero travels alone. Every place page gains
FIXTURES with citations (`sealed turn N`). Soul pages keep Directive VII's
law verbatim: the last known ground said plainly, and a soul with no lawful
sighting says so rather than guessing. Every new surface obeys the copy law
(G15) and the fail-closed panel oath: a witness that cannot be read is SAID,
never crashed over, never silenced.

**Enforcement:** `src/components/Overlays.jsx`.
**Gate:** G21b (DOM); G15 sweeps the new copy.

## VIII.10 THE DM'S CHARGE AND THE MIRROR

`systemPrompt.js` gains rules 31–33, continuing the numbered sequence, in
LISTLESS LEGISLATION (no example enumerations): the party travels as one and
the absent stay where they were left; register a place's lasting details as
fixtures when they matter; let the watch of the day color the telling. The
server tool schema declares `party_join`, `party_leave`, and `fixture_add`
with the same bounds the validator enforces — the lockstep law, never
loosened: a schema the model cannot see is a trap.

**Enforcement:** `src/lib/systemPrompt.js`; `server/dm.js` (schema + seated
courts in `judgeTurn`).
**Gate:** `evals/party.test.mjs` / `evals/fixture.test.mjs` assert the
schema mirrors the validator's bounds key for key.

## VIII.11 THE GATES AND THE PIN

Keyless gates grow by exactly three: the party gate, the fixture gate, the
watch gate — each one file, one PASS line, in the eval chain beside the
presence and ground gates. The hooked-world capstone is sanctioned to grow:
party, elsewhere, and watch agree with the briefing on one record. The pin
rises 98 → 101 in the same commit that seats the gates (G13's literal moves
with them).

## VIII.12 THE PROVING COURT — G21 THE PARTY AND THE ELSEWHERE

The loop gains G21, deterministic DOM and protocol criteria, no judge, no
new teeth. The seeded fixture stages a join, a travel, and a leave with
`remains_at`; the party strip renders its members; the departed soul stands
under their pinned place's STANDING HERE with the leave citation; a protocol
spec proves the elsewhere speaker is rejected by name; the fixture renders on
its place page with its citation; the G14f day law and the byte-exact watch
line hold across the travel. G21a and G21b are enrolled by name in the
verdict. No paint surface changes except the two byte-stable riders (the
fixture rider and the watch word), so the vision courts replay lawfully.

## VIII.13 THE RECALIBRATION HONESTY CLAUSE

The seeded fixture grows three turns (the join, the travel home, the
join-and-leave); the sealed calendar therefore walks Day 4 → Day 5, and the
presence truths of G20 shift with the record (the travelers came home; one
soul rode back). Every such assertion is recalibrated to the new sealed
truth and logged in LOOP_LOG.md — re-aimed, never weakened; the one exact
index that can never shift (the walk-on's opening-row cite) stays pinned.

## VIII.14 WHAT THIS DIRECTIVE DOES NOT DO

No new dependencies. No change to any existing operation's shape or any
reducer behavior outside the sanctioned folds above. No new teeth; no judge
questions; no paint-law changes beyond the two riders. The Sound Law, the
media doors, the redaction law, and the two-clock law stand untouched.
