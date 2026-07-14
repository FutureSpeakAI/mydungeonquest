---
name: MyDungeon door (auth) is opt-in
description: Auth follows the media-provider doctrine — no keys, no door; guests are first-class; server-owned tables self-bootstrap.
---

# The Door is opt-in, and the ledger binds itself

**Rules:**
- Auth exists only when its keys exist. Keyless builds must render signed-out play unchanged (no provider, no router, no new code paths); the keyless server marks everyone a guest.
- Identity failures fail OPEN to guest — lawful only while no privileged endpoints exist. Billing/quota work must add separate fail-closed authorization, never loosen the doorkeeper.
- Any server-owned table must self-bootstrap idempotently at first use. Never assume a hand-created schema survives a fresh environment.

**Why:** Guest custody is product law — the device keeps the tales, the ledger keeps only names. A hand-provisioned table plus fail-open identity meant a fresh environment would silently degrade every patron to guest while looking healthy (a completion review caught exactly this).

**How to apply:**
- Gate on key existence, never on NODE_ENV (prod-only gating breaks the FAPI proxy pattern; key-gating mirrors the media providers).
- Evals: scrub Clerk env keys *before* importing server modules (the workspace env carries real keys; the keyless gate command only unsets AI keys), pin the client key to `''` in the harness defines, and judge open-door logic through injection seams (stub auth/query), never live Clerk or Postgres — keyless forks must stay green.
- Clerk's bot-protection CAPTCHA blocks automated-browser sign-up even on dev instances; browser e2e testers will report `unable`. Verify inscription headlessly instead: backend `createUser` + the inscription function directly, then clean up.
