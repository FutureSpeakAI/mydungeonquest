# MyDungeon.Quest

An AI-narrated solo tabletop RPG: a Dungeon Master model runs a persistent, locally-stored fantasy campaign for one player, complete with dice rolls, combat, cinematics, and generated art/audio.

## Run & Operate

- `pnpm --filter @workspace/mydungeon-quest run dev` — run the game (Vite dev server + Express API, both on the artifact's routed port)
- `pnpm --filter @workspace/mydungeon-quest run build` — production build (outputs to `artifacts/mydungeon-quest/dist`)
- `pnpm --filter @workspace/mydungeon-quest run eval` — headless bench: validates DM protocol, reducers, canon integrity, PG-13 scrubber, budget caps, seal/tamper invariants. Keep this green.
- `pnpm --filter @workspace/api-server run dev` — run the (separate, unrelated) API server template artifact
- Required secrets: `ANTHROPIC_API_KEY` (real AI Dungeon Master; falls back to a deterministic mock without it), `OPENAI_API_KEY` (real illustration art via the Paint provider), `ELEVENLABS_API_KEY` (voice/music/SFX)
- Provider selection env vars (shared, non-secret): `PAINT_PROVIDER=openai`, `SPEAK_PROVIDER=elevenlabs`, `MUSIC_PROVIDER=elevenlabs`, `SFX_PROVIDER=elevenlabs`, `DM_MODEL`/`DM_MODEL_GENESIS` (Anthropic model ids)

## Stack

- React 19 + Vite 7, plain JS/JSX (not TypeScript by design)
- Express 5 server (`artifacts/mydungeon-quest/server/`) serving `/api/*` (DM turns, image/voice/music/sfx generation, PDF character sheet binding via Playwright) and, in production, the built static app
- Client-side persistence via Dexie/IndexedDB — no shared Postgres database, fully local-first
- Anthropic Claude (tool-calling) for the Dungeon Master; OpenAI for illustrations; ElevenLabs for voice/music/SFX

## Where things live

- `artifacts/mydungeon-quest/` — the whole game (imported wholesale from an external build, not scaffolded from a template)
  - `src/` — React app; `server/` — Express API + adapters; `scripts/dev.mjs` — dev process orchestration; `evals/` — headless bench suite
  - `GAME_NOTES.md`, `BUILD_STATUS.md`, `CHANGELOG.md`, `NOTICE.md`, `README.md` — the game's own original docs, preserved (lightly corrected after the July 2026 film retirement); the repo-level `README.md` at the workspace root is the canonical public documentation
- `artifacts/api-server/`, `artifacts/mockup-sandbox/` — unrelated template artifacts, not part of the game

## Architecture decisions

- This artifact was imported wholesale from a finished external build rather than adapted to the repo's usual OpenAPI/shared-backend/Postgres conventions — it intentionally keeps its own self-contained Express server and IndexedDB storage.
- Dev mode runs two processes: Vite owns the artifact's single externally-routed port; the game's own Express server runs on an internal-only port (`INTERNAL_API_PORT`, default 3001) and is reached via Vite's `/api` proxy. Production instead builds static assets and lets Express serve everything on the routed port directly.
- Added `@vitejs/plugin-react` (absent from the original project) because Vite 7's default esbuild JSX transform is not "automatic" without it, which broke JSX at runtime ("React is not defined").
- Extended the Anthropic tool JSON schema in `server/dm.js` with the same enums the client-side validator (`src/lib/protocol.js`) already enforces (roll kinds, dice, advantage, cinematic types, combat ops, zones, image cue kinds, time units). Without these, newer Claude models produced structurally valid but semantically out-of-range values that the strict validator rejected, silently falling back to mock narration on every turn.
- The Quieting (July 2026): every non-narration sound flows through a single client Audio Director (`src/lib/cinema/audioDirector.js`) enforcing THE SOUND LAW — one voice at a time, music/SFX only as short punctuation phrases (never beds, never loops), voice preempts music instantly, late accents are dropped, and mock-provenance audio is refused at delivery (keyless tables are silent). The WebAudio drone score (`score.js`) and speechSynthesis dialogue (`voice.js`) were deleted; the `score`/`voice` settings toggles were removed and legacy values are stripped on settings load.
- The Cast Made Flesh (July 2026): voices are cast by reading the card once at first introduction and persisted on the cast card (`voiceId`); pre-law souls keep their legacy name-hash voice (never recast mid-tale). Cast cards carry `known_facts[]`, `bond_arc`, `introduced_turn`, and a status enum (`active|dead|missing`) with resurrection retcons refused. One dm_turn law amendment — THE DEAD DO NOT SPEAK — is enforced by threading the pre-turn cast snapshot into `validateDmTurn` on the client turn path and every server validate/repair loop (the context arg is optional, so new call sites must remember to thread it).
- Acts, Chapters, and Endings (July 2026): the story reducer (`src/lib/story.js`) owns endings — arriving at the final beat no longer completes the tale (the epilogue beat must be *played*; advancing while already on it completes), and "Seal the Tale" records `codex.sealing` which steers the DM into a short combat-free denouement via [STORY] directives, completing at `final_turn` even across `story:null` turns. The UI chains act interstitials through the same Cinematic card (DM card → act card → narration, per THE SOUND LAW), retires the composer on completion, and the Sealing ceremony appends one final `sealing` journal event (turn/roll counts) before marking `campaign.sealedAt`. The mast reads `chapterInfo`/`actInfo`.

## Product

- Forge a new world (campaign), play through DM-narrated turns with dice rolls and combat, receive cinematic story beats and generated illustrations, and export/print a character sheet as PDF. Everything is stored locally in the browser; there is no server-side account system.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Real Anthropic/OpenAI/ElevenLabs calls require the corresponding secret to be set — without it, the game gracefully falls back to mock providers rather than failing.
- PDF character sheet export (`/api/bind-pdf`) needs a Playwright Chromium binary (`npx playwright install chromium` inside `artifacts/mydungeon-quest`).
- Anthropic model ids change frequently; if the DM starts silently falling back to mock/fallback narration, check `DM_MODEL`/`DM_MODEL_GENESIS` against `GET /v1/models` for currently valid ids.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- The game's original documentation is preserved at `artifacts/mydungeon-quest/GAME_NOTES.md`, `BUILD_STATUS.md`, `README.md`
