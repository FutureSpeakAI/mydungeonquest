# MASTER DIRECTIVE — STAGE 5

## The Painter: Isolation, Composition, and Caption

The contamination is in the visual layer only. This directive names where, fixes it, and cleans up the three defects downstream of it: over-stuffed cues, broken captions, and a tick system that is currently the ugliest thing in the feed.

It also confronts a pattern: three bugs have now been reported closed while remaining visibly broken. Section 1 addresses that directly, because it is costing more than any single defect.

---

## 0. WHAT THE EVIDENCE PROVES

### 0.1 The bleed is in reference selection, not the cue and not the cache key

A lantern, a bell, and a comet keep appearing in paintings for a campaign none of them belong to. They were meaningful artifacts in earlier test campaigns: the lantern was a carded character's, the bell belonged to a prior region.

**The text is clean and the images are dirty.** No bell and no lantern appears in any narration or any caption in this campaign. They appear only in the paintings.

That split is the whole diagnosis. If the cue text carried the contamination, the prose built from the same context would carry it too. It does not. So the foreign material is entering after the cue is written, through the only remaining door: **the reference images attached to the paint call.**

The slot law pins five identifiable subjects and fourteen reference images per paint call, selected from carded subjects with attested reference sheets. If that selection is not filtered by campaign, foreign reference sheets ride along in the fourteen, and the painter faithfully renders what it was handed.

This also explains the surreal composite. Plate 9's caption describes two people at a hearth with a warm stone. The image contains two lanterns, a bell, a book on the ground, a fireplace, a cracked burning rock, and two nearly identical elderly faces. **The painter is not hallucinating objects. It is compositing the references it was given.** The duplicated face is two similar reference sheets both being honored.

### 0.2 G3 closed one of E3's five required changes

Stage 2 Phase E3 required five things:

1. Campaign-scoped Foundry cache keys — **landed in G3**
2. Retrieval feeding the DM prompt filtered by campaign id at the query — unaccounted for
3. **Reference selection drawing only from this campaign's carded subjects — unaccounted for, and this is the bleed**
4. Boundary assertions that throw on a foreign campaign id — unaccounted for
5. A sweep of pre-existing unscoped cache entries — unaccounted for

Item 3 is the defect. Items 2, 4, and 5 remain open regardless.

### 0.3 The comet may already be inside the record

Unlike the lantern and the bell, the comet appears in this campaign's narration, its chapter opening ("under a comet's pale watch"), and its villain's stated goal ("Widen the doors the comet has opened"). It reads as native canon.

Two possibilities:

- It was always Larkspur Crossing's, and its resemblance to an earlier campaign's comet is coincidence.
- It bled in at genesis, got written into the sealed record, and is now self-perpetuating as legitimate canon.

**If the second is true, fixing the isolation does not clean the campaigns already touched.** Contaminated output that reached the record is a migration problem, not an isolation problem, and it needs its own answer. Phase J0 determines which.

---

## 1. REPORTED CLOSED, OBSERVED BROKEN

Three items have now been reported complete and are visibly broken in the current build:

- **P4** (beat directive on the chapter card) was reported handled in Stage 1 A4 and was still rendering two stages later.
- **T6** (suggestion chips truncating at the viewport edge) was reported fixed in Stage 3. Current screenshots show "Ask who the guest might", "Dream of the crossroads", "Go", and "A" cut at the edge with no scroll affordance.
- **T7** (HUD avatar rendering a two-face reference sheet) was reported fixed in Stage 3. The avatar is still a two-face reference sheet in every current screenshot.

Add to that: safe insets on the table route are not holding. The HUD is sliced at the top in several screenshots, with "Day 1, afternoon" cut through the middle of the text and the avatar and icons clipped. The HP chip renders as "10/1" on every scrolled view.

**The common factor is that none of these can be observed by the Node suite.** `harnessHonest` established that layout tests there are CSS source checks. A CSS source check confirms a stylesheet contains a rule. It cannot see the rule being overridden, applied to the wrong node, or defeated by a parent's overflow.

So a visual fix gets written, the CSS check passes, the item is marked closed, and nothing has been observed. This has happened three times. **Phase J7 stops it**, and Rule 30 below makes it structural.

The Playwright suite (Stage 4 Phase H4) has now been deferred twice. It is the precondition for trusting any visual fix report, and it moves to the front of this stage.

---

## 2. BUG REGISTER

### P17 — Foreign reference sheets enter the paint call (blocker)

Reference selection is not filtered by campaign. Foreign carded subjects and their attested sheets ride along in the fourteen references, and the painter renders them. Produces the lantern, the bell, the duplicated faces, and the collage composition.

### P18 — Cues carry accumulated facts rather than one staged moment

Plate 6's caption describes setting a spoon down at the end of a meal. The image shows a night scene with a comet, a signpost, a hanging bell, a lantern, a cooking pot, a fireplace, and a figure climbing a ladder.

Even with P17 fixed, a cue that carries the beat, the region, the standing facts, and every present subject will produce a catalogue rather than a scene. A plate should depict one moment.

### P19 — Two caption generators are live

Plate 5 renders the old template: "The staged moment: Tina and Maren Voss beneath an unnamed sky, as this page tells it." Plates 6, 8, 9, and 11 render a different form. Stage 2 Phase E7's caption work added a path without removing its predecessor.

### P20 — The new caption is sliced narration

"Tina lets the stone's warmth settle back into ordinary heat and turns from the hearth, cha" / "finds Maren at the hearth, coaxi" / "feels the day's whole weight land at".

Three defects in one: it is the narration's opening sentence rather than a description of the image, it is cut at a character limit rather than a clause boundary, and it is cut mid-word with no ellipsis.

### P21 — The tick system is producing broken text at volume

Six consecutive "TIME PASSES." blocks appear in one feed, all for the same character, with near-identical wording.

Four distinct defects:

- **Grammar.** The template is `Meanwhile, {name} {stride} toward {goal}.` but goals are stored as imperative phrases. "toward Keep Aster safe and close" and "toward Keep the Hollow Kettle standing" are ungrammatical.
- **Truncation.** The goal excerpt is cut by character count, producing "and keep.", "and her.", and "Widen the doors the comet has opened,." with doubled punctuation.
- **Budget and rotation.** Tick law is up to four goal-bearing, non-villain, active souls, deterministically sorted. One character received six consecutive ticks while another received none.
- **Missing time unit.** The header reads a bare "TIME PASSES." six times, where other turns correctly read "AN HOUR PASSES" and "7 HOURS PASS". Suggests ticks firing without a valid `time_advance`.

### P22 — The villain is being ticked, and the tick spoils the villain

"The Pale Herald" advancing "Widen the doors the comet has opened" appears repeatedly in the feed. Tick law excludes villains.

Worse, the Book's evil design panel says the page "refuses to hold the whole shape, revelation must be earned," while the narrative column prints the villain's objective verbatim. Two surfaces giving opposite answers about what the player is allowed to know.

### P23 — Plate framing crops the subject out

The same Plate 6 renders two ways in two screenshots: once as a letterbox strip showing a bowl and a headless torso, once as a full composition with two figures. Plates 5, 6, and 8 render as strips; 9 and 11 render tall. A fixed-height band is cropping tall plates and cutting faces off.

### P24 — Possible hero anchor drift

In Plate 9, both figures are elderly women with nearly identical faces. If Tina is the hero, her anchor is not holding. May resolve with P17, since duplicate reference sheets would produce exactly this. Verify after P17 lands rather than fixing blind.

### T6, T7, and safe insets — reopened

See section 1. All three are reported closed and observably broken.

### Layout oddity — an unexplained empty band

Several screenshots show roughly a third of the viewport empty between the plate caption and the tick block. If narration belongs there, something is rendering empty. If it is spacing, it is far too much.

---

## 3. NEW RULES

### Rule 28 — A cue depicts one moment

A paint cue describes a single staged moment: who is present, where, what is happening right now. It does not carry the beat's design, the region's standing facts, accumulated world state, or every carded subject in scope. A cue that lists is a cue that produces a catalogue.

### Rule 29 — A caption describes the image

A caption states what the picture shows. It is not a slice of the narration the player just read, it is not cut mid-word, and it never describes something absent from its own image. If the caption and the image disagree, the cue is wrong and the caption is the symptom.

### Rule 30 — Closed means observed

A defect in rendered output — layout, image content, playback, or anything a player sees — cannot be marked closed on the strength of a source-level check. Closing it requires an observation of the rendered result: a browser-suite assertion, or a recorded device observation with what was seen written down.

This rule exists because three defects have been reported closed while remaining visibly broken, each time on the strength of a check that could not see the property it certified.

---

# STAGE J

## Phase J0 — Diagnose before fixing

No code. Three reports.

### Report 1, reference selection

Open the subject selection that feeds the paint call. Answer:

1. What store does it query for candidate subjects?
2. Is that query filtered by campaign id, and if so, at the query or after?
3. For the contaminated campaign, dump the actual list of fourteen references attached to Plate 9's paint call, with the campaign id of each.
4. Do foreign reference sheets appear in that list? Name them.

This confirms or refutes 0.1 in one dump. Do it first.

### Report 2, the comet's provenance

Search the sealed record of the affected campaign for the earliest entry mentioning a comet. Determine whether it arrived at genesis from the world premise the player wrote, or appeared later without a player-side source.

Then check whether any earlier campaign's comet could have reached this one's genesis context.

**State plainly whether contaminated content has entered the sealed record.** If it has, Phase J8 is required and the answer changes from isolation to migration.

### Report 3, E3 reconciliation

For each of E3's five required changes, state landed or not landed, with the enforcing code named. Items 2, 4, and 5 are unaccounted for and need a status.

**Done when:** all three reports are written down, the bleed is confirmed to a specific selection path, and the record contamination question has a yes or no answer.

---

## Phase J1 — Scope reference selection (P17, E3 item 3)

Filter candidate subjects by campaign id **at the query**, not after retrieval. Post-filtering leaves the cross-campaign read possible and depends on the filter being right.

Then close E3's remaining items while you are in here:

- **Item 2:** every retrieval feeding the DM prompt filters by campaign id at the query.
- **Item 4:** boundary assertions at the edge of the paint call and the DM call. Every input carries a campaign id; every id equals the active campaign; a mismatch throws.
- **Item 5:** sweep or evict pre-existing unscoped entries so they cannot be served.

Per Rule 27 from Stage 4, every one of those refusals emits a structured record naming what was refused and why. A boundary assertion that throws into silence is what made P13 cost two stages.

### Anti-patterns

- Do not filter foreign sheets out after selection. Make the read impossible.
- Do not fix this by clearing the reference store.
- Do not assume the cache-key scoping from G3 covers this. It does not; that is why this bug survived it.

**Test `referenceScope`:** two fixture campaigns with overlapping subject names run in sequence in one store; assert every reference attached to any paint call in campaign B belongs to campaign B; assert the boundary assertion throws on an injected foreign id; assert the refusal emits a structured record.

---

## Phase J2 — One moment per cue (P18, Rule 28)

Audit what the cue actually contains today. Print a real cue in full and read it.

Rewrite cue composition so it carries only: who is present in this moment, where they are, what is physically happening, and the light. Not the beat's design, not the region's standing description, not accumulated facts, not every carded subject in scope.

The items rule already states the constraint and is not being honored: an item appears only if its holder is in the cue, it is a fixture of the ground, or this turn's operations moved it. A bell hanging indoors at a hearthside conversation satisfies none of those.

**Test `cueMoment`:** a fixture cue for a two-person hearthside scene names at most those two subjects and the room; assert no beat directive, region description, or accumulated fact appears in the cue text; assert every item named passes the three-part items rule.

---

## Phase J3 — Captions (P19, P20, Rule 29)

**Delete the old generator.** Grep for "the staged moment" and "as this page tells it" and remove that path entirely. Two live generators is the bug; one of them has to go, not be conditionally bypassed.

**Write a real caption.** It describes what the image shows, generated from the cue's own content: who is present, where, what is happening. It is not a substring of the narration.

**Never cut mid-word.** If a length limit is needed, cut on a clause boundary and ellipsize. Better: generate to a length rather than generating long and slicing.

**Test `captionSingleSource`:** exactly one caption generator exists in the tree; the retired template's phrases appear nowhere.
**Test `captionShape`:** across twenty fixture plates, no caption ends mid-word, none is a substring of its turn's narration, and no two share a phrase over five words.

---

## Phase J4 — The tick system (P21, P22)

### Grammar

Goals are stored as imperative phrases ("Keep Aster safe and close"). The template says "toward {goal}". Fix one of the two:

- Preferred: change the template to accept an imperative — "working to keep Aster safe and close" — with the goal's first word lowercased and the verb form handled.
- Alternative: store a noun-phrase form of each goal at `cast_add` time alongside the imperative, and use that in ticks.

Do not do both, and do not leave the choice implicit.

### Truncation

Stop cutting the goal by character count. Cut on a clause boundary or use the whole goal. Strip trailing punctuation before appending the sentence's own period so "opened,." cannot occur.

### Budget and rotation

Enforce the tick law: up to four goal-bearing, non-villain, active souls, deterministically sorted, rotating so one character cannot take six consecutive ticks while another takes none. Verify the sort and the rotation are actually applied rather than declared.

### The time unit

A bare "TIME PASSES." with no unit indicates ticks firing without a valid `time_advance`. Ticks fire on `time_advance` or an act change. Find why these fired and either supply the unit or stop the tick.

### The villain (P22)

Exclude villains from tick targets, per the standing law. Then check the reveals ledger: a villain's goal must not print anywhere the player can read it until the record reveals it. The Book already gates this correctly; the narrative column does not.

**Test `tickGrammar`:** across fifty fixture ticks, every sentence is grammatical, no goal excerpt is cut mid-clause, and no doubled punctuation appears.
**Test `tickBudget`:** no soul receives two consecutive ticks while another eligible soul has zero; at most four fire per advance; the selection is deterministic in (codex, turn).
**Test `tickNoVillain`:** no villain appears as a tick target; no unrevealed goal renders in any player surface.

---

## Phase J5 — Plate framing (P23)

One ratio, one crop, applied consistently. Plates are vertical and letterboxed by law; the current band crops tall plates and cuts faces off.

Either render the plate at its natural ratio inside a container that adapts, or crop with a focal point that keeps subjects in frame. Do not fix this by shrinking the container, which produces the strip.

Verify in the browser suite, not in CSS source. See Rule 30.

**Test `plateFrame`:** in the browser suite, every plate renders at its declared ratio; no plate renders at a height inconsistent with its neighbors; a tall fixture plate is not cropped through its subject's face.

---

## Phase J6 — Verify the hero anchor (P24)

After J1 lands, regenerate a plate for a scene containing the hero and a similar-looking character.

If the faces are still confused, the anchor is not conditioning correctly and this is an Anchor Law defect. If they are distinct, P24 was a symptom of P17 and closes with it.

Do not fix before J1. The most likely cause is duplicate foreign reference sheets, which J1 removes.

**Test `anchorHolds`:** the hero's rendered face across five consecutive plates matches the blessed anchor by the existing vision check, in a scene containing a character of similar age and presentation.

---

## Phase J7 — The browser suite, and everything it unblocks (Rule 30)

This is Stage 4 Phase H4, deferred twice. It moves here because section 1's pattern cannot be broken without it.

### Step 1, stand it up

Playwright as a second suite, separate from the keyless Node suite. Node stays the keyless floor and is not modified. The browser suite is additive.

### Step 2, verify the reopened items

Real geometry assertions at 360, 390, and 430 widths for:

- **T6** — the chip row versus the viewport edge and versus narration
- **T7** — the HUD avatar resolves to a single-face asset at 1:1
- **Safe insets on the table route** — the HUD is not sliced, "Day 1, afternoon" renders whole
- **The HP chip** — renders complete, not "10/1"
- **The empty band** — identify what occupies that space and whether it is rendering empty

Report each as confirmed or still broken, item by item. **A report that everything was already fixed should be treated as suspect**, because CSS source checks and rendered geometry disagree often, and three of these were already reported fixed once.

### Step 3, split the ledger

`BUILD_STATUS` gains a column naming which suite holds each gate. A reader must be able to tell which gates can observe what they claim.

**Test `harnessSplit`:** every geometry, playback, and storage assertion lives in the browser suite; the Node suite still passes keyless; every gate names a suite.

---

## Phase J8 — Clean the record, if J0 found contamination in it

**Conditional on Report 2.** Skip if the comet is native.

If contaminated content entered the sealed record, isolation does not undo it. Determine scope: which campaigns, which entries, which fields.

The record is append-only and signed, so this is not a rewrite. Options, in order of preference:

1. If contamination is confined to derived surfaces, rebuild them from a filtered replay.
2. If it is in the record but not load-bearing, mark the affected entries and exclude them from context assembly going forward, recorded as a journal event.
3. If it is load-bearing canon, the campaign is what it is. Say so honestly and leave it, rather than pretending the record can be edited.

**Test `recordUncontaminated`:** a fresh fixture campaign's record contains no subject, item, or proper noun that did not originate in its own genesis or its own turns.

---

## 4. CARRIED FORWARD, STILL OPEN

These are from Stage 4 and remain unaddressed. They are not superseded.

- **H0** — the P11 crash diagnosis. Never produced. Cheap, and it still decides whether quota or migrations are urgent.
- **H3** — the `recordHash || logId` fallback in the scene plate key. If a plate is minted pre-seal and looked up post-seal, mint and lookup produce different keys, which is P13 re-entering through the fallback branch.
- **H6** — real migrations behind the `onOpen` guard. A guard is not a migration; old campaigns still fail, just more quietly.
- **H1** — whether narration audio survives past the first segment. A one-minute device check that has not been reported on.

---

## 5. CONSTRAINTS

- Code and documentation move in the same commit. `CHANGELOG.md` and `LOOP_LOG.md` move with any pin, version, or law-byte change.
- Push at the close of every phase.
- Do not modify `src/lib/seal.js`, `src/lib/rules.js`, `src/lib/chronicler.js`, the Audio Director interlock, or Anchor Law logic.
- J1 tightens isolation. Do not relax any existing check to make it pass.
- J8 does not rewrite the record. Append-only stands.
- No test weakened, skipped, or deleted. The Node suite stays keyless.
- One phase per checkpoint.

## 6. ORDER OF WORK

**J0, J1, J7, J2, J3, J4, J5, J6, J8.**

J0 first: three reports, no code, and Report 2 decides whether J8 exists.

J1 second: it is the blocker, and J6 depends on it.

**J7 third, out of numeric order.** The browser suite has been deferred twice, and section 1's pattern will repeat on every visual fix in this stage until it lands. Everything after J7 gets verified rather than assumed.

J2 through J5 are the composition and text defects, cheapest last: J4's tick fixes are small and clean up the most visible ugliness in the feed, so pull them earlier if the demo pressure is real.

## 7. VERIFICATION

Per Rule 30, no item in this directive is marked closed on a source-level check alone. Every visual item is closed by a browser-suite assertion or a recorded device observation with what was seen written down.

J7 Step 2's report is written item by item. If it reports all three reopened items already passing, re-examine the assertions before believing it.
