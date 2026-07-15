# SECURITY — The Walls of the House

## Reporting a vulnerability

Report privately through **GitHub's private vulnerability reporting** on this repository (Security → Report a vulnerability). Please do not open public issues for security problems. Good-faith reports get a good-faith response; include reproduction steps and the smallest fixture that shows the wall failing.

## The standing walls

These are the security properties the proving ground actually holds, stated the way the laws state them:

- **Keys never leave the server.** Provider secrets live in server env only; nothing is prefixed `VITE_`, and the client's only path to any model or media provider is the relay. A keyless client is a fully working client — that is the Floor, and it is also the blast radius.
- **The model is hostile until proven lawful.** Every `dm_turn` is validated client-side against enums, budgets, and the pre-turn cast snapshot before a single delta applies. Prompt injection can make the narrator rude; it cannot roll a die, edit state, or speak for the dead. The law is never loosened to keep a turn alive.
- **The record keeps itself honest.** The journal is append-only, hash-linked, and device-signed; the offline verifier recomputes every hash, link, and signature, and the server vault re-verifies the chain and refuses tampered rows. This is tamper-*evidence* for its holder — plumbing, not a sermon — and the gates that assert it never weaken.
- **Binder's Door.** Only attested media binds: plates are `data:` URIs with provenance, mock or missing provenance is refused at delivery, and the audio floor is silence — never a spoofed placeholder.
- **The shelf shows text as text.** Anywhere record text meets HTML — storybook, wiki, keepsakes, and the coming public shelf (Commons Law) — every string is escaped at the boundary. A soul named `<script>alert(1)</script>` walks the page inert; the share-card gate asserts exactly that today.
- **The toll law.** Payment webhooks verify the **raw-body signature** before parsing, replay is refused by **event-id idempotency**, and entitlements flip **server-side only** — a client claim of tier is worth nothing. Refusals surface as receipts, and a keyless fork never learns money exists.
- **The watch counts first.** Rate limits, request-size guards, prompt-length guards, and per-session media ceilings all run *before* a provider is called; abuse exhausts a counter, not a wallet.

## The one rule for fixes

A security fix lands like any law: enforcement plus a gate, docs synchronized in the same change — and **never by weakening an existing gate**. If a wall failed, the suite grows a test that would have caught it.
