---
name: MyDungeon Vault laws
description: Cross-device chronicle sync invariants — custody, chain ingest, fork-on-divergence, key-material story, blob addressing.
---

**The laws:**
- The vault stores and chain-verifies, NEVER signs. Fail CLOSED everywhere (401 for guests) — the doorkeeper's fail-open-to-guest is for the table, never for custody. Opt-in twice: Clerk + Postgres; the blob shelf additionally needs `PRIVATE_OBJECT_DIR` (App Storage), and journal sync must stand honestly without it.
- Ingest law: a push is accepted only as a linear extension of the stored head; every record's canonical hash is recomputed server-side; one broken link refuses the whole push (422); a rewrite is a 409 naming the server head. Silent merge is forbidden by construction — the diverged device forks its local copy into a NEW campaign id (chain records don't embed campaignId, so a fork is a row-copy, not a re-seal).
- Key-material story (decided): signing keys never leave the origin device (they're non-extractable Ed25519 anyway). A vault-restored chronicle keeps the original publicKeyJwk (old wax still answers) and continues hash-only via a `{signed:false, publicJwk}` keys row — the standalone verifier stays green because it only judges signatures that exist.
- Blobs are content-addressed at `vault/<sha256>`, deduped across users in storage but owner-locked at the DB row (vault_media per user) — sharing bytes never shares access.
- Redaction crosses devices through the journal alone: pull-side re-derives struck ordinals (`applyStrikes`) — never trust the pushed `log.redacted` snapshot alone (both courts, same as storybook/podcast).

**Hard-won (review-caught):** equal turnCount + different headHash is divergence, not "in sync" — planners comparing lengths alone misclassify the two-device race as pull/meta. And a fork that deletes the old campaign id must (a) redirect late writers via a fork registry consulted in saveCampaign/seal and (b) notify the open session to switch ids, or a stale in-memory object quietly recreates the deleted spine.

**Hard-won:** an Express raw-body parser mounted on a `:param` path also captures sibling literal routes (the param matches the literal segment) and eats their JSON bodies; name sibling routes outside the param space. Client caches of identity/liveness must be invalidated on auth transitions — a guest-at-load session must awaken sync on sign-in without a reload.

**How to apply:** any future sync/share/co-op feature reuses the vault's dependency-injection seams for keyless evals and must keep fork-over-merge and fail-closed custody.

## The pyre law (delete)
Deleting a campaign is vault-first and tombstoned: mark the id in an in-memory "pyre registry" BEFORE asking the vault to let go, run the server DELETE **inside the campaign's per-id sync lane** (`serialized()`), and only wipe locally after the vault agrees (or reports dormant). Refusal lifts the mark and keeps the tale whole.
**Why:** two resurrection races proved ordering matters — (1) a debounced/queued sync that captured state pre-delete can re-push the spine after the DELETE unless it either settles first in the same lane or hits an execution-time registry check; (2) in-flight media jobs land rows via `saveCampaign`/foundry after the wipe unless those choke points drop burned ids.
**How to apply:** any new writer that persists campaign-shaped data must check `spineBurned(id)` at write time, not enqueue time. Deliberate restores call `unburnSpine` only AFTER the restore succeeds. The registry is session-scoped on purpose (a fresh page has no stragglers). Server-side, vault_media reference rows survive deletes (content-addressed, shared across spines).
