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
    { name: 'dom', testMatch: /(g01|g02|g04|g05|g07|g12|g14|g15|g19|g20|g21)-.*\.spec\.ts/, dependencies: ['harvest'] },
    // (54B §2/§7) THE CALIBRATION PROBE (tooth 11) and THE MAGNIFIER TOOTH
    // (tooth 12) sit BEFORE the courts they license: G16 may not sit until
    // the binary instrument proved perfect separation on sealed pairs, and
    // G9 may not sit until the magnifier told a markless control from the
    // hero anchor. The ladder enforces the letter's order.
    { name: 'calibration', testMatch: /calibration\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g09-character', testMatch: /g09-character\.spec\.ts/, dependencies: ['calibration'] },
    { name: 'g10-environment', testMatch: /g10-environment\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g11-style', testMatch: /g11-style\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g16-captions', testMatch: /g16-captions\.spec\.ts/, dependencies: ['calibration'] },
    { name: 'g17-framing', testMatch: /g17-framing\.spec\.ts/, dependencies: ['harvest'] },
    { name: 'g18-storybook', testMatch: /g18-storybook\.spec\.ts/, dependencies: ['harvest'] },
    // (56C) THE HONEST FRAME — its teeth sit in calibration first (13-15),
    // so the project rides behind the calibration probe like G9 and G16.
    { name: 'g22-frame', testMatch: /g22-frame\.spec\.ts/, dependencies: ['calibration'] },
    // (Task 57) THE BATTLE CUT — the species court sits only after tooth 16
    // proves the instrument, so the project rides behind calibration too.
    { name: 'g23-battle', testMatch: /g23-battle\.spec\.ts/, dependencies: ['calibration'] },
    // (0.9.0) THE PROSE COURT — G24 reads the g05 pour witness (dom) and
    // the harvest's session records through the server's own courts; teeth
    // 10 and 19 (calibration) prove its instruments before it convenes.
    { name: 'g24-prose', testMatch: /g24-prose\.spec\.ts/, dependencies: ['calibration', 'dom'] },
    // G27 (Directive XIII): the two-hands court — sovereignty at the real
    // doors, and one direct round-trip through the live smith's own tool
    // schema, so a valid-but-rejected drift can never hide behind the
    // mock floor.
    { name: 'g27-forge', testMatch: /g27-forge\.spec\.ts/, dependencies: ['dom'] },
    { name: 'g28-book', testMatch: /g28-book\.spec\.ts/, dependencies: ['dom'] },
    // (0.10.0, Directive XII §VII.3) THE LIVE COURTS — the wonder clock
    // and the return law sit on the LIVE anthropic door. Each raises its
    // OWN keyed house on its own port (the rig's app server stays keyless
    // as ever) and puts it out when it rests; g26 rides behind g25 so two
    // keyed houses never stand at once.
    { name: 'g25-wonder', testMatch: /g25-wonder\.spec\.ts/, dependencies: ['dom'] },
    { name: 'g26-return', testMatch: /g26-return\.spec\.ts/, dependencies: ['g25-wonder'] },
    // (1.1.0, Directive XV §VI) THE COMMONS — the court raises its OWN
    // doorless house on its own ports (staging seam, real ledger, real
    // shelf) and puts it out when it rests; it rides behind g26 so its
    // house never stands beside a keyed one.
    { name: 'g29-commons', testMatch: /g29-commons\.spec\.ts/, dependencies: ['g26-return'] },
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
