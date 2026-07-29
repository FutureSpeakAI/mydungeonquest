import { expect, test, type Page } from '@playwright/test';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

// ──────────────────────────────────────────────────────────────
// K8 — 30-TURN INSTRUMENTED LONG MARCH (Stage 6)
//
// Runs 30 full player→DM turns in keyless mode and measures:
//   - Total turns completed
//   - Total narration words across all turns
//   - Total narration blocks across all turns
//   - Number of distinct suggestion sets rendered
//   - Number of log entries in the DOM
//   - Number of illustration panels rendered
//
// On the first run, counts are written to k8-budget.json and the
// test passes by construction. On subsequent runs, each metric must
// meet its floor (≥80% of the baseline, rounded down).
//
// Purpose: catch silent regressions in the mock-turn pipeline where
// the DM begins producing empty/truncated turns, missing suggestions,
// or collapsing narration — all invisible to unit tests.
//
// The test runs in KEYLESS mode: the mock provider generates turns
// immediately (no network). Total time should be < 3 minutes.
// ──────────────────────────────────────────────────────────────

const CAMPAIGN_ID = 'k8-long-march';
const DB_NAME = 'mydungeon-cinematic';
const TARGET_TURNS = 30;
const BUDGET_PATH = path.join(__dirname, 'k8-budget.json');

// Floor multiplier: each metric must be ≥ FLOOR_RATIO × baseline
const FLOOR_RATIO = 0.80;

interface Counts {
  turnsCompleted: number;
  narrationWords: number;
  narrationBlocks: number;
  suggestionSets: number;
  logEntries: number;
  illustrationPanels: number;
}

interface Budget {
  baseline: Counts;
  floor: Counts;
  recordedAt: string;
  targetTurns: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function injectCampaign(page: Page): Promise<void> {
  await page.evaluate(async (args) => {
    const { id, dbName } = args;
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('campaigns', 'readwrite');
      const store = tx.objectStore('campaigns');
      const req = store.put({
        id,
        title: 'K8 Long March',
        hero: {
          name: 'Asha Vael',
          mark: 'human',
          presentation: 'A wandering mage.',
          hp: 10,
          maxHp: 10,
          xp: 0,
          level: 1,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        logs: [],
        turnNumber: 0,
        codex: { cast: [], trove: [], beats: [] },
        mediaTier: 'illuminated',
      });
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
      tx.oncomplete = () => res();
    });
    db.close();
  }, { id: CAMPAIGN_ID, dbName: DB_NAME });
}

async function openTable(page: Page): Promise<boolean> {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.title-page, .book-wall, .book-spine', { timeout: 45_000 });
  await page.waitForTimeout(1500);

  const spine = page.locator('.book-spine').filter({ hasNotText: 'New' }).first();
  if (await spine.isVisible({ timeout: 5000 }).catch(() => false)) {
    await spine.click();
    await page.waitForTimeout(3000);
    return true;
  }
  return false;
}

async function waitForDmResponse(page: Page, prevCount: number): Promise<boolean> {
  // Wait for a new .log-entry to appear (DM has responded)
  try {
    await page.waitForFunction(
      (count) => document.querySelectorAll('.log-entry').length > count,
      prevCount,
      { timeout: 30_000 },
    );
    return true;
  } catch {
    return false;
  }
}

async function sendPlayerAction(page: Page, text: string): Promise<void> {
  // Type in the composer and press Enter
  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
    await textarea.fill(text);
    // Click the Send/submit button
    const sendBtn = page.locator('button[aria-label*="Send"], button[aria-label*="send"], button[type="submit"]').first();
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await textarea.press('Enter');
    }
    return;
  }
  // Fallback: click a suggestion chip
  const suggestion = page.locator('.chip-item').first();
  if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
    await suggestion.click();
  }
}

test('K8 — 30-turn long march: measure narration health over full session', async ({ page }) => {
  test.setTimeout(180_000); // 3 minutes

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await injectCampaign(page);
  const opened = await openTable(page);
  expect(opened, 'K8: table must open for the long march campaign').toBe(true);

  let turnsCompleted = 0;
  let totalNarrationWords = 0;
  let totalNarrationBlocks = 0;
  let suggestionSetsSeen = 0;

  const playerActions = [
    'I look around carefully.',
    'I move north.',
    'I speak to whoever is nearby.',
    'I examine the area.',
    'I rest briefly.',
    'I press forward.',
    'I draw my weapon.',
    'I call out into the darkness.',
    'I search for clues.',
    'I take stock of my surroundings.',
  ];

  // Track if suggestions appeared this turn
  let lastSuggestionCount = 0;

  for (let turn = 0; turn < TARGET_TURNS; turn++) {
    const logsBefore = await page.locator('.log-entry').count();

    // Send a player action (cycling through the list)
    const action = playerActions[turn % playerActions.length];
    await sendPlayerAction(page, action);

    // Wait for DM response
    const responded = await waitForDmResponse(page, logsBefore);
    if (!responded) {
      test.info().annotations.push({ type: 'K8-WARNING', description: `Turn ${turn + 1}: DM did not respond within 30s — ending march early` });
      break;
    }

    turnsCompleted++;

    // Small wait for the turn to fully render
    await page.waitForTimeout(500);

    // Count suggestions this turn
    const currentSuggestions = await page.locator('.chip-item').count();
    if (currentSuggestions > lastSuggestionCount || currentSuggestions > 0) {
      suggestionSetsSeen++;
      lastSuggestionCount = currentSuggestions;
    }
  }

  // Measure final state
  const finalCounts = await page.evaluate(() => {
    const logEntries = document.querySelectorAll('.log-entry');
    let words = 0;
    let blocks = 0;
    const illustrationPanels = document.querySelectorAll('.illustration-panel').length;

    logEntries.forEach((entry) => {
      // Narration blocks: paragraph elements inside the log entry
      const narrationParas = entry.querySelectorAll('p.narration, .narration-block p, .log-prose p');
      narrationParas.forEach((p) => {
        const text = (p as HTMLElement).innerText || '';
        words += text.trim().split(/\s+/).filter(Boolean).length;
        if (text.trim()) blocks++;
      });

      // Fallback: count all paragraph-like text if no narration-block class
      if (blocks === 0) {
        const allParas = entry.querySelectorAll('p');
        allParas.forEach((p) => {
          const text = (p as HTMLElement).innerText || '';
          words += text.trim().split(/\s+/).filter(Boolean).length;
          if (text.trim()) blocks++;
        });
      }
    });

    return {
      logEntries: logEntries.length,
      narrationWords: words,
      narrationBlocks: blocks,
      illustrationPanels,
    };
  });

  const counts: Counts = {
    turnsCompleted,
    narrationWords: finalCounts.narrationWords,
    narrationBlocks: finalCounts.narrationBlocks,
    suggestionSets: suggestionSetsSeen,
    logEntries: finalCounts.logEntries,
    illustrationPanels: finalCounts.illustrationPanels,
  };

  test.info().annotations.push({
    type: 'K8-COUNTS',
    description: JSON.stringify(counts, null, 2),
  });

  // Load or establish budget
  if (!existsSync(BUDGET_PATH)) {
    // First run: establish baseline
    const floor: Counts = {
      turnsCompleted: Math.floor(counts.turnsCompleted * FLOOR_RATIO),
      narrationWords: Math.floor(counts.narrationWords * FLOOR_RATIO),
      narrationBlocks: Math.floor(counts.narrationBlocks * FLOOR_RATIO),
      suggestionSets: Math.floor(counts.suggestionSets * FLOOR_RATIO),
      logEntries: Math.floor(counts.logEntries * FLOOR_RATIO),
      illustrationPanels: 0, // keyless = no painted plates; floor is 0
    };
    const budget: Budget = {
      baseline: counts,
      floor,
      recordedAt: new Date().toISOString(),
      targetTurns: TARGET_TURNS,
    };
    writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
    test.info().annotations.push({
      type: 'K8-BUDGET-ESTABLISHED',
      description: `Budget written to k8-budget.json. Baseline: ${JSON.stringify(floor)}`,
    });
    // First run always passes by construction
    return;
  }

  // Subsequent runs: assert against committed floor
  const budget: Budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8'));
  const floor = budget.floor;

  expect(counts.turnsCompleted, `K8: turns completed (${counts.turnsCompleted}) must meet floor (${floor.turnsCompleted})`).toBeGreaterThanOrEqual(floor.turnsCompleted);
  expect(counts.logEntries, `K8: log entries (${counts.logEntries}) must meet floor (${floor.logEntries})`).toBeGreaterThanOrEqual(floor.logEntries);

  if (floor.narrationWords > 0) {
    expect(counts.narrationWords, `K8: narration words (${counts.narrationWords}) must meet floor (${floor.narrationWords})`).toBeGreaterThanOrEqual(floor.narrationWords);
  }
  if (floor.narrationBlocks > 0) {
    expect(counts.narrationBlocks, `K8: narration blocks (${counts.narrationBlocks}) must meet floor (${floor.narrationBlocks})`).toBeGreaterThanOrEqual(floor.narrationBlocks);
  }
  if (floor.suggestionSets > 0) {
    expect(counts.suggestionSets, `K8: suggestion sets (${counts.suggestionSets}) must meet floor (${floor.suggestionSets})`).toBeGreaterThanOrEqual(floor.suggestionSets);
  }
});
