---
name: GitHub org repo push rights
description: Why gitPush can return PUSH_REJECTED on a fast-forward while the user's own Git-pane push succeeds.
---

The rule: when `gitPush` fails with `PUSH_REJECTED` on what is provably a fast-forward (remote head is an ancestor of local main), suspect the agent-lane GitHub token's write rights on the repo — especially when the repo lives in an **organization** rather than the user's personal account.

**Why:** July 2026 — origin `futurespeakai/mydungeonquest` (public, org-owned). Local main was 4+ commits ahead of the remote head with zero remote-only commits, yet the callback returned PUSH_REJECTED and a raw shell push said "Invalid username or token" (shell has no credentials at all; only the callback lane does). The remote's latest commit had been pushed the previous day from the user's own Git pane session — their browser auth had org rights; the agent connection did not.

**How to apply:** Diagnose cheaply before burning retries: (1) `git status -sb` / `git log main..origin/main` for true divergence; (2) unauthenticated `https://api.github.com/repos/<owner>/<repo>` probe — a public repo means fetch/refs are fresh and the failure is write-auth, not history. If it is org rights, stop retrying and hand it to the user: push from the Git pane, or re-grant the Replit GitHub app access to the org. Do not paste connection tokens into shell git commands or remote URLs.
