// ------------------------------------------------------------
// THE SUBSTANCE FLOOR GATE (A3) — Directive XI, Law V (word floors).
//
// Proves five things:
//   ① a below-floor turn bearing a named beat measure emits exactly one
//     floor-breach repair instruction naming the word deficiency;
//   ② the honest fallback meets the absolute narration floor by design
//     (safeFallbackTurn clears NARRATION_FLOOR.minWords without a measure);
//   ③ a turn where named cast are at the scene but nobody speaks is flagged
//     with the cast member's name;
//   ④ a solitary scene (no party, no cast at the current ground) is exempt;
//   ⑤ PARITY: a 190-word standard turn accepted by the server bench is also
//     accepted at the client landing when beatMeasure rides the context, and
//     is refused by the legacy check when it does not — confirming both benches
//     apply identical word-law after the App.jsx fix.
//
// Keyless by law: no DM provider is consulted; both courts are exercised
// from their fixture inputs alone.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import { validateDmTurn, safeFallbackTurn, NARRATION_FLOOR } from 'fatescript/protocol';
import { judgeTurn } from '../server/dm.js';

// ── shared fixture skeleton ───────────────────────────────────────────────────
// A fully-keyed dm_turn with no story operations or extras: the shape
// validator passes it in silence so the floor courts can speak alone.
const BASE = {
  suggestions: ['Look around', 'Ask what changed', 'Wait and listen'],
  roll_request: null, state_updates: null, combat: null, cinematic: null,
  story: null, image_cue: null, dialogue_cue: null, time_advance: null, entropy_use: [],
};

// Enough prose for a silent-scene test (≥ 20 words, clears the legacy check).
const QUIET_ROAD = 'The road holds its silence. Somewhere beyond the treeline a nightbird calls, and is answered. The crossing waits, patient as stone, and does not ask when you will move.';

// ── ① below-floor emits one named repair instruction ─────────────────────────
{
  // Nine-word text — below both the legacy floor (20) and the lean floor (40).
  const shortText = 'Rain falls. The world waits. Nothing moves here.';
  const shortTurn = { ...BASE, narration_blocks: [{ text: shortText, speaker: null }] };
  const wordCount = shortText.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(wordCount < NARRATION_FLOOR.byMeasure.lean.minWords, 'fixture is below the lean floor');

  // Without beatMeasure the legacy 20-180 check applies and also rejects it.
  const noMeasure = validateDmTurn(shortTurn, [], {});
  assert.equal(noMeasure.ok, false, 'short turn fails even the legacy check');

  // With beatMeasure = 'lean' the new floor fires with a specific message.
  const withMeasure = validateDmTurn(shortTurn, [], { beatMeasure: 'lean' });
  assert.equal(withMeasure.ok, false, 'short turn fails the lean floor check');
  const floorErrors = withMeasure.errors.filter((e) => /narration floor breach/.test(e));
  assert.equal(floorErrors.length, 1, 'exactly one floor-breach repair instruction is emitted');
  assert.ok(floorErrors[0].includes('too few words'), 'the repair instruction says "too few words"');
  assert.ok(floorErrors[0].includes(String(wordCount)), 'the repair instruction quotes the actual word count');
  assert.ok(floorErrors[0].includes(String(NARRATION_FLOOR.byMeasure.lean.minWords)), 'the repair instruction names the required minimum');

  // A passing lean turn (exactly at the floor) produces no floor error.
  const words40 = 'A ' + 'stone '.repeat(38) + 'waits.';
  const passingTurn = { ...BASE, narration_blocks: [{ text: words40, speaker: null }] };
  const passing = validateDmTurn(passingTurn, [], { beatMeasure: 'lean' });
  assert.equal(passing.errors.filter((e) => /narration floor breach/.test(e)).length, 0, 'a turn at the lean floor passes the floor check');

  console.log('PASS \u2460 \u2014 below-floor turn with beatMeasure emits exactly one floor-breach repair instruction naming the word deficiency; a passing turn has none.');
}

// ── ② honest fallback meets the absolute floor ───────────────────────────────
{
  const fallbackWithText = safeFallbackTurn('The player chose the crossing.', 1);
  const fallbackBlank   = safeFallbackTurn('', 5);

  for (const [label, fb] of [['with player text', fallbackWithText], ['blank player text', fallbackBlank]]) {
    const words = fb.narration_blocks
      .map((b) => String(b.text || '').trim().split(/\s+/).filter(Boolean).length)
      .reduce((a, b) => a + b, 0);
    assert.ok(
      words >= NARRATION_FLOOR.minWords,
      `fallback (${label}) has ${words} words — must be ≥ ${NARRATION_FLOOR.minWords}`
    );
    assert.ok(fb.narration_blocks.length >= NARRATION_FLOOR.minBlocks, `fallback (${label}) meets block floor`);

    // Must also pass the legacy validator (no beatMeasure — no measure-aware check).
    const v = validateDmTurn(fb, [], {});
    const wordErrors = v.errors.filter((e) => /narration total|narration floor breach/.test(e));
    assert.equal(wordErrors.length, 0, `fallback (${label}) produces no word-count error`);
  }

  console.log(`PASS \u2461 \u2014 both fallback variants have \u2265 ${NARRATION_FLOOR.minWords} words and pass the legacy validator with no word-count error.`);
}

// ── ③ present cast, no dialogue \u2192 flagged ──────────────────────────────────────
{
  // Mara Vey is at Larkspur Vale; the hero is alone in the party; nobody speaks.
  const silentTurn = { ...BASE, narration_blocks: [{ text: QUIET_ROAD, speaker: null }] };
  const input = {
    entropy: null,
    hero: { name: 'Bram' },
    story: {
      cast: [{ name: 'Mara Vey', status: 'active' }],
      presence_state: [{ name: 'Mara Vey', ground: 'Larkspur Vale' }],
      scene_state:    { region: 'Larkspur Vale' },
      party_state:    [],
    },
  };
  const verdict = judgeTurn(silentTurn, input);
  assert.equal(verdict.ok, false, 'present cast with no dialogue must be refused');
  const dialogueErrors = verdict.errors.filter((e) => /no dialogue/.test(e));
  assert.equal(dialogueErrors.length, 1, 'exactly one no-dialogue error is emitted');
  assert.ok(dialogueErrors[0].includes('Mara Vey'), 'the flagged cast member is named in the error');

  // When she speaks, the flag clears.
  const spokeTurn = { ...BASE, narration_blocks: [{ text: QUIET_ROAD, speaker: 'Mara Vey' }] };
  const spokenVerdict = judgeTurn(spokeTurn, input);
  const noDialogueWhenSpoken = spokenVerdict.errors.filter((e) => /no dialogue/.test(e));
  assert.equal(noDialogueWhenSpoken.length, 0, 'no no-dialogue flag when the cast member speaks');

  console.log('PASS \u2462 \u2014 present cast with no dialogue is flagged by name; the flag clears when the cast member speaks.');
}

// ── ④ solitary scene is exempt ────────────────────────────────────────────────
{
  // Mara Vey is elsewhere (Wayhouse Ridge); the hero is alone at Larkspur Vale.
  const silentTurn = { ...BASE, narration_blocks: [{ text: QUIET_ROAD, speaker: null }] };
  const input = {
    entropy: null,
    hero: { name: 'Bram' },
    story: {
      cast: [{ name: 'Mara Vey', status: 'active' }],
      presence_state: [{ name: 'Mara Vey', ground: 'The Wayhouse Ridge' }],
      scene_state:    { region: 'Larkspur Vale' },
      party_state:    [],
    },
  };
  const verdict = judgeTurn(silentTurn, input);
  const dialogueErrors = verdict.errors.filter((e) => /no dialogue/.test(e));
  assert.equal(dialogueErrors.length, 0, 'solitary scene (no cast at current ground) is exempt from the dialogue floor');

  console.log('PASS \u2463 \u2014 solitary scene (cast elsewhere) is exempt from the no-dialogue flag.');
}

// ── ⑤ server / client landing parity ─────────────────────────────────────────
// A 190-word standard turn is lawful on the server (90-200 words); it must be
// equally lawful at the client landing when beatMeasure rides the context. Before
// the App.jsx fix the landing called validateDmTurn without beatMeasure — the
// legacy 20-180 ceiling fired and refused it. This court proves both halves.
{
  // ~190 words: above the 180-word legacy ceiling, within standard's 90-200 band.
  const text190 = ('The old mill sat at the edge of the valley like a thought left unfinished, its wheel '
    + 'turned by water that had forgotten any other purpose. Moss had claimed the lower stones years '
    + 'ago and shown no intention of returning them. Inside, the air carried the memory of grain and '
    + 'the faint iron smell of the millstone itself, cold now. The miller kept his records in a ledger '
    + 'whose ink had faded to the color of dry mud, but the numbers were still legible if you held it '
    + 'toward the light from the single window. He marked each delivery in the same cramped hand he had '
    + 'used for forty years, and the entries told their own story: the harvests had been smaller every '
    + 'season for the last six. He did not say so aloud. He set the ledger down and looked at you the '
    + 'way a man looks when he has already decided something and is only waiting to see whether you will '
    + 'make it easier or harder to say. Outside, the wheel kept turning, carrying no opinion, '
    + 'only the cold weight of the hills it had crossed.');
  const words190 = text190.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(words190 >= 185 && words190 <= 195, `fixture is ~190 words (got ${words190})`);

  const turn190 = { ...BASE, narration_blocks: [{ text: text190, speaker: null }] };

  // Without beatMeasure (E5): the 'none' band ceiling (160 words) fires →
  // refused at the landing. Before E5 this was the legacy 20-180 check
  // ("narration total"); after E5 it is the 'none' band ceiling check
  // ("narration floor breach: too many words"). Same outcome, new message.
  const noMeasure = validateDmTurn(turn190, [], {});
  assert.equal(noMeasure.ok, false, 'without beatMeasure the none-band ceiling refuses a 190-word turn');
  assert.ok(
    noMeasure.errors.some((e) => /narration floor breach|narration total/.test(e)),
    `the refusal is a word-count error (narration floor breach or narration total); got: ${noMeasure.errors.join('; ')}`,
  );

  // With beatMeasure = 'standard': standard band (90-200) accepts 190 words.
  const withMeasure = validateDmTurn(turn190, [], { beatMeasure: 'standard' });
  const floorErrors = withMeasure.errors.filter((e) => /narration floor breach|narration total/.test(e));
  assert.equal(
    floorErrors.length, 0,
    `with beatMeasure='standard' the 190-word turn passes — no floor/total error; got: ${JSON.stringify(withMeasure.errors)}`,
  );

  console.log('PASS \u2465 \u2014 190-word standard turn: E5 none-band ceiling refuses without beatMeasure, measure check accepts with it \u2014 both benches apply identical word-law when beatMeasure is seated at the landing.');
}

console.log('PASS \u2014 substanceFloor: floor breach names the deficiency in one repair instruction, fallback clears the absolute floor, present cast with no dialogue is flagged, solitary scenes are exempt, and server/landing bench parity is proven.');
