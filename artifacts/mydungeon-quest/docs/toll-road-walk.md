# The Toll Road, Walked — Stripe test-mode checkout, end to end

**Date:** July 14, 2026 · **Mode:** Stripe TEST mode · **Card:** 4242 4242 4242 4242 (`pm_card_visa`)
**Rig:** `scripts/toll-road.mjs` — the real `tollRoutes` mounted locally against the live
database and live Stripe test account, with the running dev server's registered webhook
(`https://<domain>/api/stripe/webhook`) doing the entitlement flips.

## Re-running the walk

From the artifact directory, with the dev server running (its registered webhook does
the entitlement flips):

```
npm run toll-road
```

**The dev server MUST be running first.** The walk preflight-pings
`https://<domain>/api/health` before opening checkout and aborts with
"start the dev server first" if it doesn't answer — without a live server the
registered webhook has nowhere to land. And once the preflight has passed, a
webhook that still fails to flip `users.plan` within the 60s wait window FAILS
the walk outright; the `/toll/refresh` fallback exists for real users' resilience,
but it is never a pass condition on this road.

The rig needs a live gateway — `DATABASE_URL` and the Stripe connector — so it is NOT
part of the keyless eval bench (`npm run check`). Re-walk the road after any change to
the toll, the mint, or the prices.

**Safety:** step 0 of the script hard-refuses to run unless the connected Stripe key is
a test-mode key (`sk_test_`/`rk_test_`). A live-mode key aborts before anything is
touched. It also sweeps its own test data (Stripe customer + patron row) at the end.

## What was proven

| Step | Road | Result |
|---|---|---|
| 1 | A named patron is seated in the visitors' book | ✅ inscribed, `plan=free` |
| 2 | `POST /api/toll/checkout {plan:"illuminated"}` | ✅ real Checkout session opened — `mode=subscription`, `success_url=https://<domain>/?toll=paid`, correct proxy origin, customer created & written to `users.stripe_customer_id` |
| 3 | The toll paid with the 4242 test card | ✅ subscription active on the Illuminated price (`price.metadata.mdq_plan=illuminated`) |
| 4 | The webhook lands | ✅ Stripe's courier hit the dev server; `users.plan` flipped to `illuminated` **without any client refresh** (~seconds) |
| 5 | The `?toll=paid` return (`POST /api/toll/refresh`) | ✅ standing shows `plan=illuminated`, `portal=true`, quotas open (paint 30 → 600) |
| 6 | Buying the same seat twice | ✅ refused — handed the billing portal with “Your seat is already this high” |
| 7 | `POST /api/toll/portal` | ✅ live billing-portal session URL returned |
| 8 | Cancel (the portal's trade, done by API) | ✅ cancel webhook landed; `users.plan` lowered to `free`; refresh agrees |
| 9 | Sweep | ✅ test customer deleted in Stripe, patron row removed |

## Breakage found on the road

None. Webhook URL, proxy origin (`x-forwarded-host` → success/cancel/return URLs), and
the price board (both Illuminated $9/mo and Voiced $19/mo chalked from `stripe.prices`)
all held without a fix.

## Notes

- Stripe's hosted checkout page cannot be completed headlessly; step 3 creates the
  subscription on the same customer with the same price via the API — byte-for-byte the
  object Checkout completion creates, and it exercises the identical webhook →
  `reconcileEntitlement` road.
- The Clerk door itself was not re-proven here (it has its own bench); the walk attaches
  a real `users` row as the patron and proves everything from the door inward.
- On the deployed app, `initMint` registers the managed webhook against the production
  domain the same way it did against the dev domain here — same code, same road.
