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

### Still deliberately open
- Chronicler utility-model compaction remains fallback-only.
- SRD action catalog remains a foundation, not a compendium.

## Visual render pass — The Engine Cut on screen (2026-07-13)
The engine was left untouched; only the player-facing surfaces changed.
- **Prologue Render:** the forge plays a title sequence and hero portrait; the
  first key art is adopted before turn one, so Chapter I opens on a painting.
  Key art regenerates per act.
- **Image-first table:** the Codex wears painted portraits and region plates
  when they exist (falling back to monograms); illustration panels go
  full-bleed on mobile; the region strip parallaxes on scroll (respecting
  reduced-motion). No text is baked into procedural plates.
- **The wax seal:** a stamp in the header presses closed with a brief flash on
  every turn commit and taps open the bound book. No hash-ticker returned.
- **The Face (title screen):** full-bleed key art with a slow Ken Burns cycle,
  a single "Begin your legend" action, rotating attract lines, and chronicle
  cards wearing their key art as covers. First launch with zero saves is
  purely cinematic. Four bundled painterly 16:9 key-art paintings live in
  `public/keyart/` (≤280KB each, no baked-in text; titles are typography).
- **The Book:** a film-strip "Reel" spread of beat keyframes, a key-art cover,
  and embedded Cinzel + Crimson Pro (latin, OFL) so the exported book renders
  with its true typography fully offline. The colophon carries no builder
  jargon.
- **PDF binding:** HTML binding always works (client-side). PDF binding now
  discovers a Chromium at runtime — `PLAYWRIGHT_CHROMIUM_PATH`, then
  `/usr/bin/chromium`, then the newest Nix `chromium` — so it works in this
  environment without a hardcoded path. Verified: 200 → valid PDF.

### Environment notes for future work
- The pasted directive references `HANDOFF-REPLIT.md` / `REMAKE-DIRECTIVE.md`,
  which do not exist in the repo; the pasted spec is authoritative.
- `npm run check` must run keyless (unset the AI keys) or its eval asserts fail.
