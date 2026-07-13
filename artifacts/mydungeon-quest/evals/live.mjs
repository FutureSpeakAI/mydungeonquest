// Live (non-mock) playthrough harness.
// Drives real Anthropic DM turns through the same code path the client uses,
// simulating a multi-turn campaign: genesis, exploration, dice rolls, combat,
// and cinematic beats. Fails loudly if any turn falls back to safeFallbackTurn
// or fails validateDmTurn.
//
// Usage: node evals/live.mjs   (requires ANTHROPIC_API_KEY; DM_PROVIDER!=mock)

import { getDmTurn } from '../server/dm.js';
import { makeEntropy, validateDmTurn } from '../src/lib/protocol.js';
import { applyStoryUpdates, initCodex, storyBlock } from '../src/lib/story.js';
import { applyStateUpdates, createHero, heroRoll, rollInitiative } from '../src/lib/rules.js';

function applyCombat(current, update, hero) {
  if (!update) return current;
  if (update.op === 'end') return null;
  const next = current ? structuredClone(current) : { active: true, round: 1, enemies: [], order: [] };
  for (const enemy of update.enemy_add || []) if (!next.enemies.some((e) => e.id === enemy.id)) next.enemies.push(enemy);
  for (const patch of update.enemy_update || []) {
    const enemy = next.enemies.find((e) => e.id === patch.id); if (!enemy) continue;
    enemy.hp = Math.max(0, Math.min(enemy.maxHp, enemy.hp + Number(patch.hp_delta || 0)));
    if (patch.zone) enemy.zone = patch.zone;
  }
  next.enemies = next.enemies.filter((enemy) => !(update.enemy_remove || []).includes(enemy.id));
  next.round += Number(update.round_delta || 0);
  if (update.op === 'start') next.order = rollInitiative(hero, next.enemies);
  return next;
}

// Scripted player intents that should naturally provoke rolls, combat and cinematics.
const script = [
  'Begin the chronicle.',
  'I study the impossible road and follow it north into the dark.',
  'I move stealthily toward the shuttered wayhouse and listen at the warm window.', // expect a roll
  'Two masked raiders burst out of the wayhouse and lunge at me with drawn knives. I raise my bow — we are in a fight. Start combat and show their stats.', // expect combat start
  'I loose an arrow at the nearest raider and press the attack.',                  // expect combat update + attack roll
  'I cut down the last raider, end the fight, and search the fallen for the gold-thread mark.',
  'I ask Mara what the mark means and demand the truth about the road.',
  'I press deeper toward the source of the corruption, no matter the cost.',       // push a beat / cinematic
  'I confront the design head-on and refuse to let it map my future.',
  'I make my stand at the last gate and end this.'
];

async function run() {
  const useMock = !process.env.ANTHROPIC_API_KEY || process.env.DM_PROVIDER === 'mock';
  if (useMock) {
    console.error('LIVE EVAL SKIPPED: no ANTHROPIC_API_KEY or DM_PROVIDER=mock. This harness only tests the real model.');
    process.exit(2);
  }

  const campaign = {
    id: 'live-run', title: 'The Unwritten Road', covenant: 'A humane PG-13 fantasy frontier of maps and memory.',
    tone: 'mythic', lines: ['graphic harm', 'harm to children'], veils: ['sexual content'],
    styleBible: 'Romantic dark-fantasy oil painting with illuminated-manuscript gold.', homeRegion: 'Larkspur Vale',
    spineId: 'classic-epic', mediaTier: 'cinema'
  };
  let hero = createHero({ name: 'Wrenna', className: 'Ranger', caster: 'half', hitDie: 10, ac: 15,
    abilities: { STR: 14, DEX: 16, CON: 13, INT: 10, WIS: 14, CHA: 8 }, skills: ['Perception', 'Survival', 'Stealth', 'Investigation'] });
  let codex = initCodex(campaign.spineId);
  let combat = null;
  let turnNumber = 0;

  const seen = { rolls: 0, combats: 0, cinematics: 0, resolutions: 0 };
  const failures = [];
  const turnLog = [];

  async function callTurn(player, resolution, label) {
    const entropy = makeEntropy();
    const story = storyBlock(codex);
    const base = { ...campaign, codex, hero, combat, turnNumber };
    const input = {
      campaign: base, hero, spine: codex.spine, state: { hero, combat }, story, memory: [], history: [],
      entropy, player, resolution, turn: turnNumber, genesis: turnNumber === 0
    };
    const { turn: dm, provider, error } = await getDmTurn(input);
    const validation = validateDmTurn(dm, entropy);
    const rec = {
      n: turnNumber, label, provider,
      valid: validation.ok, errors: validation.errors, error: error || null,
      roll: dm.roll_request ? dm.roll_request.kind : null,
      combatOp: dm.combat ? dm.combat.op : null,
      cinematic: dm.cinematic ? dm.cinematic.type : null,
      beatAdvance: Boolean(dm.story?.beat_advance)
    };
    turnLog.push(rec);
    if (provider === 'fallback') failures.push(`turn ${turnNumber} (${label}) FELL BACK: ${error}`);
    if (!validation.ok) failures.push(`turn ${turnNumber} (${label}) INVALID: ${validation.errors.join('; ')}`);
    if (provider === 'fallback' || !validation.ok) {
      console.log(`\n=== RAW TURN ${turnNumber} (${label}) ===`);
      console.log(JSON.stringify(dm, null, 2).slice(0, 4000));
    }

    // Apply updates like the client does.
    codex = applyStoryUpdates(codex, dm.story);
    if (dm.state_updates?.chronicle_add) codex.chronicle = [...codex.chronicle, String(dm.state_updates.chronicle_add).slice(0, 260)];
    hero = applyStateUpdates(hero, dm.state_updates);
    combat = applyCombat(combat, dm.combat, hero);
    if (dm.cinematic) seen.cinematics += 1;
    if (dm.combat) seen.combats += 1;
    turnNumber += 1;

    // Resolve any pending roll with a follow-up resolution turn.
    if (dm.roll_request) {
      seen.rolls += 1;
      const result = heroRoll(hero, dm.roll_request);
      seen.resolutions += 1;
      await callTurn(`Resolve ${dm.roll_request.label}.`, result, `${label} · resolve`);
    }
  }

  for (let i = 0; i < script.length; i += 1) {
    process.stdout.write(`\n[turn ${turnNumber}] "${script[i]}" ... `);
    await callTurn(script[i], null, script[i].slice(0, 40));
    const last = turnLog[turnLog.length - 1];
    process.stdout.write(`${last.provider}${last.valid ? '' : ' INVALID'}${last.cinematic ? ` cine:${last.cinematic}` : ''}${last.combatOp ? ` combat:${last.combatOp}` : ''}${last.roll ? ` roll:${last.roll}` : ''}`);
  }

  console.log('\n\n=== SUMMARY ===');
  console.log(`turns played: ${turnLog.length}`);
  console.log(`rolls requested: ${seen.rolls}, resolutions: ${seen.resolutions}`);
  console.log(`combat updates: ${seen.combats}`);
  console.log(`cinematics: ${seen.cinematics}`);
  console.log(`beat advances: ${turnLog.filter((t) => t.beatAdvance).length}, final beatIndex: ${codex.beatIndex}`);
  console.log(`providers: ${JSON.stringify(turnLog.reduce((acc, t) => { acc[t.provider] = (acc[t.provider] || 0) + 1; return acc; }, {}))}`);

  const coverageMissing = [];
  if (seen.rolls === 0) coverageMissing.push('no dice roll occurred');
  if (seen.combats === 0) coverageMissing.push('no combat occurred');
  if (seen.cinematics === 0) coverageMissing.push('no cinematic occurred');

  if (failures.length) {
    console.log('\n=== FAILURES ===');
    for (const f of failures) console.log(' - ' + f);
  }
  if (coverageMissing.length) {
    console.log('\n=== COVERAGE GAPS ===');
    for (const c of coverageMissing) console.log(' - ' + c);
  }

  if (failures.length) { console.error('\nLIVE EVAL FAILED: reliability failures above.'); process.exit(1); }
  if (coverageMissing.length) { console.error('\nLIVE EVAL INCOMPLETE: coverage gaps above.'); process.exit(3); }
  console.log('\nLIVE EVAL PASSED: full playthrough with combat, rolls, and cinematics, no fallbacks.');
}

run().catch((e) => { console.error(e); process.exit(1); });
