import { applyStoryUpdates, initCodex } from 'fatescript/story';
import { applyCombat } from './combat.js';
import { createHero } from 'fatescript/rules';
import { castHeroVoice } from 'fatescript/cinema/casting';
import { tickUpdates, tickLogEntry } from 'fatescript/livingWorld';
import { appendEvent } from './seal.js';
import { db, saveCampaign } from './db.js';
import { rememberScene } from './memory.js';
import { sealLegacy } from './saga.js';

// ------------------------------------------------------------
// TASK 52 — THE PROVING HOOK (the letter's Section 2). Exactly one
// hook, gated behind ?proving=1 and inert without it:
//   1. the spark deal uses the fixed seed 42 (Forge reads isProving),
//   2. window.__mdqSeed(fixture) writes a fixture campaign into the
//      database through the REAL primitives — the codex fold, the seal
//      chain, the memory ledger — never a hand-built snapshot, so the
//      Codex, the verify desk, and the storybook meet lawful truth.
// ------------------------------------------------------------

export function isProving() {
  try { return new URLSearchParams(window.location.search).get('proving') === '1'; }
  catch { return false; }
}

/** Replays a scripted fixture through the same primitives the table uses.
 * Returns the campaign as the shelf would hand it to the table. */
export async function seedProvingCampaign(fixture) {
  const id = crypto.randomUUID();
  const hero = {
    ...createHero(fixture.hero),
    bearing: (fixture.hero.bearing || '').slice(0, 200),
    presentation: ['feminine', 'masculine', 'neutral'].includes(fixture.hero.presentation) ? fixture.hero.presentation : null,
    pronouns: (fixture.hero.pronouns || '').slice(0, 30) || null,
    mark: (fixture.hero.mark || '').slice(0, 80) || null,
    // THE POSSESSIONS CUT: the fixture hero may carry a forge keepsake;
    // the proving table honors the same seed law as the live table.
    keepsake: (fixture.hero.keepsake || '').slice(0, 60) || null
  };
  hero.voiceId = castHeroVoice(hero);

  let codex = initCodex(fixture.spineId, hero.keepsake ? { keepsake: { name: hero.keepsake, holder: hero.name } } : {});
  const campaign = {
    id, title: fixture.title, covenant: fixture.covenant, tone: fixture.tone,
    lines: fixture.lines || [], veils: fixture.veils || [], styleBible: fixture.styleBible, homeRegion: fixture.homeRegion,
    spineId: fixture.spineId, hero, codex, logs: [], combat: null, pendingRoll: null,
    turnNumber: 0, turnCount: 0, headHash: null, signatureStatus: 'pending', completed: false, readOnly: false,
    keyArtHash: null, heroBustHash: null, mediaTier: 'illuminated', spend: { images: 0, music: 0 },
    createdAt: Date.now(), updatedAt: Date.now()
  };
  await saveCampaign(campaign);

  let logs = [];
  let turnNumber = 0;
  let combat = null;
  for (let i = 0; i < fixture.turns.length; i += 1) {
    const scripted = fixture.turns[i];
    const dm = scripted.dm;
    const actBefore = codex.spine.beats[codex.beatIndex]?.act || 1;
    // THE BATTLE CUT (Task 57, Section 3) — the initiative device reads the
    // party AS THE RECORD STOOD BEFORE this turn's folds, exactly as the
    // live table hands it (base.codex.party), so a same-turn grant never
    // rides a same-turn opening.
    const partyBefore = (codex.party || []).map((member) => member?.name).filter((name) => typeof name === 'string');
    if (dm.story) codex = applyStoryUpdates(codex, dm.story, { turn: i, heroName: hero.name });
    // A scripted battle folds through the SAME primitive the live table
    // folds (src/lib/combat.js — moved whole from App.jsx: one fold, two
    // callers) with this turn's scripted entropy pool. Fixtures without
    // dm.combat seal the exact bytes they always sealed.
    if (dm.combat) combat = applyCombat(combat, dm.combat, hero, { bestiary: codex.bestiary || [], entropy: scripted.entropy || [], party: partyBefore });
    // THE WOUND (G23d's seat) — the op family holds no companion-damage
    // fold, so the seed carries the scripted wound by hand exactly as it
    // carries the hero's bearing and mark: stagecraft the primitives do
    // not govern, clamped to the sheet's own bounds, refused loudly when
    // the named soul bears no sheet. Ledgered in Directive X, Amendments.
    if (scripted.wound) {
      const wounded = (codex.party || []).find((member) => member?.name === scripted.wound.name);
      if (!wounded || !wounded.sheet) throw new Error(`fixture wound refused: ${scripted.wound.name} bears no sheet`);
      wounded.sheet = { ...wounded.sheet, hp: Math.max(0, Math.min(wounded.sheet.maxHp, Math.trunc(Number(scripted.wound.hp) || 0))) };
    }
    const player = scripted.player;
    // The row's own clock, stamped exactly as the live table stamps it
    // (Task 58C): citations speak turns, never array indexes.
    const log = { id: crypto.randomUUID(), player, deed: null, sent: player, dm, ts: Date.now(), resolution: null, redacted: false, turn: i, beatIndex: codex.beatIndex };
    logs = [...logs, log];
    turnNumber += 1;
    await saveCampaign({ ...campaign, hero, codex, logs, turnNumber });
    const record = await appendEvent(id, 'turn', { player, visiblePlayer: player, deed: null, dm, stateAfter: { hero, combat }, storyAfter: codex, entropy: scripted.entropy || [], resolution: null });
    log.recordHash = record.recordHash;
    if (scripted.struck) {
      // The X-card, as the table presses it: the strike is sealed, the
      // memory rows fall, the log row wears the mark.
      await appendEvent(id, 'redaction', { targetRecordHash: record.recordHash, scope: 'active_canon' });
      log.redacted = true;
    } else {
      await rememberScene(id, turnNumber, { player, narration: dm.narration_blocks?.[0]?.text || '', chronicle: dm.state_updates?.chronicle_add || '', recordHash: record.recordHash });
    }
    // THE LIVING WORLD, replayed — the table appends a tick row after any
    // turn that advanced time or turned the act (the same fold the live
    // table runs); the seed walks the same road so the feed's dividers
    // and the sealed chain are lawful truth, not a hand-built imitation.
    const actNow = codex.spine.beats[codex.beatIndex]?.act || 1;
    if (dm.time_advance || actNow !== actBefore) {
      const updates = tickUpdates(codex, i);
      if (updates) {
        const tickLog = tickLogEntry(updates, i, codex.beatIndex);
        codex = applyStoryUpdates(codex, updates, { turn: i, tick: true });
        logs = [...logs, tickLog];
        await saveCampaign({ ...campaign, hero, codex, logs, turnNumber });
        const tickRecord = await appendEvent(id, 'tick', { story: updates, storyAfter: codex });
        tickLog.recordHash = tickRecord.recordHash;
      }
    }
  }

  let sealed = await db.campaigns.get(id);
  let finished = {
    ...campaign, hero, codex, logs, turnNumber, combat,
    // THE STANDING ASK (G23c's seat) — a fixture may seed a pending roll
    // the way the live table persists one (saveCampaign carries it
    // verbatim); anything not shaped like the door's own ask is refused
    // to null, never guessed at.
    pendingRoll: fixture.pendingRoll && typeof fixture.pendingRoll === 'object' && !Array.isArray(fixture.pendingRoll) && typeof fixture.pendingRoll.id === 'string' && typeof fixture.pendingRoll.kind === 'string' && typeof fixture.pendingRoll.actor_id === 'string' ? fixture.pendingRoll : null,
    headHash: sealed.headHash, turnCount: sealed.turnCount, signatureStatus: sealed.signatureStatus,
    updatedAt: Date.now()
  };
  await saveCampaign(finished);

  if (fixture.sealed) {
    // The wax, pressed exactly as the ceremony presses it: legacy packet
    // first, then the 'sealing' block as the final signature.
    const sealFn = (campaignId, type, payload) => appendEvent(campaignId, type, payload);
    await sealLegacy(finished, { seal: sealFn });
    const journal = await db.journal.where('campaignId').equals(id).toArray();
    await sealFn(id, 'sealing', {
      turns: journal.filter((row) => row.type === 'turn').length,
      rolls: journal.filter((row) => row.type === 'resolution' && row.payload && row.payload.total != null).length,
      completed_at: Date.now()
    });
    sealed = await db.campaigns.get(id);
    finished = { ...finished, headHash: sealed.headHash, turnCount: sealed.turnCount, signatureStatus: sealed.signatureStatus, sealedAt: Date.now(), completed: true, updatedAt: Date.now() };
    await saveCampaign(finished);
  }
  return db.campaigns.get(id);
}
