import { defineConfig } from '@playwright/test';

// TASK 52 — THE PROVING LOOP. One project, one worker: the criteria are a
// ladder (g00 preflight → g01…g18 → sabotage) and the vision specs feed on
// plates the harvest spec (g09) mints. Retries 0 per the letter; trace
// on-first-retry per the letter (moot at 0 retries, kept as written).
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: 'test-results/report.json' }]],
  use: {
    baseURL: 'http://localhost:5199',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 900 },
    // Replit ships a nix-patched chromium matched to playwright 1.55.0
    // (revision 1187); downloaded builds cannot link on NixOS.
    launchOptions: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: 'bash tests/e2e/webserver.sh',
    url: 'http://localhost:5199/',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
