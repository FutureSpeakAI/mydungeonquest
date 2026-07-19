# EXPERIENCE-DIRECTIVE XII — DEPTH, BREADTH, AND THE TIGHT DOOR

*Ratified before any code, per the Series Preamble. TASK 59, release
0.10.0. The numeral fills the series' one honest gap: IV through XI,
then XIII and XIV were ratified in their seasons; XII was never
written. It is written now, and it is written first.*

The player's experience this directive protects: **the tale has
weight — levels that are earned by the road, wounds that bite, gear
that sits in the hand, one honest purse; the shelf has range — nine
spines, doubled pools, three sealed tales any visitor may borrow; and
the door is tight — wonder arrives inside a pinned budget, the table
teaches itself in three quiet lines, and the house remembers you came
back.**

Every op, schema field, and prompt law in this directive lands under
the standing lockstep law: the protocol court, the tool schema, the
system prompt, and EVERY validateDmTurn call-site context move in the
same commit, or none of them move.

---

## I. THE MILESTONE LAW — the road makes you larger

1. **Levels run 1 to 5 and are derived from spine progress alone.**
   The level is a pure fold over the sealed tale's standing beat —
   never granted by the model, never bought with experience points.
   `milestoneLevel(spine, beatIndex)` is the one seat of that fold.
2. **Four thresholds, by name.** The level rises by exactly one at
   each of: the first beat of Act II; the spine's Revelation beat
   (`revealIdx`); the first beat of Act III; the final beat. The fold
   is monotone — a level never falls, whatever the beat index does —
   and clamps to 1..5.
3. **The table of numbers.** For the nine spines of Law V, the
   thresholds land at these beat indexes (0-based):

   | Spine | beats | L2 | L3 (reveal) | L4 | L5 (final) |
   |---|---|---|---|---|---|
   | classic-epic | 15 | 5 | 8 | 10 | 14 |
   | mystery | 13 | 4 | 9 | 10 | 12 |
   | heist | 12 | 4 | 8 | 9 | 11 |
   | horror-survival | 14 | 4 | 9 | 10 | 13 |
   | redemption-road | 14 | 4 | 8 | 10 | 13 |
   | siege-of-home | 13 | 4 | 7 | 9 | 12 |
   | long-voyage | 14 | 4 | 9 | 10 | 13 |
   | crown-intrigue | 13 | 4 | 8 | 9 | 12 |
   | pilgrim-lie | 12 | 4 | 7 | 9 | 11 |

4. **What a rise gives, in numbers.** At each rise the hero's maximum
   and current hit points both rise by `floor(hitDie / 2) + 1 + CON
   modifier`, never less than 1. Proficiency keeps the standing
   formula `2 + floor((level − 1) / 4)` — it reaches +3 at level 5.
   Spell slots re-derive from the standing slot tables at the new
   level; current slots keep their spent count where the new maximum
   allows.
5. **Experience points remain a ledger of deeds, and move nothing.**
   `xp_gain` stays lawful at the door and folds into the kept ledger
   the Book may speak; no level ever derives from it again. The
   lantern is not the road.
6. **The party rises in lockstep.** A granted companion sheet's level
   is the hero's standing level at every fold: it enters play at that
   level whatever number rode the grant op, and re-seats at each
   milestone through THE ROLE TABLE's own arithmetic — new maximum
   from the table, damage carried absolute, and a sheet standing at
   zero stays at zero; the milestone does not lift a doom.
7. **The rise is a ritual.** The standing level overlay fires on every
   rise, at most once per landing. The model's `level_up` cinematic
   remains lawful flavor and moves no number.

## II. THE CONDITION LAW — wounds with teeth

1. **Eight conditions, one teeth table, one roll engine.** All teeth
   fold inside the table's single roll engine, for the hero and every
   sheeted companion alike:

   | Condition | Teeth at the die |
   |---|---|
   | poisoned, frightened | disadvantage on every d20 the sheet rolls (standing law) |
   | restrained | the standing DEX-save disadvantage, AND disadvantage on attack rolls (new tooth) |
   | blinded | disadvantage on attack rolls (new tooth) |
   | prone | disadvantage on attack rolls (new tooth) |
   | paralyzed, stunned, unconscious | automatic failure on STR and DEX saves (standing law) |

   An advantage riding the ask folds against disadvantage to normal,
   as it always has. Death saves stay the plain die.
2. **Companion sheets carry conditions.** The sheet gains a
   `conditions` lane, born empty; sheets sealed before this law fold
   as empty, fail-closed. The companion's die suffers exactly the
   hero's teeth table — one engine, two lawful actors.
3. **THE SHEET-CONDITION OP.** Conditions land on companions only
   through `story.sheet_condition` — `{ name, add, remove }`, at most
   2 added and 2 removed per turn, names drawn only from the eight,
   aimed only at a sheeted soul, refused whole on a tick (the
   offscreen world may not poison the party). Adding a standing
   condition or removing an absent one is refused with a note and
   moves nothing.
4. **The teeth are spoken where the die falls.** The dice overlay
   names the mode and the condition that caused it in one line; the
   briefing's `sheet_state` carries each sheet's standing conditions;
   the hero's own conditions keep riding [STATE] as ever.

## III. THE EQUIPPED LAW — gear in the hand

1. **Two slots, two kinds.** Only things of kind `weapon` or `tool`
   may be equipped; each soul holds at most ONE equipped weapon and
   ONE equipped tool.
2. **THE EQUIP OP.** A mark moves only through `story.item_equip` —
   `{ name, holder }`, one per turn, naming a thing the record already
   shows in that holder's hand. Equipping over a standing mark of the
   same kind lawfully unseats the old (the note says so); an unheld
   thing, a stranger kind, or a tick is refused whole.
3. **The mark rides the thing, and falls with it.** A transfer hands
   the thing over unequipped; a removal takes the mark to the pyre
   with the thing. The trove ledger (`trove_state`) speaks `equipped`
   only when it is true.
4. **Where it is spoken.** The Book's Things chapter seats the
   equipped slots at the head of each pack ("at the ready"); the
   briefing carries one wields-line for the hero alone — companions'
   gear stays prose.

## IV. THE ONE-COIN LAW — one purse, one truth

1. **The purse ledger is the coin.** `story.purse` movements, folded
   by the standing purse law and replayed by `purseOf`, are the ONLY
   figure any surface speaks for any soul — the hero included. The
   character sheet's ribbon, the Book, the briefing: one figure, one
   seat.
2. **The mechanical lane is a retired mark.** `state_updates.
   gold_delta` and the sheet's `gold` field remain accepted at the
   door forever — old tales must replay — but they fold into a shadow
   no surface reads, no schema advises, no prompt law names, and the
   mock never emits. Retired marks raise nothing.
3. **The two lanes never sum.** No figure anywhere is the addition of
   purse movements and gold deltas.
4. **The era door.** A tale holding ANY purse movement for the hero is
   purse-law whole: its figure is the purse fold and nothing else. A
   tale holding NONE is a legacy tale: its figure derives from the old
   lane — the opening stake of 10 and every `gold_delta` row — each
   row cited to the turn that moved it, struck turns moving nothing.
5. **The migration is derived, cited, and sealed once.** On the first
   WRITABLE landing of a legacy tale after this law, the client seats
   one journal record of type `reconciliation`: a purse movement for
   the hero of exactly the legacy figure, its reason naming the
   derivation, its payload citing the source turns. From that record
   on, the tale is purse-law whole. Read-only and restored tales are
   never written: their figure derives at read time, cited the same
   way, appending nothing.
6. **New tales open by the purse.** Coin enters a new tale only
   through purse movements (the genesis stake among them). The
   sheet's old 10-gold seed remains as shadow so legacy folds agree,
   and is spoken nowhere.

## V. THE BREADTH LAW — nine spines, doubled pools, three tales

1. **Nine spines, a closed set.** The four standing spines are joined
   by five new, each with three acts, a Revelation beat inside Act II,
   role deadlines, and a villain of a DISTINCT shape:

   | id | label | villain's shape |
   |---|---|---|
   | redemption-road | Redemption Road | the Fallen Mentor — a teacher the hero once trusted, corrupting what they taught |
   | siege-of-home | The Siege of Home | the Patient Warlord — wins by waiting, offers terms like a knife offers rest |
   | long-voyage | The Long Voyage | the Salt Sovereign — a sea with a will and a court; weather as intention |
   | crown-intrigue | Crown Intrigue | the Smiling Usurper — legitimacy stolen by paper, kindness, and witnesses |
   | pilgrim-lie | The Pilgrim's Lie | the False Prophet — belief farmed as a crop, hope collected as rent |

   Beat counts and threshold indexes are pinned in Law I.3. The spine
   fallback law stands: an unknown id still answers with the first
   spine, never nothing.
2. **The pools double, in numbers.** The forge pools are pinned at:
   TITLES 24, COVENANTS 20, TONES 16, REGION_NAMES 20, MARKS 20,
   FIRST_NAMES 32, LAST_NAMES 32, SIGILS 16; the Oracle's world pools
   (places, wounds, hopes) 10 each; the Oracle's hero pools (paths,
   virtues, keepsakes) 10 each, every path mapped to a calling.
   ANCESTRIES stays a kind set of 8 — it is rules surface, not prose.
3. **The PG lexicon law.** Every pool entry, old and new, clears the
   standing poison lexicon and the covenant's rating. The breadth gate
   sweeps every pool it counts.
4. **THREE REFERENCE TALES, played to seal.** Three whole tales are
   played on the sovereign mock tier — hero dealt through the Two
   Hands door's own mock smith, every turn through the one validating
   door, every record chain-sealed — one each on redemption-road,
   long-voyage, and crown-intrigue. Each tale must exercise, on the
   record: a possession moving hands; a travel that leaves a companion
   behind (a join, then a leave with `remains_at`); a battle carrying
   a sheeted companion's die and a fall addressed in its turn; a
   thread sworn and answered; an equipped thing; and purse movements
   in both directions. The tales ship twice from one export: as
   fixtures under the courts, and on the title screen's DEMO SHELF,
   where they open read-only through the standing import door —
   chain-verified before they open, refused whole if a byte moved.

## VI. THE TIGHT DOOR — wonder, teaching, return

1. **TIME-TO-WONDER is a budget, and the budget is a number.** The
   clock runs from the tap that commits a new tale to the first
   narrated sentence standing visible at the table. It is measured on
   LIVE keys, at the pinning ceremony: 10 fresh runs, the median
   taken, the budget set at `ceil(median × 1.5)` whole seconds.
   *Pinning ceremony: SAT July 19, 2026, on the live anthropic door —
   ten fresh runs, seconds [89.85, 99.72, 46.44, 86.79, 98.46, 44.19,
   81.81, 100.17, 85.33, 108.31]; MEDIAN 88.32; BUDGET ceil(88.32 ×
   1.5) = 133 whole seconds. G25 judges against 133.*
2. **The clock stops at a sentence, never a plate.** The genesis
   first-word law stands: the pour is dispatched before any paint is
   asked for, and no plate, chip, or ornament may gate the first
   sentence's landing.
3. **THREE TEACHING BEATS, listless, once each.** Exactly three quiet
   lines teach the table, each at most 90 characters, each shown at
   most once per campaign, held as presentation state only — never
   sealed, synced, or exported:
   - the first roll of a campaign carries one line beneath the die
     naming what the numbers mean;
   - the first sworn thread fires one line pointing at the Book's
     Debts chapter;
   - the X-card control stands visible from the first table screen,
     and its single caption shows once — shown, never lectured: no
     modal, no tour, no second sentence.
4. **THE RETURN LAW.** A played, writable tale greets a NEW sitting
   with exactly one recap, and that sitting's later landings with
   none. Read-only tales, completed tales, and unplayed tales are
   never recapped. The standing sitting law (sessionStorage, the
   tab's lifetime) is the one clock of "new."

## VII. THE GATES — five keyless, two live

1. **Five keyless gates exactly, by name:** `evals/milestone.test.mjs`
   (Law I: the table of numbers across all nine spines, the HP and
   proficiency arithmetic, the monotone fold, the party lockstep, the
   doom hold), `evals/conditionTeeth.test.mjs` (Law II: the teeth
   table at the one engine for both actors, the sheet-condition court
   and reducer, tick refusal, the spoken mode), `evals/breadth.test.
   mjs` (Law V: nine spines whole and threshold-true, pool counts,
   lexicon sweep, the three tales verified and law-exercising),
   `evals/oneCoin.test.mjs` (Law IV: the era door, the derived cited
   migration, the never-sum, struck turns, the retired mark), and
   `evals/boundary.test.mjs` (the Book and the Traveler's Chart fail
   CLOSED against malformed campaign and log shapes — malformed rows
   prove nothing, panels speak a cannot-be-read line, nothing
   crashes).
2. **The pin moves 119 → 124 in the same commit** the five gates join
   the chain, and G13's spawned keyless check demands the new count.
3. **Two live criteria join the loop:** G25 THE WONDER COURT — three
   fresh live runs, their median inside Law VI.1's budget; G26 THE
   RETURN COURT — two browser contexts on live keys proving
   one-recap-then-none. Their projects and their EXECUTED needles seat
   in the verdict's lists in the same commit their specs land. The
   loop's app server stays keyless as ever; the live courts raise
   their own keyed server on their own port and put it out when they
   rest.

## VIII. THE CURED SITTING — the room's retired dial

1. **Probe before cure, out of band, logged.** The room's four
   sittings still claim `temperature: 0` on model families that have
   retired the dial. The probe asks the live door once with the dial
   and once without, and the LOOP_LOG keeps both answers.
2. **The cure follows the probe's truth, and mirrors the smith.** The
   parameter drops from every sitting whose family has RETIRED the
   dial; a sitting whose family still honors it keeps it — dropping a
   living dial would quietly change that sitting's behavior. Wherever
   the dial drops, what the ledger records is honest-null, never a
   claimed dial. Judge sittings whose requests changed re-judge ONCE
   under a lawful protocol bump — cached verdicts from the old
   request shape are not carried across the bump.

---

*Ratified July 18, 2026, before the first line of 0.10.0's code.
Every number above stood at ratification except VI.1's measured
median, which only the pinning ceremony may seat.*
