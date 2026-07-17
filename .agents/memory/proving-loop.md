---
name: MyDungeon proving-loop lessons
description: What a 25-iteration vision-judged e2e loop taught about paint-prompt law, warden enforcement, and suite design.
---

## Prompt law (paint briefs)
- **Poison words bake text.** "Readable", quoted beat titles, and quoted prose inside a paint brief summon painted lettering (title cards, map labels, prose written into cobblestones). Say "clear action", pass goals unquoted, and declare the telling's words to be stage directions, never set dressing. A poison-word sweep (grep readable/legible/inscrib/titled in prompt files) is a cheap arm-gate.
- **The text plague migrates surfaces.** Each named habit stayed cured once its noun entered the in-world silence clause — title cards, artist signatures, chart glyphs, face-up letters, map labels, carved epitaphs — but the model keeps finding new writable surfaces (the seventh was a gravestone). Cure by noun list converges asymptotically; budget iterations accordingly.
- **Written matter: stage the object, never the face.** Letters/maps/books as props with faces turned away satisfies both the moment law ("stage every named thing") and the cleanliness law (no script rows). The two laws collide only when the writing's face is visible.
- **Prompt-law budget is real.** Every added law dilutes the others. For a five-pixel feature (a facial mark at scene distance), wording plateaus at ~50% per run — enforcement beats eloquence.

## Warden enforcement
- **The enforcer's bar must be ≥ the gate's bar.** A warden accepting `same ≥ 0.65` launders takes that a 0.75 proving judge refuses. Align thresholds or the pipeline ships lawful failures.
- **Feature-repaint trades the person for the feature.** A note demanding a missing mark makes the painter re-roll the face. The note must pin identity explicitly: "the feature returns, the person does not change."
- **Coverage gaps hide where the wiki ends.** The hero lives outside the cast wiki, so bearing lookups by lead name returned null and hero-led scenes went unwardened for the loop's whole first half. When she leads, synthesize her bearing from her soul (noun + mark + canon).
- **The mark is soft law by constitution.** Engine design (eval-pinned): identity is hard law; a missing signature buys ONE repaint, then ships with the lack attested. Any outer gate that makes the mark HARD law will flap on the residual dice — that gap is design, not bug. Closing it means changing the engine's constitution, not tuning prompts.

## Suite & loop mechanics
- **Serial spec files starve their tails.** A mid-file flapper skips every later test in that file; nine vision criteria never executed once in 25 runs because two flappy gates sat upstream in the same file. Put volatile vision criteria last or in separate files.
- **Keep eval pins in lockstep with lawful strictenings.** Raising a threshold or rewriting an enforcement note is a strictening — but a stale eval pin (constant equality, note-substring) turns it into a red build in a chain you may not be running locally. Sweep ALL eval chains (engine package + artifact) after touching shared engine law.
- **View the flagged plates.** Every root cause in the loop's endgame was found by looking at the image, not the verdict JSON: the stranger with the loud mark, the epitaph on the memorial stone, the prose in the cobblestones.

## Task 53 endgame (July 2026)
- **Recognition-demand words are poison too.** "Unmistakable", "identify at a glance", "prominent enough to recognize" summon painted LABELS — the painter makes things identifiable by lettering them. Demand prominence through form and silhouette ("large in the frame, its form and silhouette carrying the recognition"). Extend poison sweeps: readable/legible/inscrib/titled/unmistakab/identify at a glance.
- **One prompt clause can breach two walls.** A single added clause tripped the paint door's char cap by LENGTH (413) and, once the cap was righted, plausibly summoned the text plague by CONTENT (refusal). After ANY prompt-builder expansion: audit MAX_*_CHARS ceilings against the worst lawful ask, then poison-sweep the new words.
- **Lawful refusal reads as pending to shelf-polling waits.** The refusal law drops bytes and stores nothing, so a suite that waits for media rows mistakes terminal refusal for work-in-flight and starves. Make harvest waits terminality-aware via the sealed attestation record, never via synthetic media rows (shelf is content-addressed, vault chain-verifies — a marker row is a forgery). refusalTerminal eval pins the semantics.
- **A logged 413's author is the route, never the parser.** When the request logger mounts after body parsers, parser 413s never reach it — a 413 IN the log was minted downstream (abuse caps). Read middleware order before curing the wrong wall; this cost two iterations.

## Loop-harness lessons (2026-07-17)
- **Prove every verdict needle against a real title once.** A required-executed needle that can never match (`'G9a'` vs titles spelled "G9 a1") makes the loop unwinnable from birth and INVISIBLE — every verdict reads false-negative regardless of the paints. The tell: a court passes yet still lists as missing-executed. Grep the needle against `--list` output the day it is written.
- **A no-change iteration re-litigates the same evidence.** Unchanged paint-law hash → the harvest store is lawfully REUSED and the deterministic vision cache (same id + same bytes = same verdict) replays every judge answer verbatim. Only court-law changes and live-app courts can move. Never spend a scarce iteration on "fresh dice" without confirming the dice actually re-roll.
- **Judges have stock hedges.** Six sightings of exactly 0.62 with depicts=true and the named element echoed, against a 0.7 floor — that is calibration temperament, not paint variance. Repeated identical sub-floor confidences with TRUE verdicts mean the floor is measuring the judge, not the paint. Name it as a residual class; never lower the floor to absorb it.
- **Every concrete noun in a prompt clause is a paint order — twice proven.** The example list "(a glow, a letter)" baked a written page; the covering list "helm, mask, hood, veil, visor" bolted a helm over a bare-faced hero and restyled her mark into an emblem. Laws must be LISTLESS: defer to identity lines and forms ("nothing added that it does not state"), never enumerate.
- **Attest-or-visible laws need BOTH disagreement directions ENUMERATED — but enumeration must never widen acceptance.** Markless + attested-SEEN (the mirror of seen + attested-lack) still FAILS; the cure is only the truthful reason (warden–judge contradiction), never the false attest-path accusation, which stays reserved for true silence. A first draft yellowed the mirror lane — that was a weakening, and the review round caught it. Under green-pressure, "completing a taxonomy" is the classic disguise for widening a court.
- **Anchor-ship is a third terminal.** Foundry mints NO row on anchor-fall; shelf polls and two-state (fulfilled/refused) classifiers both misread it as pending/fulfilled. Every wait, manifest walk, preflight, and tooth must speak FULFILLED / REFUSED / ANCHORED.
- **Probe judge reds with eyes before curing.** ReadFile renders plate JPGs; a "likeness failure" turned out to be a prompt-ordered helm — visible in one look, invisible in any log. The cure differs completely depending on what the plate shows.
- **Post-mortem exports pay for themselves.** The harvest exporting its sealed record on failure turned an attest-or-visible red from a guess into a one-probe conviction (the exact attestation row, signature:true at the warden's own floor).
- **Mood-before-beat is a positional poison.** Any clause that speaks before the moment's beat can override its stated hour ("Dawn, then." painted dusk twice). The beat rides FIRST; everything after it is subordinated by name.

## Instrument calibration (Task 54B, July 2026)
- **Replace scalar confidence floors with forced binaries, then CALIBRATE them.** Self-reported confidence measures the judge's temperament, not the paint (stock hedges, above). The cure: conjunction of forced binaries (element seen / no different deed / nothing denies), scalar demoted to a logged diagnostic that decides nothing — and a calibration probe demanding PERFECT separation on sealed known-good/known-bad pairs before the amended courts may sit. Pin question texts by hash; every rephrase bumps a protocol tag (re-judges affected plates exactly once) and lands in a ledger.
- **Vision judges read still tableaus as filmed deeds, omissions as contradictions, and lookalikes as denials.** Three separate literalism classes, found one per calibration iteration: (1) a scene beside its own prose ruled "wrong action" because the deed isn't mid-swing — judge BELONGING, a different DEED fails, a different instant never; (2) a stated-but-unshown detail ruled a contradiction — an omission NEVER contradicts, only a visible OPPOSITE; (3) a wayside blaze ruled to deny "the hearth is banked" — the opposite must concern the VERY THING the words name, a lookalike elsewhere denies nothing.
- **Never drop a true pair the judge dislikes.** When calibration fails on a known-good, eyes on the plate decide: if the pair is true, the phrasing moves and the probe set stands — swapping pairs to please the instrument is selection bias that calibrates nothing.
- **PASS-count pins must be measured with the gate's own regex.** The gate counted `\bPASS\b` tokens in stdout; table cells like `canonIntegrity 'PASS'` count too, so `grep -c '^PASS'` undercounts by six and the pin looks wrong when it's true. Reproduce the gate's exact count (regex AND stream AND env-strip) before touching a pin.
- **A door gaining a stage breaks every eval that scripts the old door's answers.** Fail-closed two-stage looks drain old single-answer pass scripts to the floor — they now stumble at stage one. After changing a door contract, sweep evals for SCRIPTED PROVIDER ANSWERS (not just pins) and teach the scripts the new stage.
- **Threshold-straddling latency bars flip with suite load — split transport from source before blaming either.** A first-byte bar at 30s over a ~21s path passes cached-store suites and fails full-repaint suites. The named-phase assertion split (first byte vs growth) plus an out-of-band probe of the server pipe convicted the in-page leg in one iteration: the game queues the pour behind genesis media. A flapping latency bar is evidence about LOAD, not honesty — measure solo and contended before moving anything.

## The extension law (standing, series-wide — granted first on 54C)
A ceiling extension may be requested AT MOST ONCE per task, and only
when the ledger qualifies: zero undiagnosed reds (every red carries a
named root cause), zero open game defects, and the only unbanked work
is verification of already-validated cures. It is a VERIFICATION
window, never a cure window: code freeze for the whole span (game
code, test code, question texts, fixtures — any needed edit voids the
extension and the loop closes red as of the last pre-extension
iteration), ONE STRIKE (any red closes the loop red immediately; no
second extension, that task or any future one), replay/fresh law
unchanged with REPLAY named in the run log, and the closing sentence
still means three CONSECUTIVE fully green runs — now inside the
window. A 3-of-4 record is an honest red, never a discounted green.
The record must name the original ceiling, the ruling, and the streak.
Authoritative text: THE EXTENSION LAW entry in the repo's LOOP_LOG.md.

## Read-back mappers must carry what pure replays consume (July 2026)
The harness's DB read-back helper rewrites campaign log rows into a
summary shape. Twice now a silently dropped field broke a court while
the app itself was lawful: first `kind` (tick rows became turns
downstream), then `dm.story` (troveOf/purseOf replayed an empty
journal on read-back while the DOM court proved the real record
sound). **Why:** a mapper is instrumentation; when a new pure replay
(threadsOf/troveOf/purseOf-style) grows a new field dependency, the
mapper lags unless checked. **How to apply:** when adding any
journal-replaying derivation, grep the e2e read-back mappers for every
field it reads and carry them verbatim; a red that only reproduces on
read-back (page courts green) is almost certainly the mapper.
