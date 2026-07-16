import { expect, test } from '@playwright/test';
import { probeJudge } from './lib/vision';

// §0.5 — the suite runs with real keys in the TEST process or it does not
// run at all. No silent downgrades: a missing key or a refusing judge is a
// reportable environment failure, never a mock fallback.

test('G0 preflight: the judge key, a paint key, and a live judge', async () => {
  expect(process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY must be present in the test process for the vision judge').toBeTruthy();
  expect(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY,
    'a live paint key (GEMINI/GOOGLE/OPENAI) must be present for the app server'
  ).toBeTruthy();
  await probeJudge(); // throws if the model refuses or answers non-JSON
});
