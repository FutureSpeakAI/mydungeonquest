> **SUPERSEDED** — kept for history. Current law: EXPERIENCE-DIRECTIVE.md and EXPERIENCE-DIRECTIVE-III.md at the repo root.

# HANDOFF — MyDungeon.Quest v0.2 "The Engine Cut"

The engine has been remade. Your job is **the visuals only**: execute the remaining
phases of `REMAKE-DIRECTIVE.md` (this repo root). The game lives in
`artifacts/mydungeon-quest`. Keep `npm run check` green after every change.

## What the engine cut already delivered (do not rework)
- **The DM has memory.** Prior turns ride along as a real conversation
  (`history` in the payload); the system prompt is static per campaign with
  narrative craft + session-zero orchestration; prompt caching actually holds
  (breakpoints on system + last stable message).
- **Real streaming.** `/api/dm?stream=1` forwards narration as it forms inside
  the tool call (`event: narration` carries the accumulated text; `event: turn`
  carries the validated result). The client renders it as a "weaving" passage
  with a caret. Mock mode streams too, so this is testable keyless.
- **Three-lane Foundry + lookahead.** Image / video / audio lanes run
  independently; while beat N plays, beat N+1's film, still, and stinger are
  briefed under stable cache keys (`beat:{campaignId}:{index}:film|still|score`).
- **The Cinematic is a ladder.** Film (generated video) → Animatic (Ken Burns
  over the generated still) → procedural, best available wins; generated music
  stinger or score swell underneath; the dialogue line speaks in its soul's
  cast voice.
- **Live video adapters.** OpenAI Sora (`VIDEO_PROVIDER=openai`) and Replicate
  (`VIDEO_PROVIDER=replicate` + `REPLICATE_VIDEO_MODEL`), degrading safely to
  mock.
- **Sound identity.** Persistent adaptive WebAudio score (act/HP/blight/combat
  intensity, tritone villain motif) and deterministic per-soul voice casting.
  Settings has Score and Voiced narration toggles.
- **De-teched chrome.** Hash ticker gone; diegetic status lines; card badges say
  "sealed"; meta/title rewritten. Banned words in player-facing strings:
  sovereign, hash, provider, mock, telemetry, IndexedDB.

## Your phases (from REMAKE-DIRECTIVE.md)
- **Phase 1** — the Prologue Render (forge-as-title-sequence; key art; hero
  portrait materializing live).
- **Phase 3** — the image-first table (full-bleed panels, gallery Codex,
  parallax region strip). The plumbing exists: media rows carry `label` and
  `variant`; the region strip already prefers the generated plate.
- **Phase 5 remainder** — wax-seal glyph animation in the header (the footer is
  already clean).
- **Phase 6** — the Face: full-bleed title screen, bundled key art for first
  launch, chronicle-card covers, attract mode.
- **Phase 7** — the Book: film-strip spread, embedded fonts, key-art cover.

## Contracts you must not break
- `validateDmTurn` and the `dm_turn` schema; entropy consumption; roll gating.
- The seal: `appendEvent`, redaction semantics, `verify.html` compatibility.
- Foundry constructor/`allowed()` signatures and cache keys (evals depend on
  them). Media rows: `{cacheKey, promptHash, generationSpecHash, assetHash,
  originTurnHash, label, variant, referenceAssetHashes}`.
- **The anchor law**: `options.referenceLabels` on a job resolves each label to
  that soul's first bust (or region's first plate) at generation time; the
  chosen anchors ship to providers as `references` and their hashes are sealed
  into the media attestation. Do not bypass it when adding visual surfaces —
  any new render of a known face or place should carry its label.
- The SSE event names `narration` / `turn` on `/api/dm?stream=1`.
- Acceptance tests at the bottom of REMAKE-DIRECTIVE.md, all runnable keyless.
