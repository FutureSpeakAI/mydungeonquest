---
name: git filter-branch traps
description: Operational traps when rewriting history (filter-branch) in a live workspace with flipped HEAD refs
---
- Flip HEAD back to the target branch and `git reset -q <branch>` BEFORE filter-branch: it refuses on a dirty index, and a symbolic-ref-flipped HEAD makes the index look dirty ("Cannot rewrite branches: Your index contains uncommitted changes").
- Never gate a rewrite on a piped exit code — `filter-branch ... | tail` returns tail's rc, and `&&` chains sail on. Verify the OUTCOME instead: `git log --oneline <branch> -- <scrubbed-path> | wc -l` must be 0, else abort.
- **Why:** a masked filter-branch failure once let five follow-up steps run against unrewritten history — the gitignore commit landed on the wrong (flipped) branch and was orphaned by the next ref move.
- filter-branch's final checkout DELETES worktree files whose paths left the tree. Capture blob shas (`git rev-parse <branch>:<path>`) before rewriting; restore with `git cat-file blob <sha> > <path>` after; gitignore the path or the next auto-commit re-tracks it and the original problem returns.
- Commits untouched by the filter (tree, parents, metadata identical) rebuild byte-identical with the SAME shas — an already-pushed prefix remains a valid fast-forward ancestor, so incremental delivery resumes seamlessly after a scrub.
- Secret-scan regex hygiene: `-` inside a character class matches comment rules (`// ------`) as 60-char "tokens", and `+++ b/long/file/path` diff headers match token shapes too. Classify hits (length, charset, first-3 chars) before acting, and mask ≥24-char runs when printing anything to chat.
