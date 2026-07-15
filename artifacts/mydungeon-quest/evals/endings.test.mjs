// ------------------------------------------------------------
// THE ENDINGS SUITE — Phase 2 of the Experience Cut.
// Proves, keylessly:
//   1. Chapters and acts speak in numerals — one beat, one
//      chapter; every act carries its spoken name.
//   2. Natural completion — the final beat must PLAY before the
//      tale seals: arriving at it does not complete; closing it
//      does, and a sealed tale advances no further.
//   3. Seal the Tale — the honored early ending: the request is
//      recorded once, the DM is steered into the denouement
//      through [STORY] directives, the countdown ticks even on
//      turns that carry no story updates, and the tale completes
//      exactly when the denouement turns have breathed.
// Pure node, no DOM, no keys — safe on the proving ground.
// ------------------------------------------------------------
import assert from 'node:assert/strict';
import {
  applyStoryUpdates, initCodex, requestSeal, storyBlock,
  chapterInfo, actInfo, romanNumeral, ACT_NAMES, SEALING_DENOUEMENT_TURNS
} from 'fatescript/story';

// ---- 1. Chapters and acts speak in numerals ------------------
{
  assert.equal(romanNumeral(1), 'I');
  assert.equal(romanNumeral(4), 'IV');
  assert.equal(romanNumeral(9), 'IX');
  assert.equal(romanNumeral(14), 'XIV');
  assert.equal(romanNumeral(15), 'XV');

  const codex = initCodex('classic-epic');
  const chapter = chapterInfo(codex);
  assert.equal(chapter.numeral, 'I', 'the tale opens on Chapter I');
  assert.equal(chapter.count, codex.spine.beats.length);
  assert.equal(chapter.countNumeral, romanNumeral(codex.spine.beats.length));
  assert.equal(chapter.act, 1);
  assert.equal(actInfo(codex).name, ACT_NAMES[1], 'Act I bears its spoken name');

  // Walk into act two and the labels follow the beat.
  let walked = codex;
  while (actInfo(walked).act === 1) walked = applyStoryUpdates(walked, { beat_advance: true }, { turn: walked.beatIndex });
  assert.equal(actInfo(walked).act, 2);
  assert.equal(actInfo(walked).name, ACT_NAMES[2]);
  assert.equal(chapterInfo(walked).numeral, romanNumeral(walked.beatIndex + 1));
}

// ---- 2. Natural completion: the final beat must play ---------
{
  let codex = initCodex('classic-epic');
  const last = codex.spine.beats.length - 1;
  for (let i = 0; i < last; i += 1) codex = applyStoryUpdates(codex, { beat_advance: true }, { turn: i });
  assert.equal(codex.beatIndex, last, 'the walk reaches the final beat');
  assert.equal(codex.completed, false, 'arriving at the final beat must NOT complete the tale — the epilogue gets its turns');

  codex = applyStoryUpdates(codex, { beat_advance: true }, { turn: last });
  assert.equal(codex.completed, true, 'closing the final beat completes the tale');
  assert.equal(codex.beatIndex, last, 'the index never leaves the spine');

  const after = applyStoryUpdates(codex, { beat_advance: true }, { turn: last + 1 });
  assert.equal(after.beatIndex, last, 'a sealed tale advances no further');
  assert.equal(after.completed, true);
  assert.ok(storyBlock(after).directives.some((d) => d.includes('The tale is sealed')), 'a sealed tale tells the DM to write nothing new');
}

// ---- 3. Seal the Tale: the honored early ending --------------
{
  let codex = initCodex('mystery');
  codex = applyStoryUpdates(codex, { beat_advance: true }, { turn: 4 });
  assert.equal(codex.completed, false);

  const requestedAt = 10;
  codex = requestSeal(codex, requestedAt);
  assert.ok(codex.sealing, 'the seal request must be recorded');
  assert.equal(codex.sealing.final_turn, requestedAt + SEALING_DENOUEMENT_TURNS - 1);
  assert.ok(codex.notes.some((n) => n.includes('seal the tale')), 'the request is noted in the wounds ledger');
  assert.ok(storyBlock(codex).directives.some((d) => d.includes('SEAL THE TALE')), 'the DM must be steered into the denouement');

  // Asking twice changes nothing; the first request stands.
  const again = requestSeal(codex, 99);
  assert.equal(again.sealing.requested_turn, requestedAt, 'the seal is requested once');

  // The countdown ticks even when the DM sends story:null — a quiet
  // denouement turn carries no updates, and must still count.
  codex = applyStoryUpdates(codex, null, { turn: requestedAt });
  assert.equal(codex.completed, false, 'the first denouement turn breathes');
  codex = applyStoryUpdates(codex, null, { turn: requestedAt + 1 });
  assert.equal(codex.completed, false, 'the second denouement turn breathes');
  codex = applyStoryUpdates(codex, null, { turn: requestedAt + 2 });
  assert.equal(codex.completed, true, 'the road comes home on the final denouement turn');

  // A completed tale refuses another seal request, and the denouement
  // directive yields to the sealed one.
  assert.equal(requestSeal(codex, 50), codex, 'a sealed tale cannot be sealed again');
  const directives = storyBlock(codex).directives;
  assert.ok(directives.some((d) => d.includes('The tale is sealed')));
  assert.equal(directives.some((d) => d.includes('SEAL THE TALE')), false, 'denouement steering ends at the seal');
}

// ---- 4. The seal is authoritative: no early completion -------
// A tale in its denouement may still walk beats, but the countdown — and only
// the countdown — decides when it completes. An eager beat_advance on the
// final beat must not cut the promised quiet turns short.
{
  let codex = initCodex('classic-epic');
  const last = codex.spine.beats.length - 1;
  for (let i = 0; i < last; i += 1) codex = applyStoryUpdates(codex, { beat_advance: true }, { turn: i });
  assert.equal(codex.beatIndex, last, 'the walk reaches the final beat');

  const requestedAt = 40;
  codex = requestSeal(codex, requestedAt);
  codex = applyStoryUpdates(codex, { beat_advance: true }, { turn: requestedAt });
  assert.equal(codex.completed, false, 'closing the final beat during the denouement must yield to the countdown');
  codex = applyStoryUpdates(codex, { beat_advance: true }, { turn: requestedAt + 1 });
  assert.equal(codex.completed, false, 'the denouement still breathes under repeated advances');
  assert.equal(codex.beatIndex, last, 'the index never leaves the spine');
  codex = applyStoryUpdates(codex, null, { turn: requestedAt + 2 });
  assert.equal(codex.completed, true, 'the countdown, and only the countdown, completes a sealing tale');
}

console.log('PASS — endings: chapters and acts speak, the final beat plays before the seal, and Seal the Tale earns its denouement.');
