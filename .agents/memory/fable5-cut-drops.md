---
name: Fable 5 cut drops
description: How to integrate full-tree zip deliveries from the outside forge (Fable 5) without regressing main
---
- Drops arrive as FULL-TREE workspace zips (node_modules and all), uploaded to attached_assets and announced as "<name> cut is in". Never overwrite the tree — unzip to /tmp, `diff -rq` against the workspace excluding node_modules/.git/dist/attached_assets/.local/.agents, and lift only the delta files.
- Confirm the snapshot post-dates current main before trusting collisions (check that freshly merged eval sections/features are present in their copy). A file that differs may carry OUR merged work plus their small change on top.
- Keep OUR pnpm-lock.yaml unless the artifact package.json dependencies actually changed — their lockfile churns from re-resolution in their environment (first drop: 1,600-line lock diff, zero dep changes).
- The zip's .agents/memory is the other forge's copy of ours — never import it.
- Files ABSENT from the zip are intentions, not omissions — read their CHANGELOG/BUILD_STATUS for the reason. Example: service-worker retirement. Retiring a SW requires SERVING a self-destruct worker (install: skipWaiting; activate: delete all caches, unregister, re-navigate window clients) — deleting sw.js leaves installed workers pinned to stale caches because a failed update check keeps the old registration.
- Collisions can be PURE STALENESS: the second drop's snapshot predated a same-day merge, so every "removal" in its diff was simply our newer work absent from their base. Classify each collision — their-change-on-shared-base (hand-merge) vs our-work-missing-from-their-base (keep ours wholesale). `git log --since=<snapshot time> --name-only` is the authoritative list of what is ours-newer.
- Their gates prove LIBRARIES, not component wiring: the living-world drop shipped a Codex page calling helpers it never imported, and a try/catch-to-empty fallback hid the ReferenceError from both build and bench (Rollup only checks names once an import exists). After a lift, grep new helper usages in components for matching import lines.
- /tmp scratch trees do NOT survive between sessions: re-unzip the PRIOR drop from attached_assets before any drop-vs-drop diff, and guard every cmp/diff probe with an existence check — `cmp -s` against a missing file reads exactly like CHANGED and yields false merge signals for every file probed.
- Drop-vs-drop diffing (prev zip vs new zip) isolates the forge's true delta cleanly; drop-vs-ours conflates their changes with our newer work. Verify our base files are byte-identical to the prev drop before wholesale lifts.
- Extraction drops: before rm'ing "moved" files, cmp them byte-identical to their new home; cp a collided file wholesale ONLY if it holds zero ours-only lines (pure swap) — their base can lag hours behind main. CI manifests inside a drop (pinned toolchain versions) must match OUR toolchain, not their forge's; align via root `packageManager` and let pnpm/action-setup read it.
- Brand law lives in BRAND.md at repo root (mark never recolored or spun; gold = glory, ember = threat, never traded; HOUSE_STYLE exported from cinema prompts; landing reel only from `npm run brand-shoot`, which hard-refuses without live paint keys — never run it unprompted, it spends real money).

**Why:** the first drop (July 15, 2026) landed the same day a storybook task merged; blind extraction would have regressed the merge, and their deleted-SW intention would have stranded deployed players on stale caches.

**How to apply:** on the next "cut is in" upload — unzip to /tmp, diff, read their BRAND/CHANGELOG/BUILD_STATUS first, lift deltas file-by-file, keep our lock, run the full keyless check, screenshot the touched surfaces.
