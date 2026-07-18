// ============================================================
// THE ART DIRECTOR'S COURT (0.9.0, LAW IX) — the third chair.
// Two PASS lines: the sitting law (a plate due seats the chair,
// no plate leaves it empty, the merge is byte-deterministic and
// completion-only), and the revised-plate law (a redraft seats
// the chair AGAIN, and a twice-refused page ships with a lawful
// caption and its flags attested). Keyless: DM provider must
// stay 'mock' throughout — the fallback would prove nothing.
// ============================================================
import assert from 'node:assert/strict';
import { makeEntropy } from 'fatescript/protocol';
import { convene } from '../server/room.js';
import { artDirectorSits, plateDue, captionOf, momentOf } from '../server/artDirector.js';

const spine = { label: 'The Clean Walk', beats: [{ title: 'The Ordinary Flame', goal: 'Open the road', act: 1 }] };
const baseInput = (turn, extras = {}) => ({
  campaign: { title: 'Clean Walk', homeRegion: 'Larkspur Vale' },
  hero: { name: 'Wren', skills: ['Investigation'] },
  spine,
  story: { beat: { index: 0, title: 'The Ordinary Flame' }, regions: [{ name: 'Larkspur Vale' }], prior_suggestions: [], ...(extras.story || {}) },
  state: {}, memory: [], history: [],
  player: 'I press on.',
  entropy: makeEntropy(() => 0.42),
  resolution: extras.resolution ?? null,
  turn, genesis: turn === 0
});

// ------------------------------------------------------------
// THE SITTING LAW — a plate due seats the chair exactly once; a
// plateless turn leaves the counter at zero and the cue null.
// ------------------------------------------------------------
{
  const input = baseInput(2, { resolution: { outcome: 'success — the die spoke', total: 15 } });
  const sat = await convene(input, {});
  assert.equal(sat.provider, 'mock', 'the sitting must be the mock voice — a fallback proves nothing');
  const cue = sat.turn.image_cue;
  assert.ok(cue, 'a resolution turn stages a plate');
  assert.equal(cue.caption, 'Hard-won wonder: Wren beneath the Larkspur Vale sky, as this page tells it.',
    'the caption is composed from the cue\'s own staging, deterministic to the byte');
  assert.equal(cue.moment, sat.turn.narration_blocks[0].text.slice(0, 480),
    'the moment is the page\'s own first unattributed line, whole');
  assert.equal(sat.room_ledger.art_director_calls, 1, 'one plate, one sitting');
  assert.equal(sat.room_ledger.editor_calls, 0, 'turn 2 is unsampled and clean — the Editor never sat');
  assert.equal(sat.room_ledger.director_calls, 1);
  assert.deepEqual(sat.room_ledger.flags, []);

  // Byte-determinism: the same sitting twice, identical to the byte.
  const again = await convene(baseInput(2, { resolution: { outcome: 'success — the die spoke', total: 15 } }), {});
  assert.equal(JSON.stringify(again.turn), JSON.stringify(sat.turn), 'the merged turn is deterministic');
  assert.equal(JSON.stringify(again.room_ledger), JSON.stringify(sat.room_ledger), 'the ledger is deterministic');

  // No plate due — the chair never sits.
  const plateless = await convene(baseInput(3), {});
  assert.equal(plateless.provider, 'mock');
  assert.equal(plateless.turn.image_cue, null, 'turn 3 stages no plate');
  assert.equal(plateless.room_ledger.art_director_calls, 0, 'no plate, no sitting');

  // The chair's own units: pass-through and completion-only.
  assert.equal(plateDue({ image_cue: null }), false);
  assert.equal(plateDue({ image_cue: { kind: 'scene', subjects: ['Wren'] } }), true);
  assert.equal(plateDue({ image_cue: { kind: 'mural', subjects: [] } }), false, 'an unlawful kind is not a plate — the shape court speaks, not the chair');
  const bare = { narration_blocks: [{ text: 'A bare page.', speaker: null }], image_cue: null };
  assert.equal(artDirectorSits(bare), bare, 'a cue-less draft passes through untouched');
  const carried = {
    narration_blocks: [{ text: 'The page tells its own staged line here.', speaker: null }],
    image_cue: { kind: 'scene', subjects: ['Wren'], region: null, mood: 'quiet',
      caption: 'A lawful carried caption stays where the draft put it, unrewritten.',
      moment: 'The staged line the draft itself named.' }
  };
  const kept = artDirectorSits(carried);
  assert.equal(kept.image_cue.caption, carried.image_cue.caption, 'the chair completes; it never overwrites a carried caption');
  assert.equal(kept.image_cue.moment, carried.image_cue.moment, 'nor a carried moment');
  const composedNull = captionOf({ image_cue: { kind: 'scene', subjects: [], region: null, mood: null } });
  assert.ok(composedNull.startsWith('The staged moment: the scene beneath an unnamed sky'), 'empty seats compose lawfully');
  assert.equal(momentOf({ narration_blocks: [{ text: 'Spoken.', speaker: 'Mara Vey' }, { text: 'The scene stands.', speaker: null }] }),
    'The scene stands.', 'the moment prefers the first UNATTRIBUTED line');
  console.log('PASS — the Art Director sits only when a plate is due, the merge is deterministic to the byte, and the chair completes without overwriting.');
}

// ------------------------------------------------------------
// THE REVISED PLATE — a sameness plant forces the Editor's one
// redraft at a plate-bearing turn: the chair is seated for BOTH
// drafts, and the twice-refused page ships attested with its
// caption lawful.
// ------------------------------------------------------------
{
  const input = baseInput(5, {
    resolution: { outcome: 'success — the die spoke', total: 15 },
    story: { prior_suggestions: ['Follow the gold mark', 'Hide before pursuit', 'Study the mechanism'] }
  });
  const sat = await convene(input, {});
  assert.equal(sat.provider, 'mock');
  assert.deepEqual(sat.room_ledger.flags, ['sameness'], 'the planted roads convict the draft — and the mock redraft honestly re-flags');
  assert.equal(sat.room_ledger.editor_verdict, 'revise');
  assert.equal(sat.room_ledger.editor_calls, 2, 'judge, then re-judge the one redraft');
  assert.equal(sat.room_ledger.revisions, 1, 'exactly one revision — the law\'s whole budget');
  assert.equal(sat.room_ledger.art_director_calls, 2, 'two drafts carried plates — two sittings');
  assert.equal(sat.turn.image_cue?.caption, 'Hard-won wonder: Wren beneath the Larkspur Vale sky, as this page tells it.',
    'the shipped page\'s caption is lawful and composed, attested flags or no');
  assert.equal(sat.turn.image_cue?.moment, sat.turn.narration_blocks[0].text.slice(0, 480));
  console.log('PASS — a revised plate seats the chair twice, and a twice-refused page ships with a lawful caption and its flags attested.');
}
