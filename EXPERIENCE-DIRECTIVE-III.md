# EXPERIENCE-DIRECTIVE III — THE AUDIENCE CUT

The engine tells true stories. The Experience Cut gave them a voice. This cut gives them an **audience**: a player who arrives cold and stays, faces and voices that never waver, and keepsakes — book and audiobook — good enough that sharing them is the marketing. EXPERIENCE-DIRECTIVE.md remains law beneath this one.

## Law amendments, stated plainly (sync GAME_NOTES.md and the READMEs in the same change)
1. **The Quiet Record.** Players are told stories, never shown machinery. The journal remains the single record from which every keepsake is assembled — but the notary's desk (verify.html) is unlisted: no player-facing link, mention, or copy anywhere. Its eval stands; the desk simply keeps no sign.
2. **Taste before the door.** A guest may play the free taste (the first chapter) without giving a name. The door asks at the cliffhanger — "Keep your story" — and the vault adopts the guest's tale on sign-in, losing nothing.
3. **The Brand Law.** The Icosahedron Rose (`public/brand/mark.svg`, `public/icon.svg`) is the mark. `HOUSE_STYLE` (exported from `src/lib/cinema/prompts.js`) governs all marketing art. The landing reel shows only real generated art — never placeholders, never stock. Player-facing strings still never say: sovereign, hash, provider, mock, telemetry, IndexedDB.

## Phase 0 — The open door (onboarding)
Guest session: taste plays without sign-in (server issues a guest grant against the same quota table); Clerk sign-in moves to the first chapter's close and to any pour beyond the taste. First-forge defaults to the guided path: Oracle's three questions → Cast the Bones → Chapter I. Three coached turns (type anything / the gold button is a real die / this ribbon is your epic), dismissible, never shown twice. Veterans skip everything.
Gate `door.test.mjs`: guest taste plays keylessly; adoption on sign-in preserves the journal byte-for-byte; coach marks fire once.

## Phase 1 — The app shell (the repaint, in-app)
Bottom tab bar (Tale / Codex / Book), thumb-zone composer, overlays become bottom sheets, one motion system (ink-bloom transitions, letterbox cinematic enters), plates full-bleed by default, vellum-grain surface texture, the roll button elevated to signature component (breathing gold, engraved DC), ember accent (`--ember`) for danger, Candlelight reading mode, loading states as theater ("The ink dries…") — never a spinner. Arrival adopts the reel + mark from the landing.
Gate `shell.test.mjs`: tab state survives navigation; reduced-motion honored everywhere; no spinner class remains.

## Phase 2 — The Sitting and the Warden (faces that never drift)
The Sitting: three bust candidates at introduction; the player blesses the hero's, the engine blesses NPCs' deterministically; unblessed are deleted — the anchor law's "first bust" becomes "first blessed bust." Structured identity tokens (hair, eyes, skin, garb, silhouette, one *mark*) written at cast_add and front-loaded in every prompt. The Warden: one vision check per delivered render ("same soul as this reference?") — fail, one re-roll with the mark emphasized; fail again, the procedural plate stands; verdict recorded on the media row. Wear (wounds, corruption, region rot) routes through the adapters' edit door with the anchor as base image. Two anchored subjects per plate; larger scenes split into facing half-plates.
Gate `sitting.test.mjs` + `warden.test.mjs`: one surviving bust per soul; blessed hash is the referenced hash; verdict ladder; half-plate split at 3+.

## Phase 3 — Voices that hold (the tenor law)
Cast cards gain explicit `gender`, `ageBand`, `timbre` written by the DM at cast_add (one additive protocol field) — regex inference over prose retires. A curated, typed voice roster (gender × age × timbre bins) replaces hash-picks over a flat pool; existing `voiceId`s are grandfathered, never recast. Every dialogue block may carry one `tone` word (whispered, urgent, wry, grieving, triumphant…) mapped to ElevenLabs v3 style tags; the narrator takes scene tenor from combat, blight, and cinematic type. The hero's voice is chosen at the Sitting from three samples.
Gate `tenor.test.mjs`: card fields drive casting; tone maps to tags; a dead soul still never speaks; legacy voices unchanged.

## Phase 4 — The book, finished
Plates inline at their actual turns; full-bleed cover and act openers from the tale's key art; dramatis personae with blessed busts, fate lines, first and last sealed words; running heads, folios, `orphans:3;widows:3`, `break-inside:avoid`; a 6×9-with-bleed preset beside Letter/A5; the human colophon (already rewritten) stands. The bound PDF renders server-side into storage with a stable download link on the tale.
Gate `bookFinish.test.mjs`: inline plates land at their turns; all three presets render; dramatis quotes are sealed quotes only.

## Phase 5 — The Audiobook (the whole adventure, start to finish)
Distinct from the retold episode: a verbatim script of every turn in order — narrator for description, cast voices for dialogue, the hero's chosen voice reading the player's own lines ("you say —"). The campaign theme (one ~12s motif generated at session zero, cached) opens and closes it. Rendered server-side as a job into storage with progress; ID3v2 chapters with plate art; streamable in-app, downloadable. Priced as a pour beyond the taste — render once, keep forever.
Gate `audiobook.test.mjs`: script is verbatim and complete; redacted pages silent; chapters monotonic; theme opens and closes; job resumes after interruption.

## Phase 6 — The share layer (the reason for all of it)
A public tale page per chronicle at `/t/:slug` (owner opt-in): cover, three best plates, one sealed quote, the episode player embedded, "Forge your own." A per-tale OG card composed server-side (key art + title + quote). "Share this moment" on crits, deaths, and bond scenes → a plate card with caption and mark. The destiny phrase shares as "Summon my hero."
Gate `share.test.mjs`: unlisted by default; published page contains no banned words; OG card composes for a tale with zero, one, and many plates.

## Phase 7 — The wrappers
Android as TWA. iOS as a thin wrapper — **flag before building**: Stripe-in-webview for digital subscriptions will be rejected; plan StoreKit or an external-purchase entitlement, and keep the web checkout for the open web only.

## Constraints (unchanged in spirit)
Protected: `server/dm.js` core, `protocol.js`, `seal.js`, `rules.js`, the Audio Director's interlock, Foundry cache-key behavior, the Chronicler's three laws. Evals append-only; the PASS count only grows. Keyless first for every client surface; live keys only where a phase says so. One phase per checkpoint, in order; `npm run check` green at every close.
