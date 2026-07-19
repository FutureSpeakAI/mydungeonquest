import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { GAME_ROOT } from './lib/vision';

// G13 THE REGRESSION FLOOR — the whole existing eval keeps passing,
// keyless, at every iteration. (TASK 54 §1) The count is PINNED as a
// LITERAL in this law, not a baseline file a red run could rewrite.
// The reconciliation (LOOP_LOG.md, TASK 54): 65/66 was the donor cut's
// native trunk count; 101→102 was the changelog's cumulative
// "gates enrolled" prose ledger (a different basis, abandoned by 0.6.2);
// 91 is the MEASURED keyless PASS-line tail at Task 53's close — the
// only auditable basis — and Task 54's poison-sweep gate is the +1.
// 92 → 93 (TASK 54B §3): the warden-eye gate — the magnified look's
// byte-stable pipeline and its refusal/attestation notes — joins the
// keyless check in the same commit that changes the warden.
// 94 → 96 (Directive VI): the trove gate and the coin-purse gate join the
// keyless check in the same commit that seats the possessions law.
// 96 → 98 (Directive VII): the presence gate and the ground gate join the
// keyless check in the same commit that seats the scene law.
// (56B) 98 → 101: Task 56B adds three gates — party.test.mjs,
// fixture.test.mjs, watch.test.mjs (Directive VIII).
// (58B) 113 → 116: Directive XIII seats the two hands — the questions
// gate, the two-hands gate, and the smith gate join the keyless check
// in the same commit that rebuilds the forge around the field map.
// (58C) 116 → 119: Directive XIV seats the Open Book — the book gate, the
// chart gate, and the table gate join the keyless check in the same
// commit that turns the codex into six chapters.
// (60 §2) 124 → 125: THE DESK — the desk gate joins the keyless check in
// the same commit that seats the engine's pure verifier and re-speaks
// the table's seal door from that one seat.
// (61 §V) 125 → 128: Directive XV seats THE COMMONS — the mirror gate,
// the publish-rules gate, and the key-home gate join the keyless check
// in the same commit that opens the vault's staging seam and the public
// shelf.
const PINNED_PASS_COUNT = 128;

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
  expect(passCount, `the keyless check must print exactly the pinned ${PINNED_PASS_COUNT} PASS lines (Task 54 §1) — saw ${passCount}; a shrink is a lost gate, a growth is an unpinned gate; tail:\n${tail}`).toBe(PINNED_PASS_COUNT);

  // The baseline file remains as EVIDENCE of what this run measured —
  // the law above no longer reads it, so no red run can bend the floor.
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify({ passCount, pinned: PINNED_PASS_COUNT, recordedAt: new Date().toISOString() }, null, 2));

  // Keep the tail for the Section 7 report.
  fs.writeFileSync(path.join(GAME_ROOT, 'test-results', 'check-tail.txt'), tail);
});
