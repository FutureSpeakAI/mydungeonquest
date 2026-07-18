import { expect, test } from '@playwright/test';
import { probeJudge } from './lib/vision';
import { mapLogRow } from './lib/harness';

// §0.5 — the suite runs with real keys in the TEST process or it does not
// run at all. No silent downgrades: a missing key or a refusing judge is a
// reportable environment failure, never a mock fallback.

test('G0 preflight: the judge key, a paint key, and a live judge', async () => {
  expect(process.env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY must be present in the test process for the vision judge').toBeTruthy();
  expect(
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY,
    'a live paint key (GEMINI/GOOGLE/OPENAI) must be present for the app server'
  ).toBeTruthy();
  await probeJudge(); // throws if the model refuses or answers non-JSON
});

// G00-RT — THE ROUND-TRIP RIDER (Directive VII.14). Instrument law, keyless
// by nature but seated in preflight where the instruments are proved: the
// read-back mapper must carry every field of a maximal journal row
// byte-complete, per-key JSON equality between the row as written and the
// row as mapped. A court is only as honest as its instruments; a mapper
// that thins the record re-litigates iteration-4 (`kind`) and 55.1
// (`dm.story`) forever. `scene_state` is judged where it lives — the
// codex/state block — not on rows; no pin grows for this test.
test('G00-RT: a maximal journal row survives the read-back mapper byte-complete', async () => {
  const row = {
    id: 'row-max', kind: 'tick', player: 'I hold the line.', deed: 'The d20 falls 17 — success.',
    sent: 'I hold the line.', ts: 1752700000000, turn: 9, redacted: false, beatIndex: 2,
    recordHash: 'abc123', imageAssetHash: 'def456', imageUrl: 'blob:proof',
    resolution: { selectedDie: 'd20', total: 17, outcome: 'success' },
    dm: {
      narration_blocks: [{ speaker: 'Edda Thornwake', text: 'Hold.' }, { speaker: null, text: 'Dust settles.' }],
      suggestions: ['Stand fast', 'Fall back', 'Parley'],
      roll_request: { id: 'r1', label: 'Hold the line', kind: 'check', die: 'd20', ability: 'CON', skill: null, proficient: true, dc: 12, advantage: 'normal', extra_mod: 0, action_id: null, actor_id: 'hero', target_id: null },
      state_updates: { hp_delta: -3, chronicle_add: 'The line held.' },
      combat: null,
      cinematic: { type: 'discovery', title: 'The Line', subtitle: 'It held.', palette: ['#111111', '#222222', '#333333'] },
      story: {
        beat_advance: false, arc: null,
        cast_add: [{ name: 'New Soul', role: 'witness', visual: 'grey-eyed and patient', goal: 'testify', voice_card: { gender: 'neutral', age: 'adult', timbre: 'quiet' } }],
        cast_update: [{ name: 'Edda Thornwake', bond_delta: 1, bond_reason: 'She saw you hold.', fact_add: 'Held the line.', last_seen: 'At the line' }],
        thread_add: [{ label: 'The line must be honored', kind: 'promise', holder: 'Maren' }],
        thread_resolve: [{ label: 'An old debt', outcome: 'kept' }],
        item_add: [{ name: 'A split shield', kind: 'keepsake', holder: 'Maren', note: 'It cracked; it held.' }],
        item_transfer: [{ name: 'the ledger', from: 'Corin Voss', to: 'Maren' }],
        item_remove: [{ name: 'a spent torch', holder: 'Maren', reason: 'burned out' }],
        purse: [{ holder: 'Maren', delta: -5, reason: 'Paid the toll' }],
        world: { blight_delta: 1, region_add: { name: 'The Held Line', visual: 'a scarred ridge' }, region_update: { name: 'Larkspur Vale', state: 'troubled' } },
        scene_set: { region: 'The Held Line' },
        // (56B) Directive VIII rides the round-trip: the mapper must carry
        // the party ops and the fixture seal byte-complete like every key.
        party_join: { name: 'New Soul' },
        party_leave: { name: 'Corin Voss', remains_at: 'Larkspur Vale' },
        fixture_add: { place: 'The Held Line', name: 'The Shield Cairn', visual: 'a cairn of split shields raised where the line held' }
      },
      image_cue: { kind: 'scene', subjects: ['Edda Thornwake'], region: 'The Held Line', mood: 'grim relief' },
      dialogue_cue: { speaker: 'Edda Thornwake', line: 'It held.' },
      time_advance: { unit: 'hours', n: 6 },
      entropy_use: ['e1']
    }
  };
  const mapped = mapLogRow(JSON.parse(JSON.stringify(row)));
  for (const key of Object.keys(row)) {
    expect(JSON.stringify((mapped as any)[key]), `the mapper must carry '${key}' byte-complete`).toBe(JSON.stringify((row as any)[key]));
  }
});
