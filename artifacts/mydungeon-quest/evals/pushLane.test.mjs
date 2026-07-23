// THE PUSH LANE GATE (Directive XX, Phase 0) — the Proving Ground rides
// every push: the workflow stands at the monorepo root, opens on both
// doors (push and pull_request), names both keyless suites by their own
// commands, and carries not one AI key — the chain is keyless by law.
// And the ledger holds its sentence: exactly one RITUAL COMPLETE 1.3.0
// line in the fixed grammar. Keyless, network-free, deterministic.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------
// I. THE LANE — the workflow file at the monorepo root.
// ---------------------------------------------------------------
const laneUrl = new URL('../../../.github/workflows/check.yml', import.meta.url);
let lane = '';
try {
  lane = readFileSync(laneUrl, 'utf8');
} catch {
  assert.fail('the push lane is missing — .github/workflows/check.yml must stand at the monorepo root');
}

// Both doors open the lane.
assert.ok(/^on:\s*$/m.test(lane), 'the lane declares its doors under `on:`');
assert.ok(/^\s{2}push:\s*$/m.test(lane), 'the lane opens on every push');
assert.ok(/^\s{2}pull_request:\s*$/m.test(lane), 'the lane opens on every pull_request');

// Both suites, named by their own commands.
assert.ok(lane.includes('pnpm --filter fatescript run check'), 'the engine suite is named by its own command');
assert.ok(lane.includes('npm run check'), 'the table suite is named by its own command');
assert.ok(lane.includes('working-directory: artifacts/mydungeon-quest'), 'the table suite runs inside the game house');

// Keyless by law — no AI key is set anywhere in the lane.
for (const key of ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'ELEVENLABS_API_KEY']) {
  assert.ok(!lane.includes(key), `the lane is keyless by law — ${key} may not appear in the workflow`);
}

// ---------------------------------------------------------------
// II. THE LEDGER — exactly one RITUAL COMPLETE 1.3.0 sentence.
// ---------------------------------------------------------------
const looplog = readFileSync(new URL('../LOOP_LOG.md', import.meta.url), 'utf8');
const ritual = looplog.match(/^RITUAL COMPLETE 1\.3\.0: [^\n]*$/gm) || [];
assert.equal(ritual.length, 1, `the ledger holds exactly one RITUAL COMPLETE 1.3.0 line (found ${ritual.length})`);
assert.ok(/greens .*; sitting .*; sentence /.test(ritual[0]),
  'the 1.3.0 sentence keeps the fixed grammar — "greens ...; sitting ...; sentence ..."');

console.log('PASS — the push lane: the Proving Ground rides every push and pull_request, both suites named, keyless by law; the ledger holds its one 1.3.0 sentence.');
