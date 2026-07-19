// ------------------------------------------------------------
// THE PINNING CEREMONY (Task 59, Directive XII §VI.1) — TIME-TO-WONDER.
//
// The clock runs from the tap that commits a new tale ("Begin the
// chronicle") to the first narrated sentence standing in the table's
// log. Measured the way a patron feels it: a real browser, the real
// forge walk, the LIVE Anthropic door — not the mock scale (that
// instrument weighs the door alone; this one weighs the whole road).
//
// Ten fresh runs by default, each in its own browser context (its own
// IndexedDB), sequential so rounds never contend. Prints every run,
// the median, and the budget ceil(median * 1.5) in whole seconds —
// the numbers Directive XII §VI.1 seats.
//
// The keyed fork, forced: ANTHROPIC present (hard stop without it),
// paint/voice/openai keys DELETED so the clock weighs narration, not
// ornament. Clerk keys deleted — the doorless hallway. The ceremony
// preflights the door and REFUSES if the provider is not anthropic:
// a wonder budget pinned on the mock tier would be a lie.
//
// Usage: node tests/e2e/tools/wonder-ceremony.mjs   (from game root)
//   CEREMONY_ROUNDS=n   fewer/more runs (the directive's pin uses 10)
//   CEREMONY_PORT=n     vite port (default 5197; api on port+1... no —
//                       INTERNAL_API_PORT is fixed at 5196 here)
// ------------------------------------------------------------
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const PORT = Number(process.env.CEREMONY_PORT || 5197);
const API_PORT = 5196;
const ROUNDS = Number(process.env.CEREMONY_ROUNDS || 10);
const BASE = `http://127.0.0.1:${PORT}`;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('CEREMONY REFUSED — ANTHROPIC_API_KEY is not present. The wonder clock runs on live keys only; a missing key is a hard stop, never a mock walk.');
  process.exit(1);
}

// The keyed fork: anthropic lives, every other provider and the door
// keys fall away. DM_PROVIDER is cleared so the server's own key-led
// choice seats anthropic.
const childEnv = { ...process.env, PORT: String(PORT), INTERNAL_API_PORT: String(API_PORT), NODE_ENV: 'development' };
for (const key of [
  'DM_PROVIDER', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
  'ELEVENLABS_API_KEY', 'CLERK_SECRET_KEY', 'VITE_CLERK_PUBLISHABLE_KEY', 'CLERK_PUBLISHABLE_KEY',
]) delete childEnv[key];

const server = spawn('node', ['scripts/dev.mjs'], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = '';
server.stdout.on('data', (b) => { serverLog += b; });
server.stderr.on('data', (b) => { serverLog += b; });
let browser = null;
const die = async (msg) => {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
  console.error(msg);
  console.error('--- server log tail ---\n' + serverLog.slice(-2000));
  process.exit(1);
};

// Wait for vite AND the api door behind its proxy.
let up = false;
for (let i = 0; i < 120 && !up; i++) {
  await delay(500);
  try {
    const page = await fetch(BASE + '/');
    const api = await fetch(BASE + '/api/seasons');
    up = page.ok && api.ok;
  } catch { /* not yet */ }
}
if (!up) await die('CEREMONY FAILED — the house never opened its doors.');

// Preflight: the door must be LIVE anthropic — proven by the door
// itself, not inferred. One sealed genesis ask names its provider and
// doubles as the warmup that pays every cold-path cost before round 1.
const { makeEntropy } = await import('fatescript/protocol');
const { createHero } = await import('fatescript/rules');
let provider = null;
try {
  const response = await fetch(BASE + '/api/dm?stream=1', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign: { title: 'Ceremony Preflight', homeRegion: 'Larkspur Vale' },
      hero: createHero({ name: 'Warden of the Clock' }),
      story: { beat: { title: 'The Ordinary Flame' }, regions: [] },
      state: {}, memory: [], history: [],
      entropy: makeEntropy(), player: 'Begin.', resolution: null, turn: 0, genesis: true,
    }),
  });
  if (!response.ok) await die(`CEREMONY REFUSED — the preflight ask answered ${response.status}.`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', eventName = '';
  preflight: for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim(); buffer = buffer.slice(nl + 1);
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:') && eventName === 'turn') {
        provider = JSON.parse(line.slice(5))?.provider || null;
        break preflight;
      }
    }
  }
} catch (error) {
  await die(`CEREMONY REFUSED — the preflight ask failed: ${error?.message || error}`);
}
if (provider !== 'anthropic') {
  await die(`CEREMONY REFUSED — the door seats '${provider}', not a live anthropic sitting. A wonder budget pinned on any other tier is a lie.`);
}

browser = await chromium.launch();
const seconds = [];

for (let round = 1; round <= ROUNDS; round++) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.addInitScript(() => { try { sessionStorage.setItem('mdq:arrived', '1'); } catch { /* private mode */ } });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.click('.new-spine', { timeout: 30_000 });
    await page.waitForSelector('.spark-card', { timeout: 30_000 });
    await page.locator('.spark-card').nth(1).click();
    await page.click('button:has-text("Forge the hero")');
    await page.waitForSelector('.audition-chip', { timeout: 60_000 });
    await page.locator('.audition-chip').first().click();
    // THE TAP THAT COMMITS THE TALE — the clock starts on the tap
    // itself, exactly as the patron's finger feels it.
    const t0 = Date.now();
    await page.click('button:has-text("Begin the chronicle")');
    await page.waitForFunction(() => {
      const entries = document.querySelectorAll('main.adventure-log .turn-entry');
      for (const entry of entries) {
        const text = (entry.textContent || '').trim();
        if (text.length >= 40) return true;
      }
      return false;
    }, undefined, { timeout: 120_000 });
    const elapsed = (Date.now() - t0) / 1000;
    seconds.push(elapsed);
    console.log(`round ${round}: ${elapsed.toFixed(2)}s`);
  } catch (error) {
    await die(`CEREMONY FAILED at round ${round} — ${error?.message || error}`);
  } finally {
    await context.close().catch(() => {});
  }
}

await browser.close();
server.kill('SIGTERM');

const sorted = [...seconds].sort((a, b) => a - b);
const mid = sorted.length >> 1;
const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
const budget = Math.ceil(median * 1.5);
console.log('CEREMONY ' + JSON.stringify({
  rounds: ROUNDS,
  provider,
  runsSeconds: seconds.map((s) => Number(s.toFixed(2))),
  medianSeconds: Number(median.toFixed(2)),
  budgetSeconds: budget,
}));
