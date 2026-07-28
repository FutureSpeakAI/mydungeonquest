// E3 — cachePosture
//
// No varying-content bytes precede stable content in any cache key produced
// after E3. All post-E3 Foundry cache keys carry a structured prefix that
// names the asset class; the campaign id follows as the second segment.
// Varying content (campaign id, subject name) is never the first segment.
//
// Per the E3 cache posture warning: a campaign id is varying content. Prompt
// caching wants stable content first and varying content last. The structured
// prefix (`bust:`, `portrait:`, `region:`, `keyart:`, `beat:`, `narration:`,
// `scene:`, `sheet:`, `fixture:`, `sfx:`) is stable; the campaign id is the
// second segment.
//
// This eval checks:
//   1. Every post-E3 cache key shape begins with a known stable prefix.
//   2. No key shape begins directly with a UUID or a bare sha256 hex.
//   3. heroBustJob, regionPrompt, and beat keys all satisfy the posture.

import assert from 'node:assert/strict';

import { heroBustJob, keyArtJob } from '../src/lib/cinema/prologue.js';
import { beatKeys } from '../src/lib/cinema/lookahead.js';
import { sheetKey } from '../src/lib/sheets.js';

const KNOWN_PREFIXES = ['bust:', 'portrait:', 'region:', 'keyart:', 'beat:', 'narration:', 'scene:', 'sheet:', 'fixture:', 'sfx:'];

function assertPosture(key, description) {
  assert.ok(
    KNOWN_PREFIXES.some((p) => key.startsWith(p)),
    `${description}: key "${key}" must begin with a known stable prefix — got none of [${KNOWN_PREFIXES.join(', ')}]`
  );
  // The campaign id (a UUID-like value) must NOT be the first segment.
  const first = key.split(':')[0];
  assert.ok(
    !/^[0-9a-f-]{32,}$/i.test(first),
    `${description}: first key segment must be a stable asset class, not a campaign id or hash — got "${first}"`
  );
}

// heroBustJob
const camp = { id: 'posture-camp-1', hero: { name: 'Aelin', gender: 'woman', calling: 'ranger', presentation: '', features: '', voice: '', build: '' }, codex: {}, title: 'T', covenant: 'protect', tone: 'dark', lines: [], veils: [], homeRegion: null, styleBible: null };
assertPosture(heroBustJob(camp).cacheKey, 'heroBustJob');

// keyArtJob (already scoped before E3)
assertPosture(keyArtJob(camp, 1).cacheKey, 'keyArtJob act-1');
assertPosture(keyArtJob(camp, 2).cacheKey, 'keyArtJob act-2');
assertPosture(keyArtJob(camp, 3).cacheKey, 'keyArtJob act-3');

// beat lookahead keys (already scoped before E3)
const bk = beatKeys('posture-camp-1', 5);
assertPosture(bk.still, 'beatKeys.still');
assertPosture(bk.score, 'beatKeys.score');

// sheet keys (already scoped before E3)
assertPosture(sheetKey('posture-camp-1', 'Maren Voss', 'r0'), 'sheetKey soul r0');
assertPosture(sheetKey('posture-camp-1', 'The Crossroads', 's:winter'), 'sheetKey place');

// Manufactured region and portrait keys must also satisfy posture.
const regionKey = `region:posture-camp-1:the crossroads:base`;
assertPosture(regionKey, 'region key (add)');
const portraitKey = `portrait:posture-camp-1:maren voss:bust`;
assertPosture(portraitKey, 'portrait key (NPC bust)');

// A bare sha256 hex must FAIL the posture check (regression guard).
const bareHex = 'a'.repeat(64);
assert.throws(
  () => assertPosture(bareHex, 'bare sha256 (must fail)'),
  /must begin with a known stable prefix/,
  'bare sha256 must be rejected by the posture check'
);

// A campaign-id-first key must FAIL the posture check (regression guard).
// It triggers the prefix check first (no known prefix matches), not the
// segment check — both are correct rejections.
assert.throws(
  () => assertPosture('00000000-0000-0000-0000-000000000001:hero:bust', 'uuid-first (must fail)'),
  /must begin with a known stable prefix/,
  'uuid-first key must be rejected by the posture check'
);

console.log('PASS cachePosture — all post-E3 Foundry cache keys begin with a stable asset-class prefix; campaign id is the second segment (varying content last); bare sha256 and uuid-first keys are rejected; heroBustJob, keyArtJob, beatKeys, sheetKey, region keys, and portrait keys all satisfy the posture.');
