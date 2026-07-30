import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { boot, turnCount } from './lib/harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────────
// K8 — 30-TURN INSTRUMENTED LONG MARCH  (Stage 6.5 revised)
//
// Opens the proving-campaign fixture (the one proven table that always reaches
// the adventure-log) and walks 30 additional player→DM turns in keyless mode.
// The harness seedFixture / act / waitForTurn utilities are the proven
// primitives; the long march adds instrumentation on top.
//
// Budget schema has TWO structurally distinct classes:
//
//   throughput: { _direction: "floor" }
//     Null until the first run writes them. On subsequent runs each must be
//     ≥ its floor. Drop = regression.
//
//   failure: { _direction: "ceiling" }
//     Set BY HAND in k8-budget.json BEFORE the first run.
//     A run NEVER writes or modifies failure values.
//     If the first march exceeds a ceiling, that ceiling is not wrong.
//     Report the gap; do not adopt the count as the standard.
//
// Throughput floor ratio: 80%.
//
// Observational extras (always reported, not gated):
//   - wall-clock time per turn, and which step dominated
//   - navigator.storage.estimate() at start and end  (F1 quota question)
//   - DOM node count at turns 1/15/30                (F9 performance question)
//   - log DOM text length at turns 1/10/20/30        (context-pack proxy)
//     (keyless: mock DM ignores context pack; text length is closest proxy)
//
// Failure counter instrumentation via console interception:
//   Each counter matches console errors/warnings/logs.
//   unknownPageErrors: page.on('pageerror') — escaped uncaught exceptions.
//   NOTE: swallowedExceptions and maxConsecutiveTicksSameSoul are not
//   instrumentable from outside; noted in the observational report only.
// ──────────────────────────────────────────────────────────────────────────────

const BUDGET_PATH = path.join(__dirname, 'k8-budget.json');
const TARGET_TURNS = 30;
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
// unknownPageErrors is populated by the pageerror handler separately.
const FAILURE_PATTERNS: Array<{ pattern: RegExp; key: Exclude<FailureKey, 'unknownPageErrors'> }> = [
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

// ── Observational helpers ─────────────────────────────────────────────────────

async function getDomNodeCount(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelectorAll('*').length);
}

async function getLogDomTextLength(page: Page): Promise<number> {
  return page.evaluate(() => {
    let total = 0;
    document.querySelectorAll('main.adventure-log .turn-entry').forEach((el) => {
      total += ((el as HTMLElement).innerText || '').length;
    });
    return total;
  });
}

async function getStorageEstimate(page: Page): Promise<{ usageBytes: number; quotaBytes: number; usagePct: string } | null> {
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
  test.setTimeout(600_000); // 10 minutes: live paints can queue behind Gemini 503 retries

  await page.setViewportSize({ width: 390, height: 844 });

  // ── Failure counter instrumentation ─────────────────────────────────────
  const fc = initFailureCounts();

  page.on('console', (msg) => {
    const text = msg.text();
    for (const { pattern, key } of FAILURE_PATTERNS) {
      if (pattern.test(text)) { fc[key]++; break; }
    }
  });
  page.on('pageerror', (err) => {
    fc.unknownPageErrors++;
    test.info().annotations.push({ type: 'K8-PAGE-ERROR', description: err.message });
  });

  // ── Open a cast-free march campaign ──────────────────────────────────────
  // The proving-campaign fixture has cast members (Edda, Vessarine) present
  // at the scene. The mock DM generates narration-only turns (no dialogue),
  // which both the server and client validators reject when cast are present,
  // so the new turn is silently discarded and never appears in the DOM.
  // Solution: use an inline fixture with NO cast, NO existing turns. The mock
  // DM's narration-only style is fully valid on a solo scene. The app will
  // auto-generate the opening narration (the first DM turn) before the composer
  // re-enables — we wait for that to settle before starting the march.
  //
  // boot navigates to /?proving=1 and waits for .title-page.
  // window.__mdqSeed is registered in a useEffect + dynamic import that fires
  // AFTER the title page renders, so we must wait for it explicitly.
  await boot(page);
  await page.waitForFunction(() => typeof (window as any).__mdqSeed === 'function', { timeout: 15_000 });

  const marchFixture = {
    title: 'The Long March',
    covenant: 'A lonely road through high country where the weather turns without warning and every village keeps its own gods. The hero travels alone.',
    tone: 'Gritty, quiet, and mythic',
    styleBible: 'Dark fantasy oil painting, muted palette, lone figure in vast landscapes.',
    homeRegion: 'The High Pass',
    spineId: 'classic-epic',
    lines: [],
    veils: [],
    hero: {
      name: 'Erlan',
      sigil: '⚔',
      ancestry: 'Human',
      className: 'Warrior',
      caster: 'none',
      hitDie: 10,
      abilities: { STR: 15, DEX: 12, CON: 14, INT: 10, WIS: 11, CHA: 8 },
      skills: ['Athletics', 'Perception', 'Survival'],
      bearing: 'A road-worn soldier with a heavy pack and a broken compass hung around his neck.',
      background: 'A discharged scout who still walks patrol routes out of habit.',
      presentation: 'masculine',
      pronouns: 'he/him',
      mark: 'a scar that crosses both palms',
    },
    // NO turns — the app auto-generates the opening narration; that way the
    // cast array is empty and the mock DM generates valid narration-only turns.
    turns: [],
  };

  await page.evaluate(async (fx) => (window as any).__mdqSeed(fx), marchFixture);
  await page.waitForSelector('main.adventure-log', { timeout: 30_000 });

  // The adventure-log is empty (no turns — __mdqSeed does not fire the genesis
  // DM call; that only happens through the title screen's onOpen/greetTale path).
  // The composer should be immediately ready: no cast → no dialogue rule, no
  // pending roll, not busy. Wait for it to confirm before starting the march.
  await page.waitForSelector('.composer textarea:not([disabled])', { timeout: 30_000 });

  // Storage estimate at start
  const storageStart = await getStorageEstimate(page);

  // Snapshot of existing turns before the march starts (fixture has some turns)
  const turnsAtStart = await turnCount(page);
  const ticksAtStart = await page.locator('.divider-row').count();

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
  const turnTimings: Array<{ turn: number; totalMs: number }> = [];
  const domSnapshots: Array<{ turn: number; nodeCount: number }> = [];
  const contextProxies: Array<{ turn: number; logDomTextChars: number }> = [];

  // ── Self-contained per-turn helpers ─────────────────────────────────────
  // Avoids rollIfAsked (which requires .die to appear) — instead just clicks
  // the roll button and waits for a new turn-entry, no animation dependency.
  async function drainPendingRoll(label: string): Promise<boolean> {
    const btn = page.locator('.roll-button');
    if (!(await btn.isVisible().catch(() => false))) return false;
    const beforeRoll = await turnCount(page);
    await btn.click();
    const resolved = await page.waitForFunction(
      (n) => document.querySelectorAll('main.adventure-log .turn-entry').length > n,
      beforeRoll,
      { timeout: 120_000 },
    ).catch(() => null);
    if (!resolved) {
      test.info().annotations.push({ type: 'K8-WARNING', description: `${label}: roll not resolved within 120s` });
      return false;
    }
    return true;
  }

  // Send one player action and wait for the DM's response turn to appear.
  // Returns true on success; false if the DM didn't respond within timeout.
  async function marchTurn(t: number): Promise<boolean> {
    const turnStart = Date.now();
    const ticksBefore = await page.locator('.divider-row').count();

    // Observational snapshots at turns 1/10/15/20/30
    if ([0, 9, 14, 19, 29].includes(t)) {
      domSnapshots.push({ turn: t + 1, nodeCount: await getDomNodeCount(page) });
    }
    if ([0, 9, 19, 29].includes(t)) {
      contextProxies.push({ turn: t + 1, logDomTextChars: await getLogDomTextLength(page) });
    }

    // Step 1: wait for the page to be in a state where we can interact
    const label = `Turn ${t + 1}`;
    const readySelector = '.composer textarea:not([disabled]), .roll-button';
    const readyEl = await page.waitForSelector(readySelector, { timeout: 60_000 }).catch(() => null);
    if (!readyEl) {
      test.info().annotations.push({ type: 'K8-WARNING', description: `${label}: composer not ready after 60s` });
      return false;
    }

    // Step 2: drain any pending roll BEFORE the player action
    if (await drainPendingRoll(`${label} pre-roll`)) {
      const composerAfterRoll = await page.waitForSelector(
        '.composer textarea:not([disabled])',
        { timeout: 60_000 },
      ).catch(() => null);
      if (!composerAfterRoll) {
        test.info().annotations.push({ type: 'K8-WARNING', description: `${label}: composer not re-enabled after pre-roll` });
        return false;
      }
    }

    const before = await turnCount(page);
    const action = playerActions[t % playerActions.length];

    // Step 3: dismiss any .ritual overlay before sending — level-up, seal-ask,
    // and pyre-ask overlays intercept pointer events and block the send button.
    // For seal-ask / pyre-ask click the secondary (safe/cancel) button; for
    // level-up click the accept button; fall back to the first visible button.
    const ritual = page.locator('.ritual');
    if (await ritual.isVisible().catch(() => false)) {
      const secondary = ritual.locator('.secondary-button');
      const anyBtn    = ritual.locator('button').first();
      const dismissEl = (await secondary.isVisible().catch(() => false)) ? secondary : anyBtn;
      await dismissEl.click().catch(() => null);
      // Wait for it to clear
      await ritual.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => null);
    }
    // Step 3b: fill + submit
    await page.fill('.composer textarea', action);
    await page.locator('[aria-label="Send your action"]').click();

    // Step 4: wait for the DM's response turn to appear (generous: repair can retry 2×)
    const appeared = await page.waitForFunction(
      (n) => document.querySelectorAll('main.adventure-log .turn-entry').length > n,
      before,
      { timeout: 60_000 },
    ).catch(() => null);
    if (!appeared) {
      test.info().annotations.push({ type: 'K8-WARNING', description: `${label}: DM turn did not appear within 60s` });
      return false;
    }

    // Step 5: drain any roll the DM generated (non-blocking — if it fails we still count the turn)
    await drainPendingRoll(`${label} post-roll`);

    turnTimings.push({ turn: t + 1, totalMs: Date.now() - turnStart });

    const ticksAfter = await page.locator('.divider-row').count();
    const ticksThisTurn = Math.max(0, ticksAfter - ticksBefore);
    if (ticksThisTurn > fc.maxTicksInOneTurn) fc.maxTicksInOneTurn = ticksThisTurn;

    const chips = await page.locator('.chip-item').count();
    if (chips > 0) suggestionSetsSeen++;

    return true;
  }

  for (let t = 0; t < TARGET_TURNS; t++) {
    const ok = await marchTurn(t);
    if (!ok) break;
    turnsCompleted++;
  }

  // ── Final measurements ───────────────────────────────────────────────────
  const storageEnd = await getStorageEstimate(page);

  const finalCounts = await page.evaluate(() => {
    const logEntries = document.querySelectorAll('main.adventure-log .turn-entry');
    let words = 0;
    let blocks = 0;
    const illustrationPanels = document.querySelectorAll('.illustration-panel').length;
    const tickFired = document.querySelectorAll('.divider-row').length;

    logEntries.forEach((entry) => {
      const narrationParas = entry.querySelectorAll('.narration p');
      narrationParas.forEach((p) => {
        const text = (p as HTMLElement).innerText || '';
        words += text.trim().split(/\s+/).filter(Boolean).length;
        if (text.trim()) blocks++;
      });
    });

    return { logEntries: logEntries.length, narrationWords: words, narrationBlocks: blocks, illustrationPanels, tickFired };
  });

  // Measure only what the march itself added (exclude fixture's existing turns)
  const marchLogEntries = finalCounts.logEntries - turnsAtStart;
  const marchTicksFired  = finalCounts.tickFired  - ticksAtStart;

  const throughputActual: Record<ThroughputKey, number> = {
    turnsCompleted,
    logEntries: Math.max(0, marchLogEntries),
    narrationWords: finalCounts.narrationWords,
    narrationBlocks: finalCounts.narrationBlocks,
    suggestionSets: suggestionSetsSeen,
    platesRendered: finalCounts.illustrationPanels,
    ticksFired: Math.max(0, marchTicksFired),
  };

  // ── Observational report ─────────────────────────────────────────────────
  const wallClockTotal = turnTimings.reduce((s, t) => s + t.totalMs, 0);
  const wallClockPerTurn = turnsCompleted > 0 ? (wallClockTotal / turnsCompleted).toFixed(0) : 'n/a';
  const sortedTimings = [...turnTimings].sort((a, b) => b.totalMs - a.totalMs);
  const slowestTurn = sortedTimings[0] ?? null;

  test.info().annotations.push({
    type: 'K8-OBSERVATIONAL',
    description: JSON.stringify({
      wallClockPerTurnMs: wallClockPerTurn,
      slowestTurn,
      storageStart,
      storageEnd,
      domNodeSnapshots: domSnapshots,
      contextPackProxies: contextProxies,
      note_contextPack: 'logDomTextChars is a DOM-text proxy; in keyless mode the mock DM ignores the context pack.',
      note_consecutiveTicks: 'maxConsecutiveTicksSameSoul not instrumentable from outside — requires tick content parsing.',
      note_swallowed: 'swallowedExceptions not instrumentable — silent catches are definitionally invisible.',
    }, null, 2),
  });

  test.info().annotations.push({ type: 'K8-THROUGHPUT', description: JSON.stringify(throughputActual, null, 2) });
  test.info().annotations.push({ type: 'K8-FAILURE',    description: JSON.stringify(fc, null, 2) });

  // ── Load budget ──────────────────────────────────────────────────────────
  const budget: Budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8'));

  expect(budget.throughput._direction).toBe('floor');
  expect(budget.failure._direction).toBe('ceiling');

  // ── Throughput: write on first run, assert on subsequent runs ────────────
  const throughputKeys = Object.keys(throughputActual) as ThroughputKey[];
  const isFirstRun = throughputKeys.every((k) => budget.throughput[k] === null);

  if (isFirstRun) {
    for (const k of throughputKeys) {
      (budget.throughput as Record<string, number | null>)[k] = Math.floor(throughputActual[k] * THROUGHPUT_FLOOR_RATIO);
    }
    budget.recordedAt = new Date().toISOString();
    writeFileSync(BUDGET_PATH, JSON.stringify(budget, null, 2));
    test.info().annotations.push({
      type: 'K8-BUDGET-FLOORS-WRITTEN',
      description: `Throughput floors written from first run. Failure ceilings NOT touched.`,
    });
    // Fall through to failure assessment below (findings reported even on first run)
  } else {
    for (const k of throughputKeys) {
      const floor = budget.throughput[k];
      if (floor === null) continue;
      expect(throughputActual[k], `K8 throughput.${k} (${throughputActual[k]}) must meet floor (${floor})`).toBeGreaterThanOrEqual(floor);
    }
  }

  // ── Failure: assess on every run ────────────────────────────────────────
  // First run: findings are reported but not hard-failed (they are the data).
  // Subsequent runs: hard assert each failure ≤ ceiling.
  const failureKeys = Object.keys(fc) as FailureKey[];
  const failureFindings: string[] = [];

  for (const k of failureKeys) {
    const ceiling = budget.failure[k];
    const actual = fc[k];
    if (actual > ceiling) failureFindings.push(`K8 failure.${k}: actual=${actual} exceeds ceiling=${ceiling}`);
  }

  test.info().annotations.push({
    type: 'K8-FAILURE-ASSESSMENT',
    description: failureFindings.length === 0
      ? 'All failure counters within ceiling.'
      : `CEILING EXCEEDED:\n${failureFindings.join('\n')}`,
  });

  if (!isFirstRun) {
    for (const finding of failureFindings) {
      expect.soft(true, finding).toBe(false);
    }
  }
});
