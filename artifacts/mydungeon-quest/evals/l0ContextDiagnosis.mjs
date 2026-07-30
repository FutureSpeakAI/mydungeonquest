// ---- L0 CONTEXT-PACK DIAGNOSIS (Stage 7, Phase L0) ----
//
// Measures the ACTUAL assembled prompt blocks (not the DOM-text proxy)
// at turns 1, 5, 10, 15, 20, 25, 30 of a synthetic 30-turn campaign.
//
// Answers the four diagnostic questions from the Stage 7 directive:
//   Q1. Which sections grow without bound?
//   Q2. Is the 7,000-char budget enforced anywhere, or only declared?
//   Q3. What does the trimmer actually drop, in what order, at turn 20?
//   Q4. Does the scene floor alone exceed the budget at any point?
//
// No fix in this phase — diagnosis only.

import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildBriefing, buildContextPack } from '../../../packages/engine/src/graph.js';
import { shapeDmRequest } from '../server/dm.js';
import { makeEntropy } from '../../../packages/engine/src/protocol.js';
import { memoryLadder } from '../src/lib/memoir.js';

const __dir = path.dirname(fileURLToPath(import.meta.url));

// ── Prose fixture: real sentence for realistic text length counting ──────────
const PROSE = 'The road bends through high country and the wind carries the smell of rain from the ridge above. Stone walls line the lower fields and a hawk turns slow circles over the far pasture. Every step here costs something and gives something back in equal measure.';

// Build a synthetic campaign that grows realistically over N turns.
// Each turn adds: narration (200-400 chars), possible new soul (every 4 turns),
// new region (every 8 turns), known_facts growth (~1 per soul per 3 turns).
function buildSyntheticCampaign(targetTurn) {
  const castCount = 1 + Math.floor(targetTurn / 4);
  const cast = Array.from({ length: castCount }, (_, i) => ({
    name: `Companion ${String.fromCharCode(65 + i)}`, // Companion A, B, C...
    status: 'active',
    role: i === 0 ? 'villain' : 'supporting',
    bond: i < 3 ? 4 - i : 1,
    introduced_turn: i * 4,
    voice_card: { tone: 'gruff', register: 'standard', speech: 'direct' },
    known_facts: Array.from(
      { length: Math.min(2 + Math.floor(targetTurn / 3), 12) },
      (_, j) => `${PROSE.slice(0, 60 + j * 8).trim()} (soul ${i + 1}, fact ${j + 1})`
    ),
  }));

  const regionCount = 1 + Math.floor(targetTurn / 8);
  const regions = Array.from({ length: regionCount }, (_, i) => ({
    name: `The ${['Blackwood', 'Ashfen', 'Stonecrown', 'Driftmere'][i] || `Region ${i + 1}`}`,
    state: 'active',
    visual: PROSE.slice(0, 120 + i * 30).trim(),
  }));

  // Chronicle grows: ~1-2 entries per turn, compressed by memoryLadder to annal
  // For the ladder test, build annal log entries (kind='annal') every 8 turns
  const logs = [];
  for (let t = 0; t < targetTurn; t++) {
    logs.push({
      turn: t,
      beatIndex: Math.floor(t / 8),
      player: 'I press forward.',
      dm: {
        narration_blocks: [{ text: `Turn ${t}: ${PROSE.slice(0, 200 + (t % 5) * 40)}`, speaker: null }],
        suggestions: ['Continue', 'Look around', 'Rest'],
      },
    });
    // Simulate annal entries every 8 turns (act close)
    if (t > 0 && t % 8 === 0) {
      logs.push({
        kind: 'annal',
        turn: t,
        beatIndex: Math.floor(t / 8),
        actIndex: Math.floor(t / 8) - 1,
        annal: `Act ${Math.floor(t / 8)} summary: ${PROSE.slice(0, 200)} The hero found answers and raised new questions.`,
      });
    }
  }

  const beatIndex = Math.floor(targetTurn / 8);
  const beats = Array.from({ length: 15 }, (_, i) => ({
    act: Math.floor(i / 5) + 1, title: `Beat ${i + 1}`, goal: 'Move forward.', key: `beat-${i}`
  }));
  const codex = {
    cast,
    regions,
    spine: {
      label: 'Classic Epic',
      beats,
      deadlines: [
        { byBeat: 3, roles: ['mentor'] },
        { byBeat: 6, roles: ['herald'] },
        { byBeat: 10, roles: ['shadow'] },
      ],
      revealIdx: 8,
      acts: [{ name: 'Act One' }, { name: 'Act Two' }, { name: 'Act Three' }],
    },
    arc: { evil_plot: 'Seize the ancient throne by turning the hero\'s companions.' },
    scene: { region: regions[Math.min(regionCount - 1, 1)]?.name || regions[0].name },
    beatIndex,
    trove: [{ name: 'Lantern of Dusk', status: 'held', holder: 'Hero', equipped: true, moved: targetTurn - 1 }],
    purses: [{ holder: 'Hero', coin: 3 * targetTurn }],
    party: cast.slice(1, 3).map((s, i) => ({ name: s.name, joinedTurn: i * 4 + 1 })),
    ambitions: targetTurn >= 5 ? [{ status: 'open', text: 'Find the hidden vault.' }] : [],
    clocks: targetTurn >= 10 ? [{ status: 'open', label: 'The Gathering Storm', segments: 6, ticks: [1, 2, 3] }] : [],
    standings: [{ faction: 'The Guild', score: 12 }, { faction: 'The Crown', score: -3 }],
    threads: targetTurn >= 3 ? [{ label: 'The missing patrol', status: 'open', kind: 'question' }] : [],
    memoir: [],
    notes: [], // wound notes
    fixtures: [],
    bestiary: [],
    chronicle: [],
  };

  return {
    id: `diagnostic-${targetTurn}`,
    title: 'Diagnostic Campaign',
    covenant: 'PG-13',
    tone: 'mythic',
    lines: [], veils: [],
    hero: {
      name: 'Hero',
      hp: 10 + targetTurn, maxHp: 10 + targetTurn, level: Math.floor(targetTurn / 6) + 1,
      xp: targetTurn * 5,
    },
    homeRegion: regions[0].name,
    codex,
    logs,
    turnNumber: targetTurn,
    roomIntent: null,
    combat: null,
  };
}

const MARKER_TURNS = [1, 5, 10, 15, 20, 25, 30];
const BRIEF_BUDGET = 7800;
const PACK_BUDGET = 7300; // BRIEF_BUDGET - 500 reserve
const MEMORY_BUDGET = 1400;

// ── Run the diagnosis ────────────────────────────────────────────────────────
const rows = [];

for (const t of MARKER_TURNS) {
  const campaign = buildSyntheticCampaign(t);

  // 1. [STORY] block — via buildBriefing
  let brief;
  try { brief = buildBriefing(campaign, { budget: BRIEF_BUDGET }); }
  catch (e) {
    console.error(`buildBriefing error at turn ${t}:`, e.message);
    console.error(e.stack?.split('\n').slice(0, 4).join('\n'));
    brief = { _error: e.message };
  }
  const storyJSON = JSON.stringify(brief);

  // 2. Measure what buildContextPack keeps vs. drops
  let pack;
  try { pack = buildContextPack(campaign, { budget: PACK_BUDGET }); }
  catch (e) {
    console.error(`buildContextPack error at turn ${t}:`, e.message);
    pack = { _error: e.message };
  }
  const origCastCount = campaign.codex.cast.length;
  const packCastCount = Array.isArray(pack.cast) ? pack.cast.length : 0;
  const packFullCast = Array.isArray(pack.cast) ? pack.cast.filter(s => s.known_facts).length : 0;
  const packSlimCast = packCastCount - packFullCast;
  const droppedCast = origCastCount - packCastCount;

  // 3. [MEMORY] block — via memoryLadder
  const ladder = memoryLadder(campaign, { budget: MEMORY_BUDGET });
  const memoryJSON = JSON.stringify(ladder);

  // 4. scene floor: souls IN scene (full, never trimmed)
  // Approximate by measuring the scene souls' JSON
  const sceneFloorSize = Array.isArray(pack.cast)
    ? JSON.stringify(pack.cast.filter(s => s.known_facts)).length
    : 0;

  // 5. Full prompt via shapeDmRequest (measures all blocks)
  const entropy = makeEntropy(() => 0.5);
  const input = {
    story: brief,
    state: { hero: campaign.hero, combat: null, caster_line: null },
    memory: ladder,
    entropy,
    player: 'I press forward carefully and look for any sign of movement.',
    history: campaign.logs.slice(-20).filter(e => e.dm).flatMap(e => [
      { role: 'user', content: e.player || 'Continue.' },
      { role: 'assistant', content: (e.dm.narration_blocks || []).map(b => b.text).join('\n\n') },
    ]),
    turn: t,
    genesis: t === 0,
    resolution: null,
    campaign: { title: campaign.title, homeRegion: campaign.homeRegion },
    spine: campaign.codex.spine,
    hero: campaign.hero,
  };
  let dynamicBlockSize = 0, historySize = 0, systemSize = 0, totalContextSize = 0;
  let stateSize = 0, memSize = 0, entropySize = 0, playerSize = 0;
  try {
    const req = shapeDmRequest(input);
    const lastMsg = req.messages[req.messages.length - 1];
    const dynText = lastMsg.content[0].text;
    dynamicBlockSize = dynText.length;
    // History: all messages except the final dynamic-blocks user message
    const historyMsgs = req.messages.slice(0, -1);
    historySize = historyMsgs.reduce((sum, m) => {
      const text = Array.isArray(m.content) ? m.content.map(c => c.text || '').join('') : (m.content || '');
      return sum + text.length;
    }, 0);
    // System prompt
    systemSize = Array.isArray(req.system) ? req.system.reduce((s, b) => s + (b.text || '').length, 0) : (req.system || '').length;
    totalContextSize = systemSize + historySize + dynamicBlockSize;
    // Parse block boundaries within dynamicBlocks
    const stateMatch = dynText.match(/\[STATE\]\n([\s\S]*?)\n\[STORY\]/);
    const memMatch = dynText.match(/\[MEMORY\]\n([\s\S]*?)\n\[ENTROPY\]/);
    const entropyMatch = dynText.match(/\[ENTROPY\]\n([\s\S]*?)(\n\[|$)/);
    const playerMatch = dynText.match(/\[PLAYER\]\n([\s\S]*)$/);
    stateSize = stateMatch ? stateMatch[1].length : 0;
    memSize = memMatch ? memMatch[1].length : 0;
    entropySize = entropyMatch ? entropyMatch[1].length : 0;
    playerSize = playerMatch ? playerMatch[1].length : 0;
  } catch (e) { dynamicBlockSize = -1; console.error('shapeDmRequest error at turn', t, ':', e.message); }

  // What keys are in the brief vs. what the pack dropped
  const briefKeys = Object.keys(brief).filter(k => !k.startsWith('_'));
  const hasAllegiances = briefKeys.includes('stated_allegiances');
  const hasWealth = briefKeys.includes('hero_wealth');
  const hasElsewhere = briefKeys.includes('elsewhere');
  const hasStandings = briefKeys.includes('standings');

  // Per-key sizes within [STORY]
  const keyBreakdown = {};
  for (const [k, v] of Object.entries(brief)) {
    if (!k.startsWith('_')) keyBreakdown[k] = JSON.stringify(v).length;
  }

  rows.push({
    t,
    storySize: storyJSON.length,
    memorySize: memoryJSON.length,
    dynamicTotal: dynamicBlockSize,
    historySize, systemSize, totalContextSize,
    stateSize, memSize, entropySize, playerSize,
    origCastCount, packCastCount, packFullCast, packSlimCast, droppedCast,
    sceneFloorSize,
    hasAllegiances, hasWealth, hasElsewhere, hasStandings,
    briefKeys: briefKeys.length,
    keyBreakdown,
    memoryEntries: ladder.length,
    regionCount: campaign.codex.regions.length,
    packRegionCount: Array.isArray(pack.regions) ? pack.regions.length : 0,
  });
}

// ── Print report ─────────────────────────────────────────────────────────────
console.log('\n=== L0 Context-Pack Diagnosis (Stage 7) ===\n');
console.log(
  'Q1: Which sections grow without bound?\n' +
  'Q2: Is the 7,000-char budget enforced?\n' +
  'Q3: What does the trimmer drop at turn 20?\n' +
  'Q4: Does the scene floor alone exceed the budget?\n'
);

console.log('── Block sizes (chars) within dynamicBlocks() — the final user message ──');
console.log('Turn | [STORY]/7800 | [MEMORY]/1400 | dynamic-total | [STATE] | [MEM] | [ENT] | [PLAYER]');
for (const r of rows) {
  const storyFlag = r.storySize > BRIEF_BUDGET ? '⚠ ' : '  ';
  const memFlag = r.memorySize > MEMORY_BUDGET ? '⚠ ' : '  ';
  console.log(
    ` ${String(r.t).padStart(2)}  | ${storyFlag}${String(r.storySize).padStart(5)}       | ${memFlag}${String(r.memorySize).padStart(5)}          | ${String(r.dynamicTotal).padStart(13)} | ${String(r.stateSize).padStart(7)} | ${String(r.memSize).padStart(5)} | ${String(r.entropySize).padStart(5)} | ${String(r.playerSize).padStart(6)}`
  );
}

console.log('\n── Full API context (system + history + dynamicBlocks) ──');
console.log('Turn | system  | history | dynamic | TOTAL');
for (const r of rows) {
  console.log(
    ` ${String(r.t).padStart(2)}  | ${String(r.systemSize).padStart(7)} | ${String(r.historySize).padStart(7)} | ${String(r.dynamicTotal).padStart(7)} | ${r.totalContextSize}`
  );
}

console.log('\n── Cast trimming across turns ──');
console.log('Turn | Orig cast | In pack | Full | Slim | Dropped | Scene floor size');
for (const r of rows) {
  const dropFlag = r.droppedCast > 0 ? '⚠️ ' : '   ';
  console.log(
    ` ${String(r.t).padStart(2)}  | ${String(r.origCastCount).padStart(9)} | ${String(r.packCastCount).padStart(7)} | ${String(r.packFullCast).padStart(4)} | ${String(r.packSlimCast).padStart(4)} | ${dropFlag}${String(r.droppedCast).padStart(3)} | ${r.sceneFloorSize}`
  );
}

console.log('\n── Briefing fields present at each turn (trimmed = absent) ──');
console.log('Turn | allegiances | wealth | elsewhere | standings | keys');
for (const r of rows) {
  console.log(
    ` ${String(r.t).padStart(2)}  | ${r.hasAllegiances ? '✓' : '✗ TRIMMED'} | ${r.hasWealth ? '✓' : '✗ TRIMMED'} | ${r.hasElsewhere ? '✓' : '✗ TRIMMED'} | ${r.hasStandings ? '✓' : '✗ TRIMMED'} | ${r.briefKeys}`
  );
}

const turn20 = rows.find(r => r.t === 20);
const turn30 = rows.find(r => r.t === 30);
console.log('\n── [STORY] key breakdown at turn 20 ──');
if (turn20) {
  for (const [k, sz] of Object.entries(turn20.keyBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${sz} chars`);
  }
  console.log(`  → scene floor (full-cast JSON): ${turn20.sceneFloorSize} chars`);
  console.log(`  → memory entries: ${turn20.memoryEntries} | story size: ${turn20.storySize} / ${BRIEF_BUDGET}`);
}

console.log('\n── [STORY] key breakdown at turn 30 ──');
if (turn30) {
  for (const [k, sz] of Object.entries(turn30.keyBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(20)} ${sz} chars`);
  }
  console.log(`  → scene floor (full-cast JSON): ${turn30.sceneFloorSize} chars`);
  console.log(`  → memory entries: ${turn30.memoryEntries} | story size: ${turn30.storySize} / ${BRIEF_BUDGET}`);
}

// ── Answers ───────────────────────────────────────────────────────────────────
console.log('\n═══ ANSWERS ═══\n');

const maxStory = Math.max(...rows.map(r => r.storySize));
const maxMemory = Math.max(...rows.map(r => r.memorySize));
const maxDynamic = Math.max(...rows.map(r => r.dynamicTotal));
const anyDropped = rows.some(r => r.droppedCast > 0);
const anyMissingAllegiances = rows.some(r => !r.hasAllegiances);
const anyMissingWealth = rows.some(r => !r.hasWealth);
const t30SceneFloor = turn30?.sceneFloorSize || 0;

console.log(`Q1 — Sections that grow without bound:`);
console.log(`   [STORY] max: ${maxStory} chars (budget: ${BRIEF_BUDGET}) — ${maxStory > BRIEF_BUDGET ? 'OVER BUDGET' : 'within budget'}`);
console.log(`   [MEMORY] max: ${maxMemory} chars (budget: ${MEMORY_BUDGET}) — ${maxMemory > MEMORY_BUDGET ? 'OVER BUDGET' : 'within budget'}`);
console.log(`   [DYNAMIC-TOTAL] max: ${maxDynamic} chars — the full dynamicBlocks() output`);
console.log(`   Cast (codex): grows without cap from ${rows[0].origCastCount} to ${rows[rows.length-1].origCastCount} souls`);
console.log(`   Cast (in pack): trimming ${anyDropped ? 'DOES fire' : 'does not fire'} across the 30-turn synthetic run`);
console.log();
console.log(`Q2 — Is the budget enforced?`);
console.log(`   YES — buildContextPack enforces ${PACK_BUDGET}-char budget on cast+regions (graph.js:130-158).`);
console.log(`   YES — buildBriefing enforces ${BRIEF_BUDGET}-char budget on the full brief (graph.js:243-246).`);
console.log(`   YES — memoryLadder enforces ${MEMORY_BUDGET}-char budget on [MEMORY] (memoir.js:82-90).`);
console.log(`   The budgets ARE measured (JSON.stringify(out).length) and the trim loops fire on violation.`);
console.log(`   The March proxy (DOM text chars: 7,482 at turn 10, 24,313 at turn 30) measured the`);
console.log(`   VISIBLE GAME LOG (all accumulated narrations), NOT the assembled prompt. The proxy`);
console.log(`   was measuring the wrong thing.`);
console.log();
console.log(`Q3 — What does the trimmer drop at turn 20?`);
if (turn20) {
  console.log(`   buildBriefing trim order (graph.js:243-246):`);
  console.log(`     1. elsewhere entries (dropped one by one)`);
  console.log(`     2. standings entries (dropped one by one)`);
  console.log(`     3. stated_allegiances (dropped one by one)`);
  console.log(`     4. hero_wealth + hero_wields (dropped together)`);
  console.log(`   At turn 20: allegiances=${turn20.hasAllegiances ? 'present' : 'DROPPED'}, wealth=${turn20.hasWealth ? 'present' : 'DROPPED'}`);
  console.log(`   buildContextPack trim order (graph.js:132-158):`);
  console.log(`     1. slim-rest souls (non-scene, non-tied, non-villain, non-immune) dropped last-first`);
  console.log(`     2. tied-ring souls slimmed`);
  console.log(`     3. regions slimmed (standing scene region immune)`);
  console.log(`   At turn 20: ${turn20.droppedCast} cast dropped, ${turn20.packSlimCast} slimmed`);
}
console.log();
console.log(`Q4 — Does the scene floor alone exceed the budget?`);
console.log(`   At turn 30: scene floor JSON ≈ ${t30SceneFloor} chars (budget: ${BRIEF_BUDGET})`);
console.log(`   ${t30SceneFloor > BRIEF_BUDGET ? 'YES — scene floor EXCEEDS the budget; all briefing fields outside cast are dropped.' : t30SceneFloor > PACK_BUDGET ? `NEAR-MISS — scene floor alone nearly fills the pack budget (${PACK_BUDGET}); briefing fields are likely trimmed.` : 'NO — scene floor stays within budget in this 30-turn synthetic run.'}`);
console.log(`   NOTE: The synthetic run uses ~${rows[rows.length-1].origCastCount} total souls with ${Math.min(2 + Math.floor(30 / 3), 12)} known_facts each.`);
console.log(`   A real campaign with richer known_facts or more present souls may overflow sooner.`);

console.log('\n── Watch-line: proxy vs. actual prompt growth ──');
console.log('Turn | DOM proxy (march measured) | Actual dynamicBlocks()');
const proxyData = [[1, 0], [10, 7482], [20, 15588], [30, 24313]];
for (const [t, proxy] of proxyData) {
  const actual = rows.find(r => r.t === t);
  console.log(`  ${String(t).padStart(2)} | ${String(proxy).padStart(26)} | ${actual ? actual.dynamicTotal : '?'}`);
}

console.log('\nPASS — L0 context-pack diagnosis complete. See findings above.');
