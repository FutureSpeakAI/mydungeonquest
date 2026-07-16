// ------------------------------------------------------------
// THE CHRONICLEGRAPH — GraphRAG's query shape, rebuilt as law.
//
// We do not extract a graph from prose; the graph IS the validated record,
// reduced by cards.js. This module is the LOCAL QUERY: assemble the [STORY]
// block for a turn from the entities that matter to the scene — souls
// present, their one-hop ties, the villain, the standing world — under a
// hard byte budget, so hundred-turn tales stay coherent without growing
// the prompt. Deterministic in its inputs; the pack keeps storyBlock's
// exact contract keys and only ADDS a compact `scene` note.
// ------------------------------------------------------------
import { storyBlock } from './story.js';
import { buildCards } from './cards.js';
import { calendarLine } from './calendar.js';
import { allegiancesOf } from './atlas.js';

const canon = (name) => String(name || '').trim().toLowerCase();
const SLIM = (soul) => ({ name: soul.name, role: soul.role, status: soul.status, bond: soul.bond, last_seen: soul.last_seen });

export function buildContextPack(campaign, { budget = 7000, recentTurns = 6 } = {}) {
  const codex = campaign.codex;
  const block = storyBlock(codex);
  const logs = (campaign.logs || []).filter((entry) => !entry.redacted);
  const { cards } = buildCards({ hero: campaign.hero, entries: logs });

  // 1. Who is IN the scene: spoke recently, or was moved recently by ops.
  let lastTurn = -1;
  for (const entry of logs) lastTurn = Number.isInteger(entry.turn) ? entry.turn : lastTurn + 1;
  lastTurn = Math.max(0, lastTurn);
  const horizon = lastTurn - recentTurns;
  const scene = new Set();
  for (const entry of logs.slice(-recentTurns)) {
    for (const b of entry.dm?.narration_blocks || []) if (b?.speaker) scene.add(canon(b.speaker).split(/\s+/)[0]);
  }
  const inScene = (soul) => {
    const key = canon(soul.name);
    const card = cards[key];
    if (scene.has(key) || scene.has(key.split(/\s+/)[0])) return true;
    // Presence by OPS means spoke or was moved — an introduction alone does
    // not seat a soul at the table, or early tales could never trim.
    return Boolean(card && card.state.lastActive !== null && card.state.lastActive >= horizon);
  };

  // 2. One hop out along ties that carry story weight.
  const tied = new Set();
  for (const soul of codex.cast) {
    if (!inScene(soul)) continue;
    const card = cards[canon(soul.name)];
    for (const tie of card?.ties || []) {
      if (tie.type === 'kin' || tie.type === 'enemy' || tie.type === 'ally') tied.add(canon(tie.to));
      if (tie.type === 'met' && /([3-9]|\d\d)/.test(tie.why)) tied.add(canon(tie.to));
    }
  }

  // 3. Priority: scene (full) → tied (full) → villain (full) → the rest (slim,
  //    dropped first under budget). The scene floor is never trimmed.
  const fullSet = new Set();
  const rest = [];
  for (const soul of codex.cast) {
    const key = canon(soul.name);
    if (inScene(soul) || soul.role === 'villain') fullSet.add(key);
    else if (tied.has(key)) fullSet.add(key);
    else rest.push(soul);
  }
  let castOut = [
    ...codex.cast.filter((soul) => fullSet.has(canon(soul.name))),
    ...rest.map(SLIM)
  ];

  // 4. Regions: the recently-touched region rides full; the others slim.
  const recentText = logs.slice(-recentTurns).flatMap((e) => (e.dm?.narration_blocks || []).map((b) => b.text || '')).join(' ').toLowerCase();
  let regionsOut = codex.regions.map((region, index) => {
    const touched = index === 0 || recentText.includes(canon(region.name));
    return touched ? region : { name: region.name, state: region.state };
  });

  const scenePresent = codex.cast.filter((soul) => inScene(soul)).map((soul) => soul.name);
  const sceneTies = [];
  for (const name of scenePresent) {
    for (const tie of cards[canon(name)]?.ties || []) {
      if (tie.type !== 'met') sceneTies.push(`${name} — ${tie.type} of ${tie.to} (${tie.why})`);
    }
  }

  const pack = () => ({ ...block, cast: castOut, regions: regionsOut, scene: { present: scenePresent, ties: sceneTies.slice(0, 12) } });

  // 5. The budget, enforced: drop slim rest first, then slim the tied ring,
  //    then slim regions. The scene floor stands even if it alone overflows.
  let out = pack();
  const size = () => JSON.stringify(out).length;
  while (size() > budget && castOut.some((soul) => !soul.visual && !fullSet.has(canon(soul.name)))) {
    castOut = castOut.slice(0, castOut.length - 1); out = pack();
  }
  if (size() > budget) {
    castOut = castOut.map((soul) => (inScene(soul) || soul.role === 'villain' ? soul : (soul.visual ? SLIM(soul) : soul))); out = pack();
  }
  if (size() > budget) { regionsOut = regionsOut.map((region, i) => (i === 0 ? region : { name: region.name, state: region.state })); out = pack(); }
  return out;
}

// THE BRIEFING LAW (Directive V) — the one deterministic object the DM is
// told each turn, in fixed order: the calendar line first, then the packed
// scene-first story (threads ride inside the block), then stated
// allegiances. Trimming order is fixed: allegiances drop first; the
// calendar, the scene floor, the villain, and the open threads never do.
export function buildBriefing(campaign, { budget = 7800, recentTurns = 6 } = {}) {
  const pack = buildContextPack(campaign, { budget: Math.max(2000, budget - 500), recentTurns });
  let allegiances = allegiancesOf(campaign.codex?.cast || []).slice(0, 6)
    .map((edge) => `${edge.name} — sworn of ${edge.of} (stated)`);
  const brief = () => ({ calendar: calendarLine(campaign.logs || []), ...pack, stated_allegiances: allegiances });
  let out = brief();
  while (JSON.stringify(out).length > budget && allegiances.length) { allegiances = allegiances.slice(0, -1); out = brief(); }
  return out;
}
