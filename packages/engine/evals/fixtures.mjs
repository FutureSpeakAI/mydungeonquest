// ------------------------------------------------------------
// FIXTURES — one small world the engine gates share.
// A codex in the reducer's own shape, a hero, and a slice of sealed
// entries with lawful ops. Deterministic, keyless, and boring on
// purpose: gates judge laws, not literature.
// ------------------------------------------------------------
import { initCodex } from '../src/story.js';

export const HERO = { name: 'Aldric', className: 'Warden', mark: 'a rowan brand', voiceId: 'voice-hero-01' };

export function fixtureCodex() {
  const codex = initCodex('classic-epic', {
    arc: {
      title: 'The Ashen Vale',
      evil_plot: 'The Pale King drinks the valley dry',
      stakes: 'Every hearth in the vale',
      style_bible: 'Iron and candlelight'
    }
  });
  codex.blight = 2;
  codex.cast = [
    {
      id: 's-mira', name: 'Mira', role: 'healer',
      visual: 'A grey-eyed healer with rowan-stained hands',
      voice: 'A warm elder woman\u2019s voice',
      goal: 'restore the poisoned well at Harrow Ford',
      secret: 'She buried the old king\u2019s ring',
      status: 'active', bond: 3, last_seen: 'Harrow Ford',
      known_facts: ['Tended the hero\u2019s wound', 'Fears the Pale King\u2019s bell'],
      bond_arc: [], introduced_turn: 1,
      gender: 'feminine', age_band: 'elder', timbre: 'warm', voiceId: 'voice-mira-11'
    },
    {
      id: 's-tam', name: 'Tam', role: 'scout',
      visual: 'A wiry scout in a patched green cloak',
      voice: 'A quick young man\u2019s voice',
      goal: 'map the flooded road to the vale',
      secret: '', status: 'active', bond: 1, last_seen: 'the flooded road',
      known_facts: [], bond_arc: [], introduced_turn: 2,
      gender: 'masculine', age_band: 'young', timbre: 'bright', voiceId: 'voice-tam-04'
    },
    {
      id: 's-brannoc', name: 'Brannoc', role: 'villain',
      visual: 'The Pale King, crowned in dripping wax',
      voice: 'A cold, patient voice',
      goal: 'drain the vale', secret: 'He was the well-keeper once',
      status: 'active', bond: 0, last_seen: 'the drowned keep',
      known_facts: [], bond_arc: [], introduced_turn: 1,
      gender: 'masculine', age_band: 'elder', timbre: 'cold', voiceId: 'voice-bran-09'
    },
    {
      id: 's-edda', name: 'Edda', role: 'lantern-bearer',
      visual: 'A lantern-bearer with ash in her braid',
      voice: 'A low, steady voice',
      goal: 'carry the last light to the ford',
      secret: '', status: 'dead', bond: 2, last_seen: 'the ford, at rest',
      known_facts: ['Fell holding the lantern'], bond_arc: [], introduced_turn: 3,
      gender: 'feminine', age_band: 'adult', timbre: 'steady', voiceId: 'voice-edda-02'
    }
  ];
  codex.regions = [{ name: 'Harrow Ford', description: 'A river crossing of black stones', state: 'poisoned' }];
  codex.memoir = ['The well turned black on the third night.'];
  codex.notes = [];
  return codex;
}

const dmEnvelope = (over = {}) => ({
  narration_blocks: [], suggestions: [], roll_request: null, state_updates: null,
  combat: null, cinematic: null, story: null, image_cue: null, dialogue_cue: null,
  time_advance: null, entropy_use: [], ...over
});

// Four sealed turns: Mira enters, names the poisoner; Edda enters, is
// saved once, and falls speaking her dying words — the turn she dies,
// which the pre-turn snapshot allows.
export function fixtureEntries() {
  return [
    {
      id: 'e1', player: 'I cross the ford at dusk.', deed: 'Cross the ford', sent: true,
      redacted: false, resolution: null, ts: 1,
      dm: dmEnvelope({
        narration_blocks: [{ text: 'Black water folds around your boots.' }],
        story: {
          cast_add: [{
            name: 'Mira', role: 'healer',
            visual: 'A grey-eyed healer with rowan-stained hands',
            voice: 'A warm elder woman\u2019s voice',
            goal: 'restore the poisoned well at Harrow Ford',
            secret: 'She buried the old king\u2019s ring',
            voice_card: { gender: 'feminine', age: 'elder', timbre: 'warm' }
          }]
        }
      })
    },
    {
      id: 'e2', player: 'I ask Mira about the well.', deed: 'Ask about the well', sent: true,
      redacted: false, resolution: { kind: 'd20', total: 18, dc: 14, success: true }, ts: 2,
      dm: dmEnvelope({
        narration_blocks: [{ speaker: 'Mira', text: 'The well remembers who poisoned it.' }],
        story: { cast_update: [{ name: 'Mira', fact_add: 'Named the Pale King as the poisoner', last_seen: 'Harrow Ford' }] }
      })
    },
    {
      id: 'e3', player: 'I shield Edda from the falling arch.', deed: 'Shield Edda', sent: true,
      redacted: false, resolution: { kind: 'd20', total: 21, dc: 18, success: true }, ts: 3,
      dm: dmEnvelope({
        narration_blocks: [{ text: 'Stone gives way; the lantern gutters, and holds.' }],
        story: {
          cast_add: [{
            name: 'Edda', role: 'lantern-bearer',
            visual: 'A lantern-bearer with ash in her braid',
            voice: 'A low, steady voice',
            goal: 'carry the last light to the ford',
            secret: '',
            voice_card: { gender: 'feminine', age: 'adult', timbre: 'steady' }
          }]
        }
      })
    },
    {
      id: 'e4', player: 'I hold her hand.', deed: 'Hold her hand', sent: true,
      redacted: false, resolution: { kind: 'd20', total: 6, dc: 15, success: false }, ts: 4,
      dm: dmEnvelope({
        narration_blocks: [
          { speaker: 'Edda', text: 'Carry it the last mile.' },
          { text: 'The lantern passes to your hands.' }
        ],
        story: { cast_update: [{ name: 'Edda', status: 'dead', last_seen: 'the ford, at rest' }] }
      })
    }
  ];
}
