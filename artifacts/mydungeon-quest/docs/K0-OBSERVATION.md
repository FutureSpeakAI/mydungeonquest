# K0 — One-Minute Check Observations (Stage 6)

Produced by static code analysis (source review + CSS grep). Each item notes
what the code confirms and what requires a live device for final Rule 30 closure.

---

## K0.1 — Narration audio chain (H1)

**Observation: architecture is already correct. No code change needed.**

Source: `src/lib/cinema/narrator.js`

The narrator already implements the single-element chain:

- One persistent `Audio` element is created on first use in `throat()` (line 164)
  and reused for every segment; `.src` is set per segment (lines 251–253).
- `primeNarration()` (lines 176–193) plays a 16-frame silent WAV through the
  throat to earn the autoplay blessing inside the current gesture. It does NOT
  create new elements.
- The ended handler (line 255) calls `playSegment(campaign, log, segments, index+1, mine)`
  — still inside the same blessed throat, guarded by the `mine === session` token.
- Every `play()` site has rejection handling:
  - `primeNarration`: `.then(ok, refuseHandler)` (lines 185–188)
  - `playSegment`: `try { await element.play(); } catch (error) { ... paused=true; blocked=true; }` (lines 259–272)
  - `toggleNarration`: `.catch(() => {})` (line 301)

The failure mode described ("only the first segment plays; the rest fail silently")
is NOT present in the code. The `primed` flag prevents re-blessing a live throat
(line 179: `if (activeId) { primed = true; return; }`).

**Rule 30 status:** Requires a live device test to confirm. Static analysis finds
no architectural defect. If a playtest finds segment chaining broken, the
likeliest culprit is the `advancing` flag preventing `emit()` from reporting
the correct `isPlaying()` state, not the Audio element chain.

---

## K0.2 — Safe insets on the table route

**Observation: CONFIRMED BUG. Fixed in this phase.**

Source: `src/styles.css`

- `.table-header` (sticky, top:0) had `height:72px` with no `env(safe-area-inset-top)`
  in its padding — on iPhones with a notch/Dynamic Island (safe-area ~44–59 px),
  the avatar and chip row were clipped behind the system UI.
- `.region-strip` (topmost scroll element at page load) had `height:55px` with no
  safe-area padding — its content clipped at the very top of the viewport.
- `.combat-banner` referenced `top:72px` without accounting for the grown header.

**Fixes applied:**
- `.table-header`: `height:72px` → `height:calc(72px + env(safe-area-inset-top))`;
  `padding:0 max(...)` → `padding:env(safe-area-inset-top) max(1rem,...) 0`.
- `.combat-banner`: `top:72px` → `top:calc(72px + env(safe-area-inset-top))`
  in both the base rule and the mobile override.
- `.region-strip`: `height:55px` → `height:calc(55px + env(safe-area-inset-top))`;
  `padding:0 max(...)` → `padding:env(safe-area-inset-top) max(1rem,...) 0`.
- Mobile @media overrides updated to preserve padding-top for both elements.
- The `safeInsets.test.mjs` Node gate was updated with new assertions for
  these elements.

**Rule 30 status:** Source-level fix applied. Full confirmation requires a
device test on an iPhone with a notch or Dynamic Island. The j7-layout
Playwright suite asserts the presence of the safe-area expressions in CSS
(K3 browser assertion added).

---

## K0.3 — HP chip and empty band

**Observation: two distinct issues; one CSS, one requires browser observation.**

Source: `src/styles.css`, `packages/engine/src/table.js`, `src/App.jsx`

### HP chip "10/1" display

`table.chips[3].words` = `` `${hero.hp}/${hero.maxHp}` `` from `packages/engine/src/table.js:35`.

`.table-chip` has `overflow:hidden;text-overflow:ellipsis;white-space:nowrap`
and `max-width:100%`. `.hud-row-2` has `height:28px` with no explicit width on
the health chip. On a narrow phone (360 px), if the preceding chips (party, known)
overflow the row, the health chip is pushed off the right edge and partially
clipped — visible only as "10/1" (ellipsed from "10/10").

`.header-chips` has `overflow-x:auto;scrollbar-width:none;flex-wrap:nowrap` —
the chips CAN scroll but the scrollbar is hidden and there is no swipe affordance.

**Fix applied:** Added a visual scroll affordance to `.header-chips` (a
gradient fade-right indicator, same pattern as `.suggestions-wrap`) and set
`flex-shrink:0` on the health chip so it cannot be crushed. Updated
`safeInsets.test.mjs` to assert the health chip is not `display:none`.

**Rule 30 status:** CSS fix applied. Browser confirmation that the chip reads
"10/10" at 360 px is in the K3 j7-layout Playwright court added in K3.

### Empty band

The `illustration-panel.full-bleed` has `margin-block:.5rem 1rem` on mobile
(from `@media (max-width:640px)`). The `figcaption` adds ~1.2 rem. Between
the figcaption and the next `TickDivider` element, the gap is:
figcaption margin-bottom + article padding-bottom + tick-divider margin-top.

If any of these are large, the band appears empty. The `article` element for
each LogEntry may have `padding-bottom` that, combined with the plate's
margin-block, creates a large visual gap before the tick entry.

**Rule 30 status:** Source analysis finds plausible causes. A device observation
or Playwright measurement is required to confirm the exact size and which margin
is the offender. Added a K3 browser court to measure the gap.
