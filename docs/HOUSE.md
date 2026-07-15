# HOUSE — Running the Establishment

The operator's manual: what the house needs to open its doors, lane by lane. The canonical starting point is [`artifacts/mydungeon-quest/.env.example`](../artifacts/mydungeon-quest/.env.example); this page explains what the knobs mean. Two rules before any of them: **nothing is prefixed `VITE_`** (server secrets never reach the client), and **a keyless fork never learns money exists** (billing, tiers, and ceilings vanish entirely when the house isn't configured).

## The keyless floor

Set nothing. The game runs a deterministic mock Dungeon Master (`MOCK_SEED=mydungeon-quest`), procedural plates, and honest silence — and the entire 65-gate suite passes exactly this way. Keys unlock the live experience; they never unlock correctness.

## The door (the Dungeon Master)

| Knob | Meaning |
|---|---|
| `ANTHROPIC_API_KEY` | Seats Claude at the table. |
| `DM_PROVIDER` | `auto` (default) picks from available keys; pin to a provider or `mock`. |
| `DM_MODEL` / `DM_MODEL_GENESIS` / `DM_MODEL_UTILITY` | Model ids for turns, world-forging, and small utility calls. |
| `OPENAI_API_KEY` + `DM_MODEL_OPENAI` | The understudy — steps in only after a live turn fails twice, bound to the same schema and validator. |
| `DM_FALLBACK=off` | Sends the understudy home. |

## The lanes (media)

Every lane is an adapter chain ending in a deterministic mock; `*_PROVIDER=auto` selects from whichever keys exist.

| Lane | Keys | Tuning |
|---|---|---|
| Paint | `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `OPENAI_API_KEY` | `PAINT_PROVIDER`, `PAINT_MODEL_GEMINI`, `PAINT_MODEL_OPENAI`, `MAX_PAINT_DIM` |
| Voice | `ELEVENLABS_API_KEY`, `OPENAI_API_KEY` | `SPEAK_PROVIDER`, `ELEVENLABS_VOICE_MODEL`, `SPEAK_MODEL_OPENAI`, `MAX_SPEAK_CHARS` |
| Music / SFX | `ELEVENLABS_API_KEY` | `MUSIC_PROVIDER`, `SFX_PROVIDER`, prompt-length guards |
| Film *(retired)* | `REPLICATE_API_TOKEN`, `RUNWAY_API_KEY`, `VIDEO_*` | The film era ended July 2026; the knobs remain for the archive, the pipeline sleeps until the Commons reels wake it under its own flag. |

Remember the Sound Law's corner of this: art degrades to procedural plates, but **the audio floor is silence** — a keyless table plays nothing, never a placeholder tone.

## The watch and the toll

The watch counts **before** any provider is called; abuse exhausts a counter, not a wallet.

- **Ceilings:** `MEDIA_IMAGE_CAP=80`, `MEDIA_MUSIC_CAP=8` per session; `SPEND_CEILING_DEFAULT` and `SPEND_CACHE_MS` govern the ledger; `ALERT_WEBHOOK_URL` is where the watchtower shouts.
- **Rate & size guards:** `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_DM_MAX`, `RATE_LIMIT_MEDIA_MAX`, `MAX_REQUEST_BYTES`, `MAX_PROMPT_BYTES`, `MAX_AUDIO_BYTES`, `MAX_PDF_HTML_BYTES`, and per-lane timeouts (`PAINT_TIMEOUT_MS`, `SPEAK_TIMEOUT_MS`, `MUSIC_TIMEOUT_MS`, `SFX_TIMEOUT_MS`).
- **The toll-house:** the taste pours exactly **six turns**; refusals arrive as receipts; `TOLL_GRANT_TTL_MS` bounds a grant's life. Player-facing media tiers are **Parchment** (procedural art, silence) and **Illuminated** (painted stills, voiced narration, music at the turning points); the **Long Road** tier is charted in Directive V, its figures deliberately configuration, not code.

## The house services (signed-in)

| Knob | Meaning |
|---|---|
| `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | The front desk — accounts and sessions. |
| `DATABASE_URL` | Postgres for the house ledger and vault index. |
| `PRIVATE_OBJECT_DIR`, `MAX_VAULT_BLOB_BYTES` | The vault's shelves and their limits; chain law is re-verified on every deposit. |
| `HERALD_BOOT_PING`, `LOG_JSON`, `NODE_ENV`, `PORT`, `APP_ORIGIN` | The herald and the housekeeping. |
| `PLAYWRIGHT_CHROMIUM_PATH` | The press that prints keepsake folios. |

Everything here is optional by design. The house is a set of doors around a game that stands on its own floor — see [`CLAWS.md`](CLAWS.md) for the laws and [`ROADMAP.md`](ROADMAP.md) for which doors open next.
