---
name: Toll-House laws & Stripe connector shape
description: MyDungeon.Quest billing doctrine — the menu, honest-nulls law, reconcile rules, the price mason, connector quirks
---

## The menu (owner directive, July 2026 — replaced parchment/illuminated/voiced)
- `free` "The taste": **lifetime** quotas (never reset — counted from the whole book, no month filter): dm 6, retell 2, paint 12, speak 40, music 6, sfx 18, podcast 1, pdf 1. Full flavor (ceiling `voiced`).
- `weekly` $5/week and `yearly` $129.99/year — both **unmetered** (all quotas null). Watchtower spend ceilings + burst caps are the real safety net behind "unlimited".
- `house` "Friend of the house" (July 2026): a **comp seat** written into `users.plan` by the owner's hand — `comp: true`, unmetered, ranks above yearly. Never sold, never chalked on the board (`forSale` skips comp), checkout answers a note without minting a Stripe customer.
- `guest` is a sentinel (zeros) reachable only via the standing page — the locked door (see mydungeon-door.md) answers 401 on pouring rooms before the innkeeper ever runs.

## Laws
- Gateway opt-in twice over: stands only when BOTH door (Clerk) and mint (Stripe) live; otherwise every room is a hallway and buildToll says `{live:false}`.
- **Honest-nulls law**: `renewsAt` is spoken only where a real monthly meter turns. Lifetime taste, unmetered seats, zeroed kinds ('table' refusals), and mislaid ledgers all carry `renewsAt: null`. Never invent a page-turn date.
- Debit only real work: mock/fallback answer 'stand-in' (never billed); house-made work debits as 'house'; a slipped debit is loud but never claws back a poured response.
- reconcileEntitlement: highest ACTIVE seat wins (past_due keeps grace); the price's `metadata.mdq_plan` must exist in today's `PLANS` — **retired marks (illuminated, voiced) raise no seat**. **Comp seats are returned untouched without consulting Stripe** (the mint neither grants nor revokes a gift), and a comp mark chalked on a price raises no seat. A plain UPDATE to weekly/yearly would be reverted by the next reconcile — grant gifts ONLY via a comp plan.
- Never sell a seated patron a second chair: any paid standing → portal, not checkout; a comp standing → polite note, no customer minted.
- **The point of sale reads fresh truth**: the grant candle (30s cache) may hold a stale standing; /toll/checkout busts it before reading. Any NEW money-decision path must do the same or a hand-flipped seat can be mis-sold inside the window.
- Comp seats are per-environment lines: dev and prod Clerk stores are separate, so the same email is TWO ledger rows (different clerk_user_id). A gift written in dev does not exist in prod — flip each line, and only after the comp plan's code has shipped there (an unknown plan name degrades to 'free').
- The 402 payload shape is load-bearing (refusal-receipt UI): `kind/plan/reason/quota/used/renewsAt/upsell/error` — keep stable.

## Tools of the trade
- `scripts/chalk-board.mjs` — the price mason: idempotent; chalks weekly/yearly (mdq_plan on price AND product), retires any active mdq_plan-marked price not on today's menu (+ its product if orphaned), never touches unmarked/foreign prices.
- `scripts/toll-road.mjs` — walks the REAL road (checkout → 4242 → webhook flips users.plan → unmetered standing → second-sale refusal → portal → cancel lowers to free → sweep). Needs the dev workflow running (webhook lands there).

**Why:** the July 2026 business-model overhaul (mandatory door, six-turn lifetime taste, $5/wk or $129.99/yr unlimited) replaced the old monthly-allowance menu; several laws (honest nulls, retired marks) exist because the overhaul left stale dates and stale Stripe marks behind.
**How to apply:** any re-chalk of the menu = edit `PLANS` + run chalk-board + re-run toll-road + keep `evals/tollhouse.test.mjs` §6 board asserts in lockstep.

## The refused-pour resume (July 2026)
A 402 refusal is remembered as an intent in sessionStorage (module state dies at the Stripe redirect): kind + campaignId/logId via an ambient pour context in tollNotice. `settleTollReturn` now returns `{ word, retry }` — retry only on `?toll=paid`; kept/seen clear the intent. Paint auto-retries (idempotent); other kinds get a one-shot "Pour it now" banner. lastStanding=null on any mark clears the advisory "spent" patch.
