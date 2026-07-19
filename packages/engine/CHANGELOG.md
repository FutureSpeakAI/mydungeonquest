# Changelog — fatescript

All notable changes to the fatescript engine, in plain words. The engine is the pure-law half of MyDungeon.Quest: no dependencies, no network, no database. Every rule that can be judged in plain JavaScript lives here, and the game that hosts it imports these exact functions rather than keeping copies.

## 1.0.0 — first stable (2026-07-19)

The first stable release. Everything the engine promises is guarded by its own keyless suite — 58 gates that run in seconds with `npm run check`: no API keys, no network, one plain-language PASS line per gate.

- **The whole law moved home.** Every pure rule of the game now lives in engine seats: the story protocol and its folds, dice and rounds, markets, purses and troves, presence, party and threads, the traveler's chart and the watch, the writer's-room rubric, the forge, onboarding, genesis, and the pour. The game re-exports these seats; nothing is duplicated on either side.
- **The desk.** New `fatescript/desk`: a pure verifier for exported tales. It checks the hash chain, the head seal, and the Ed25519 signatures of a chronicle anywhere JavaScript runs — a single flipped byte is refused with the record named. The game's own export door uses this same seat. And the desk never takes an envelope's word about its own signatures: while a public key or any record's ink rides the envelope, a hash-only claim is refused as a downgrade — the laundering path an architect's pre-release reading caught, shut and gated on both sides before the release greens.
- **Back-compat, sealed.** A dedicated gate loads a save from before the possessions era, freezes it, and walks every reader: old tales load untouched, absences read as absences, and upgrades only ever touch copies.
- **Two subpath doors.** `fatescript/room` (the writer's-room law) and `fatescript/cinema/prompts` (the easel's prompt law) are importable as subpaths only — kept off the root door deliberately, where their names would collide.
- **A suite that grew honest.** Seventeen gates became fifty-eight: thirty-nine ported twins in one wave, a back-compat gate, and the desk gate. Where a game gate has no engine twin (React renders, database migrations, server provider seats), the absence is named in BUILD_STATUS rather than papered over.

### Before 1.0.0

The `0.x` through `1.2.0-dev` line carried the engine's founding directives — the story protocol, validation and repair, the chronicler, the living world, the saga cut, and the world groundwork. That history was written where the law was born: in the game's own CHANGELOG, before the port carried the seats here. Directives VII–XIV, whose law fractions this engine now holds, are shelved under `docs/directives/` with a note on the two lineages.
