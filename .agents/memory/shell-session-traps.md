---
name: ShellExec session traps
description: Background process death, bash precedence with &, self-matching pkill in the Replit shell tool
---
- **nohup background does NOT survive the tool session** — backgrounded runs die when the invoking session exits, sometimes minutes later: logs freeze mid-flight, no summary line, or entirely empty files (killed pre-output). A dead `kill -0` on the launcher pid while output still flows means the writer is a reparented child — and it too will die.
  **How to apply:** long runs go FOREGROUND with progress marks flushed to a file; read the file even when the 300s window clips the shell. Size test ceilings so run+report fits the window, or split the suite and run pieces solo.
- **`cd X && A & B` sends the cd into the background group** — B runs in the ORIGINAL cwd; "No such file or directory" panics follow (looks exactly like deleted files; check `git status` before believing in deletion). Group explicitly: `(cd X && A) & (cd X && B)`.
- **`pkill -f "pattern"` matches its own command line** — the invoking shell's cmdline contains the pattern, so pkill kills its own session (exit -1, no output). Use pgrep to inspect first, or bracket-trick the pattern (`p[a]ttern`).
