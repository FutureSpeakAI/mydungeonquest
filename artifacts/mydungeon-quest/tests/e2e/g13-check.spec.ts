import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_ROOT } from './lib/vision';

// G13 THE REGRESSION FLOOR — the whole existing eval keeps passing,
// keyless, at every iteration that touched game source. The letter names
// 65 PASS lines; the suite pins the count MEASURED at iteration one
// (the eval has grown since the letter was written — the honest number is
// the current one, recorded before any Task 52 game fix; see LOOP_LOG.md).

const BASELINE = path.join(GAME_ROOT, 'test-results', 'check-baseline.json');

test('G13 npm run check exits 0 keyless with the pinned PASS count', async () => {
  test.setTimeout(900_000);

  const env: Record<string, string | undefined> = { ...process.env };
  for (const key of [
    'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'OPENAI_API_KEY', 'ELEVENLABS_API_KEY',
    'DM_PROVIDER', 'PAINT_PROVIDER', 'AUDIO_PROVIDER',
    'CLERK_SECRET_KEY', 'CLERK_PUBLISHABLE_KEY', 'VITE_CLERK_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY'
  ]) delete env[key];

  const result = spawnSync('npm', ['run', 'check'], {
    cwd: GAME_ROOT, env: env as NodeJS.ProcessEnv, encoding: 'utf8',
    timeout: 840_000, maxBuffer: 64 * 1024 * 1024
  });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const tail = output.split('\n').slice(-25).join('\n');
  expect(result.status, `npm run check exited ${result.status}; tail:\n${tail}`).toBe(0);

  const passCount = (result.stdout.match(/\bPASS\b/g) || []).length;
  const failCount = (result.stdout.match(/\bFAIL\b/g) || []).length;
  expect(failCount, `check reported failures; tail:\n${tail}`).toBe(0);
  expect(passCount, 'the eval actually ran').toBeGreaterThan(0);

  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  if (!fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, JSON.stringify({ passCount, recordedAt: new Date().toISOString(), letterExpected: 65 }, null, 2));
  } else {
    const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    expect(passCount, `PASS count drifted from the iteration-one floor of ${baseline.passCount}`).toBe(baseline.passCount);
  }

  // Keep the tail for the Section 7 report.
  fs.writeFileSync(path.join(GAME_ROOT, 'test-results', 'check-tail.txt'), tail);
});
