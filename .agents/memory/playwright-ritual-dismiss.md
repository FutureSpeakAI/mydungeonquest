---
name: Playwright ritual-dismiss law
description: Level-up and seal/pyre-ask .ritual overlays block pointer events in long marches; must be actively dismissed, not merely waited for.
---

## Rule

Before any `fill` + `click` in a Playwright march loop, check for a `.ritual` overlay and actively dismiss it. `waitFor({ state: 'hidden' })` alone is not sufficient — the level-up overlay will never become hidden without a button click.

**Pattern:**
```typescript
const ritual = page.locator('.ritual');
if (await ritual.isVisible().catch(() => false)) {
  const secondary = ritual.locator('.secondary-button');
  const anyBtn    = ritual.locator('button').first();
  const dismissEl = (await secondary.isVisible().catch(() => false)) ? secondary : anyBtn;
  await dismissEl.click().catch(() => null);
  await ritual.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => null);
}
```

**Why:** The `.ritual` overlay uses `position: fixed; z-index: high` and intercepts ALL pointer events including the send button. It fires on:
- Level-up (`ritual` class only)
- Grimoire (`ritual.grimoire-ritual`)
- Seal-ask (`ritual.seal-ask`)  
- Pyre-ask (`ritual.pyre-ask`)

For seal-ask and pyre-ask, the safe cancel button has class `.secondary-button`. For level-up, the only button is Accept (which is safe to click in a march context). The fallback to `first()` handles both.

**How to apply:** Every Playwright e2e spec that iterates through game turns in a loop must include this guard before each player action send.
