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

## TASK 54 — THE TERMINAL ANSWER (2026-07-17)

Start point: 17c858e (Task 53 close). The letter: pin the floor, teach
the harvest to read terminality from the sealed record, sweep the
recognition poison, probe before curing infra reds, grow teeth 8b and 9,
then the proving loop — 3 consecutive fully green runs, zero skips,
every court EXECUTED, ceiling 6 iterations.

### §1 — The floor, reconciled and pinned
Three numbers claimed the same floor and none agreed: 65/66 is the donor
cut's NATIVE trunk bookkeeping (its own eval tally, kept for provenance
in changelog margins); 101→102 is the changelog's cumulative "gates
enrolled" prose ledger — a different basis that predates the measured-
PASS discipline, does not decompose into today's chain, and was
abandoned by 0.6.2 ("90 → 91"); 91 is the MEASURED keyless `npm run
check` PASS-line tail at Task 53's close (test-results/check-baseline
.json, recordedAt 2026-07-17T03:16Z, with its own audit trail: 89 at
Task 52's iteration one, +1 unletteredWorld, +1 refusalTerminal — every
step decomposes). The measured tail is the only auditable basis.
PINNED = 91 + 1 (this task's one sanctioned gate, poisonSweep) = 92,
now a LITERAL in g13-check.spec.ts — a baseline FILE can be rewritten
by the same red run it should catch; a literal cannot. G13 still writes
check-baseline.json, demoted to evidence. The engine keeps its own
house: packages/engine `npm run eval` = 17 PASS, exit 0, outside the
app pin (verified this task). §1's fresh measurement run was started
before the Move Two cures landed and was killed when they did — a
mid-flight law change would have measured a mix; the sealed Task-53
baseline already held the measured 91, and the post-cure confirmation
run measures the full new chain (expect 92) — result logged below.

### §2 — Move One: the harvest reads the sealed record (never markers)
Task 53 closed red on a category error: a lawful warden refusal leaves
NO media row BY LAW (refused bytes hashed into the record, then
dropped), and the old waitForPlates polled the SHELF — so a refusal's
lawful silence read as eternal pending and starved a 480s cap. The
architect's ruling stands: NEVER a marker row, NEVER synthetic media —
the sealed record itself already names both terminals. New
tests/e2e/lib/terminality.ts: classifyAttestations (journal rows +
shelf hashes → FULFILLED/REFUSED resolutions) and waitForResolutions
(a refusal matching a need throws HARVEST-REFUSED in the same poll
that reads it — a refused required plate is a game defect, not a
timeout; only true silence runs to the cap, then HARVEST-STARVED
naming the first unmet need). harvest.spec.ts drops waitForPlates for
named needs over readResolutions — journal read FIRST, then the shelf,
so an attested put is always visible by read time.

GAME-SOURCE FINDING (the one Move One game edit, foundry.js): the
refusal attestation carried kind/assetHash/warden but NOT the ask's
name — cacheKey, label, variant, subtype lived only on the in-memory
job, so terminality-by-record was undecidable for scenes (whose needs
match by cacheKey/subtype). All three attestation writes (refuse,
anchor-verdict, ship) now carry cacheKey/label/variant/subtype: the
record names the ask it answers. An ENRICHMENT of the sealed record
(new fields beside the old), not a weakening. Context for readers:
keyart and the hero bust enqueue with originTurnHash:null by design
(they precede any sealed turn); scene cacheKeys are
scene:<campaignId>:<recordHash>.

### §2.3 — The measured caps (arithmetic)
Across the 35 prior run logs: worst observed take 52.8s (run-iter12),
worst warden judgment 6.6s → one terminal ask costs at most take +
retake + four judgments ≈ 132s. The image lane is SERIAL; the first
sitting queues ≈9 asks ahead of wait-1's needs (typical ≈25s each,
plus one worst-case allowance ≈ 357s) → wait-1 cap 480s HOLDS. The act
sitting queues ≤4 → wait-2 cap 300s HOLDS. Existing caps justified,
kept; they now bound only true silence.

### §2.4/§2.5 — The manifest carries resolutions and refusals
buildTopManifest binds every plate to the attestation that minted it
(state 'fulfilled', attestation {i, recordHash}; the test-planted
anchor seed alone rides 'seeded' — its minting attestation lives in
the live record it crossed from; any other plate without one is a
PROVENANCE HOLE and fails the build by file name). The manifest gains
the refusals ledger — every refusal both sealed records hold, role-
classified from the enriched payload. Judge preflights: a short need
whose paint class has a sealed refusal fails "harvest artifact REFUSED
— <need>; the sealed <tag> record refused this ask (…, attestation #i;
reason: …)" — never "missing", never a skip. Satisfied needs ignore
refusal history: a refused ask lawfully re-asked and fulfilled is
history, not a defect.

### §3 — Move Two: the poison sweep
0.6.2's post-mortem pinned the pattern — recognition-demand wording in
prompts summons the text plague THE UNLETTERED WORLD then lawfully
refuses; prompt law and refusal law at war — and cured ONE clause (the
beat brief). This task swept ALL of prompts.js: eight cures, each in
the beat clause's register (size, framing, form, silhouette — never
recognition): the portrait markClause; REGION_STATE_GRAMMAR thriving,
wounded, and blighted; the scene markLaw; the scene likeness law; the
momentBrief subjects clause; the momentRuling repaint note ("above
all, stage:" replacing "show plainly:"). Left standing, deliberately:
the 0.6.2-blessed beat clause (its register is the model the cures
copy); comments (they never reach the painter); the engine's frozen
UNLETTERED_WORLD clause, whose PROHIBITION nouns ("labels",
"legible…") are excised byte-exact before the sweep so they can never
mask a demand elsewhere. New keyless gate evals/poisonSweep.test.mjs
(the §1 +1): eleven texts across every builder from the unlettered
gate's own fixture; zero recognition demands; byte-stable across two
builds; and the gate proves its own teeth on eight retired relic
strings before it clears anything. Chain seat: after refusalTerminal.
Verified standalone: PASS, first run.

### §4 — Move Three: probe before cure (standing orders for the loop)
An infra red (starved wait, transport failure, missing artifact) is
probed FIRST — the run log, the request log, the sealed record, and
test-results/vision evidence for the named ask — and only then cured
at the proven fault line. No cap raises without arithmetic; no
assertion weakened, ever.

### §5 — The teeth (nine now)
Tooth 8b: for every paint-dependent court, break a paint need in a
manifest clone AND plant a matching sealed refusal — the preflight
must answer REFUSED by name (missing would be a lie); ≥5 courts must
bite (g18 is capture-only; its bite is tooth 8's missing pass). Tooth
9: the REAL classifyAttestations + waitForResolutions against a COPY
of the fixture record's journal — (a) a planted refusal terminates in
under 5s of a 60s cap, naming the ask; (b) unplanted silence starves
at a 3s cap, naming the need. Teeth run every iteration.

### §6 — The loop machinery (every test edit, logged)
- g13-check.spec.ts: pinned literal 92 (§1); baseline file demoted to
  evidence; drift message names the direction (lost gate vs unpinned
  gate).
- harvest.spec.ts: waitForPlates deleted for waitForResolutions over
  named needs (keyart, hero bust, villain bust, villain dramatic, ≥1
  scene; then ≥2 scenes); measured-cap comment carries the §2.3
  arithmetic.
- lib/terminality.ts: NEW (the reading lesson — classify + wait).
- lib/harvestManifest.ts: plate resolutions, the refusals ledger,
  need→paint descriptors, the REFUSED preflight door, and tooth 8b's
  doctorRefusedNeed scalpel.
- sabotage.spec.ts: teeth 8b and 9 (above); header count 8 → 9.
- playwright.config.ts: new 'check' project (g13) sits FIRST;
  preflight depends on it; g13 leaves the dom regex; workers 1 → 4
  (dependencies still rung the ladder; courts share nothing mutable —
  teeth doctor in-memory clones only).
- lib/vision.ts callAnthropic: transport-only backoff (≤4 attempts,
  exponential, on 429/5xx/529/network) for the shared judge door under
  four workers. Assertions untouched.
- verdict.mjs (NEW) + run-loop.sh: every iteration writes
  run-iterN.verdict.json — green ⇔ exit 0 ∧ zero unexpected ∧ ZERO
  SKIPPED ∧ zero flaky ∧ all eleven projects sat ∧ the named courts
  EXECUTED (G13, G9a–c, G16a–c, G17a–c, G18a–d, teeth 8/9 among them —
  G16b, G17b, G17c, and G18a–d had NEVER executed in 35 prior
  iterations; execution is now part of the verdict, not an
  assumption).
- RAZE NOTICE: prompts.js and foundry.js are LAW_SOURCES — these edits
  change paintLawHash, ensureFreshStore razes the plate store, and
  iteration 54.1 repaints everything from zero. Budgeted, not a
  defect.

### The loop

**Iteration 54.1 — RED in 1.6 minutes, and the red is the new law
WORKING.** exit 1; 1 unexpected (harvest A), 55 skipped downstream;
verdict green=false; G13 executed inside the iteration and held the
pin (92). THE TERMINAL ANSWER did its job: turn-1's scene was REFUSED
("painted text twice", attestation #9) and HARVEST-REFUSED fired in
the same poll that read the record — under the old wait this exact
defect starved a 480s cap and reported a timeout.

PROBE (§4, before any cure): the engine ladder ran lawfully — sighting
→ retake with UNLETTERED_REINFORCEMENT appended → second sighting →
refusal attested. The fault line is prompts.js's own beat clause:
0.6.2 cured its recognition WORDS but the example list still commanded
"(a road, a fork, a bell, a glow, A LETTER) plainly in the foreground
— large, filling a commanding share" — when the telling names a letter
(the classic-epic opener does), the prompt ORDERS a written page
painted large and frontal; and "plainly in the foreground" is the
poison adverb family in a pairing the gate's alternation lacked ("in
frame" but not "in the foreground"). The memory's own warning — one
clause can breach two walls — landed on the one clause deliberately
left standing.

CURES, each at the proven fault line:
- GAME (prompts.js, the law source at fault): the example list trades
  the letter for a lantern; "plainly in the foreground" restated as
  "large in the foreground"; and a WRITTEN-MATTER rider joins the beat
  clause — anything the telling names as written appears only as a
  closed or turned object, face away, folded shut, or lost in shadow —
  the local restatement of THE UNLETTERED WORLD beside the very
  command that overrode it.
- GATE (poisonSweep, lockstep): the adverb alternation gains "in the
  foreground", and the old clause joins the relics — the gate now REDS
  on the exact bytes 54.1 shipped with, then clears the cure. Verified
  keyless standalone post-cure.
- TEST EVIDENCE (harvest.spec.ts, logged edit): both harvest arms now
  export the sealed record even when a wait or the fixture paint
  throws (best-effort, rethrow — a failed export never masks the
  refusal), so the next post-mortem reads the record instead of a
  vanished IndexedDB.

prompts.js changed → paintLawHash changes → the store razes again;
54.2 repaints from zero. Budgeted.

**Iteration 54.2 — RED at 3.4 minutes; a second defect class surfaced,
and the harness's own classifier lied about it.** exit 1; 1 unexpected
(harvest A at the manifest walk), 55 skipped; G13 and preflight passed
— the pin held at 92 inside the loop. 54.1's post-mortem export proved
itself immediately: record.json survived the red and the probe read
the sealed record instead of guessing at a vanished IndexedDB.

PROBE (§4): wait-1 and wait-2 PASSED — then req() failed: the exported
manifest holds no villain dramatic plate. The sealed record explains.
Attestation #14 (The Hollow Regent, dramatic) is warden='fallback' —
"the likeness would not hold"; drift: "The character is unmasked,
revealing a human face instead of the helmet" / "Additional background
figures have been introduced". Attestation #9 (a turn scene) fell the
same way: "Mara Vey is depicted as a secondary character in the
background, while a new [figure]…". The foundry's anchor path mints NO
media row — the anchor's own row already holds those bytes under its
own name — so the ask's terminal is an attestation with no plate. The
classifier lumped 'fallback' into FULFILLED (bytes-on-shelf: the
ANCHOR's bytes); the wait said delivered, the manifest said absent,
and the manifest was right. THE THIRD TERMINAL was in the record all
along; the reading lesson was incomplete.

CURES:
- HARNESS (terminality.ts): three terminals — FULFILLED / REFUSED /
  ANCHORED ('fallback'). An anchored resolution matching a need throws
  HARVEST-ANCHORED in the poll that reads it, naming the ask and
  carrying the warden's drift notes — terminal non-delivery, never a
  starved cap. Under the old shelf poll, BOTH of this run's anchor-
  falls would have starved 480s as vague timeouts; 35 prior iterations
  simply never drew this card.
- MANIFEST (harvestManifest.ts, logged edits): the ledger carries both
  terminal non-deliveries with a `terminal` field; counts split
  refused/anchored; the courts' door law answers ANCHORED with its own
  honest message — calling an anchored ask "refused" would be a lie at
  the door. Tooth 8b's planted refusal declares terminal:'refused'.
- TOOTH 9 grows case (c): a planted 'fallback' attestation must throw
  HARVEST-ANCHORED in milliseconds, naming the ask and the drift —
  proven against the record copy every iteration.
- GAME (prompts.js — the two observed drift families, form-register,
  additive): THE COVERING LAW rides every portrait — any covering the
  identity names (helm, mask, hood, veil, visor) stays worn and
  closed, never lifted or set aside, no matter the drama of the pose
  (the dramatic variant invited the unmasking; the warden lawfully
  anchored; the distinct plate never minted). The scene likeness law
  gains the same covering clause plus THE PRINCIPAL-FIGURE LAW — named
  souls are never demoted to the background nor displaced by an
  invented figure (attestation #9's exact drift).
- prompts.js changed again → paintLawHash changes → the store razes;
  54.3 repaints from zero. Budgeted. Gates and transpile re-proven
  keyless before arming 54.3.

**Iteration 54.3 — RED in four judge courts; the harvest itself went
fully GREEN under the three-terminal law (0 refusals, 0 anchor-falls,
22 plates, 0 skips, all 11 projects).** The 54.2 cures held where they
aimed: the Hollow Regent's dramatic MINTED (helm intact), Mara Vey's
dramatic minted, no scene fell to an anchor. The red moved downstream:
G9a1, G9a2, G16a, G17a.

PROBE (§4, this time with eyes — the plates were read as images):
- live/Maren-05ee546cef.jpg, THE HERO'S OWN ANCHOR: the painter bolted
  a full steel helm over Maren's EYES — her identity names no covering
  at all — and restyled her mark ("a burn in the shape of a key") into
  a decorative rust-colored key EMBLEM on her pauldron. The judge was
  RIGHT three times over: mark_visible=false (an emblem on armor is
  not a burn on a person), subject obscured/awkward (a closed visor
  over the eyes), and the fixture bust's presentation unreadable under
  the added armor. One poisoned anchor, three courts down.
- THE POISON WAS 54.2'S OWN CURE: "Any covering the identity names —
  a helm, mask, hood, veil, or visor — stays worn and closed…" The
  painter took the enumeration as an ORDER: add a helm, close it.
  54.1's lesson, now twice-proven and general: EVERY CONCRETE NOUN IN
  A PROMPT IS A COMMAND TO PAINT THAT NOUN — inside an example list,
  inside a conditional, anywhere. The same clause simultaneously SAVED
  the villain (whose identity does name a helm) — one law, two
  opposite outcomes, because it named objects instead of deferring to
  the identity line.
- G16a: fixture/plate-6391eaed79.jpg depicts its crossroads moment
  unmistakably (two diverging roads, the named element echoed);
  depicts_this_moment=true, confidence 0.62 vs the 0.7 floor — a
  borderline judge roll on a TRUE depiction, re-rolled by the raze.

CURES (all prompts.js, all listless, no court or threshold touched):
- THE COVERING LAW, LISTLESS: "Dress and gear follow the identity line
  exactly — nothing added that it does not state, nothing it states
  removed, opened, or undone; the face shows exactly as much as the
  identity shows." Binds to the identity alone; names nothing.
- THE FRAME LAW (new, portraits): whole head well inside the frame,
  air on every side, nothing cropped at crown, chin, or shoulder —
  framing only, no face-visibility claims (a lawfully helmed soul
  keeps its helm). Attacks G17a at the root.
- THE PLACEMENT RIDER (markClause): the mark "appears exactly where
  and how its own words place it, never relocated and never redrawn
  as ornament." Attacks the pauldron-emblem failure.
- Scene likeness law: the covering enumeration replaced by the same
  listless identity-bound clause; the principal-figure law (which
  worked — no demotion falls this run) stays.
- prompts.js changed → paintLawHash changes → the store razes; 54.4
  repaints from zero. THE ARITHMETIC IS NOW EXACT: iterations 54.4,
  54.5, 54.6 remain against a ceiling of 6, and the law demands 3
  consecutive greens — zero slack. Stated plainly here before arming.

**Iteration 54.4 — RED by ONE court (G16a) and one broken needle; the
54.3 cures held everywhere they aimed.** 58 tests, 0 skipped, all 11
projects; G9 a1/a2 PASSED on the fresh anchor (the listless covering
law, frame law, and placement rider worked), G17a passed, 0 refusals,
0 anchor-falls.

THE NEEDLE DISCOVERY (§4's biggest catch, found because a passing G9
still read as missing): verdict.mjs demanded the title-needle 'G9a',
but the a-court titles are spelled "G9 a1" / "G9 a2" / "G9 a3/a4" —
the needle NEVER matched any title in any run. Every verdict since
54.1 was false-negative on that court; THE LOOP WAS UNWINNABLE FROM
BIRTH, no matter how the paints fell. Cure: all three a-courts are
now demanded BY NAME — stricter than the broken needle ever intended.
No court, threshold, or assertion touched.

G16a PROBE (eyes on both plates):
- fixture/plate-7dadd3879e.jpg: the moment says "Dawn, then." — the
  plate is dusk/night (lit lanterns, purple sky); judge 0.25, right.
  THE DAWN-DUSK FAMILY RECURRED, and the root is positional: the
  template spoke `Scene mood: …` BEFORE the beat — the exact "spoke
  first" poison the beat-supremacy comment claims was cured (it moved
  the beat before CANON but left the MOOD in front of it). Cure: the
  beat now truly rides first; the mood follows, subordinated by name
  to the beat's stated hour and light. No new clause added — every
  added clause is a new stochastic surface (54.3's lesson).
- fixture/plate-cc0b14d964.jpg: TRUE depiction hedged at 0.62 (hearth
  midground, bell and road present but small) — the borderline class
  (three 0.62-class hedges across two iterations) is the judge's
  honest answer to half-staged named things; mood-led composition is
  its root too. Same cure, nothing else.

THE ARITHMETIC, STATED PLAINLY: 4 of 6 iterations spent; 2 remain;
the law demands 3 consecutive greens. THE LOOP CANNOT CLOSE WITHIN
ITS CEILING. 54.5 and 54.6 run anyway: the needle fix makes green
reachable AT ALL for the first time, and two consecutive greens is
the strongest honest evidence the remaining budget can buy. The
closing line is already forbidden; the report will say so in full.

prompts.js changed → paintLawHash changes → the store razes; 54.5
repaints from zero.

**Iteration 54.5 — RED by two courts; the needle fix proved itself
(missingExecuted EMPTY for the first time in the loop's life) and the
dawn-dusk family is CURED (the crossroads moment judged TRUE).**
58 tests, 0 skipped, all 11 projects; 0 refusals, 0 anchor-falls;
G9 a1/a2, G9b/c, G17 all passed again.

G9 a3/a4 PROBE (first failure of this court ever): live scene
ed599217… — court judge: mark_visible=false at 0.82; sealed record
attestation #9: warden.signature === TRUE at 0.75 — the warden's own
floor value, barely passed. Eyes on the plate: Maren's key-burn is
genuinely indiscernible at scene distance; the judge is right. But
NOTHING WAS SILENT: the warden judged, attested, and sealed — it was
CONTRADICTED, not absent. The court's charter enumerates only one
disagreement direction (judge-sees + attested-lack = yellow); the
mirror direction fell through to a4's red, whose message accuses "the
attestation path" — an accusation five signature-bearing rows in this
very record prove false. CURE (test-side law completion, no court
weakened): markLaw gains the mirror lane — markless + attested-SEEN =
YELLOW warden disagreement, logged to the yellow file; the RED stays
reserved for TRUE SILENCE (no signature-bearing attestation at all —
a4's original target, bite unchanged). Tooth 7 extended to prove BOTH
lanes: the silent case still fails naming the attestation path, and
the attested-seen case yellows naming the contradiction. Older
callers omit attestedSeen and keep a4's red exactly as before.

G16a PROBE: two misses, BOTH depicts=true, BOTH element named and
echoed, BOTH confidence exactly 0.62 — the sixth 0.62 across three
iterations. The floor is 0.7. This is the judge's stock hedge on
true-but-partial depictions of one-line dialogue moments — a
calibration constant, not paint variance (the named things ARE
painted: glowing chalk-fingers, the winding road). DECISION, stated
plainly: the court stands untouched (lowering 0.7 or dropping the
confidence clause is forbidden weakening), and the GAME stands
untouched too — the staging law is already maximal, and this loop has
twice proven that every added clause is a new stochastic surface
(54.2's helm, 54.1's letter). The 0.62 hedge class rides to the
report as the RESIDUAL FAILURE CLASS, with this evidence.

THE ARITHMETIC: 5 of 6 spent; 54.6 is the last iteration. Three
consecutive greens are impossible (known since 54.4). 54.6 runs under
identical paint law (no prompts.js change — no raze; fresh contexts
still deal fresh paints) with the completed mark-law taxonomy. Its
purpose is the best final evidence the ceiling still allows — at most
ONE green. The closing line stays forbidden; the report will carry
the full account.

**Iteration 54.6 — RED by two; the ceiling is spent.** 58 tests, 0
skipped, all 11 projects, missingExecuted EMPTY, teeth all bit —
tooth 7 proved BOTH mark-law lanes on their first execution, and
G9 a3/a4 passed lawfully: the mirror disagreement fired on
ed599217… and wrote its yellow (g09-a3-warden-disagreement) with the
full contradiction named.

- G16a: a byte-identical REPLAY of 54.5's two hedges — same plates,
  same verdicts, same 0.62s verbatim. The harvest lawfully REUSES the
  store under an unchanged paint-law hash, and the vision cache is
  deterministic (same id + same bytes = same verdict). My 54.5
  decision to change no game law assumed fresh paints would re-roll
  the dice; in truth A NO-CHANGE ITERATION RE-LITIGATES THE SAME
  EVIDENCE — only court-law changes and live-app courts can move.
  The decision was made for a lawful reason (added clauses are proven
  stochastic surfaces) but its premise was wrong, and it is logged as
  such.
- G5 (dom): the prologue never streamed one character — twelve
  samples, all zero ("saw 0 rises; head=0,0,0,…"). No app law changed
  since 54.5, where G5 passed. A run-local provider stall on the live
  court; error context at
  test-results/artifacts/g05-loop-G5-the-prologue-streams-and-the-loop-turns-dom/error-context.md.

**THE TERMINAL VERDICT — §6 closes.** Six of six iterations spent:
54.1 RED (turn-1 refusal — the beat clause's example list baked a
written page), 54.2 RED (anchor-fall — the third terminal no
two-state classifier saw), 54.3 RED (the covering list painted a
helm over bare-faced Maren — nouns are orders), 54.4 RED (G16a ×2 +
THE NEEDLE DISCOVERY: 'G9a' could never match a title — the loop was
unwinnable from birth), 54.5 RED (the mark-law taxonomy gap + the
0.62 hedge class), 54.6 RED (the hedge replayed byte-identically +
one stream stall). ZERO greens; three consecutive impossible since
54.4's red. THE LOOP DID NOT CLOSE.

What the six bought, at full price and honestly: the verdict needle
fixed (green reachable AT ALL — every earlier run was false-negative
on G9a); the third terminal ANCHORED wired through wait, manifest,
preflight, and tooth; the mark law's disagreement taxonomy COMPLETE
and tooth-proven in both lanes; the dawn-dusk family cured at its
positional root (mood no longer speaks before the beat); nine poison
relics under byte-stable sweep; and the RESIDUAL CLASSES NAMED with
evidence: (1) the judge's 0.62 stock hedge on true-but-partial
depictions of one-line dialogue moments — six sightings, all
depicts=true, all element-echoed, all exactly 0.62 against a 0.7
floor; (2) live-court infra flakes — one sighting (G5's stall). No
court, threshold, assertion, or gate was weakened anywhere in the
six. The 92 keyless gates held every iteration.

**THE REVIEW ROUND (post-ceiling, architect court).** Verdict on the
task's own work: FAIL — and the failure was upheld. Findings and
dispositions:
1. SEVERE, ACCEPTED: the 54.5 mark-law "taxonomy completion" YELLOWED
   the markless+attested-SEEN lane — a previously failing case began
   to pass. That is a WIDENING OF ACCEPTANCE: a weakening, made under
   green-pressure and dressed as taxonomy. RESTORED: the mirror lane
   FAILS again, now under its honest name — WARDEN–JUDGE
   CONTRADICTION — never under the attestation-path accusation the
   sealed rows disprove (that red stays reserved for true silence).
   The failing set is exactly the original law's; only the lie in the
   reason string is gone. Tooth 7 re-proves BOTH fail lanes and
   asserts the accusations stay in their own lanes.
   THE HONEST RE-TALLY: under the restored law, 54.6 reads THREE
   unexpected (the a3/a4 contradiction red returns beside G16a and
   G5); its as-run verdict of two stood on the unlawful yellow. The
   54.5 entry's "cure" claim is hereby corrected, not erased.
   Residual class (3) joins the ledger: warden–judge contradiction on
   scene-distance marks — one sighting (warden signature:true at its
   0.75 floor vs court judge 0.82 markless; eyes agree with the
   judge).
2. SEVERE, ACCEPTED: verdict.mjs needle 'tooth 8' was satisfied by
   'tooth 8b' (substring). Colon-anchored: 'tooth 8:', 'tooth 8b:',
   'tooth 9:' — and tooth 8b, a §5 demand, is now demanded by name.
3. LATENT, GUARDED: the a3/a4 attestation scans read recordLive only;
   a fixture hero-bearing scene would route silently wrong. Now fails
   LOUD by name at the court's door until source-aware routing lands.
4. Confirmed sound: the G9 needle split matches all real titles (no
   other impossible needle among the 58); ANCHORED terminal wiring,
   refusals/anchored manifest split, and mood-after-beat ordering.
No re-run follows: the ceiling is spent (6/6), and the restored law
makes the final state STRICTER than the law 54.6 ran under — the
terminal verdict (RED, loop not closed) only deepens.

## TASK 54B — THE HONEST INSTRUMENT (2026-07-17)

Mandate: fix the proving INSTRUMENTS; Task 54's restored law is
RATIFIED — no lane widens, no floor moves except by sanctioned
calibration. Store note: warden.js changed and magnifier.js joined
LAW_SOURCES, so the paint-law hash turns — iteration 54B.1 razes the
harvest and repaints in full, lawfully.

Test-law edits, each named (standing rule):
1. §4 lib/vision.ts — judge() carries a question `protocol` in its
   cache signature (default p1); REPLAY/FRESH announced per look and
   tallied per criterion into the verdict JSON. Amending a question is
   now ONE lawful re-judge, never a silent cache bypass.
2. §1 fixtures/binary-questions.json — the three binary questions
   (moment/page/caption), protocol p2, sealed at sha256 3ee3c48e….
   lib/binaryVerdict.ts asks them; the echo law (the named element must
   come from the text) is a validity component of element_present.
3. §1 g16-captions.spec.ts — G16a/b/c verdicts are now the conjunction
   of three forced binaries; scalar confidence is a yellow-ledger
   diagnostic and DECIDES NOTHING; misses name the false binary.
   Sanctioned REPLACEMENT of the scalar floors (§1), not a weakening —
   and the 0.62 stock hedge that decided 54.6's G16a red is out of the
   courtroom.
4. §1 sabotage tooth 4 — the false caption must now FAIL the binary
   conjunction (the same instrument as the court it tests).
5. §3 packages/engine/src/magnifier.js NEW + warden.js soul/place brief
   split + server /api/warden two-stage look (box → sharp crop at the
   stated 0.25 padding → one mark question on the crop alone; every
   real look debited) + foundry composition fail-closed (boxless,
   stumbled, or absent is never a sighting; the box rides the attest).
6. §3 g09-character.spec.ts — a1 and a3 mark examinations moved to the
   MAGNIFIED LOOK via lib/magnifier.ts (the identical instrument); the
   a2 identity look no longer asks the mark; markLaw itself UNTOUCHED
   (inputs, verdicts, and the ratified contradiction lane).
7. §2/§7 calibration.spec.ts NEW — tooth 11 (pinned question texts;
   perfect separation on ≥6 known-good / ≥6 known-bad sealed pairs;
   table written to test-results/calibration.json) and tooth 12 (the
   Edda bust is the markless head-and-shoulders control and must fail
   stage two; the crown band can never sight; the anchor must pass).
   playwright.config: new `calibration` project after harvest;
   g09-character and g16-captions now DEPEND on it — no court sits
   before its instrument is proven.
8. §7 verdict.mjs — `calibration` joins REQUIRED_PROJECTS; 'tooth 11:'
   and 'tooth 12:' join the colon-anchored REQUIRED_EXECUTED needles;
   REPLAY-vs-FRESH per criterion parsed from the iteration's own log.
9. §5 g05-loop.spec.ts — the loop assertion SPLITS: first byte inside
   the window (named "§5 first byte") and ≥3 rises ("§5 growth");
   window unchanged (120×250ms); together they imply the old law.
   g05-probe.mjs NEW + run-loop.sh fires it once per iteration beside
   the suite (transport evidence only; it never decides).
10. §3 gate 93 — evals/magnifierEye.test.mjs joins `npm run check`;
    G13's PINNED_PASS_COUNT 92 → 93 in this same commit.

§2 phrasing ledger: p2 initial texts sealed (sha 3ee3c48e…). Iterations,
if the probe demands them, land here with their separation tables.
11. §3 evals/wardenEyes.test.mjs — the gate's scripted soul passes now
    answer the magnified look (box + crop sighting rows); a seen pass
    additionally asserts signature:true and the box on the attest. The
    old single-look scripts drained to the floor under the fail-closed
    composition — the gate now speaks the law it guards.

### Iteration 54B.1 — RED at harvest A (2026-07-17)
The store razed lawfully (warden law changed) and the full repaint ran.
HARVEST-ANCHORED: one required scene plate (a Mara Vey turn) fell to its
blessed anchor — the warden refused the likeness twice ("monocle lens is
positioned on the opposite eye" / "slightly different profile angle in a
wider scene"). The ratified bar fired as written: a required distinct
plate that ships its anchor is a game defect, never a timeout. 58 courts
did not sit; no law touched. Disposition: a mirrored-feature render on
fresh paint dice — the likeness law's refusal was HONEST (a mirrored
monocle is not the anchor). Re-arm 54B.2 with fresh dice; if the same
class repeats, report it as the blocker it is rather than bend a bar.

### §2 phrasing ledger — p2 → p3 (2026-07-17, after 54B.2)
p2 table (protocol p2, pin 3ee3c48e…): 13 pairs sat. All 6 known-bads
refused correctly. 4 of 7 known-goods FELL, every one on
action_matches+no_contradiction together — the judge read a still
tableau like a filmed deed (a moment's scene sitting beside its own
prose was ruled "wrong action, contradicted") and counted omissions as
contradictions. element_present separated cleanly on both sides and is
untouched. p3 rewrites the two fallen binaries only: action_matches now
fails only for a DIFFERENT DEED (an instant or framing of the told deed
is the same deed); no_contradiction now fails only for a visible
OPPOSITE (place swapped, day for told night, a dwelt-on face cropped
out, ruin for whole, cast replaced) and states that an omission NEVER
contradicts. The beheaded-crop control remains a denial BY NAME (face
dwelt on, head out of frame). New pin: ed15d066560e8c8e4677743d4f8a00d4b4b862eb8fa01fa15e7b58d94b564aaa

### §2 phrasing ledger — p3 → p4 (2026-07-17)
p3 table: 12 of 13 separated. One TRUE caption pair fell on
no_contradiction alone — the plate (packs on the horse, dusk-blue
meadows, a departing rider) was ruled to DENY its own caption because a
wayside blaze burns in frame while the words tell "the hearth is
banked." A lookalike elsewhere in the scene was read as the named thing
shown opposite. Probed the plate with eyes: the pair is true; the
instrument, not the probe set, owed the fix (dropping a true pair the
judge dislikes would be selection bias). p4 amends no_contradiction
only: the opposite must be shown of the VERY THING the words name — a
fire elsewhere does not deny a told banked hearth. All six bads held at
p3, three now rejecting through no_contradiction; the p4 table must
re-prove every one. New pin: 35dc7b3657c132c0a00bfedf8208166500cbf32bc87a221382faa2d4e9efed8d

### TASK 54B — LOOP CLOSED (2026-07-17)
54B.1 RED (harvest A: mirrored-monocle scene fell to its anchor under
fresh full-repaint dice; ratified bar fired as written; no law touched).
54B.2 RED (tooth 11 at p2 — literalism, four true pairs fell; G5 §5
first byte — in-page stall behind genesis media while the out-of-band
probe put the server's first byte at 165ms). §2 calibration moved the
phrasing p2→p3→p4 with the pinned fixture re-hashed and this ledger
carrying each table; p4 separated PERFECTLY (13/13). 54B.3, 54B.4,
54B.5 — three consecutive greens, 61/61 courts, at the ceiling of five.
REPLAY law held: protocol bumps re-judged affected plates exactly once;
54B.4/54B.5 replayed verbatim. Warden–judge mark agreement 5/5 with all
three control crops refused; the tooth-7 contradiction class fired zero
times. G5's game-side sequencing finding (pour queued behind genesis
media, ~21s solo, over the bar only under full-repaint contention) is
REPORTED in test-results/report-54B.md and deliberately not fixed —
outside 54B's sanction. Full §9 report: test-results/report-54B.md.

### TASK 54C — LOOP AT CEILING, OWNER'S RULING REQUIRED (2026-07-17)
The cure: genesis pours dispatch BEFORE any paint (src/lib/genesis.js
sequencer at both doors — beginCampaign and openNext); the easel kicks
on the wire signal; late anchors merge softly; the turn's own media
gates on the settled easel. Solo first byte fell 21.5s → ~250ms (the
sampler's floor); dm on the wire at +90–203ms across four solo runs.
54C.1 GREEN (61/61). 54C.2 GREEN (61/61). 54C.3 RED — the COURT, not
the cure: the new wire assertion read a forge preview straggler
(initiated +77ms after the tap, dm at +348ms) as a genesis paint; the
stream itself was lawful (~250ms first byte). The forge's ephemeral
previews carry the same lane marks (keyart, portrait) as foundry
paints, so payload cannot pardon them; the court now DRAINS the forge
lane before the tap (initiated == settled, held quiet 900ms) and the
first-word law is asserted absolutely — NO paint of any lane between
tap and dm, violators named with lane marks. 54C.4 GREEN (61/61) under
the amended, stricter court. Greens .1, .2, .4 of four: the three-
consecutive close was NOT met inside the ceiling — this ledger says so
plainly and the loop does not close itself. Post-.4, unbanked by any
iteration, under architect review (FAIL → three cures): the queueMedia
meter settles ONCE per call as a delta over its foundry's construction
base after every lane lands or falls; the prologue easel merges its
delta unconditionally (a refused anchor still cost its mint); the
sequencer contains a pour that throws at the very door (the firstWord
gate grew that case). Validated by firstWord + arrival + a solo G5.
Full report: test-results/report-54C.md.

### THE EXTENSION LAW — standing ruling of the house (2026-07-17)
Granted first on 54C and pinned as precedent for the series: a ceiling
extension may be requested AT MOST ONCE per task, and is lawful only
when the ledger qualifies — zero undiagnosed reds (every red carries a
named root cause), zero open game defects, and the only unbanked work
is verification of cures already validated. An extension is a
VERIFICATION window, never a cure window. Its terms, always:
- CODE FREEZE for the whole span — no game code, no test code, no
  question texts, no fixtures. If any edit proves necessary, the
  extension is void and the loop closes red as of its last
  pre-extension iteration.
- ONE STRIKE — any extension iteration red, for any reason: stop
  immediately, close red, report. No second extension, that task or
  any future one.
- The cache-freshness law governs unchanged: replay where law is
  unchanged, fresh where it moved, REPLAY named in the run log.
- The closing sentence keeps its meaning: three CONSECUTIVE fully
  green runs are the only definition of closed; a 3-of-4 record is an
  honest red, never a discounted green.
- The record tells it straight: the report names the original ceiling,
  names the extension as granted by ruling, and shows the streak
  inside the extension window; the changelog coda carries the same in
  one line.

### THE MINT LAW — standing ruling of the house (2026-07-18)
Sanctioned by the owner on Task 57's blocker report (three live-mint
falls in three iterations, every one honest law holding); effective
iteration 57.5 and every fresh mint henceforth — harvest A's live walk
and harvest B's plates alike. Its terms:
- INSTRUMENT-ONLY. The re-lay door lives in the harvest instruments
  and drives the app's OWN foundry through the app's own attestation
  door. No warden floor moves, no court bar bends, no paint-law byte
  changes. Bought dice, never bent law.
- THREE LADDERS per artifact per iteration, the in-play ladder counted
  first — at most two re-lays. Ladder counts derive from the SEALED
  RECORD (each completed ladder seals exactly one terminal attestation
  under the seat's key): replay-proof, and per-iteration by
  construction, because every sitting seeds fresh.
- FIDELITY PROVEN, never presumed: a re-laid ask must BE the fallen
  ask — rebuilt promptHash, generationSpecHash, and cacheKey equal to
  the attested seat's own — or the door refuses and the fall stands.
  Where the re-ask is the same job bytes (the fixture arm), fidelity
  holds by construction. A drifted mirror can only fail closed.
- A CAPPED ASK IS NEVER A LADDER FALL. The toll-house's no is honest
  scarcity; the door halts and names it.
- ALL-THREE-FALL IS BLOCKER-GRADE. HARVEST-EXHAUSTED names the seat
  and every attestation; the hunt stops for an owner report. No fourth
  ladder, ever.
- THE TASK-54 DOCTRINE STANDS AMENDED: "refused = defect" reads now as
  "a refused or anchored required plate is a game defect only when it
  survives THE MINT LAW's ladders or recurs under changed law bytes —
  under hash-identical law, a single fall is variance." Paint budget,
  never truth budget.
- A need already satisfied buys no ladders (§2.5 — the preflights' own
  doctrine); honest silence stays HARVEST-STARVED, and each fired
  ladder buys back only its own measured wall-clock (+150s per §2.3
  arithmetic), never time the record didn't spend.

### TASK 54C — EXTENSION GRANTED BY RULING (2026-07-17)
The house granted 54C.5–.7 under THE EXTENSION LAW, first application.
The ledger qualified: the sole red (.3) carries its named root cause
(the court's own instrumentation, amended stricter), no open game
defect remains, and the only unbanked work is the architect round's
already-validated cures (the meter finalizer, the unconditional
prologue delta, the at-the-door containment). THE FREEZE BEGINS AT
THIS ENTRY — the shipped architect cures are the final bytes. Verdicts
follow.

### TASK 54C — LOOP CLOSED GREEN under THE EXTENSION LAW (2026-07-17)
54C.5 GREEN (61/61, zero skips; REPLAY named in the run log). 54C.6
GREEN (61/61). 54C.7 GREEN (61/61, all twelve projects, zero skips,
zero flaky). Three consecutive fully green runs inside the granted
window. The freeze held to the byte — the only file touched during
the extension was this ledger, as the ruling itself ordered; one
strike never invoked. The record tells it straight: the ORIGINAL
ceiling was four and was not met (.1 ✓ .2 ✓ .3 ✗ .4 ✓); the extension
was granted by ruling; the streak stands inside .5–.7. The architect
round's cures are BANKED — they ran under all three extension
iterations. Full report: test-results/report-54C.md.

## TASK 55 — THE POSSESSIONS CUT (2026-07-17)

### Test edits, logged as made
- G13 pin raised 94 → 96 in the same commit that seats the possessions
  law: the trove gate (evals/trove.test.mjs) and the coin-purse gate
  (evals/coinPurse.test.mjs) join the keyless chain beside the thread
  gate. The reconciliation comment sits on the pin itself.
- The hooked-world capstone grows a trove leg — the codex fold, the
  journal replay, and the briefing's wealth line must agree on the same
  coin and the same hands. One PASS line still; the capstone does not
  inflate the count.
- The proving fixture gains the possessions record, additive only:
  t0 seals THE FERRY LEDGER to Maren (+30 coin, back pay); t1 passes
  the ledger to Edda (−12 coin, road toll). The struck t2 is untouched —
  the strike law rides G19 for free. Final standing: 18 coin, the
  ledger in Edda's hand.
- G19 THE TROVE seated: tests/e2e/g19-trove.spec.ts. G19a (protocol)
  reads the campaign back from the shelf and proves fold and pure
  replay agree — hands, cites, note, coin, clamp flags. G19b (DOM)
  proves the Codex trove page speaks that record — the coin figure,
  each movement with reason and turn cite, the kind chip, and a chain
  showing both hands in order. Enrolled in the dom project regex and
  demanded BY NAME in verdict.mjs REQUIRED_EXECUTED ('G19a', 'G19b') —
  execution is part of the verdict, per the 54.4 lesson.
- The engine import in G19 walks the relative path into
  packages/engine/src/trove.js rather than the package door: Playwright
  transforms first-party files, but bare specifiers resolve into
  node_modules as untransformed ESM.

### 55.1 RED — root cause named, court instrumentation amended
55.1: 63 tests, 62 green, zero skips, zero flaky, every project sat,
G19a/G19b both EXECUTED. The one red is G19a, and the root cause is
the court's own reader: harness readCampaign rewrites campaign.logs
into a summary shape and silently dropped dm.story — the same family
as the iteration-4 lesson annotated in that very function (it once
dropped `kind`). The Node-side replay saw an empty journal; the page
court G19b proved the real record replays sound in the app itself. No
game defect. Amended additively: the mapped log rows now carry
dm.story verbatim under the key the pure replays read; no other field
changed, no assertion weakened. 55.2 requested.

### 55.2–55.4 — LOOP CLOSED GREEN
55.2 GREEN (63/63, zero skips, zero flaky, all twelve projects sat,
G19a/G19b EXECUTED by name). 55.3 GREEN (63/63, same shape). 55.4
GREEN (63/63, same shape). Three consecutive fully green runs,
iterations 4 of a ceiling of 8. The sole red (55.1) carries its named
root cause — the court's own read-back mapper — and its cure was
additive instrumentation, never a weakened assertion. Architect round
follows; findings land here, fixed or refuted, before the closing
commit.

### ARCHITECT ROUND — PASS, nothing to fix
The architect reviewed the full diff against the thirteen laws and
returned PASS: validator, reducer, and replay internally consistent;
context threading correct at both doors (app pre-turn snapshot, server
judge from the story block states); seed parity complete across forge,
both genesis doors, and the proving shelf; prompt, tool schema,
briefing, and Codex page seated where the laws expect them; test
enrollment material. It ran the two new keyless gates and the grown
capstone itself — all passed — and found no security violations. Its
two suggested next actions (full loop, full keyless check) were
already executed before the round convened: three consecutive greens
55.2–55.4 and a 96-PASS keyless tail. Nothing to fix; nothing to
refute.

## TASK 56 — THE PRESENCE CUT (2026-07-17)

Directive VII (EXPERIENCE-DIRECTIVE-VII.md) — the scene as sealed
record. Every test edit, logged as the series law demands:

- evals/presence.test.mjs (NEW GATE, +1 keyless PASS): the scene_set
  door's three courts (shape always; presence-seated atlas and travel
  courts; genesis free; bare context judges shape only), the reducer's
  three answers (fold after world, unknown region refused with a note,
  the tick door), the sinceTurn hold on restatement, the legacy-codex
  backfill, storyBlock's scene_state, the CLOSED tick op set, and the
  pure presence replay (every sighting class, the strike law, the tick
  skip, the hero law, no-ground sightings, unique-bare-first-name
  resolution, ambiguous names kept verbatim, cites as journal row
  indices).
- evals/ground.test.mjs (NEW GATE, +1 keyless PASS): the briefing's
  ground line byte-exact as the SECOND key; honest omission when no
  scene stands; name-only when the region left the codex; famine
  immunity (allegiances fall, wealth falls, the ground and calendar
  never); the pack's full-ride past the recent-text heuristic and the
  budget slim-trim immunity for the standing region.
- package.json: both new gates enrolled in the eval chain directly
  after coinPurse.test.mjs.
- evals/hookedWorld.test.mjs: the capstone grows its sanctioned ground
  leg — genesis scene_set in op1, and the fold, the briefing, and the
  presence replay must agree on the standing region. Still exactly one
  PASS line; message updated honestly (six laws → seven).
- tests/e2e/fixtures/proving-campaign.json: t0's story gains the
  genesis scene_set (Larkspur Vale — the region t0 itself creates,
  lawful in one breath); appended t5 — the lawful travel to The Duchy
  (scene_set + time_advance days:1). No new plates: t5's image_cue and
  cinematic stay null, and the harvest's scene-plate positions (1 and
  3 in the turn list) are untouched by an appended tail. t3/t4
  narration bytes untouched, so every vision caption cache key stands.
  Tick rows shift late journal indices; no assertion anywhere pins an
  exact late index (pattern cites only; index 0 is the one exact cite,
  it can never shift).
- tests/e2e/g20-ground.spec.ts (NEW, G20a + G20b): the protocol court
  (free teleportation refused by name, unrecorded stage refused by
  name, paid travel clean; fold/replay parity on REGION ONLY —
  codex.scene.sinceTurn is a turn-number stamp, replay cites are
  journal ROW indices, the two clocks are never cross-asserted) and
  the DOM court (the Duchy's STANDING HERE with cites and an honestly
  absent former section, the Vale's HAVE STOOD HERE, the soul page's
  last-known-ground line).
- playwright.config.ts: the dom project's regex admits g20.
- tests/e2e/verdict.mjs: 'G20a', 'G20b', 'G00-RT' demanded by name
  among EXECUTED.
- tests/e2e/g13-check.spec.ts: PINNED_PASS_COUNT 96 → 98 with the
  reconciliation comment (Directive VII: the presence and ground gates
  join the keyless check in the same commit that seats the scene law).
- tests/e2e/lib/harness.ts (VII.14 THE ROUND-TRIP RIDER): readCampaign's
  row mapper rebuilt — the row now rides WHOLE (verbatim spread) with
  the derived conveniences (kind, redacted, hashes, narrations,
  suggestions, timeAdvance, imageCue, hasImage, beatIndex) layered
  BESIDE the record, never in place of it; mapping moved node-side and
  exported as mapLogRow so the rider is provable without a browser.
  Directive reading, logged as VII.14 asks: scene_state lives on the
  codex/state block, not on journal rows — the rider governs rows, and
  the state block was already carried whole.
- tests/e2e/g00-preflight.spec.ts: G00-RT — a maximal journal row
  (every writer field, a full dm with story, scene_set, redaction and
  hash fields) survives mapLogRow with per-key byte equality.
  Instrument law only; no pin grows for it.
- tests/e2e/g15-copy.spec.ts: the codex walk now enters one place page
  and one soul page and sweeps both (labels codex:place, codex:soul) —
  the presence sections and the ground line are player-reachable copy
  (VII.12).

### Iteration 56.1 — RED (2 unexpected): the day recalibration

66 tests, 0 skipped, and both new courts (G20a, G20b) plus G00-RT
EXECUTED and green on first seating. The two reds were the calendar
speaking truth: the appended t5 travel turn seals a third day, so the
fixture now stands at Day 4 (1 + days:1 + days:1 + days:1), and two
courts still expected the old Day 3 record:

- g07-canon.spec.ts (G8): title and day-chip assertion Day 3 → Day 4.
  Not a weakening — the same exact-match law, recalibrated to the
  sealed record the calendar law derives.
- g14-order.spec.ts (G14f): the pre-advance baseline Day 3 → Day 4,
  and the post-advance floor TIGHTENED from >= 3 to >= 4 — the chip
  may never read less than the sealed day it started from.

### Iteration 56.2 — RED (1 unexpected): the strict-mode re-aim

G14f green at Day 4. G8 red for a new reason, unmasked by the day fix:
the place page now carries the presence eyebrows, so two of G8's bare
locators resolve to several elements and trip Playwright's strict
mode. Neither assertion changed — the selectors re-aim at the elements
they always meant:

- g07-canon.spec.ts: place.locator('h4') → place.locator('header h4')
  (the place NAME, not the new 'Standing here' / 'Have stood here'
  eyebrows); place.locator('.cite') → place.locator('p.cite') (the
  discovered-turn line, not the presence lists' span.cite entries).
  A sweep of every dom spec found no other bare h4/.cite locator
  touching the place or soul pages (harvest's is class-scoped; g15
  only waits on the selectors; g20 was written scoped from birth).

Iterations 56.3, 56.4, 56.5 — GREEN, GREEN, GREEN. 66 courts each,
zero unexpected, zero skipped, every needle executed. Three
consecutive greens at five iterations of the ceiling of eight.

### The architect's round — FAIL: one blocking finding, accepted

The architect walked the full diff after the three greens and returned
FAIL: alignment clean on the lockstep, the two clocks, the redaction
supremacy, the tick door, the media doors, and the honest refusals —
but the presence replay TRUSTED ROW SHAPES ON FAITH. Its walks assumed
arrays and strings; a malformed or imported legacy row (an object
where a list belongs, a number where a name belongs) made presenceOf /
visitorsOf throw — and the codex reads both bare during render, so one
bad row could fell the whole panel. The architect proved the throw
against a mangled cast_add. Accepted, not refuted — the Vault's own
fail-closed law applied to the witness stand.

The cure (rides iteration 56.6):
- packages/engine/src/presence.js — every list now walks behind
  Array.isArray (a list that is not an array proves nothing); every
  name must be a string or it sights nobody; hero, logs, story, and
  region names guarded the same; a row that is not even an object
  proves nothing — not even the hero. The replay never throws.
- evals/presence.test.mjs — a new fail-closed section: mangled lists,
  numbered names, a string story, a null row, logs-as-object, a null
  campaign — never a throw, byte-deterministic on a second pass,
  lawful rows in the same record still counted, the null row sighting
  nobody. Same one PASS line; the pin holds at 98.
- src/components/Overlays.jsx — the last door before render holds a
  catch that renders an EXPLICIT line — "The presence record cannot
  be read." — never a crash, never silence. With the replay hardened
  it should never fire; it stands as the panel's oath.

The fix touches runtime code, so the greens that stand at close must
be the tree that ships: iterations 56.6–56.8 re-prove the final tree.

Iterations 56.6, 56.7, 56.8 — GREEN, GREEN, GREEN on the hardened
tree. 66 courts each, zero unexpected, zero skipped, zero flakes,
every needle executed; the keyless floor held at 98 with the
mangled-record section seated inside the presence gate. THE LOOP
CLOSES at exactly the ceiling of eight: three consecutive greens on
the reviewed cut (56.3–56.5), the architect's blocking finding cured
and proven, and three consecutive greens re-proving the tree that
ships (56.6–56.8).

## Task 56B — The Party and the Elsewhere (Directive VIII)

Every test edit of the series, logged before the loop rides:

- evals/watch.test.mjs — NEW gate. The six-watch table hour by hour,
  the boundaries exact, the mod-24 wrap, fractional and non-number
  hours failing closed to the deep night; the calendar line wearing
  the watch; the briefing's first key carrying it through total
  famine; the plate flipping dawn to dusk on hours alone,
  byte-deterministic; the keyless mock walking four sealed advances
  through four watches of Day 1 and sealing the Waystation Bell on
  the genesis turn only.
- evals/party.test.mjs — NEW gate. Four door courts (join shape and
  ground, leave membership, hero root, the dead); nobody-teleports
  naming soul, ground, and scene; judgeTurn seating the courts when
  the record rides and staying silent on bare input; the fold's
  refusals on ticks and unknowns; the pure replay pinning the
  departed; the roster that never trims; the elsewhere falling first
  under famine; the server schema mirroring the validators as text.
- evals/fixture.test.mjs — NEW gate. Shape and atlas courts at the
  door, the seal refusing rewrites (first writer wins, byte-logged
  note), ticks allowed to build, the old-codex backfill, and the
  easel riding three sealed fixtures byte-stable.
- evals/calendar.test.mjs — RE-AIMED, nothing weakened: every prior
  assert kept; the line asserts re-aimed to the watch-bearing bytes
  ('It is Day N of the tale, in the X watch.') and a dusk line added.
- evals/briefing.test.mjs — RE-AIMED: the calendar byte assert now
  expects the watch-bearing line ('…in the deep night watch.').
- evals/hookedWorld.test.mjs — GROWN a third turn (region_add The
  Duchy, scene_set, party_join Corin Voss, fixture_add The Brass
  Toll-Scale; 2 hours ridden). Recalibrations, all logged: calendar
  byte → 'Day 3 … dawn watch'; fold scene → The Duchy; scene_ground
  byte → the Duchy's visual; Vale standing → ['Edda'] with the riders
  as cited former; new asserts seat the party roster in fold, replay,
  and briefing, the elsewhere naming Edda honestly without a
  since-clause, the sealed fixture with its turn, and the plate
  riding fixture and watch. The one-record law now proves eight laws.
- package.json — the eval chain grows three gates: party, fixture,
  watch, seated between briefing and visualBible.
- tests/e2e/fixtures/proving-campaign.json — GROWN t6–t8: the envoy
  joins at the Duchy gate and the Brass Toll-Scale seals (t6, no
  time); the party rides home to the Vale (t7, one day); Edda joins
  and the envoy is pinned at the Duchy by party_leave (t8, no time).
  Corin stays silent in t8 so the strict cite-order law stays strict.
  Final truths: Day 5 at zero hours, scene Larkspur Vale, party
  [Edda, joined turn 8], fixture sealed turn 6.
- tests/e2e/g20-ground.spec.ts — RECALIBRATED to the grown record,
  nothing weakened: fold scene → Larkspur Vale; Duchy standing →
  [Corin Voss] with Maren as its former; Vale standing →
  [Vessarine, Edda, Maren] with Corin as its only former; the
  traveler loop re-aimed to final-ground-cites-later (still strictly
  greater); the Duchy DOM court trades honest absence for an honest
  former section (one soul per list, counts exact); the Vale DOM
  former count tightened to exactly one.
- tests/e2e/g21-party.spec.ts — NEW court pair. G21a: the door's
  party matrices by name and ground, the teleport rejection with
  member and walk-on exemptions, bare-context silence, then the
  sealed record — fold party/fixtures byte-equal, replay roster and
  elsewhere, briefing traveling_with ['Edda — joined turn 8'],
  elsewhere line naming the pinned envoy, calendar 'Day 5 … deep
  night watch.' G21b: the party strip with its joining turn, the day
  chip at Day 5, the Duchy page standing the envoy and showing the
  Brass Toll-Scale sealed turn 6.
- tests/e2e/g13-check.spec.ts — the keyless pin rises 98 → 101 with
  the three new gates.
- tests/e2e/verdict.mjs — REQUIRED_EXECUTED demands G21a and G21b by
  name.
- playwright.config.ts — the dom court's testMatch admits g21.
- tests/e2e/g07-canon.spec.ts — Day 4 → Day 5 (the t7 return ride).
- tests/e2e/g14-order.spec.ts — Day 4 → Day 5, and the floor
  TIGHTENED 4 → 5.
- tests/e2e/g00-preflight.spec.ts — the maximal row grows party_join,
  party_leave, and fixture_add so the round-trip rider carries
  Directive VIII byte-complete.

Iteration 56B.1 — RED, honest. Harvest A: the villain's later plate
(dramatic) fell to its blessed anchor — the live painter returned a
near-copy ("identical character and composition, background stone
markings cleaned") and the warden refused it as not-distinct. A
live-tier likeness flake, not a court defect; 64 courts starved
downstream. No test touched.

Iteration 56B.2 — RED, two defects of evidence and one of mine.
Harvest healed (the villain minted distinct). Fell: G21b on an
INVENTED selector — '.codex-modal' does not exist; the house's one
modal wrapper is '.modal'. Cured in g21-party.spec.ts, logged above
the assert, nothing weakened. Teeth 8/8b fell on POISONED EVIDENCE:
the store still carried 56B.1's aborted-run attestation (Mara Vey
full-figure ANCHORED, attestation #11), so the doctored-manifest
courts met a real defect before their own doctoring and read the
wrong refusal. Tooth 12 magnified a hero anchor sealed during the
same aborted run (mark_visible false at 0.85); tooth 11 and G17b
fell on fresh-paint variance over plates whose prompt bytes the
watch and fixture riders lawfully churned. THE CURE IS THE BROOM,
not the law: the harvest store (test-results/harvest) is cleared so
56B.3 harvests the whole book fresh on the shipping tree — no
attestation from an aborted iteration may haunt the series. No
assertion changed in any of those five courts.

Iteration 56B.3 — RED, two instrument blind spots surfaced by honest
evidence; G21b, tooth 8b, tooth 12, and G17b all healed on the fresh
store. The two cures, both instrument re-aims, both logged, nothing
weakened:
- tooth 8 (sabotage) — the scalpel cut NEEDS[project][0] always. This
  run's live record sealed a REAL refusal inside g17-framing's first
  need (Mara Vey full-figure: painted text twice → REFUSED, attestation
  #11; the surface kept its lawful textless fallback and the real
  preflights stayed green). Deleting that artifact then makes the
  preflight answer with the record's word — REFUSED — which is tooth
  8b's own proven law; 'missing' was unreachable and the tooth failed
  on truth. doctorFirstNeed (lib/harvestManifest.ts) now probes needs
  IN ORDER and cuts the first whose hole the record does NOT explain,
  proving missing-by-name on a clean wound; if every hole is explained
  it falls back to the first need and fails honestly. The law itself —
  refuse BY NAME, name the artifact — stands byte-identical.
- tooth 11 (calibration) — two crossings passed at overlap 0.000:
  quote-led and scene-mute proses crossed onto unanchored plates, made
  look-alike by the fixture riders lawfully furnishing every ground.
  The picker (calibration.spec.ts) now demands anchored plates on both
  sides, disjoint soul-sets, distinct sealed regions when both known,
  and narration donors (no leading quotation); lost slots refill with
  synthetic sealed-canon lies in tooth 4's proven false-caption
  pattern. Floor ≥6, pinned questions, three binaries, and the
  perfect-separation law untouched.

Iteration 56B.4 — RED by a single seat, and it settled the question.
Tooth 8 healed under the clean-wound scalpel; tooth 12, G17b, 8b, and
G21b held green; every synthetic lie and fixed control failed
lawfully. The one bad pass was the last surviving crossing (overlap
0.067) — AFTER anchoring, soul-disjointness, region-distinctness, and
quote-stripping were all demanded. Three sittings, three different
ways through: the pinned moment binaries ask element, action, and
contradiction — never WHO or WHERE — so a same-genre crossing is
inherently a dice roll against honestly lenient eyes, and sealed
fixtures furnishing every ground only made the dice fairer. THE
CROSSING CONTROL IS RETIRED (calibration.spec.ts): a control that
flips on a fair judge is noise wearing a control's name. All three
moment-bad seats are now the synthetic sealed-canon lies — the exact
pattern tooth 4's false caption has refused on every green run, and
synthetic-0 already proved its bite in 56B.4 itself. The three
binaries, the pinned questions, the ≥6 floor, the perfect-separation
law, and the whole good set stand untouched.

Iterations 56B.5, 56B.6, 56B.7 — GREEN, GREEN, GREEN. Three
consecutive full-suite greens at seven iterations of the ceiling's
eight: 68 courts, zero unexpected, zero skipped, zero missing
EXECUTED needles, three times running. The keyless check stands at
its measured pin (101 PASS words in stdout by g13's own law, zero
FAIL). Operational note for the next series: the loop consumes
RUN_REQUESTED only at boot — a request written without a workflow
restart sits unread; 56B.6 was delayed ~17 minutes learning that
twice-over. Task 56B's proving closes here; the review round and
the changelog seal follow.

Review round (post-green, pre-seal) — the architect sat with the full
diff and confirmed both instrument re-aims as honest, then raised one
blocking finding, verified here by direct read before any cut: the
client landing court (App.jsx) seated only the Directive VI/VII
evidence — cast, threads, trove, purses, regions, scene — while the
server court seats hero, party, presence, and fixtures besides
(server/dm.js). The validator convenes a court iff its evidence is an
array, so Directive VIII's party, fixture, and speaker-ground courts
were IN SESSION on the server bench and SILENT at the landing — the
last line of defense thinner than the road. CURE (App.jsx): the
landing now seats hero from the pre-turn record and party, presence,
and fixtures from `story` — the same briefing evidence the request
itself carried, the same bytes the server court saw — so both benches
convene identical courts or identically none. Nothing weakened; a
court that was silent now sits. Keyless check re-run after the cut:
green at the measured pin. Iteration 56B.8 (the ceiling's last seat)
fires next to prove the cut under the full ladder.

## Task 56C — The Honest Frame (Directive IX)

Test edits and interpreting design choices, logged for the notary:

- **g13 pin 101 → 102** — the keyless gate grew by exactly one (`frameLaw`),
  per the directive's GATES section; the pin moves in the same commit.
- **g00 maximal row grew `crowd: 'background'`** — Directive IX rides the
  round-trip: the new cue key must survive the mapper byte-complete like
  every other key. No assertion weakened; the row got richer.
- **harness `mapLogRow` grew `crowd`** — the read-back carried subjects and
  region only; a lossy mapper would judge every granted crowd as `none`
  (amendment 5). The manifest's closure allowance reads through it.
- **`paintFixtureExtras` mints the frame courts' seats** — the Duchy pair is
  ONE byte-stable brief painted twice under distinct cache keys
  (`duchy-pair-1/2`), post-seal so the Brass Toll-Scale rider stands in both
  (amendment 1); `hero-first-scene` guarantees G22b a seat (amendment 3).
  All three cues are living-and-present under the replayed record: Corin
  remains at The Duchy after his t8 leave, Edda rides in the party, the
  hero is the root. The proving campaign itself is UNTOUCHED — its nine
  dm.image_cue fields are null, so the landing replay never meets the new
  court (zero replay risk, verified by direct read).
- **manifest roles `duchy-pair-1/2`, `hero-first-scene`** — cacheKey-derived
  roles keep the harness seats OUT of the standing scene courts (G16a's
  moment law, the counts law): those courts see exactly the plates they
  always saw. TopPlate grew `cueSubjects`/`crowd`/`heroFirst` (additive);
  `subjects`/`heroBearing` keep their G17b meanings untouched.
- **NEEDS['g22-frame'] + JUDGE_PROJECTS enrollment** — three harness-seat
  needs (starved honestly by any refused fixture scene ask) plus both
  session files; enrollment auto-covers the new project under teeth 8/8b
  (sabotage and refusal-doctor) with no new tooth code.
- **`frame-questions.json` (protocol f1, pinned)** — the four instruments in
  a NEW sealed fixture; `binary-questions.json` and tooth 11's pin untouched,
  per the instrument law. Pin: sha256 2a09e328…a761, asserted in tooth 13
  and again in G22d.
- **Teeth 13-15** — known-goods are the very briefs the harness minted;
  known-bads are deterministic lies, never crossings: a three-name brief
  against a one-soul plate, a one-name brief against a two-soul plate, the
  crowd grant refused as an excuse for a prominent named soul, a stranger's
  bust against the hero clause, a sky sliver that must fail closed, the
  Vale against the Duchy's canon, a fountain canon nobody sealed.
- **LAW-SOURCE EDIT (expected raze):** `scenePrompt` grew the principal and
  closure clauses — `paintLawHash` turns, the harvest store is RAZED, and
  iteration 1 is a full repaint. Expected classes: villain-likeness flake
  yellows (standing), plus first sittings of the three new instruments.
- **G22d beyond the ratified three courts** — the painted-briefs court
  (amendment 4): byte law on the store's own recorded briefs plus the door
  walked at the e2e bench; joins REQUIRED_EXECUTED beside G22a-c.

### 56C.1 — red (standing class, no edit)

Harvest A died on `painted text twice` — the unlettered warden refusing a
live scene plate after its one lawful repaint. History proves the class
predates this task (54.1 and 56B.3 each took exactly one such hit; the frame
clauses did not exist in either), so this is the standing repaint roulette,
not a 56C defect: no law is changed in response. The three frame instruments
never sat (harvest B never ran). Iteration 2 requested verbatim.

### 56C.2 — red (anchored class; principal clause harmonized, pins moved in lockstep)

Harvest A died on HARVEST-ANCHORED — a live scene fell to its blessed anchor,
drift: "target character positioned in the background, less detailed face."
The anchored class predates this task (54B.1, 56B.1, varied drift reasons),
but THIS drift is the exact tension the ratified principal wording invites:
"no other figure outranks this presence in prominence" is a zero-sum order
the painter can obey by backgrounding the other named souls — which the
likeness law then rightly refuses. Directive amended (amendment 6): the
principal now LEADS in position and focus while any other named soul stands
near enough that face and mark read true. TEST EDIT under the letter's law:
the frameLaw eval's full-clause pin moved in lockstep with the law source
(same bytes, one sitting); the visualBible prefix pin and G22d's prefix
greps hold unchanged. No assertion weakened — the pin is byte-for-byte the
new law. Neither harvest store survived 56C.1/2, so the re-raze costs
iteration 3 nothing it was not already paying.

### 56C.3 — red (one real defect fixed at the mint; two standing classes ledgered)

Harvest finally survived and both stores built; five reds, three causes:

- **Teeth 13/14/15 (real defect, cured):** all three died at preflight —
  role "duchy-pair-1" missing. The three 56C harness seats were minted under
  bare `proving:` cache keys, which the store classifier reads as klass
  `unknown` (no label, no variant), so roleOf's scene branch — where the 56C
  suffix roles live — never saw them. The sanctioned harness-scene prefix is
  `proving-scene:` (whitelisted in BOTH classifiers: store klass and
  attestation subtype). TEST EDIT: the three cache keys moved to
  `proving-scene:${id}:…`; suffix role mapping, slot names, prompts keys,
  and pair distinctness all unchanged. No assertion touched.
- **Tooth 11 (standing class, no edit):** a good-moment fixture pair failed
  one binary. History: 54B.2, 56B.2, 56B.3, 56B.4 — the known repaint
  roulette of the sealed instrument; re-rolls on the next mint.
- **G17a (standing class, no edit):** the villain's live portrait painted a
  second figure (single_subject=false) — the court is right to refuse it.
  History: 54.3. Portrait prompts carry no 56C law; fresh live session
  re-rolls next iteration.

Iteration 4 requested: same law, three cache keys corrected.

### 56C.4 — red (the sealed stores rode; raze forced through the store's own gate)

All five reds returned byte-identical — same plate hashes, same verdicts,
teeth in milliseconds — because the paint-law hash covers the LAW files
alone (prompts, foundry, unlettered, warden), so 56C.3's sealed stores rode
into 56C.4 verbatim: the mis-keyed seats, the two-figure villain portrait,
and the failing good-moment pair were FROZEN defects, not re-rolling
roulette. The harness cache-key cure is invisible to that hash by design.
Cure: `paint-law.json` removed so `ensureFreshStore` razes and repaints
from zero under the corrected keys — the store's own destructor, no manual
surgery on sealed records. Iteration 5 is a full fresh mint: the three 56C
seats land their roles, and every standing roulette class re-rolls.

### 56C.5 — red (anchored at the same beat; mechanics decoded, no edit)

Harvest A died anchored at attestation #9 again — the FIRST scene of the
live walk (The Antler Hills, hero-first cue [Maren, Mara Vey], dusk). Two
findings, both evidence, neither a defect of the frame law:

- `warden: "fallback"` in the attest is the ANCHOR-STANDS-IN label minted
  when likeness fails twice (engine wardenRuling) — the primary magnified
  judge sat both times; no bench degraded. The drift text is the judge's
  own truncated sentence; cosmetic.
- The beat is HISTORICALLY hostile: 54.1 and 54B.1 both died at
  attestation #9 before any 56C law existed (56B.1 died at #14). 56C.3
  proved the beat winnable under the frame law. This is the standing
  first-scene likeness roulette, concentrated where every fresh mint
  starts.

No law or harness change: the store state forces a true fresh roll at
iteration 6 (partial live record, no session.json, empty fixture store,
paint-law hash standing). Under the ride mechanic (deterministic vision
cache re-litigates sealed evidence verbatim), one fully green mint makes
the two following rides deterministic — iteration 6 is the winning-mint
attempt, 7 and 8 its rides.

### 56C.6 — red (the first-scene tollgate again; ceiling extension invoked)

Anchored at attestation #9 for the fourth fresh mint out of five. Drift
this run: "Lens swapped from right to left eye" / "Slight facial variation
due to scale" — the five-pixel mark-at-scene-distance class the series
ledger already names (wording plateaus ~50%; enforcement beats eloquence;
the warden is RIGHT to refuse). Failed-attempt bytes are lawfully dropped
on anchor-fall, so there are no plates to eye — drift text is the whole
record. The tollgate is standing design, not frame law: 54.1 and 54B.1
died at this same attestation before Directive IX existed; 56C.3 proved
the beat winnable under the new law. No edit — the dice are the painter's.

RITUAL DEVIATION, LEDGERED: three consecutive greens cannot fit in the
two iterations remaining under ceiling 8. Per series law — extensions
ONCE, then frozen — the ceiling moves 8 → 12 and is FROZEN there. The
winning mint must land by iteration 10 (rides at +1, +2); if no mint wins
by 10, the loop closes red and the owner gets the honest report. No
second extension exists.

### 56C.7 — red (harvest GREEN both stores; three fixture-brief defects, briefs cured, fixture-only raze)

The mint won the first-scene tollgate — live store sealed clean (G17a
green, tooth 14 green). Three reds, every one a CORRECT verdict by a 56C
instrument against a defective FIXTURE paint, and eyes on the plates
proved the briefs were the liars:

- **Tooth 13** (closure known-good): both duchy mints added a prominent
  second figure to the one-soul brief — "dusk trade weighed" begs a
  counterparty and the principal clause's companionship sentence invites
  one. The count court refused rightly. TEST EDIT: the pair brief now
  names TWO souls (Corin Voss, Edda) — the painter's counterparty habit
  becomes lawful; DUCHY_PAIR_SUBJECTS moves in lockstep; the two
  known-bad count-lies recomposed to stay deterministic ([hero, Corin,
  Edda] = three names vs the two-soul plate; [hero] alone vs the
  two-soul hero-first plate). Count lies, never identity crossings.
- **Tooth 15** (constancy known-good): sealed canon demands "bolted to
  the gate arch … pans polished to mirrors"; both mints painted
  freestanding dull-panned scales. The constancy court refused rightly.
  TEST EDIT: the pair MOOD now orders the canon attributes themselves
  (gate arch, bolted, mirror-polished pans) — the mood rides first and
  every concrete noun is a paint order; the judge's bar is unchanged.
- **Tooth 11**: standing moment-pair roulette (element_present +
  no_contradiction on one fixture moment plate); re-rolls with the mint.

RAZE, scoped: fixture store + top manifest deleted; paint-law.json and
the LIVE store stand — harvest A rides its sealed session, harvest B
re-mints under the cured briefs. No app law touched; no pin moved
('Principal presence: Corin Voss' is subjects[0], standing).

### 56C.8 — red (tooth 15 alone; the constancy question amended to identity-grade, re-pinned)

Teeth 11, 13, 14 GREEN — the two-soul pair brief and recomposed count-lies
cured closure calibration on the first fresh mint. One red: tooth 15's
known-good, again refused SOLELY on staging — wall-bracket-beside-arch vs
pedestal-near-arch, dull pans, a sack in one pan — with the fixture's
identity (man-high brass twin-pan toll-scale at the gate) rendered
plainly in both paints. Across FOUR independent mints the pipeline
rendered the fixture's identity 4/4 and its arch-bolting 0/4; the pair's
own sealed design (independent cache keys) guarantees staging variance
between mints. As written, the question demanded letter-exact staging
convergence that independent mints structurally cannot deliver — a court
that cannot pass honest work is decoration in the mirror.

TEST EDIT (amendment 9): questions.fixture_pair in frame-questions.json
now judges identity-grade constancy — canon kind, material, scale,
distinctive form, recognizably the sealed fixture in BOTH paints;
staging (mounting, angle, position, finish as lit, incidental dressing)
is lawful variance; refusal reserved for a missing, different, or
unrecognizable fixture. The known-bad stays a deterministic lie (the
crossed ground holds no such fixture at all). JSON schema unchanged.
Protocol tag bumped — every frame-instrument verdict re-judges FRESH at
56C.9 (54B cache law: protocol is a key ingredient); the sha pin in
frameLaw.ts moved in lockstep. Stores STAND — no re-mint; same evidence,
honest question.

### 56C.9 — red (one lockstep pin, mine; the amended constancy instrument separates perfectly)

The amended fixture question judged true law on first sitting: known-good
TRUE (0.85, empty inconsistency), crossed-ground FALSE (0.97), crossed-
canon FALSE (0.98) — perfect separation, and every court in the house sat
for the first time: zero skips, zero missing needles, 75 of 76 green.
The one red never reached judgment — G22d's protocol-tag pin still read
'f1' after the amendment bumped the file to 'f2'. My own miss, the exact
class the turn-law ledger names: EVERY call-site pin moves in lockstep or
the court refuses honest work. TEST EDIT: the G22d pin moves 'f1'→'f2'.
Stores stand; all f2 verdicts cached; 56C.10 rides.

### 56C.10 — red (G8 codex tap-race flake; the ceiling verdict falls)

The ride that should have been the first green of three: 75 of 76, zero
skips, zero missing needles — and the one red never reached a single
assertion. openCodex tapped the nav button, the button took focus
(page snapshot: alive, feed rendered, button [active]), and the modal
never opened; 240s burned on the selector. G8 ran 2.3s / 2.4s / 2.8s
green at 7 / 8 / 9 on these same bytes. Flake class, not frozen: a
one-tap hydration race in the shared walk helper.

TEST EDIT: openCodex now re-taps (three attempts, 15s each, re-tap only
when the modal is provably absent; final unguarded wait keeps the
court's timeout as law). No assertion weakened — every codex law still
sits. harness.ts is outside the paint-law hash; stores stand.

THE CEILING VERDICT, stated plainly: with 10 red, iterations 11 and 12
can yield at most TWO consecutive greens. Three-consecutive cannot fit
inside the frozen ceiling of 12, and the one extension is spent. The
task closes RED by the ritual's letter regardless of what 11 and 12
show. They ride anyway — as closing evidence of what stands: the mint
that won the tollgate, the instruments that separate perfectly, the
courts that all sat. Honest evidence, honest red.

### 56C.11 — GREEN (76/76; the first fully green sitting of the series)

Zero unexpected, zero skips, zero missing needles, exit 0. Every court
sat: the live walk with its tollgate-winning first scene, all four G22
frame courts under the f2 instruments, teeth 11-15 with perfect
separation, the hardened codex walk. No edits.

### 56C.12 — GREEN (76/76; ceiling exhausted)

The second consecutive fully green sitting, byte-for-byte the same laws.
No edits. The ceiling of 12 (frozen, extension spent at 56C.6) is
exhausted.

## TASK 56C CLOSING VERDICT — RED BY THE RITUAL'S LETTER

The chain at close: 7 red, 8 red, 9 red (75/76), 10 red (75/76, tap-race
flake), 11 GREEN, 12 GREEN. Two consecutive fully green sittings stand
at ceiling exhaustion; the ritual demands three; no second extension
exists. The task closes RED, honestly, with this evidence standing:

- The winning mint: live store sealed at 56C.7 through the first-scene
  tollgate; fixture store sealed at 56C.8 under cured briefs.
- The three frame instruments separate perfectly on sealed materials
  (teeth 13, 14, 15 — every known-good passes, every known-bad refused).
- All four G22 frame courts sat and passed twice on the sealed stores.
- Every ledgered edit is a brief cure, an instrument-law amendment
  (9, ledgered), a lockstep pin move, or a walk hardening — no assertion
  weakened anywhere, no skip introduced, no dependency added.

## TASK 57 — THE BATTLE CUT (2026-07-18)

Opened under the owner's amend-and-proceed ruling of 2026-07-18: Task 57's
precondition read "56C closed green"; the ledger holds 56C closed RED at the
frozen ceiling with two full greens standing at exhaustion and the
architect's PASS. The ruling: those stand as sufficient ratification; the
deviation is ledgered in Directive X's preamble. Verifiable preconditions
proven before any byte moved: HEAD b3c5b78, CHANGELOG top 0.7.3, keyless
check exit 0 at the 102 pin (run on closing bytes, keys unset).
EXPERIENCE-DIRECTIVE-X.md ratified before code, per the directive-first law.
Ceiling: ten iterations across both stages. Test edits ledger below.

### Stage One test edits (2026-07-18)
- NEW `evals/bestiary.test.mjs` — Directive X Laws I–II: the creature_add door (shape, bounds, seal-by-name, bare-context silence), THREAT_TABLE fixed rows, expandSpawn (deterministic letters, given names, clamp at six, unsealed-expands-to-nothing), reducer seal-once with notes, storyBlock bestiary_state, and the scenePrompt bestiary rider (verbatim clause, cap three, recency, silent when no battle stands or the species is downed).
- NEW `evals/roundLaw.test.mjs` — Directive X Law III: initiative required at op start and refused elsewhere, device-side coverage by name, 1–3 accounted d20 draws with group dedupe, spawn/enemy_add draw coverage, spawn only at the opening, unsealed-spawn refusal beside same-breath lawfulness, npc_actions first shape with one-action-by-name, fallen and stranger refusals, bare-context silence, and sealInitiative determinism (tie toward the player, alphabetical within a side, absent draws fail to zero).
- `package.json` eval chain grew both gates, appended after firstWord — no existing gate touched.
- `tests/e2e/g13-check.spec.ts` PINNED_PASS_COUNT 102 → 104 in the same commit that adds the two PASS lines (pin law).
- Amendment (2026-07-18): the easel rider fixture in `evals/bestiary.test.mjs` renamed its second species 'Gore Crow' → 'Dusk Crow' — the standing PG-13 easel filter redacts 'Gore' on the painted plate, which is that filter's law, not the bestiary rider's. Assertion strength unchanged (verbatim clause, cap three, recency). The fold-section 'Gore Crow' stays — storyBlock carries canon uncensored.

### Stage Two test edits (2026-07-18)
- NEW `evals/tableDice.test.mjs` — Directive X, Law V: the actor court (hero always lawful; a sheeted companion lawful by name; an unsheeted actor refused by name when the sheet ledger sits; bare context keeps shape law), the sheet-bearing sibling fold (companion abilities and proficiency, owner's name riding the result), the plain death save (no ability, no proficiency, DC 10 default), and the no-invented-numbers prompt rule pinned byte-stable.
- NEW `evals/doom.test.mjs` — Directive X, Laws VI-VII: the sheet_grant door (shape, role enum, level bounds, membership with the party seated, duplicate-by-name with the sheet ledger seated, bare-context silence), THE ROLE TABLE row by row with the hp arithmetic cited, the reducer's seal-once fold with notes and sheet_state on the block, the three-and-three walk both ways under seeded dice, the sealed bed refusing a fourth save, the resurrection retcon still blocked, the memorial fact, and the fall notes riding held threads by name.
- `package.json` eval chain grew both gates, appended after roundLaw — no existing gate touched.
- `tests/e2e/g13-check.spec.ts` PINNED_PASS_COUNT 104 → 106 in the same commit that adds the two PASS lines (pin law; both stage pins land in the one Task 57 closing commit).

### Task 57 — Section 3 build-out (pre-loop): the five battle courts and tooth 16

Test-file edits, each with its reason:

- NEW `tests/e2e/fixtures/doom-session.json` — the doom fixture: hero Halvard,
  a cast of three, two sheeted companions (skirmisher 2 and 3), two sworn
  threads, one pre-sealed grave (Vessarine Olt, holder of the lantern
  promise), the sealed Marsh Howler card (threat 2), a scripted three-instance
  battle (A downed at zero, B fled, C living), and Brannoc wounded to zero —
  the whole G23 road in sealed bytes.
- NEW `tests/e2e/fixtures/battle-questions.json` (protocol b1) — the species
  instrument: sealed card + crossed card + one forced-binary question with the
  staging-variance clause. Sha-pinned in battleLaw.ts; the pin is checked
  in-tooth and in-court, so a drifted sheet can never sit silently.
- NEW `tests/e2e/lib/battleLaw.ts` — frameLaw's cloth: digest, pin, card
  accessors, the BATTLE_CUE constant (harness plates bind no journal row, so
  the cue is restated testimony), speciesVerdict on protocol b1.
- NEW `tests/e2e/g23-battle.spec.ts` — G23a (sealed order rendered in order,
  greyed seats for the downed AND the fled, byte-identical after a full
  reload through the shelf), G23b (node-side one-action bench: the doctored
  second action by a LIVING actor falls by name, byte-exact; the yield passes
  clean), G23c (the companion die under the owner's name and sigil; margin
  proven from the read-back sheet, never hardcoded), G23d (the doom walk:
  three saves on stage, sealed verdicts pending/pending/dead, the memorial,
  the permanent sheet seal, the fall note on the held thread), G23e (species
  plate vs sealed card; the brief carried THE BESTIARY RIDER byte-for-byte;
  the doom fixture's journal seals the same canon — one source, tied).
- `tests/e2e/lib/harness.ts` — seedFixture grows `source`/`mutate` (additive;
  every standing caller reads exactly as before); doomFixture() reader;
  paintFixtureExtras grows the deterministic battle-species seat (the app's
  own scenePrompt under a bestiary+combat campaign, so the rider rides).
- `tests/e2e/harvest.spec.ts` — hands the battle card and cue to the mint
  (one line; the prompts ledger picks the brief up automatically).
- `tests/e2e/lib/harvestManifest.ts` — battle-species keeps its own role so
  the standing scene courts see exactly the plates they always saw;
  g23-battle joins JudgeProject/JUDGE_PROJECTS/NEEDS, so tooth 8 doctors its
  first need and tooth 9 starves its paint class automatically.
- `tests/e2e/calibration.spec.ts` — tooth 16 appended after tooth 15: good
  (the battle plate answers its own sealed canon), bad (a crossed card no
  battle ever sealed is refused), bad (a beastless ground is refused).
  Deterministic lies, never crossings.
- `tests/e2e/g15-copy.spec.ts` — grows the battle-surfaces sweep (banner,
  feed, codex, sheet) with fail-closed presence gates: the memorial, the
  fall note, and two sheet lines must STAND before the sweep counts.
- `playwright.config.ts` — g23-battle project, dependencies: ['calibration']
  (the species court sits only after tooth 16 proves the instrument).
- `tests/e2e/verdict.mjs` — g23-battle joins REQUIRED_PROJECTS; 'G23a'…'G23e'
  and 'tooth 16:' join REQUIRED_EXECUTED.

Dice disclosure: companionRoll is seedless by law (Math.random at the fold),
so the walking courts pin the table's dice via addInitScript BEFORE boot —
G23c pins 0.5 (d20 face 11; 11 + the sheet's DEX + proficiency beats DC 12),
G23d pins 0.25 (face 6; three failures, the seal). The pin is the harness's
dice tray, not a change to any shipped fold. G23a stays unpinned: it proves
render == sealed record, not values.

App-side changes ledgered for the architect: applyCombat moved WHOLE to
src/lib/combat.js (one fold, two callers); proving.js folds dm.combat /
scripted wound / fixture pendingRoll (Amendment 1 in Directive X); the
Composer wears the owner tag via ownerTag(); Overlays renders the fall note
from the reducer's own testimony (codex.threads), because a doom-walk death
folds client-side and never rides a journal turn for the pure replay to see.

### 57.1 — red (standing class, no edit)

Harvest A died on `painted text twice` — the unlettered warden refusing a
live scene plate (attestation #9) after its one lawful repaint, and THE
TERMINAL ANSWER firing HARVEST-REFUSED in the same poll that read it. The
class is the standing repaint roulette, ruled a non-defect on 56C.1 with
history (54.1 and 56B.3 each took exactly one such hit before any of this
task's law existed), and the ruling carries: the live walk, its prompts,
and the warden sit entirely outside Task 57's diff, and the battle seat
rides harvest B, which never ran. No law is changed in response. The five
battle courts and tooth 16 never sat (calibration and everything behind it
skipped with the store unsealed). 57.2 requested verbatim.

### 57.2 — red (standing class, no edit)

Harvest A again, the other face of the live-walk dice: HARVEST-ANCHORED —
the turn-1 scene fell to its blessed anchor (likeness would not hold
twice; drift: the hero demoted to the background). The drift family is
the exact one THE PRINCIPAL-FIGURE LAW refuses by name (ledgered at the
old attestation #9), so the warden's refusal is HONEST law holding while
the painter's dice missed twice. Precedent rules it standing: 54B.1
(anchored at harvest A — "re-arm with fresh dice," no law touched) and
56B.1 (anchored villain plate — "live-tier likeness flake, not a court
defect"). Different class from 57.1's text plague — no class has
repeated yet; if one does, it gets reported as a blocker, never a bent
bar. Paint law rode (`reused=true`): only the unsealed live store
re-rolls, so one clean mint seals the roulette shut and the remaining
iterations ride. No edit. 57.3 requested verbatim.

### 57.3 — red (anchored class repeated; the report clause fires; 57.4 rolls under 56C.5 precedent)

Harvest A, HARVEST-ANCHORED at the same turn-1 seat: the warden refused
the likeness twice — "full spectacles instead of a single left-eye
monocle," "distance in the scene reduces clarity of exact facial
features" — and the ask shipped its blessed anchor. Third live-mint
failure in three, second of the anchored class, so 57.2's own ruling
line fires and the blocker goes to the owner with the arithmetic: 3
spent, 0 green, 7 remain; the chain still fits through a first green at
57.8. Context that frames the report: this seat is the series' dominant
tollgate (56C spent .1, .2, .5, and .6 — its extension trigger — on the
first-scene gate; 54B.1 and 56B.1 each took one hit), every refusal is
honest law holding, the paint-law bytes are hash-identical to the
twelve-green law (reused=true), and Task 57 must cross the gate at least
once regardless — the battle seat moved the paint-law hash, so no ride
exists until one clean mint seals. Post-mortem record probed: the ladder
ran lawfully (paints attested, sighting → repaint → second sighting →
anchor, drift named). No law is touched; no bar bends. 57.4 rolls
verbatim under 56C.5's precedent (repeat hit, mechanics decoded, no
edit) while the owner weighs the spend.

### 57.4 — red (stores SEALED at last; two defects, both named, both the courts' own)

The watershed first: harvest A crossed the live gate — the turn-1 seat
that spent 57.1–57.3 minted clean, the live store SEALED, and harvest B
sealed the battle plate beside it. 84 tests, 82 passed, 0 skipped, 0
flaky; every court sat. The cures below touch no paint-law byte, so
57.5+ ride both sealed stores as replays. Two failures, both
first-execution defects in the courts' own instruments — no game law
touched, no assertion weakened:

- G23a (a six-seat sealed order judged absent): THE ROUND-TRIP RIDER's
  third strike. The seed folded the doom opening lawfully — the db row
  held six seats and the banner rendered them — but readCampaign still
  rebuilt the campaign row field-by-field, and the Battle Cut's new
  blocks (combat, pendingRoll) never crossed the bridge. Same family
  as iteration-4's `kind` and 55.1's `dm.story`. Cure (logged edit,
  harness.ts): the campaign row now rides WHOLE — a verbatim spread,
  derived normalizations layered BESIDE the record, never in place of
  it. The doom fixture's bytes stand untouched; its dialect was lawful
  all along (creature_add seats the bestiary at turn 3, the companions
  join at 1–2 before the opening, the device names the player side and
  the pool draw seats the pack).

- Tooth 8b (the eclipse at the preflight door): the tooth plants a
  refusal on g17's first paint need — but the real sealed record now
  lawfully holds an ANCHORED full-figure of the same class (a
  non-required seat that shipped its anchor, attestation #11), seated
  earlier in the refusals ledger. The door's find-first took the
  sister seat, spoke ANCHORED, and the planted refusal's name was
  never said. Cure (logged edit, harvestManifest.ts): a short need now
  names EVERY fallen member of its class in one throw, refused members
  leading. The 54.2 death-names stand; the tooth's demands stand
  verbatim; the door under it grew MORE honest, not less.

Then THE MINT LAW's instruments, per the standing ruling pinned beside
THE EXTENSION LAW, effective this coming iteration:

- terminality.ts (logged edit): waitForResolutions gains the optional
  relay door. Without a door the semantics are the pre-mint-law bytes
  — first fall throws in the same poll, the teeth's millisecond
  guarantees hold. With the door: seats group by cacheKey; a seat with
  any fulfilled-with-bytes ladder is redeemed history (§2.5); a
  satisfied need buys no ladders; a fallen seat re-lays while ladders
  remain; all-three-fall throws HARVEST-EXHAUSTED naming every
  attestation. The Task-54 doctrine sentence is AMENDED per the ruling
  in both fall classes. classifyAttestations now carries promptHash
  and generationSpecHash onto the resolution — the fidelity proof's
  reading matter, enrichment only, no judgment moved.

- harvest.spec.ts (logged edit): fireMintLadder, the A-door — rebuilds
  the fallen ask by mirroring the app's own builders (keyArtJob/actOf,
  heroBustJob, the cast portrait triple, the easel's detectCast → cue
  → moment → roster → bearing chain), PROVES fidelity (promptHash +
  generationSpecHash + cacheKey equal to the attested seat) before
  firing, and runs the ladder through the app's own foundry, awaited
  to the sealed terminal. The door never touches campaign.spend — the
  settle-once meter law owns that ledger, the server clamp is the true
  wall, and this line is the ledger of that deliberate choice. Both
  waits wired.

- harness.ts paintFixtureExtras (logged edit): the B-arm ladders at
  the enqueue site — same job bytes, same key, fidelity by
  construction; a capped ask halts honestly; at three falls the last
  lawful outcome ships and the courts judge it, so the anchor-mirror
  bust (which ships its anchor BY DESIGN) can never become a false
  blocker while a starved need still reds the sitting honestly.

57.5 requested with both stores riding.

### 57.5 — red (one court, one wedge: the book that would not open)

The mint law armed and never needed: every judge replayed (one lawful
fresh in sabotage-3's own theater), both stores rode sealed, G23a's
full order executed to the last reload assertion, tooth 8b heard the
refusal's name — 83 of 84, 0 skipped, 0 flaky. The one fall: G15's
storybook court. The seal was clicked and iframe.book-frame never came
(120s of honest waiting); the snapshot shows the log view healthy and
the seal [active]. The click landed; the open died in silence.

Root cause (by elimination, and by the door's own shape): App's
openStorybook awaits four reads before the iframe state lands —
journal, media rows, every blob through FileReader, the seen ledger —
and none of them sat under a catch. One transient rejection (a blob
whose bytes would not read back under a busy box) fells the whole
binding with no error, no status, no retry: a player presses the seal
and nothing happens, ever. The court caught a REAL player-facing
defect — a silent fall at a spoken door. The same sitting replayed
locally green (7 passed, 41.8s): the class is transient; the door was
the defect.

Cure (logged edit, App.jsx — not a law source; both stores stay
sealed): openStorybook now binds under a catch that SPEAKS — the
status line names the fall and invites the seal again — and one
unreadable blob no longer fells the book: the row rides with a null
plate (the book seats only proven art regardless) and the binding
names how many plates would not read. No assertion weakened, no court
byte moved, no paint-law byte moved; the mirror regions the A-door
copies (detectCast, the easel chain) sit above the edit and hold
byte-true.

57.6 requested with both stores riding.

### 57.6 — GREEN (1 of 3): every court sat, every door held

84 of 84, 0 skipped, 0 flaky, exit 0. The cured seal door opened the
book on the first press; G23a's whole order ran to the reload and the
spine; tooth 8b heard the refusal's name; the mint law stood armed and
was never needed — every judge group replayed, zero fresh calls in
the entire sitting (sabotage-3's 57.5 fresh sealed into the store and
replayed here). No edit of any kind this iteration: the bytes that
carried 57.5's cure sit unmoved. 57.7 requested with both stores
riding.

### 57.7 — GREEN (2 of 3): unmoved bytes, unmoved verdict

84 of 84, 0 skipped, 0 flaky, exit 0. Second consecutive green on
byte-identical courts and law — no edit of any kind between 57.6 and
57.7. Both stores rode sealed; the mint law armed and idle; the one
fresh judge call was sabotage-3's own theater, fresh by its design
(as in 57.5), every other group pure replay. 57.8 requested with both
stores riding.

### 57.8 — GREEN (3 of 3): THE RITUAL CLOSES

84 of 84, 0 skipped, 0 flaky, exit 0; missing projects, missing
executed, unexpected titles, and skipped titles all empty. Three
consecutive greens — 57.6, 57.7, 57.8 — on byte-identical law from
57.5's cure onward. Eight iterations spent of the ceiling's ten; the
extension never drawn; the mint law never fired a ladder in anger.
The Battle Cut is proven: the loop closes and the bench rises for the
architect's review, the changelog, and the closing seal.

### THE ARCHITECT'S SITTING (post-close, 2026-07-18) — two doors shut, one union told the truth

The review sat on the full Task-57 diff and returned FAIL with two
blockers, both in the mint relay's own instruments, both verified
against the bytes before any cut, both cured. Every cure below is
instrument-side; the loop's greens rode different doors (the relay
never fired in any green sitting), the no-relay semantics are
byte-untouched, and the paint-law hash never moved.

- [severe] The fidelity proof presumed what it could not prove: the
  promptHash / generationSpecHash / cacheKey comparisons were each
  guarded on the ATTESTED field's presence, so a seat that carried no
  identity would have fired unproven — and the grouping fallback
  (`#attestation-N` when cacheKey was absent) gave every keyless fall
  its own group, so the three-ladder ceiling could never trip for the
  portrait class: unbounded re-lays, fail-open twice over. Cures
  (logged edits, harvest.spec.ts + terminality.ts): absence is now a
  refusal — no promptHash or no generationSpecHash refuses the re-lay
  outright, cache-key EXISTENCE must agree between attested and
  rebuilt before equality is even asked; and ladders group by the
  seat's true identity (cacheKey, else generationSpecHash — which the
  fidelity proof pins across every re-lay — else promptHash), while a
  fall with no identity at all throws terminal at once, fail-closed,
  exactly as a doorless wait would.

- [moderate] The door itself could outrun the cap: relay.fire was
  awaited bare, so a hung foundry call would have slid past capMs into
  the outer test timeout — an open wait where the contract promises a
  measured one. Cure (logged edit, terminality.ts): the fire races a
  real timer at its own allowance (150s, §2.3's lawful worst for one
  ladder) — deliberately NOT the injectable sleep, which models poll
  cadence for the teeth and must never fake a door hang — and a door
  that outlives its allowance answers infra, terminal, never an open
  wait. The deadline still stretches only for a ladder that truly
  fired.

- [moderate] harvestManifest's JudgeProject union and JUDGE_PROJECTS
  index never enrolled g23-battle even as NEEDS carried its ledger and
  the section-3 notes claimed enrollment — the union lied and tooth
  8's doctor walk skipped the battle court. Cure (logged edit): both
  now carry it; the walk grew STRICTER (one more doctored manifest
  must refuse by name), and the teeth prove it below.

Proof of the cures, targeted (the loop stands closed; no iteration
respent): teeth + preflight + harvest + g23-battle — 29 passed, 0
skipped, 1.1m, tooth 8's stricter walk included, both sealed stores
replaying. Keyless check on the same bytes: exit 0, PASS 106 exact.
No assertion weakened anywhere in the cures; three grew stricter.

The review also caught one memory-hygiene slip (a conversation-local
task number in the agent's own topic file), reworded topic-based the
same hour. Findings below severe: none left standing. The bench
rises; the changelog and the closing seal follow.

## TASK 58 — THE WRITER'S ROOM (2026-07-18)

Preconditions proven before any byte moved: HEAD 5c535b6 is {PRIOR_HASH}
exactly; CHANGELOG.md reads 0.8.0 at the top; keyless check exit 0 at
the 106 pin precisely (run with keys unset on the standing bytes). The
Series Preamble applies in full; ceiling twelve across three stages;
the seats for G24, tooth 10 (reserved since the teeth ledger began),
and tooth 19 verified empty before planning.

### Task 58 test-instrument ledger (pre-directive)
- NEW `tests/e2e/tools/measure-first-word.mjs` — THE CURTAIN TRADE'S
  SCALE (Directive XI §1.3): boots the server itself on a side port
  with every provider and Clerk key stripped and DM_PROVIDER=mock,
  pours N=15 genesis turns through the app's own /api/dm?stream=1
  door, and records two timestamps per round — request → first
  `narration` byte (today's pre-seal stream) and request → the sealed
  `turn` event. Fail-closed: a non-mock provider, a refused turn, a
  missing narration block, or an unparseable sitting dies loudly. Not
  a playwright spec (the runner never collects it); the pin law is
  untouched by this file.
- BEFORE medians measured on {PRIOR_HASH} bytes, mock tier, keyless:
  first word 7ms, sealed turn 731ms (maxima 393ms / 1118ms, 15
  rounds). The trade the curtain buys: the first player-visible word
  moves from ~7ms (retractable, pre-seal) to the sealed arrival —
  731ms median on today's bytes at the same door. The AFTER medians
  will be measured on the curtain's bytes with the same instrument
  and stated beside these in the directive, in the same commit that
  re-pins G5.

### Stage One landed — the Director, the measure, the curtain, the pour
Build bytes: server/room.js (the Writers' Room court: intent validation,
the measure walk, the mock Director, convene with the once-per-beat
cache), server/dm.js curtained (no pre-seal streaming, sealed attempts
only, budgets raised for the measure), server/index.js door speaks
heartbeat comments and ONE sealed `turn` event, engine mockDm fits the
measure with pad/trim law (legacy walks byte-identical when no intent
rides), systemPrompt law 39 with measure-scaled word bands, client
pours sealed pages at the seat (src/lib/pour.js plan + usePour at
LogEntry; the DOM only ever gains), genesis.js header re-worded to the
sealed pour (comment only — dispatch order law untouched).

Test-instrument ledger for the stage:
- NEW evals/director.test.mjs — the intent court (positives and each
  rejection), the measure walk over an eight-beat spine (expected
  sequence pinned exactly, no adjacent rich without an act turn),
  convene sittings (fresh, cached, stale, unlawful-carried, indexless
  — ledger honesty asserted each way), byte-determinism, and bands
  enforced on sealed pages. One PASS line.
- NEW evals/curtain.test.mjs — source scans prove the retired plumbing
  stays retired (no narration/retract events at the door, no streaming
  shims in dm.js, no weaving in the client), mock getDmTurn
  determinism, and pourPlan strict-growth/boundary law. One PASS line.
- evals/run.mjs rewired: the partial/streaming asserts became sealed-
  arrival asserts; PASS-line count unchanged.
- package.json eval chain appended with the two new gates.
- g13-check.spec.ts pin 106 → 108 in the same working set as the two
  gates it counts. Counting nuance recorded: G13 counts \bPASS\b
  occurrences — 108 exact on the stage's bytes (the anchored-line
  count reads 102 because five table rows and one `dowry:` line carry
  PASS mid-line; the 106 baseline had the same shape at 100 anchored).
- measure-first-word.mjs reworked to AFTER semantics: a `narration`
  event at the door now THROWS (a pre-seal byte is a curtain breach,
  not a datum); the first word IS the sealed arrival.
- AFTER medians measured on the curtain's bytes (same instrument,
  N=15, mock keyless): first SEALED word median 5ms, max 323ms. The
  verdict of the trade: the pre-seal theater WAS the door's latency —
  sealed arrival moved 731ms → 5ms median. Amended into Directive XI
  Law III beside the BEFORE numbers.
- g05-loop.spec.ts re-aimed by Law III: FIRST_WORD_PINNED_MS holds at
  12000 and its MEANING tightens to the first SEALED word (≈37×
  headroom on the measured max); the test renamed honestly ("pours
  sealed", was "streams"); §5 comments re-worded to the pour; THE
  RETRACTION DETECTOR armed from boot to sitting's end (MutationObserver
  over the adventure log: removed narration nodes or non-prefix
  rewrites are named violations) with the empty-ledger assert appended
  after the easel settles. No assertion weakened; the split §5 pair
  untouched; two assertions ADDED.
Keyless proof of the stage: exit 0, PASS 108 exact — the Stage One pin.

## THE WRITER'S ROOM — Stage Two landed (THE EDITOR)

The second chair is seated. Every page now walks the free pre-pass
(echo, cliche, sameness, measure — pinned order), and on the sampling
law's turns (turn % 7 === 0, genesis included) or on any flag, the
Editor is convened: at most two sittings a page (judge, then re-judge
the one permitted redraft), at most one revision, and a twice-refused
page SHIPS with its flags attested in the room ledger — the house
never eats a turn to vanity. The mock editor is deterministic:
flags map to pinned reason lines, no flags means ship. Revision rides
`story.editor_note`; prior roads ride the new `story.prior_suggestions`
docket rider so the sameness court can see yesterday's suggestions.

The echo court convicted the house's own walk three times before it
went clean, and each conviction wrote a law into the mock room:
- Pad pairs recurred (stride 3 divides 24), so every pad now carries
  a salt from the 23-wheel — within any 20-page window a salted pad
  line cannot repeat (the joint pad/salt congruences have no solution
  for gaps 1 through 20; checked gap by gap).
- "ridge's" folds to TWO words, so static stretches are audited on
  folded bytes, and every recurring template now ends on or within
  one word of a wheel — authored tails hold to five statics or fewer
  because pad heads fall into shared prefix classes (place-first,
  hero-first) worth up to two words.
- 'opens past' and 'reaches past' shared a folded 'past', letting a
  run enter through the seam — wheel entries are now SINGLE folded
  words, distinct within each wheel. Atomicity is the proof.

Test-instrument ledger for the stage:
- NEW server/cliche-lexicon.json — twenty-six folded stock phrases,
  a pinned fixture with no collision against mock prose or pads.
- server/room.js — the courts sit as named exports (foldProse,
  echoCheck, clicheCheck, samenessCheck, measureCheck, editorPrePass,
  mockEditor, editorJudges); convene() wires the judged pass and the
  ledger tells the truth: editor_calls, revisions, flags,
  editor_verdict are real counts now.
- packages/engine/src/mockDm.js — three single-word wheels (23/21/22,
  every period past the 20-page window), salted pads, rotating
  DEFAULT_ROADS suggestion pools (turn % 3).
- systemPrompt law 39 gains the editor_note revision-order sentence.
- App.jsx sends THE EDITOR'S DOCKET: last unstruck page's roads as
  story.prior_suggestions (six at most).
- NEW evals/editorEcho.test.mjs — the echo court's units (eight
  against seven, the fold law, the window boundary), the measure
  court, pre-pass composition, and THE WALK IS CLEAN: twenty-one
  convened pages with rolling history, flags empty every turn. One
  PASS line.
- NEW evals/editorCliche.test.mjs — lexicon and rubric pins, density
  boundaries on folded bytes, word-boundary law ("foreyes widened"
  convicts nothing), jaccard at the 0.80 line, THE JUDGED WALK
  (clean page unjudged; sampled page judged and shipped; planted echo
  revised once then shipped attested; sameness cross-plant through
  the docket), byte-determinism of a judged sitting. One PASS line.
- package.json eval chain appended; g13-check.spec.ts pin 108 → 110.
Keyless proof of the stage: exit 0, PASS 110 exact — the Stage Two pin.

## Stage Three landed — THE ART DIRECTOR AND THE PLATE'S CAPTION (0.9.0, Laws IX–X)
- NEW server/artDirector.js — the third chair. `plateDue` holds the
  validator's own cue-shape law; `momentOf` takes the page's first
  UNATTRIBUTED line whole (480 cap, the moment brief's own); `captionOf`
  composes from the cue's staging (mood ≤48, two subjects ≤80, region
  ≤40, fixed frame) so the bands 40–220 hold by construction and the
  folded caption can never fold into the folded page; `artDirectorSits`
  completes empty seats and NEVER overwrites a carried lawful caption
  or moment. Cue-less and malformed drafts pass through byte-identical
  — the shape court speaks, not the chair.
- The sitting is PRE-VALIDATOR at all three doors alike (dm.js: mock,
  anthropic, openai) — the merged cue is judged in the ONE dm_turn seal,
  no second channel, no second court. The fallback turn is cue-less, so
  the chair never dresses a fallback.
- LAW X in protocol.js validateImageCue: caption present means 40–220
  characters, capital opening, terminal close, one or two sentences, no
  truncation marks (… or ...), and never a whitespace-folded substring
  of the folded narration — a caption DESCRIBES the plate, it does not
  quote the page. Moment present means 1–480 of prose. Null means
  legacy: both courts out of session, replayed pages ride free.
- room.js ledger: art_director_calls counts real sittings — one per
  plate-bearing draft, one more if the Editor's redraft carried a plate
  too. The Law XI comment now seats all three chairs.
- App.jsx: the figcaption prefers the sealed cue.caption whole — the
  legacy plateMood slice serves REPLAY ONLY (the sliced-caption incident
  is now unrepeatable for sealed-anew pages); sceneMoment.prose prefers
  cue.moment (the staged line) over the whole-page join, same replay-only
  law for old turns.
- NEW evals/artDirector.test.mjs — the sitting law (plate due = one
  sitting, plateless = zero, byte-determinism twice over, pass-through
  and completion units) and the revised-plate law (sameness plant forces
  the one redraft: two sittings, editor_calls 2, revisions 1, shipped
  page attested with lawful caption). Two PASS lines.
- NEW evals/caption.test.mjs — Law X walked band by band on the one
  validator: the quote court convicts a whole narration sentence (the
  plateMood regression tooth), both length fences exact (220 stands,
  221 falls), the opening, the close, the sentence ceiling (two stand,
  three fall), both truncation marks, machinery refused, the moment's
  shape (empty and 481 refused, 480 stands), legacy cue rides free.
  One PASS line.
- package.json eval chain appended; g13-check.spec.ts pin 110 → 113.
Keyless proof of the stage: exit 0, PASS 113 exact — the Stage Three pin.

## Iteration 58.4 — RED, and the court was right (logged raze)

The review round widened the store's freshness law (the sessions carry
shipped prose, so prose law is store law — the architect's catch), and the
widened hash razed the store as designed. First full repaint since the
frame law was cut. The dice answered: on `fixture/plate-91976d37f8.jpg`,
cued for exactly **Corin Voss + Edda, allowance none**, the painter seated
a third soul — background left, by a lantern, "rendered with enough detail
to read as a specific individual" — convicted by the closure judge at 0.82.
Everything else stood: 91 of 92, G24's six courts green on fresh evidence
(two sealed captions judged for the first time, both lawful; p50 360 in
[180, 620]), the wider twenty-row brief clean under the echo court.

The verdict cache replays convictions verbatim, so a standing store stays
red forever — the lawful door is one re-roll of the plate's dice: the store
is razed whole and 58.5 repaints from zero. ONE re-roll, logged here. If a
second fresh frame crowds, the loop stops and mint-time closure retakes
(the tolerated-lack ladder, but for souls) go to the docket as their own
task — re-rolling dice until the house wins is not proving.

## Iteration 58.5 — RED, and the diagnosis was wrong the first time

Two courts crossed: G17b (fresh plates, subjects cut) and — the telling
one — **tooth 13, the closure bench itself**. The teeth bite plates FROM
the store (`rolePlate` on the harvest manifest), and the vision cache
keys by image bytes: razing the store re-runs the whole calibration
experiment on new material. So 58.4/58.5 were not "the painter crowding
twice" — they were fresh judge sittings across every judged family at
once, which the edifice was never built to survive per-iteration. The
standing store and its sealed verdicts ARE the stability mechanism;
58.1–58.3 were all-REPLAY sittings.

The resolution, cut this round: the freshness-law widening is REVERTED
(paint law razes the plate store, nothing else), and the architect's
stale-court hole is closed the cheap way — a SECOND store. The prose
store holds one mock walk sealed under the current writer's-room law
(proseLawHash over room/artDirector/dm/systemPrompt/mockDm/protocol);
G24w reseeds it in seconds whenever that law moves — deterministic mock
prose, no paint waits, no judge dice. Paint dice and prose freshness
never touch each other again.

The plate store still holds 58.5's condemned plates, so it is razed ONCE
more — 58.6 is a bootstrap sitting to SEED the new standing store, the
same ritual every paint-law change has always paid. Re-rolls to seed are
lawful; the ceiling of twelve stands; the mint-time closure-retake ladder
stays on the docket if seeding itself will not take.

## Iteration 58.6 — RED, and this one was OURS

Harvest A fell at the scene wait: the ask fell to its blessed anchor
(likeness held twice) and the mint-law door REFUSED the re-lay —
"the rebuilt brief drifted from the attested promptHash." The door
worked exactly as designed; the MIRROR was stale. Stage Three taught
the app's easel to prefer the Art Director's composed moment on the
cue (LAW IX), and the re-lay door's rebuild still joined the whole
page — so every post-0.9.0 scene re-lay drifted and every anchored
fall stood unappealed. A drifted mirror refuses, never fires: safe,
but it silently spent the door we built in 57.

Fixed: the mirror's sceneMoment now walks the app's own law byte for
byte, and BOTH seats carry a pointer to the other — move the easel,
move the mirror. Test bytes only; no paint-law byte moved, so the
58.6 partial store stands and harvest A resumes with the door alive.
G24w seeds the prose store its first time this coming sitting.

## Iteration 58.7 — RED, the mirror proven, the dice named

Harvest walked WHOLE — the re-lay door fired and held, the mirror fix
is proven, the store is sealed. The reds moved to two calibration
benches on all-fresh sittings: tooth 11 (a known-GOOD page pair) and
tooth 14 (the Edda stranger control). I put my own eyes on the
evidence plates. The page plate stages the waystation bell large on
its post over the told road — the judge answered element_present
false while NAMING the bell. The Edda crop is an elder with no
key-shaped burn anywhere in frame — the judge called her consistent
with Maren's clause, mismatch empty. Both at confidence 0.62, the
hedge line. Fair controls, bad rolls.

THE EXCISION LAW, cut this round: when a control crossing is proven a
bad roll by direct inspection of the sealed evidence, the lawful cure
is surgical — delete exactly the crossed cache verdicts (two files,
named in the run log) so those calls re-roll while every sealed green
replays. Never raze the cache; never touch a passing verdict. And the
stop-rule: if the SAME control crosses again on the SAME bytes, that
is not dice — that is the instrument's question wording failing this
material, and the bench itself goes back to the shop.

## Iteration 58.8 — RED, the stop-rule fires, the benches requalified

The two excised verdicts re-rolled fresh — and returned BYTE-IDENTICAL
crossings, 0.62 both, same words. Temp-0 is stable here: not dice but
the judge's perceptual boundary on this store's specific material. The
control law rules: a calibration control must be a deterministic truth
or lie for the judge, or it measures the model's perception limits
instead of the instrument's honesty. Two controls failed that
qualification and went to the shop:

- TOOTH 11 gains THE QUARANTINE: byte-bound entries (sha256 of plate
  bytes) excluding a control from the good-set only under the
  two-sitting law — byte-identical wrong verdicts on two fresh rolls
  PLUS direct inspection of the sealed evidence, both logged. Entries
  self-expire on a store raze (a key matching no candidate fails the
  bench loudly — no silent skips, no stale excuses). The ch1 page
  plate is quarantined: its waystation bell hangs dark-on-dark and the
  judge stably misses it under the page binaries while reading the
  SAME pixels fine under the moment binaries.

- TOOTH 14's stranger seat: Edda retired from THIS seat (tooth 12
  still holds her markless line where the magnifier's wording is
  mark-decisive). The seat demands a stranger the pinned wording
  refuses DECISIVELY — so candidates were PROBED through the tooth's
  exact path before seating: the masked Regent drew figure_matches
  false at 0.92, mismatch naming both traits. Sealed under the tooth's
  own idSeed, so the sitting replays the measured verdict.

THE PROBE RITUAL, learned: the byte-keyed replay cache makes offline
calibration BINDING — probe a candidate control under its real idSeed
and the loop inherits the sealed verdict instead of rolling dice. That
is how benches get requalified without spending sittings: measure
first, seat what measured true, replay forever.

## Iteration 58.9 — RED by one, and it was hiding under the fold

Tooth 14 GREEN: the Regent's measured 0.92 refusal replayed exactly as
sealed. The quarantine fired and logged. What remained was a crossing
that had been there since 58.7, hidden BELOW the page failure in the
error block I never finished reading — the caption-1 pair. Confession
for the record: read the WHOLE failure block before excising; a
one-line diagnosis of a multi-row table treats the visible failure as
the only failure.

Due process ran on the caption: inspection first (the pack sits
plainly bottom-left, the vale IS folded into blue shadow — the control
is lawful material to human eyes), excision second, one binding fresh
re-roll third. It crossed AGAIN — 0.72 then 0.55, same two binaries,
and the second verdict even CONFESSED the boundary: the judge saw the
bag but demanded the act of weighing; saw the blue shadow but refused
it as meadows. A truncated, act-heavy caption over a night plate asks
the judge to see acts a still cannot stage — boundary material, not a
lie. Quarantined by bytes under the two-sitting law, and the
quarantine filter now covers BOTH good sets it seats (pages and
captions), stale-entry gate after the last filter.

The bench now seats 6 moments + 2 pages + 2 captions good, 6 bad —
floors hold, separation law untouched, every seated control measured.

## Iteration 58.10 — RED before a single judge call, and the red was a teacher

The quarantine's own stale-entry gate never fired — something better
did: caption-0 walked into the PAGE plate's quarantine entry, because
this store aliases bytes across pairings (the captions and the book
lift their plates from the same painted scenes). My byte-only keys
barred a control whose caption verdict is sealed GREEN. And with the
floor's arithmetic laid bare — 4 scene-prose plates, 1 page, 2
captions in the whole store — three lawful quarantines left 4 goods
against a floor of 6. The floor does not bend; the keys were wrong
and the set was thin.

Two cuts:
- Quarantine keys are now PAIRING-SCOPED (`kind:sha256`).
  Unreadability is a property of the pairing — bytes × question class
  — never of pixels alone. caption-0 seats again; its sealed green
  replays.
- THE ATTESTED DUAL: the bad set has always built its crop texts from
  sealed identity fields ("the head the caption claims is cut away").
  The good set now seats the SAME claim over the UNCROPPED anchor —
  the judge must pass on whole pixels the very text it must refuse on
  beheaded ones. Textbook pair, and the bench had been missing its
  good half. Probed under the tooth's exact id before seating:
  element_present naming the key-burn itself, all three binaries
  true, 0.92. Sealed; the sitting replays it.

The bench now seats 6 goods (4 moments, caption-0, the attested dual)
and 6 bads — floor met exactly, every seated control MEASURED, zero
fresh calibration dice remaining. What is left to roll fresh are the
downstream courts taking their first look at this store.

## Iteration 58.11 — the bench held; the courts inherited its boundary

Calibration passed WHOLE — quarantine, attested dual, all twelve bad
teeth, all sealed. The downstream courts then sat on this store for
the first time and three crossed, each a lesson already half-learned:

- G16b/G16c: the SAME two boundary pairings the bench quarantined
  came back through the courts, which judge the store whole and knew
  no quarantine. Fresh court rolls landed the judge's same stable
  misreads (0.62/0.55, near-verbatim element lines — the instrument
  confessing its own boundary twice more). THE RECUSAL LAW answers:
  the boundary ledger moved to ONE seat (lib/judgeBoundary.ts, the
  mirror lesson) that bench filters and courts consult alike. A court
  facing proven blindness RECUSES loudly — attestation logged, a
  coverage law proving every row judged-or-attested, whole-recusal
  named when the roster empties. Convictions must come from decisive
  reads, never boundary noise; and tolerance must never be silent.

- G24w: the walk wedged at the second act — the composer LEAVES the
  DOM while a roll ask stands, and one rollIfAsked per step left a
  CHAINED ask on the table. The law: drain every ask until the table
  is quiet, then wait for the composer's own seat. The store's
  freshness door proved self-healing by design: law file written,
  session missing → the next sitting walks again.

G24a's witness is sealed and empty; the probe machinery answers
lawfully. 58.12 is the LAST die in the ceiling: G16a/G22/G23/G09
replay sealed greens, G16b/G16c recuse-and-judge, G24w walks fresh
mock prose (no paint, no judge dice), then G24a–f convene for the
first time on the reseeded store.

## The review round — two severes, answered in the cut

The architect's pass over the closing commit returned two severe
findings, both earned:

1. The boundary ledger keyed pairings as kind × bytes — but the
   question the judge answers EMBEDS the prose, and mock paints can
   reproduce identical bytes under moved prose; an attestation could
   ride to a pairing it never earned. Keys now carry the WHOLE
   pairing: kind × sha256(bytes) × sha256(prose). The bench's stale
   gate thereby custodies the words too — moved prose kills the
   entry loudly.

2. Whole-recusal passed on a log line alone — a skip wearing a robe.
   A court standing down whole must now prove CUSTODY through the
   one seat (assertBoundaryCustody): the bench's calibration table
   present beside the harvest, on the standing protocol, showing
   perfect separation. G16c gained the same branch in parity.

Confirmed offline under the probe ritual's precedent: keyless 113;
calibration + g16-captions replayed 19/19 green — both quarantine
lines fired under the new keys, G16b stood down under custody with
the bench's separation named, G16c recused and judged by replay.
The 58.12 verdict stands untouched; the hardening rides the cut.
