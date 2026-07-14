---
name: MyDungeon door (auth) is opt-in
description: Clerk auth in MyDungeon.Quest follows the media-provider doctrine — no keys, no door; guests are first-class forever.
---

# The Door (Clerk auth) is opt-in, like every other provider

**Rule:** Auth mounts only when its keys exist. Client: `doorBuilt = Boolean(VITE_CLERK_PUBLISHABLE_KEY)` — keyless builds render the game with **no router, no ClerkProvider, no new code paths** (PatronShell returns children; PatronDoor returns null). Server: the doorkeeper on `/api` is a guest-marking pass-through unless both Clerk keys exist. Guests always pass unchallenged; identity failures **fail open to guest**.

**Why:** Guest custody is a product law (chronicles live on the player's device; the ledger holds names, never tales). The keyless eval gate hard-asserts unchanged signed-out play, and the headless harness has no `window.location` — an unconditional ClerkProvider or module-top `publishableKeyFromHost(window.location.hostname, …)` crashes it. The eval harness pins `VITE_CLERK_PUBLISHABLE_KEY: "''"` in its jsx loader defines, so evals are doorless by law even though the workspace carries real keys.

**How to apply:**
- Never gate `proxyUrl`/key wiring on PROD/NODE_ENV (breaks the prod proxy); gate only on **key existence**, mirroring `mydungeon-media-providers`.
- Any new Clerk-touching client module must keep all `window.location` / Clerk-hook access behind the `doorBuilt` constant (module-constant, so hook-order stays legal).
- Server evals scrub `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY` from `process.env` **before** importing/judging, because the workspace env keeps real keys (the keyless gate command only unsets AI keys).
- Fail-open-to-guest is correct **only while no privileged endpoints exist**; the metered gateway work must add separate fail-closed authorization, not loosen the doorkeeper.
- Automated browsers hit Clerk's bot-protection CAPTCHA on sign-up (dev instances included) — e2e testers report `unable`; verify the inscription path headlessly (backend `createUser` + `inscribe()` smoke) instead.
