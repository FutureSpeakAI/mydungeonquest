# EXPERIENCE-DIRECTIVE XIII — THE TWO HANDS (0.9.1, Task 58B)

The forge asks engine nouns and the dice draw from fixed pools. This directive
rebuilds onboarding around two laws, states the plain-speech field map whole,
and seats the worldsmith's court. Every law names its enforcement point and its
gate. Deviation requires amending this file in the same commit with one line of
reason.

## LAW I — THE CONSEQUENCE LAW

The game never asks a question whose answer the player cannot see it use, and
every answer visibly lands on the next surface. A field with no surface is not
asked on the plain path — it is demoted behind the deep door or removed, and
§4 lists each with its reason.

- **Enforcement**: the field map (`fatescript/smith` → `FIELD_MAP`) is the ONE
  seat of every asked field: its plain-speech label, its door, its hands, and
  the named surface where its consequence shows. Both forge doors render from
  the map; no component carries private copy for a mapped field.
- **Gate**: `evals/questions.test.mjs` — the map's copy is byte-pinned, every
  asked field names a nonempty consequence surface, demoted fields never sit
  on the fast path, and the rendered doors present the mapped fields in the
  mapped order.

## LAW II — THE TWO HANDS LAW

Every field owns a die and a pen, both first class. The dice can spin a whole
coherent world or hero in one tap; the pen can write every word. Written text
is sovereign: **a field the player's pen has touched is never altered by any
spin** — not a whole-scope spin, not a neighbor's respin. Completion fills only
what is empty or dice-written. One consent stands: tapping a sovereign field's
OWN die is the player's hand lifting its own ink, and redraws that field alone.

- **Enforcement**: forge state carries a sovereign set; the pen's onChange
  marks a field sovereign; `mockSmith` and the live smith receive the locked
  set and are FORBIDDEN to emit locked keys (the validator refuses candidates
  that touch them).
- **Gate**: `evals/twoHands.test.mjs` — every mapped field's die and pen both
  function in the component contract; a typed value survives whole spins and
  neighbor respins byte-identical; the pool floor is deterministic by seed.

## §3 THE PLAIN-SPEECH FIELD MAP

Copy below is law, byte-pinned by the questions gate. "Surface" is where the
answer visibly lands next.

### The world door (fast path, in order)

| # | Field | Plain question | Hands | Surface (consequence) |
|---|-------|----------------|-------|------------------------|
| 1 | spark | The three sparks — three ready worlds; a tap adopts one whole | tap (a dealt die) | the world card fills at once; the same words open Chapter One |
| 2 | covenant | **Tell the game your world** — fine print: *One sentence is enough — this is the promise of this world, and Chapter One opens inside it.* | die + pen | the world card; the shape line re-reads it live; the first pour and the key art obey it |
| 3 | tone | **How it feels** | die + pen | the card's italic feel line; the teller keeps this weather from the first sentence |
| — | shape (derived) | **The shape of the promise** — read, never asked, from the promise's own words | none (deep door may overrule) | the card's shape line; the chapters walk that spine |
| — | X-card | **The X-card rides every table.** Presented as a card on the fast path, shown once (a device-local flag), never a form. Copy: *Tap the X-card at any table and the scene turns away, no questions asked. Lines and veils live behind the Deep Forge door.* | none | the in-game X-card button it describes |

**The spine-from-promise rule (deterministic, pure, gated)**:
`spineFromPromise(covenant)` reads the promise's stated shape — words of
secrets and vanishings choose **Mystery**; words of prizes, vaults, and prices
choose **Heist**; words of hunger, fog, and the dark choose **Horror
Survival**; every other promise walks the **Classic Epic**. Same sentence,
same spine, every time. The Deep Forge's spine picker, once touched, is
sovereign over the rule.

### The hero door (plain path, asked in this order)

| # | Field | Plain question | Hands | Surface (consequence) |
|---|-------|----------------|-------|------------------------|
| 1 | name | **Their name** | die + pen | the portrait speaks it below the face; the mast and the tale carry it |
| 2 | ancestry + calling | **Where they come from** · **Their calling** | die + pen each | the hero card's line; the calling seats the sheet — bearing, background, abilities, skills — and the table's dice obey it |

*The calling's pen on the plain path is a choice among the callings the sheet
can lawfully seat; the free pen for the calling — any word at all — lives
behind Forge by Hand, where the whole sheet is the player's to keep coherent.*
| 3 | presentation + words | **How they present** · **What words fit them** | choice-pen + die/pen | the audition re-deals to match on the spot; the tale speaks of them in those words |
| 4 | mark | **The mark that sets them apart** | die + pen | THE LIVE PORTRAIT — inscribed beneath the face on parchment, painted into the bust when the easel is lit |
| 5 | keepsake | **What they carry from home** | die + pen | sealed into the trove at turn zero by the standing possessions law; shown at the ceremony |
| 6 | voice | **Which voice is theirs** | die (a candidate steps forward) + choosing tap | the tale is read in it; keyless, the blessing seals silently for a keyed table |

## §4 DEMOTED AND REMOVED FIELDS (Law I audit)

Demoted fields keep their living surfaces but leave the plain path; the deep
doors (Deep Forge / Forge by Hand) hold them, each still wearing its die where
a pool exists.

- **Chronicle title** → deep. The promise names the tale on the fast path; the mast still wears the title.
- **Story spine picker** → deep (was already); the fast path now DERIVES the spine from the promise, visibly.
- **Home region** → deep. The spark answers it; the card still shows the home line.
- **Lines & veils** → deep (was already). Safety on the fast path is the X-card, presented, never a form.
- **The world's look** → deep (was already). A painter's instruction, not a first question; the easel still obeys it.
- **Sigil** → deep. Its only surface is the glyph on a face not yet painted; the plain path derives it.
- **Bearing & background** → deep. The calling writes both lawfully; the pen may still own them behind the door.
- **Casting, hit die, abilities, skills** → deep (was already). Table mechanics; the calling seats them.
- **REMOVED: the three seed-world buttons** under the deep covenant field — the sparks already deal ready worlds; a second, poolless seed row had no surface of its own.

## §5 THE WORLDSMITH'S COURT (Law: the smith)

One door: `POST /api/smith` `{ scope: 'world' | 'hero' | 'field', field?,
locked: {}, seed }`.

1. **On live keys** (illuminated tier): the dice call the smith — ONE
   temperature-bounded model call (`SMITH_TEMPERATURE = 0.9`, pinned) whose
   tool schema mirrors the validator exactly, returning a strict-schema set of
   **three candidates** for the requested scope. Every candidate passes the PG
   lexicon sweep and the poison sweep BEFORE it is shown; a failing candidate
   is discarded and redrawn (at most two redraws), never repaired by hand. If
   the set still stands empty, the mock smith answers — the forge degrades,
   never errors, per the watchtower's standing law.
2. **The conditioning contract**: a whole-scope spin locks exactly the
   sovereign fields; a single-field respin locks the ENTIRE standing remainder
   (every other field's current value). A candidate may not contain a locked
   key — the validator (`validateCandidateSet`) refuses it, and refusal counts
   as a failed candidate. Coherence is law: a spun set agrees with itself on
   its stated fields — the calling's bearing, background, abilities, and
   skills move together; a spun world's shape agrees with its promise.
   **The rider clause**: the calling is one body — a respin of `className`
   carries its coherence riders (caster, hit die, skills, abilities, bearing,
   background), each rider dropped silently where the player's ink is
   sovereign; no other field carries riders. The derived shape (`spineId`)
   is never a candidate key — it is read from the promise at every use.
3. **The keyless floor**: the pools remain, as the mock smith
   (`fatescript/smith` → `mockSmith`) — same contract, same validator,
   deterministic in `(seed, scope, field, locked)`. Every gate runs keyless;
   the free tier still spins whole worlds.
4. **Sovereign text** (Law II restated for the court): no smith, live or mock,
   writes a locked field. Completion fills only what is empty.

- **Gate**: `evals/smith.test.mjs` — the schema court refuses malformed sets,
  oversets, undersets, and locked-key touches; a poisoned candidate walks the
  rejection path; the mock smith honors the conditioning contract and its
  spun sets prove coherence on their stated fields.

## §6 GATES AND CRITERIA (Section 3 of the task)

- Keyless gates grow by exactly three — `questions`, `twoHands`, `smith` —
  and the pin rises **113 → 116** in `g13-check.spec.ts` in the same commit.
- **G27 THE FORGE** (new court, `tests/e2e/g27-forge.spec.ts`): on the mock
  tier a whole world spins in one tap and a whole hero in one tap; each
  field respins alone without disturbing its locked neighbors; a typed
  covenant survives every subsequent spin byte-identical; the fast path still
  reaches Chapter One in three choices under the G2 clock; and on live keys
  one smith call round-trips with a lawful candidate set logged as evidence
  (`test-results/smith-evidence.json`). Missing keys at that criterion are a
  hard stop, never a skip.
- **G15** covers every new label; **G2/G3** keep their strength with labels
  updated to this directive's copy (a sanctioned test edit, logged).
- The vision courts replay lawfully; the forge paints nothing new — its
  previews remain ephemeral and unharvested.

## §7 CONTINUITY

The protocol is additive: no story operation, reducer, or validator behavior
changes; `initCodex` still seals the keepsake at turn zero; older campaigns
load untouched. The forge drafts, the sitting, the audition, and the proving
hook keep their stations. `package.json` stays 0.6.3.
