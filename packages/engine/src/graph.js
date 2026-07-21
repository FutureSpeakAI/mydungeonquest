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
import { standingsOf, storyBlock } from './story.js';
import { buildCards } from './cards.js';
import { calendarLine, calendarOf } from './calendar.js';
import { allegiancesOf } from './atlas.js';
import { presenceOf, elsewhereOf } from './presence.js';

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
  //    THE GROUND LINE (Directive VII.10b): the standing scene's region
  //    rides FULL regardless of the recent-text heuristic — the stage is
  //    never a rumor.
  const sceneRegion = canon(codex.scene?.region || '');
  const recentText = logs.slice(-recentTurns).flatMap((e) => (e.dm?.narration_blocks || []).map((b) => b.text || '')).join(' ').toLowerCase();
  let regionsOut = codex.regions.map((region, index) => {
    const touched = index === 0 || (sceneRegion && canon(region.name) === sceneRegion) || recentText.includes(canon(region.name));
    return touched ? region : { name: region.name, state: region.state };
  });

  const scenePresent = codex.cast.filter((soul) => inScene(soul)).map((soul) => soul.name);
  const sceneTies = [];
  for (const name of scenePresent) {
    for (const tie of cards[canon(name)]?.ties || []) {
      if (tie.type !== 'met') sceneTies.push(`${name} — ${tie.type} of ${tie.to} (${tie.why})`);
    }
  }

  // THE PARTY AND THE ELSEWHERE (Directive VIII.5): every soul's last
  // known ground rides the pack in full — computed once, trim-immune like
  // party_state and fixture_state (which ride inside the block): the
  // slim-trim loops below never touch the pack literal's own keys.
  const presenceState = presenceOf(campaign).map(({ name, ground }) => ({ name, ground }));
  const pack = () => ({ ...block, presence_state: presenceState, cast: castOut, regions: regionsOut, scene: { present: scenePresent, ties: sceneTies.slice(0, 12) } });

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
  // The standing scene's region joins the index-0 immunity: the budget's
  // slim-trim may never slim the ground the tale stands on (VII.10b).
  if (size() > budget) { regionsOut = regionsOut.map((region, i) => (i === 0 || (sceneRegion && canon(region.name) === sceneRegion) ? region : { name: region.name, state: region.state })); out = pack(); }
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
  // THE WEALTH LINE (Directive VI) — the hero's narrative-lane coin and up
  // to four notable holdings (most recently moved first), deterministic,
  // present even empty-handed. Trim order is law: it may never fall before
  // the allegiances; only after the last allegiance is gone may it fall,
  // and the floors above it never move.
  const heroName = canon(campaign.hero?.name);
  const purse = (campaign.codex?.purses || []).find((entry) => canon(entry.holder) === heroName);
  const holdings = (campaign.codex?.trove || [])
    .filter((item) => item.status === 'held' && canon(item.holder) === heroName)
    .sort((a, b) => (b.moved ?? -1) - (a.moved ?? -1))
    .slice(0, 4).map((item) => item.name);
  let wealth = `${campaign.hero?.name || 'The hero'} carries ${purse?.coin ?? 0} coin.${holdings.length ? ` Holds: ${holdings.join(', ')}.` : ''}`;
  // THE WIELDS LINE (Directive XII §III.4) — one line for the hero alone,
  // naming only things at the ready; ABSENT when nothing is equipped — an
  // honest omission, never an empty string. Famine order: it rides the
  // wealth line's tier — the pair falls together, only after the last
  // allegiance, and the floors above them never move.
  const ready = (campaign.codex?.trove || [])
    .filter((item) => item.status === 'held' && item.equipped && canon(item.holder) === heroName)
    .map((item) => item.name);
  let wields = ready.length ? `${campaign.hero?.name || 'The hero'} wields ${ready.join(' and ')}.` : null;
  // THE GROUND LINE (Directive VII.10) — the briefing names the ground by
  // law, not by heuristic: byte-exact, the briefing's SECOND key, right
  // after the calendar; ABSENT when no scene stands — an honest omission,
  // never an empty string. A scene naming a region the codex no longer
  // holds rides name-only. Famine order is unchanged and the ground is
  // above it: allegiances fall first, then the wealth line; scene_ground
  // and calendar never fall.
  const scene = campaign.codex?.scene || null;
  let ground = null;
  if (scene && scene.region) {
    const held = (campaign.codex?.regions || []).find((region) => canon(region.name) === canon(scene.region));
    ground = held ? `The scene stands in ${held.name} — ${held.visual}` : `The scene stands in ${scene.region}.`;
  }
  // THE PARTY AND THE ELSEWHERE (Directive VIII.5) — TRAVELING WITH YOU
  // rides in full and never trims: an empty roster is an honest sentence
  // (the hero walks alone), never an omission. THE ELSEWHERE names up to
  // six absent souls, most recently cited first, present only when the
  // record holds one. Famine order is law: the elsewhere falls first,
  // entry by entry, then the allegiances, then the wealth line — and the
  // calendar, the ground, and the roster never fall.
  const travelingWith = (campaign.codex?.party || []).map((member) =>
    Number.isInteger(member.joinedTurn) ? `${member.name} — joined turn ${member.joinedTurn}` : member.name);
  let elsewhere = elsewhereOf(campaign).slice(0, 6).map((entry) =>
    `${entry.name} — in ${entry.ground}${Number.isInteger(entry.sinceTurn) ? ` since turn ${entry.sinceTurn}` : ''}`);
  // THE REST LAW (XVIII, Article III): calendar_state carries the folded
  // day as MECHANICS — the door's once-per-day court reads it on both
  // benches. It rides after the ground (whose gate pins the second
  // seat, right behind the calendar) and never trims.
  // THE OPEN ROAD SEATS (XIX, Articles IV–VI) — fixed positions between
  // the elsewhere and the wealth line, cache-stable bytes. Open ambitions
  // ride as BARE texts (the resolve court matches verbatim — no citation
  // suffix to echo) and never fall: the player's own word is not famine's
  // to eat. The nearest-full clocks seat bounded to three (deterministic:
  // fewest segments left, then label); the strongest standings bounded to
  // four, each score the fold's own sum (standingsOf — no second
  // arithmetic). Famine grows by exactly ONE tier: the elsewhere falls
  // first, then the standings, then the stated allegiances, then the
  // wealth line — and every floor above them stands unmoved.
  const openAmbitions = (campaign.codex?.ambitions || [])
    .filter((row) => row && row.status === 'open' && typeof row.text === 'string' && row.text)
    .map((row) => row.text);
  const openClocks = (campaign.codex?.clocks || [])
    .filter((row) => row && row.status === 'open' && typeof row.label === 'string')
    .map((row) => ({ row, done: Array.isArray(row.ticks) ? row.ticks.length : 0 }))
    .sort((a, b) => (a.row.segments - a.done) - (b.row.segments - b.done) || String(a.row.label).localeCompare(String(b.row.label)))
    .slice(0, 3)
    .map(({ row, done }) => `${row.label} — ${done}/${row.segments}${done >= row.segments ? ' — FILLED: resolve this turn' : ''}${row.ambition ? ` (bound to: ${row.ambition})` : ''}`);
  let standings = standingsOf(campaign.codex || {}).slice(0, 4)
    .map((seat) => `${seat.faction} — ${seat.score > 0 ? '+' : ''}${seat.score}`);
  const brief = () => ({ calendar: calendarLine(campaign.logs || []), ...(ground ? { scene_ground: ground } : {}), calendar_state: { day: calendarOf(campaign.logs || []).day }, ...pack, traveling_with: travelingWith, ...(elsewhere.length ? { elsewhere } : {}), ...(openAmbitions.length ? { open_ambitions: openAmbitions } : {}), ...(openClocks.length ? { open_clocks: openClocks } : {}), ...(standings.length ? { standings } : {}), ...(wealth ? { hero_wealth: wealth } : {}), ...(wields ? { hero_wields: wields } : {}), stated_allegiances: allegiances });
  let out = brief();
  while (JSON.stringify(out).length > budget && elsewhere.length) { elsewhere = elsewhere.slice(0, -1); out = brief(); }
  while (JSON.stringify(out).length > budget && standings.length) { standings = standings.slice(0, -1); out = brief(); }
  while (JSON.stringify(out).length > budget && allegiances.length) { allegiances = allegiances.slice(0, -1); out = brief(); }
  if (JSON.stringify(out).length > budget && (wealth || wields)) { wealth = null; wields = null; out = brief(); }
  return out;
}
