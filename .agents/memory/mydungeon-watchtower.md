---
name: MyDungeon Watchtower laws
description: Production hardening doctrine — spend ceilings, durable limits, logging, and the static front gate.
---

- **Spend ceilings degrade per provider, never darken.** Every real provider (DM included) is judged against its OWN daily ceiling; a spent one is skipped in favor of the next artisan, ending at the silent mock floor. Never turn a spent ceiling into an error response, and never let a "both spent" shortcut hide a single spent provider — that was a review rejection once.
- **The higher count wins.** Spend tallies live in Postgres AND an in-process mirror; the guard reads the max, so a mislaid ledger can only be stricter, never looser.
- **Durable burst limits fail open to memory.** Rate windows count in Postgres when a ledger stands (restart-proof); on DB error or a keyless fork they fall back to the in-memory window — never a 500, never unguarded. Test via injected query/durable seams, same stub pattern as the toll-house.
- **Logs carry names and numbers, never tales** — no prompts, story text, or secrets in any structured line.
- **PDF binding rides the Nix-installed system Chromium** (resolved env var → /usr/bin → PATH); do not rely on `npx playwright install` in production images.
- **The herald is opt-in and throttled.** `ALERT_WEBHOOK_URL` (Slack/Discord/any JSON POST; body carries both `text` and `content`) rings alarms once per kind per hour and ceiling-strikes once per provider per UTC day; unconfigured forks send/log nothing new; a failed delivery logs, never throws back into the alarm path.
- **The front gate is static HTML in public/** (landing/pricing, ToS, privacy). Keyless builds have no client router at all, so these pages must never move into the React app's routes.

**Why:** public launch demanded budget guardrails and legal pages without breaking the opt-in doctrine or the keyless eval bench.
