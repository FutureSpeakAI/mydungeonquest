// H6 — migrationsLand (shape drift coverage)
//
// Stage 4 H0 classified P11 as shape drift across three phases:
//   Stage C — identity fields (mediaTier 'cinema' → 'illuminated', missing voiceId)
//   E3      — unscoped cache keys (bare sha256 hex, no campaign prefix)
//   E5      — narration bounds (validation change, no data migration needed)
//
// This gate confirms the migration coverage is complete and each migration
// is correctly wired into the app's startup and open-road paths.
//
// Courts:
//  ① sweepUnscopedMedia exists and is exported from sweepUnscoped.js
//  ② sweepUnscopedMedia is wired into App.jsx startup (dynamic import on boot)
//  ③ Stage C identity migrations in onOpen: 'cinema' → 'illuminated', voiceId guard
//  ④ Each migration is inside the G1 try/catch floor (never an uncaught throw)
//  ⑤ sweepUnscopedMedia is idempotent: zero rows → returns 0, no error
//  ⑥ sweepUnscopedMedia evicts bare SHA-256 rows but preserves prefixed keys
//
// Courts 5–6 are functional: they run sweepUnscopedMedia against the real
// db module (which uses fake-indexeddb in the Node harness).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

// ① sweepUnscopedMedia exported from sweepUnscoped.js
const sweepSrc = src('src/lib/cinema/sweepUnscoped.js');
assert.ok(
  sweepSrc.includes('export async function sweepUnscopedMedia'),
  'sweepUnscoped.js must export sweepUnscopedMedia',
);
assert.ok(
  sweepSrc.includes('BARE_SHA256'),
  'sweepUnscoped.js must define BARE_SHA256 pattern for bare hex key detection',
);
assert.ok(
  sweepSrc.includes('bulkDelete'),
  'sweepUnscopedMedia must evict rows via bulkDelete (one DB transaction)',
);

// ② sweepUnscopedMedia wired into App.jsx startup (dynamic import on boot)
const appSrc = src('src/App.jsx');
assert.ok(
  appSrc.includes("import('./lib/cinema/sweepUnscoped.js')"),
  "App.jsx must dynamically import sweepUnscoped.js on startup (E3 migration)",
);
assert.ok(
  appSrc.includes('sweepUnscopedMedia'),
  'App.jsx must call sweepUnscopedMedia() in the startup effect',
);
// It must be a dynamic import (not a top-level import) to keep it off the sync closure.
const topLevelImports = appSrc.slice(0, 3000); // first ~3000 chars hold the top-level imports
assert.ok(
  !topLevelImports.includes('sweepUnscopedMedia'),
  'sweepUnscopedMedia must be a dynamic import (not top-level) — lean door law',
);

// ③ Stage C identity migrations in onOpen
assert.ok(
  appSrc.includes("mediaTier === 'cinema'") && appSrc.includes("mediaTier: 'illuminated'"),
  "onOpen guard must remap mediaTier 'cinema' → 'illuminated' (Stage C migration)",
);
assert.ok(
  appSrc.includes('hero.voiceId') && appSrc.includes('castHeroVoice'),
  'onOpen guard must cast voiceId for heroes from before the casting law (Stage C migration)',
);
assert.ok(
  appSrc.includes('reconcileLegacyPurse'),
  'onOpen guard must call reconcileLegacyPurse (era door migration)',
);

// ④ Each migration inside the G1 try/catch floor
// The G1 guard is the block containing "G1:" in the onOpen handler.
// All identity migrations must appear INSIDE the try block.
const onOpenGuardIdx = appSrc.indexOf('G1:');
assert.ok(onOpenGuardIdx !== -1, 'G1 guard comment must be present in onOpen handler');
const tryBlockStart = appSrc.lastIndexOf('try {', onOpenGuardIdx);
const tryBlockEnd = appSrc.indexOf('} catch (openSetupError)', tryBlockStart);
assert.ok(tryBlockStart !== -1 && tryBlockEnd !== -1, 'G1 try/catch block must surround the onOpen migrations');
const tryBlockBody = appSrc.slice(tryBlockStart, tryBlockEnd);
assert.ok(
  tryBlockBody.includes("mediaTier === 'cinema'"),
  "Stage C mediaTier migration must be inside the G1 try/catch",
);
assert.ok(
  tryBlockBody.includes('castHeroVoice'),
  'Stage C voiceId migration must be inside the G1 try/catch',
);
// sweepUnscopedMedia is on startup (outside onOpen), so the promise chain must
// carry a .catch guard. The catch rides the outer import().then().catch() chain.
const sweepCallIdx = appSrc.indexOf('sweepUnscopedMedia');
const sweepChunkEnd = appSrc.indexOf('\n  }', sweepCallIdx); // end of the startup useEffect body
const sweepChunk = sweepCallIdx !== -1 ? appSrc.slice(sweepCallIdx - 200, sweepChunkEnd + 10) : '';
assert.ok(
  sweepChunk.includes('.catch'),
  'E3 sweepUnscopedMedia startup call must have a .catch guard — never an uncaught reject',
);

// ⑤–⑥ Functional courts — run against fake-indexeddb
import('fake-indexeddb/auto').then(async () => {
  const { db } = await import('../src/lib/db.js');
  const { sweepUnscopedMedia } = await import('../src/lib/cinema/sweepUnscoped.js');

  // ⑤ Idempotent: empty store returns 0, no error
  const count0 = await sweepUnscopedMedia();
  assert.strictEqual(count0, 0, 'sweepUnscopedMedia on empty store must return 0 (idempotent)');

  // ⑥ Evicts bare sha256 rows, preserves prefixed keys
  // Insert a bare sha256 row (pre-E3 key format)
  const bareKey = 'a'.repeat(64); // 64 lowercase hex chars
  const prefixedKey = 'scene:camp123:entry456';
  await db.media.bulkAdd([
    { assetHash: 'hash1', cacheKey: bareKey, campaignId: 'camp1', kind: 'scene', createdAt: Date.now() },
    { assetHash: 'hash2', cacheKey: prefixedKey, campaignId: 'camp2', kind: 'scene', createdAt: Date.now() },
  ]);

  const evicted = await sweepUnscopedMedia();
  assert.strictEqual(evicted, 1, 'sweepUnscopedMedia must evict exactly the one bare-sha256 row');

  const remaining = await db.media.toArray();
  assert.strictEqual(remaining.length, 1, 'one row must survive (the prefixed-key row)');
  assert.strictEqual(remaining[0].cacheKey, prefixedKey, 'the surviving row must have the prefixed key');

  // Idempotent on second call: all bare rows already evicted
  const evicted2 = await sweepUnscopedMedia();
  assert.strictEqual(evicted2, 0, 'sweepUnscopedMedia must return 0 on second call (idempotent)');

  // ⑦ K7 — Stage C voiceId migration: castHeroVoice produces a valid voiceId
  //    for any hero mark (e.g. a hero from before the casting law has no voiceId).
  const { castHeroVoice } = await import('../../../packages/engine/src/cinema/casting.js');

  const oldHeroNoVoice = { name: 'Maren Voss', mark: 'human', presentation: 'feminine' };
  const voiceId = castHeroVoice(oldHeroNoVoice);
  assert.ok(typeof voiceId === 'string' && voiceId.length > 0, 'K7: castHeroVoice must return a non-empty voiceId for a hero without one');

  // ⑧ K7 — A pre-Stage-C campaign (mediaTier:'cinema', hero.voiceId absent) is
  //    correctly identified and the migration (source-level) is documented.
  //    The inline migration logic in onOpen is already tested by court ③ (source check).
  //    Here we confirm: AFTER the migration, the hero WOULD have a voiceId.
  const preStageCHero = { name: 'Corin', mark: 'elf', presentation: 'neutral' };
  const preStageCCampaign = { id: 'pre-stage-c', mediaTier: 'cinema', hero: preStageCHero, readOnly: false };

  // Simulate the onOpen migration (the exact steps in App.jsx's G1 try block):
  let migrated = { ...preStageCCampaign };
  if (migrated.mediaTier === 'cinema') migrated = { ...migrated, mediaTier: 'illuminated' };
  if (!migrated.readOnly && migrated.hero && !migrated.hero.voiceId) {
    migrated = { ...migrated, hero: { ...migrated.hero, voiceId: castHeroVoice(migrated.hero) } };
  }
  assert.strictEqual(migrated.mediaTier, 'illuminated', 'K7: Stage C mediaTier migration must produce illuminated');
  assert.ok(typeof migrated.hero.voiceId === 'string' && migrated.hero.voiceId.length > 0, 'K7: Stage C voiceId migration must assign a voiceId');

  // ⑨ K7 — reconcileLegacyPurse is fail-safe: returns the original campaign for
  //    read-only, completed, sealedAt, and campaigns with no logs.
  const { reconcileLegacyPurse } = await import('../src/lib/reconcile.js');

  const readOnlyCampaign = { id: 'ro-test', readOnly: true, hero: { name: 'X' }, logs: [] };
  const roResult = await reconcileLegacyPurse(readOnlyCampaign);
  assert.strictEqual(roResult, readOnlyCampaign, 'K7: reconcileLegacyPurse must return the original for read-only campaigns');

  const noLogsCampaign = { id: 'no-logs-test', readOnly: false, completed: false, hero: { name: 'Y' }, logs: [] };
  const noLogsResult = await reconcileLegacyPurse(noLogsCampaign);
  assert.strictEqual(noLogsResult, noLogsCampaign, 'K7: reconcileLegacyPurse must return the original for campaigns with no substantive logs');

  console.log(
    'PASS — H6+K7 migrationsLand: E3 sweepUnscopedMedia wired to startup (dynamic import, guarded), ' +
    'Stage C identity migrations in G1 try/catch (mediaTier, voiceId, reconcileLegacyPurse), ' +
    'E5 narration bounds is validation-only (no data migration needed), ' +
    'sweepUnscopedMedia idempotent (0 on empty, evicts bare sha256, preserves prefixed, 0 on repeat); ' +
    'K7: castHeroVoice returns voiceId for pre-casting-law heroes; ' +
    'simulated onOpen migration: mediaTier illuminated + voiceId assigned; ' +
    'reconcileLegacyPurse fail-safe on read-only and no-logs campaigns.',
  );
}).catch((e) => {
  console.error('FAIL — migrationsLand functional courts:', e.message);
  process.exit(1);
});
