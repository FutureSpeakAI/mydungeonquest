import { defineConfig } from '@playwright/test';

// TASK 54 — THE TERMINAL ANSWER ladder. The keyless CHECK (G13, the
// pinned count) sits FIRST — the cheapest gate, needing no app state;
// the environment preflight follows; ONE harvest project mints every
// artifact (plates, records, storybook, captions, the top manifest)
// into test-results/harvest/; and the courts — dom, six judge projects,
// and the teeth — read only the disk. A judge project can never
// repaint; a missing artifact is a loud NAMED refusal and a REFUSED
// artifact fails by name (§2.5) — never a skip-by-silence. Four
// workers: dependencies still rung the ladder, but independent courts
// sit in parallel once the harvest is on disk. Retries 0 per the letter.
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/artifacts',
  fullyParallel: false,
  workers: 4,
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
  projects: [
    { name: 'check', testMatch: /g13-check\.spec\.ts/ },
    { name: 'preflight', testMatch: /g00-preflight\.spec\.ts/, dependencies: ['check'] },
    { name: 'harvest', testMatch: /harvest\.spec\.ts/, dependencies: ['preflight'] },
    { name: 'dom', testMatch: /(g01|g02|g04|g05|g07|g12|g14|g15)-.*\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g09-character', testMatch: /g09-character\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g10-environment', testMatch: /g10-environment\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g11-style', testMatch: /g11-style\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g16-captions', testMatch: /g16-captions\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g17-framing', testMatch: /g17-framing\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g18-storybook', testMatch: /g18-storybook\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'teeth', testMatch: /sabotage\.spec\.ts/, dependencies: ['harvest'] },
  ],
  webServer: {
    command: 'bash tests/e2e/webserver.sh',
    url: 'http://localhost:5199/',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
