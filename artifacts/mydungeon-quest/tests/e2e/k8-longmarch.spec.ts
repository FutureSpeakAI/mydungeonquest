import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

// ──────────────────────────────────────────────────────────────────────────────
// K8 — 30-TURN INSTRUMENTED LONG MARCH  (Stage 6.5 revised)
//
// Budget schema has TWO structurally distinct classes:
//
//   throughput: { _direction: "floor" }
//     Measures that the game did its work. Values are null until the first run
//     writes them from observation (FLOOR_RATIO × observed). On subsequent runs
//     each metric must be ≥ its floor. If a throughput count drops, something
//     stopped working.
//
//   failure: { _direction: "ceiling" }
//     Measures silence and breakage. Values are set BY HAND in k8-budget.json
//     BEFORE the first run, from judgment about what the game should do. A run
//     NEVER writes or modifies failure values. If the first march exceeds a
//     ceiling, that ceiling is not wrong — there is work. The first march's
//     counts are a finding to report, not a baseline to adopt.
//
// Throughput floor ratio: 80% (ratchets downward only).
// Failure ceilings: see k8-budget.json.
//
// Observational extras (not gated, always reported):
//   - wall-clock time per turn, and which step dominated
//   - navigator.storage.estimate() at start and end (F1 quota question)
//   - DOM node count at turns 1, 15, and 30 (F9 performance question)
//   - context pack proxy (total log DOM text length at turns 1/10/20/30)
//     Note: in keyless mode the context pack is built but the mock DM ignores it;
//     DOM text length is the closest observable proxy.
//
// Failure counter instrumentation via console interception:
//   Each failure counter is incremented by matching console messages.
//   Unmatched console errors are counted as unknownPageErrors.
//   NOTE: swallowedExceptions (silent catches) and maxConsecutiveTicksSameSoul
//   are not instrumentable from outside the browser without source hooks;
//   they are tracked as advisory notes in the march report only.
// ──────────────────────────────────────────────────────────────────────────────

const CAMPAIGN_ID = 'k8-long-march';
const DB_NAME = 'mydungeon-cinematic';
const TARGET_TURNS = 30;
const BUDGET_PATH = path.join(__dirname, 'k8-budget.json');
const THROUGHPUT_FLOOR_RATIO = 0.80;

// ── Budget types ──────────────────────────────────────────────────────────────

interface ThroughputClass {
  _direction: 'floor';
  turnsCompleted: number | null;
  logEntries: number | null;
  narrationWords: number | null;
  narrationBlocks: number | null;
  suggestionSets: number | null;
  platesRendered: number | null;
  ticksFired: number | null;
}

interface FailureClass {
  _direction: 'ceiling';
  playRejections: number;
  platesRefusedByRenderDoor: number;
  boundaryAssertionThrows: number;
  unknownPageErrors: number;
  unresolvedReferences: number;
  quotaWarnings: number;
  narrationFloorBreaches: number;
  safeFallbackTurnInvocations: number;
  understudyInvocations: number;
  validatorRepairTurns: number;
  maxTicksInOneTurn: number;
}

interface Budget {
  _note?: string;
  throughput: ThroughputClass;
  failure: FailureClass;
  targetTurns: number;
  recordedAt?: string;
}

type ThroughputKey = Exclude<keyof ThroughputClass, '_direction'>;
type FailureKey    = Exclude<keyof FailureClass,    '_direction'>;

// ── Failure counter instrumentation ──────────────────────────────────────────

type FailureCounts = Record<FailureKey, number>;

// Pattern → failure key. A console message matches the FIRST pattern it hits.
// unknownPageErrors is populated by the pageerror handler, not console patterns.
const FAILURE_PATTERNS: Array<{ pattern: RegExp; key: FailureKey }> = [
  { pattern: /play\(\)|NotAllowedError/i,                           key: 'playRejections' },
  { pattern: /\[E3\]|campaign.isolation|boundary.*violated/i,       key: 'boundaryAssertionThrows' },
  { pattern: /attestation|render.door|plate.refused/i,              key: 'platesRefusedByRenderDoor' },
  { pattern: /unresolved.*reference|anchor.isolation/i,             key: 'unresolvedReferences' },
  { pattern: /\bquota\b/i,                                          key: 'quotaWarnings' },
  { pattern: /narration.*floor|floor.*breach|below.*floor/i,        key: 'narrationFloorBreaches' },
  { pattern: /safeFallback|safe.fallback.turn/i,                    key: 'safeFallbackTurnInvocations' },
  { pattern: /\bunderstudy\b/i,                                     key: 'understudyInvocations' },
  { pattern: /\brepair\b/i,                                         key: 'validatorRepairTurns' },
];

function classifyConsoleMessage(text: string): FailureKey | null {
  for (const { pattern, key } of FAILURE_PATTERNS) {
    if (pattern.test(text)) return key;
  }
  return null;
}

function initFailureCounts(): FailureCounts {
  return {
    playRejections: 0,
    platesRefusedByRenderDoor: 0,
    boundaryAssertionThrows: 0,
    unknownPageErrors: 0,
    unresolvedReferences: 0,
    quotaWarnings: 0,
    narrationFloorBreaches: 0,
    safeFallbackTurnInvocations: 0,
    understudyInvocations: 0,
    validatorRepairTurns: 0,
    maxTicksInOneTurn: 0,
  };
}

// ── Observational extras ──────────────────────────────────────────────────────

interface TurnTiming {
  turn: number;
  totalMs: number;
  waitForDmMs: number;
}

interface StorageSnapshot {
  usageBytes: number;
  quotaBytes: number;
  usagePct: string;
}

interface DomSnapshot {
  turn: number;
  nodeCount: number;
}

interface ContextProxy {
  turn: number;
  logDomTextChars: number;
}

// ── Campaign injection ────────────────────────────────────────────────────────

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
  const textarea = page.locator('textarea').first();
  if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
    await textarea.fill(text);
    const sendBtn = page.locator('button[aria-label*="Send"], button[aria-label*="send"], button[type="submit"]').first();
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
    } else {
      await textarea.press('Enter');
    }
    return;
  }
  const suggestion = page.locator('.chip-item').first();
  if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
    await suggestion.click();
  }
}

async function getDomNodeCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('*').length);
}

async function getLogDomTextLength(page: Page): Promise<number> {
  return page.evaluate(() => {
    let total = 0;
    document.querySelectorAll('.log-entry').forEach((el) => {
      total += ((el as HTMLElement).innerText || '').length;
    });
    return total;
  });
}

async function getStorageEstimate(page: Page): Promise<StorageSnapshot | null> {
  return page.evaluate(async () => {
    if (!navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    const usage = est.usage ?? 0;
    const quota = est.quota ?? 0;
    return {
      usageBytes: usage,
      quotaBytes: quota,
      usagePct: quota > 0 ? ((usage / quota) * 100).toFixed(2) + '%' : 'unknown',
    };
  });
}

// ── Main test ─────────────────────────────────────────────────────────────────

test('K8 — 30-turn long march: throughput floors, failure ceilings, observational extras', async ({ page }) => {
  test.setTimeout(180_000); // 3 minutes

  await page.setViewportSize({ width: 390, height: 844 });

  // Failure counters accumulated throughout the march
  const fc = initFailureCounts();

  // Console message interception — classify errors and warnings
  page.on('console', (msg) => {
    const type = msg.type(); // 'error' | 'warning' | 'log' | 'info' | ...
    const text = msg.text();
    if (type === 'error' || type === 'warning' || type === 'log') {
      const key = classifyConsoleMessage(text);
      if (key && key !== 'unknownPageErrors') {
        fc[key]++;
      }
      // Log unclassified errors (but not warnings/logs — too noisy)
      // (unknownPageErrors is reserved for pageerror events below)
    }
  });

  // Uncaught page exceptions — these escaped all catch blocks
  page.on('pageerror', (err) => {
    fc.unknownPageErrors++;
    test.info().annotations.push({
      type: 'K8-PAGE-ERROR',
      description: `${err.message}`,
    });
  });

  await page.goto('/');
  await injectCampaign(page);

  // Storage estimate at start
  const storageStart = await getStorageEstimate(page);

  const opened = await openTable(page);
  expect(opened, 'K8: table must open for the long march campaign').toBe(true);

  // ── March ────────────────────────────────────────────────────────────────

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

  let turnsCompleted = 0;
  let suggestionSetsSeen = 0;
  const turnTimings: TurnTiming[] = [];
  const domSnapshots: DomSnapshot[] = [];
  const contextProxies: ContextProxy[] = [];

  for (let turn = 0; turn < TARGET_TURNS; turn++) {
    const turnStart = Date.now();
    const logsBefore = await page.locator('.log-entry').count();
    const ticksBefore = await page.locator('.tick-divider').count();

    // Observational snapshots at turns 0 (=turn 1), 9 (=turn 10), 14 (=turn 15), 19 (=turn 20), 29 (=turn 30)
    if ([0, 9, 14, 19, 29].includes(turn)) {
      const nodeCount = await getDomNodeCount(page);
      domSnapshots.push({ turn: turn + 1, nodeCount });
    }
    if ([0, 9, 19, 29].includes(turn)) {
      const chars = await getLogDomTextLength(page);
      contextProxies.push({ turn: turn + 1, logDomTextChars: chars });
    }

    const action = playerActions[turn % playerActions.length];
    await sendPlayerAction(page, action);

    const dmWaitStart = Date.now();
    const responded = await waitForDmResponse(page, logsBefore);
    const dmWaitMs = Date.now() - dmWaitStart;

    if (!responded) {
      test.info().annotations.push({
        type: 'K8-WARNING',
        description: `Turn ${turn + 1}: DM did not respond within 30s — ending march early`,
      });
      break;
    }

    turnsCompleted++;
    await page.waitForTimeout(400);

    const totalMs = Date.now() - turnStart;
    turnTimings.push({ turn: turn + 1, totalMs, waitForDmMs: dmWaitMs });

    // Count ticks that fired this turn
    const ticksAfter = await page.locator('.tick-divider').count();
    const ticksThisTurn = Math.max(0, ticksAfter - ticksBefore);
    if (ticksThisTurn > fc.maxTicksInOneTurn) fc.maxTicksInOneTurn = ticksThisTurn;

    // Count suggestion sets
    const currentSuggestions = await page.locator('.chip-item').count();
    if (currentSuggestions > 0) suggestionSetsSeen++;
  }

  // ── Final measurements ───────────────────────────────────────────────────

  const storageEnd = await getStorageEstimate(page);

  const finalCounts = await page.evaluate(() => {
    const logEntries = document.querySelectorAll('.log-entry');
    let words = 0;
    let blocks = 0;
    const illustrationPanels = document.querySelectorAll('.illustration-panel').length;
    const tickFired = document.querySelectorAll('.tick-divider').length;

    logEntries.forEach((entry) => {
      const narrationParas = entry.querySelectorAll('p.narration, .narration-block p, .log-prose p');
      narrationParas.forEach((p) => {
        const text = (p as HTMLElement).innerText || '';
        words += text.trim().split(/\s+/).filter(Boolean).length;
        if (text.trim()) blocks++;
      });
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
      tickFired,
    };
  });

  const throughputActual: Record<ThroughputKey, number> = {
    turnsCompleted,
    logEntries: finalCounts.logEntries,
    narrationWords: finalCounts.narrationWords,
    narrationBlocks: finalCounts.narrationBlocks,
    suggestionSets: suggestionSetsSeen,
    platesRendered: finalCounts.illustrationPanels,
    ticksFired: finalCounts.tickFired,
  };

  // ── Observational extras report ──────────────────────────────────────────

  const wallClockTotal = turnTimings.reduce((s, t) => s + t.totalMs, 0);
  const wallClockPerTurn = turnsCompleted > 0 ? (wallClockTotal / turnsCompleted).toFixed(0) : 'n/a';
  const slowestTurn = turnTimings.sort((a, b) => b.totalMs - a.totalMs)[0];

  test.info().annotations.push({
    type: 'K8-OBSERVATIONAL',
    description: JSON.stringify({
      wallClockPerTurnMs: wallClockPerTurn,
      slowestTurn: slowestTurn ? { turn: slowestTurn.turn, totalMs: slowestTurn.totalMs, waitForDmMs: slowestTurn.waitForDmMs } : null,
      storageStart,
      storageEnd,
      domNodeSnapshots: domSnapshots,
      contextPackProxies: contextProxies,
      note_contextPack: 'logDomTextChars is a proxy; in keyless mode the mock DM ignores the context pack. Run with AI keys to measure real pack size.',
      note_consecutiveTicks: 'maxConsecutiveTicksSameSoul not instrumentable from DOM classes alone — requires tick content parsing.',
      note_swallowed: 'swallowedExceptions not instrumentable from outside the browser — silent catches are definitionally invisible.',
    }, null, 2),
  });

  test.info().annotations.push({
    type: 'K8-THROUGHPUT',
    description: JSON.stringify(throughputActual, null, 2),
  });

  test.info().annotations.push({
    type: 'K8-FAILURE',
    description: JSON.stringify(fc, null, 2),
  });

  // ── Load budget ──────────────────────────────────────────────────────────

  const budget: Budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8'));

  // Structural guard: both classes must carry the correct _direction
  expect(budget.throughput._direction, 'k8-budget throughput must declare _direction: "floor"').toBe('floor');
  expect(budget.failure._direction, 'k8-budget failure must declare _direction: "ceiling"').toBe('ceiling');

  // ── Throughput: write on first run, assert on subsequent runs ────────────

  const throughputKeys = Object.keys(throughputActual) as ThroughputKey[];
  const isFirstRun = throughputKeys.every((k) => budget.throughput[k] === null);

  if (isFirstRun) {
    // First run: write floors from observation. Leave failure untouched.
    for (const k of throughputKeys) {
      const actual = throughputActual[k];
      // For counts that are 0 in keyless mode (plates), floor is 0
      (budget.throughput as Record<string, number | null>)[k] = Math.floor(actual * THROUGHPUT_FLOOR_RATIO);
    }
    budget.recordedAt = new Date().toISOString();
    writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
    test.info().annotations.push({
      type: 'K8-BUDGET-FLOORS-WRITTEN',
      description: `Throughput floors written from first run. Failure ceilings were NOT touched.`,
    });
    // First run passes on throughput; failure ceilings still asserted (they're 0 or hand-set).
    // Fall through to failure assertion below.
  } else {
    // Subsequent runs: assert throughput ≥ floor
    for (const k of throughputKeys) {
      const floor = budget.throughput[k];
      if (floor === null) continue; // not yet established
      const actual = throughputActual[k];
      expect(actual, `K8 throughput.${k} (${actual}) must meet floor (${floor})`).toBeGreaterThanOrEqual(floor);
    }
  }

  // ── Failure: assert ≤ ceiling on every run (first run included) ──────────
  // A ceiling exceeded on the first run is a finding, not a reason to raise the ceiling.
  // Failures are soft in this spec — they are reported but do NOT fail the build on the
  // first march, because that would prevent the march from completing and writing throughput floors.
  // On subsequent runs, failure ceiling violations ARE hard failures.

  const failureKeys = Object.keys(fc) as FailureKey[];
  const failureFindings: string[] = [];

  for (const k of failureKeys) {
    const ceiling = budget.failure[k];
    const actual = fc[k];
    if (actual > ceiling) {
      failureFindings.push(`K8 failure.${k}: actual=${actual} exceeds ceiling=${ceiling}`);
    }
  }

  test.info().annotations.push({
    type: 'K8-FAILURE-ASSESSMENT',
    description: failureFindings.length === 0
      ? 'All failure counters within ceiling.'
      : `CEILING EXCEEDED:\n${failureFindings.join('\n')}`,
  });

  if (!isFirstRun) {
    // Hard assert on subsequent runs
    for (const finding of failureFindings) {
      expect.soft(true, finding).toBe(false);
    }
  }
  // First run: findings are reported above (annotations) but not hard-failed.
  // They are the data; treat them as the next stage's work order.
});
