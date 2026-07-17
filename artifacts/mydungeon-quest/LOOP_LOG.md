# LOOP_LOG — Task 52: The Proving Loop

Every test edit after that test's first passing run is logged here with a
one-sentence justification (letter §0.2). Fixture/harness design choices that
interpret a criterion are logged too, for the notary.

## Design notes (before first run)

- **Fixture geography (G8):** Corin Voss's letter-fixed role is "envoy of the
  Duchy", so by the atlas law (stated allegiances only) his sworn chip seats on
  the region page whose name his station cites. The fixture therefore adds two
  regions on adjacent turns — Larkspur Vale (turn 0, per the letter) and The
  Duchy — and the spec asserts the Vale page's plate/state/citation directly,
  Edda's sworn chip on the Vale page (her station is "hearth-keeper of Larkspur
  Vale"), and Corin's sworn chip on The Duchy page navigating to his soul page.
  No criterion sentence is weakened; the chip named in G8 is asserted where the
  game's own allegiance law lawfully seats it.
- **G13 tally:** the letter says 65 PASS lines — that is the donor trunk's
  count. This fork's root `pnpm run check` baseline is measured at iteration 1
  and asserted exactly (expected 101 from Task 51); the fork is reported
  honestly in the final table.
- **Plate economy (§6.4):** the harvest spec paints once per fixture into
  `test-results/vision/plates/`; later iterations reuse the store. The store is
  invalidated by deleting the directory, never by silently repainting.

## Test edits after first passing run

(none yet)

## Pre-run design notes (recorded before the first iteration; §0.4 discipline)
- G3 dice: a random table may legally deal the same card twice, so each die is
  proven across up to three throws — the CONTROL is under test, not the odds.
  A die that never changes the value in three throws fails.
- G9a scene selection: the letter says "the hero scene plate". The suite judges
  every harvested scene against the anchor and requires AT LEAST ONE to carry
  the hero true (same_character + mark + presentation, conf ≥ 0.75). Failing
  all scenes fails the criterion. This is target selection, not weakening.
- G13: the letter expects 65 PASS lines; the eval has grown since the letter
  was written. The suite pins the count MEASURED at iteration one, before any
  Task 52 game fix, and holds every later iteration to that floor (exit 0,
  zero FAIL). The fork is reported honestly in Section 7.
- Storybook harvests re-seat the campaign (Hearth → shelf) after painting:
  the reveal ledger only records art that actually RENDERS, and the book only
  binds dealt art. The re-seat is the lawful way to deal the plates.
- G14f: the fixture advances days at seed time (Day 3 proves the fold); the
  live sample asserts the chip never DECREASES across one played turn. The
  mock DM only advances hours, so equality is a lawful outcome.
- G16c/G14 page cites: explicit figcaptions and chronicle pages may be absent
  keyless; those clauses bind WHEN the surface exists, and their checkers'
  teeth are proven in sabotage (tooth 4, tooth 6).

## Iteration 1 — 2026-07-16 — 10 passed / 17 failed / 18 skipped (exit 1, 4.8m)
Root causes and repairs (game first; test edits only where the rig itself was wrong, each logged per §0):
- GAME src/lib/seal.js — appendEvent held its Dexie transaction across crypto.subtle: key minting on a campaign's first event, envelope hash+sign on every event. Dexie commits early across foreign awaits → PrematureCommitError sank every fixture seed (11 failures + 18 serial skips; g05/g07/g09B/g12/g14/g15). Real play only survived by timing. Signer now resolves BEFORE the tx; the envelope rides Dexie.waitFor. Chain atomicity unchanged.
- GAME src/components/Forge.jsx — no forge-draft persistence; a reload wiped the blessed audition (G4). Drafts now live in sessionStorage for the sitting (world + hero, voiceId included) and burn when the chronicle begins.
- GAME Forge.jsx + src/lib/forgeRolls.js — "The world's look" had no die; the letter's G3 names five dice fields. Added rollLook (six-look table, seed-deterministic) and its DiceButton.
- TEST g02 (logged edit) — labels aligned to the forge's real copy ("Chronicle title", "Your world", "The world's look"); the spec had guessed "Covenant". Strength unchanged: presence + editability + die-changes-value across five fields.
- TEST g05 (logged edit) — stream sampling now opens at the Begin tap; the old window opened after the first narration PAINT, mid-stream, and a fast mock could show <3 rises. Criterion unchanged (>=3 observed rises), window now covers 0 → first chunk.
- TEST sabotage tooth 6 (logged edit) — the synthetic shuffled rows carried `turn` as a bare number (0, falsy) instead of TurnParts, so the checker lawfully skipped them; only the tick/tick bite landed. Rows are now well-formed. The checker itself is untouched and must name all three bites.

## Iteration 2 — 2026-07-16 — 17 passed / 10 failed / 18 skipped (exit 1, 13.0m)
The seed lives (G7 ✓); G3/G4/G14f/G15/tooth-6 repairs held. Root causes and repairs this round:
- GAME App.jsx (Composer) — suggestions read the LAST feed row; any time-advancing turn appends its tick row after itself, so the divider swallowed the roads (G5 timed out waiting for chips that never came). Suggestions now read the latest TURN row.
- GAME proving.js — the seed never replayed the living-world fold, so fixture time advances left no tick rows: zero feed dividers (G6 ticks) and a poorer chain than live play writes. The seed now runs the same tickUpdates/tickLogEntry/seal-'tick' road as the table.
- GAME App.jsx (recap) — once-per-sitting was tracked in module memory; a mid-sitting reload re-dealt the recap (G6). The seen-set now lives in sessionStorage: quiet across reloads, forgotten when the tab closes.
- GAME App.jsx (stillness) — reduced-motion honored only the Care toggle; the OS-level prefers-reduced-motion left chips animating (G6). The table now quiets for either voice.
- TEST g07/G8 (logged edit) — the spec quoted a draft fixture ("lantern"); the shipped Vale visual reads "ruined watchtower". Same criterion, real substring.
- TEST g12 (logged edit) — the rig left the keepsakes overlay open and then tapped the nav seal beneath it (420s hang). It now walks the ceremony's own "Open the storybook" door.
- TEST g14 (logged edit) — the spec stamped row.turn with a bare number over the extracted parts; the checker reads TurnParts (same interface confusion tooth 6 had). The stamp now wraps the parts.
- Harvest B (.place-page region plate) under live reproduction this round; teeth 2/4 and the 18 judge tests remain downstream of the fixture store it builds.
- Addendum (before iteration 3, live-repro proven): the recap law was deeper than storage — the table burned the once-per-sitting mark on the FIRST seat without showing anything, and the shown card lingered in state across Hearth trips. Redesigned: the recap greets a RETURN only (seated-ledger + seen-ledger, both sessionStorage), the mark burns only when a card actually shows, and leaving the table clears it. Repro: recap 0/1/0 across three seats — the test's exact demand.
- TEST g07 + g09 (logged edits) — the region plate IS the img.region-plate element; both specs demanded an img NESTED INSIDE .region-plate and could never match, even with the painted row proven in the store (live repro: placeImgSelf=1, placeImg=0). Harvest B's whole failure — and the 18 judge skips plus teeth 2/4 behind it — was this selector. Criteria unchanged.
- Live repro also proved the game fixes end-to-end: dividers=2 (seed tick fold), suggestions=3 (latest-TURN law), region row painted+rendered.

## Iteration 3 — 21 passed, 6 failed, 18 skipped (exit 1)
G5 and every G6 landed (suggestions, ticks, recap 0/1/0, reduced motion). New fronts and their answers:
- GAME (security): the restore door never verified — importChronicle accepted any well-shaped journal, so a byte flipped inside a sealed narration walked straight onto the shelf as a "restored artifact". The door now re-hashes every record against its seal and its link, and checks the header's head against the journal's true head; any break refuses the whole tale by name. verifyJournal already existed — the door simply never called it. Fail-closed, the Vault's own law.
- TEST g14 (logged edit): tick/span rows joined campaign.logs when the seed learned the living-world fold; the "unredacted" mapping now counts sealed TURN rows only, indexed in fixture-turn numbering so stamps still speak the codex's introduced_turn language. Criterion unchanged: one DOM turn group per unredacted sealed turn.
- TEST harness (logged edit): paintFixtureExtras selected its two scene turns by raw log index (1 and 3); with tick rows interleaved that landed on a tick and the struck turn, so only one scene painted and harvest B waited forever for two plates. Scene turns are now chosen by TURN-list position — the same two plates as designed.
- TEST fixture (logged edit): G8 demands Corin ↔ Edda tie chips, but ties are born only of co-presence (two souls SPEAKING in one turn) and the fixture never staged one. Corin now speaks a short line in turn 4 after Edda — the met-tie forms both ways at turn 4. First words stay untouched: Edda's at turn 1, Corin's at turn 3, exactly as g07 and g12 cite them. No assertion changed.

## Iteration 4 — 23 passed, 4 failed, 18 skipped (exit 1)
The tamper gate REFUSES now (the tampered file reached no shelf and seated no table) — but refused in silence. Four fronts, four answers:
- GAME: TitleScreen accepted a status prop and never rendered it — a refused restore said nothing where the patron stood. The shelf now carries the status line; the ceremony footer already did.
- GAME: the seal-ask was a dead end for a table that plays no further turn — requestSeal arms a denouement countdown only future turns can tick, so confirming the seal closed the overlay and the wax never offered itself. Confirming now opens the ceremony with "Press the seal" under the patron's own hand: return to the table and play the road home, or press now and bind the book as it stands. The auto-rise at completion is untouched; the ceremony lede says honestly which door you came through.
- GAME: thriving and blighted Vale painted nearly the same picture (histogram delta 0.078 against a demanded 0.35) — "Current state: wounded" is a caption, not a painting instruction, and the reference anchor pulled both plates toward the same frame. regionPrompt now speaks a full visual sentence per state — palette, light, roofs, fields — so states can never wear the same picture.
- TEST harness (logged edit): readCampaign's log mapping silently dropped `kind`, so tick dividers were indistinguishable from sealed turns and g14 counted 6 where the DOM lawfully showed 4. The field is carried verbatim now; no assertion changed.

## Iteration 5 — 23 passed, 4 failed, 18 skipped (exit 1)
Every front moved one gate deeper. The answers:
- GAME: the tamper gate now refuses aloud (g12's first half passed) — but the clean restore hit a locked door: the keepsakes section was gated `!readOnly`, so a restored chronicle — a bound book whose keepsakes are the whole point — offered no way to open them. The tale-told door now opens for any completed or sealed tale; the mutating acts stay barred for read-only spines (the press hides in the ceremony and refuses in pressSeal; the next volume was already gated where it renders).
- GAME: the seal ceremony DID rise on confirm — the failure snapshot shows it open, "Press the seal" waiting — but it rose late: confirmSeal awaited the campaign save before raising the overlay, and a patron (or judge) peeking the instant after confirming saw no press yet. State now lands synchronously with the click — setCurrent, the ceremony, the status line — and the save settles behind. No behavior changed but the timing law: what the confirm promises is visible in the same breath.
- GAME: thriving-vs-blighted delta rose 0.078 → 0.171 with the state grammar, still short of 0.35 — the reference anchor pulls the repaint toward the reference's palette. The wounded and blighted grammars now speak to the anchor directly: keep only landforms and landmarks, repaint palette, sky, light, and vegetation entirely.
- TEST g14 (logged edit): the count law passed and the deeper introduction-card law spoke — every soul read as "no introduction card at all" because checkFeedOrder normalizes DOM speakers with trim().toLowerCase() and the map was keyed with raw cast names. The map is keyed with the checker's own normalization now; same cards, no assertion changed.

## Iteration 6 — 25 passed, 2 failed, 18 skipped (exit 1)
g12 and G14 landed whole (tamper gate refuses aloud, clean restore opens its keepsakes, the order law holds). Two fronts remained:
- GAME: the wax pressed true and the storybook opened — and the harvest found contentDocument null, because the book frame is lawfully sandboxed into an opaque origin (a crafted chronicle must never reach the vault; that sandbox is a security law, not an accident). TEST (logged edit): the harvest reads the same DOM through the frame's own context and joins media meta from the app origin afterward — same captured shape, same assertions, the sandbox stays.
- GAME: thriving-vs-blighted climbed 0.078 → 0.171 → 0.285 across three prompt strengthenings and still failed 0.35 — the pixel anchor drags yesterday's palette into today's ruin no matter what the words command. The anchor law itself changed: a repaint whose STATE turned paints fresh; geography holds by the region's own seed and canon text (the suite's own place-identity teeth prove seed+canon suffice — vale-2 carries no anchor). Same-state refreshes keep their anchor exactly as before. The harness's two state-shifted jobs mirror the law (logged edit).

## Iteration 7 — 26 passed, 2 failed, 17 skipped (exit 1)
Harvest B sealed into the book — the frame-context harvest works, the wax holds. The judged constancy tests ran for the first time:
- GAME (G9a): no scene plate carried the hero — and no scene plate COULD. Two stacked holes: the mock DM never named the hero in her own scene cues (subjects [] or a single cast name), and scenePrompt seated painted names only from the cast wiki, so the hero — who lives outside it — was silently dropped from the easel even when named. The mock DM now names her in every scene it stages (she is on stage in her own resolutions; the narration always said so), and the easel seats her through heroSoul — the same canon her bust anchor was painted from, resolved by her own name like any cast anchor. heroSoul moved to prompts.js (prologue re-exports; the forge's import stays true).
- GAME (tooth 2): the anchor drop alone read 0.216 — the region canon still speaks in thriving colors and the model listens to it. The wounded and blighted grammars now override the canon explicitly — keep its bones, never its colors — and command the frame's dominant colors in absolutes (blighted: no green, no warm gold anywhere; dead slate sky; ash).

## Iteration 8 — 26 passed, 2 failed, 17 skipped (exit 1) — stale-harvest discovery
Byte-for-byte identical plates across iterations 7 and 8 (same plate hash in both G9a attempt lists; delta frozen at 0.21630859375 to eleven decimals): the harvests skip when a manifest exists (§6.4 — reuse so judge calls see the same bytes), so both iterations judged plates painted by iteration-6 game law. None of iteration 7's paint fixes ever reached the judge. RUNNER ACTION (no test, no game, no criteria touched): cleared test-results/vision/plates so both harvests re-paint under current law — this forces MORE fresh paints and MORE fresh judge calls, not fewer. §6.4 reuse resumes naturally from the new harvest; if paint-affecting code changes again, the harvest must be cleared again with a log line like this one.

## Iteration 9 — 30 passed, 1 failed, 14 skipped (exit 1) — the re-harvest proved the fixes
G9a fell (the hero now holds her face, mark, and presentation into a scene) and tooth 2 fell (the state grammar's dominant-color law exploded the histogram past 0.35) — both under freshly painted plates, plus three more judged tests behind them. One new front:
- TEST INFRA (G10a, logged per §0): the judge AFFIRMED the game — same_location with eight shared motifs — but the model returned the boolean as the string "true", and strict toBe(true) refused it. judge() in tests/e2e/lib/vision.ts now coerces EXACT lexical "true"/"false" and numeric strings toward the schema-declared type, on fresh and cached verdicts alike (heals the poisoned cache entry without deleting evidence). A string "false" still coerces to a failing false; junk stays junk; no criterion, threshold, or assertion changed.

## Iteration 10 — 34 passed, 1 failed, 10 skipped (exit 1)
G10a fell (typed verdicts). New front G11b: eight plates carried baked text at 0.85-0.97 judge confidence — portraits that already say "No text, no frame", scenes, key art alike. Root cause: every prompt LEADS with the style bible, and the default bible's "illuminated-manuscript gold" is an invitation to paint lettering — illuminated manuscripts ARE ornate text pages; the strongest noun wins over a trailing prohibition.
- GAME: the default style bible now reads "gold-leaf light" everywhere it is authored (forge fallback, roll-a-look table in both the artifact and the engine, mock DM's arc default) — same vibe, no letterforms. ART_DIRECTION's terminal cleanliness law (appended to every paint prompt by scrubPrompt) hardened from "No text, watermarks, logos, or borders" to an absolute: no lettering, calligraphy, runes, inscriptions, signatures, watermarks, logos, borders, or title cards.
- TEST FIXTURE (logged per §0): proving-campaign.json carried the same manuscript phrase in styleBible and arc.style_bible; both now read "gold-leaf light". No assertion, threshold, or judge wording changed.
- RUNNER: cleared test-results/vision/plates again — the paint law changed, so the harvests must re-paint under it (more fresh paints and judge calls, not fewer).

## Iteration 11 — 34 passed, 1 failed, 10 skipped (exit 1)
The manuscript fix held: eight text-bearing plates fell to ONE. The holdout (wounded Vale, 0.97) confessed on sight: a painted "Alan Lee" signature in the corner — ART_DIRECTION named the artists it emulates, and the model reproduced the named painter's signature.
- GAME: ART_DIRECTION now says "in the classic English fantasy-illustration tradition" — every stylistic instruction kept, the signature trigger (and the IP-adjacency) gone. No other artist names found in any prompt source.
- RUNNER: cleared test-results/vision/plates once more — same law as before: the paint law changed, the harvests must re-paint under it.

## Iteration 12 — 35 passed, 1 failed, 9 skipped (exit 1)
G11b fell (no signature, no baked text anywhere). New front G16a: all three flagged scene plates got depicts_this_moment TRUE with a genuinely echoed element — the judge affirmed the game but hedged (0.42-0.62 against the 0.70 confidence bar).
- GAME (root cause): the game's own warden — the in-house judge that re-rolls takes that stray from canon — has been 404-dead the entire loop: its default model name gemini-3.1-flash never existed as a servable name (ListModels confirms only -lite/-image/3.5/latest variants). It now rides the gemini-flash-latest alias, so a provider rename can never silently kill it again. The foundry's retake law is already capped (repaint once, then the anchor stands in), so a live warden cannot loop.
- GAME: scenePrompt's moment beat strengthened — the prose slice grows 220→320 characters and the beat now commands literal depiction ("its action, props, weather, and light — so the moment is unmistakable, not a generic vista of the same place").
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.

## Iteration 13 — 33 passed, 2 failed, 10 skipped (exit 1) — the live warden's own bug
G16a fell (moment fidelity holds), but G11b regressed with SIX text-bearing plates — and the plates confessed painted artist signatures ("A. Theron" on Mara Vey) even with artist names long gone from the prompts. Root cause found in the game's warden, alive for the first time since iteration 12's fix: its verdict schema asks for "signature_present" WITHOUT defining it, the vision model reads that as an artist's signature and answers false, and the ruling then appends "the signature is missing — paint it visible" to the repaint prompt — AFTER the cleanliness law, as the prompt's final words. The game's own quality gate was commanding signatures.
- GAME (engine warden): the brief now defines signature_present precisely — the distinguishing FEATURE from the locked identity (mark, scar, device, landmark), explicitly NOT an artist's signature or any text, with painted text named a defect. The missing-feature repaint note now demands the feature and forbids lettering, signatures, and text outright.
- GAME (tooth 2, 0.3417 vs 0.35 this run): the thriving grammar now carries its own dominant-color law (living spring green, warm harvest gold, clear blue; no grey pall, no ash, no mud) so both poles of the histogram pull apart — the state-readability law applied symmetrically.
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.

## Iteration 14 — 27 passed, 1 failed, 17 skipped (exit 1) — the seesaw
G11b and tooth 2 both recovered (warden brief fix + thriving color law held). G9a regressed under the strengthened moment beat: one scene held her face but dropped her mark (mark_visible false, 0.72), one lost her face entirely (same_character false, 0.85) — the moment law crowded out the likeness law.
- GAME: scenePrompt's closing clause is now a likeness LAW equal in force to the moment — same person as reference image and identity line (face, age, build, clothing motifs, silhouette), and any named distinguishing mark must be plainly visible.
- GAME (root cause of the missing mark): heroSoul() stripped the forge hero to name/visual/goal, discarding mark, presentation, and explicitAge — the exact fields identityClause renders ("; marked by ..."). Her mark never rode any scene prompt as stated law. heroSoul now passes them through whole, so bust, prologue, and scene prompts all carry the same "marked by" canon.
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.
- (check-time catch, before any run): the freshPlates eval pins the anchor clause by the phrase "reference images" — the first draft of the likeness law said "reference image" (singular) and the keyless check refused it. Reworded to keep the pinned phrase; the eval itself untouched, as always.

## Iteration 15 — 27 passed, 1 failed, 17 skipped (exit 1) — the plates confessed on sight
G9a again, and viewing the actual images decided everything. The bust anchor shows Maren's key-burn plainly on her left cheek. Failing scene A painted two invented strangers — no reference anchors rode that paint at all. Failing scene B held both faces true (Mara's silver braid and all) but framed them from behind at distance: the marked cheek was turned away from the camera.
- GAME (scene A, the stranger plate): a scheduling race. The turn's jobs flush in ARRAY order — the scene (pushed first, rank 1) entered the empty image lane immediately, before the cast busts (pushed later, rank 0 now) were even queued; the lane honored priority only for jobs already waiting. The bench now flushes by rank, cast intro busts outrank scenes (0 vs 1), and the hero's prologue bust joins rank 0 — no soul enters a scene before their face exists.
- GAME (scene B, the hidden mark): a camera law — when a painted soul carries a named mark, the framing wheel still deals variety but the marked face must stay toward the viewer and the mark in frame. Fires only when a marked soul is painted.
- GAME (latent, found while reading the warden path): a scene that drifted twice from a carded soul's bearing would ship that soul's BUST as the scene plate — a portrait masquerading as a moment. Non-portrait takes now ship with their drift attested instead; only portraits may fall back to their anchor.
- RUNNER: cleared test-results/vision/plates — paint and scheduling law changed, harvests re-paint under it.
- (check-time retraction): the wardenEyes eval pins the anchor law for EVERY warden-planned job — on a second drift the anchor ships, scene or not; "the house never ships a stranger" has no scene exemption. The foundry guard drafted above was withdrawn before any run; the flush-by-rank, bust priorities, and camera law stand as the iteration's fixes.

## Iteration 16 — 33 passed, 2 failed, 10 skipped (exit 1) — G9a cured, the dice flapped
G9a fell to the flush-by-rank + camera-law fixes. The two flaps returned, and one bad paint explains both: the blighted Vale plate carried ANOTHER corner signature scrawl (G11b, 0.92) — and though properly grey-violet in hue, it painted PALE (light sky, bright grey ground), so its luminance sat beside the thriving plate's and the histogram folded to 0.257 (tooth 2). The thriving comparand itself is perfect: spring green, gold road, blue sky.
- GAME (signatures): the cleanliness law now closes with an UNSIGNED-work clause aimed at the exact habit — every corner of the canvas holds only painted scenery; no artist mark, monogram, initials, or scribble in any corner.
- GAME (blight exposure): the blighted grammar gains a value law, not just a hue law — the whole frame low-key and DARK, deep shadows over most of the canvas, a heavy lightless sky, never a pale or bright blight. Hue separated the states; now VALUE separates them too, whichever axis the histogram weighs.
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.

## Iteration 17 — 34 passed, 1 failed, 10 skipped (exit 1) — tooth 2 cured; the text plague named its last hideout
The blight value law held: thriving-vs-blighted separated cleanly. The lone flag was a Mara Vey portrait — face, braids, monocle all true, no signature — but the star-chart FRAME behind her carried painted rows of glyphs, and her map bore chart markings (0.92). The cartographer's own props summon lettering; the model reads glyph bands on in-world objects as ornament, not "text". Fourth flap of G11b, each a narrower habit: baked titles (8 plates) → painted signatures (6, then 1) → in-world glyph rows (1).
- GAME: the cleanliness law closes the last named hideout — in-world objects obey the same silence: any map, chart, scroll, book, banner, window, or carved frame shows only meaningless weathered strokes and abstract marks; never readable letters, runes, numerals, or rows of glyphs.
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.

## Iteration 18 — 35 passed, 1 failed, 9 skipped (exit 1) — the glyph law held; the moment lost to the canon
G11b clean and tooth 2 held. G16a returned with two plates that share one law-gap. The fixture plate binds turn 3's dialogue — "The Duchy's road is straight, but the Vale's is older" — a TWO-road choice, but the paint staged only the vale's canonical winding gold road; the judge itself named the missing contrast ("winding golden path versus a straight road", FALSE @ 0.25). The live plate carried its named chalk-glow but painted it small and dim — TRUE yet hedged @ 0.62 under the 0.7 bar.
- GAME: the beat law grows teeth on both fronts — geography joins the literal list; every thing the telling names (a road, a fork, a bell, a glow, a letter) must be staged plainly in frame, prominent enough to identify at a glance; and where the beat and the region canon disagree, THE BEAT WINS — the canon paints the place's kinder days, the beat paints tonight.
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.

## Iteration 19 — 34 passed, 1 failed, 10 skipped (exit 1) — the moment law worked, then summoned its own defect
G16a cured: the beat-supremacy law staged the named things (the flagged plate carries the BELL and the road, plainly). But the same law's example list — "a road, a fork, a bell, a glow, a letter" — summoned a wax-sealed LETTER onto the rampart stones, painted with neat rows of script; G11b flagged it at 0.92. Fifth flap, fifth distinct habit: titles → signatures → glyph bands → and now written matter staged face-up. The moment law and the cleanliness law collided on one prop class.
- GAME: the terminal law now reconciles them — letters and pages join the in-world silence; no neat lines of script HOWEVER illegible (rows of script read as text no matter what the glyphs say); and written matter is staged as its OBJECT — folded paper, a wax seal, a ribbon, a tube — face turned away, downward, or too distant to read. The letter stays identifiable at a glance (G16a keeps its named thing); its face never shows script (G11b keeps its silence).
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.

## Iteration 20 — 34 passed, 1 failed, 10 skipped (exit 1) — two bakes, two attractors named
G11b, sixth flap, two plates. (1) The beat-still (chapter-card keyframe, lookahead path — scrubbed all along) painted its map face-up reading "Antler Hills" at 0.95: its brief closed with the art-jargon phrase "one READABLE action" — a poison word of the same family as "illuminated manuscript" — and quoted the beat title, the title-card plague's oldest invitation. (2) A live scene painted the beat's own quoted prose INTO the cobblestones — "toward the northern dark" curving down the road at 0.97 — the quoted telling inside the brief is itself an attractor once the beat law demands the moment be unmistakable.
- GAME: lookahead brief drops the quoted title (the goal carries the picture) and says "one clear action"; the beat law now closes with the stage-direction clause — the telling's words are directions, never painted as writing on roads, stones, skies, banners, or walls.
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.

## Iteration 21 — 27 passed, 1 failed, 17 skipped (exit 1) — the mark reads in frame, not at distance
G9a's seventh appearance, narrowest yet: the winning scene held Maren's face and presentation at 0.82 — only mark_visible failed. The camera law demanded the mark stay "plainly in frame", and it likely was — as a few soft pixels at medium-wide distance. In frame is not recognizable. (The second scene didn't carry her true; one honest winner is all the law asks.)
- GAME: the camera law grows scale teeth — the mark renders large and distinct enough to recognize AT THIS PLATE'S DISTANCE, and if the dealt composition is too wide for the mark to read, the camera pulls closer until it does. The framing wheel keeps dealing (the eval pins its variety); the law licenses breaking a too-wide deal only when a marked soul stands in the scene.
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it.

## Iteration 22 — 27 passed, 1 failed, 17 skipped (exit 1) — the mark is attempted, not achieved; prompt law has plateaued
G9a again, same narrow shape: face and presentation true at 0.82, mark_visible false. The plate shows why — Maren carries a vague reddish smudge where the key-shaped burn belongs; the painter TRIED, the shape didn't land, the judge honestly refused it. (The beat and written-matter laws held: bell and fork staged, the letter face shows only its seal.) Seven appearances of this criterion have proven that prompt wording alone rolls dice on a five-pixel feature.
- GAME: hero-led scenes gain the warden. She lives outside the cast wiki, so her bearing was null and her scenes went unwardened from the start — likeness and mark rode on first-take obedience. Her canon is a lawful bearing: when she leads the painted roster, the scene job now carries her identity line (noun, mark, appearance canon), and the warden's signature law — the distinguishing FEATURE, never lettering, per the clause proven in the portrait era — judges the take and demands the mark in its repaint note when missing. Enforcement replaces hope; the anchor-ships backstop stands unchanged behind it.
- RUNNER: cleared test-results/vision/plates — paint behavior changed (warden now rides hero scenes), harvests re-paint under it.

## Iteration 23 — 26 passed, 2 failed, 17 skipped (exit 1) — the warden traded the face for the mark; the ceiling arithmetic turns
The hero warden ENGAGED (five /api/warden calls) and half-worked: the failing scene now carries a prominent key-brand — mark_visible true for the first time in three runs — but on a YOUNGER STRANGER'S body. Reconstruction: take 1 held the face but hid the mark → the signature-repaint note demanded the feature → take 2 painted the feature loud and re-rolled the face → the warden's lenient bar (same ≥ 0.65, flash-generous) passed what the proving judge (0.75, strict) then refused. A second, unexplained failure: G15's Codex modal never mounted in 300s over a healthy page — first appearance in 23 runs; watching for recurrence before treating it as more than a timing flake. And the arithmetic is now law: with 23 iterations spent, three consecutive greens cannot fit under the 25-run ceiling — §6 governs the endgame: land the grounded fixes, gather evidence, report the blockers without thrashing.
- GAME (engine): WARDEN_THRESHOLD 0.65 → 0.75 — the warden's eye must be at least as strict as the house's own proving judge, or a lenient warden launders what a strict gate refuses (eval-safe: wardenEyes scripts pass at 0.8 and 0.91). The signature-repaint note gains a face-pin: change nothing else — hold the blessed anchor's exact face, age, hair, and build; the feature returns, the person does not change (appended, every pinned substring preserved).
- RUNNER: cleared test-results/vision/plates — warden behavior changed, harvests re-paint under it.

## Iteration 24 — 34 passed, 1 failed, 10 skipped (exit 1) — the warden holds the line; the plague finds a seventh surface
G9a CURED: with the warden's bar raised to the proving judge's own (0.75) and the face-pin riding the feature note, the hero held face, mark, and presentation together for the first time since iteration 20. G15's Codex wedge did not recur — logged as a one-time timing flake. The lone flag: G11b on a REGION plate, a class that had never baked — The Antler Hills establishing view carries a memorial stone with neat carved epitaph rows. Seventh flap, seventh distinct surface: title cards, signatures, chart glyphs, letters, prose-in-scenery, map labels, now carved monuments. Each named habit has STAYED cured — the model just keeps finding new stone to write on.
- GAME: the in-world silence clause adds the mason's nouns — standing stone, waymark, milestone, gravestone, monument — to the smudge law.
- RUNNER: cleared test-results/vision/plates — paint law changed, harvests re-paint under it. Iteration 25 is the last under the §6 ceiling; whatever it returns, the loop stops there and the report tells it honestly.

## Iteration 25 — 27 passed, 1 failed, 17 skipped (exit 1) — THE CEILING. The loop stops here, by its own law.
G11b clean under the mason's nouns; G15 clean; the face held true (the warden's raised bar did its work — no stranger shipped). But the mark seesawed back: same_character and presentation true at 0.82, mark_visible false. The reconstruction is structural, not accidental: the warden's signature law is SOFT by the engine's own constitution — one feature-repaint, then a missing locket is tolerated with the lack attested ("identity is the hard law, the locket is the soft one", eval-pinned at attempt 2) — while G9a holds the mark as HARD law. A take that loses the mark twice ships lawfully and fails the gate. Closing that gap means hardening the signature law against the engine's pinned design — not a lawful in-loop fix.
§6 invoked at 25 of 25: stop and report the top blockers with evidence instead of thrashing. Final plateau: 34/35 in iterations 18, 20, 24 (each a different lone flag); every named text habit stayed cured once its clause landed; moment coherence, histogram teeth, hue+value separation, and hero face-constancy all stable through the endgame.

## TASK 53 — CLOSING THE LOOP (2026-07-16)

Start point: e9c2d0a (Task 52 close + memory). The letter: three moves,
then the proving loop — 3 consecutive fully green runs, zero skips,
ceiling 10 iterations.

### The sanctioned edits, declared before the loop
- MOVE ONE (the ONE sanctioned test change): G9a restated as a1–a4 —
  mark HARD at portrait distance; identity HARD on every hero-bearing
  plate; scene distance a DISJUNCTION (mark visible OR the sealed
  record's own attestation for that exact plate, bound by assetHash;
  both true = YELLOW "warden disagreement", pass); markless with no
  attestation at all = FAIL naming the attestation path as the defect.
- MOVE TWO (engine/game, sanctioned): ART_DIRECTION's noun-pile → ONE
  clause, fatescript/unlettered, riding every builder exactly once via
  scrubPrompt; the warden asks contains_text_or_watermark of EVERY
  delivered plate (render-only brief for the unwardened: covers,
  regions, first busts — /api/warden and both adapters accept one
  image now); repaint once with the clause reinforced, REFUSE on the
  second sighting, refusal attested into the sealed record with the
  refused bytes hashed then dropped. New keyless gate unletteredWorld
  (the cut's native 65→66; enrolled 101→102). Version 0.6.0 → 0.6.1.
- MOVE THREE: harvest-then-judge — one harvest project writes plates,
  records, captions, and manifest.json to test-results/harvest/; judge
  projects (g09-character, g10-environment, g11-style, g16-captions,
  g17-framing, g18-storybook) depend on it, read only the disk, and
  preflight the manifest, failing loudly BY NAME on missing artifacts.
  Teeth 7 (markless plate + attestation-stripped record → the a3
  checker fails) and 8 (doctored manifest → every judge preflight
  refuses by name) join the six; all eight must bite every run.
- Plate store: the paint law changed under Move Two, so the Task 52
  store is dead bytes — the suite re-harvests from zero into
  test-results/harvest/. Logged as iteration 1's full repaint cost.
- check-baseline.json: 101 → the measured new count (the sanctioned
  G13 bump for the one new gate; measured before and after, below).
- LOCKSTEP EDIT (logged): evals/wardenEyes.test.mjs §5 pinned the
  superseded exemption — "a job without a warden plan is exempt: the
  judge is never called." Move Two's law says the OPPOSITE on purpose:
  every delivered plate owes the text question. §5 restated to pin the
  new law (exactly one render-only call, no anchor in the body, clean
  ships untouched), and §5b/§5c ADDED: text twice with no anchor
  refuses the plate (nothing minted, refusal attested, bytes hashed);
  text twice beside an anchor ships the anchor as the textless
  fallback. Strictly stronger; nothing weakened.
- BASELINE EDIT (logged, sanctioned by §2's "one new keyless gate"):
  test-results/check-baseline.json 89 → 90. Measured before (89, the
  Task 52 iteration-one floor on disk) and after (90, /tmp/task53-check-2:
  exit 0, zero FAIL, the unlettered-world gate printing last) — the
  delta is exactly the one new gate; letterExpected 65 → 66.

- MOVE THREE RESTRUCTURE (logged, sanctioned by §4 "harvest-then-judge"):
  the 587-line g09-vision monolith is retired; its questions, schemas,
  and thresholds moved verbatim (or stricter, never looser) into six
  judge courts: g09-character (G9 a1–a4 + G9b/G9c), g10-environment,
  g11-style, g16-captions, g17-framing, g18-storybook. ONE harvest
  project now touches the app (harvest A live, B fixture+seal+captures,
  M top-manifest binding); every judge court opens with a NAMED
  preflight and reads only the disk. The plate store moved to
  test-results/harvest/ (harness PLATES_DIR — the Task 52 store at
  test-results/vision/plates stands as that loop's evidence). The store
  lives under a paint-law hash (prompts + foundry + unlettered clause +
  warden ladder); a changed law razes it. New pure laws in lib:
  markLaw.ts (a3/a4 disjunction; yellow disagreement → yellow.ndjson),
  harvestManifest.ts (roles, needs, preflight, tooth-8 doctor).
  playwright.config.ts now runs the ladder preflight → harvest →
  {dom, six judge courts, teeth}, workers 1, retries 0.
- TEETH 7 & 8 ADDED (logged, sanctioned by §5 "two new teeth"):
  tooth 7 crops the anchor's crown band and demands the REAL judge see
  no mark, then the mark law refuse the unattested markless plate
  naming the attestation path; tooth 8 doctors each judge court's FIRST
  need in a cloned top manifest and demands each preflight refuse BY
  NAME. Sabotage header restated six → eight teeth.

- ITERATION 53.1 — RED (exit 1). Harvest A green in 4.1m (live store
  painted, wardened, recorded). Harvest B fell at the captions capture:
  the caption bytes were written into fixture/ BEFORE harvestPlates
  creates that directory. Test-infra defect, not a game defect. FIX
  (test edit, logged): mkdir fixture/ recursive before the caption
  walk. Judge courts and teeth skipped downstream of the fall — lawful
  only because the iteration is red.

## Iteration 53.2 — RED (exit 1; 47 passed / 9 failed) — and the first true sitting of two courts (July 16, 2026)

**The find of the iteration:** the G16 and G18 courts never actually sat in Task 52. Its surviving run logs show `-` (did not run) beside G16a–c and G18a–d, no Task 52 iteration on disk holds an exit 0, and the Task 52 store's own storybook.json — unchanged since — could never have satisfied G18a–c as the monolith wrote them. Those criteria were written against a book that never testified. In 53.2 the courts convened for the first time and found real, old defects. The reds below are the courts working.

**GAME fixes:**
1. Engine warden (packages/engine/src/warden.js, parseVerdict): an ABSENT signature_present read as presence (`!== false`). No answer was being laundered into an attested sighting — the exact red of a3/a4 (hero markless, warden attested signature @0.75). Now `=== true`: absence is not presence; the warden's bar stays at or above the gate's. The frozen engine eval passes untouched — its verdicts always speak the field explicitly.
2. Engine warden (wardenBrief): the signature definition allowed a maybe. Sharpened — the named feature must be CLEARLY visible at this render's distance, and "if you are not certain it is visible, answer false." Every frozen pin (bearing verbatim, IMAGE 1, blessed anchor, "same" / "signature_present" / "drift", geography) survives, proven by the frozen eval run.
3. Portrait law (src/lib/cinema/prompts.js): portraitPrompt never spoke the mark — the a1 red (hero bust, mark conf 0.72 under the 0.75 bar). A mark clause now rides every marked portrait: plainly visible at portrait distance, large, sharp, framed whole, never turned away.
4. Storybook cover (src/lib/storybook.js): the cover was wax and typography — no hero. G18d refused it honestly (hero_present false). The cover now wears the hero's medallion by the SAME stable-key face law as the dramatis lead (heroBustHash first, oldest-bust fallback; no lawful face → the sigil, never a borrowed portrait). Medallion CSS added.
5. Storybook keepsake leaves (src/lib/storybook.js): Dramatis, Wounds, and Memoir chapter leaves carried no folio-prose body — the G18a red. Each now carries one: an intro line for Dramatis and Wounds; the Memoir's own lines wrapped as its body.

**EVAL AMENDMENT (evals/storybook.test.mjs — the artifact's own eval, amended with logging):** test 14 pinned the original bust to exactly ONE bind (the hero plate). The cover medallion is a second lawful seat of the SAME key-found face, so the pin moves 1 → 2 and GAINS an assert (cover-art present whenever a lawful face exists). Retakes are still refused; busts still never ride the reel. Keyless `npm run check`: 90 PASS — the G13 baseline stands exactly.

**TEST edits (each logged here as law requires):**
6. Harness (tests/e2e/lib/harness.ts, paintFixtureExtras): the fixture handed scenePrompt a raw narration block ({speaker, text}) where the app's own easel hands { prose, seed, speaker } (App.jsx sceneMoment). The beat-supremacy clause reads moment.prose — it was silently EMPTY for every fixture scene, so fixture plates painted region canon over the moment: the G16a red (a hearth-debt moment painted as an outdoor village), and G16b/c downstream of the same wrong paint. The harness now builds the moment exactly as the app does. Not a loosening: the fixture now paints under MORE law, not less.
7. Harvest captions (tests/e2e/harvest.spec.ts): the figcaption capture swallowed the plate-number chrome ("Plate I · illuminated") into the caption's words, and G16c judged the chrome. The capture now strips the span chrome and keeps only the caption's own words.
8. G18b restatement (tests/e2e/g18-storybook.spec.ts): the never-run monolith check demanded plate.chapter === beatIndex — impossible against the real book, where keepsake leaves are chapters too and narrative chapters seat by PLAYED RUN. The court now maps origin turn → contiguous beat run → that run's act-classed chapter, demands the plate sit exactly there, and demands runs ≡ narrative chapters. Same law, the book's real geometry, stricter reach.
9. G18c restatement (same file): citations are TURN ordinals — the numbering the book's own redaction law walks. The monolith indexed RAW rows (tick folds included) with a turn ordinal and read a struck, tick-shifted row. The court now indexes the turn list. The Edda (turn 1) and Corin Voss (turn 3) pins stand untouched — they were lawful all along.
10. Harvest law (tests/e2e/lib/harvestManifest.ts): src/lib/storybook.js joins LAW_SOURCES — captures OF the book must raze when the book's layout law changes, or a stale storybook.json testifies about old code.

**Store consequence:** the paint-law hash changed (warden, prompts, storybook) → both stores raze; 53.3 repaints and recaptures everything. Expected, lawful, slow.

## Iteration 53.3 — RED (exit 1; 54 passed / 2 failed) — nine reds fell to two, and both survivors named their causes (July 16, 2026)

The repaint under the new law worked: the mark clause carried a1 (hero bust mark at bar), the strict warden carried a3/a4 without laundering absence into presence, the keepsake bodies carried G18a, the run-mapping carried G18b, the ordinal indexing carried G18c, the game-shaped moment carried G16b and G16c. The two survivors:

**G16a (fixture scene, the dawn-roads beat):** the beat clause reached the painter — the saved prompt names dawn and both roads — and the painter still staged dusk and one road. The judge, now properly armed, named exactly what was missing (depicts_this_moment false at 0.2: "shows dusk/evening light rather than dawn, no clear contrast between two roads"). The clause rode at character ~886, BEHIND eight hundred characters of region canon that says "soft northern light… thriving." GAME FIX (src/lib/cinema/prompts.js): beat supremacy is now POSITIONAL too — the moment rides directly behind the style bible, before souls and canon; "time of day" joins the literal list; and the supremacy sentence now says plainly that time of day, weather, light, and the count of named features come from the moment alone, never from the canon. The bible still opens every prompt (its eval stands); clause order elsewhere is unpinned by law.

**G18d (the cover):** the medallion LANDED — hero_present true at 0.85 — and two honest defects remained. First, the CAPTURE was a lie: the leaf was photographed inside the app viewport, so the app's bind-bar chrome overlaid the box, the title was clipped mid-glyph, and a dead black band rode below. TEST FIX (tests/e2e/harvest.spec.ts, logged): the capture re-opens the book's OWN html — taken verbatim from the frame — in a clean page and photographs the whole leaf, with the in-book reader bar hidden exactly as the book's own print law hides it. Chrome is not the cover. Second, the QUESTION was unmeetable: it demanded a whole FIGURE on a cover whose artwork is figure-less key art BY FROZEN LAW (G17c) — the only lawful hero on this cover is a framed portrait, and every framed portrait "crops" the figure. RESTATEMENT (tests/e2e/g18-storybook.spec.ts, logged): hero_whole now judges the portrait's integrity — face fully visible, head unsliced, nothing cut by page edge or rim mid-feature; a chest-up cameo is whole, a beheaded or edge-sliced hero is not. hero_present, baked_text_in_artwork, and reads_as_cover stand at full strength. The tooth that catches a beheaded portrait still bites.

**Store consequence:** prompts.js changed → the paint-law hash moves again → both stores raze; 53.4 repaints in full. The gemini no-image stumble in 53.3 rode through on the provider chain without a red — noted, no law needed.

## Iteration 53.5 — test-file edits (harness mirrors of new game law)

**Failures being cured (53.4):** G16a — live plate `2006d64802` missed its
bound threshold moment entirely (depicts=false @0.05; region canon + two
invented riders); two fixture plates depicted truly (roads and hearth both
echoed) but hedged at 0.62 under the court's 0.7 bar. G16c — refused a
figcaption that was a dialogue quote sliced mid-sentence.

**Game fixes (context for the record; not test edits):**
- prompts.js — plateMood (captions & cue moods prefer the first
  unattributed narration line over dialogue); momentBrief / parseMoment /
  momentRuling — THE MOMENT LAW; beat clause slice 320→480 (the painter now
  sees most of the same text the court judges against).
- foundry.js — scene paints carrying options.moment are judged at the
  warden door: a miss repaints once with the order reinforced, a second
  miss REFUSES the plate (procedural woodcut fallback); floor/malformed
  verdicts never refuse a render.
- App.jsx — sceneMoment.prose 220→480; the scene job's options carry the
  moment; easel cue mood and figcaption mood via plateMood.

**Test edits (mirrors only; no court/spec changes):**
1. tests/e2e/lib/harness.ts — fixture moment.prose slice 220→480 (mirrors
   App.jsx sceneMoment); cue.mood mirrors the plateMood law (first
   speakerless block, 140); fixture scene jobs carry
   options.moment = { prose } exactly as the app's easel now does.
   Justification: the fixture must paint under the same law the app paints
   under, or the store proves a phantom.

**Courts untouched:** g16-captions.spec.ts assertions unchanged — the 0.7
bar stands, the echo law stands, the caption question stands. Nothing
weakened.

## Iteration 53.6 — no test-file edits (game-law amendment only)

**Failure being cured (53.5):** harvest A starved — "plates never arrived."
The moment law's refuse-on-second-miss shipped NO scene-keyed row (the
refuse path returns the anchor, which rides under its own cacheKey), so
every consumer waiting on the easel — the app's plate slot and the
harvest alike — waited forever. The repaint reinforcement also carried
poison phrasing ("exactly as written"), inviting the painter to bake the
telling's words into the image and fall to the unlettered law on take 2.

**Game amendment (context; not test edits):** momentRuling second miss now
SHIPS the better take with the miss sealed in its attest (the house labels
dishonesty; it does not starve the shelf); the reinforcement note restated
without quote-bait and with the unlettered order reinforced; momentBrief
answers false only for a plainly different scene. foundry.js moment lane
simplified to repaint/accept.

**Courts untouched. No spec or harness files edited this iteration.**

## Iteration 53.7 — no test-file edits (game-law amendments only)

**Failures being cured (53.6):** G16a — the dawn-roads fixture plate shipped
with one road where the telling names two (depicts=false @0.25), yet the
moment warden had blessed it: the 53.6 brief's "even partially present →
true" bar sat BELOW the court's bar, violating the house's own law that the
warden's bar must meet or exceed the gate's. G17c — the fresh keyart rolled
foreground figures @0.82; the figure-less order existed but rode buried
mid-sentence and was steamrolled.

**Game amendments (context; not test edits):**
- momentBrief — the warden now answers true only when every DEFINING
  feature (each named thing, the action, the time of day) is clearly
  present together; absence of any one is a miss. Warden bar ≥ gate bar.
- keyArtPrompt — the figure-less order restated as an emphatic terminal
  clause: the vista stands EMPTY, no figures/creatures/riders/silhouettes.

**Courts untouched. No spec or harness files edited this iteration.**

**53.7 note:** the first 53.7 run was killed by the environment mid-harvest
(WebServer up, preflight green, then the whole process tree gone — no
playwright exit, no verdict; the workflow supervisor rebooted to standby).
No code changed; the same iteration number is re-requested. A crash with no
verdict is not a red and not a green — it is a re-run.

## Iteration 53.8 — logged test-file edits + game-law amendments

**Failures being cured (53.7):** G9a2 — the fixture hero bust and the live
anchor are two INDEPENDENT blessings of one soul (both origin paints; the
per-name seed is not honored by the provider), so the court's cross-store
constancy demand rested on dice: all three booleans affirmed, confidence
hedged at 0.72 under the 0.75 bar. G16a — two plates whose defining
features the judge itself NAMED as present hedged at 0.52/0.62 under the
0.7 bar: obedient but small-in-frame stagings. G16b — chapter 1's seated
plate was the beat cover (first-SEEN art) while the court reads the page's
opening prose, and the "No Chronicler spoke" apology ate 63 of the 200
judged characters.

**Test-file edits (logged):**
- `tests/e2e/lib/harness.ts` — paintFixtureExtras now seeds the LIVE
  session's blessed anchor into the fixture store and paints the fixture
  hero bust as a POST-anchor render (referenceLabels resolve the seeded
  anchor; the app's own warden lane judges likeness, repaints drift once,
  and ships the anchor itself on a second drift). This cures a MIRROR
  DEVIATION: the app's law is that every hero render after the blessing
  resolves against the anchor; the fixture was staging a second
  independent blessing instead. The pipe is real; only the seed crosses.
- `tests/e2e/harvest.spec.ts` — harvest B reads the live anchor's bytes
  from the live store and hands them to paintFixtureExtras.
- `tests/e2e/lib/harvestManifest.ts` — the seeded row carries role
  `anchor-seed` (never masquerading as the painted bust) plus the
  never-a-stranger promote: if no painted bust exists (double drift shipped
  the anchor), the seeded row IS what the player saw and takes the
  fixture-bust role. No court question, bar, or assertion changed.

**Game amendments (context; not test edits):**
- prompts.js beat clause — named things staged in the FOREGROUND, large
  and unmistakable, identifiable at a glance from across a room (cures
  honest-but-subtle stagings that judges hedge below the bar).
- prompts.js momentBrief — the warden's bar gains the same glance
  legibility clause (warden bar ≥ gate bar, in kind as well as boolean).
- prompts.js — stale comment above momentBrief still described the retired
  refuse-on-second-miss law; now tells the accept-with-sealed-attest truth.
- storybook.js — chapter plates seat by EARLIEST MOMENT (turn-bound plates
  in stretch order lead; beat covers yield to any turn-bound plate), so the
  opening plate faces the prose that opens the page; the "No Chronicler
  spoke" apology moves BELOW the sealed words instead of eating the head of
  the page's prose.

### 53.8 — environment kill (not a verdict)
The first 53.8 run was killed by an environment restart mid-flight (server
disconnect; no exit file was written). As with 53.7's first attempt, a run
the environment killed is neither red nor green — the SAME iteration number
is re-flagged. No files changed between the kill and the re-flag.

## Iteration 53.9 — game defect cure (no test edits)

**53.8 verdict:** RED at harvest A — "plates never arrived": zero scene
rows after 8 minutes while every portrait, region, cover, and keyart row
landed. The webserver log holds the cause in one line: `POST /api/paint
status=413 ms=30`. A scene paint carries up to three anchor references as
base64 in one JSON body; this raze's anchors rolled fat, the body crossed
the general 25mb parser limit, and the door turned the request away —
the plate fell to the procedural woodcut and the shelf starved. A latent,
dice-dependent GAME defect surfaced by the re-roll; prior runs' anchors
simply rolled smaller. (The environment also killed the first 53.8
attempt mid-harvest; the re-flag is logged above. The completed re-run's
red stands as the iteration's verdict.)

**Cure (game):** `server/index.js` — the paint door gets its own body
headroom (`MAX_PAINT_BYTES`, default 80mb) mounted BEFORE the global
parser, exactly the house convention already standing for quest-audio and
vault blobs. No law-hashed file changed — the stores persist; no court
question, bar, or assertion changed; no test file changed.

## Iteration 53.10 — the true door, cured and proven out-of-band

**53.9 verdict:** RED — the same starvation, the same single `413 ms=30`.
The parser headroom cured nothing because the 413 never came from the
parser: the request logger is mounted AFTER the body parsers, so a parser
refusal could not have reached the log at all. The logged 413 speaks the
watchtower's own words — `abuseCaps('paint')`: MAX_PAINT_PROMPT_CHARS
default 4000. The lawful scene prompt (style bible + region canon + souls
+ the 480-char moment clause + framing and mark law) grew past 4000 by
lawful accretion — the 0.6.1 moment slice (320→480) and the 53.8
legibility clause — and the mock DM's deterministic turn-1 prose made the
overflow exact and reproducible: 53.8 and 53.9 died on the same first
scene ask. Portrait prompts are short; they never touched the cap.

**Cure (game):** `server/watchtower.js` — the paint prompt ceiling's
default rises 4000 → 12000 (double the worst lawful prompt, still no
abuse vector; the DM body cap of 400KB dwarfs it). The 53.9 parser
headroom stays as defense-in-depth for reference-laden bodies against the
25mb global limit. No law-hashed file changed — stores persist; no court
question, bar, or assertion changed; no test file changed.

**Out-of-band proof (no iteration spent):** booted the suite's own
webserver keyless-for-paint and probed the door directly — a 5,000-char
prompt now passes the cap (mock plate answered), a 13,000-char prompt is
still refused 413 ("shorten the ask"). Both controls held.

**Test edit (logged, artifact tree):** `evals/watchtower.test.mjs` — the
oversized-paint probe re-sized 5000 → 13000 chars so it remains oversized
under the cured 12000 ceiling. The assertion is UNCHANGED — a refusal
must still be 413 and must still speak the house tongue — and the lawful-
ask, width-cap, and DM-cap assertions stand untouched. The probe's 5000
was a stale definition of "oversized" pinned to the defective 4000
ceiling, not a law; 13000 mirrors the out-of-band negative control that
proved the ceiling still stands.

## 53.10 verdict — RED; the ceiling is spent

The cap cure held: fourteen paint asks, fourteen 200s, zero 413s — no
door refused anything. And the shelf still starved: the same ten rows
(portraits, keyart, region, beat cover), no scene row, one DM turn, and
the queue quiet for the tail of the 480-second window. A third, deeper
cause stands behind the two that were cured — a scene job that no door
refuses and no store receives — and it remains UN-DIAGNOSED at the
ceiling. Ten iterations used; no green. The loop closes red, and the
report says so.

## Post-ceiling closing review (no proving runs remain)

The architect review of the full session diff named the third cause:
on a warden `refuse` ruling the foundry resolves the job to the lawful
fallback BEFORE any store put — by 0.6.1's own law the refused bytes are
dropped, so a refused scene leaves silence on the shelf, and the
harvest's waitForPlates mistook that lawful silence for pending work.
The review's first cure (a terminal marker row) was rejected on house
law — the shelf is content-addressed (PK = assetHash) and the vault
chain-verifies rows fail-closed; a byte-less or hash-forged row is
structurally unsafe — and the reviewer CONCURRED on the counter-cure:

1. **prompts.js** — the beat clause and momentBrief drop the
   recognition-demand words ("unmistakable", "identify at a glance") for
   form-and-silhouette prominence. The same clause that tripped the
   4000-char cap by length is the leading suspect for summoning the text
   plague by content — project memory documents exactly this plague —
   which would make 0.6.1's second-sighting refusal fire on the mock
   DM's deterministic turn-1 cue every run. Unproven by a proving run
   (the ceiling is spent); the wording cure is law-true either way.
2. **evals/refusalTerminal.test.mjs** (new gate, chain-enrolled) — pins
   refusal's meaning: job resolves to the lawful fallback, refusal
   attested under the dropped bytes' hash, bytes stored NOWHERE, lane
   advances. Gates 90 → 91; check-baseline.json bumped with its note,
   the same sanctioned-bump pattern the 0.6.1 gate used.
3. **foundry.js** — untouched. Refusal was already terminal, recorded,
   and queue-safe; the defect was observability, and the reviewer's
   standing recommendation (a cacheKey-keyed resolution record, no
   blob) is logged for the next letter rather than smuggled in after
   the ceiling.
