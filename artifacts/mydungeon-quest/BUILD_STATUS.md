# Build status

## Delivered vertical slice
- Playable title → world forge → hero forge → adventure table flow.
- Deterministic keyless Dungeon Master and media mocks.
- Client-authoritative roll resolution and reducers.
- Story spine, cast canon, region state, blight, and role deadlines.
- Procedural cinematic floor with generated-media upgrade queue.
- IndexedDB persistence, sealed journal, redaction, export/import, and fork semantics.
- Offline verification page and illuminated HTML/PDF storybook path.
- Mock headless bench and GitHub Actions workflow.

## Deliberate limitations of 0.1.0
- Commercial video providers remain behind the adapter boundary; the default video adapter produces a deterministic cinematic keyframe and the UI uses its procedural animatic.
- Anthropic live mode is implemented, but the UI uses completed tool payloads rather than reconstructing arbitrary partial JSON from upstream fine-grained tool deltas.
- The SRD-compatible action catalog is a foundation rather than an exhaustive spell and monster compendium.
- Playwright Chromium must be installed in the deployment image for server-side PDF binding; offline HTML binding always works.

## Next engineering tranche
- Full action catalog and attack/damage resolution handshake.
- Native live adapters for selected image/video providers with reference conditioning.
- Chronicler utility-model compaction and richer world ticks.
- End-to-end browser tests for installation, restore, tamper audit, and PDF binding.

## Verification evidence — 2026-07-13
- `npm run build`: PASS
- `npm run eval`: PASS — 90/90 schema-valid turns across five personas; 30 client rolls; 15 cinematics
- Production Express boot on `0.0.0.0:3001`: PASS
- `/api/health`, mock image bytes, async mock video polling, and video asset retrieval: PASS
- `/api/bind-pdf` with system Chromium: PASS — valid PDF 1.4 output

## v0.2.0 — The Engine Cut (2026-07-13)
- DM conversation memory: rolling history in every call; static per-campaign
  system prompt with narrative craft and session-zero orchestration; prompt
  cache breakpoints that actually hold.
- Real streaming narration end to end (Anthropic partial tool-JSON → SSE →
  weaving render), with mock-mode streaming parity for keyless testing.
- Foundry v2: three independent lanes, explicit cache keys, race-safe cache,
  beat lookahead briefing film/still/stinger for the next beat.
- Cinematic v2: Film → Animatic → procedural ladder consuming Foundry assets;
  generated stinger or score swell; cast-voiced dialogue line.
- Live video adapters: OpenAI Sora and Replicate, safe mock degradation.
- Adaptive WebAudio score engine and deterministic per-soul voice casting,
  with Settings toggles.
- Player-facing chrome de-teched (no hashes, providers, or protocol words on
  screen); `verify.html`, the colophon, and the journal keep full precision.
- `npm run check` green: build + 90/90 bench + new engine assertions
  (static prompt, partial-JSON extraction, streaming parity).

### Still deliberately open (visual phases → HANDOFF-REPLIT.md)
- Prologue Render, image-first table, title-screen key art, card covers,
  wax-seal animation, storybook film-strip spread.
- Chronicler utility-model compaction remains fallback-only.
- SRD action catalog remains a foundation, not a compendium.

## v0.2.1 — The Anchor Law (2026-07-13)
- Reference conditioning end to end: souls anchor to their first bust, regions
  to their first plate; anchors resolve lazily by label at generation time and
  ride to providers (gpt-image-1 edits, Sora input_reference, Replicate
  image input) with mock parity for keyless proof.
- Degraded regions now repaint on state change, anchored to the original
  plate — the land sickens without moving.
- Deterministic name-hash seeds on portraits and plates for seed-honoring
  providers.
- Anchor hashes sealed into media attestations and stored on media rows
  (`referenceAssetHashes`) — the book can prove which reference produced
  which image.

