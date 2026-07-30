---
name: Brief trim_log design
description: buildBriefing appends trim_log AFTER its own famine loops; the brief total can exceed BRIEF_BUDGET by exactly the trim_log size.
---

## Rule

`buildBriefing` adds `trim_log` **after** all four famine while-loops complete.
The code comment says "trim_log is added AFTER the budget loops so it never
triggers further trimming; it is a diagnostic window, not story content."

## Consequence

A test asserting `JSON.stringify(brief).length <= BRIEF_BUDGET` will fail when
famine fires, because the trim_log payload (dropped names) is appended on top
of a budget-compliant story payload. The correct assertion:

```js
const { trim_log: _, ...briefStory } = brief;
assert.ok(JSON.stringify(briefStory).length <= BRIEF_BUDGET);
```

## Why

This is intentional design — the diagnostic window must not itself shrink the
story. Only story-content fields (elsewhere, standings, allegiances, wealth)
participate in the famine loops. trim_log is DM-facing metadata, not story.

## How to apply

Any test that calls `buildBriefing` on a fixture that fires famine must split
the brief before asserting budget compliance. The total `briefSize` will exceed
BRIEF_BUDGET by ~(trim_log JSON size) when famine fires.
