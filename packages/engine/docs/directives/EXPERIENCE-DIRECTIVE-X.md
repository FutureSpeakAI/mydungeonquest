# EXPERIENCE-DIRECTIVE X — THE BATTLE CUT

**Task 57 · Release 0.8.0 · Ratified before any code, per the Series Preamble's directive-first law.**

**THE AMENDMENT LEDGER, FIRST WORDS.** Task 57's precondition read "Task 56C
closed green." The ledger says otherwise: 56C closed RED by the ritual's
letter — two full greens (56C.11, 56C.12) standing at the frozen ceiling's
exhaustion where three were demanded, the architect's PASS on the full diff,
every instrument separating perfectly. The owner ruled on 2026-07-18:
**amend-and-proceed** — the two greens at exhaustion plus the architect's PASS
stand as sufficient ratification, and Task 57 opens on the standing bytes.
The verifiable clauses held before a line was written: HEAD `b3c5b78`,
CHANGELOG top 0.7.3, keyless check exit 0 at exactly 102. This paragraph is
the deviation's ledger, as the ruling required.

Playtests convicted the battle of four crimes: enemies invented at the moment
of violence with no sealed appearance, initiative that lives in `Math.random`
and dies on reload, combatants acting twice in a breath while the record
holds no count, and numbers spoken by the model that no die on any table ever
rolled. The record already knows how species are sealed (fixture law), how
draws are accounted (entropy law), and how the dead are kept (grave law).
This directive makes the battle obey the record. Two stages, six laws, each
with its enforcement point and its gate. If the build must deviate, this file
is amended in the same commit with a one-line reason.

---

## STAGE ONE

## LAW I — THE BESTIARY LAW

**The law.** A species is sealed once, before any of its kind draws breath on
stage: `story.creature_add { species, visual, nature, threat }` — species
3-60 chars, visual 8-160 (the paintable truth, sealed like fixture canon),
nature 3-90, threat an integer 1-5. One creature_add per turn, an object and
never an array, exactly those four keys. A duplicate sealed species is
refused by name. Instances enter ONLY through the existing combat family,
which grows one additive key: `combat.spawn { species, count, names, zone }`
— species naming a SEALED bestiary card (refused by name when the seated
court cannot resolve it), count an integer 1-6, names null or an array of at
most `count` instance names (2-60 chars each; unnamed instances take
deterministic letters — "Marsh Howler A", "Marsh Howler B"), zone from the
standing ZONES. Instance hit points and armor derive from the threat rating
through THE THREAT TABLE, fixed in code and cited by the gate:

| threat | hp | ac |
|--------|----|----|
| 1 | 4 | 10 |
| 2 | 9 | 11 |
| 3 | 16 | 12 |
| 4 | 30 | 14 |
| 5 | 55 | 16 |

`enemy_add` stands untouched for the unsealed rabble of older sittings — but
the mock tier and the system prompt teach the sealed road: seal the species,
then spawn it.

**Enforcement.** `fatescript/protocol`: creature_add shape law (always
seated) plus the seal court, seated iff `context.bestiary` is an array of
sealed cards `[{ species, threat }]` — presence-based like every court since
Directive VI. The spawn court reads the same seat: a spawn naming a species
the record has not sealed is refused by name; a spawn may name a species
sealed by this same turn's creature_add (the same-breath law, as the ground
courts have always honored it). `story.js` reduces creature_add onto
`codex.bestiary` (backfilled `?? []`), seal-once with a note on the refused
duplicate, and `storyBlock` rides `bestiary_state` to both benches exactly as
`fixture_state` rides. The spawn expands to instances in the ONE expansion
helper the engine exports (id `species-slug-a/b/…`, name, hp = maxHp = table,
ac = table, zone) — client `applyCombat` and every bench call the same
helper; nobody expands twice. The tool schema in `server/dm.js` states every
enum and bound in lockstep with the validator, never loosened.

**The gate.** The `bestiary` keyless gate: the shape matrix, the seal court
(duplicate refused by name, same-breath spawn lawful, unsealed spawn refused
by name), THE THREAT TABLE cited row by row against the expansion helper,
deterministic instance lettering, and the reducer's seal-once note.

## LAW II — THE PAINTED SPECIES LAW

**The law.** When a scene is painted while sealed instances stand in the
combat, the sealed species visual rides the paint prompt byte-stable, exactly
as fixture canon rides: `Bestiary canon, sealed each: ${species} —
${visual}.` — most recently sealed first, at most three species, the sealed
words verbatim and never paraphrased.

**Enforcement.** `scenePrompt` gains THE BESTIARY RIDER beside the fixture
rider, byte-stable and listless. No paraphrase door exists: the rider quotes
`codex.bestiary` entries whole.

**The gate.** The `bestiary` gate pins the rider bytes in the builder; G23e
(Section 3) judges the painted instance against the sealed card.

## LAW III — THE ROUND LAW

**The law.** Combat opens by sealing initiative as an operation — ONE order,
sealed into the turn's journal envelope, never re-rolled on reload, never
reshuffled by death or flight. The draws are honest: the hero and every
party companion draw on the DEVICE (d20 + DEX modifier, the dice the player
can see); enemies draw from the ENTROPY POOL, one d20 draw per species group
(pack initiative — instances of one species share one draw; at most three
species stand in any combat, the pool's three d20s), every draw accounted
through `entropy_use` with its purpose naming the species. Ties break toward
the player's side, then alphabetically — determinism is law. While combat
stands, each living combatant acts at most ONCE per turn: `npc_actions`
gains its first shape — `[{ actor, action }]`, actor an instance id or cast
name, action 3-120 chars — and a second action by the same living actor in
one turn is refused BY NAME. Yield is lawful: a combatant may simply not
act. The dead and the fled keep their seat in the sealed order; the tracker
skips them without reshuffling.

**Enforcement.** `fatescript/protocol`: when `combat.op === 'start'`,
`combat.initiative` is required — `{ device: [names...], entropy: [{
species, index }] }` covering exactly the player side (hero + party, from
context when seated) and every species group standing after this turn's
spawn/adds, each entropy index resolving into this turn's `entropy_use` (the
accounting law already holds the pool honest). The action court counts
`npc_actions` actors per turn — duplicate living actor refused by name;
seated against the standing combatants iff `context.combatants` is an array
(the client and server thread combat state into the judging context exactly
as party_state threads). Client `applyCombat`: op start folds the device
draws (rolled through the visible dice path) with the entropy draws into the
one order, seals it in the envelope, and never calls unseeded
`rollInitiative` again; round_delta and op end stand untouched.

**The gate.** The `roundLaw` keyless gate: the initiative shape matrix,
species-group draw accounting (an unaccounted draw refused, a d6 offered for
an initiative d20 refused), the tie law deterministic under fixed pools, the
action court's second-action refusal BY NAME, yield lawful, and the
unshuffled order under death and flight.

## LAW IV — THE MOCK BATTLE

**The law.** The mock walk stages one deterministic miniature battle at a
fixed point of its run: the species sealed (creature_add), two instances
spawned with sealed initiative and accounted draws, one full round fought —
the enemy group's one action, the hero's attack through the pending-roll
door — one instance downed to zero (its seat kept), the survivor fled
(enemy_remove, seat kept), and combat closed. Keyless proofs and the seeded
tables exercise every door of Laws I-III with zero keys; the mock tier is
sovereign.

**Enforcement.** `mockDm.js` grows the battle rows at fixed turn indices
chosen not to break a standing fixed point (the travel turn, the bond turn,
and the watch turns stand exactly where they stand). The bench (`run.mjs`
personas × 18) validates every battle turn through the same door as every
other turn.

**The gate.** Stage one's two gates ride the bench walk — the battle turns
pass the full court, and the pin proves nothing was skipped.

**Stage one pin: 102 → 104** — `bestiary` and `roundLaw`, one PASS line
each, the G13 pin moved in the same commit.

---

## STAGE TWO

## LAW V — THE TABLE'S-DICE LAW

**The law.** Every number on the player's side of the screen is rolled by
the player's own device through the standing pending-roll door — the hero's
checks, saves, attacks, and damage as always, and now every SHEETED
COMPANION's too: a `roll_request` whose `actor_id` names a sheeted companion
is lawful, its owner's name rides the roll surface (the player sees WHOSE
die is falling), and its resolution folds the companion's own sheet
modifiers. Enemy randomness stays in the entropy pool, accounted. The model
never invents a rolled number for the table's side: a `state_updates` or
`npc_actions` narration that asserts a player-side die result without a
resolved roll is outlaw prose — the system prompt says so in its own law,
and the courts hold the mechanical door (state_updates null while a roll is
unresolved, as always).

**Enforcement.** `roll_request.actor_id` law grows: 'hero' or a sheeted
companion's name (court seated iff `context.sheets` is an array; refused by
name otherwise when seated; bare context keeps shape law). `heroRoll` gains
a sheet-bearing sibling (same fold, the companion's abilities and
proficiency) — one roll engine, two lawful actors. The client roll surface
carries the owner's name and sigil. The tool schema states the actor law in
lockstep.

**The gate.** The `tableDice` keyless gate: companion roll lawful when
sheeted and refused by name when not, the owner label carried through the
resolution round-trip, modifiers folded from the companion sheet, enemy
draws still pool-accounted, and the no-invented-numbers prompt law pinned
byte-stable in `systemPrompt`.

## LAW VI — THE COMPANION-SHEET LAW

**The law.** One additive story operation grants a party member a sheet:
`story.sheet_grant { name, role, level }` — name a standing party member
(court seated iff context carries the party), role from THE ROLE TABLE,
level an integer 1-5, one grant per turn, an object never an array, a
duplicate sheet refused by name. The role fixes the ability spread through a
deterministic table in code, cited by the gate; hit points are arithmetic —
`hp = bandHp(role) + (level − 1) × perLevel(role)` — from the same table:

| role | spread (STR DEX CON INT WIS CHA) | bandHp | perLevel |
|-----------|----------------------------------|--------|----------|
| guardian | 15 12 14 8 12 10 | 12 | 7 |
| skirmisher| 12 15 12 10 13 10 | 9 | 5 |
| mender | 10 12 13 12 15 10 | 8 | 4 |
| trickster | 10 15 12 13 10 14 | 8 | 5 |

The sheet renders in the party strip — abilities, hp, role — under the G15
copy law.

**Enforcement.** `story.js` reduces sheet_grant onto the party member's row
(`codex.party[n].sheet`), seal-once with a note on the refused duplicate;
`storyBlock` rides `sheet_state` (name, role, level, hp) to both benches;
the protocol court validates shape always and membership/duplication when
seated. The tool schema states the enums and bounds in lockstep.

**The gate.** The `doom` gate (Law VII) carries the sheet arithmetic cited
row by row; the party-strip rendering is G23's and G15's seat.

## LAW VII — THE DOOM LAW

**The law.** At zero hit points the hero — and any sheeted companion — is
DYING, not dead: the standing order keeps their seat, and the death saves
begin through the OPEN pending-roll door (`death_save`, already a sanctioned
kind): three-and-three, every save rolled on the device in the open, the
player watching each die land. Three successes: stable at zero. Three
failures: death, sealed permanently through the standing grave law — status
dead, the memorial fact written, no resurrection retcon, and this directive
says plainly under non-goals: REVIVAL IS OUT OF SCOPE. The dead keep their
memorial card. Every open thread HELD by the fallen gains a fall note in the
journal's own hand. The system prompt gains one rule: a fall is addressed in
the very turn it happens — named, weighed, never skipped past. The standing
Fate's Intervention mercy is NOT this task's to move: it stands exactly
where it stood (once, pre-doom, `deathTouched`-gated), and the doom walk
begins only when that mercy is spent or declined.

**Enforcement.** Client: zero hp routes to the dying state, the save door
opens (owner-labeled like every table die), `deathSaves` on the sheet count
three-and-three (the fields have stood on the hero sheet since the founding
— they finally speak). The third failure seals: cast_update status dead for
a companion (grave law does the rest — memorial card, the validator's
grave watch); for the hero, the epitaph stands final with no intervention
button once doom has sealed. `threads.js`/`story.js`: the fall note rides
onto held threads at the seal, reducer-side, with a note. `systemPrompt`
gains the fall rule, byte-stable.

**The gate.** The `doom` keyless gate: the dying threshold (zero is dying,
not dead), the three-and-three walk both ways under seeded dice, the
permanent seal (a fourth save refused, a resurrection retcon still
blocked), the memorial fact, the fall notes on held threads by name, the
sheet arithmetic of Law VI, and the fall rule pinned byte-stable in the
prompt.

**Stage two pin: 104 → 106** — `tableDice` and `doom`, one PASS line each,
the G13 pin moved in the same commit.

---

## SECTION 3 — THE COURTS OF THE BATTLE

**G23 — THE BATTLE.** A new e2e spec at the proving bench:

- **G23a — the tracker.** The initiative tracker renders the SEALED order and
  follows it turn to turn; a reload renders the same order (the seal, not
  the die, is the truth); the downed and the fled keep greyed seats,
  unshuffled.
- **G23b — the one-action court.** At the protocol bench inside the spec: a
  doctored second action by a living actor refused BY NAME; yield passing.
- **G23c — the table's dice.** The companion's die falls VISIBLY on-device
  under the owner's name through the pending-roll door, and the resolution
  carries the sheet's own modifiers.
- **G23d — the doom walk.** A seeded doom fixture walks the whole road:
  dying at zero → open saves, three-and-three, each landing on stage → the
  seal → the memorial card standing → the fall note on the held thread. No
  skips: the fixture is deterministic, the walk is watched.
- **G23e — the species court.** A forced-binary calibrated judge: the
  painted instance plate against the sealed species card's visual — same
  species, recognizably; staging is lawful variance (the constancy lesson of
  amendment IX.9 applied from birth). The question lives in
  `tests/e2e/fixtures/battle-questions.json`, a NEW sealed fixture under its
  own protocol tag and sha pin — frame-questions.json is not touched.
- **TOOTH 16 — the species tooth.** The instance plate judged against a
  CROSSED species card (a species the battle never sealed) must be refused —
  a deterministic lie, never an identity crossing, calibrated to perfect
  separation BEFORE the court sits, ledgered inside the ceiling.
- **G15 grows its sweep** over the tracker, the companion sheets, and the
  memorial surfaces — no leaked values, no clipped headings, no prompt
  language on stage.
- G23a-e and tooth 16 join the verdict's REQUIRED_EXECUTED by name. Zero
  skips stands.

## GATES, PIN, AND THE RITUAL

- Keyless gates grow by exactly FOUR across two stages: `bestiary`,
  `roundLaw` (stage one, 102 → 104), `tableDice`, `doom` (stage two,
  104 → 106). Each pin moves in the same commit as its gates.
- The mock tier is sovereign: the deterministic battle deals every law's
  lawful shape keylessly; the door proves it with zero keys.
- Protocol is additive only: every standing key, court, and reducer holds;
  the tool schema moves in lockstep with every validator change, never
  loosened.
- Ceiling: **TEN iterations across both stages**, calibration sittings
  ledgered inside them. The ritual closes per the preamble: keyless green at
  106, three consecutive loop greens, the architect on the full diff, the
  closing commit, one report.

## NON-GOALS

- **Revival.** Death sealed by the doom law is permanent. No resurrection
  mechanics, no revival items, no take-backs. The standing Fate's
  Intervention mercy stands untouched where it has always stood.
- Tactical grids, movement rules, opportunity attacks, and enemy sheets
  beyond the threat table: out of scope.
- `enemy_add` retirement: the unsealed road stays lawful for old sittings;
  only the taught road changes.

---

## AMENDMENTS (same commit, per the deviation law)

1. **The proving hook grows battle stagecraft (Section 3 build-out).** The
   seed now folds `dm.combat` through the moved `src/lib/combat.js`
   primitive (one fold, two callers — the same bytes the live table folds),
   honors a scripted `wound` (companion hp clamped to the sheet's own
   bounds, refused loudly when the named soul bears no sheet), and seats a
   fixture `pendingRoll` shaped like the door's own ask. Reason: G23c and
   G23d demand a companion dying at zero and a standing companion ask, and
   the op family holds no companion-damage or ask-seeding fold — so the
   wound and the ask are hand-carried stagecraft, exactly as the hero's
   bearing and mark already are. Fixtures without combat, wound, or ask
   seal the exact bytes they always sealed (combat null, entropy empty).
