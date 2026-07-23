---
name: GitHub org repo push rights
description: Why gitPush can return PUSH_REJECTED on a fast-forward while the user's own Git-pane push succeeds.
---

The rule: when `gitPush` fails with `PUSH_REJECTED` on what is provably a fast-forward (remote head is an ancestor of local main), suspect the agent-lane GitHub token's write rights on the repo — especially when the repo lives in an **organization** rather than the user's personal account.

**Why:** July 2026 — origin `futurespeakai/mydungeonquest` (public, org-owned). Local main was 4+ commits ahead of the remote head with zero remote-only commits, yet the callback returned PUSH_REJECTED and a raw shell push said "Invalid username or token" (shell has no credentials at all; only the callback lane does). The remote's latest commit had been pushed the previous day from the user's own Git pane session — their browser auth had org rights; the agent connection did not.

**How to apply:** Diagnose cheaply before burning retries: (1) `git status -sb` / `git log main..origin/main` for true divergence; (2) unauthenticated `https://api.github.com/repos/<owner>/<repo>` probe — a public repo means fetch/refs are fresh and the failure is write-auth, not history. If it is org rights, stop retrying and hand it to the user: push from the Git pane, or re-grant the Replit GitHub app access to the org. Do not paste connection tokens into shell git commands or remote URLs.

## Refinement: PUSH_REJECTED has two distinct causes — discriminate by the pane
Token-lane rights failure predicts the user's own Git-pane push SUCCEEDS (their browser auth has org rights). If the pane push is ALSO rejected — and a push to a brand-new ref (which can never be non-fast-forward and dodges main-only protection) still rejects — the cause is repo-wide: a repo/org ruleset (max file size, blocked extensions, required signatures, push restrictions) or an archived repo. The callback wrapper never relays the remote's prose; the pane's `remote:` lines name the actual rule. Ask for that exact text before theorizing further. Also: `gitPush({branch})` cannot publish the current branch under a different remote name ("already tracks origin/main") — create and check out a local twin branch at the same commit, push, switch back.
