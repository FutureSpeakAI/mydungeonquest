# EXPERIENCE-DIRECTIVE IX — THE HONEST FRAME

**Task 56C · Release 0.7.3 · Ratified before any code, per the Series Preamble's directive-first law.**

Playtests convicted three frame crimes: figures painted into scenes that never
contained them, a supporting soul painted as if she were the hero, and canon
details reinvented plate to plate. The record already knows who is present,
who leads, and what a fixture looks like. This directive makes the painter and
the courts obey the record. Four laws, each with its enforcement point and its
gate. If the build must deviate, this file is amended in the same commit with
a one-line reason.

---

## LAW I — THE LIVING-AND-PRESENT LAW

**The law.** Every subject named in an `image_cue` is a living soul of the
record whose last lawful ground is the current scene, or who rides in the
party, or who is introduced by this same turn's `cast_add` (the same-breath
law, as the ground and fixture courts have always honored it). The hero is
always lawful — she is the party's permanent root and the scene stands where
she stands. The dead are not painted. The elsewhere are not painted. A name
the record cannot resolve is refused by name.

**Enforcement.** `fatescript/protocol` gains `validateImageCue`, convened from
`validateDmTurn` beside the party and fixture courts, under the seated-court
law as always: the living court seats iff the context carries a cast array;
the presence court seats iff the context carries a presence array AND a
standing scene (`'scene' in context`, null scene = genesis is free); the party
ride is honored iff the context carries a party array; a bare context gets
shape law alone. Both benches — the server court and the client landing —
already seat identical evidence (0.7.2's lockstep cure); the new court reads
the same seats. The tool schema states the law in the cue's own description,
in lockstep with the validator, never loosened.

**The gate.** The `frameLaw` keyless gate proves the validator matrix — a dead
subject, an elsewhere subject, and an unknown name each refused BY NAME, and
the lawful shapes (hero, standing soul, party rider, same-breath introduction)
each pass. G22's door specs prove the same matrix at the e2e bench.

## LAW II — THE CLOSURE LAW

**The law.** A scene plate contains exactly the figures its cue names — no
invented extras, no vanished subjects. The cue grows one optional field:
`crowd`, either `none` or `background`, absent meaning `none`. `background`
grants indistinct, unidentifiable figures only — it never grants an
identifiable face. An unknown crowd value is refused by name.

**Enforcement.** The crowd enum court sits in `validateImageCue` (shape law —
always seated). At the easel, `scenePrompt` gains THE CLOSURE CLAUSE, byte-
stable and LISTLESS (general language, no example enumerations): the figures
present in the frame are exactly the named painted subjects, and when the cue
grants `background`, the clause states the allowance's effect — indistinct
figures permitted, identifiable faces refused.

**The gate.** `frameLaw` pins the clause bytes in the builder and the crowd
matrix at the door; G22a (the closure court) counts identifiable figures on
every harvested scene plate as a forced binary under the cue's allowance, and
the judge NAMES any figure it cannot account for. TOOTH 13 — the extras tooth
— proves the court can fail: a sealed plate holding more figures than its
doctored cue claims must be refused.

## LAW III — THE PRINCIPAL LAW

**The law.** The cue's subject order is meaningful, and this directive says
so: the FIRST subject in the cue is the principal figure of the composition.
A supporting soul is never painted as if she were the hero.

**Enforcement.** At the easel, `scenePrompt` gains THE PRINCIPAL CLAUSE,
byte-stable and listless: it names the cue's first subject as the principal
presence of the composition, by the identity clause the card already provides,
whenever the roster paints that soul (the roster law of Directive VI stands
untouched; a principal the roster stages in prose earns no false claim). The
Dungeon Master's own law states the order's meaning; the schema description
states it in lockstep.

**The gate.** G22b (the principal court) sits on every harvested plate whose
cue names the hero FIRST and whose roster painted her: the two-stage magnified
look boxes the most prominent figure, then judges that crop alone against the
hero's identity clause. TOOTH 14 — the principal tooth — proves the court can
fail: a plate whose prominent figure is a supporting soul, judged against a
hero-first claim, must be refused.

## LAW IV — THE FIXTURE-CONSTANCY LAW

**The law.** A sealed fixture is painted consistently with its sealed visual
clause on every plate of its ground — sealed once, painted forever, never
reinvented plate to plate. The fixture rider of Directive VIII stands
untouched; this task adds it a court, nothing more.

**Enforcement.** No new prompt law — the rider already carries the visual
clause verbatim. The court alone enforces constancy: G22c judges the seeded
place pair (the fixture's ground painted independently in both harvest
stores) as a forced binary — the sealed fixture is present in both plates and
consistent with its sealed visual clause across them.

**The gate.** G22c, and TOOTH 15 — the fixture tooth — proves the court can
fail: the pair judged against a crossed visual clause (a fixture the ground
never sealed) must be refused.

---

## THE INSTRUMENT LAW, APPLIED

Every new judge question below is calibrated to perfect separation on a probe
set built from sealed plates and crossed prose BEFORE its court sits, per the
standing instrument clause, and its final text is pinned byte-stable:

- the closure question (count under allowance, naming the unaccounted),
- the prominence box question (stage one of the principal look),
- the principal identity question (stage two, on the crop alone),
- the fixture constancy question (the pair against the sealed clause).

The texts live in `tests/e2e/fixtures/frame-questions.json`, a NEW fixture
with its own protocol tag and its own byte-stable pin hashed in the G22 spec —
`binary-questions.json` and tooth 11's pinned instrument are not touched by
this task. Teeth 13, 14, and 15 are the standing known-bad controls; the
calibration sitting that proves separation is ledgered inside the loop's
ceiling per Section 4. A frame court that cannot fail its three teeth is
decoration.

## GATES, PIN, AND THE RITUAL

- Keyless gates grow by exactly ONE: `frameLaw` (the cue validator matrix, the
  crowd enum, the closure and principal clauses byte-stable in the builders,
  and the visualBible gate's growth proven). The `visualBible` gate GROWS in
  place as sanctioned — same single gate line, more law pinned.
- The pin rises 101 → 102, moved in the same commit as the gate that grows it.
- G22a, G22b, G22c and teeth 13, 14, 15 join the verdict's REQUIRED_EXECUTED
  by name. Zero skips stands.
- The mock tier is sovereign: the deterministic walk already deals hero-first,
  living-and-present cues; the door proves it keyless with zero keys.
- Ceiling: eight iterations, calibration sittings ledgered inside them. The
  ritual closes per the preamble: keyless green at 102, three consecutive
  loop greens, the architect on the full diff, the closing commit, one report.

---

## AMENDMENTS (same commit, per the deviation law)

1. **Law IV pair source.** The ratified text said the pair rides "both harvest
   stores"; the live store is free-play and cannot guarantee the Duchy ever
   stands twice — so the pair is minted in the FIXTURE store: ONE byte-stable
   brief painted twice under distinct cache keys (independence lives in the
   mint, not the words), both post-seal so the rider stands in both.
2. **Law II seat guards.** The closure court seats the three harness plates
   under spec-held cues (harness paints bind to no journal row, so the spec
   holds their testimony), plus live plates whose recorded cue carries 1-3
   subjects — a cue the roster could paint whole; subjectless and oversize
   cues never rode the clause, so the court does not pretend they did.
3. **Law III guaranteed seat.** G22b's bench cannot depend on a free-play DM
   dealing a hero-first cue, so the harness mints one deterministic hero-first
   plate; live hero-first plates join opportunistically under the same guards.
4. **G22d, the painted-briefs court.** A fourth sitting beyond the ratified
   three: it pins the instrument seal, reads the fixture store's own recorded
   briefs (the pair is one brief minted twice; closure, principal, and rider
   bytes stand in them), and walks the engine door at the bench — the law is
   proven on what was actually painted, not only on what would be refused.
   G22d joins REQUIRED_EXECUTED beside its siblings.
5. **The read-back carries the crowd.** The harness read-back mapper carried
   a cue's subjects and region only; it now carries `crowd` too — a lossy
   mapper would have judged every granted crowd as `none`.
6. **The principal clause harmonized (after 56C.2).** The ratified wording
   crowned the first subject with "no other figure outranks this presence in
   prominence" — a zero-sum order the painter obeyed by shrinking the other
   named souls into the background, where the likeness warden rightly refused
   the plate. The clause now reads: the principal LEADS in position and
   focus, while any other named soul stands near enough that face and mark
   read true — leadership and likeness pulling the same direction.

7. **Ceiling extension (once, frozen).** The proving ceiling moved 8 → 12
   under the series' one-extension law. Reason: the standing first-scene
   likeness tollgate (attestation #9, pre-existing — 54.1/54B.1 died there
   before this directive) killed four of five fresh mints; three
   consecutive greens no longer fit under 8. The extension is spent; 12 is
   frozen. Ledgered in LOOP_LOG at 56C.6.

8. **The pair brief is a two-soul brief with a fixture-forward mood.** The
   calibration seats' duchy pair now names Corin Voss AND Edda, and its
   mood orders the sealed Toll-Scale's canon attributes (arch-bolted,
   mirror pans) into the frame. Reason: a one-soul trade brief plus the
   companionship sentence made the painter add an unnamed counterparty
   (2/2 mints), and a mood silent on the fixture's mounting got
   freestanding scales (0/2) — the instruments refused rightly both
   times; the briefs were dishonest to the painter's observed habits.
   Known-bad closure controls recomposed as pure count-lies in lockstep.
   Ledgered in LOOP_LOG at 56C.7.

9. **The constancy question judges the fixture's identity, not its
   staging.** LAW IV's court (G22c, tooth 15) refused four consecutive
   honest mints solely on mounting, angle, and finish — attributes the
   pipeline rendered at 0/4 while rendering the fixture's identity at
   4/4 — and the pair's independent cache keys (amendment 1) guarantee
   staging variance by design. The sealed question now demands the
   canon fixture's kind, material, scale, and distinctive form,
   recognizably the same fixture in both paints; staging is lawful
   variance; refusal is reserved for missing, different, or
   unrecognizable. The crossed-ground tooth stays a deterministic lie.
   Protocol tag bumped, sha re-pinned in lockstep. Ledgered in LOOP_LOG
   at 56C.8.
