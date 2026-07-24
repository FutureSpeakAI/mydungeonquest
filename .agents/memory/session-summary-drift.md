---
name: Compacted-session summaries drift
description: A prior session's "landed/remaining" claims are hypotheses — verify edits by grep and repo posture by git before building on them.
---

A compacted summary is testimony, not evidence. Two drifts bit in one session (July 2026):

- A summary's "landed" list claimed an edit that had never landed (a court's alias hop) — caught only by grepping for the claimed needle before debugging around its supposed presence.
- A summary's "remaining: commit" was stale — a platform checkpoint had already committed the 21-file phase body under a generic message; `git status` showed 2 dirty files, not 21.

**Why:** summaries compress intent and outcome together; an edit planned late in a session reads identically to an edit made. Building on a phantom edit wastes a debugging session; re-doing committed work risks conflicts.

**How to apply:** before resuming a summarized task, verify every "landed" claim by needle (`grep` for the exact seat it names) and the repo posture with `git status` + `git log --oneline -5`. Treat mismatches as summary drift to investigate, never as fresh defects to fix. When a checkpoint already sealed the body, the closing house-voice commit rides the final dirty files.
