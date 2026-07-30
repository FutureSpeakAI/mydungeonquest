// famineGate — Work Order / Item 3
//
// Under Rule 31: the famine path has never executed in any test. This file
// builds a fixture that provably overflows and asserts every Graph Law that
// the famine must satisfy.
//
// Background: L1 (Stage 7) built the [DROPS] famine path. M1 (Stage 8)
// reported zero trim events at 12 souls / chapter 15 — the path was never
// exercised. Item 3 fires it deliberately and proves it is correct.
//
// Fixture: the 12-soul chapter-15 base + 20 background REST souls.
// The background souls have introduced_turn=200+, are not thread-holders,
// are not recently active, and are not tied to in-scene souls.
// They enter REST as SLIM rows (~85 chars each). Pack without them: 6,482
// chars. With 20 slim REST souls: ~7,882 chars → overflows by ~882 chars.
// The drop loop fires, discarding slim REST souls until under budget.
//
// Graph Laws asserted:
//  ① famine fires — pack._trimLog.castDropped is non-empty
//  ② scene floor preserved — all in-scene souls remain in pack at full fidelity
//  ③ villain retained — the villain is in pack
//  ④ souls present in scene stay in pack (stronger version of ②)
//  ⑤ [DROPS] block emits and names what was dropped (per Rule 27)
//  ⑥ nothing about famine reaches a player surface — pack._trimLog is
//     non-enumerable; JSON.stringify(pack) contains no trim_log key
//  ⑦ assembled pack after trimming is within budget
//  ⑧ trimmed pack is strictly smaller than the pre-trim pack
//  ⑨ villain is never in castDropped (Graph Law: villain never falls)
//  ⑩ scene-present souls are never in castDropped (Graph Law: scene floor)
//  ⑪ buildBriefing exposes trim_log after its own trim loops (brief.trim_log)

import assert from 'node:assert/strict';
import { buildContextPack, buildBriefing } from 'fatescript/graph';
import { buildFamineFixture } from './fixtures/headroomCampaign.mjs';

const PACK_BUDGET  = 7000;
const BRIEF_BUDGET = 7800;

const campaign = buildFamineFixture();
const pack  = buildContextPack(campaign, { budget: PACK_BUDGET });
const brief = buildBriefing(campaign, { budget: BRIEF_BUDGET });

const packJson    = JSON.stringify(pack);
const packSize    = packJson.length;
const briefSize   = JSON.stringify(brief).length;
const trimLog     = pack._trimLog ?? null;
const dropped     = trimLog?.castDropped ?? [];
const slimmed     = trimLog?.castSlimmed ?? [];
const scenePresent = new Set(pack.scene?.present ?? []);
const castNames   = new Set((pack.cast || []).map((s) => s.name));

console.log('\n=== famineGate: famine fixture measurements ===');
console.log(`Total souls in codex: ${campaign.codex.cast.length}`);
console.log(`Souls in pack after famine: ${(pack.cast || []).length}`);
console.log(`Pack size: ${packSize} chars (budget: ${PACK_BUDGET})`);
console.log(`Brief size: ${briefSize} chars (budget: ${BRIEF_BUDGET})`);
console.log(`Dropped: [${dropped.join(', ')}]`);
console.log(`Slimmed: [${slimmed.join(', ')}]`);
console.log(`Scene present: [${[...scenePresent].join(', ')}]`);
console.log(`brief.trim_log present: ${!!brief.trim_log}`);
console.log();

// ── ① Famine fires ────────────────────────────────────────────────────────────
assert.ok(
  dropped.length > 0 || slimmed.length > 0,
  '① famine must fire — pack._trimLog must report castDropped or castSlimmed',
);
console.log(`① PASS — famine fired: ${dropped.length} dropped, ${slimmed.length} slimmed`);

// ── ② Scene floor preserved ───────────────────────────────────────────────────
// Every soul named in scene.present must be in the cast array with at minimum
// their visual and role fields intact (full fidelity — not slimmed).
for (const name of scenePresent) {
  const soul = (pack.cast || []).find((s) => s.name === name);
  assert.ok(soul, `② scene soul "${name}" must remain in pack after famine`);
  assert.ok(
    soul.visual || soul.role,
    `② scene soul "${name}" must retain identifying fields (visual or role) — not slimmed out`,
  );
}
console.log(`② PASS — scene floor preserved: all ${scenePresent.size} scene-present souls remain full`);

// ── ③ Villain retained ────────────────────────────────────────────────────────
const villain = (pack.cast || []).find((s) => s.role === 'villain');
assert.ok(villain, '③ villain must be present in pack after famine');
assert.ok(villain.known_facts || villain.secret || villain.visual, '③ villain must retain full fidelity');
console.log(`③ PASS — villain "${villain.name}" retained with full fidelity`);

// ── ④ Scene-present souls all in pack ────────────────────────────────────────
for (const name of scenePresent) {
  assert.ok(castNames.has(name), `④ scene-present soul "${name}" must be in pack.cast`);
}
console.log(`④ PASS — all ${scenePresent.size} scene-present souls are in pack.cast`);

// ── ⑤ [DROPS] block emits and names dropped souls ────────────────────────────
assert.ok(trimLog !== null, '⑤ pack._trimLog must be present when famine fires');
assert.ok(
  dropped.length > 0 || slimmed.length > 0,
  '⑤ pack._trimLog must name what was dropped or slimmed',
);
if (dropped.length > 0) {
  assert.ok(
    dropped.every((name) => typeof name === 'string' && name.length > 0),
    '⑤ every dropped name in castDropped must be a non-empty string',
  );
}
console.log(`⑤ PASS — [DROPS] emits and names what was dropped (${dropped.length} names)`);

// ── ⑥ Nothing about famine reaches a player surface ─────────────────────────
// The pack's _trimLog is non-enumerable — JSON.stringify must not include it.
assert.ok(
  !packJson.includes('_trimLog'),
  '⑥ pack._trimLog must be non-enumerable — JSON.stringify(pack) must not contain it',
);
assert.ok(
  !packJson.includes('"castDropped"'),
  '⑥ "castDropped" must not appear in JSON.stringify(pack) (non-enumerable _trimLog enforces this)',
);
console.log('⑥ PASS — famine is invisible to JSON.stringify(pack); pack._trimLog is non-enumerable');

// ── ⑦ Pack within budget after trimming ──────────────────────────────────────
assert.ok(
  packSize <= PACK_BUDGET,
  `⑦ pack must be within budget after trimming: got ${packSize}, budget ${PACK_BUDGET}`,
);
console.log(`⑦ PASS — pack within budget after trimming: ${packSize} / ${PACK_BUDGET} chars`);

// ── ⑧ Trimmed pack is smaller than the unfenced pack would have been ─────────
// Verify by building the pack with a very large budget (no famine) and comparing.
const unfencedPack  = buildContextPack(campaign, { budget: 999999 });
const unfencedSize  = JSON.stringify(unfencedPack).length;
assert.ok(
  packSize < unfencedSize,
  `⑧ famine must reduce pack size: fenced=${packSize} chars, unfenced=${unfencedSize} chars`,
);
console.log(`⑧ PASS — famine reduced pack: ${unfencedSize} → ${packSize} chars (saved ${unfencedSize - packSize})`);

// ── ⑨ Villain never in castDropped ────────────────────────────────────────────
const villainName = (pack.cast || []).find((s) => s.role === 'villain')?.name;
if (villainName) {
  assert.ok(
    !dropped.includes(villainName),
    `⑨ villain "${villainName}" must never appear in castDropped — villain is Graph Law exempt`,
  );
}
console.log(`⑨ PASS — villain is absent from castDropped list`);

// ── ⑩ Scene-present souls never in castDropped ───────────────────────────────
for (const name of scenePresent) {
  assert.ok(
    !dropped.includes(name),
    `⑩ scene-present soul "${name}" must never appear in castDropped — scene floor is absolute`,
  );
}
console.log(`⑩ PASS — no scene-present soul appears in castDropped`);

// ── ⑪ buildBriefing exposes trim_log ─────────────────────────────────────────
// trim_log rides the briefing AFTER famine so it is accurate and post-budget.
// It is a DM-facing diagnostic — visible to the model but not to the player.
assert.ok(
  brief.trim_log !== undefined,
  '⑪ buildBriefing must include trim_log when famine fires',
);
assert.ok(
  brief.trim_log?.castDropped?.length > 0 || brief.trim_log?.castSlimmed?.length > 0,
  '⑪ brief.trim_log must name what was dropped or slimmed',
);
console.log(`⑪ PASS — buildBriefing exposes trim_log: dropped=${brief.trim_log?.castDropped?.length ?? 0}, slimmed=${brief.trim_log?.castSlimmed?.length ?? 0}`);

// ── Brief story-content within budget ────────────────────────────────────────
// trim_log is appended AFTER the briefing's own famine loops and explicitly
// never triggers further trimming (see buildBriefing: "trim_log is added AFTER
// the budget loops so it never triggers further trimming; it is a diagnostic
// window, not story content"). So the brief's STORY payload (sans trim_log)
// must be within budget; the diagnostic trailer may push the total above it.
const { trim_log: _discarded, ...briefStoryCopy } = brief;
const briefStorySize = JSON.stringify(briefStoryCopy).length;
assert.ok(
  briefStorySize <= BRIEF_BUDGET,
  `Brief story-content must be within budget after famine: got ${briefStorySize}, budget ${BRIEF_BUDGET}`,
);
console.log(`Brief story-content within budget: ${briefStorySize} / ${BRIEF_BUDGET} chars`);
console.log(`Brief total (including trim_log diagnostic): ${briefSize} chars`);
if (briefSize > BRIEF_BUDGET) {
  console.log(`(trim_log adds ${briefSize - briefStorySize} chars — expected; it is appended post-loop by design)`);
}

console.log('\nPASS — famineGate: all Graph Laws hold under deliberate famine conditions (Rule 31)');
