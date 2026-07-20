# EXPERIENCE DIRECTIVE XVIII — THE ARMORY AND THE ART

*(Task 63. Written first, before any bytes, per the series preamble. The
governing rule of this directive: **MECHANICS FROM TABLES, FLAVOR FROM THE
TALE.** Every number a fight or a spell turns on comes from a fixed table
the client owns; every word of color comes from the storyteller. The model
references tables by key and narrates freely around them; it never invents
a die, a bonus, a slot, or an armor class. SRD 5.1 material only, under
CC-BY-4.0 — attribution already stands in NOTICE.md; no Product Identity
term may appear in any table, name, or clause.)*

The standing laws all hold: the client computes all mechanics (first
non-negotiable law); ops are additive, never breaking; systemPrompt, tool
schema, and every validateDmTurn call-site move in exact lockstep; one
seat for any law two sides read (tables live in `fatescript`, the engine's
home, and both client and server import that one seat); the journal is
append-only; witnesses are born fail-closed.

## Article I — THE ARMORY LAW

**The weapon table.** ~12 SRD rows, fixed data: name, damage die, damage
type, hands (one/two/versatile), reach or range band, finesse flag, thrown
flag. **The armor table.** ~6 SRD rows plus the shield: name, base AC, dex
cap (none/+2/0), kind (light/medium/heavy/shield). Both tables are data in
`fatescript` (the armory module), imported by client and server from the
one seat; no table number is ever restated in prose, prompt, or schema
description — references only.

**Armor joins the item kinds additively.** The item kind enum
(`weapon,tool,keepsake,treasure,document`) grows `armor` — in the tool
schema (server/dm.js item_add), the protocol validator (fatescript), and
the systemPrompt's law text, all in the same commit, in exact lockstep.
`item_equip` grows the same way: an armor item (and the shield) may be
marked worn at the ready alongside the one held weapon; the validator
enforces one worn suit, one shield, one held weapon at most.

**AC becomes derived truth.** A soul's AC is never stored as opinion; it
is computed at read time from the read-back sheet: equipped armor row's
base AC + dex modifier capped by the row's dex cap + shield bonus if a
shield is equipped. The unarmored case is law: AC = 10 + dex modifier,
uncapped, shield still lawful. `hero.ac` in the briefing becomes this
derived value and nothing else. **The species table already carries AC by
threat band** (the THREAT_TABLE's ac column); the directive ratifies it as
the enemy's whole armor law — species cards surface it, and no enemy AC
exists outside the band's column.

**The attack fold.** An attack is the existing roll path wearing table
law: to-hit = the attacker's lawful d20 + proficiency + the
weapon-governed ability modifier (finesse chooses the better of STR/DEX;
ranged uses DEX), resolved against the defender's derived AC, margin
computed client-side from the read-back sheet — every modifier provable
from sheet bytes, none asserted by prose. Damage rolls on the attacker's
side's lawful dice source: hero and companions roll on the device
(roll_request), enemies draw from the accounted entropy pool
(entropy_use, by index). Nothing about the fold is new machinery — it is
the standing roll path plus table arithmetic.

**Enforcement point:** the armory module (one seat), the item/equip
enums in schema + validator + systemPrompt (lockstep), the sheet fold
(Book) and combat fold reading only table rows and sheet bytes.
**Gate:** `evals/armory.test.mjs` — tables fixed and SRD-shaped, enum
lockstep proven, derived AC exact across armored/unarmored/shield/dex-cap
cases, attack margin recomputed from sheet bytes and matching.

## Article II — THE ENCHANT LAW

A bounded enchant table (fixed rows, single-digit count) in the armory
module: each row names its key, its mechanical rider (a flat bonus or a
table-referenced die, nothing free-form), and the item kinds it may seat
on. **At most ONE enchantment per notable item.** Ops carry enchantments
by table key only — the door (validateDmTurn) refuses any op that carries
free mechanics, an unknown key, a second enchantment, or an unlawful
seat. Flavor stays free: the tale may dress the rune in any words it
likes; the numbers come from the row.

**Enforcement point:** the enchant column of the armory module; the
validator's door on item ops. **Gate:** `evals/enchant.test.mjs` — table
bounded, one-per-item enforced at the door, unknown keys refused,
mechanics provably table-sourced.

## Article III — THE REST LAW

**One additive op: `rest`.** A long rest restores HP to the leveling
table's maximum (and, once Article IV lands, restores spell slots by the
casting table); the op is refused more than once per calendar day of
world time. The tick law excludes rest: resting never advances the
wonder clock or any tick-driven court. Short rests, if the tale speaks
them, are flavor — no mechanics until a future directive says otherwise.

**Enforcement point:** the rest op in protocol + schema + systemPrompt
(lockstep); the calendar day check at the validator; the tick law's
exclusion in the engine. **Gate:** `evals/rest.test.mjs` — restoration
exact by table, the once-per-day door refuses the second rest, ticks
provably unmoved.

## Article IV — THE GRIMOIRE LAW *(Stage Two)*

**The spell library is data.** ≥40 SRD entries — cantrips and levels
1–3 — in the grimoire module beside the armory, fixed fields: name,
level, school, casting archetypes that may learn it, resolution kind
(attack / save-vs-ability / automatic), effect expressed ONLY through
existing op families (damage via the roll path, conditions via
sheet_condition, healing via the hp path — no new op family for
effects), concentration flag, and a byte-stable **visual clause** for the
painter. **Callings map to casting archetypes** in a fixed table (the
role table's casting column): full caster, half caster, or none — no
prose may promote a calling. **Slots ride the leveling tables**: the same
band + growth arithmetic that governs HP governs slot counts by level
and archetype, one seat in fatescript rules. **Learning is sealed:** fixed
counts at the forge (starting spells under Two Hands) and at level
boundaries (the milestone flow's ceremony gains the picking surface);
picks land as sealed ops the door validates against archetype, level,
and count — never free text.

**Enforcement point:** the grimoire module (one seat), the casting
column of the role table, the forge and milestone picking surfaces, the
sealed learning ops at the door. **Gate:** `evals/grimoire.test.mjs` —
library shape and floor (≥40), archetype table fixed, slot arithmetic
matching the leveling law, learning counts enforced, effects provably
within existing op families.

## Article V — THE CASTING LAW *(Stage Two)*

**One op: `cast_spell`.** The refusal matrix at the door: unknown spell;
spell not on the caster's learned list; empty slot at the spell's level
(cantrips slotless); illegal target; a second concentration while one
holds — unless the same op carries the release with a sealed note. A cast
spends exactly one slot of the spell's level. The round law counts a cast
as the action. **Enemy casts come from species cards** (sealed at
creature_add) and draw their dice from the accounted entropy pool like
every enemy hand. The briefing carries **the caster's line** — slots by
level and the held concentration — under the Cache Posture below.

**Enforcement point:** the cast op in protocol + schema + systemPrompt
(lockstep); the refusal matrix in validateDmTurn at EVERY call-site;
slot spend in the engine; the round law's action count. **Gate:**
`evals/casting.test.mjs` — each refusal row proven, single spend proven,
concentration release only with sealed note, enemy cast accounted.

## Article VI — THE PAINTED SPELL *(Stage Two)*

A cast that reaches the easel carries its spell's visual clause
byte-stable into the plate prompt — down the one road (plateroad), never
paraphrased, so the same spell paints the same signature. The calibrated
frame courts govern painted spells as they govern every plate; no new
teeth are raised for them.

**Enforcement point:** the visual clause's byte-stable ride through
plateroad's brief assembly. **Gate:** `evals/paintedSpell.test.mjs` —
clause bytes provably intact in the recorded brief, one road proven (no
second assembly path).

## Article VII — THE TABLE RULE (the governing rule, restated as law)

Mechanics from tables, flavor from the tale. The model may reference any
table row by key and clothe it in any prose; it may never state a
mechanic the tables do not. Free mechanics die at the door: any op
carrying a number the referenced row does not carry is refused whole,
under the standing repair-retry law. The proving loop's copy law sweeps
every new surface this directive raises (armory panels, grimoire pages,
slot pips, rest and casting refusals) — player-facing words, not
internals.

## THE CACHE POSTURE (governs every prompt and briefing change herein)

Stable before varying, additions in cache-stable positions, one law
across layers (the anchored-window law stands):

1. **systemPrompt additions append at the tail of the stable law text** —
   the armory, rest, grimoire, casting, and table-rule laws land as
   appended articles, never inserted mid-prompt; existing bytes do not
   reorder. One lawful cache invalidation per stage when the appendix
   lands, byte-stable thereafter.
2. **The caster's line seats LAST in the [STATE] block** — the dynamic
   tail rides the final, never-cached user message, so the line can vary
   turn-to-turn without touching the cached prefix.
3. **Stated trim order:** under token pressure the anchored history
   window trims first (its own stepwise law); dynamic-block prose trims
   next; the caster's line and the vitals it stands with trim NEVER —
   they are mechanics, not memory.
4. No change may narrow the 20-entry floor, move the breakpoints, or
   reorder stable prefix bytes; the promptCache gate stands witness.

## THE GATES, THE PIN, AND THE COURT

- **Stage One** lands `armory`, `enchant`, `rest` in the keyless chain,
  each printing its counted PASS line: the G13 pin moves **139 → 142**
  in the same commit as the gates, letter and chain together. Stage One
  is proven keyless (check exit 0 at 142) before Stage Two begins.
- **Stage Two** lands `grimoire`, `casting`, `paintedSpell`: pin
  **142 → 145**, same-commit law identical.
- **Section 3** raises court **G34 THE ARMORY AND THE ART** — the next
  number after G33, ONE court, NO new teeth — with the itemized walk:
  derived AC moves on equip; the attack fold end-to-end with the margin
  from the read-back sheet; atelier spell picking sealed; slot pips
  render, a cast spends one, a long rest restores; a companion spell
  save on the device under the owner's name; an enemy cast accounted
  from the pool; the concentration-release note in the ledger view only,
  never on the table; the signature-spell plate carrying its visual
  clause in the recorded brief. G34 joins REQUIRED_PROJECTS and its
  courts join REQUIRED_EXECUTED by name in the verdict, same commit as
  the court.
- The proving window is **63.1–63.12, ceiling twelve**, stage one proven
  keyless before stage two, the whole ritual per the preamble and THE
  WHOLE RITUAL LAW: three consecutive greens, the architect's sitting,
  the closing sentence with its RITUAL COMPLETE line — no step without
  its artifact.
