// ------------------------------------------------------------
// THE THREE REFERENCE TALES (Directive XII §V.4) — played to seal.
//
// One tale each on redemption-road, long-voyage, and crown-intrigue,
// played on the sovereign mock tier exactly as the table plays:
//   - the hero is DEALT through the Two Hands door's own mock smith
//     (candidate 0 of a pinned seed — chance's hand, no author's pen);
//   - every turn crosses the ONE validating door (server/dm.js
//     judgeTurn — the validator court plus the census, the same bench
//     the live room sits), and a red verdict is a hard stop;
//   - every fold is the App funnel's own, in the funnel's own order:
//     story → chronicle → state → milestone → combat → deed → seal;
//   - every record is chain-sealed through src/lib/seal.js appendEvent
//     on a real Dexie (fake-indexeddb), resolutions and ticks and all,
//     and the tale closes with the legacy packet and the sealing wax.
//
// The mock DM's depth walk (turns ≥ 18, §V.3) puts every demanded law
// on the record: a possession moving hands (item_transfer, turn 24); a
// join then a leave with remains_at (18 → 36); a battle carrying a
// sheeted companion's die and a fall addressed in its turn (30–32); a
// thread sworn and answered (18 → 36); an equipped thing (21); purse
// movements both directions (+12 at genesis, −3 at 21).
//
// ONE EXPORT, TWO SHIPMENTS: the exportChronicle bytes are written
// verbatim to tests/e2e/fixtures/tales/ (the courts' copy) and to
// public/demo-tales/ (the DEMO SHELF's copy), plus a shelf manifest.
// The forge itself refuses to ship a tale whose chain will not verify
// or whose record does not carry all six laws — fail closed, always.
// ------------------------------------------------------------
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mockSmith } from 'fatescript/smith';
import { mockDmTurn } from 'fatescript/mockDm';
import { makeEntropy } from 'fatescript/protocol';
import { applyPartyMilestone, applyStoryUpdates, initCodex, storyBlock } from 'fatescript/story';
import { applyMilestone, applyStateUpdates, companionRoll, createHero, heroRoll, milestoneLevel } from 'fatescript/rules';
import { castHeroVoice } from 'fatescript/cinema/casting';
import { tickLogEntry, tickUpdates } from 'fatescript/livingWorld';

import { judgeTurn } from '../../../server/dm.js';
import { applyCombat } from '../../../src/lib/combat.js';
import { db, saveCampaign } from '../../../src/lib/db.js';
import { appendEvent, exportChronicle, verifyJournal } from '../../../src/lib/seal.js';
import { rememberScene } from '../../../src/lib/memory.js';
import { sealLegacy } from '../../../src/lib/saga.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const COURT_DIR = path.join(root, 'tests/e2e/fixtures/tales');
const SHELF_DIR = path.join(root, 'public/demo-tales');

// Chance with a pinned face: the same seed deals the same tale forever.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TALES = [
  {
    spineId: 'redemption-road', seed: 59101,
    lines: ['I press on toward the teacher I lost.', 'I ask the road what it remembers of him.', 'I keep my promise moving and my guard soft.']
  },
  {
    spineId: 'long-voyage', seed: 59102,
    lines: ['I hold our heading against the salt wind.', 'I read the water for the sovereign\u2019s mood.', 'I walk the deck and count my crew\u2019s courage.']
  },
  {
    spineId: 'crown-intrigue', seed: 59104,
    lines: ['I listen at the edges of the court\u2019s smile.', 'I trace whose hand signed the newest paper.', 'I keep my own name quiet and my eyes open.']
  }
];
const TURNS = 37; // 0..36 — the depth walk's last op (the leave) lands at 36.

async function playTale({ spineId, seed, lines }) {
  // —— The deal: the Two Hands door's own mock smith, candidate 0. ——
  const world = mockSmith({ scope: 'world', locked: {}, seed }).candidates[0];
  const dealt = mockSmith({ scope: 'hero', locked: {}, seed }).candidates[0];
  const hero = {
    ...createHero(dealt),
    bearing: (dealt.bearing || '').slice(0, 200),
    presentation: ['feminine', 'masculine', 'neutral'].includes(dealt.presentation) ? dealt.presentation : null,
    pronouns: (dealt.pronouns || '').slice(0, 30) || null,
    mark: (dealt.mark || '').slice(0, 80) || null,
    keepsake: (dealt.keepsake || '').slice(0, 60) || null
  };
  hero.voiceId = castHeroVoice(hero);

  const id = crypto.randomUUID();
  let codex = initCodex(spineId, hero.keepsake ? { keepsake: { name: hero.keepsake, holder: hero.name } } : {});
  const campaign = {
    id, title: world.title, covenant: world.covenant, tone: world.tone,
    lines: ['graphic harm'], veils: ['sexual content'], styleBible: world.styleBible, homeRegion: world.homeRegion,
    spineId, hero, codex, logs: [], combat: null, pendingRoll: null,
    turnNumber: 0, turnCount: 0, headHash: null, signatureStatus: 'pending', completed: false, readOnly: false,
    keyArtHash: null, heroBustHash: null, mediaTier: 'illuminated', spend: { images: 0, music: 0 },
    createdAt: Date.now(), updatedAt: Date.now()
  };
  await saveCampaign(campaign);

  const rng = mulberry32(seed ^ 0x51DE);
  let heroNow = hero;
  let combat = null;
  let logs = [];
  let turnNumber = 0;
  let pendingRoll = null;
  let resolution = null;
  let resolveLabel = null;

  for (let turn = 0; turn < TURNS; turn += 1) {
    // —— The die falls before the next page, exactly as the table rolls. ——
    if (pendingRoll) {
      const ownerKey = (value) => String(value ?? '').trim().toLowerCase();
      const sheetRow = pendingRoll.actor_id && ownerKey(pendingRoll.actor_id) !== 'hero'
        ? (codex.party || []).find((member) => member?.sheet && ownerKey(member.name) === ownerKey(pendingRoll.actor_id))
        : null;
      const result = sheetRow ? companionRoll(sheetRow.name, sheetRow.sheet, pendingRoll, rng) : heroRoll(heroNow, pendingRoll, rng);
      await appendEvent(id, 'resolution', result);
      logs = logs.map((log, index) => index === logs.length - 1 ? { ...log, resolution: result } : log);
      resolution = result;
      resolveLabel = pendingRoll.label;
      pendingRoll = null;
    }

    const player = turn === 0 ? 'Begin the chronicle.' : resolution ? `Resolve ${resolveLabel}.` : lines[Math.floor(turn / 3) % lines.length];
    const visiblePlayer = turn === 0 || resolution ? null : player;
    const story = storyBlock(codex);
    const entropy = makeEntropy(rng);
    const dm = mockDmTurn({ campaign: { ...campaign, codex }, hero: heroNow, story, player, entropy, resolution, turn });

    // —— THE ONE VALIDATING DOOR — the bench the live room sits. ——
    const verdict = judgeTurn(dm, { story, hero: heroNow, entropy, state: { combat } });
    if (!verdict.ok) throw new Error(`${spineId} turn ${turn} refused at the door: ${verdict.errors.join('; ')}`);

    // —— The App funnel's folds, in the funnel's own order. ——
    const actBefore = codex.spine.beats[codex.beatIndex]?.act || 1;
    const partyBefore = (codex.party || []).map((member) => member?.name).filter((name) => typeof name === 'string');
    let nextCodex = applyStoryUpdates(codex, dm.story, { turn: turnNumber, heroName: heroNow.name, heroLevel: heroNow.level });
    if (dm.state_updates?.chronicle_add) nextCodex = { ...nextCodex, chronicle: [...nextCodex.chronicle, String(dm.state_updates.chronicle_add).slice(0, 260)] };
    let nextHero = applyStateUpdates(heroNow, dm.state_updates);
    const milestone = milestoneLevel(nextCodex.spine, nextCodex.beatIndex);
    if (milestone > nextHero.level) {
      nextHero = applyMilestone(nextHero, milestone);
      nextCodex = applyPartyMilestone(nextCodex, milestone);
    }
    combat = applyCombat(combat, dm.combat, nextHero, { bestiary: nextCodex.bestiary || [], entropy, party: partyBefore });
    const deed = !visiblePlayer && resolution
      ? `The ${resolution.selectedDie || 'die'} falls ${resolution.total} — ${String(resolution.outcome || '').replaceAll('_', ' ')}.`
      : null;
    const log = { id: crypto.randomUUID(), player: visiblePlayer, deed, sent: player, dm, ts: Date.now(), resolution, redacted: false, turn: turnNumber, beatIndex: nextCodex.beatIndex, room: null };
    logs = [...logs, log];
    pendingRoll = nextCodex.completed ? null : dm.roll_request;
    turnNumber += 1;
    await saveCampaign({ ...campaign, hero: nextHero, codex: nextCodex, combat, logs, pendingRoll, turnNumber });
    const record = await appendEvent(id, 'turn', { player, visiblePlayer, deed, dm, stateAfter: { hero: nextHero, combat }, storyAfter: nextCodex, entropy, resolution, room: null });
    log.recordHash = record.recordHash;
    await rememberScene(id, turnNumber, { player, narration: dm.narration_blocks[0]?.text || '', chronicle: dm.state_updates?.chronicle_add || '', recordHash: record.recordHash });

    // —— The living world ticks where time passed or the act turned. ——
    const actNow = nextCodex.spine.beats[nextCodex.beatIndex]?.act || 1;
    if (!nextCodex.completed && (dm.time_advance || actNow !== actBefore)) {
      const updates = tickUpdates(nextCodex, turnNumber - 1);
      if (updates) {
        const tickLog = tickLogEntry(updates, turnNumber - 1, nextCodex.beatIndex);
        nextCodex = applyStoryUpdates(nextCodex, updates, { turn: turnNumber - 1, tick: true });
        logs = [...logs, tickLog];
        await saveCampaign({ ...campaign, hero: nextHero, codex: nextCodex, combat, logs, pendingRoll, turnNumber });
        const tickRecord = await appendEvent(id, 'tick', { story: updates, storyAfter: nextCodex });
        tickLog.recordHash = tickRecord.recordHash;
      }
    }

    codex = nextCodex;
    heroNow = nextHero;
    resolution = null;
    resolveLabel = null;
  }

  // —— The wax: legacy packet first, the sealing block as signature. ——
  let sealedRow = await db.campaigns.get(id);
  let finished = {
    ...campaign, hero: heroNow, codex, combat, logs, turnNumber, pendingRoll: null,
    headHash: sealedRow.headHash, turnCount: sealedRow.turnCount, signatureStatus: sealedRow.signatureStatus, updatedAt: Date.now()
  };
  await saveCampaign(finished);
  await sealLegacy(finished, { seal: (campaignId, type, payload) => appendEvent(campaignId, type, payload) });
  const journal = await db.journal.where('campaignId').equals(id).toArray();
  await appendEvent(id, 'sealing', {
    turns: journal.filter((row) => row.type === 'turn').length,
    rolls: journal.filter((row) => row.type === 'resolution' && row.payload && row.payload.total != null).length,
    completed_at: Date.now()
  });
  sealedRow = await db.campaigns.get(id);
  finished = { ...finished, headHash: sealedRow.headHash, turnCount: sealedRow.turnCount, signatureStatus: sealedRow.signatureStatus, sealedAt: Date.now(), completed: true, updatedAt: Date.now() };
  await saveCampaign(finished);
  return { id, hero: heroNow, codex };
}

// —— The forge's own oath: refuse to ship an unlawful tale. ——
function proveTale(data, spineId) {
  const turns = data.journal.filter((row) => row.type === 'turn').map((row) => row.payload);
  const stories = turns.map((payload) => payload.dm?.story || {});
  assert.equal(data.campaign.spineId, spineId, `${spineId}: the tale rides its own spine`);
  assert.ok(data.campaign.sealedAt && data.campaign.completed, `${spineId}: played to seal`);
  assert.ok(stories.some((story) => (story.item_transfer || []).length), `${spineId}: a possession moves hands`);
  assert.ok(stories.some((story) => story.party_join?.name), `${spineId}: a companion joins`);
  assert.ok(stories.some((story) => story.party_leave?.remains_at), `${spineId}: a leave carries remains_at`);
  assert.ok(stories.some((story) => (story.thread_add || []).length), `${spineId}: a thread is sworn`);
  assert.ok(stories.some((story) => (story.thread_resolve || []).length), `${spineId}: the thread is answered`);
  assert.ok(stories.some((story) => story.item_equip?.name), `${spineId}: a thing is equipped`);
  const purse = stories.flatMap((story) => story.purse || []);
  assert.ok(purse.some((move) => move.delta > 0) && purse.some((move) => move.delta < 0), `${spineId}: the purse moves both directions`);
  const companionAsk = turns.find((payload) => payload.dm?.roll_request && String(payload.dm.roll_request.actor_id || '').toLowerCase() !== 'hero');
  assert.ok(companionAsk, `${spineId}: a sheeted companion's die is asked`);
  const askIndex = turns.indexOf(companionAsk);
  const closing = turns[askIndex + 1];
  assert.ok(closing?.resolution && String(closing.resolution.actorId || '') !== 'hero', `${spineId}: the companion's die falls on the record`);
  assert.ok(closing.dm?.combat?.op === 'end', `${spineId}: the battle closes in its turn`);
  assert.ok((closing.dm?.story?.sheet_condition?.add || []).length, `${spineId}: the fall is addressed in its turn`);
  assert.ok(turns.some((payload) => payload.dm?.combat?.op === 'start'), `${spineId}: a battle opens on the record`);
}

mkdirSync(COURT_DIR, { recursive: true });
mkdirSync(SHELF_DIR, { recursive: true });
const manifest = [];
for (const tale of TALES) {
  const { id } = await playTale(tale);
  const data = await exportChronicle(id);
  const verdicts = await verifyJournal(data.journal);
  const broken = verdicts.find((verdict) => !verdict.ok);
  assert.ok(!broken, `${tale.spineId}: the chain must verify before shipping (record ${broken?.i})`);
  assert.equal(data.header.headHash, data.journal[data.journal.length - 1].recordHash, `${tale.spineId}: the head seal agrees`);
  proveTale(data, tale.spineId);
  const bytes = JSON.stringify(data, null, 2);
  writeFileSync(path.join(COURT_DIR, `${tale.spineId}.chronicle.json`), bytes);
  writeFileSync(path.join(SHELF_DIR, `${tale.spineId}.chronicle.json`), bytes);
  manifest.push({
    spineId: tale.spineId, file: `${tale.spineId}.chronicle.json`,
    campaignId: data.header.campaignId, headHash: data.header.headHash,
    title: data.campaign.title, hero: data.campaign.hero?.name || '',
    turns: data.journal.filter((row) => row.type === 'turn').length
  });
  console.log(`forged ${tale.spineId}: "${data.campaign.title}" — ${manifest[manifest.length - 1].turns} turns, head ${data.header.headHash.slice(0, 12)}…`);
}
writeFileSync(path.join(SHELF_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('THREE REFERENCE TALES forged, proven, and shipped twice from one export.');
