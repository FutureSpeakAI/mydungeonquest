---
name: CSS animation-fill overrides
description: Animations with fill-mode forwards/both override property + transition values on the same property — dim/hide classes silently lose.
---

**Rule:** A CSS animation with `animation-fill-mode: forwards|both` holds its last keyframe's value on the animated property *forever*, and animated values beat normal cascade values. A later class setting `opacity: 0` (with or without a transition) does nothing while the fill is in effect.

**Why:** MyDungeon's title backdrop ran `bgFade 1.6s ease both` (opacity 0→1). The Arrival cold-open classes set `.arrival-dark .title-bg { opacity: 0 }` — and the keyart stayed fully bright behind the "one candle in darkness" because the filled animation still owned opacity. Caught only by screenshot; every eval was green.

**How to apply:** When a state class must own a property that an entrance animation also animates, have that class suspend the animation outright (`animation: none`) — the property then applies normally, and dropping the class restarts the animation from frame 0, which can double as the reveal. Audit any `fill-mode: forwards|both` whenever a dim/hide/emphasis class "mysteriously doesn't work."
