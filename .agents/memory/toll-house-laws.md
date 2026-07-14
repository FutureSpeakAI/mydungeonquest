---
name: Toll-House laws & Stripe connector shape
description: MyDungeon.Quest metered-gateway invariants + hard-won Replit Stripe connector payload lessons
---

- The gateway is opt-in twice over: live only when the door (Clerk) AND the mint (Stripe) stand; otherwise dormant — unmetered, byte-for-byte legacy behavior, and the eval bench asserts the dormant house. Never make the toll-house load-bearing for keyless forks.
- **Why:** the product doctrine is "a keyless fork stays whole"; money must never leak into that path, and evals run keyless.
- Billing law: debit AFTER work is served, only for real providers (mock/fallback stand-ins never billed; declined retells never billed); house compute (podcast/pdf) debits as `'house'`. Fail CLOSED for paid pours, OPEN for the tale itself (dm/retell). Refusals are 402s in the innkeeper's voice: `{closed:true, reason:'table'|'spent'|'mislaid', upsell, error}` — never a raw error.
- Entitlement truth is re-read from `subscriptions.list` (`price.metadata.mdq_plan`, highest active/trialing/past_due rank wins) and written to `users.plan` — never trusted from a webhook body; webhooks only trigger the re-read.
- Replit Stripe connector payload (hard-won, July 2026): the `connector_names=stripe` query filter returns 0 items — fetch ALL connections unfiltered and pick `connector_name === 'stripe'` client-side. The secret lives at `settings.secret` (NOT `settings.secret_key`); accept both. `stripe-replit-sync`'s `syncBackfill()` syncs NOTHING when called bare — it must be `syncBackfill({ object: 'all' })`.
- **How to apply:** any new Stripe-touching code (seed scripts, server boot, evals) goes through these shapes; when the price board looks blank or plans don't sync, check these three payload quirks before anything else.
